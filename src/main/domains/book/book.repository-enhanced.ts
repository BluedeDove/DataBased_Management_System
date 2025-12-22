import { db } from '../../database'
import { NotFoundError } from '../../lib/errorHandler'
import { OptimisticLockManager, OptimisticLockError } from '../../lib/optimisticLock'
import { SoftDeleteManager } from '../../lib/softDelete'
import { OperationLogger } from '../../lib/operationLogger'
import { AuditLogger } from '../../lib/auditLogger'

export interface BookCategory {
  id: number
  code: string
  name: string
  keywords?: string
  parent_id?: number
  notes?: string
  version?: number
  is_deleted?: boolean
  created_at: string
  updated_at: string
}

export interface Book {
  id: number
  isbn: string
  title: string
  category_id: number
  author: string
  publisher: string
  publish_date?: string
  price?: number
  pages?: number
  keywords?: string
  description?: string
  cover_url?: string
  total_quantity: number
  available_quantity: number
  status: 'normal' | 'damaged' | 'lost' | 'destroyed'
  registration_date: string
  notes?: string
  version: number
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface BookWithCategory extends Book {
  category_name: string
  category_code: string
}

export class BookRepository {
  // 图书类别相关
  findAllCategories(): BookCategory[] {
    const stmt = db.prepare(`
      SELECT * FROM book_categories 
      WHERE is_deleted = 0 
      ORDER BY code
    `)
    return stmt.all() as BookCategory[]
  }

  findCategoryById(id: number): BookCategory | undefined {
    const stmt = db.prepare(`
      SELECT * FROM book_categories 
      WHERE id = ? AND is_deleted = 0
    `)
    return stmt.get(id) as BookCategory | undefined
  }

  async createCategory(category: Omit<BookCategory, 'id' | 'created_at' | 'updated_at' | 'version' | 'is_deleted'>): Promise<BookCategory> {
    const operationId = OperationLogger.generateOperationId()
    
    try {
      const result = await OperationLogger.executeWithTwoPhaseCommit(
        operationId,
        'book_categories',
        0, // 新记录，ID为0
        'INSERT',
        undefined,
        JSON.stringify(category),
        undefined,
        async () => {
          const stmt = db.prepare(`
            INSERT INTO book_categories (code, name, keywords, parent_id, notes, version, is_deleted)
            VALUES (?, ?, ?, ?, ?, 1, 0)
          `)
          
          const insertResult = stmt.run(
            category.code,
            category.name,
            category.keywords,
            category.parent_id,
            category.notes
          )
          
          const created = this.findCategoryById(insertResult.lastInsertRowid as number)
          if (!created) throw new NotFoundError('图书类别')
          return created
        }
      )
      
      return result
    } catch (error) {
      throw error
    }
  }

  async updateCategory(id: number, updates: Partial<BookCategory>, userId?: number): Promise<BookCategory> {
    const existing = this.findCategoryById(id)
    if (!existing) {
      throw new NotFoundError('图书类别')
    }

    const operationId = OperationLogger.generateOperationId()
    
    try {
      // 准备更新数据（排除系统字段）
      const updateData = { ...updates }
      delete (updateData as any).id
      delete (updateData as any).version
      delete (updateData as any).is_deleted
      delete (updateData as any).created_at
      delete (updateData as any).updated_at

      const result = await OptimisticLockManager.retryOptimisticUpdate(
        'book_categories',
        id,
        updateData,
        3
      )

      if (result === null) {
        throw new OptimisticLockError('图书类别更新失败，版本冲突')
      }

      // 记录审计日志
      if (userId) {
        await AuditLogger.logBookOperation(userId, 'UPDATE', id, existing, { ...existing, ...updateData })
      }

      const updated = this.findCategoryById(id)
      if (!updated) throw new NotFoundError('图书类别')
      return updated
    } catch (error) {
      if (error instanceof OptimisticLockError) {
        throw error
      }
      throw new Error(`更新图书类别失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async deleteCategory(id: number, userId?: number, reason?: string): Promise<void> {
    const category = this.findCategoryById(id)
    if (!category) {
      throw new NotFoundError('图书类别')
    }

    // 检查是否有图书使用此类别
    const booksCount = db.prepare('SELECT COUNT(*) as count FROM books WHERE category_id = ? AND is_deleted = 0').get(id) as { count: number }
    if (booksCount.count > 0) {
      throw new Error(`无法删除该类别，还有${booksCount.count}本图书使用此类别`)
    }

    const success = await SoftDeleteManager.softDelete('book_categories', id, userId, reason)
    if (!success) {
      throw new Error('删除图书类别失败')
    }

    // 记录审计日志
    if (userId) {
      await AuditLogger.logBookOperation(userId, 'DELETE', id, category)
    }
  }

  // 图书相关
  findAll(filters?: {
    category_id?: number
    status?: string
    keyword?: string
    include_deleted?: boolean
  }): BookWithCategory[] {
    let sql = `
      SELECT b.*, bc.name as category_name, bc.code as category_code
      FROM books b
      JOIN book_categories bc ON b.category_id = bc.id
      WHERE 1=1
    `
    const params: any[] = []

    // 默认不显示已删除的记录
    if (!filters?.include_deleted) {
      sql += ' AND b.is_deleted = 0'
    }

    if (filters?.category_id) {
      sql += ' AND b.category_id = ?'
      params.push(filters.category_id)
    }

    if (filters?.status) {
      sql += ' AND b.status = ?'
      params.push(filters.status)
    }

    if (filters?.keyword) {
      sql += ' AND (b.title LIKE ? OR b.author LIKE ? OR b.publisher LIKE ? OR b.isbn LIKE ?)'
      const pattern = `%${filters.keyword}%`
      params.push(pattern, pattern, pattern, pattern)
    }

    sql += ' ORDER BY b.registration_date DESC'

    const stmt = db.prepare(sql)
    return stmt.all(...params) as BookWithCategory[]
  }

  findById(id: number, include_deleted: boolean = false): BookWithCategory | undefined {
    const stmt = db.prepare(`
      SELECT b.*, bc.name as category_name, bc.code as category_code
      FROM books b
      JOIN book_categories bc ON b.category_id = bc.id
      WHERE b.id = ? ${include_deleted ? '' : 'AND b.is_deleted = 0'}
    `)
    return stmt.get(id) as BookWithCategory | undefined
  }

  findByIsbn(isbn: string, include_deleted: boolean = false): BookWithCategory | undefined {
    const stmt = db.prepare(`
      SELECT b.*, bc.name as category_name, bc.code as category_code
      FROM books b
      JOIN book_categories bc ON b.category_id = bc.id
      WHERE b.isbn = ? ${include_deleted ? '' : 'AND b.is_deleted = 0'}
    `)
    return stmt.get(isbn) as BookWithCategory | undefined
  }

  async create(book: Omit<Book, 'id' | 'created_at' | 'updated_at' | 'version' | 'is_deleted'>, userId?: number): Promise<Book> {
    const operationId = OperationLogger.generateOperationId()
    
    try {
      const result = await OperationLogger.executeWithTwoPhaseCommit(
        operationId,
        'books',
        0, // 新记录
        'INSERT',
        undefined,
        JSON.stringify(book),
        userId,
        async () => {
          const stmt = db.prepare(`
            INSERT INTO books (
              isbn, title, category_id, author, publisher, publish_date,
              price, pages, keywords, description, cover_url,
              total_quantity, available_quantity, status, registration_date, notes,
              version, is_deleted
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)
          `)

          const insertResult = stmt.run(
            book.isbn,
            book.title,
            book.category_id,
            book.author,
            book.publisher,
            book.publish_date,
            book.price,
            book.pages,
            book.keywords,
            book.description,
            book.cover_url,
            book.total_quantity,
            book.available_quantity,
            book.status,
            book.registration_date,
            book.notes
          )

          const created = this.findById(insertResult.lastInsertRowid as number) as Book
          if (!created) throw new NotFoundError('图书')
          return created
        }
      )
      
      // 记录审计日志
      if (userId) {
        await AuditLogger.logBookOperation(userId, 'CREATE', result.id, undefined, result)
      }
      
      return result
    } catch (error) {
      throw error
    }
  }

  async update(id: number, updates: Partial<Book>, userId?: number): Promise<Book> {
    const existing = this.findById(id)
    if (!existing) {
      throw new NotFoundError('图书')
    }

    // 准备更新数据（排除系统字段）
    const updateData = { ...updates }
    delete (updateData as any).id
    delete (updateData as any).version
    delete (updateData as any).is_deleted
    delete (updateData as any).created_at
    delete (updateData as any).updated_at

    const newVersion = await OptimisticLockManager.retryOptimisticUpdate(
      'books',
      id,
      updateData,
      3
    )

    if (newVersion === null) {
      throw new OptimisticLockError('图书更新失败，版本冲突')
    }

    // 记录审计日志
    if (userId) {
      await AuditLogger.logBookOperation(userId, 'UPDATE', id, existing, { ...existing, ...updateData })
    }

    const updated = this.findById(id) as Book
    if (!updated) throw new NotFoundError('图书')
    return updated
  }

  // 使用乐观锁的原子性数量操作
  async decreaseAvailableQuantity(id: number, amount: number = 1, userId?: number): Promise<boolean> {
    const book = this.findById(id)
    if (!book) {
      throw new NotFoundError('图书')
    }

    const success = await OptimisticLockManager.atomicUpdateNumericField(
      'books',
      id,
      'available_quantity',
      -amount,
      book.version,
      0 // 最小值不能小于0
    )

    if (success && userId) {
      await AuditLogger.logBookOperation(userId, 'UPDATE', id, book, {
        ...book,
        available_quantity: book.available_quantity - amount
      })
    }

    return success
  }

  async increaseAvailableQuantity(id: number, amount: number = 1, userId?: number): Promise<boolean> {
    const book = this.findById(id)
    if (!book) {
      throw new NotFoundError('图书')
    }

    const success = await OptimisticLockManager.atomicUpdateNumericField(
      'books',
      id,
      'available_quantity',
      amount,
      book.version
    )

    if (success && userId) {
      await AuditLogger.logBookOperation(userId, 'UPDATE', id, book, {
        ...book,
        available_quantity: book.available_quantity + amount
      })
    }

    return success
  }

  // 高级搜索
  advancedSearch(filters: {
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
    include_deleted?: boolean
  }): BookWithCategory[] {
    let sql = `
      SELECT b.*, bc.name as category_name, bc.code as category_code
      FROM books b
      JOIN book_categories bc ON b.category_id = bc.id
      WHERE 1=1
    `
    const params: any[] = []

    // 默认不显示已删除的记录
    if (!filters?.include_deleted) {
      sql += ' AND b.is_deleted = 0'
    }

    if (filters.title) {
      sql += ' AND b.title LIKE ?'
      params.push(`%${filters.title}%`)
    }
    if (filters.author) {
      sql += ' AND b.author LIKE ?'
      params.push(`%${filters.author}%`)
    }
    if (filters.publisher) {
      sql += ' AND b.publisher LIKE ?'
      params.push(`%${filters.publisher}%`)
    }
    if (filters.category_id) {
      sql += ' AND b.category_id = ?'
      params.push(filters.category_id)
    }
    if (filters.publishDateFrom) {
      sql += ' AND b.publish_date >= ?'
      params.push(filters.publishDateFrom)
    }
    if (filters.publishDateTo) {
      sql += ' AND b.publish_date <= ?'
      params.push(filters.publishDateTo)
    }
    if (filters.priceMin !== undefined) {
      sql += ' AND b.price >= ?'
      params.push(filters.priceMin)
    }
    if (filters.priceMax !== undefined) {
      sql += ' AND b.price <= ?'
      params.push(filters.priceMax)
    }
    if (filters.keyword) {
      sql += ' AND (b.title LIKE ? OR b.author LIKE ? OR b.keywords LIKE ?)'
      params.push(`%${filters.keyword}%`, `%${filters.keyword}%`, `%${filters.keyword}%`)
    }
    if (filters.status) {
      sql += ' AND b.status = ?'
      params.push(filters.status)
    }

    sql += ' ORDER BY b.created_at DESC'

    const stmt = db.prepare(sql)
    return stmt.all(...params) as BookWithCategory[]
  }

  // 获取图书借阅情况
  getBorrowingStatus(bookId: number): {
    total_quantity: number
    available_quantity: number
    borrowed_count: number
    current_borrowers: Array<{ reader_name: string; due_date: string }>
  } {
    const book = this.findById(bookId)
    if (!book) throw new NotFoundError('图书')

    const borrowersStmt = db.prepare(`
      SELECT r.name as reader_name, br.due_date
      FROM borrowing_records br
      JOIN readers r ON br.reader_id = r.id
      WHERE br.book_id = ? AND br.status = 'borrowed' AND br.is_deleted = 0
      ORDER BY br.due_date
    `)

    const borrowers = borrowersStmt.all(bookId) as Array<{ reader_name: string; due_date: string }>

    return {
      total_quantity: book.total_quantity,
      available_quantity: book.available_quantity,
      borrowed_count: borrowers.length,
      current_borrowers: borrowers
    }
  }

  // 生成下一个ISBN
  generateNextISBN(categoryId: number): string {
    const category = this.findCategoryById(categoryId)
    if (!category) {
      throw new NotFoundError('图书类别')
    }

    // 格式: {CATEGORY_CODE}-{YYYY}-{6位顺序号}
    const today = new Date()
    const year = today.getFullYear().toString()
    const prefix = `${category.code}-${year}-`

    // 查找今年同类别的最大ISBN
    const stmt = db.prepare(`
      SELECT isbn FROM books
      WHERE isbn LIKE ? AND is_deleted = 0
      ORDER BY isbn DESC
      LIMIT 1
    `)
    const result = stmt.get(`${prefix}%`) as { isbn?: string } | undefined

    let sequence = 1
    if (result?.isbn) {
      // 从ISBN中提取序号部分
      const lastSequence = result.isbn.slice(prefix.length)
      const lastNum = parseInt(lastSequence, 10)
      if (!isNaN(lastNum)) {
        sequence = lastNum + 1
      }
    }

    // 格式化为6位数字
    const sequenceStr = sequence.toString().padStart(6, '0')
    return `${prefix}${sequenceStr}`
  }

  // 软删除图书
  async softDelete(id: number, userId?: number, reason?: string): Promise<boolean> {
    const book = this.findById(id)
    if (!book) {
      throw new NotFoundError('图书')
    }

    const success = await SoftDeleteManager.softDelete('books', id, userId, reason)
    
    if (success && userId) {
      await AuditLogger.logBookOperation(userId, 'DELETE', id, book)
    }

    return success
  }

  // 恢复软删除的图书
  async restore(id: number, userId?: number): Promise<boolean> {
    const success = await SoftDeleteManager.restore('books', id, userId)
    
    if (success && userId) {
      const book = this.findById(id, true) // 包含已删除记录
      if (book) {
        await AuditLogger.logBookOperation(userId, 'UPDATE', id, { ...book, is_deleted: true }, book)
      }
    }

    return success
  }

  // 获取已删除的图书
  getDeletedBooks(limit: number = 50, offset: number = 0): BookWithCategory[] {
    const stmt = db.prepare(`
      SELECT b.*, bc.name as category_name, bc.code as category_code
      FROM books b
      JOIN book_categories bc ON b.category_id = bc.id
      WHERE b.is_deleted = 1
      ORDER BY b.deleted_at DESC
      LIMIT ? OFFSET ?
    `)

    return stmt.all(limit, offset) as BookWithCategory[]
  }

  // 删除图书（硬删除，仅限管理员）
  async hardDelete(id: number, userId?: number): Promise<boolean> {
    const book = this.findById(id, true) // 包含已删除记录
    if (!book) {
      throw new NotFoundError('图书')
    }

    // 检查是否有未归还的借阅记录
    const activeBorrowingCount = db.prepare(`
      SELECT COUNT(*) as count FROM borrowing_records 
      WHERE book_id = ? AND status IN ('borrowed', 'overdue') AND is_deleted = 0
    `).get(id) as { count: number }
    
    if (activeBorrowingCount.count > 0) {
      throw new Error(`该图书还有${activeBorrowingCount.count}条未归还的借阅记录，无法删除`)
    }

    const success = await SoftDeleteManager.hardDelete('books', id)
    
    if (success && userId) {
      await AuditLogger.logBookOperation(userId, 'DELETE', id, book)
    }

    return success
  }
}