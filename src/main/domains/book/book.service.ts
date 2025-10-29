import { BookRepository, Book, BookCategory, BookWithCategory } from './book.repository'
import { ValidationError, BusinessError, NotFoundError } from '../../lib/errorHandler'
import { logger } from '../../lib/logger'

export class BookService {
  private bookRepository = new BookRepository()

  // 图书类别管理
  getAllCategories(): BookCategory[] {
    return this.bookRepository.findAllCategories()
  }

  getCategoryById(id: number): BookCategory {
    const category = this.bookRepository.findCategoryById(id)
    if (!category) {
      throw new NotFoundError('图书类别')
    }
    return category
  }

  createCategory(data: Omit<BookCategory, 'id' | 'created_at' | 'updated_at'>): BookCategory {
    if (!data.code || !data.name) {
      throw new ValidationError('类别编码和名称不能为空')
    }

    logger.info('创建图书类别', data.name)
    return this.bookRepository.createCategory(data)
  }

  updateCategory(id: number, updates: Partial<BookCategory>): BookCategory {
    const existing = this.getCategoryById(id)
    logger.info('更新图书类别', existing.name)
    return this.bookRepository.updateCategory(id, updates)
  }

  // 图书管理
  getAllBooks(filters?: {
    category_id?: number
    status?: string
    keyword?: string
  }): BookWithCategory[] {
    return this.bookRepository.findAll(filters)
  }

  getBookById(id: number): BookWithCategory {
    const book = this.bookRepository.findById(id)
    if (!book) {
      throw new NotFoundError('图书')
    }
    return book
  }

  createBook(data: Omit<Book, 'id' | 'created_at' | 'updated_at'>): Book {
    logger.info('========== [后端] 开始创建图书 ==========')
    logger.info('[后端] 接收到的数据:', JSON.stringify(data, null, 2))

    // 验证
    logger.info('[后端] 开始验证数据...')
    if (!data.title || !data.author || !data.publisher) {
      logger.error('[后端] 验证失败: 书名、作者或出版社为空', {
        title: data.title,
        author: data.author,
        publisher: data.publisher
      })
      throw new ValidationError('书名、作者和出版社不能为空')
    }

    if (!data.category_id) {
      logger.error('[后端] 验证失败: 未选择类别')
      throw new ValidationError('必须选择图书类别')
    }
    logger.info('[后端] 数据验证通过')

    // 检查类别是否存在
    logger.info('[后端] 查找图书类别，ID:', data.category_id)
    const category = this.bookRepository.findCategoryById(data.category_id)
    if (!category) {
      logger.error('[后端] 图书类别不存在:', data.category_id)
      throw new NotFoundError('图书类别')
    }
    logger.info('[后端] 找到图书类别:', category.name)

    // 自动生成ISBN（如果为空或为 'AUTO'）
    logger.info('[后端] 检查ISBN:', { isbn: data.isbn, trimmed: data.isbn?.trim(), upper: data.isbn?.toUpperCase() })
    if (!data.isbn || data.isbn.trim() === '' || data.isbn.toUpperCase() === 'AUTO') {
      logger.info('[后端] 需要自动生成ISBN')
      data.isbn = this.bookRepository.generateNextISBN(data.category_id)
      logger.info('[后端] 自动生成ISBN:', data.isbn)
    } else {
      // 检查ISBN是否已存在
      logger.info('[后端] 检查ISBN是否已存在:', data.isbn)
      const existing = this.bookRepository.findByIsbn(data.isbn)
      if (existing) {
        logger.error('[后端] ISBN已存在:', data.isbn)
        throw new BusinessError('该ISBN已存在，请使用"增加馆藏"功能')
      }
      logger.info('[后端] ISBN可用')
    }

    // 确保数量一致
    if (!data.available_quantity) {
      logger.info('[后端] 设置available_quantity =', data.total_quantity)
      data.available_quantity = data.total_quantity
    }

    logger.info('[后端] 准备创建图书到数据库...')
    logger.info('[后端] 最终数据:', JSON.stringify(data, null, 2))
    const result = this.bookRepository.create(data)
    logger.info('[后端] 图书创建成功，ID:', result.id)
    logger.info('========== [后端] 图书创建结束 ==========\n')
    return result
  }

  updateBook(id: number, updates: Partial<Book>): Book {
    const existing = this.getBookById(id)

    // 如果更新了总数量，需要相应调整可借数量
    if (updates.total_quantity !== undefined) {
      const diff = updates.total_quantity - existing.total_quantity
      updates.available_quantity = Math.max(0, existing.available_quantity + diff)
    }

    logger.info('更新图书信息', existing.title)
    return this.bookRepository.update(id, updates)
  }

  // 增加馆藏（同一本书增加复本）
  addCopies(id: number, quantity: number): Book {
    if (quantity < 1) {
      throw new ValidationError('数量必须大于0')
    }

    const book = this.getBookById(id)
    logger.info('增加图书馆藏', book.title, quantity)

    return this.bookRepository.update(id, {
      total_quantity: book.total_quantity + quantity,
      available_quantity: book.available_quantity + quantity
    })
  }

  // 旧书销毁
  destroyBook(id: number, reason: string): Book {
    const book = this.getBookById(id)

    if (book.available_quantity !== book.total_quantity) {
      throw new BusinessError('该图书有借出记录，不能直接销毁')
    }

    logger.warn('销毁图书', book.title, reason)

    return this.bookRepository.update(id, {
      status: 'destroyed',
      notes: `销毁原因：${reason}`
    })
  }

  // 图书丢失
  markAsLost(id: number): Book {
    const book = this.getBookById(id)

    logger.warn('图书标记为丢失', book.title)

    return this.bookRepository.update(id, {
      status: 'lost',
      total_quantity: Math.max(0, book.total_quantity - 1),
      available_quantity: Math.max(0, book.available_quantity - 1)
    })
  }

  // 图书损坏
  markAsDamaged(id: number, notes?: string): Book {
    const book = this.getBookById(id)

    logger.warn('图书标记为损坏', book.title)

    return this.bookRepository.update(id, {
      status: 'damaged',
      notes: notes || '图书损坏'
    })
  }

  // 高级搜索
  advancedSearch(criteria: {
    title?: string
    author?: string
    publisher?: string
    category_id?: number
    publish_date_start?: string
    publish_date_end?: string
    isbn?: string
  }): BookWithCategory[] {
    logger.debug('高级搜索', criteria)
    return this.bookRepository.advancedSearch(criteria)
  }

  // 增强的高级搜索
  advancedSearchBooks(filters: {
    title?: string
    author?: string
    publisher?: string
    category_id?: number
    publishDateFrom?: string
    publishDateTo?: string
    priceMin?: number
    priceMax?: number
    keyword?: string
    status?: string
  }): BookWithCategory[] {
    logger.info('高级搜索图书', filters)
    return this.bookRepository.advancedSearch(filters)
  }

  // 检查图书是否可以借出
  canBorrow(bookId: number): { canBorrow: boolean; reason?: string } {
    const book = this.bookRepository.findById(bookId)
    if (!book) {
      return { canBorrow: false, reason: '图书不存在' }
    }

    if (book.status !== 'normal') {
      return { canBorrow: false, reason: `图书状态异常：${book.status}` }
    }

    if (book.available_quantity < 1) {
      return { canBorrow: false, reason: '暂无可借图书' }
    }

    return { canBorrow: true }
  }

  // 获取图书借阅情况
  getBorrowingStatus(bookId: number) {
    return this.bookRepository.getBorrowingStatus(bookId)
  }

  // 获取热门图书（按借阅次数排序）
  getPopularBooks(limit: number = 10): Array<BookWithCategory & { borrow_count: number }> {
    const stmt = db.prepare(`
      SELECT b.*, bc.name as category_name, bc.code as category_code, COUNT(br.id) as borrow_count
      FROM books b
      JOIN book_categories bc ON b.category_id = bc.id
      LEFT JOIN borrowing_records br ON b.id = br.book_id
      WHERE b.status = 'normal'
      GROUP BY b.id
      ORDER BY borrow_count DESC
      LIMIT ?
    `)

    return stmt.all(limit) as Array<BookWithCategory & { borrow_count: number }>
  }

  // 获取新书（按登记日期排序）
  getNewBooks(limit: number = 10): BookWithCategory[] {
    const stmt = db.prepare(`
      SELECT b.*, bc.name as category_name, bc.code as category_code
      FROM books b
      JOIN book_categories bc ON b.category_id = bc.id
      WHERE b.status = 'normal'
      ORDER BY b.registration_date DESC
      LIMIT ?
    `)

    return stmt.all(limit) as BookWithCategory[]
  }

  // 统计各类别图书数量
  getCategoryStatistics(): Array<{ category_name: string; book_count: number; available_count: number }> {
    const stmt = db.prepare(`
      SELECT
        bc.name as category_name,
        COUNT(b.id) as book_count,
        SUM(b.available_quantity) as available_count
      FROM book_categories bc
      LEFT JOIN books b ON bc.id = b.category_id AND b.status = 'normal'
      GROUP BY bc.id, bc.name
      ORDER BY book_count DESC
    `)

    return stmt.all() as Array<{ category_name: string; book_count: number; available_count: number }>
  }
}

// 导入 db 用于统计查询
import { db } from '../../database'
