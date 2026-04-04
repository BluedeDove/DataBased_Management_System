import { NoteRepository, NoteWithDetails } from './note.repository'
import { BorrowingRepository } from '../borrowing/borrowing.repository'
import { NotFoundError, BusinessError, AuthError } from '../../lib/errorHandler'
import { db } from '../../database'

export class NoteService {
  private noteRepository = new NoteRepository()
  private borrowingRepository = new BorrowingRepository()

  private isStaff(role: string): boolean {
    return role === 'admin' || role === 'librarian'
  }

  /** 获取当前用户正在借阅的图书 ID 列表 */
  private getActiveBorrowedBookIds(readerId: number): number[] {
    const rows = db.prepare(`
      SELECT book_id FROM borrowing_records
      WHERE reader_id = ? AND status IN ('borrowed', 'overdue') AND is_deleted = 0
    `).all(readerId) as { book_id: number }[]
    return rows.map(r => r.book_id)
  }

  /** 获取当前用户正在借阅某本书的 borrowing_record id */
  private getActiveBorrowingId(readerId: number, bookId: number): number | null {
    const row = db.prepare(`
      SELECT id FROM borrowing_records
      WHERE reader_id = ? AND book_id = ? AND status IN ('borrowed', 'overdue') AND is_deleted = 0
      ORDER BY borrow_date DESC LIMIT 1
    `).get(readerId, bookId) as { id: number } | undefined
    return row?.id ?? null
  }

  createNote(userId: number, readerId: number | null | undefined, role: string, data: {
    title: string
    content: string
    book_id?: number | null
    visibility: 'private' | 'public' | 'legacy'
  }): NoteWithDetails {
    // legacy 可见性需要关联图书，且当前用户必须正在借阅该书
    if (data.visibility === 'legacy') {
      if (!data.book_id) throw new BusinessError('传承笔记必须关联图书')
      if (!this.isStaff(role)) {
        if (!readerId) throw new BusinessError('您的账号未关联读者信息，无法创建传承笔记')
        const borrowingId = this.getActiveBorrowingId(readerId, data.book_id)
        if (!borrowingId) throw new BusinessError('您当前未借阅该图书，无法创建传承笔记')
        return this.noteRepository.create({ ...data, user_id: userId, legacy_borrowing_id: borrowingId })
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

    // legacy: 作者、管理员/图书管理员可看；普通用户必须正在借阅该书
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
    throw new AuthError('您需要借阅该图书才能查看此传承笔记')
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

  /** 获取某本书的传承笔记（当前借阅者 or staff 可见） */
  getLegacyNote(bookId: number, userId: number, role: string, readerId?: number | null): NoteWithDetails | null {
    const note = this.noteRepository.findLatestLegacyByBook(bookId)
    if (!note) return null
    if (note.user_id === userId || this.isStaff(role)) return note
    if (readerId) {
      const borrowedIds = this.getActiveBorrowedBookIds(readerId)
      if (borrowedIds.includes(bookId)) return note
    }
    throw new AuthError('您需要借阅该图书才能查看传承笔记')
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

    // 切换为 legacy 可见性时，也需要验证正在借阅该书
    const newVisibility = data.visibility ?? note.visibility
    const newBookId = data.book_id !== undefined ? data.book_id : note.book_id
    let legacyBorrowingId: number | undefined = undefined

    if (newVisibility === 'legacy') {
      if (!newBookId) throw new BusinessError('传承笔记必须关联图书')
      if (!this.isStaff(role)) {
        if (!readerId) throw new BusinessError('您的账号未关联读者信息，无法设置传承笔记')
        const borrowingId = this.getActiveBorrowingId(readerId, newBookId)
        if (!borrowingId) throw new BusinessError('您当前未借阅该图书，无法设置传承笔记')
        // 若之前没有记录借阅ID，则补充记录
        if (!note.legacy_borrowing_id) {
          legacyBorrowingId = borrowingId
        }
      }
    }

    const updated = this.noteRepository.update(id, {
      ...data,
      ...(legacyBorrowingId !== undefined ? { legacy_borrowing_id: legacyBorrowingId } : {})
    })
    if (!updated) throw new NotFoundError('笔记不存在')
    return updated
  }

  deleteNote(id: number, userId: number, role: string): void {
    const note = this.noteRepository.findById(id)
    if (!note) throw new NotFoundError('笔记不存在')
    if (note.user_id !== userId && !this.isStaff(role)) throw new AuthError('无权删除该笔记')
    this.noteRepository.softDelete(id)
  }
}
