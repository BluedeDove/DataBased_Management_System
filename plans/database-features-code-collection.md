# 数据库特性代码收集

## 一、Repository模式

### 1. BookRepository - 图书数据仓储

**简要介绍：** BookRepository是图书数据的仓储类，负责封装所有与图书相关的数据库操作，包括图书的增删改查、搜索、统计等功能。它遵循Repository模式，将数据访问逻辑与业务逻辑分离。

**代码源码：**

```typescript
export class BookRepository {
  // 图书类别相关
  findAllCategories(): BookCategory[] {
    const stmt = db.prepare('SELECT * FROM book_categories WHERE is_deleted = 0 ORDER BY code')
    return stmt.all() as BookCategory[]
  }

  findCategoryById(id: number): BookCategory | undefined {
    const stmt = db.prepare('SELECT * FROM book_categories WHERE id = ? AND is_deleted = 0')
    return stmt.get(id) as BookCategory | undefined
  }

  createCategory(category: Omit<BookCategory, 'id' | 'created_at' | 'updated_at' | 'version' | 'is_deleted'>): BookCategory {
    const stmt = db.prepare(`
      INSERT INTO book_categories (code, name, keywords, parent_id, notes, version, is_deleted)
      VALUES (?, ?, ?, ?, ?, 1, 0)
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
    const existing = this.findCategoryById(id)
    if (!existing) {
      throw new NotFoundError('图书类别')
    }

    const fields: string[] = []
    const values: any[] = []

    Object.keys(updates).forEach((key) => {
      if (key !== 'id' && key !== 'code' && key !== 'created_at' &&
          key !== 'updated_at' && key !== 'version' && key !== 'is_deleted') {
        fields.push(`${key} = ?`)
        values.push(updates[key as keyof BookCategory])
      }
    })

    if (fields.length > 0) {
      fields.push('updated_at = CURRENT_TIMESTAMP')
      fields.push('version = version + 1')  // 自动递增版本号
      values.push(id)
      values.push(existing.version || 1)     // 乐观锁检查

      const sql = `
        UPDATE book_categories
        SET ${fields.join(', ')}
        WHERE id = ? AND version = ?
      `
      db.prepare(sql).run(...values)
    }

    const updated = this.findCategoryById(id)
    if (!updated) throw new NotFoundError('图书类别')
    return updated
  }

  deleteCategory(id: number): void {
    // Check if category exists
    const category = this.findCategoryById(id)
    if (!category) {
      throw new NotFoundError('图书类别')
    }

    // Check if there are books using this category
    const booksCount = db.prepare('SELECT COUNT(*) as count FROM books WHERE category_id = ? AND is_deleted = 0').get(id) as { count: number }
    if (booksCount.count > 0) {
      throw new Error(`无法删除该类别，还有${booksCount.count}本图书使用此类别`)
    }

    // 软删除类别
    db.prepare('UPDATE book_categories SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP, version = version + 1 WHERE id = ?').run(id)
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
      WHERE b.is_deleted = 0 AND bc.is_deleted = 0
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

  create(book: Omit<Book, 'id' | 'created_at' | 'updated_at'>): Book {
    const stmt = db.prepare(`
      INSERT INTO books (
        isbn, title, category_id, author, publisher, publish_date,
        price, pages, keywords, description, cover_url,
        total_quantity, available_quantity, status, registration_date, notes,
        version, is_deleted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)
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
    console.log('========== [Repository] 开始数据库更新 ==========')
    console.log('[Repository] 图书ID:', id)
    console.log('[Repository] 更新字段:', Object.keys(updates))

    // 获取当前记录（包含版本号）
    const current = this.findById(id)
    if (!current) {
      throw new NotFoundError('图书')
    }

    const fields: string[] = []
    const values: any[] = []

    Object.keys(updates).forEach((key) => {
      if (key !== 'id' && key !== 'isbn' && key !== 'created_at' &&
          key !== 'updated_at' && key !== 'version' && key !== 'is_deleted') {
        fields.push(`${key} = ?`)
        values.push(updates[key as keyof Book])
        console.log(`[Repository] 添加字段: ${key} = ${updates[key as keyof Book]}`)
      }
    })

    console.log('[Repository] 构建的SQL字段:', fields.join(', '))
    console.log('[Repository] SQL参数值:', values)

    if (fields.length > 0) {
      fields.push('updated_at = CURRENT_TIMESTAMP')
      fields.push('version = version + 1')  // 自动递增版本号
      values.push(id)
      values.push(current.version || 1)     // 乐观锁检查

      const sql = `
        UPDATE books
        SET ${fields.join(', ')}
        WHERE id = ? AND version = ?
      `
      console.log('[Repository] 完整SQL语句:', sql)
      console.log('[Repository] 执行UPDATE...')
      const result = db.prepare(sql).run(...values)

      if (result.changes === 0) {
        throw new Error(`更新失败：图书已被其他用户修改（版本冲突）`)
      }

      console.log('[Repository] UPDATE执行成功')
    } else {
      console.log('[Repository] 警告：没有字段需要更新')
    }

    console.log('[Repository] 查询更新后的图书数据...')
    const updated = this.findById(id)
    if (!updated) {
      console.error('[Repository] 错误：更新后查询不到图书！')
      throw new NotFoundError('图书')
    }
    console.log('[Repository] 查询成功，返回更新后的数据')
    console.log('========== [Repository] 数据库更新结束 ==========\n')
    return updated
  }

  // 减少可借数量（带乐观锁）
  decreaseAvailableQuantity(id: number, amount: number = 1): void {
    const current = this.findById(id)
    if (!current) {
      throw new NotFoundError('图书')
    }

    const stmt = db.prepare(`
      UPDATE books
      SET available_quantity = available_quantity - ?,
          updated_at = CURRENT_TIMESTAMP,
          version = version + 1
      WHERE id = ? AND available_quantity >= ? AND version = ?
    `)
    const result = stmt.run(amount, id, amount, current.version || 1)

    if (result.changes === 0) {
      throw new Error(`图书可借数量不足，无法减少 ${amount} 本`)
    }
  }

  // 增加可借数量（带乐观锁）
  increaseAvailableQuantity(id: number, amount: number = 1): void {
    const current = this.findById(id)
    if (!current) {
      throw new NotFoundError('图书')
    }

    const stmt = db.prepare(`
      UPDATE books
      SET available_quantity = available_quantity + ?,
          updated_at = CURRENT_TIMESTAMP,
          version = version + 1
      WHERE id = ? AND version = ?
    `)
    const result = stmt.run(amount, id, current.version || 1)

    if (result.changes === 0) {
      throw new Error(`图书不存在，ID: ${id}`)
    }
  }
}
```

**出现位置：** `src/main/domains/book/book.repository.ts` (第48-321行)

---

### 2. BorrowingRepository - 借阅记录数据仓储

**简要介绍：** BorrowingRepository是借阅记录数据的仓储类，负责封装所有与借阅记录相关的数据库操作，包括借阅记录的增删改查、逾期检查、罚款计算、统计等功能。

**代码源码：**

```typescript
export class BorrowingRepository {
  findAll(filters?: {
    reader_id?: number
    book_id?: number
    status?: string
    keyword?: string
    borrow_date_from?: string
    borrow_date_to?: string
  }): BorrowingRecordWithDetails[] {
    let sql = `
      SELECT
        br.*,
        r.name as reader_name,
        r.reader_no,
        b.title as book_title,
        b.author as book_author,
        b.isbn as book_isbn
      FROM borrowing_records br
      JOIN readers r ON br.reader_id = r.id
      JOIN books b ON br.book_id = b.id
      WHERE br.is_deleted = 0 AND r.is_deleted = 0 AND b.is_deleted = 0
    `
    const params: any[] = []

    if (filters?.reader_id) {
      sql += ' AND br.reader_id = ?'
      params.push(filters.reader_id)
    }

    if (filters?.book_id) {
      sql += ' AND br.book_id = ?'
      params.push(filters.book_id)
    }

    if (filters?.status) {
      sql += ' AND br.status = ?'
      params.push(filters.status)
    }

    // 关键词模糊搜索：支持读者姓名、读者编号、图书标题、图书ISBN、图书作者
    if (filters?.keyword) {
      sql += ' AND (r.name LIKE ? OR r.reader_no LIKE ? OR b.title LIKE ? OR b.isbn LIKE ? OR b.author LIKE ?)'
      const pattern = `%${filters.keyword}%`
      params.push(pattern, pattern, pattern, pattern, pattern)
    }

    // 借书日期范围筛选
    if (filters?.borrow_date_from) {
      sql += ' AND br.borrow_date >= ?'
      params.push(filters.borrow_date_from)
    }

    if (filters?.borrow_date_to) {
      sql += ' AND br.borrow_date <= ?'
      params.push(filters.borrow_date_to)
    }

    sql += ' ORDER BY br.borrow_date DESC'

    const stmt = db.prepare(sql)
    return stmt.all(...params) as BorrowingRecordWithDetails[]
  }

  findById(id: number): BorrowingRecordWithDetails | undefined {
    const stmt = db.prepare(`
      SELECT
        br.*,
        r.name as reader_name,
        r.reader_no,
        b.title as book_title,
        b.author as book_author,
        b.isbn as book_isbn
      FROM borrowing_records br
      JOIN readers r ON br.reader_id = r.id
      JOIN books b ON br.book_id = b.id
      WHERE br.id = ? AND br.is_deleted = 0
    `)
    return stmt.get(id) as BorrowingRecordWithDetails | undefined
  }

  create(record: Omit<BorrowingRecord, 'id' | 'created_at' | 'updated_at'>): BorrowingRecord {
    const stmt = db.prepare(`
      INSERT INTO borrowing_records (
        reader_id, book_id, borrow_date, due_date, return_date,
        renewal_count, status, fine_amount, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const result = stmt.run(
      record.reader_id,
      record.book_id,
      record.borrow_date,
      record.due_date,
      record.return_date,
      record.renewal_count,
      record.status,
      record.fine_amount,
      record.notes
    )

    const created = this.findById(result.lastInsertRowid as number)
    if (!created) throw new NotFoundError('借阅记录')
    return created
  }

  update(id: number, updates: Partial<BorrowingRecord>): BorrowingRecord {
    const fields: string[] = []
    const values: any[] = []

    Object.keys(updates).forEach((key) => {
      if (key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
        fields.push(`${key} = ?`)
        values.push(updates[key as keyof BorrowingRecord])
      }
    })

    if (fields.length > 0) {
      fields.push('updated_at = CURRENT_TIMESTAMP')
      values.push(id)
      db.prepare(`UPDATE borrowing_records SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    }

    const updated = this.findById(id)
    if (!updated) throw new NotFoundError('借阅记录')
    return updated
  }

  // 查找读者的某本书的未归还借阅记录
  findActiveBorrowing(readerId: number, bookId: number): BorrowingRecordWithDetails | undefined {
    const stmt = db.prepare(`
      SELECT
        br.*,
        r.name as reader_name,
        r.reader_no,
        b.title as book_title,
        b.author as book_author,
        b.isbn as book_isbn
      FROM borrowing_records br
      JOIN readers r ON br.reader_id = r.id
      JOIN books b ON br.book_id = b.id
      WHERE br.reader_id = ? AND br.book_id = ? AND br.status = 'borrowed' AND br.is_deleted = 0
    `)
    return stmt.get(readerId, bookId) as BorrowingRecordWithDetails | undefined
  }

  // 获取逾期记录
  getOverdueRecords(): BorrowingRecordWithDetails[] {
    const stmt = db.prepare(`
      SELECT
        br.*,
        r.name as reader_name,
        r.reader_no,
        b.title as book_title,
        b.author as book_author,
        b.isbn as book_isbn
      FROM borrowing_records br
      JOIN readers r ON br.reader_id = r.id
      JOIN books b ON br.book_id = b.id
      WHERE br.status = 'borrowed' AND br.due_date < date('now') AND br.is_deleted = 0
      ORDER BY br.due_date
    `)
    return stmt.all() as BorrowingRecordWithDetails[]
  }

  // 更新逾期状态
  updateOverdueStatus(): number {
    const stmt = db.prepare(`
      UPDATE borrowing_records
      SET status = 'overdue'
      WHERE status = 'borrowed' AND due_date < date('now') AND is_deleted = 0
    `)
    const result = stmt.run()
    return result.changes
  }

  // 计算逾期罚款
  calculateFine(recordId: number, finePerDay: number): number {
    const record = this.findById(recordId)
    if (!record || record.status !== 'borrowed') {
      return 0
    }

    const dueDate = new Date(record.due_date)
    const today = new Date()

    if (today <= dueDate) {
      return 0
    }

    const overdueDays = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
    return overdueDays * finePerDay
  }

  // 获取借阅统计
  getBorrowingStatistics(): {
    total_borrowed: number
    currently_borrowed: number
    overdue_count: number
    total_fines: number
  } {
    const stmt = db.prepare(`
      SELECT
        COUNT(*) as total_borrowed,
        SUM(CASE WHEN status = 'borrowed' OR status = 'overdue' THEN 1 ELSE 0 END) as currently_borrowed,
        SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue_count,
        SUM(fine_amount) as total_fines
      FROM borrowing_records
      WHERE is_deleted = 0
    `)
    return stmt.get() as any
  }
}
```

**出现位置：** `src/main/domains/borrowing/borrowing.repository.ts` (第27-237行)

---

### 3. ReaderRepository - 读者数据仓储

**简要介绍：** ReaderRepository是读者数据的仓储类，负责封装所有与读者相关的数据库操作，包括读者和读者种类的增删改查、搜索、借阅统计等功能。

**代码源码：**

```typescript
export class ReaderRepository {
  // 读者种类相关
  findAllCategories(): ReaderCategory[] {
    const stmt = db.prepare('SELECT * FROM reader_categories ORDER BY code')
    return stmt.all() as ReaderCategory[]
  }

  findCategoryById(id: number): ReaderCategory | undefined {
    const stmt = db.prepare('SELECT * FROM reader_categories WHERE id = ? AND is_deleted = 0')
    return stmt.get(id) as ReaderCategory | undefined
  }

  createCategory(category: Omit<ReaderCategory, 'id' | 'created_at' | 'updated_at'>): ReaderCategory {
    const stmt = db.prepare(`
      INSERT INTO reader_categories (code, name, max_borrow_count, max_borrow_days, validity_days, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    const result = stmt.run(
      category.code,
      category.name,
      category.max_borrow_count,
      category.max_borrow_days,
      category.validity_days,
      category.notes
    )
    const created = this.findCategoryById(result.lastInsertRowid as number)
    if (!created) throw new NotFoundError('读者种类')
    return created
  }

  updateCategory(id: number, updates: Partial<ReaderCategory>): ReaderCategory {
    const fields: string[] = []
    const values: any[] = []

    if (updates.name) {
      fields.push('name = ?')
      values.push(updates.name)
    }
    if (updates.max_borrow_count !== undefined) {
      fields.push('max_borrow_count = ?')
      values.push(updates.max_borrow_count)
    }
    if (updates.max_borrow_days !== undefined) {
      fields.push('max_borrow_days = ?')
      values.push(updates.max_borrow_days)
    }
    if (updates.validity_days !== undefined) {
      fields.push('validity_days = ?')
      values.push(updates.validity_days)
    }
    if (updates.notes !== undefined) {
      fields.push('notes = ?')
      values.push(updates.notes)
    }

    if (fields.length > 0) {
      fields.push('updated_at = CURRENT_TIMESTAMP')
      values.push(id)
      db.prepare(`UPDATE reader_categories SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    }

    const updated = this.findCategoryById(id)
    if (!updated) throw new NotFoundError('读者种类')
    return updated
  }

  // 读者相关
  findAll(filters?: { status?: string; category_id?: number }): ReaderWithCategory[] {
    let sql = `
      SELECT r.*, rc.name as category_name, rc.max_borrow_count, rc.max_borrow_days
      FROM readers r
      JOIN reader_categories rc ON r.category_id = rc.id
      WHERE r.is_deleted = 0
    `
    const params: any[] = []

    if (filters?.status) {
      sql += ' AND r.status = ?'
      params.push(filters.status)
    }
    if (filters?.category_id) {
      sql += ' AND r.category_id = ?'
      params.push(filters.category_id)
    }

    sql += ' ORDER BY r.created_at DESC'

    const stmt = db.prepare(sql)
    return stmt.all(...params) as ReaderWithCategory[]
  }

  findById(id: number): ReaderWithCategory | undefined {
    const stmt = db.prepare(`
      SELECT r.*, rc.name as category_name, rc.max_borrow_count, rc.max_borrow_days
      FROM readers r
      JOIN reader_categories rc ON r.category_id = rc.id
      WHERE r.id = ? AND r.is_deleted = 0
    `)
    return stmt.get(id) as ReaderWithCategory | undefined
  }

  findByReaderNo(readerNo: string): ReaderWithCategory | undefined {
    const stmt = db.prepare(`
      SELECT r.*, rc.name as category_name, rc.max_borrow_count, rc.max_borrow_days
      FROM readers r
      JOIN reader_categories rc ON r.category_id = rc.id
      WHERE r.reader_no = ? AND r.is_deleted = 0
    `)
    return stmt.get(readerNo) as ReaderWithCategory | undefined
  }

  create(reader: Omit<Reader, 'id' | 'created_at' | 'updated_at'>): ReaderWithCategory {
    const stmt = db.prepare(`
      INSERT INTO readers (
        reader_no, name, category_id, user_id, gender, id_card, organization, address,
        phone, email, registration_date, expiry_date, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const result = stmt.run(
      reader.reader_no,
      reader.name,
      reader.category_id,
      reader.user_id,
      reader.gender,
      reader.id_card,
      reader.organization,
      reader.address,
      reader.phone,
      reader.email,
      reader.registration_date,
      reader.expiry_date,
      reader.status,
      reader.notes
    )

    const created = this.findById(result.lastInsertRowid as number)
    if (!created) throw new NotFoundError('读者')
    return created
  }

  update(id: number, updates: Partial<Reader>): Reader {
    const fields: string[] = []
    const values: any[] = []

    // 只更新 readers 表中实际存在的字段
    // 排除: id, reader_no, created_at, updated_at (不可更新)
    // 排除: category_name, max_borrow_count, max_borrow_days (只在 JOIN 查询中存在)
    const validFields = [
      'name', 'category_id', 'user_id', 'gender', 'id_card', 'organization',
      'address', 'phone', 'email', 'registration_date', 'expiry_date', 'status', 'notes'
    ]

    Object.keys(updates).forEach((key) => {
      if (validFields.includes(key)) {
        fields.push(`${key} = ?`)
        values.push(updates[key as keyof Reader])
      }
    })

    if (fields.length > 0) {
      fields.push('updated_at = CURRENT_TIMESTAMP')
      values.push(id)
      db.prepare(`UPDATE readers SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    }

    const updated = this.findById(id)
    if (!updated) throw new NotFoundError('读者')
    return updated
  }

  search(keyword: string): ReaderWithCategory[] {
    const stmt = db.prepare(`
      SELECT r.*, rc.name as category_name, rc.max_borrow_count, rc.max_borrow_days
      FROM readers r
      JOIN reader_categories rc ON r.category_id = rc.id
      WHERE r.is_deleted = 0 AND (r.name LIKE ? OR r.reader_no LIKE ? OR r.phone LIKE ? OR r.id_card LIKE ?)
      ORDER BY r.created_at DESC
    `)
    const pattern = `%${keyword}%`
    return stmt.all(pattern, pattern, pattern, pattern) as ReaderWithCategory[]
  }

  // 获取读者当前借阅数量
  getBorrowingCount(readerId: number): number {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM borrowing_records
      WHERE reader_id = ? AND status = 'borrowed' AND is_deleted = 0
    `)
    const result = stmt.get(readerId) as { count: number }
    return result.count
  }

  // 检查读者是否有逾期未还
  hasOverdueBooks(readerId: number): boolean {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM borrowing_records
      WHERE reader_id = ? AND status = 'borrowed' AND due_date < date('now') AND is_deleted = 0
    `)
    const result = stmt.get(readerId) as { count: number }
    return result.count > 0
  }
}
```

**出现位置：** `src/main/domains/reader/reader.repository.ts` (第42-244行)

---

## 二、ACID事务

### 1. 借书事务

**简要介绍：** 在借书操作中使用数据库事务确保数据一致性，事务包含创建借阅记录和减少图书可借数量两个操作，这两个操作必须同时成功或同时失败。

**代码源码：**

```typescript
      logger.info('开始借书事务', { readerId, bookId, readerName: reader.name, bookTitle: book.title })

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
          dueDate: dueDate.toISOString().split('T')[0],
          recordId: record.id
        })

        return record
      })

      const result = transaction()
      
      // 验证事务结果
      if (!result || !result.id) {
        throw new Error('借书事务完成但未返回有效记录')
      }
      
      // 验证图书数量是否真的减少了
      const updatedBook = this.bookRepository.findById(bookId)
      if (!updatedBook) {
        throw new Error('借书后无法找到图书信息')
      }
      
      if (updatedBook.available_quantity !== book.available_quantity - 1) {
        logger.warn('图书数量可能未正确更新', {
          expected: book.available_quantity - 1,
          actual: updatedBook.available_quantity,
          bookId
        })
      }
      
      logger.info('借书事务完成', {
        recordId: result.id,
        readerName: reader.name,
        bookTitle: book.title,
        dueDate: dueDate.toISOString().split('T')[0],
        newAvailableQuantity: updatedBook.available_quantity
      })
```

**出现位置：** `src/main/domains/borrowing/borrowing.service.ts` (第74-129行)

---

### 2. 还书事务

**简要介绍：** 在还书操作中使用数据库事务确保数据一致性，事务包含更新借阅记录状态和增加图书可借数量两个操作。

**代码源码：**

```typescript
      logger.info('开始还书事务', {
        recordId,
        readerId: record.reader_id,
        bookId: record.book_id,
        readerName: record.reader_name,
        bookTitle: record.book_title,
        fine
      })

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
          fine,
          recordId: updated.id
        })

        return updated
      })

      const result = transaction()
      
      // 验证事务结果
      if (!result || result.status !== 'returned') {
        throw new Error('还书事务完成但记录状态未正确更新')
      }
      
      // 验证图书数量是否真的增加了
      const updatedBook = this.bookRepository.findById(record.book_id)
      if (!updatedBook) {
        throw new Error('还书后无法找到图书信息')
      }
      
      logger.info('还书事务完成', {
        recordId: result.id,
        readerName: record.reader_name,
        bookTitle: record.book_title,
        fineAmount: fine,
        newAvailableQuantity: updatedBook.available_quantity
      })
```

**出现位置：** `src/main/domains/borrowing/borrowing.service.ts` (第169-219行)

---

### 3. 图书丢失处理事务

**简要介绍：** 在图书丢失处理中使用数据库事务，包含更新借阅记录状态为丢失和减少图书总数两个操作。

**代码源码：**

```typescript
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
```

**出现位置：** `src/main/domains/borrowing/borrowing.service.ts` (第301-322行)

---

### 4. 用户注册事务

**简要介绍：** 在用户注册时使用数据库事务同时创建user和reader记录，并建立双向关联，确保数据一致性。

**代码源码：**

```typescript
    // 9. 使用数据库事务同时创建 user 和 reader 记录
    logger.info('[后端] 开始数据库事务...')
    const transaction = db.transaction(() => {
      // 创建 reader 记录
      logger.info('[后端] 创建reader记录...')
      const insertReader = db.prepare(`
        INSERT INTO readers (
          reader_no, name, category_id, id_card, phone, email, address,
          registration_date, expiry_date, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      const readerResult = insertReader.run(
        readerNo,
        data.name,
        category.id,
        data.id_card || null,
        data.phone,
        data.email || null,
        data.address || null,
        registrationDate.toISOString().split('T')[0],
        expiryDate.toISOString().split('T')[0],
        'active'
      )
      const readerId = readerResult.lastInsertRowid as number
      logger.info('[后端] reader记录创建成功, readerId:', readerId)

      // 创建 user 记录，并关联 reader_id
      logger.info('[后端] 创建user记录...')
      const role = data.identity === 'teacher' ? 'teacher' : 'student'
      const insertUser = db.prepare(`
        INSERT INTO users (username, password, name, role, reader_id, email, phone)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      const userResult = insertUser.run(
        data.username,
        hashedPassword,
        data.name,
        role,
        readerId,
        data.email || null,
        data.phone
      )
      const userId = userResult.lastInsertRowid as number
      logger.info('[后端] user记录创建成功, userId:', userId)

      // 更新 reader 记录的 user_id（建立双向关联）
      logger.info('[后端] 更新reader的user_id建立双向关联...')
      const updateReader = db.prepare('UPDATE readers SET user_id = ? WHERE id = ?')
      updateReader.run(userId, readerId)
      logger.info('[后端] 双向关联建立成功')

      return userId
    })

    // 执行事务
    logger.info('[后端] 执行事务...')
    const userId = transaction()
    logger.info('[后端] 事务执行成功')
```

**出现位置：** `src/main/domains/auth/auth.service.ts` (第239-296行)

---

## 三、乐观锁

### 1. OptimisticLockManager - 乐观锁管理器

**简要介绍：** OptimisticLockManager是乐观锁工具类，使用版本号（version字段）实现乐观锁控制，通过CAS（Compare-And-Swap）操作确保数据一致性。提供了乐观锁更新、版本号获取、原子性数值更新、重试机制等功能。

**代码源码：**

```typescript
/**
 * 乐观锁版本冲突错误
 */
export class OptimisticLockError extends AppError {
  constructor(message: string, public details?: any) {
    super(message, 'OPTIMISTIC_LOCK_ERROR', details)
    this.name = 'OptimisticLockError'
  }
}

/**
 * 乐观锁工具类
 * 使用版本号（version字段）实现乐观锁控制
 * 通过CAS（Compare-And-Swap）操作确保数据一致性
 */
export class OptimisticLockManager {
  /**
   * 使用乐观锁更新记录
   * @param tableName 表名
   * @param id 记录ID
   * @param updates 更新字段
   * @param currentVersion 当前版本号
   * @returns 更新成功返回true，版本冲突返回false
   */
  static async updateWithOptimisticLock(
    tableName: string,
    id: number,
    updates: Record<string, any>,
    currentVersion: number
  ): Promise<boolean> {
    try {
      logger.debug('开始乐观锁更新', {
        table: tableName,
        id,
        currentVersion,
        updates: Object.keys(updates)
      })

      // 准备更新字段和值
      const fields: string[] = []
      const values: any[] = []

      Object.keys(updates).forEach(key => {
        if (key !== 'version' && key !== 'created_at') { // 排除系统字段
          fields.push(`${key} = ?`)
          values.push(updates[key])
        }
      })

      // 添加版本号检查和更新
      fields.push('version = ?')
      fields.push('updated_at = CURRENT_TIMESTAMP')
      values.push(currentVersion + 1, id, currentVersion)

      const sql = `
        UPDATE ${tableName} 
        SET ${fields.join(', ')}
        WHERE id = ? AND version = ?
      `

      logger.debug('执行乐观锁SQL', { sql, values })

      const result = db.prepare(sql).run(...values)

      const success = result.changes > 0

      if (success) {
        logger.info('乐观锁更新成功', {
          table: tableName,
          id,
          newVersion: currentVersion + 1
        })
      } else {
        logger.warn('乐观锁更新失败 - 版本冲突', {
          table: tableName,
          id,
          currentVersion
        })
      }

      return success
    } catch (error) {
      logger.error('乐观锁更新异常', {
        table: tableName,
        id,
        currentVersion,
        error
      })
      throw error
    }
  }

  /**
   * 获取记录当前版本号
   * @param tableName 表名
   * @param id 记录ID
   * @returns 版本号，如果记录不存在返回null
   */
  static async getCurrentVersion(
    tableName: string,
    id: number
  ): Promise<number | null> {
    try {
      const stmt = db.prepare(`
        SELECT version FROM ${tableName} WHERE id = ?
      `)
      const result = stmt.get(id) as { version: number } | undefined

      return result?.version ?? null
    } catch (error) {
      logger.error('获取版本号失败', {
        table: tableName,
        id,
        error
      })
      throw error
    }
  }

  /**
   * 检查记录是否存在且获取版本号
   * @param tableName 表名
   * @param id 记录ID
   * @returns 记录存在返回版本号，不存在返回null
   */
  static async checkRecordExists(
    tableName: string,
    id: number
  ): Promise<number | null> {
    return this.getCurrentVersion(tableName, id)
  }

  /**
   * 乐观锁更新并获取新版本
   * @param tableName 表名
   * @param id 记录ID
   * @param updates 更新字段
   * @param currentVersion 当前版本号
   * @returns 成功返回新版本号，失败返回null
   */
  static async updateAndGetNewVersion(
    tableName: string,
    id: number,
    updates: Record<string, any>,
    currentVersion: number
  ): Promise<number | null> {
    const success = await this.updateWithOptimisticLock(
      tableName,
      id,
      updates,
      currentVersion
    )

    return success ? currentVersion + 1 : null
  }

  /**
   * 原子性增加/减少数值字段（带乐观锁）
   * @param tableName 表名
   * @param id 记录ID
   * @param fieldName 字段名
   * @param delta 变化值（正数为增加，负数为减少）
   * @param currentVersion 当前版本号
   * @param minValue 最小值限制（可选）
   * @param maxValue 最大值限制（可选）
   * @returns 成功返回true，失败返回false
   */
  static async atomicUpdateNumericField(
    tableName: string,
    id: number,
    fieldName: string,
    delta: number,
    currentVersion: number,
    minValue?: number,
    maxValue?: number
  ): Promise<boolean> {
    try {
      // 构建SQL条件
      let whereCondition = 'id = ? AND version = ?'
      const params = [id, currentVersion]

      // 添加数值范围检查
      if (minValue !== undefined || maxValue !== undefined) {
        if (delta > 0) {
          // 增加操作，检查最大值
          if (maxValue !== undefined) {
            whereCondition += ` AND ${fieldName} <= ?`
            params.push(maxValue - delta)
          }
        } else if (delta < 0) {
          // 减少操作，检查最小值
          if (minValue !== undefined) {
            whereCondition += ` AND ${fieldName} >= ?`
            params.push(minValue - delta) // delta为负数，所以用减法
          }
        }
      }

      const sql = `
        UPDATE ${tableName}
        SET ${fieldName} = ${fieldName} + ?,
            version = version + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE ${whereCondition}
      `

      logger.debug('原子性数值更新', {
        table: tableName,
        id,
        field: fieldName,
        delta,
        currentVersion,
        whereCondition,
        params
      })

      const result = db.prepare(sql).run(delta, ...params)
      const success = result.changes > 0

      if (success) {
        logger.info('原子性数值更新成功', {
          table: tableName,
          id,
          field: fieldName,
          delta,
          newVersion: currentVersion + 1
        })
      } else {
        logger.warn('原子性数值更新失败', {
          table: tableName,
          id,
          field: fieldName,
          delta,
          currentVersion,
          reason: '版本冲突或数值超出限制'
        })
      }

      return success
    } catch (error) {
      logger.error('原子性数值更新异常', {
        table: tableName,
        id,
        field: fieldName,
        delta,
        currentVersion,
        error
      })
      throw error
    }
  }

  /**
   * 重试乐观锁更新操作
   * @param tableName 表名
   * @param id 记录ID
   * @param updates 更新字段
   * @param maxRetries 最大重试次数
   * @param retryCallback 重试回调函数，可以用来获取最新数据
   * @returns 成功返回新版本号，失败返回null
   */
  static async retryOptimisticUpdate(
    tableName: string,
    id: number,
    updates: Record<string, any>,
    maxRetries: number = 3,
    retryCallback?: () => Promise<any>
  ): Promise<number | null> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // 获取当前版本
        const currentVersion = await this.getCurrentVersion(tableName, id)
        if (currentVersion === null) {
          logger.warn('记录不存在，无法更新', { table: tableName, id })
          return null
        }

        // 尝试更新
        const newVersion = await this.updateAndGetNewVersion(
          tableName,
          id,
          updates,
          currentVersion
        )

        if (newVersion !== null) {
          return newVersion
        }

        // 更新失败，如果是最后一次尝试，则退出
        if (attempt === maxRetries - 1) {
          break
        }

        // 如果有重试回调，执行它来获取最新数据
        if (retryCallback) {
          await retryCallback()
        }

        logger.info('乐观锁更新失败，准备重试', {
          attempt: attempt + 1,
          maxRetries,
          table: tableName,
          id
        })

        // 短暂延迟后重试
        await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)))
      } catch (error) {
        logger.error('乐观锁重试更新异常', {
          attempt: attempt + 1,
          maxRetries,
          table: tableName,
          id,
          error
        })
        
        if (attempt === maxRetries - 1) {
          throw error
        }
      }
    }

    return null
  }
}
```

**出现位置：** `src/main/lib/optimisticLock.ts` (第1-330行)

---

### 2. BookRepository中的乐观锁实现

**简要介绍：** BookRepository在更新图书数据时使用了乐观锁机制，通过version字段和WHERE子句中的版本号检查来确保数据一致性。

**代码源码：**

```typescript
  updateCategory(id: number, updates: Partial<BookCategory>): BookCategory {
    const existing = this.findCategoryById(id)
    if (!existing) {
      throw new NotFoundError('图书类别')
    }

    const fields: string[] = []
    const values: any[] = []

    Object.keys(updates).forEach((key) => {
      if (key !== 'id' && key !== 'code' && key !== 'created_at' &&
          key !== 'updated_at' && key !== 'version' && key !== 'is_deleted') {
        fields.push(`${key} = ?`)
        values.push(updates[key as keyof BookCategory])
      }
    })

    if (fields.length > 0) {
      fields.push('updated_at = CURRENT_TIMESTAMP')
      fields.push('version = version + 1')  // 自动递增版本号
      values.push(id)
      values.push(existing.version || 1)     // 乐观锁检查

      const sql = `
        UPDATE book_categories
        SET ${fields.join(', ')}
        WHERE id = ? AND version = ?
      `
      db.prepare(sql).run(...values)
    }

    const updated = this.findCategoryById(id)
    if (!updated) throw new NotFoundError('图书类别')
    return updated
  }
```

**出现位置：** `src/main/domains/book/book.repository.ts` (第77-111行)

---

### 3. 图书数量更新的乐观锁

**简要介绍：** 在减少和增加图书可借数量时使用乐观锁，确保在并发环境下数量更新的正确性。

**代码源码：**

```typescript
  // 减少可借数量（带乐观锁）
  decreaseAvailableQuantity(id: number, amount: number = 1): void {
    const current = this.findById(id)
    if (!current) {
      throw new NotFoundError('图书')
    }

    const stmt = db.prepare(`
      UPDATE books
      SET available_quantity = available_quantity - ?,
          updated_at = CURRENT_TIMESTAMP,
          version = version + 1
      WHERE id = ? AND available_quantity >= ? AND version = ?
    `)
    const result = stmt.run(amount, id, amount, current.version || 1)

    if (result.changes === 0) {
      throw new Error(`图书可借数量不足，无法减少 ${amount} 本`)
    }
  }

  // 增加可借数量（带乐观锁）
  increaseAvailableQuantity(id: number, amount: number = 1): void {
    const current = this.findById(id)
    if (!current) {
      throw new NotFoundError('图书')
    }

    const stmt = db.prepare(`
      UPDATE books
      SET available_quantity = available_quantity + ?,
          updated_at = CURRENT_TIMESTAMP,
          version = version + 1
      WHERE id = ? AND version = ?
    `)
    const result = stmt.run(amount, id, current.version || 1)

    if (result.changes === 0) {
      throw new Error(`图书不存在，ID: ${id}`)
    }
  }
```

**出现位置：** `src/main/domains/book/book.repository.ts` (第281-321行)

---

## 四、两阶段提交

### 1. OperationLogger - 预写日志管理器

**简要介绍：** OperationLogger是预写日志（Write-Ahead Logging）管理器，实现操作日志记录和两阶段提交机制。包含创建操作日志（阶段1：预写日志）、标记为已提交、标记为已回滚、两阶段提交执行器等功能。

**代码源码：**

```typescript
/**
 * 操作日志状态
 */
export type OperationStatus = 'pending' | 'committed' | 'rolled_back' | 'failed'

/**
 * 操作类型
 */
export type OperationType = 'INSERT' | 'UPDATE' | 'DELETE'

/**
 * 操作日志接口
 */
export interface OperationLog {
  id?: number
  operation_id: string
  table_name: string
  record_id: number
  operation_type: OperationType
  old_data?: string // JSON格式
  new_data?: string // JSON格式
  status: OperationStatus
  created_by?: number
  created_at?: string
  committed_at?: string | null
  rolled_back_at?: string | null
  error_message?: string
}

/**
 * 操作日志错误
 */
export class OperationLogError extends AppError {
  constructor(message: string, public details?: any) {
    super(message, 'OPERATION_LOG_ERROR', details)
    this.name = 'OperationLogError'
  }
}

/**
 * 预写日志（Write-Ahead Logging）管理器
 * 实现操作日志记录和两阶段提交机制
 */
export class OperationLogger {
  private static readonly MAX_RETRY_ATTEMPTS = 3

  /**
   * 生成UUID
   */
  static generateUUID(): string {
    return crypto.randomUUID()
  }

  /**
   * 生成操作ID
   */
  static generateOperationId(): string {
    return `op_${this.generateUUID()}`
  }

  /**
   * 创建操作日志（阶段1：预写日志）
   * @param operationId 操作唯一标识
   * @param tableName 表名
   * @param recordId 记录ID
   * @param operationType 操作类型
   * @param oldData 旧数据（JSON格式）
   * @param newData 新数据（JSON格式）
   * @param createdBy 操作人ID
   * @returns 操作日志ID
   */
  static async createOperationLog(
    operationId: string,
    tableName: string,
    recordId: number,
    operationType: OperationType,
    oldData?: string,
    newData?: string,
    createdBy?: number
  ): Promise<number> {
    try {
      logger.info('创建操作日志', {
        operationId,
        tableName,
        recordId,
        operationType,
        createdBy
      })

      const stmt = db.prepare(`
        INSERT INTO operation_logs (
          operation_id, table_name, record_id, operation_type,
          old_data, new_data, status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
      `)

      const result = stmt.run(
        operationId,
        tableName,
        recordId,
        operationType,
        oldData,
        newData,
        createdBy
      )

      const logId = result.lastInsertRowid as number

      logger.info('操作日志创建成功', {
        operationId,
        logId,
        tableName,
        recordId
      })

      return logId
    } catch (error) {
      logger.error('创建操作日志失败', {
        operationId,
        tableName,
        recordId,
        operationType,
        error
      })
      throw new OperationLogError('创建操作日志失败', error)
    }
  }

  /**
   * 更新操作日志状态为已提交
   * @param operationId 操作ID
   */
  static async markAsCommitted(operationId: string): Promise<void> {
    try {
      const stmt = db.prepare(`
        UPDATE operation_logs
        SET status = 'committed', committed_at = CURRENT_TIMESTAMP
        WHERE operation_id = ?
      `)

      const result = stmt.run(operationId)

      if (result.changes === 0) {
        logger.warn('未找到操作日志，可能已被处理', { operationId })
        return
      }

      logger.info('操作日志标记为已提交', { operationId })
    } catch (error) {
      logger.error('标记操作日志为已提交失败', {
        operationId,
        error
      })
      throw new OperationLogError('标记操作日志为已提交失败', error)
    }
  }

  /**
   * 更新操作日志状态为已回滚
   * @param operationId 操作ID
   * @param errorMessage 错误信息
   */
  static async markAsRolledBack(
    operationId: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      const stmt = db.prepare(`
        UPDATE operation_logs
        SET status = 'rolled_back', 
            rolled_back_at = CURRENT_TIMESTAMP,
            error_message = ?
        WHERE operation_id = ?
      `)

      const result = stmt.run(errorMessage || null, operationId)

      if (result.changes === 0) {
        logger.warn('未找到操作日志，可能已被处理', { operationId })
        return
      }

      logger.info('操作日志标记为已回滚', { operationId, errorMessage })
    } catch (error) {
      logger.error('标记操作日志为已回滚失败', {
        operationId,
        errorMessage,
        error
      })
      throw new OperationLogError('标记操作日志为已回滚失败', error)
    }
  }

  /**
   * 标记操作日志为失败
   * @param operationId 操作ID
   * @param errorMessage 错误信息
   */
  static async markAsFailed(
    operationId: string,
    errorMessage: string
  ): Promise<void> {
    try {
      const stmt = db.prepare(`
        UPDATE operation_logs
        SET status = 'failed', error_message = ?
        WHERE operation_id = ?
      `)

      const result = stmt.run(errorMessage, operationId)

      if (result.changes === 0) {
        logger.warn('未找到操作日志，可能已被处理', { operationId })
        return
      }

      logger.warn('操作日志标记为失败', { operationId, errorMessage })
    } catch (error) {
      logger.error('标记操作日志为失败失败', {
        operationId,
        errorMessage,
        error
      })
      throw new OperationLogError('标记操作日志为失败失败', error)
    }
  }

  /**
   * 获取操作日志
   * @param operationId 操作ID
   * @returns 操作日志对象
   */
  static async getOperationLog(operationId: string): Promise<OperationLog | null> {
    try {
      const stmt = db.prepare(`
        SELECT * FROM operation_logs WHERE operation_id = ?
      `)

      const result = stmt.get(operationId) as OperationLog | undefined
      return result || null
    } catch (error) {
      logger.error('获取操作日志失败', { operationId, error })
      throw new OperationLogError('获取操作日志失败', error)
    }
  }

  /**
   * 两阶段提交执行器
   * @param operationId 操作ID
   * @param tableName 表名
   * @param recordId 记录ID
   * @param operationType 操作类型
   * @param oldData 旧数据（JSON格式）
   * @param newData 新数据（JSON格式）
   * @param createdBy 操作人ID
   * @param executeAction 实际执行操作的函数
   * @returns 执行结果
   */
  static async executeWithTwoPhaseCommit<T>(
    operationId: string,
    tableName: string,
    recordId: number,
    operationType: OperationType,
    oldData: string | undefined,
    newData: string | undefined,
    createdBy: number | undefined,
    executeAction: () => Promise<T>
  ): Promise<T> {
    let logId: number | null = null

    try {
      // 阶段1：预写日志
      logId = await this.createOperationLog(
        operationId,
        tableName,
        recordId,
        operationType,
        oldData,
        newData,
        createdBy
      )

      // 阶段2：执行实际操作
      logger.info('开始执行实际操作', {
        operationId,
        tableName,
        recordId,
        operationType
      })

      const result = await executeAction()

      // 操作成功，标记日志为已提交
      await this.markAsCommitted(operationId)

      logger.info('两阶段提交成功', {
        operationId,
        tableName,
        recordId,
        operationType
      })

      return result
    } catch (error) {
      logger.error('两阶段提交失败', {
        operationId,
        tableName,
        recordId,
        operationType,
        error
      })

      // 操作失败，标记日志为已回滚
      const errorMessage = error instanceof Error ? error.message : String(error)
      await this.markAsRolledBack(operationId, errorMessage)

      throw error
    }
  }

  /**
   * 清理过期的操作日志
   * @param days 保留天数，默认7天
   * @returns 清理的记录数
   */
  static async cleanupExpiredLogs(days: number = 7): Promise<number> {
    try {
      const stmt = db.prepare(`
        DELETE FROM operation_logs
        WHERE status IN ('committed', 'rolled_back', 'failed')
        AND created_at < datetime('now', '-${days} days')
      `)

      const result = stmt.run()
      const deletedCount = result.changes

      logger.info('清理过期操作日志', {
        days,
        deletedCount
      })

      return deletedCount
    } catch (error) {
      logger.error('清理过期操作日志失败', { days, error })
      throw new OperationLogError('清理过期操作日志失败', error)
    }
  }

  /**
   * 获取未完成的操作（用于恢复）
   * @returns 未完成的操作日志列表
   */
  static async getPendingOperations(): Promise<OperationLog[]> {
    try {
      const stmt = db.prepare(`
        SELECT * FROM operation_logs
        WHERE status = 'pending'
        ORDER BY created_at ASC
      `)

      return stmt.all() as OperationLog[]
    } catch (error) {
      logger.error('获取未完成操作失败', { error })
      throw new OperationLogError('获取未完成操作失败', error)
    }
  }

  /**
   * 批量恢复未完成的操作
   * @param maxOperations 最大处理数量
   * @returns 处理的记录数
   */
  static async recoverPendingOperations(maxOperations: number = 100): Promise<number> {
    try {
      const pendingOps = await this.getPendingOperations()
      const toRecover = pendingOps.slice(0, maxOperations)

      logger.info('开始恢复未完成的操作', {
        totalPending: pendingOps.length,
        toRecover: toRecover.length
      })

      let recoveredCount = 0

      for (const operation of toRecover) {
        try {
          // 对于已过期的pending操作，直接标记为失败
          const operationAge = Date.now() - new Date(operation.created_at!).getTime()
          const maxAge = 24 * 60 * 60 * 1000 // 24小时

          if (operationAge > maxAge) {
            await this.markAsFailed(
              operation.operation_id,
              '恢复时标记为失败：操作超时'
            )
            recoveredCount++
          }
        } catch (error) {
          logger.error('恢复单个操作失败', {
            operationId: operation.operation_id,
            error
          })
        }
      }

      logger.info('批量恢复未完成操作完成', {
        recoveredCount,
        totalPending: pendingOps.length
      })

      return recoveredCount
    } catch (error) {
      logger.error('批量恢复未完成操作失败', { error })
      throw new OperationLogError('批量恢复未完成操作失败', error)
    }
  }

  /**
   * 重试机制包装器
   * @param operationId 操作ID
   * @param action 要执行的操作
   * @param maxRetries 最大重试次数
   * @returns 操作结果
   */
  static async retryOperation<T>(
    operationId: string,
    action: () => Promise<T>,
    maxRetries: number = this.MAX_RETRY_ATTEMPTS
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await action()
      } catch (error) {
        lastError = error as Error

        // 如果是最后一次尝试
        if (attempt === maxRetries) {
          await this.markAsFailed(operationId, lastError.message)
          break
        }

        // 计算延迟时间（指数退避）
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000)
        
        logger.warn('操作重试', {
          operationId,
          attempt: attempt + 1,
          maxRetries,
          delay,
          error: lastError.message
        })

        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw lastError!
  }
}
```

**出现位置：** `src/main/lib/operationLogger.ts` (第1-466行)

---

## 五、并发控制

### 说明

经过代码搜索，项目中没有发现显式的并发控制相关代码（如互斥锁、信号量、并发限制等）。并发控制主要通过以下机制实现：

1. **乐观锁**：通过version字段实现，防止并发更新导致的数据不一致
2. **数据库事务**：使用SQLite的ACID事务保证数据一致性
3. **两阶段提交**：通过预写日志机制确保操作的原子性

这些机制共同构成了项目的并发控制策略，虽然没有显式的并发控制类，但通过数据库层面的机制有效解决了并发问题。

---

## 总结

本项目中实现了以下数据库特性：

1. **Repository模式**：通过BookRepository、BorrowingRepository、ReaderRepository等类封装数据访问逻辑，实现数据访问层与业务逻辑层的分离。

2. **ACID事务**：在借书、还书、用户注册等关键业务操作中使用数据库事务，确保操作的原子性、一致性、隔离性和持久性。

3. **乐观锁**：通过OptimisticLockManager工具类和Repository中的version字段实现，防止并发更新导致的数据不一致问题。

4. **两阶段提交**：通过OperationLogger实现预写日志机制，在执行实际操作前先记录日志，操作成功后标记为已提交，失败时标记为已回滚，确保数据的一致性和可恢复性。

5. **并发控制**：虽然没有显式的并发控制类，但通过乐观锁、数据库事务和两阶段提交等机制共同实现了有效的并发控制。
