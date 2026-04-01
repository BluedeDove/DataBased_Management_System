import { BorrowingRepository, BorrowingRecord, BorrowingRecordWithDetails } from './borrowing.repository'
import { BookRepository } from '../book/book.repository'
import { ReaderRepository } from '../reader/reader.repository'
import { ValidationError, BusinessError, BorrowLimitError, StockUnavailableError, NotFoundError } from '../../lib/errorHandler'
import { logger } from '../../lib/logger'
import { config } from '../../config'
import { db } from '../../database'

export class BorrowingService {
  private borrowingRepository = new BorrowingRepository()
  private bookRepository = new BookRepository()
  private readerRepository = new ReaderRepository()

  async borrowBook(readerId: number, bookId: number): Promise<BorrowingRecord> {
    logger.info('借书请求', { readerId, bookId })
    let reader: any = null, book: any = null
    try {
      reader = this.readerRepository.findById(readerId)
      if (!reader) throw new ValidationError('读者不存在')
      if (reader.status !== 'active') throw new BusinessError('读者证未激活或已挂失')
      if (reader.expiry_date && new Date(reader.expiry_date) < new Date()) throw new BusinessError('读者证已过期')
      const currentBorrowCount = this.readerRepository.getBorrowingCount(readerId)
      if (currentBorrowCount >= reader.max_borrow_count) throw new BorrowLimitError(`已达到最大借阅数量（${reader.max_borrow_count}本）`)
      if (this.readerRepository.hasOverdueBooks(readerId)) throw new BusinessError('您有图书逾期未还，请先归还逾期图书')
      book = this.bookRepository.findById(bookId)
      if (!book) throw new ValidationError('图书不存在')
      if (book.status !== 'normal') {
        const statusMap: Record<string, string> = { damaged: '已损坏', lost: '已丢失', maintenance: '正在维修', retired: '已报废' }
        throw new BusinessError(`该图书无法借阅（${statusMap[book.status] || book.status}），请联系管理员`)
      }
      if (book.available_quantity < 1) throw new StockUnavailableError('暂无可借图书')
      const existingBorrowing = this.borrowingRepository.findActiveBorrowing(readerId, bookId)
      if (existingBorrowing) throw new BusinessError('您已借阅该图书，不能重复借阅')
      const borrowDate = new Date()
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + reader.max_borrow_days)
      const transaction = db.transaction(() => {
        const record = this.borrowingRepository.create({ reader_id: readerId, book_id: bookId, borrow_date: borrowDate.toISOString().split('T')[0], due_date: dueDate.toISOString().split('T')[0], renewal_count: 0, status: 'borrowed', fine_amount: 0 })
        this.bookRepository.decreaseAvailableQuantity(bookId, 1)
        logger.info('借书成功', { reader: reader.name, book: book.title, dueDate: dueDate.toISOString().split('T')[0] })
        return record
      })
      return transaction()
    } catch (error) {
      logger.error('借书失败', { readerId, bookId, error: error instanceof Error ? error.message : String(error) })
      throw error
    }
  }

  async returnBook(recordId: number): Promise<BorrowingRecord> {
    logger.info('还书请求', { recordId })
    let record: any = null
    try {
      record = this.borrowingRepository.findById(recordId)
      if (!record) throw new ValidationError('借阅记录不存在')
      if (record.status === 'returned') throw new BusinessError('该书已归还')
      const fine = this.borrowingRepository.calculateFine(recordId, config.business.overdueFinePerDay)
      const returnDate = new Date()
      const transaction = db.transaction(() => {
        const updated = this.borrowingRepository.update(recordId, { return_date: returnDate.toISOString().split('T')[0], status: 'returned', fine_amount: fine })
        this.bookRepository.increaseAvailableQuantity(record.book_id, 1)
        logger.info('还书成功', { reader: record.reader_name, book: record.book_title, fine })
        return updated
      })
      return transaction()
    } catch (error) {
      logger.error('还书失败', { recordId, error: error instanceof Error ? error.message : String(error) })
      throw error
    }
  }

  async renewBook(recordId: number): Promise<BorrowingRecord> {
    const record = this.borrowingRepository.findById(recordId)
    if (!record) throw new ValidationError('借阅记录不存在')
    if (record.status !== 'borrowed') throw new BusinessError('只有借阅中的图书才能续借')
    if (record.renewal_count >= config.business.maxRenewalCount) throw new BorrowLimitError(`已达到最大续借次数（${config.business.maxRenewalCount}次）`)
    if (new Date(record.due_date) < new Date()) throw new BusinessError('图书已逾期，不能续借')
    const reader = this.readerRepository.findById(record.reader_id)
    if (!reader) throw new ValidationError('读者不存在')
    const newDueDate = new Date(record.due_date)
    newDueDate.setDate(newDueDate.getDate() + reader.max_borrow_days)
    const updated = this.borrowingRepository.update(recordId, { due_date: newDueDate.toISOString().split('T')[0], renewal_count: record.renewal_count + 1 })
    logger.info('续借成功', { reader: record.reader_name, book: record.book_title, newDueDate: newDueDate.toISOString().split('T')[0] })
    return updated
  }

  async markBookAsLost(recordId: number): Promise<void> {
    const record = this.borrowingRepository.findById(recordId)
    if (!record) throw new ValidationError('借阅记录不存在')
    if (record.status === 'returned') throw new BusinessError('该书已归还')
    const book = this.bookRepository.findById(record.book_id)
    if (!book) throw new ValidationError('图书不存在')
    const compensationFee = (book.price || 0) * 2
    const transaction = db.transaction(() => {
      this.borrowingRepository.update(recordId, { status: 'lost', fine_amount: compensationFee, notes: `图书丢失，赔偿金额：${compensationFee}元` })
      this.bookRepository.update(record.book_id, { total_quantity: Math.max(0, book.total_quantity - 1) })
      logger.warn('图书丢失处理完成', { book: book.title, compensation: compensationFee })
    })
    transaction()
  }

  getAllRecords(filters?: { reader_id?: number; book_id?: number; status?: string; keyword?: string; borrow_date_from?: string; borrow_date_to?: string }): BorrowingRecordWithDetails[] { return this.borrowingRepository.findAll(filters) }
  getOverdueRecords(): BorrowingRecordWithDetails[] { this.borrowingRepository.updateOverdueStatus(); return this.borrowingRepository.getOverdueRecords() }
  getBorrowingStatistics() { return this.borrowingRepository.getBorrowingStatistics() }
  getReaderBorrowingHistory(readerId: number): BorrowingRecordWithDetails[] { return this.borrowingRepository.findAll({ reader_id: readerId }) }
  getBookBorrowingHistory(bookId: number): BorrowingRecordWithDetails[] { return this.borrowingRepository.findAll({ book_id: bookId }) }

  getPopularBorrowings(limit: number = 10): Array<{ book_id: number; book_title: string; book_author: string; borrow_count: number }> {
    return db.prepare(`SELECT b.id as book_id, b.title as book_title, b.author as book_author, COUNT(br.id) as borrow_count FROM borrowing_records br JOIN books b ON br.book_id = b.id WHERE br.borrow_date >= date('now', '-30 days') GROUP BY b.id, b.title, b.author ORDER BY borrow_count DESC LIMIT ?`).all(limit) as any
  }

  getActiveReaders(limit: number = 10): Array<{ reader_id: number; reader_name: string; reader_no: string; borrow_count: number }> {
    return db.prepare(`SELECT r.id as reader_id, r.name as reader_name, r.reader_no, COUNT(br.id) as borrow_count FROM borrowing_records br JOIN readers r ON br.reader_id = r.id WHERE br.borrow_date >= date('now', '-30 days') GROUP BY r.id, r.name, r.reader_no ORDER BY borrow_count DESC LIMIT ?`).all(limit) as any
  }

  deleteRecord(id: number): void {
    const record = this.borrowingRepository.findById(id)
    if (!record) throw new NotFoundError('借阅记录')
    if (record.status !== 'returned') throw new BusinessError('只能删除已归还的借阅记录')
    this.borrowingRepository.delete(id)
    logger.warn('删除借阅记录', { id })
  }

  getBorrowingTrend(days: number = 30): Array<{ date: string; count: number }> { return this.borrowingRepository.getBorrowingTrend(days) }
  getBookCount(): number { return this.bookRepository.getTotalCount() }
}
