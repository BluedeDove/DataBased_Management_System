import { BookRepository, Book, BookCategory, BookWithCategory } from './book.repository'
import { ValidationError, BusinessError, NotFoundError } from '../../lib/errorHandler'
import { logger } from '../../lib/logger'
import { db } from '../../database'

export class BookService {
  private bookRepository = new BookRepository()

  getAllCategories(): BookCategory[] { return this.bookRepository.findAllCategories() }
  getCategoryById(id: number): BookCategory { const c = this.bookRepository.findCategoryById(id); if (!c) throw new NotFoundError('图书类别'); return c }
  createCategory(data: Omit<BookCategory, 'id' | 'created_at' | 'updated_at'>): BookCategory { if (!data.code || !data.name) throw new ValidationError('类别编码和名称不能为空'); logger.info('创建图书类别', data.name); return this.bookRepository.createCategory(data) }
  updateCategory(id: number, updates: Partial<BookCategory>): BookCategory { this.getCategoryById(id); logger.info('更新图书类别'); return this.bookRepository.updateCategory(id, updates) }
  deleteCategory(id: number): void { const existing = this.getCategoryById(id); logger.info('删除图书类别', { id, name: existing.name }); this.bookRepository.deleteCategory(id) }

  getAllBooks(filters?: { category_id?: number; status?: string; keyword?: string }): BookWithCategory[] { return this.bookRepository.findAll(filters) }
  getBookById(id: number): BookWithCategory { const b = this.bookRepository.findById(id); if (!b) throw new NotFoundError('图书'); return b }
  getBookByIsbn(isbn: string): BookWithCategory { const b = this.bookRepository.findByIsbn(isbn); if (!b) throw new NotFoundError('图书'); return b }

  createBook(data: Omit<Book, 'id' | 'created_at' | 'updated_at'>): Book {
    logger.info('开始创建图书')
    if (!data.title || !data.author || !data.publisher) throw new ValidationError('书名、作者和出版社不能为空')
    if (!data.category_id) throw new ValidationError('必须选择图书类别')
    const category = this.bookRepository.findCategoryById(data.category_id)
    if (!category) throw new NotFoundError('图书类别')

    if (!data.isbn || data.isbn.trim() === '' || data.isbn.toUpperCase() === 'AUTO') {
      data.isbn = this.bookRepository.generateNextISBN(data.category_id)
    } else {
      const existing = this.bookRepository.findByIsbn(data.isbn)
      if (existing) throw new BusinessError('该ISBN已存在，请使用"增加馆藏"功能')
    }

    if (!data.available_quantity) data.available_quantity = data.total_quantity
    return this.bookRepository.create(data)
  }

  updateBook(id: number, updates: Partial<Book>): Book {
    const existing = this.getBookById(id)
    if (updates.total_quantity !== undefined) {
      const diff = updates.total_quantity - existing.total_quantity
      updates.available_quantity = Math.max(0, existing.available_quantity + diff)
    }
    logger.info('更新图书信息', existing.title)
    return this.bookRepository.update(id, updates)
  }

  addCopies(id: number, quantity: number): Book {
    if (quantity < 1) throw new ValidationError('数量必须大于0')
    const book = this.getBookById(id)
    logger.info('增加图书馆藏', book.title, quantity)
    return this.bookRepository.update(id, { total_quantity: book.total_quantity + quantity, available_quantity: book.available_quantity + quantity })
  }

  destroyBook(id: number, reason: string): Book {
    const book = this.getBookById(id)
    if (book.available_quantity !== book.total_quantity) throw new BusinessError('该图书有借出记录，不能直接销毁')
    logger.warn('销毁图书', book.title, reason)
    return this.bookRepository.update(id, { status: 'destroyed', notes: `销毁原因：${reason}` })
  }

  markAsLost(id: number): Book {
    const book = this.getBookById(id)
    logger.warn('图书标记为丢失', book.title)
    return this.bookRepository.update(id, { status: 'lost', total_quantity: Math.max(0, book.total_quantity - 1), available_quantity: Math.max(0, book.available_quantity - 1) })
  }

  markAsDamaged(id: number, notes?: string): Book {
    const book = this.getBookById(id)
    logger.warn('图书标记为损坏', book.title)
    return this.bookRepository.update(id, { status: 'damaged', notes: notes || '图书损坏' })
  }

  advancedSearch(criteria: { title?: string; author?: string; publisher?: string; category_id?: number; publish_date_start?: string; publish_date_end?: string; isbn?: string }): BookWithCategory[] {
    return this.bookRepository.advancedSearch(criteria)
  }

  canBorrow(bookId: number): { canBorrow: boolean; reason?: string } {
    const book = this.bookRepository.findById(bookId)
    if (!book) return { canBorrow: false, reason: '图书不存在' }
    if (book.status !== 'normal') return { canBorrow: false, reason: `图书状态异常：${book.status}` }
    if (book.available_quantity < 1) return { canBorrow: false, reason: '暂无可借图书' }
    return { canBorrow: true }
  }

  getBorrowingStatus(bookId: number) { return this.bookRepository.getBorrowingStatus(bookId) }

  getPopularBooks(limit: number = 10): Array<BookWithCategory & { borrow_count: number }> {
    return db.prepare(`SELECT b.*, bc.name as category_name, bc.code as category_code, COUNT(br.id) as borrow_count FROM books b JOIN book_categories bc ON b.category_id = bc.id LEFT JOIN borrowing_records br ON b.id = br.book_id WHERE b.status = 'normal' GROUP BY b.id ORDER BY borrow_count DESC LIMIT ?`).all(limit) as Array<BookWithCategory & { borrow_count: number }>
  }

  getNewBooks(limit: number = 10): BookWithCategory[] {
    return db.prepare(`SELECT b.*, bc.name as category_name, bc.code as category_code FROM books b JOIN book_categories bc ON b.category_id = bc.id WHERE b.status = 'normal' ORDER BY b.registration_date DESC LIMIT ?`).all(limit) as BookWithCategory[]
  }

  getCategoryStatistics(): Array<{ category_name: string; book_count: number; available_count: number }> {
    return db.prepare(`SELECT bc.name as category_name, COUNT(b.id) as book_count, SUM(b.available_quantity) as available_count FROM book_categories bc LEFT JOIN books b ON bc.id = b.category_id AND b.status = 'normal' GROUP BY bc.id, bc.name ORDER BY book_count DESC`).all() as Array<{ category_name: string; book_count: number; available_count: number }>
  }

  deleteBook(id: number): void {
    const book = this.getBookById(id)
    const result = db.prepare(`SELECT COUNT(*) as count FROM borrowing_records WHERE book_id = ? AND status IN ('borrowed', 'overdue') AND is_deleted = 0`).get(id) as { count: number }
    if (result.count > 0) throw new BusinessError(`该图书还有${result.count}条未归还的借阅记录，无法删除`)
    this.bookRepository.delete(id)
    logger.warn('删除图书', { id, title: book.title })
  }

  restoreBook(id: number): Book { const book = this.bookRepository.restore(id); logger.info('恢复图书', { id, title: book.title }); return book }
  getDeletedBooks(limit: number = 50, offset: number = 0): BookWithCategory[] { return this.bookRepository.getDeletedBooks(limit, offset) }
  hardDeleteBook(id: number): void { const book = this.bookRepository.findById(id, true); this.bookRepository.hardDelete(id); if (book) logger.warn('硬删除图书', { id, title: book.title }) }
  getAllBooksForExport(): Array<BookWithCategory> { return db.prepare(`SELECT b.*, bc.name as category_name, bc.code as category_code FROM books b JOIN book_categories bc ON b.category_id = bc.id ORDER BY b.registration_date DESC`).all() as Array<BookWithCategory> }
}
