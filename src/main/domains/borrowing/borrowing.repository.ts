import { db } from '../../database'
import { NotFoundError } from '../../lib/errorHandler'

export interface BorrowingRecord {
  id: number
  reader_id: number
  book_id: number
  borrow_date: string
  due_date: string
  return_date?: string
  renewal_count: number
  status: 'borrowed' | 'returned' | 'overdue' | 'lost'
  fine_amount: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface BorrowingRecordWithDetails extends BorrowingRecord {
  reader_name: string
  reader_no: string
  book_title: string
  book_author: string
  book_isbn: string
}

export class BorrowingRepository {
  findAll(filters?: {
    reader_id?: number
    book_id?: number
    status?: string
  }): BorrowingRecordWithDetails[] {
    let sql = `
      SELECT
        br.*,
        r.name as reader_name,
        r.reader_no,
        b.title as book_title,
        b.author as book_author,
        b.isbn as book_isbn
      FROM borrowing_records br
      JOIN readers r ON br.reader_id = r.id
      JOIN books b ON br.book_id = b.id
      WHERE 1=1
    `
    const params: any[] = []

    if (filters?.reader_id) {
      sql += ' AND br.reader_id = ?'
      params.push(filters.reader_id)
    }

    if (filters?.book_id) {
      sql += ' AND br.book_id = ?'
      params.push(filters.book_id)
    }

    if (filters?.status) {
      sql += ' AND br.status = ?'
      params.push(filters.status)
    }

    sql += ' ORDER BY br.borrow_date DESC'

    const stmt = db.prepare(sql)
    return stmt.all(...params) as BorrowingRecordWithDetails[]
  }

  findById(id: number): BorrowingRecordWithDetails | undefined {
    const stmt = db.prepare(`
      SELECT
        br.*,
        r.name as reader_name,
        r.reader_no,
        b.title as book_title,
        b.author as book_author,
        b.isbn as book_isbn
      FROM borrowing_records br
      JOIN readers r ON br.reader_id = r.id
      JOIN books b ON br.book_id = b.id
      WHERE br.id = ?
    `)
    return stmt.get(id) as BorrowingRecordWithDetails | undefined
  }

  create(record: Omit<BorrowingRecord, 'id' | 'created_at' | 'updated_at'>): BorrowingRecord {
    const stmt = db.prepare(`
      INSERT INTO borrowing_records (
        reader_id, book_id, borrow_date, due_date, return_date,
        renewal_count, status, fine_amount, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const result = stmt.run(
      record.reader_id,
      record.book_id,
      record.borrow_date,
      record.due_date,
      record.return_date,
      record.renewal_count,
      record.status,
      record.fine_amount,
      record.notes
    )

    const created = this.findById(result.lastInsertRowid as number)
    if (!created) throw new NotFoundError('借阅记录')
    return created
  }

  update(id: number, updates: Partial<BorrowingRecord>): BorrowingRecord {
    const fields: string[] = []
    const values: any[] = []

    Object.keys(updates).forEach((key) => {
      if (key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
        fields.push(`${key} = ?`)
        values.push(updates[key as keyof BorrowingRecord])
      }
    })

    if (fields.length > 0) {
      fields.push('updated_at = CURRENT_TIMESTAMP')
      values.push(id)
      db.prepare(`UPDATE borrowing_records SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    }

    const updated = this.findById(id)
    if (!updated) throw new NotFoundError('借阅记录')
    return updated
  }

  // 查找读者的某本书的未归还借阅记录
  findActiveBorrowing(readerId: number, bookId: number): BorrowingRecordWithDetails | undefined {
    const stmt = db.prepare(`
      SELECT
        br.*,
        r.name as reader_name,
        r.reader_no,
        b.title as book_title,
        b.author as book_author,
        b.isbn as book_isbn
      FROM borrowing_records br
      JOIN readers r ON br.reader_id = r.id
      JOIN books b ON br.book_id = b.id
      WHERE br.reader_id = ? AND br.book_id = ? AND br.status = 'borrowed'
    `)
    return stmt.get(readerId, bookId) as BorrowingRecordWithDetails | undefined
  }

  // 获取逾期记录
  getOverdueRecords(): BorrowingRecordWithDetails[] {
    const stmt = db.prepare(`
      SELECT
        br.*,
        r.name as reader_name,
        r.reader_no,
        b.title as book_title,
        b.author as book_author,
        b.isbn as book_isbn
      FROM borrowing_records br
      JOIN readers r ON br.reader_id = r.id
      JOIN books b ON br.book_id = b.id
      WHERE br.status = 'borrowed' AND br.due_date < date('now')
      ORDER BY br.due_date
    `)
    return stmt.all() as BorrowingRecordWithDetails[]
  }

  // 更新逾期状态
  updateOverdueStatus(): number {
    const stmt = db.prepare(`
      UPDATE borrowing_records
      SET status = 'overdue'
      WHERE status = 'borrowed' AND due_date < date('now')
    `)
    const result = stmt.run()
    return result.changes
  }

  // 计算逾期罚款
  calculateFine(recordId: number, finePerDay: number): number {
    const record = this.findById(recordId)
    if (!record || record.status !== 'borrowed') {
      return 0
    }

    const dueDate = new Date(record.due_date)
    const today = new Date()

    if (today <= dueDate) {
      return 0
    }

    const overdueDays = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
    return overdueDays * finePerDay
  }

  // 获取借阅统计
  getBorrowingStatistics(): {
    total_borrowed: number
    currently_borrowed: number
    overdue_count: number
    total_fines: number
  } {
    const stmt = db.prepare(`
      SELECT
        COUNT(*) as total_borrowed,
        SUM(CASE WHEN status = 'borrowed' OR status = 'overdue' THEN 1 ELSE 0 END) as currently_borrowed,
        SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue_count,
        SUM(fine_amount) as total_fines
      FROM borrowing_records
    `)
    return stmt.get() as any
  }
}
