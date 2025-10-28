import { db } from '../../database'
import { NotFoundError } from '../../lib/errorHandler'

export interface VectorRecord {
  id: number
  book_id: number
  vector: string // JSON string of number[]
  text: string
  created_at: string
}

export class VectorRepository {
  // 初始化向量表
  initTable(): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS book_vectors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER NOT NULL UNIQUE,
        vector TEXT NOT NULL,
        text TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
      )
    `)

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_book_vectors_book_id ON book_vectors(book_id)
    `)

    console.log('✅ 向量表初始化完成')
  }

  // 保存图书向量
  save(bookId: number, vector: number[], text: string): VectorRecord {
    const vectorJson = JSON.stringify(vector)

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO book_vectors (book_id, vector, text)
      VALUES (?, ?, ?)
    `)

    const result = stmt.run(bookId, vectorJson, text)

    const record = this.findByBookId(bookId)
    if (!record) throw new NotFoundError('向量记录')
    return record
  }

  // 根据图书ID查找向量
  findByBookId(bookId: number): VectorRecord | undefined {
    const stmt = db.prepare('SELECT * FROM book_vectors WHERE book_id = ?')
    return stmt.get(bookId) as VectorRecord | undefined
  }

  // 获取所有向量
  findAll(): VectorRecord[] {
    const stmt = db.prepare('SELECT * FROM book_vectors ORDER BY created_at DESC')
    return stmt.all() as VectorRecord[]
  }

  // 删除向量
  delete(bookId: number): void {
    db.prepare('DELETE FROM book_vectors WHERE book_id = ?').run(bookId)
  }

  // 获取向量数量
  count(): number {
    const result = db.prepare('SELECT COUNT(*) as count FROM book_vectors').get() as {
      count: number
    }
    return result.count
  }

  // 简单的向量搜索（在内存中计算相似度）
  search(queryVector: number[], topK: number = 5): Array<{ bookId: number; similarity: number }> {
    const records = this.findAll()

    const similarities = records.map((record) => {
      const vector = JSON.parse(record.vector) as number[]
      const similarity = this.cosineSimilarity(queryVector, vector)
      return {
        bookId: record.book_id,
        similarity
      }
    })

    // 按相似度降序排序并返回top K
    return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, topK)
  }

  // 计算余弦相似度
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      return 0
    }

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i]
      normA += vecA[i] * vecA[i]
      normB += vecB[i] * vecB[i]
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB)
    if (denominator === 0) return 0

    return dotProduct / denominator
  }
}
