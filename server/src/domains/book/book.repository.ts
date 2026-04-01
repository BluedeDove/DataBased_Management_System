import { db } from '../../database'
import { NotFoundError } from '../../lib/errorHandler'

export interface BookCategory {
  id: number
  code: string
  name: string
  keywords?: string
  parent_id?: number
  notes?: string
  version: number
  is_deleted: boolean
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
  findAllCategories(): BookCategory[] {
    return db.prepare('SELECT * FROM book_categories WHERE is_deleted = 0 ORDER BY code').all() as BookCategory[]
  }

  findCategoryById(id: number): BookCategory | undefined {
    return db.prepare('SELECT * FROM book_categories WHERE id = ? AND is_deleted = 0').get(id) as BookCategory | undefined
  }

  createCategory(category: Omit<BookCategory, 'id' | 'created_at' | 'updated_at' | 'version' | 'is_deleted'>): BookCategory {
    const result = db.prepare(`INSERT INTO book_categories (code, name, keywords, parent_id, notes, version, is_deleted) VALUES (?, ?, ?, ?, ?, 1, 0)`).run(category.code, category.name, category.keywords, category.parent_id, category.notes)
    const created = this.findCategoryById(result.lastInsertRowid as number)
    if (!created) throw new NotFoundError('图书类别')
    return created
  }

  updateCategory(id: number, updates: Partial<BookCategory>): BookCategory {
    const fields: string[] = []
    const values: any[] = []
    Object.keys(updates).forEach((key) => {
      if (!['id', 'code', 'created_at', 'updated_at', 'version', 'is_deleted'].includes(key)) {
        fields.push(`${key} = ?`)
        values.push(updates[key as keyof BookCategory])
      }
    })
    if (fields.length > 0) {
      fields.push('updated_at = CURRENT_TIMESTAMP', 'version = version + 1')
      values.push(id)
      db.prepare(`UPDATE book_categories SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    }
    const updated = this.findCategoryById(id)
    if (!updated) throw new NotFoundError('图书类别')
    return updated
  }

  deleteCategory(id: number): void {
    const category = this.findCategoryById(id)
    if (!category) throw new NotFoundError('图书类别')
    const booksCount = db.prepare('SELECT COUNT(*) as count FROM books WHERE category_id = ? AND is_deleted = 0').get(id) as { count: number }
    if (booksCount.count > 0) throw new Error(`无法删除该类别，还有${booksCount.count}本图书使用此类别`)
    db.prepare('UPDATE book_categories SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP, version = version + 1 WHERE id = ?').run(id)
  }

  findAll(filters?: { category_id?: number; status?: string; keyword?: string }): BookWithCategory[] {
    let sql = `SELECT b.*, bc.name as category_name, bc.code as category_code FROM books b JOIN book_categories bc ON b.category_id = bc.id WHERE b.is_deleted = 0 AND bc.is_deleted = 0`
    const params: any[] = []
    if (filters?.category_id) { sql += ' AND b.category_id = ?'; params.push(filters.category_id) }
    if (filters?.status) { sql += ' AND b.status = ?'; params.push(filters.status) }
    if (filters?.keyword) { sql += ' AND (b.title LIKE ? OR b.author LIKE ? OR b.publisher LIKE ? OR b.isbn LIKE ?)'; const p = `%${filters.keyword}%`; params.push(p, p, p, p) }
    sql += ' ORDER BY b.registration_date DESC'
    return db.prepare(sql).all(...params) as BookWithCategory[]
  }

  findById(id: number, include_deleted: boolean = false): BookWithCategory | undefined {
    return db.prepare(`SELECT b.*, bc.name as category_name, bc.code as category_code FROM books b JOIN book_categories bc ON b.category_id = bc.id WHERE b.id = ? ${include_deleted ? '' : 'AND b.is_deleted = 0'}`).get(id) as BookWithCategory | undefined
  }

  findByIsbn(isbn: string, include_deleted: boolean = false): BookWithCategory | undefined {
    return db.prepare(`SELECT b.*, bc.name as category_name, bc.code as category_code FROM books b JOIN book_categories bc ON b.category_id = bc.id WHERE b.isbn = ? ${include_deleted ? '' : 'AND b.is_deleted = 0'}`).get(isbn) as BookWithCategory | undefined
  }

  create(book: Omit<Book, 'id' | 'created_at' | 'updated_at'>): Book {
    const result = db.prepare(`INSERT INTO books (isbn, title, category_id, author, publisher, publish_date, price, pages, keywords, description, cover_url, total_quantity, available_quantity, status, registration_date, notes, version, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)`).run(book.isbn, book.title, book.category_id, book.author, book.publisher, book.publish_date, book.price, book.pages, book.keywords, book.description, book.cover_url, book.total_quantity, book.available_quantity, book.status, book.registration_date, book.notes)
    const created = this.findById(result.lastInsertRowid as number)
    if (!created) throw new NotFoundError('图书')
    return created
  }

  update(id: number, updates: Partial<Book>): Book {
    const current = this.findById(id)
    if (!current) throw new NotFoundError('图书')
    const fields: string[] = []
    const values: any[] = []
    Object.keys(updates).forEach((key) => {
      if (!['id', 'isbn', 'created_at', 'updated_at', 'version', 'is_deleted'].includes(key)) {
        fields.push(`${key} = ?`)
        values.push(updates[key as keyof Book])
      }
    })
    if (fields.length > 0) {
      fields.push('updated_at = CURRENT_TIMESTAMP', 'version = version + 1')
      values.push(id, current.version || 1)
      const result = db.prepare(`UPDATE books SET ${fields.join(', ')} WHERE id = ? AND version = ?`).run(...values)
      if (result.changes === 0) throw new Error('更新失败：图书已被其他用户修改（版本冲突）')
    }
    const updated = this.findById(id)
    if (!updated) throw new NotFoundError('图书')
    return updated
  }

  decreaseAvailableQuantity(id: number, amount: number = 1): void {
    const current = this.findById(id)
    if (!current) throw new NotFoundError('图书')
    const result = db.prepare(`UPDATE books SET available_quantity = available_quantity - ?, updated_at = CURRENT_TIMESTAMP, version = version + 1 WHERE id = ? AND available_quantity >= ? AND version = ?`).run(amount, id, amount, current.version || 1)
    if (result.changes === 0) throw new Error(`图书可借数量不足，无法减少 ${amount} 本`)
  }

  increaseAvailableQuantity(id: number, amount: number = 1): void {
    const current = this.findById(id)
    if (!current) throw new NotFoundError('图书')
    const result = db.prepare(`UPDATE books SET available_quantity = available_quantity + ?, updated_at = CURRENT_TIMESTAMP, version = version + 1 WHERE id = ? AND version = ?`).run(amount, id, current.version || 1)
    if (result.changes === 0) throw new Error(`图书不存在，ID: ${id}`)
  }

  advancedSearch(filters: { title?: string; author?: string; publisher?: string; category_id?: number; publishDateFrom?: string; publishDateTo?: string; priceMin?: number; priceMax?: number; keyword?: string; status?: string }): BookWithCategory[] {
    let sql = `SELECT b.*, bc.name as category_name, bc.code as category_code FROM books b JOIN book_categories bc ON b.category_id = bc.id WHERE b.is_deleted = 0 AND bc.is_deleted = 0`
    const params: any[] = []
    if (filters.title) { sql += ' AND b.title LIKE ?'; params.push(`%${filters.title}%`) }
    if (filters.author) { sql += ' AND b.author LIKE ?'; params.push(`%${filters.author}%`) }
    if (filters.publisher) { sql += ' AND b.publisher LIKE ?'; params.push(`%${filters.publisher}%`) }
    if (filters.category_id) { sql += ' AND b.category_id = ?'; params.push(filters.category_id) }
    if (filters.publishDateFrom) { sql += ' AND b.publish_date >= ?'; params.push(filters.publishDateFrom) }
    if (filters.publishDateTo) { sql += ' AND b.publish_date <= ?'; params.push(filters.publishDateTo) }
    if (filters.priceMin !== undefined) { sql += ' AND b.price >= ?'; params.push(filters.priceMin) }
    if (filters.priceMax !== undefined) { sql += ' AND b.price <= ?'; params.push(filters.priceMax) }
    if (filters.keyword) { sql += ' AND (b.title LIKE ? OR b.author LIKE ? OR b.keywords LIKE ?)'; params.push(`%${filters.keyword}%`, `%${filters.keyword}%`, `%${filters.keyword}%`) }
    if (filters.status) { sql += ' AND b.status = ?'; params.push(filters.status) }
    sql += ' ORDER BY b.created_at DESC'
    return db.prepare(sql).all(...params) as BookWithCategory[]
  }

  getBorrowingStatus(bookId: number): { total_quantity: number; available_quantity: number; borrowed_count: number; current_borrowers: Array<{ reader_name: string; due_date: string }> } {
    const book = this.findById(bookId)
    if (!book) throw new NotFoundError('图书')
    const borrowers = db.prepare(`SELECT r.name as reader_name, br.due_date FROM borrowing_records br JOIN readers r ON br.reader_id = r.id WHERE br.book_id = ? AND br.status = 'borrowed' AND br.is_deleted = 0 ORDER BY br.due_date`).all(bookId) as Array<{ reader_name: string; due_date: string }>
    return { total_quantity: book.total_quantity, available_quantity: book.available_quantity, borrowed_count: borrowers.length, current_borrowers: borrowers }
  }

  generateNextISBN(categoryId: number): string {
    const category = this.findCategoryById(categoryId)
    if (!category) throw new NotFoundError('图书类别')
    const year = new Date().getFullYear().toString()
    const prefix = `${category.code}-${year}-`
    const result = db.prepare(`SELECT isbn FROM books WHERE isbn LIKE ? AND is_deleted = 0 ORDER BY isbn DESC LIMIT 1`).get(`${prefix}%`) as { isbn?: string } | undefined
    let sequence = 1
    if (result?.isbn) { const lastNum = parseInt(result.isbn.slice(prefix.length), 10); if (!isNaN(lastNum)) sequence = lastNum + 1 }
    return `${prefix}${sequence.toString().padStart(6, '0')}`
  }

  delete(id: number): void {
    const current = this.findById(id)
    if (!current) throw new NotFoundError('图书')
    const activeBorrowingCount = db.prepare(`SELECT COUNT(*) as count FROM borrowing_records WHERE book_id = ? AND status IN ('borrowed', 'overdue') AND is_deleted = 0`).get(id) as { count: number }
    if (activeBorrowingCount.count > 0) throw new Error(`该图书还有${activeBorrowingCount.count}条未归还的借阅记录，无法删除`)
    const result = db.prepare(`UPDATE books SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP, version = version + 1 WHERE id = ?`).run(id)
    if (result.changes === 0) throw new NotFoundError('图书')
  }

  restore(id: number): Book {
    const result = db.prepare(`UPDATE books SET is_deleted = 0, updated_at = CURRENT_TIMESTAMP, version = version + 1 WHERE id = ? AND is_deleted = 1`).run(id)
    if (result.changes === 0) throw new NotFoundError('图书或图书未被删除')
    const restored = this.findById(id)
    if (!restored) throw new NotFoundError('图书')
    return restored
  }

  getDeletedBooks(limit: number = 50, offset: number = 0): BookWithCategory[] {
    return db.prepare(`SELECT b.*, bc.name as category_name, bc.code as category_code FROM books b JOIN book_categories bc ON b.category_id = bc.id WHERE b.is_deleted = 1 ORDER BY b.updated_at DESC LIMIT ? OFFSET ?`).all(limit, offset) as BookWithCategory[]
  }

  getTotalCount(): number {
    const result = db.prepare('SELECT SUM(total_quantity) as total FROM books WHERE is_deleted = 0').get() as { total: number | null }
    return result?.total ?? 0
  }

  hardDelete(id: number): void {
    const book = this.findById(id, true)
    if (!book) throw new NotFoundError('图书')
    const activeBorrowingCount = db.prepare(`SELECT COUNT(*) as count FROM borrowing_records WHERE book_id = ? AND status IN ('borrowed', 'overdue') AND is_deleted = 0`).get(id) as { count: number }
    if (activeBorrowingCount.count > 0) throw new Error(`该图书还有${activeBorrowingCount.count}条未归还的借阅记录，无法删除`)
    const result = db.prepare('DELETE FROM books WHERE id = ?').run(id)
    if (result.changes === 0) throw new NotFoundError('图书')
  }
}
