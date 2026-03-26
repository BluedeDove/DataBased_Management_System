import { db } from '../../database'
import { config } from '../../config'
import { logger } from '../../lib/logger'

export class AIService {
  private initialized = false

  init() {
    this.initialized = config.ai.enabled
    if (this.initialized) {
      logger.info('AI服务已初始化')
    }
  }

  isAvailable(): boolean { return this.initialized }

  async createBookEmbedding(_bookId: number): Promise<void> {
    if (!this.initialized) throw new Error('AI服务未启用')
    db.prepare(`INSERT OR REPLACE INTO book_vectors (book_id, vector, text) VALUES (?, '[]', '')`).run(_bookId)
  }

  async batchCreateBookEmbeddings(bookIds: number[]): Promise<void> {
    if (!this.initialized) throw new Error('AI服务未启用')
    for (const bookId of bookIds) {
      await this.createBookEmbedding(bookId)
    }
  }

  async semanticSearchBooks(query: string, topK: number = 10): Promise<any[]> {
    if (!this.initialized) throw new Error('AI服务未启用')
    return db.prepare(`
      SELECT b.*, bc.name as category_name FROM books b
      JOIN book_categories bc ON b.category_id = bc.id
      WHERE b.is_deleted = 0 AND (b.title LIKE ? OR b.description LIKE ? OR b.keywords LIKE ?)
      LIMIT ?
    `).all(`%${query}%`, `%${query}%`, `%${query}%`, topK)
  }

  async chat(message: string, _history?: any[], _context?: string): Promise<string> {
    if (!this.initialized) return 'AI服务未配置'
    return `收到消息: ${message}`
  }

  async chatStream(message: string, _history: any[], _context: string | undefined, onChunk: (chunk: string) => void, onError: (error: Error) => void, onComplete: () => void): Promise<(() => void) | null> {
    if (!this.initialized) { onError(new Error('AI服务未启用')); return null }
    setTimeout(() => { onChunk(`回复: ${message}`); onComplete() }, 100)
    return () => {}
  }

  async recommendBooks(query: string, limit: number = 5): Promise<any> {
    if (!this.initialized) throw new Error('AI服务未启用')
    const books = db.prepare(`
      SELECT b.*, bc.name as category_name FROM books b
      JOIN book_categories bc ON b.category_id = bc.id
      WHERE b.is_deleted = 0 AND (b.title LIKE ? OR b.description LIKE ?)
      LIMIT ?
    `).all(`%${query}%`, `%${query}%`, limit)
    return { books, summary: `找到 ${books.length} 本相关图书` }
  }

  async recommendBooksStream(query: string, limit: number, onChunk: (chunk: string) => void, onError: (error: Error) => void, onComplete: () => void): Promise<(() => void) | null> {
    if (!this.initialized) { onError(new Error('AI服务未启用')); return null }
    const result = await this.recommendBooks(query, limit)
    setTimeout(() => { onChunk(JSON.stringify(result)); onComplete() }, 100)
    return () => {}
  }

  getVectorStatistics(): { totalVectors: number } {
    const result = db.prepare('SELECT COUNT(*) as count FROM book_vectors').get() as { count: number }
    return { totalVectors: result.count }
  }

  saveConversation(userId: number, title: string, messages: any[]): any {
    const result = db.prepare(`INSERT INTO ai_conversations (user_id, title, messages) VALUES (?, ?, ?)`).run(userId, title, JSON.stringify(messages))
    return { id: result.lastInsertRowid, userId, title, messages }
  }

  getUserConversations(userId: number, limit: number = 20): any[] {
    return db.prepare(`SELECT id, title, created_at, updated_at FROM ai_conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?`).all(userId, limit)
  }

  getConversation(conversationId: number): any {
    return db.prepare(`SELECT * FROM ai_conversations WHERE id = ?`).get(conversationId)
  }

  updateConversation(conversationId: number, title: string, messages: any[]): any {
    db.prepare(`UPDATE ai_conversations SET title = ?, messages = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(title, JSON.stringify(messages), conversationId)
    return this.getConversation(conversationId)
  }

  deleteConversation(conversationId: number): void {
    db.prepare(`DELETE FROM ai_conversations WHERE id = ?`).run(conversationId)
  }
}
