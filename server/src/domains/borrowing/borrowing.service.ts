import {
  BorrowingRepository,
  BorrowingRecord,
  BorrowingRecordWithDetails,
  RenewalRequestWithDetails
} from './borrowing.repository'
import { BookRepository } from '../book/book.repository'
import { BookCopyRepository, BookCopyWithBook } from '../book/book-copy.repository'
import { ReaderRepository, ReaderWithCategory } from '../reader/reader.repository'
import { ReservationService } from '../reservation/reservation.service'
import { notificationService } from '../notification/notification.service'
import { ValidationError, BusinessError, BorrowLimitError, StockUnavailableError, NotFoundError } from '../../lib/errorHandler'
import { logger } from '../../lib/logger'
import { config } from '../../config'
import { db } from '../../database'
import type { User } from '../../middleware/auth.middleware'

export class BorrowingService {
  private borrowingRepository = new BorrowingRepository()
  private bookRepository = new BookRepository()
  private bookCopyRepository = new BookCopyRepository()
  private readerRepository = new ReaderRepository()
  private reservationService = new ReservationService()

  private resolveMachineCopyAction(copy: BookCopyWithBook, activeBorrowing?: BorrowingRecordWithDetails | null) {
    if (activeBorrowing) {
      return {
        action: 'return' as const,
        hint: '该副本当前已借出，可在终端扫码归还'
      }
    }

    if (copy.status !== 'available') {
      return {
        action: 'unavailable' as const,
        hint: '该副本当前状态不可借出，请联系馆员处理'
      }
    }

    if (copy.book_status !== 'normal') {
      return {
        action: 'unavailable' as const,
        hint: '该图书馆藏状态异常，当前仅可查询，不可借出'
      }
    }

    return {
      action: 'borrow' as const,
      hint: '该副本可扫码借出'
    }
  }

  private getCurrentBorrowingCount(readerId: number): number {
    const row = db.prepare(`
      SELECT COUNT(*) AS count
      FROM borrowing_records
      WHERE reader_id = ? AND status IN ('borrowed', 'overdue') AND is_deleted = 0
    `).get(readerId) as { count: number }

    return row.count
  }

  private hasOutstandingOverdues(readerId: number): boolean {
    const row = db.prepare(`
      SELECT COUNT(*) AS count
      FROM borrowing_records
      WHERE reader_id = ?
        AND is_deleted = 0
        AND (status = 'overdue' OR (status = 'borrowed' AND due_date < date('now')))
    `).get(readerId) as { count: number }

    return row.count > 0
  }

  private findOutstandingBorrowing(readerId: number, bookId: number): BorrowingRecordWithDetails | undefined {
    return this.borrowingRepository
      .findAll({ reader_id: readerId, book_id: bookId })
      .find(record => record.status === 'borrowed' || record.status === 'overdue')
  }

  private calculateFine(record: BorrowingRecordWithDetails): number {
    const dueDate = new Date(`${record.due_date}T00:00:00`)
    const today = new Date()
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())

    if (todayOnly <= dueDate) return 0

    const overdueDays = Math.ceil((todayOnly.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
    return overdueDays * config.business.overdueFinePerDay
  }

  private ensureRenewalAllowed(record: BorrowingRecordWithDetails): ReaderWithCategory {
    if (record.status !== 'borrowed') {
      throw new BusinessError('只有在借中的图书才能续借。')
    }

    if (record.renewal_count >= config.business.maxRenewalCount) {
      throw new BorrowLimitError(`已达到最大续借次数（${config.business.maxRenewalCount} 次）。`)
    }

    if (new Date(`${record.due_date}T23:59:59`) < new Date()) {
      throw new BusinessError('图书已经逾期，不能续借。')
    }

    const reader = this.readerRepository.findById(record.reader_id)
    if (!reader) {
      throw new ValidationError('读者不存在。')
    }

    return reader
  }

  private validateReaderForBorrow(readerId: number): ReaderWithCategory {
    const reader = this.readerRepository.findById(readerId)
    if (!reader) {
      throw new ValidationError('读者不存在。')
    }

    if (reader.status !== 'active') {
      throw new BusinessError('当前读者状态不可借阅。')
    }

    if (reader.expiry_date && new Date(`${reader.expiry_date}T23:59:59`) < new Date()) {
      throw new BusinessError('读者证已过期。')
    }

    if (this.getCurrentBorrowingCount(readerId) >= reader.max_borrow_count) {
      throw new BorrowLimitError(`已达到最大借阅数量（${reader.max_borrow_count} 本）。`)
    }

    if (this.hasOutstandingOverdues(readerId)) {
      throw new BusinessError('您存在逾期未还图书，请先处理后再借阅。')
    }

    return reader
  }

  private createBorrowRecord(
    readerId: number,
    bookId: number,
    reader: ReaderWithCategory,
    copy?: BookCopyWithBook | null
  ): BorrowingRecord {
    const book = this.bookRepository.findById(bookId)
    if (!book) {
      throw new ValidationError('图书不存在。')
    }

    if (book.status !== 'normal') {
      throw new BusinessError(`当前图书状态不可借阅：${book.status}`)
    }

    if (book.available_quantity < 1) {
      throw new StockUnavailableError('当前没有可借副本。')
    }

    const existingBorrowing = this.findOutstandingBorrowing(readerId, bookId)
    if (existingBorrowing) {
      throw new BusinessError('该读者已借阅这本图书，不能重复借阅。')
    }

    const borrowDate = new Date()
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + reader.max_borrow_days)

    const transaction = db.transaction(() => {
      const record = this.borrowingRepository.create({
        reader_id: readerId,
        book_id: bookId,
        copy_id: copy?.id ?? null,
        borrow_date: borrowDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        renewal_count: 0,
        status: 'borrowed',
        fine_amount: 0
      })

      if (copy?.id) {
        this.bookCopyRepository.updateStatus(copy.id, 'borrowed')
      }

      this.bookRepository.decreaseAvailableQuantity(bookId, 1)
      this.reservationService.fulfillReservation(readerId, bookId)

      logger.info('借书成功', {
        reader: reader.name,
        book: book.title,
        copyBarcode: copy?.barcode || null,
        dueDate: dueDate.toISOString().split('T')[0]
      })

      return record
    })

    return transaction()
  }

  private performRenewal(recordId: number): BorrowingRecord {
    const record = this.borrowingRepository.findById(recordId)
    if (!record) {
      throw new ValidationError('借阅记录不存在。')
    }

    const reader = this.ensureRenewalAllowed(record)
    const newDueDate = new Date(`${record.due_date}T00:00:00`)
    newDueDate.setDate(newDueDate.getDate() + reader.max_borrow_days)

    const updated = this.borrowingRepository.update(recordId, {
      due_date: newDueDate.toISOString().split('T')[0],
      renewal_count: record.renewal_count + 1
    })

    logger.info('续借成功', {
      reader: record.reader_name,
      book: record.book_title,
      newDueDate: newDueDate.toISOString().split('T')[0]
    })

    return updated
  }

  async borrowBook(readerId: number, bookId: number): Promise<BorrowingRecord> {
    logger.info('收到借书请求', { readerId, bookId })

    try {
      const reader = this.validateReaderForBorrow(readerId)
      const copy = this.bookCopyRepository.findAvailableByBookId(bookId)
      return this.createBorrowRecord(readerId, bookId, reader, copy)
    } catch (error) {
      logger.error('借书失败', { readerId, bookId, error: error instanceof Error ? error.message : String(error) })
      throw error
    }
  }

  async borrowCopyByBarcode(
    readerNo: string,
    barcode: string
  ): Promise<{ record: BorrowingRecord; reader: ReaderWithCategory; copy: BookCopyWithBook }> {
    const reader = this.readerRepository.findByReaderNo(readerNo.trim())
    if (!reader) {
      throw new ValidationError('读者不存在。')
    }

    const copy = this.bookCopyRepository.findByBarcode(barcode.trim())
    if (!copy) {
      throw new ValidationError('没有找到对应条码的图书副本。')
    }

    if (copy.status !== 'available') {
      throw new BusinessError(`该副本当前不可借：${copy.status}`)
    }

    const validatedReader = this.validateReaderForBorrow(reader.id)
    const record = this.createBorrowRecord(reader.id, copy.book_id, validatedReader, copy)
    const updatedCopy = this.bookCopyRepository.findById(copy.id)
    if (!updatedCopy) {
      throw new NotFoundError('图书副本')
    }

    return {
      record,
      reader: validatedReader,
      copy: updatedCopy
    }
  }

  async returnBook(recordId: number): Promise<BorrowingRecord> {
    logger.info('收到还书请求', { recordId })

    const record = this.borrowingRepository.findById(recordId)
    if (!record) {
      throw new ValidationError('借阅记录不存在。')
    }

    if (record.status === 'returned') {
      throw new BusinessError('该书已经归还。')
    }

    const fine = this.calculateFine(record)
    const returnDate = new Date()

    const transaction = db.transaction(() => {
      const updated = this.borrowingRepository.update(recordId, {
        return_date: returnDate.toISOString().split('T')[0],
        status: 'returned',
        fine_amount: fine
      })

      if (record.copy_id) {
        this.bookCopyRepository.updateStatus(record.copy_id, 'available')
      }

      this.bookRepository.increaseAvailableQuantity(record.book_id, 1)

      logger.info('还书成功', {
        reader: record.reader_name,
        book: record.book_title,
        fine,
        copyBarcode: record.copy_barcode || null
      })

      return updated
    })

    return transaction()
  }

  async returnCopyByBarcode(barcode: string): Promise<{ record: BorrowingRecord; copy: BookCopyWithBook }> {
    const copy = this.bookCopyRepository.findByBarcode(barcode.trim())
    if (!copy) {
      throw new ValidationError('没有找到对应条码的图书副本。')
    }

    const activeBorrowing = this.borrowingRepository.findActiveBorrowingByCopyId(copy.id)
    if (!activeBorrowing) {
      throw new BusinessError('该副本当前没有在借记录。')
    }

    const record = await this.returnBook(activeBorrowing.id)
    const updatedCopy = this.bookCopyRepository.findById(copy.id)
    if (!updatedCopy) {
      throw new NotFoundError('图书副本')
    }

    return { record, copy: updatedCopy }
  }

  getReaderSummaryByReaderNo(readerNo: string) {
    const reader = this.readerRepository.findByReaderNo(readerNo.trim())
    if (!reader) {
      throw new ValidationError('读者不存在。')
    }

    return {
      ...reader,
      current_borrowing_count: this.getCurrentBorrowingCount(reader.id),
      has_overdue_books: this.hasOutstandingOverdues(reader.id)
    }
  }

  getReaderSuggestions(keyword: string) {
    const query = keyword.trim()
    if (!query) return []

    return this.readerRepository.search(query)
      .slice(0, 6)
      .map(reader => ({
        ...reader,
        current_borrowing_count: this.getCurrentBorrowingCount(reader.id),
        has_overdue_books: this.hasOutstandingOverdues(reader.id)
      }))
  }

  getCopySummaryByBarcode(barcode: string) {
    const copy = this.bookCopyRepository.findByBarcode(barcode.trim())
    if (!copy) {
      throw new ValidationError('没有找到对应条码的图书副本。')
    }

    const activeBorrowing = this.borrowingRepository.findActiveBorrowingByCopyId(copy.id)
    const machineAction = this.resolveMachineCopyAction(copy, activeBorrowing)
    return {
      copy,
      active_borrowing: activeBorrowing || null,
      suggested_action: machineAction.action,
      action_hint: machineAction.hint
    }
  }

  getCopySuggestions(keyword: string) {
    const query = keyword.trim()
    if (!query) return []

    return this.bookCopyRepository.searchSuggestions(query, 6).map(copy => {
      const activeBorrowing = this.borrowingRepository.findActiveBorrowingByCopyId(copy.id)
      const machineAction = this.resolveMachineCopyAction(copy, activeBorrowing)

      return {
        id: copy.id,
        barcode: copy.barcode,
        title: copy.title,
        author: copy.author,
        isbn: copy.isbn,
        status: copy.status,
        book_status: copy.book_status,
        suggested_action: machineAction.action,
        action_hint: machineAction.hint,
        active_reader_name: activeBorrowing?.reader_name || null,
        active_reader_no: activeBorrowing?.reader_no || null
      }
    })
  }

  async renewBook(recordId: number): Promise<BorrowingRecord> {
    return this.performRenewal(recordId)
  }

  async requestRenewal(recordId: number, requester: User, requestNote?: string): Promise<RenewalRequestWithDetails> {
    if (!requester.reader_id) {
      throw new BusinessError('当前账号未绑定读者信息，无法申请续借。')
    }

    if (['admin', 'librarian'].includes(requester.role)) {
      throw new BusinessError('馆员请直接处理借阅记录，无需提交续借申请。')
    }

    const record = this.borrowingRepository.findById(recordId)
    if (!record) {
      throw new ValidationError('借阅记录不存在。')
    }

    if (record.reader_id !== requester.reader_id) {
      throw new BusinessError('只能为自己的借阅记录申请续借。')
    }

    this.ensureRenewalAllowed(record)

    const pendingRequest = this.borrowingRepository.findPendingRenewalRequestByRecord(recordId)
    if (pendingRequest) {
      throw new BusinessError('该借阅记录已存在待处理的续借申请。')
    }

    const request = this.borrowingRepository.createRenewalRequest({
      borrowing_record_id: recordId,
      request_user_id: requester.id,
      request_note: requestNote?.trim() || null
    })

    notificationService.notifyRenewalRequest({
      requestId: request.id,
      borrowingRecordId: recordId,
      requesterName: requester.name,
      bookTitle: record.book_title,
      dueDate: record.due_date,
      note: request.request_note || null
    })

    logger.info('续借申请已提交', {
      requestId: request.id,
      recordId,
      requester: requester.username
    })

    return request
  }

  async reviewRenewalRequest(
    requestId: number,
    reviewer: User,
    action: 'approve' | 'reject',
    reviewNote?: string
  ): Promise<{ request: RenewalRequestWithDetails; record: BorrowingRecord | null }> {
    if (!['admin', 'librarian'].includes(reviewer.role)) {
      throw new BusinessError('只有馆员或管理员可以审批续借申请。')
    }

    const request = this.borrowingRepository.findRenewalRequestById(requestId)
    if (!request) {
      throw new ValidationError('续借申请不存在。')
    }

    if (request.status !== 'pending') {
      throw new BusinessError('该续借申请已经处理过了。')
    }

    const transaction = db.transaction((): BorrowingRecord | null => {
      let updatedRecord: BorrowingRecord | null = null

      if (action === 'approve') {
        updatedRecord = this.performRenewal(request.borrowing_record_id)
      }

      this.borrowingRepository.updateRenewalRequest(requestId, {
        status: action === 'approve' ? 'approved' : 'rejected',
        review_note: reviewNote?.trim() || null,
        reviewed_by: reviewer.id,
        reviewed_at: new Date().toISOString()
      })

      return updatedRecord
    })

    const updatedRecord = transaction()
    const reviewedRequest = this.borrowingRepository.findRenewalRequestById(requestId)
    if (!reviewedRequest) {
      throw new NotFoundError('续借申请')
    }

    notificationService.notifyRenewalResult({
      userId: reviewedRequest.request_user_id,
      borrowingRecordId: reviewedRequest.borrowing_record_id,
      approved: action === 'approve',
      bookTitle: reviewedRequest.book_title,
      reviewerName: reviewer.name,
      dueDate: updatedRecord ? updatedRecord.due_date : undefined,
      note: reviewNote?.trim() || null
    })

    logger.info('续借申请已审批', {
      requestId,
      action,
      reviewer: reviewer.username
    })

    return {
      request: reviewedRequest,
      record: updatedRecord
    }
  }

  getPendingRenewalRequests(): RenewalRequestWithDetails[] {
    return this.borrowingRepository.getPendingRenewalRequests()
  }

  async markBookAsLost(recordId: number): Promise<void> {
    const record = this.borrowingRepository.findById(recordId)
    if (!record) {
      throw new ValidationError('借阅记录不存在。')
    }

    if (record.status === 'returned') {
      throw new BusinessError('已归还记录不能再标记遗失。')
    }

    const book = this.bookRepository.findById(record.book_id)
    if (!book) {
      throw new ValidationError('图书不存在。')
    }

    const compensationFee = (book.price || 0) * 2

    const transaction = db.transaction(() => {
      this.borrowingRepository.update(recordId, {
        status: 'lost',
        fine_amount: compensationFee,
        notes: `图书遗失，赔偿金额：${compensationFee} 元`
      })

      if (record.copy_id) {
        this.bookCopyRepository.updateStatus(record.copy_id, 'lost')
      }

      this.bookRepository.update(record.book_id, {
        total_quantity: Math.max(0, book.total_quantity - 1),
        available_quantity: Math.min(book.available_quantity, Math.max(0, book.total_quantity - 1))
      })

      logger.warn('图书遗失处理完成', {
        book: book.title,
        compensation: compensationFee
      })
    })

    transaction()
  }

  getAllRecords(filters?: {
    reader_id?: number
    book_id?: number
    status?: string
    keyword?: string
    borrow_date_from?: string
    borrow_date_to?: string
  }): BorrowingRecordWithDetails[] {
    this.borrowingRepository.updateOverdueStatus()
    return this.borrowingRepository.findAll(filters)
  }

  getOverdueRecords(): BorrowingRecordWithDetails[] {
    this.borrowingRepository.updateOverdueStatus()
    return this.borrowingRepository.getOverdueRecords()
  }

  getBorrowingStatistics() {
    this.borrowingRepository.updateOverdueStatus()
    return this.borrowingRepository.getBorrowingStatistics()
  }

  getReaderBorrowingHistory(readerId: number): BorrowingRecordWithDetails[] {
    this.borrowingRepository.updateOverdueStatus()
    return this.borrowingRepository.findAll({ reader_id: readerId })
  }

  getBookBorrowingHistory(bookId: number): BorrowingRecordWithDetails[] {
    this.borrowingRepository.updateOverdueStatus()
    return this.borrowingRepository.findAll({ book_id: bookId })
  }

  getPopularBorrowings(limit = 10): Array<{ book_id: number; book_title: string; book_author: string; borrow_count: number }> {
    return db.prepare(`
      SELECT
        b.id AS book_id,
        b.title AS book_title,
        b.author AS book_author,
        COUNT(br.id) AS borrow_count
      FROM borrowing_records br
      JOIN books b ON br.book_id = b.id
      WHERE br.borrow_date >= date('now', '-30 days')
      GROUP BY b.id, b.title, b.author
      ORDER BY borrow_count DESC
      LIMIT ?
    `).all(limit) as any
  }

  getActiveReaders(limit = 10): Array<{ reader_id: number; reader_name: string; reader_no: string; borrow_count: number }> {
    return db.prepare(`
      SELECT
        r.id AS reader_id,
        r.name AS reader_name,
        r.reader_no,
        COUNT(br.id) AS borrow_count
      FROM borrowing_records br
      JOIN readers r ON br.reader_id = r.id
      WHERE br.borrow_date >= date('now', '-30 days')
      GROUP BY r.id, r.name, r.reader_no
      ORDER BY borrow_count DESC
      LIMIT ?
    `).all(limit) as any
  }

  deleteRecord(id: number): void {
    const record = this.borrowingRepository.findById(id)
    if (!record) {
      throw new NotFoundError('借阅记录')
    }

    if (record.status !== 'returned') {
      throw new BusinessError('只能删除已归还的借阅记录。')
    }

    this.borrowingRepository.delete(id)
    logger.warn('删除借阅记录', { id })
  }

  getBorrowingTrend(days = 30): Array<{ date: string; count: number }> {
    return this.borrowingRepository.getBorrowingTrend(days)
  }

  getBookCount(): number {
    return this.bookRepository.getTotalCount()
  }
}
