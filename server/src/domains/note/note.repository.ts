import { db } from '../../database'

export interface Note {
  id: number
  user_id: number
  title: string
  content: string
  book_id: number | null
  visibility: 'private' | 'public' | 'legacy'
  legacy_borrowing_id: number | null
  view_count: number
  version: number
  is_deleted: number
  created_at: string
  updated_at: string
}

export interface NoteWithDetails extends Note {
  author_name: string
  book_title?: string
  book_isbn?: string
}

export class NoteRepository {
  create(data: {
    user_id: number
    title: string
    content: string
    book_id?: number | null
    visibility: 'private' | 'public' | 'legacy'
    legacy_borrowing_id?: number | null
  }): NoteWithDetails {
    const result = db.prepare(`
      INSERT INTO notes (user_id, title, content, book_id, visibility, legacy_borrowing_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      data.user_id,
      data.title,
      data.content,
      data.book_id ?? null,
      data.visibility,
      data.legacy_borrowing_id ?? null
    )
    return this.findById(result.lastInsertRowid as number)!
  }

  findById(id: number): NoteWithDetails | undefined {
    return db.prepare(`
      SELECT n.*, u.name as author_name, b.title as book_title, b.isbn as book_isbn
      FROM notes n
      JOIN users u ON n.user_id = u.id
      LEFT JOIN books b ON n.book_id = b.id
      WHERE n.id = ? AND n.is_deleted = 0
    `).get(id) as NoteWithDetails | undefined
  }

  findByUser(userId: number, params: {
    visibility?: string
    page: number
    pageSize: number
  }): { items: NoteWithDetails[]; total: number } {
    let sql = `
      SELECT n.*, u.name as author_name, b.title as book_title, b.isbn as book_isbn
      FROM notes n
      JOIN users u ON n.user_id = u.id
      LEFT JOIN books b ON n.book_id = b.id
      WHERE n.user_id = ? AND n.is_deleted = 0
    `
    const args: any[] = [userId]
    if (params.visibility && params.visibility !== 'all') {
      sql += ' AND n.visibility = ?'
      args.push(params.visibility)
    }
    const countSql = sql.replace(/SELECT n\.\*.+?FROM notes n/s, 'SELECT COUNT(*) as count FROM notes n')
    const total = (db.prepare(countSql).get(...args) as { count: number }).count
    sql += ' ORDER BY n.updated_at DESC LIMIT ? OFFSET ?'
    args.push(params.pageSize, (params.page - 1) * params.pageSize)
    return { items: db.prepare(sql).all(...args) as NoteWithDetails[], total }
  }

  findPlaza(params: {
    keyword?: string
    bookId?: number
    page: number
    pageSize: number
    orderBy: 'newest' | 'hottest'
  }): { items: NoteWithDetails[]; total: number } {
    let sql = `
      SELECT n.*, u.name as author_name, b.title as book_title, b.isbn as book_isbn
      FROM notes n
      JOIN users u ON n.user_id = u.id
      LEFT JOIN books b ON n.book_id = b.id
      WHERE n.visibility = 'public' AND n.is_deleted = 0
    `
    const args: any[] = []
    if (params.keyword) {
      sql += ' AND (n.title LIKE ? OR n.content LIKE ?)'
      const p = `%${params.keyword}%`
      args.push(p, p)
    }
    if (params.bookId) {
      sql += ' AND n.book_id = ?'
      args.push(params.bookId)
    }
    const countSql = sql.replace(/SELECT n\.\*.+?FROM notes n/s, 'SELECT COUNT(*) as count FROM notes n')
    const total = (db.prepare(countSql).get(...args) as { count: number }).count
    sql += params.orderBy === 'hottest'
      ? ' ORDER BY n.view_count DESC, n.created_at DESC'
      : ' ORDER BY n.created_at DESC'
    sql += ' LIMIT ? OFFSET ?'
    args.push(params.pageSize, (params.page - 1) * params.pageSize)
    return { items: db.prepare(sql).all(...args) as NoteWithDetails[], total }
  }

  /** 获取当前读者正在借阅的书中，其他人留下的所有传承笔记 */
  findLegacyNotesForReader(readerId: number, excludeUserId: number): NoteWithDetails[] {
    return db.prepare(`
      SELECT n.*, u.name as author_name, b.title as book_title, b.isbn as book_isbn
      FROM notes n
      JOIN users u ON n.user_id = u.id
      LEFT JOIN books b ON n.book_id = b.id
      WHERE n.visibility = 'legacy'
        AND n.is_deleted = 0
        AND n.user_id != ?
        AND n.book_id IN (
          SELECT book_id FROM borrowing_records
          WHERE reader_id = ? AND status IN ('borrowed', 'overdue') AND is_deleted = 0
        )
      ORDER BY b.title ASC, n.created_at DESC
    `).all(excludeUserId, readerId) as NoteWithDetails[]
  }

  findLatestLegacyByBook(bookId: number): NoteWithDetails | undefined {
    return db.prepare(`
      SELECT n.*, u.name as author_name, b.title as book_title, b.isbn as book_isbn
      FROM notes n
      JOIN users u ON n.user_id = u.id
      LEFT JOIN books b ON n.book_id = b.id
      WHERE n.book_id = ? AND n.visibility = 'legacy' AND n.is_deleted = 0
      ORDER BY n.created_at DESC
      LIMIT 1
    `).get(bookId) as NoteWithDetails | undefined
  }

  update(id: number, data: {
    title?: string
    content?: string
    book_id?: number | null
    visibility?: 'private' | 'public' | 'legacy'
    legacy_borrowing_id?: number | null
  }): NoteWithDetails | undefined {
    const fields: string[] = []
    const args: any[] = []
    if (data.title !== undefined)               { fields.push('title = ?');               args.push(data.title) }
    if (data.content !== undefined)             { fields.push('content = ?');             args.push(data.content) }
    if (data.book_id !== undefined)             { fields.push('book_id = ?');             args.push(data.book_id) }
    if (data.visibility !== undefined)          { fields.push('visibility = ?');          args.push(data.visibility) }
    if (data.legacy_borrowing_id !== undefined) { fields.push('legacy_borrowing_id = ?'); args.push(data.legacy_borrowing_id) }
    if (!fields.length) return this.findById(id)
    fields.push('updated_at = CURRENT_TIMESTAMP', 'version = version + 1')
    args.push(id)
    db.prepare(`UPDATE notes SET ${fields.join(', ')} WHERE id = ? AND is_deleted = 0`).run(...args)
    return this.findById(id)
  }

  incrementViewCount(id: number): void {
    db.prepare('UPDATE notes SET view_count = view_count + 1 WHERE id = ?').run(id)
  }

  softDelete(id: number): void {
    db.prepare('UPDATE notes SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id)
  }
}
