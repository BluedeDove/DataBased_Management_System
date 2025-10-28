import { BorrowingRepository, BorrowingRecord, BorrowingRecordWithDetails } from './borrowing.repository'
import { BookRepository } from '../book/book.repository'
import { ReaderRepository } from '../reader/reader.repository'
import { ValidationError, BusinessError, BorrowLimitError, StockUnavailableError } from '../../lib/errorHandler'
import { logger } from '../../lib/logger'
import { config } from '../../config'
import { db } from '../../database'

export class BorrowingService {
  private borrowingRepository = new BorrowingRepository()
  private bookRepository = new BookRepository()
  private readerRepository = new ReaderRepository()

  // 借书
  async borrowBook(readerId: number, bookId: number): Promise<BorrowingRecord> {
    logger.info('借书请求', { readerId, bookId })

    // 1. 验证读者
    const reader = this.readerRepository.findById(readerId)
    if (!reader) {
      throw new ValidationError('读者不存在')
    }

    if (reader.status !== 'active') {
      throw new BusinessError('读者证未激活或已挂失')
    }

    if (reader.expiry_date && new Date(reader.expiry_date) < new Date()) {
      throw new BusinessError('读者证已过期')
    }

    // 2. 检查借阅数量限制
    const currentBorrowCount = this.readerRepository.getBorrowingCount(readerId)
    if (currentBorrowCount >= reader.max_borrow_count) {
      throw new BorrowLimitError(`已达到最大借阅数量（${reader.max_borrow_count}本）`)
    }

    // 3. 检查是否有逾期未还
    if (this.readerRepository.hasOverdueBooks(readerId)) {
      throw new BusinessError('您有图书逾期未还，请先归还逾期图书')
    }

    // 4. 验证图书
    const book = this.bookRepository.findById(bookId)
    if (!book) {
      throw new ValidationError('图书不存在')
    }

    if (book.status !== 'normal') {
      throw new BusinessError(`图书状态异常：${book.status}`)
    }

    if (book.available_quantity < 1) {
      throw new StockUnavailableError('暂无可借图书')
    }

    // 5. 检查是否已借阅该书
    const existingBorrowing = this.borrowingRepository.findActiveBorrowing(readerId, bookId)
    if (existingBorrowing) {
      throw new BusinessError('您已借阅该图书，不能重复借阅')
    }

    // 6. 计算归还日期
    const borrowDate = new Date()
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + reader.max_borrow_days)

    // 7. 使用事务确保数据一致性
    const transaction = db.transaction(() => {
      // 7.1 创建借阅记录
      const record = this.borrowingRepository.create({
        reader_id: readerId,
        book_id: bookId,
        borrow_date: borrowDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        renewal_count: 0,
        status: 'borrowed',
        fine_amount: 0
      })

      // 7.2 减少图书可借数量
      this.bookRepository.decreaseAvailableQuantity(bookId, 1)

      logger.info('借书成功', {
        reader: reader.name,
        book: book.title,
        dueDate: dueDate.toISOString().split('T')[0]
      })

      return record
    })

    return transaction()
  }

  // 还书
  async returnBook(recordId: number): Promise<BorrowingRecord> {
    logger.info('还书请求', { recordId })

    const record = this.borrowingRepository.findById(recordId)
    if (!record) {
      throw new ValidationError('借阅记录不存在')
    }

    if (record.status === 'returned') {
      throw new BusinessError('该书已归还')
    }

    // 计算罚款
    const fine = this.borrowingRepository.calculateFine(
      recordId,
      config.business.overdueFinePerDay
    )

    const returnDate = new Date()

    // 使用事务
    const transaction = db.transaction(() => {
      // 更新借阅记录
      const updated = this.borrowingRepository.update(recordId, {
        return_date: returnDate.toISOString().split('T')[0],
        status: 'returned',
        fine_amount: fine
      })

      // 增加图书可借数量
      this.bookRepository.increaseAvailableQuantity(record.book_id, 1)

      logger.info('还书成功', {
        reader: record.reader_name,
        book: record.book_title,
        fine
      })

      return updated
    })

    return transaction()
  }

  // 续借
  async renewBook(recordId: number): Promise<BorrowingRecord> {
    logger.info('续借请求', { recordId })

    const record = this.borrowingRepository.findById(recordId)
    if (!record) {
      throw new ValidationError('借阅记录不存在')
    }

    if (record.status !== 'borrowed') {
      throw new BusinessError('只有借阅中的图书才能续借')
    }

    // 检查续借次数
    if (record.renewal_count >= config.business.maxRenewalCount) {
      throw new BorrowLimitError(`已达到最大续借次数（${config.business.maxRenewalCount}次）`)
    }

    // 检查是否逾期
    if (new Date(record.due_date) < new Date()) {
      throw new BusinessError('图书已逾期，不能续借')
    }

    // 获取读者信息以确定续借期限
    const reader = this.readerRepository.findById(record.reader_id)
    if (!reader) {
      throw new ValidationError('读者不存在')
    }

    // 计算新的归还日期
    const newDueDate = new Date(record.due_date)
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

  // 图书丢失处理
  async markBookAsLost(recordId: number): Promise<void> {
    logger.warn('图书丢失处理', { recordId })

    const record = this.borrowingRepository.findById(recordId)
    if (!record) {
      throw new ValidationError('借阅记录不存在')
    }

    if (record.status === 'returned') {
      throw new BusinessError('该书已归还')
    }

    // 获取图书信息计算赔偿金
    const book = this.bookRepository.findById(record.book_id)
    if (!book) {
      throw new ValidationError('图书不存在')
    }

    const compensationFee = (book.price || 0) * 2 // 按书价2倍赔偿

    // 使用事务
    const transaction = db.transaction(() => {
      // 更新借阅记录
      this.borrowingRepository.update(recordId, {
        status: 'lost',
        fine_amount: compensationFee,
        notes: `图书丢失，赔偿金额：${compensationFee}元`
      })

      // 减少图书总数和可借数（如果还没减过）
      this.bookRepository.update(record.book_id, {
        total_quantity: Math.max(0, book.total_quantity - 1)
        // available_quantity 在借书时已经减过了
      })

      logger.warn('图书丢失处理完成', {
        book: book.title,
        compensation: compensationFee
      })
    })

    transaction()
  }

  // 获取所有借阅记录
  getAllRecords(filters?: {
    reader_id?: number
    book_id?: number
    status?: string
  }): BorrowingRecordWithDetails[] {
    return this.borrowingRepository.findAll(filters)
  }

  // 获取逾期记录
  getOverdueRecords(): BorrowingRecordWithDetails[] {
    // 先更新逾期状态
    this.borrowingRepository.updateOverdueStatus()
    return this.borrowingRepository.getOverdueRecords()
  }

  // 获取借阅统计
  getBorrowingStatistics() {
    return this.borrowingRepository.getBorrowingStatistics()
  }

  // 获取读者的借阅历史
  getReaderBorrowingHistory(readerId: number): BorrowingRecordWithDetails[] {
    return this.borrowingRepository.findAll({ reader_id: readerId })
  }

  // 获取图书的借阅历史
  getBookBorrowingHistory(bookId: number): BorrowingRecordWithDetails[] {
    return this.borrowingRepository.findAll({ book_id: bookId })
  }

  // 获取热门借阅排行
  getPopularBorrowings(limit: number = 10): Array<{
    book_id: number
    book_title: string
    book_author: string
    borrow_count: number
  }> {
    const stmt = db.prepare(`
      SELECT
        b.id as book_id,
        b.title as book_title,
        b.author as book_author,
        COUNT(br.id) as borrow_count
      FROM borrowing_records br
      JOIN books b ON br.book_id = b.id
      WHERE br.borrow_date >= date('now', '-30 days')
      GROUP BY b.id, b.title, b.author
      ORDER BY borrow_count DESC
      LIMIT ?
    `)
    return stmt.all(limit) as any
  }

  // 获取活跃读者排行
  getActiveReaders(limit: number = 10): Array<{
    reader_id: number
    reader_name: string
    reader_no: string
    borrow_count: number
  }> {
    const stmt = db.prepare(`
      SELECT
        r.id as reader_id,
        r.name as reader_name,
        r.reader_no,
        COUNT(br.id) as borrow_count
      FROM borrowing_records br
      JOIN readers r ON br.reader_id = r.id
      WHERE br.borrow_date >= date('now', '-30 days')
      GROUP BY r.id, r.name, r.reader_no
      ORDER BY borrow_count DESC
      LIMIT ?
    `)
    return stmt.all(limit) as any
  }
}
