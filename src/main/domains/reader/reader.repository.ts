import { db } from '../../database'
import { NotFoundError } from '../../lib/errorHandler'

export interface ReaderCategory {
  id: number
  code: string
  name: string
  max_borrow_count: number
  max_borrow_days: number
  validity_days: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface Reader {
  id: number
  reader_no: string
  name: string
  category_id: number
  gender?: 'male' | 'female' | 'other'
  organization?: string
  address?: string
  phone?: string
  email?: string
  registration_date: string
  expiry_date?: string
  status: 'active' | 'suspended' | 'expired'
  notes?: string
  created_at: string
  updated_at: string
}

export interface ReaderWithCategory extends Reader {
  category_name: string
  max_borrow_count: number
  max_borrow_days: number
}

export class ReaderRepository {
  // 读者种类相关
  findAllCategories(): ReaderCategory[] {
    const stmt = db.prepare('SELECT * FROM reader_categories ORDER BY code')
    return stmt.all() as ReaderCategory[]
  }

  findCategoryById(id: number): ReaderCategory | undefined {
    const stmt = db.prepare('SELECT * FROM reader_categories WHERE id = ?')
    return stmt.get(id) as ReaderCategory | undefined
  }

  createCategory(category: Omit<ReaderCategory, 'id' | 'created_at' | 'updated_at'>): ReaderCategory {
    const stmt = db.prepare(`
      INSERT INTO reader_categories (code, name, max_borrow_count, max_borrow_days, validity_days, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    const result = stmt.run(
      category.code,
      category.name,
      category.max_borrow_count,
      category.max_borrow_days,
      category.validity_days,
      category.notes
    )
    const created = this.findCategoryById(result.lastInsertRowid as number)
    if (!created) throw new NotFoundError('读者种类')
    return created
  }

  updateCategory(id: number, updates: Partial<ReaderCategory>): ReaderCategory {
    const fields: string[] = []
    const values: any[] = []

    if (updates.name) {
      fields.push('name = ?')
      values.push(updates.name)
    }
    if (updates.max_borrow_count !== undefined) {
      fields.push('max_borrow_count = ?')
      values.push(updates.max_borrow_count)
    }
    if (updates.max_borrow_days !== undefined) {
      fields.push('max_borrow_days = ?')
      values.push(updates.max_borrow_days)
    }
    if (updates.validity_days !== undefined) {
      fields.push('validity_days = ?')
      values.push(updates.validity_days)
    }
    if (updates.notes !== undefined) {
      fields.push('notes = ?')
      values.push(updates.notes)
    }

    if (fields.length > 0) {
      fields.push('updated_at = CURRENT_TIMESTAMP')
      values.push(id)
      db.prepare(`UPDATE reader_categories SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    }

    const updated = this.findCategoryById(id)
    if (!updated) throw new NotFoundError('读者种类')
    return updated
  }

  // 读者相关
  findAll(filters?: { status?: string; category_id?: number }): ReaderWithCategory[] {
    let sql = `
      SELECT r.*, rc.name as category_name, rc.max_borrow_count, rc.max_borrow_days
      FROM readers r
      JOIN reader_categories rc ON r.category_id = rc.id
      WHERE 1=1
    `
    const params: any[] = []

    if (filters?.status) {
      sql += ' AND r.status = ?'
      params.push(filters.status)
    }
    if (filters?.category_id) {
      sql += ' AND r.category_id = ?'
      params.push(filters.category_id)
    }

    sql += ' ORDER BY r.created_at DESC'

    const stmt = db.prepare(sql)
    return stmt.all(...params) as ReaderWithCategory[]
  }

  findById(id: number): ReaderWithCategory | undefined {
    const stmt = db.prepare(`
      SELECT r.*, rc.name as category_name, rc.max_borrow_count, rc.max_borrow_days
      FROM readers r
      JOIN reader_categories rc ON r.category_id = rc.id
      WHERE r.id = ?
    `)
    return stmt.get(id) as ReaderWithCategory | undefined
  }

  findByReaderNo(readerNo: string): ReaderWithCategory | undefined {
    const stmt = db.prepare(`
      SELECT r.*, rc.name as category_name, rc.max_borrow_count, rc.max_borrow_days
      FROM readers r
      JOIN reader_categories rc ON r.category_id = rc.id
      WHERE r.reader_no = ?
    `)
    return stmt.get(readerNo) as ReaderWithCategory | undefined
  }

  create(reader: Omit<Reader, 'id' | 'created_at' | 'updated_at'>): Reader {
    const stmt = db.prepare(`
      INSERT INTO readers (
        reader_no, name, category_id, gender, organization, address,
        phone, email, registration_date, expiry_date, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const result = stmt.run(
      reader.reader_no,
      reader.name,
      reader.category_id,
      reader.gender,
      reader.organization,
      reader.address,
      reader.phone,
      reader.email,
      reader.registration_date,
      reader.expiry_date,
      reader.status,
      reader.notes
    )

    const created = this.findById(result.lastInsertRowid as number)
    if (!created) throw new NotFoundError('读者')
    return created
  }

  update(id: number, updates: Partial<Reader>): Reader {
    const fields: string[] = []
    const values: any[] = []

    Object.keys(updates).forEach((key) => {
      if (key !== 'id' && key !== 'reader_no' && key !== 'created_at' && key !== 'updated_at') {
        fields.push(`${key} = ?`)
        values.push(updates[key as keyof Reader])
      }
    })

    if (fields.length > 0) {
      fields.push('updated_at = CURRENT_TIMESTAMP')
      values.push(id)
      db.prepare(`UPDATE readers SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    }

    const updated = this.findById(id)
    if (!updated) throw new NotFoundError('读者')
    return updated
  }

  search(keyword: string): ReaderWithCategory[] {
    const stmt = db.prepare(`
      SELECT r.*, rc.name as category_name, rc.max_borrow_count, rc.max_borrow_days
      FROM readers r
      JOIN reader_categories rc ON r.category_id = rc.id
      WHERE r.name LIKE ? OR r.reader_no LIKE ? OR r.phone LIKE ?
      ORDER BY r.created_at DESC
    `)
    const pattern = `%${keyword}%`
    return stmt.all(pattern, pattern, pattern) as ReaderWithCategory[]
  }

  // 获取读者当前借阅数量
  getBorrowingCount(readerId: number): number {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM borrowing_records
      WHERE reader_id = ? AND status = 'borrowed'
    `)
    const result = stmt.get(readerId) as { count: number }
    return result.count
  }

  // 检查读者是否有逾期未还
  hasOverdueBooks(readerId: number): boolean {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM borrowing_records
      WHERE reader_id = ? AND status = 'borrowed' AND due_date < date('now')
    `)
    const result = stmt.get(readerId) as { count: number }
    return result.count > 0
  }

  // 删除读者
  delete(id: number): void {
    console.log('[Repository] 开始删除读者数据，ID:', id)
    const stmt = db.prepare('DELETE FROM readers WHERE id = ?')
    const result = stmt.run(id)

    if (result.changes === 0) {
      console.error('[Repository] 读者不存在，ID:', id)
      throw new NotFoundError('读者')
    }
    console.log('[Repository] 删除成功，影响行数:', result.changes)
  }

  // 生成下一个读者编号
  generateNextReaderNo(categoryId: number): string {
    const category = this.findCategoryById(categoryId)
    if (!category) {
      throw new NotFoundError('读者种类')
    }

    // 格式: {CATEGORY_CODE}{YYYYMMDD}{4位顺序号}
    const today = new Date()
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD
    const prefix = `${category.code}${dateStr}`

    // 查找今天同类别的最大编号
    const stmt = db.prepare(`
      SELECT reader_no FROM readers
      WHERE reader_no LIKE ?
      ORDER BY reader_no DESC
      LIMIT 1
    `)
    const result = stmt.get(`${prefix}%`) as { reader_no?: string } | undefined

    let sequence = 1
    if (result?.reader_no) {
      // 从编号中提取序号部分
      const lastSequence = result.reader_no.slice(prefix.length)
      const lastNum = parseInt(lastSequence, 10)
      if (!isNaN(lastNum)) {
        sequence = lastNum + 1
      }
    }

    // 格式化为4位数字
    const sequenceStr = sequence.toString().padStart(4, '0')
    return `${prefix}${sequenceStr}`
  }
}
