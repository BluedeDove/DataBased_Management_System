import { db } from '../../database'
import { NotFoundError } from '../../lib/errorHandler'

export interface BookCategory {
  id: number
  code: string
  name: string
  keywords?: string
  parent_id?: number
  notes?: string
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
    const stmt = db.prepare('SELECT * FROM book_categories ORDER BY code')
    return stmt.all() as BookCategory[]
  }

  findCategoryById(id: number): BookCategory | undefined {
    const stmt = db.prepare('SELECT * FROM book_categories WHERE id = ?')
    return stmt.get(id) as BookCategory | undefined
  }

  createCategory(category: Omit<BookCategory, 'id' | 'created_at' | 'updated_at'>): BookCategory {
    const stmt = db.prepare(`
      INSERT INTO book_categories (code, name, keywords, parent_id, notes)
      VALUES (?, ?, ?, ?, ?)
    `)
    const result = stmt.run(
      category.code,
      category.name,
      category.keywords,
      category.parent_id,
      category.notes
    )
    const created = this.findCategoryById(result.lastInsertRowid as number)
    if (!created) throw new NotFoundError('图书类别')
    return created
  }

  updateCategory(id: number, updates: Partial<BookCategory>): BookCategory {
    const fields: string[] = []
    const values: any[] = []

    Object.keys(updates).forEach((key) => {
      if (key !== 'id' && key !== 'code' && key !== 'created_at' && key !== 'updated_at') {
        fields.push(`${key} = ?`)
        values.push(updates[key as keyof BookCategory])
      }
    })

    if (fields.length > 0) {
      fields.push('updated_at = CURRENT_TIMESTAMP')
      values.push(id)
      db.prepare(`UPDATE book_categories SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    }

    const updated = this.findCategoryById(id)
    if (!updated) throw new NotFoundError('图书类别')
    return updated
  }

  // 图书相关
  findAll(filters?: {
    category_id?: number
    status?: string
    keyword?: string
  }): BookWithCategory[] {
    let sql = `
      SELECT b.*, bc.name as category_name, bc.code as category_code
      FROM books b
      JOIN book_categories bc ON b.category_id = bc.id
      WHERE 1=1
    `
    const params: any[] = []

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

  findById(id: number): BookWithCategory | undefined {
    const stmt = db.prepare(`
      SELECT b.*, bc.name as category_name, bc.code as category_code
      FROM books b
      JOIN book_categories bc ON b.category_id = bc.id
      WHERE b.id = ?
    `)
    return stmt.get(id) as BookWithCategory | undefined
  }

  findByIsbn(isbn: string): BookWithCategory | undefined {
    const stmt = db.prepare(`
      SELECT b.*, bc.name as category_name, bc.code as category_code
      FROM books b
      JOIN book_categories bc ON b.category_id = bc.id
      WHERE b.isbn = ?
    `)
    return stmt.get(isbn) as BookWithCategory | undefined
  }

  create(book: Omit<Book, 'id' | 'created_at' | 'updated_at'>): Book {
    const stmt = db.prepare(`
      INSERT INTO books (
        isbn, title, category_id, author, publisher, publish_date,
        price, pages, keywords, description, cover_url,
        total_quantity, available_quantity, status, registration_date, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const result = stmt.run(
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

    const created = this.findById(result.lastInsertRowid as number)
    if (!created) throw new NotFoundError('图书')
    return created
  }

  update(id: number, updates: Partial<Book>): Book {
    const fields: string[] = []
    const values: any[] = []

    Object.keys(updates).forEach((key) => {
      if (key !== 'id' && key !== 'isbn' && key !== 'created_at' && key !== 'updated_at') {
        fields.push(`${key} = ?`)
        values.push(updates[key as keyof Book])
      }
    })

    if (fields.length > 0) {
      fields.push('updated_at = CURRENT_TIMESTAMP')
      values.push(id)
      db.prepare(`UPDATE books SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    }

    const updated = this.findById(id)
    if (!updated) throw new NotFoundError('图书')
    return updated
  }

  // 减少可借数量
  decreaseAvailableQuantity(id: number, amount: number = 1): void {
    db.prepare(`
      UPDATE books
      SET available_quantity = available_quantity - ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(amount, id)
  }

  // 增加可借数量
  increaseAvailableQuantity(id: number, amount: number = 1): void {
    db.prepare(`
      UPDATE books
      SET available_quantity = available_quantity + ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(amount, id)
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
  }): BookWithCategory[] {
    let sql = `
      SELECT b.*, bc.name as category_name, bc.code as category_code
      FROM books b
      JOIN book_categories bc ON b.category_id = bc.id
      WHERE 1=1
    `
    const params: any[] = []

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
      WHERE br.book_id = ? AND br.status = 'borrowed'
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
      WHERE isbn LIKE ?
      ORDER BY isbn DESC
      LIMIT 1
    `)
    const result = stmt.get(`${prefix}%`) as { isbn?: string } | undefined

    let sequence = 1
    if (result?.isbn) {
      // 从ISBN中提取序号部分
      const lastSequence = result.isbn.slice(prefix.length)
      sequence = parseInt(lastSequence, 10) + 1
    }

    // 格式化为6位数字
    const sequenceStr = sequence.toString().padStart(6, '0')
    return `${prefix}${sequenceStr}`
  }
}
