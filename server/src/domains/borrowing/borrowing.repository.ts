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
  findAll(filters?: { reader_id?: number; book_id?: number; status?: string; keyword?: string; borrow_date_from?: string; borrow_date_to?: string }): BorrowingRecordWithDetails[] {
    let sql = `SELECT br.*, r.name as reader_name, r.reader_no, b.title as book_title, b.author as book_author, b.isbn as book_isbn FROM borrowing_records br JOIN readers r ON br.reader_id = r.id JOIN books b ON br.book_id = b.id WHERE br.is_deleted = 0 AND r.is_deleted = 0 AND b.is_deleted = 0`
    const params: any[] = []
    if (filters?.reader_id) { sql += ' AND br.reader_id = ?'; params.push(filters.reader_id) }
    if (filters?.book_id) { sql += ' AND br.book_id = ?'; params.push(filters.book_id) }
    if (filters?.status) { sql += ' AND br.status = ?'; params.push(filters.status) }
    if (filters?.keyword) { sql += ' AND (r.name LIKE ? OR r.reader_no LIKE ? OR b.title LIKE ? OR b.isbn LIKE ? OR b.author LIKE ?)'; const p = `%${filters.keyword}%`; params.push(p, p, p, p, p) }
    if (filters?.borrow_date_from) { sql += ' AND br.borrow_date >= ?'; params.push(filters.borrow_date_from) }
    if (filters?.borrow_date_to) { sql += ' AND br.borrow_date <= ?'; params.push(filters.borrow_date_to) }
    sql += ' ORDER BY br.borrow_date DESC'
    return db.prepare(sql).all(...params) as BorrowingRecordWithDetails[]
  }

  findById(id: number): BorrowingRecordWithDetails | undefined {
    return db.prepare(`SELECT br.*, r.name as reader_name, r.reader_no, b.title as book_title, b.author as book_author, b.isbn as book_isbn FROM borrowing_records br JOIN readers r ON br.reader_id = r.id JOIN books b ON br.book_id = b.id WHERE br.id = ? AND br.is_deleted = 0`).get(id) as BorrowingRecordWithDetails | undefined
  }

  create(record: Omit<BorrowingRecord, 'id' | 'created_at' | 'updated_at'>): BorrowingRecord {
    const result = db.prepare(`INSERT INTO borrowing_records (reader_id, book_id, borrow_date, due_date, return_date, renewal_count, status, fine_amount, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(record.reader_id, record.book_id, record.borrow_date, record.due_date, record.return_date, record.renewal_count, record.status, record.fine_amount, record.notes)
    const created = this.findById(result.lastInsertRowid as number)
    if (!created) throw new NotFoundError('借阅记录')
    return created
  }

  update(id: number, updates: Partial<BorrowingRecord>): BorrowingRecord {
    const fields: string[] = []
    const values: any[] = []
    Object.keys(updates).forEach((key) => {
      if (!['id', 'created_at', 'updated_at'].includes(key)) { fields.push(`${key} = ?`); values.push(updates[key as keyof BorrowingRecord]) }
    })
    if (fields.length > 0) { fields.push('updated_at = CURRENT_TIMESTAMP'); values.push(id); db.prepare(`UPDATE borrowing_records SET ${fields.join(', ')} WHERE id = ?`).run(...values) }
    const updated = this.findById(id)
    if (!updated) throw new NotFoundError('借阅记录')
    return updated
  }

  findActiveBorrowing(readerId: number, bookId: number): BorrowingRecordWithDetails | undefined {
    return db.prepare(`SELECT br.*, r.name as reader_name, r.reader_no, b.title as book_title, b.author as book_author, b.isbn as book_isbn FROM borrowing_records br JOIN readers r ON br.reader_id = r.id JOIN books b ON br.book_id = b.id WHERE br.reader_id = ? AND br.book_id = ? AND br.status = 'borrowed' AND br.is_deleted = 0`).get(readerId, bookId) as BorrowingRecordWithDetails | undefined
  }

  getOverdueRecords(): BorrowingRecordWithDetails[] {
    return db.prepare(`SELECT br.*, r.name as reader_name, r.reader_no, b.title as book_title, b.author as book_author, b.isbn as book_isbn FROM borrowing_records br JOIN readers r ON br.reader_id = r.id JOIN books b ON br.book_id = b.id WHERE br.status = 'borrowed' AND br.due_date < date('now') AND br.is_deleted = 0 ORDER BY br.due_date`).all() as BorrowingRecordWithDetails[]
  }

  updateOverdueStatus(): number {
    return db.prepare(`UPDATE borrowing_records SET status = 'overdue' WHERE status = 'borrowed' AND due_date < date('now') AND is_deleted = 0`).run().changes
  }

  calculateFine(recordId: number, finePerDay: number): number {
    const record = this.findById(recordId)
    if (!record || record.status !== 'borrowed') return 0
    const dueDate = new Date(record.due_date)
    const today = new Date()
    if (today <= dueDate) return 0
    const overdueDays = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
    return overdueDays * finePerDay
  }

  getBorrowingStatistics(): { total_borrowed: number; currently_borrowed: number; overdue_count: number; total_fines: number } {
    return db.prepare(`SELECT COUNT(*) as total_borrowed, SUM(CASE WHEN status = 'borrowed' OR status = 'overdue' THEN 1 ELSE 0 END) as currently_borrowed, SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue_count, SUM(fine_amount) as total_fines FROM borrowing_records WHERE is_deleted = 0`).get() as any
  }

  delete(id: number): void {
    const result = db.prepare('DELETE FROM borrowing_records WHERE id = ?').run(id)
    if (result.changes === 0) throw new NotFoundError('借阅记录')
  }

  getBorrowingTrend(days: number = 30): Array<{ date: string; count: number }> {
    return db.prepare(`WITH RECURSIVE dates(date) AS (SELECT date('now', 'localtime') UNION ALL SELECT date(date, '-1 day') FROM dates WHERE date > date('now', 'localtime', '-${days} days')) SELECT dates.date as date, COALESCE(COUNT(br.id), 0) as count FROM dates LEFT JOIN borrowing_records br ON date(br.borrow_date) = dates.date AND br.is_deleted = 0 GROUP BY dates.date ORDER BY dates.date ASC`).all() as Array<{ date: string; count: number }>
  }
}
