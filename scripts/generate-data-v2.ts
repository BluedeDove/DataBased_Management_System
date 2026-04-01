/**
 * 数据库测试数据生成脚本 v2
 *
 * 功能：
 * - 支持命令行参数配置生成数量
 * - 生成更真实的测试数据（中国姓名、身份证、手机号）
 * - 创建边界测试场景（借阅上限、逾期、库存为0等）
 * - 支持预览模式和随机种子
 *
 * 使用方法:
 *   npm run db:generate
 *   npm run db:generate -- --books 500 --readers 150 --borrowings 500
 *   npm run db:generate -- --no-edge-cases
 *   npm run db:generate -- --dry-run
 *   npm run db:generate -- --seed 12345
 */

import Database from 'better-sqlite3'
import path from 'path'
import { existsSync, mkdirSync } from 'fs'
import { program } from 'commander'
import { SeededRandom } from './utils/random-utils'
import bcrypt from 'bcryptjs'

import { generateBooks, GeneratedBook } from './generators/book.generator'
import { generateReaders, GeneratedReader, GeneratedUser } from './generators/reader.generator'
import { generateBorrowings, GeneratedBorrowing } from './generators/borrowing.generator'
import { generateEdgeCases, DEFAULT_EDGE_CASES_CONFIG, EdgeCasesConfig } from './generators/edge-cases.generator'

// ==================== 命令行参数解析 ====================
program
  .option('-b, --books <number>', '生成图书数量', '300')
  .option('-r, --readers <number>', '生成读者数量', '100')
  .option('-w, --borrowings <number>', '生成借阅记录数量', '400')
  .option('--no-edge-cases', '禁用边界测试数据', false)
  .option('--dry-run', '预览模式，不实际插入数据', false)
  .option('--seed <number>', '随机种子(可复现)', '')
  .option('--keep-admin', '保留现有admin账号', true)
  .parse(process.argv)

const options = program.opts()

interface Config {
  books: number
  readers: number
  borrowings: number
  edgeCases: boolean
  dryRun: boolean
  seed: number
  keepAdmin: boolean
}

const config: Config = {
  books: parseInt(options.books),
  readers: parseInt(options.readers),
  borrowings: parseInt(options.borrowings),
  edgeCases: !options.noEdgeCases,
  dryRun: options.dryRun,
  seed: options.seed ? parseInt(options.seed) : Date.now(),
  keepAdmin: options.keepAdmin as boolean
}

const rng = new SeededRandom(config.seed)

console.log('🔧 数据生成配置:')
console.log(`   种子: ${config.seed}`)
console.log(`   图书: ${config.books}`)
console.log(`   读者: ${config.readers}`)
console.log(`   借阅: ${config.borrowings}`)
console.log(`   边界测试: ${config.edgeCases ? '启用' : '禁用'}`)
console.log(`   预览模式: ${config.dryRun ? '是' : '否'}`)
console.log('')

// ==================== 数据库连接 ====================
const dataDir = path.join(process.cwd(), 'data')
let db: Database.Database | null = null
let dbPath = ''

if (!config.dryRun) {
  if (!existsSync(dataDir)) {
    console.log(`📁 创建数据目录: ${dataDir}`)
    mkdirSync(dataDir, { recursive: true })
  }
  dbPath = path.join(dataDir, 'library.db')
  console.log(`📁 数据库路径: ${dbPath}`)
  db = new Database(dbPath)
  db.pragma('foreign_keys = ON')
}

// ==================== 辅助函数 ====================
function tableExists(tableName: string): boolean {
  if (!db) return false
  try {
    const result = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type = 'table' AND name = ?
    `).get(tableName)
    return !!result
  } catch (error) {
    console.warn(`  ⚠️  检查表 ${tableName} 是否存在时出现警告: ${error}`)
    return false
  }
}

function safeDelete(tableName: string, condition: string = '') {
  if (!db || !tableExists(tableName)) return
  try {
    const sql = condition
      ? `DELETE FROM ${tableName} WHERE ${condition}`
      : `DELETE FROM ${tableName}`
    db.exec(sql)
  } catch (error) {
    console.warn(`  ⚠️  删除表 ${tableName} 数据时出现警告: ${error}`)
  }
}

// ==================== 初始化数据库表结构 ====================
console.log('📋 初始化数据库表结构...')
if (!config.dryRun && db) {
  // 创建必要的数据库表（如果不存在）
  db.exec(`
    CREATE TABLE IF NOT EXISTS book_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      keywords TEXT,
      parent_id INTEGER,
      version INTEGER DEFAULT 1,
      is_deleted BOOLEAN DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES book_categories(id) ON DELETE SET NULL
    )
  `)
  db.exec(`
    CREATE TABLE IF NOT EXISTS reader_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      max_borrow_count INTEGER NOT NULL DEFAULT 5,
      max_borrow_days INTEGER NOT NULL DEFAULT 30,
      validity_days INTEGER NOT NULL DEFAULT 365,
      version INTEGER DEFAULT 1,
      is_deleted BOOLEAN DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      isbn TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      publisher TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      publish_date DATE,
      price REAL,
      pages INTEGER,
      keywords TEXT,
      description TEXT,
      cover_url TEXT,
      total_quantity INTEGER NOT NULL DEFAULT 1,
      available_quantity INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'normal' CHECK(status IN ('normal', 'damaged', 'lost', 'destroyed')),
      registration_date DATE DEFAULT (date('now')),
      version INTEGER DEFAULT 1,
      is_deleted BOOLEAN DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES book_categories(id) ON DELETE RESTRICT
    )
  `)
  db.exec(`
    CREATE TABLE IF NOT EXISTS readers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reader_no TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      user_id INTEGER,
      gender TEXT CHECK(gender IN ('male', 'female', 'other')),
      id_card TEXT UNIQUE,
      organization TEXT,
      address TEXT,
      phone TEXT,
      email TEXT,
      registration_date DATE DEFAULT (date('now')),
      expiry_date DATE,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'expired', 'pending')),
      version INTEGER DEFAULT 1,
      is_deleted BOOLEAN DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES reader_categories(id) ON DELETE RESTRICT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'librarian', 'teacher', 'student')),
      reader_id INTEGER,
      email TEXT,
      phone TEXT,
      version INTEGER DEFAULT 1,
      is_deleted BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reader_id) REFERENCES readers(id) ON DELETE SET NULL
    )
  `)
  db.exec(`
    CREATE TABLE IF NOT EXISTS borrowing_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reader_id INTEGER NOT NULL,
      book_id INTEGER NOT NULL,
      borrow_date DATE DEFAULT (date('now')),
      due_date DATE NOT NULL,
      return_date DATE,
      renewal_count INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'borrowed' CHECK(status IN ('borrowed', 'returned', 'overdue', 'lost')),
      fine_amount REAL DEFAULT 0,
      version INTEGER DEFAULT 1,
      is_deleted BOOLEAN DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reader_id) REFERENCES readers(id) ON DELETE RESTRICT,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE RESTRICT
    )
  `)
  console.log('✅ 数据库表结构初始化完成')
} else {
  console.log('📋 预览模式: 跳过数据库表结构初始化')
}

// ==================== 获取/创建类别数据 ====================
console.log('📋 初始化类别数据...')

// 图书类别数据
const defaultBookCategories = [
  { code: 'TP', name: '计算机科学', keywords: '编程,算法,软件,硬件' },
  { code: 'I', name: '文学', keywords: '小说,诗歌,散文,戏剧' },
  { code: 'K', name: '历史地理', keywords: '历史,地理,考古' },
  { code: 'O', name: '数理科学', keywords: '数学,物理,化学' },
  { code: 'J', name: '艺术', keywords: '音乐,美术,设计,摄影' }
]

// 读者类别数据
const defaultReaderCategories = [
  { code: 'TEACHER', name: '教师', max_borrow_count: 10, max_borrow_days: 60, validity_days: 730 },
  { code: 'STUDENT', name: '学生', max_borrow_count: 5, max_borrow_days: 30, validity_days: 365 }
]

let bookCategories: Array<{ id: number; code: string; name: string; keywords?: string }>
let readerCategories: Array<{ id: number; code: string; name: string; max_borrow_count: number; max_borrow_days: number; validity_days: number }>

if (!config.dryRun && db) {
  // 插入图书类别
  const insertBookCategory = db.prepare(`
    INSERT OR IGNORE INTO book_categories (code, name, keywords)
    VALUES (?, ?, ?)
  `)
  for (const cat of defaultBookCategories) {
    insertBookCategory.run(cat.code, cat.name, cat.keywords)
  }

  // 插入读者类别
  const insertReaderCategory = db.prepare(`
    INSERT OR IGNORE INTO reader_categories (code, name, max_borrow_count, max_borrow_days, validity_days)
    VALUES (?, ?, ?, ?, ?)
  `)
  for (const cat of defaultReaderCategories) {
    insertReaderCategory.run(cat.code, cat.name, cat.max_borrow_count, cat.max_borrow_days, cat.validity_days)
  }

  // 获取类别数据
  bookCategories = db.prepare('SELECT * FROM book_categories').all() as any[]
  readerCategories = db.prepare('SELECT * FROM reader_categories').all() as any[]
} else {
  // 预览模式使用模拟数据
  bookCategories = defaultBookCategories.map((cat, index) => ({ id: index + 1, ...cat }))
  readerCategories = defaultReaderCategories.map((cat, index) => ({ id: index + 1, ...cat }))
}

console.log(`✅ 找到 ${bookCategories.length} 个图书类别`)
console.log(`   图书类别: ${bookCategories.map(c => `${c.code}(${c.id})`).join(', ')}`)
console.log(`✅ 找到 ${readerCategories.length} 个读者类别`)
console.log(`   读者类别: ${readerCategories.map(c => `${c.code}(${c.id})`).join(', ')}`)
console.log('')

// ==================== 清理旧数据 ====================
if (!config.dryRun && db) {
  console.log('🧹 清理旧数据...')
  safeDelete('borrowing_records')
  if (config.keepAdmin) {
    safeDelete('readers')
    safeDelete('users', "username NOT IN ('admin', 'librarian')")
  } else {
    safeDelete('users')
    safeDelete('readers')
  }
  safeDelete('books')
  console.log('✅ 旧数据清理完成')
  console.log('')
}

// ==================== 1. 生成图书数据 ====================
console.log('📚 生成图书数据...')
const generatedBooks = generateBooks({
  count: config.books,
  categories: bookCategories.map(c => ({ id: c.id, code: c.code, name: c.name })),
  rng
})
console.log(`✅ 生成了 ${generatedBooks.length} 本图书`)

// 验证类别ID
const validCategoryIds = new Set(bookCategories.map(c => c.id))
const categoryIdsUsed = new Set(generatedBooks.map(b => b.category_id))
console.log(`   使用的类别ID: ${[...categoryIdsUsed].join(', ')}`)
console.log(`   可用的类别ID: ${[...validCategoryIds].join(', ')}`)

const invalidIds = [...categoryIdsUsed].filter(id => !validCategoryIds.has(id))
if (invalidIds.length > 0) {
  console.error(`   ❌ 发现无效的类别ID: ${invalidIds.join(', ')}`)
}
console.log('')

// ==================== 2. 生成读者和用户数据 ====================
console.log('👥 生成读者和用户数据...')
const { readers: generatedReaders, users: generatedUsers } = generateReaders({
  count: config.readers,
  categories: readerCategories.map(c => ({
    id: c.id,
    code: c.code,
    name: c.name,
    max_borrow_days: c.max_borrow_days,
    max_borrow_count: c.max_borrow_count
  })),
  rng,
  defaultPassword: '123456'
})
console.log(`✅ 生成了 ${generatedReaders.length} 个读者和 ${generatedUsers.length} 个用户`)
console.log('   - 默认密码: 123456')
console.log('   - 用户名格式: teacher001, student001, etc.')
console.log('')

// ==================== 3. 插入图书数据 ====================
let booksWithIds: Array<GeneratedBook & { id: number }> = []

if (!config.dryRun && db) {
  const insertBook = db.prepare(`
    INSERT INTO books (isbn, title, author, publisher, category_id, publish_date, price, pages,
                       keywords, description, cover_url, total_quantity, available_quantity, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertBookTransaction = db.transaction((books: GeneratedBook[]) => {
    for (const book of books) {
      const categoryExists = bookCategories.find(c => c.id === book.category_id)
      if (!categoryExists) {
        console.error(`❌ 错误: 图书 "${book.title}" 的 category_id=${book.category_id} 不存在`)
        continue
      }
      insertBook.run(
        book.isbn,
        book.title,
        book.author,
        book.publisher,
        book.category_id,
        book.publish_date,
        book.price,
        book.pages,
        book.keywords,
        book.description,
        book.cover_url,
        book.total_quantity,
        book.available_quantity,
        book.status
      )
    }
  })

  insertBookTransaction(generatedBooks)
  booksWithIds = db.prepare('SELECT * FROM books').all() as any[]
  console.log(`✅ 插入了 ${booksWithIds.length} 本图书到数据库`)
} else {
  booksWithIds = generatedBooks.map((book, index) => ({ ...book, id: index + 1 }))
  console.log(`📋 预览模式: 将插入 ${booksWithIds.length} 本图书`)
}
console.log('')

// ==================== 4. 插入读者和用户数据 ====================
let readersWithIds: Array<GeneratedReader & { id: number }> = []
let usersWithIds: Array<GeneratedUser & { id: number; reader_id: number }> = []

if (!config.dryRun && db) {
  const insertReader = db.prepare(`
    INSERT INTO readers (reader_no, name, category_id, user_id, gender, id_card, organization,
                         phone, email, address, status, registration_date, expiry_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertUser = db.prepare(`
    INSERT INTO users (username, password, name, role, reader_id, email, phone)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const updateReaderUserId = db.prepare(`
    UPDATE readers SET user_id = ? WHERE id = ?
  `)

  const insertReaderAndUserTransaction = db.transaction(() => {
    for (let i = 0; i < generatedReaders.length; i++) {
      const reader = generatedReaders[i]
      const user = generatedUsers[i]

      const readerResult = insertReader.run(
        reader.reader_no,
        reader.name,
        reader.category_id,
        null,
        reader.gender,
        reader.id_card,
        reader.organization,
        reader.phone,
        reader.email,
        reader.address,
        reader.status,
        reader.registration_date,
        reader.expiry_date,
        reader.notes
      )
      const readerId = readerResult.lastInsertRowid as number

      const userResult = insertUser.run(
        user.username,
        user.password,
        user.name,
        user.role,
        readerId,
        user.email,
        user.phone
      )
      const userId = userResult.lastInsertRowid as number

      updateReaderUserId.run(userId, readerId)
    }
  })

  insertReaderAndUserTransaction()
  readersWithIds = db.prepare('SELECT * FROM readers').all() as any[]
  usersWithIds = db.prepare('SELECT * FROM users WHERE id > 1').all() as any[]
  console.log(`✅ 插入了 ${readersWithIds.length} 个读者和用户到数据库`)
} else {
  readersWithIds = generatedReaders.map((reader, index) => ({ ...reader, id: index + 1 }))
  usersWithIds = generatedUsers.map((user, index) => ({ ...user, id: index + 1, reader_id: index + 1 }))
  console.log(`📋 预览模式: 将插入 ${readersWithIds.length} 个读者和用户`)
}
console.log('')

// ==================== 5. 生成借阅记录 ====================
console.log('📖 生成借阅记录...')
const generatedBorrowings = generateBorrowings({
  count: config.borrowings,
  readers: readersWithIds,
  books: booksWithIds,
  readerCategories: readerCategories.map(c => ({
    id: c.id,
    code: c.code,
    max_borrow_days: c.max_borrow_days,
    max_borrow_count: c.max_borrow_count
  })),
  rng
})
console.log(`✅ 生成了 ${generatedBorrowings.length} 条借阅记录`)
console.log('')

// ==================== 6. 插入借阅记录 ====================
const allBorrowings = [...generatedBorrowings]

if (!config.dryRun && db) {
  const insertBorrowing = db.prepare(`
    INSERT INTO borrowing_records (reader_id, book_id, borrow_date, due_date, return_date,
                                   renewal_count, status, fine_amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const updateBookQuantity = db.prepare(`
    UPDATE books
    SET available_quantity = available_quantity - 1,
        updated_at = CURRENT_TIMESTAMP,
        version = version + 1
    WHERE id = ? AND available_quantity >= 1
  `)

  const insertBorrowingTransaction = db.transaction((borrowings: GeneratedBorrowing[]) => {
    for (const borrowing of borrowings) {
      insertBorrowing.run(
        borrowing.reader_id,
        borrowing.book_id,
        borrowing.borrow_date,
        borrowing.due_date,
        borrowing.return_date,
        borrowing.renewal_count,
        borrowing.status,
        borrowing.fine_amount
      )
      // 如果是借阅中或逾期，减少库存
      if (borrowing.status === 'borrowed' || borrowing.status === 'overdue') {
        updateBookQuantity.run(borrowing.book_id)
      }
    }
  })

  insertBorrowingTransaction(allBorrowings)
  console.log(`✅ 插入了 ${allBorrowings.length} 条借阅记录到数据库`)
} else {
  console.log(`📋 预览模式: 将插入 ${allBorrowings.length} 条借阅记录`)
}
console.log('')

// ==================== 7. 生成边界测试数据 ====================
let edgeCaseBorrowings: GeneratedBorrowing[] = []

if (config.edgeCases) {
  console.log('⚠️  生成边界测试数据...')
  const edgeCases = generateEdgeCases(
    readersWithIds,
    booksWithIds,
    readerCategories.map(c => ({
      id: c.id,
      code: c.code,
      max_borrow_days: c.max_borrow_days,
      max_borrow_count: c.max_borrow_count
    })),
    DEFAULT_EDGE_CASES_CONFIG,
    rng
  )

  // 合并边界测试的借阅记录
  edgeCaseBorrowings = edgeCases.borrowings

  // 更新图书和读者状态
  if (!config.dryRun && db) {
    for (const book of edgeCases.books) {
      if (book.available_quantity === 0 || book.status !== 'normal') {
        db.prepare(`
          UPDATE books
          SET available_quantity = ?, status = ?, updated_at = CURRENT_TIMESTAMP,
              version = version + 1
          WHERE id = ?
        `).run(book.available_quantity, book.status, book.id)
      }
    }
    // 更新读者过期时间
    for (const reader of edgeCases.readers) {
      const originalExpiry = generatedReaders.find(r => r.reader_no === reader.reader_no)?.expiry_date
      if (originalExpiry !== reader.expiry_date) {
        db.prepare(`
          UPDATE readers SET expiry_date = ? WHERE id = ?
        `).run(reader.expiry_date, reader.id)
      }
    }

    // 插入边界测试借阅记录
    if (edgeCaseBorrowings.length > 0) {
      const insertBorrowing = db.prepare(`
        INSERT INTO borrowing_records (reader_id, book_id, borrow_date, due_date, return_date,
                                       renewal_count, status, fine_amount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      const insertEdgeCaseTransaction = db.transaction((borrowings: GeneratedBorrowing[]) => {
        for (const borrowing of borrowings) {
          insertBorrowing.run(
            borrowing.reader_id,
            borrowing.book_id,
            borrowing.borrow_date,
            borrowing.due_date,
            borrowing.return_date,
            borrowing.renewal_count,
            borrowing.status,
            borrowing.fine_amount
          )
        }
      })
      insertEdgeCaseTransaction(edgeCaseBorrowings)
    }
  }
  console.log(`✅ 边界测试数据生成完成 (${edgeCaseBorrowings.length} 条额外借阅记录)`)
  console.log('')
}

// ==================== 8. 统计信息 ====================
console.log('\n📊 数据统计:')
console.log('━'.repeat(50))

if (!config.dryRun && db) {
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as any
  const totalBooks = db.prepare('SELECT COUNT(*) as count FROM books').get() as any
  const totalReaders = db.prepare('SELECT COUNT(*) as count FROM readers').get() as any
  const totalBorrowings = db.prepare('SELECT COUNT(*) as count FROM borrowing_records').get() as any
  const activeBorrowings = db.prepare("SELECT COUNT(*) as count FROM borrowing_records WHERE status = 'borrowed' OR status = 'overdue'").get() as any
  const overdueBorrowings = db.prepare("SELECT COUNT(*) as count FROM borrowing_records WHERE status = 'overdue'").get() as any
  const totalFine = db.prepare('SELECT SUM(fine_amount) as total FROM borrowing_records').get() as any
  const zeroStockBooks = db.prepare("SELECT COUNT(*) as count FROM books WHERE available_quantity = 0").get() as any

  console.log(`   用户总数: ${totalUsers.count}`)
  console.log(`   图书总数: ${totalBooks.count}`)
  console.log(`   读者总数: ${totalReaders.count}`)
  console.log(`   借阅记录: ${totalBorrowings.count}`)
  console.log(`   进行中: ${activeBorrowings.count}`)
  console.log(`   逾期未还: ${overdueBorrowings.count}`)
  console.log(`   总罚款: ¥${(totalFine.total || 0).toFixed(2)}`)
  console.log(`   库存为0: ${zeroStockBooks.count}`)
} else {
  const totalBorrowings = [...allBorrowings, ...edgeCaseBorrowings]
  console.log(`   用户总数: ${generatedUsers.length + 1} (含admin)`)
  console.log(`   图书总数: ${generatedBooks.length}`)
  console.log(`   读者总数: ${generatedReaders.length}`)
  console.log(`   借阅记录: ${totalBorrowings.length}`)

  // 统计借阅状态分布
  const statusCount = {
    returned: totalBorrowings.filter(b => b.status === 'returned' && b.fine_amount === 0).length,
    overdue_returned: totalBorrowings.filter(b => b.return_date && b.fine_amount > 0).length,
    borrowed: totalBorrowings.filter(b => b.status === 'borrowed').length,
    overdue: totalBorrowings.filter(b => b.status === 'overdue').length,
    lost: totalBorrowings.filter(b => b.status === 'lost').length
  }
  console.log(`   - 正常归还: ${statusCount.returned}`)
  console.log(`   - 逾期归还: ${statusCount.overdue_returned}`)
  console.log(`   - 借阅中: ${statusCount.borrowed}`)
  console.log(`   - 逾期未还: ${statusCount.overdue}`)
  console.log(`   - 丢失: ${statusCount.lost}`)
}

console.log('━'.repeat(50))
console.log('\n✅ 测试数据生成完成!')
console.log('💡 提示: 现在可以重启应用查看生成的数据')
console.log('📝 默认账号:')
console.log('   - 管理员: admin / admin123')
console.log('   - 图书管理员: librarian / lib123')
console.log('   - 教师: teacher001 / 123456')
console.log('   - 学生: student001 / 123456')

if (config.dryRun) {
  console.log('\n⚠️  预览模式: 数据未实际插入数据库')
}

// 关闭数据库连接
if (db) {
  db.close()
}

process.exit(0)
