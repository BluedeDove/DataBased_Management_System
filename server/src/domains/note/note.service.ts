import { NoteRepository, NoteWithDetails } from './note.repository'
import { NotFoundError, BusinessError, AuthError } from '../../lib/errorHandler'
import { db } from '../../database'

export class NoteService {
  private noteRepository = new NoteRepository()

  private isStaff(role: string): boolean {
    return role === 'admin' || role === 'librarian'
  }

  private getActiveBorrowedBookIds(readerId: number): number[] {
    const rows = db.prepare(`
      SELECT book_id
      FROM borrowing_records
      WHERE reader_id = ? AND status IN ('borrowed', 'overdue') AND is_deleted = 0
    `).all(readerId) as { book_id: number }[]

    return rows.map(row => row.book_id)
  }

  private getEligibleLegacyBorrowingId(readerId: number, bookId: number): number | null {
    const row = db.prepare(`
      SELECT br.id
      FROM borrowing_records br
      LEFT JOIN notes n
        ON n.legacy_borrowing_id = br.id
       AND n.visibility = 'legacy'
       AND n.is_deleted = 0
      WHERE br.reader_id = ?
        AND br.book_id = ?
        AND br.status = 'returned'
        AND br.is_deleted = 0
        AND n.id IS NULL
      ORDER BY datetime(COALESCE(br.return_date, br.borrow_date)) DESC, br.id DESC
      LIMIT 1
    `).get(readerId, bookId) as { id: number } | undefined

    return row?.id ?? null
  }

  createNote(userId: number, readerId: number | null | undefined, role: string, data: {
    title: string
    content: string
    book_id?: number | null
    visibility: 'private' | 'public' | 'legacy'
  }): NoteWithDetails {
    if (data.visibility === 'legacy') {
      if (!data.book_id) throw new BusinessError('传承笔记必须关联图书')

      if (!this.isStaff(role)) {
        if (!readerId) throw new BusinessError('当前账号未绑定读者信息，无法创建传承笔记')
        const borrowingId = this.getEligibleLegacyBorrowingId(readerId, data.book_id)
        if (!borrowingId) {
          throw new BusinessError('传承笔记需在归还图书后创建，且每次借阅仅可沉淀一篇')
        }

        return this.noteRepository.create({
          ...data,
          user_id: userId,
          legacy_borrowing_id: borrowingId
        })
      }
    }

    return this.noteRepository.create({ ...data, user_id: userId })
  }

  getNoteById(id: number, userId: number, role: string, readerId?: number | null): NoteWithDetails {
    const note = this.noteRepository.findById(id)
    if (!note) throw new NotFoundError('笔记不存在')

    if (note.visibility === 'public') {
      this.noteRepository.incrementViewCount(id)
      return note
    }

    if (note.visibility === 'private') {
      if (note.user_id !== userId && !this.isStaff(role)) throw new AuthError('无权查看该笔记')
      return note
    }

    if (note.user_id === userId || this.isStaff(role)) {
      this.noteRepository.incrementViewCount(id)
      return note
    }

    if (note.book_id && readerId) {
      const borrowedIds = this.getActiveBorrowedBookIds(readerId)
      if (borrowedIds.includes(note.book_id)) {
        this.noteRepository.incrementViewCount(id)
        return note
      }
    }

    throw new AuthError('您需要先借阅该图书，才能查看传承笔记')
  }

  getUserNotes(userId: number, params: {
    visibility?: string
    page: number
    pageSize: number
  }) {
    return this.noteRepository.findByUser(userId, params)
  }

  getPlazaNotes(params: {
    keyword?: string
    bookId?: number
    page: number
    pageSize: number
    orderBy: 'newest' | 'hottest'
  }) {
    return this.noteRepository.findPlaza(params)
  }

  getLegacyNote(bookId: number, userId: number, role: string, readerId?: number | null): NoteWithDetails | null {
    const note = this.noteRepository.findLatestLegacyByBook(bookId)
    if (!note) return null
    if (note.user_id === userId || this.isStaff(role)) return note
    if (readerId) {
      const borrowedIds = this.getActiveBorrowedBookIds(readerId)
      if (borrowedIds.includes(bookId)) return note
    }
    throw new AuthError('您需要先借阅该图书，才能查看传承笔记')
  }

  updateNote(id: number, userId: number, role: string, readerId: number | null | undefined, data: {
    title?: string
    content?: string
    book_id?: number | null
    visibility?: 'private' | 'public' | 'legacy'
  }): NoteWithDetails {
    const note = this.noteRepository.findById(id)
    if (!note) throw new NotFoundError('笔记不存在')
    if (note.user_id !== userId && !this.isStaff(role)) throw new AuthError('无权编辑该笔记')

    const newVisibility = data.visibility ?? note.visibility
    const newBookId = data.book_id !== undefined ? data.book_id : note.book_id
    let legacyBorrowingId: number | undefined

    if (newVisibility === 'legacy') {
      if (!newBookId) throw new BusinessError('传承笔记必须关联图书')

      if (!this.isStaff(role)) {
        if (!readerId) throw new BusinessError('当前账号未绑定读者信息，无法设置传承笔记')

        const borrowingId = note.legacy_borrowing_id ?? this.getEligibleLegacyBorrowingId(readerId, newBookId)
        if (!borrowingId) {
          throw new BusinessError('传承笔记需在归还图书后创建，且每次借阅仅可沉淀一篇')
        }

        legacyBorrowingId = borrowingId
      }
    }

    const updated = this.noteRepository.update(id, {
      ...data,
      ...(legacyBorrowingId !== undefined ? { legacy_borrowing_id: legacyBorrowingId } : {})
    })
    if (!updated) throw new NotFoundError('笔记不存在')
    return updated
  }

  getLegacyNotesForMe(userId: number, readerId: number | null | undefined): { items: NoteWithDetails[]; total: number } {
    if (!readerId) return { items: [], total: 0 }
    const items = this.noteRepository.findLegacyNotesForReader(readerId, userId)
    return { items, total: items.length }
  }

  deleteNote(id: number, userId: number, role: string): void {
    const note = this.noteRepository.findById(id)
    if (!note) throw new NotFoundError('笔记不存在')
    if (note.user_id !== userId && !this.isStaff(role)) throw new AuthError('无权删除该笔记')
    this.noteRepository.softDelete(id)
  }
}

