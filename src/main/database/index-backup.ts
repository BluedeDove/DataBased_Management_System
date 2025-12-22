import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import * as bcrypt from 'bcryptjs'

// 数据库文件路径
const userDataPath = app.getPath('userData')
const dbPath = path.join(userDataPath, 'library.db')

// 确保目录存在
if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true })
}

// 创建数据库连接
export const db = new Database(dbPath)

// 启用外键约束
db.pragma('foreign_keys = ON')

// 初始化数据库表结构
export function initDatabase() {
  // 检查users表是否需要迁移（从2角色升级到4角色）
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name = 'users'
  `).get()

  if (tableExists) {
    // 检查表结构中的CHECK约束
    const tableInfo = db.prepare(`
      SELECT sql FROM sqlite_master
      WHERE type = 'table' AND name = 'users'
    `).get() as { sql: string } | undefined

    // 如果是旧schema（只有admin, librarian），需要迁移
    if (tableInfo && tableInfo.sql.includes("('admin', 'librarian')")) {
      console.log('🔄 检测到旧表结构，开始数据库迁移...')

      // 1. 创建新表（带正确的约束）
      db.exec(`
        CREATE TABLE users_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('admin', 'librarian', 'teacher', 'student')),
          reader_id INTEGER,
          email TEXT,
          phone TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (reader_id) REFERENCES readers(id) ON DELETE SET NULL
        )
      `)

      // 2. 复制现有数据
      db.exec(`
        INSERT INTO users_new (id, username, password, name, role, email, phone, created_at, updated_at)
        SELECT id, username, password, name, role, email, phone, created_at, updated_at
        FROM users
      `)

      // 3. 删除旧表
      db.exec('DROP TABLE users')

      // 4. 重命名新表
      db.exec('ALTER TABLE users_new RENAME TO users')

      console.log('✅ 数据库迁移完成')
    }

    // 检查是否需要添加 reader_id 字段
    if (tableInfo && !tableInfo.sql.includes('reader_id')) {
      console.log('🔄 添加 users.reader_id 字段...')

      // SQLite不支持直接添加带外键的列，需要重建表
      db.exec(`
        CREATE TABLE users_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('admin', 'librarian', 'teacher', 'student')),
          reader_id INTEGER,
          email TEXT,
          phone TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (reader_id) REFERENCES readers(id) ON DELETE SET NULL
        )
      `)

      db.exec(`
        INSERT INTO users_new (id, username, password, name, role, email, phone, created_at, updated_at)
        SELECT id, username, password, name, role, email, phone, created_at, updated_at
        FROM users
      `)

      db.exec('DROP TABLE users')
      db.exec('ALTER TABLE users_new RENAME TO users')

      console.log('✅ reader_id 字段添加完成')
    }
  } else {
    // 表不存在，创建新表（包含 reader_id 字段）
    db.exec(`
      CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'librarian', 'teacher', 'student')),
      reader_id INTEGER,
      email TEXT,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reader_id) REFERENCES readers(id) ON DELETE SET NULL
    )
  `)
  }

  // 2. 读者种类表
  db.exec(`
    CREATE TABLE IF NOT EXISTS reader_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      max_borrow_count INTEGER NOT NULL DEFAULT 5,
      max_borrow_days INTEGER NOT NULL DEFAULT 30,
      validity_days INTEGER NOT NULL DEFAULT 365,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 3. 读者表
  const readersTableExists = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name = 'readers'
  `).get()

  if (readersTableExists) {
    // 检查是否需要添加 user_id 字段
    const readersTableInfo = db.prepare(`
      SELECT sql FROM sqlite_master
      WHERE type = 'table' AND name = 'readers'
    `).get() as { sql: string } | undefined

    if (readersTableInfo && !readersTableInfo.sql.includes('user_id')) {
      console.log('🔄 添加 readers.user_id 字段...')

      // SQLite不支持直接添加带外键的列，需要重建表
      db.exec(`
        CREATE TABLE readers_new (
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
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES reader_categories(id) ON DELETE RESTRICT,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
      `)

      db.exec(`
        INSERT INTO readers_new (id, reader_no, name, category_id, gender, organization, address, phone, email, registration_date, expiry_date, status, notes, created_at, updated_at)
        SELECT id, reader_no, name, category_id, gender, organization, address, phone, email, registration_date, expiry_date, status, notes, created_at, updated_at
        FROM readers
      `)

      db.exec('DROP TABLE readers')
      db.exec('ALTER TABLE readers_new RENAME TO readers')

      console.log('✅ user_id 字段添加完成')
    }
  } else {
    // 表不存在，创建新表（包含 user_id 和 id_card 字段）
    db.exec(`
      CREATE TABLE readers (
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
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES reader_categories(id) ON DELETE RESTRICT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `)
  }

  // 4. 图书类别表
  db.exec(`
    CREATE TABLE IF NOT EXISTS book_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      keywords TEXT,
      parent_id INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES book_categories(id) ON DELETE SET NULL
    )
  `)

  // 5. 图书表
  db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      isbn TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      author TEXT NOT NULL,
      publisher TEXT NOT NULL,
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
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES book_categories(id) ON DELETE RESTRICT
    )
  `)

  // 6. 借阅记录表
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
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reader_id) REFERENCES readers(id) ON DELETE RESTRICT,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE RESTRICT
    )
  `)

  // 7. 角色权限表
  db.exec(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL CHECK(role IN ('admin', 'librarian', 'teacher', 'student')),
      permission TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(role, permission)
    )
  `)

  // 8. 系统设置表
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_key TEXT UNIQUE NOT NULL,
      setting_value TEXT,
      setting_type TEXT NOT NULL CHECK(setting_type IN ('string', 'number', 'boolean', 'json')),
      category TEXT NOT NULL CHECK(category IN ('ai', 'system', 'business')),
      description TEXT,
      is_encrypted INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 插入默认权限
  db.exec(`
    INSERT OR IGNORE INTO role_permissions (role, permission) VALUES
      ('admin', '*'),
      ('librarian', 'books:*'),
      ('librarian', 'readers:*'),
      ('librarian', 'borrowing:*'),
      ('librarian', 'statistics:read'),
      ('teacher', 'books:read'),
      ('teacher', 'borrowing:read'),
      ('teacher', 'borrowing:borrow'),
      ('teacher', 'statistics:read'),
      ('student', 'books:read'),
      ('student', 'borrowing:read'),
      ('student', 'borrowing:borrow')
  `)

  // 插入默认AI设置
  db.exec(`
    INSERT OR IGNORE INTO system_settings (setting_key, setting_value, setting_type, category, description) VALUES
      ('ai.openai.apiKey', '', 'string', 'ai', 'OpenAI API Key'),
      ('ai.openai.baseURL', 'https://api.openai.com/v1', 'string', 'ai', 'OpenAI Base URL'),
      ('ai.openai.embeddingModel', 'text-embedding-3-small', 'string', 'ai', 'Embedding Model'),
      ('ai.openai.chatModel', 'gpt-4-turbo-preview', 'string', 'ai', 'Chat Model')
  `)

  // 创建索引以提高查询性能
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_readers_category ON readers(category_id);
    CREATE INDEX IF NOT EXISTS idx_readers_status ON readers(status);
    CREATE INDEX IF NOT EXISTS idx_books_category ON books(category_id);
    CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
    CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
    CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);
    CREATE INDEX IF NOT EXISTS idx_borrowing_reader ON borrowing_records(reader_id);
    CREATE INDEX IF NOT EXISTS idx_borrowing_book ON borrowing_records(book_id);
    CREATE INDEX IF NOT EXISTS idx_borrowing_status ON borrowing_records(status);
    CREATE INDEX IF NOT EXISTS idx_borrowing_dates ON borrowing_records(borrow_date, due_date);
  `)

  console.log('✅ 数据库表结构初始化完成')
}

// 初始化测试用户
export function seedTestUsers() {
  const testUsers = [
    { username: 'librarian', password: 'lib123', name: '图书管理员', role: 'librarian', email: 'librarian@library.com' },
    { username: 'teacher', password: 'teach123', name: '教师张老师', role: 'teacher', email: 'teacher@library.com' },
    { username: 'student', password: 'student123', name: '学生李明', role: 'student', email: 'student@library.com' }
  ]

  for (const user of testUsers) {
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(user.username)
    if (!existing) {
      db.prepare(`
        INSERT INTO users (username, password, name, role, email)
        VALUES (?, ?, ?, ?, ?)
      `).run(user.username, user.password, user.name, user.role, user.email)
    }
  }
}

// 初始化默认数据
export function seedDatabase() {
  // 检查是否已有数据
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }

  if (userCount.count === 0) {
    // 创建默认管理员账户
    const salt = bcrypt.genSaltSync(10)
    const hashedPassword = bcrypt.hashSync('admin123', salt)
    
    db.prepare(`
      INSERT INTO users (username, password, name, role, email)
      VALUES (?, ?, ?, ?, ?)
    `).run('admin', hashedPassword, '系统管理员', 'admin', 'admin@library.com')

    // 创建默认读者种类
    const readerCategories = [
      { code: 'STUDENT', name: '学生', maxBorrow: 5, maxDays: 30, validity: 365 },
      { code: 'TEACHER', name: '教师', maxBorrow: 10, maxDays: 60, validity: 1095 },
      { code: 'STAFF', name: '职工', maxBorrow: 8, maxDays: 45, validity: 730 }
    ]

    const insertCategory = db.prepare(`
      INSERT INTO reader_categories (code, name, max_borrow_count, max_borrow_days, validity_days)
      VALUES (?, ?, ?, ?, ?)
    `)

    for (const cat of readerCategories) {
      insertCategory.run(cat.code, cat.name, cat.maxBorrow, cat.maxDays, cat.validity)
    }

    // 创建默认图书类别
    const bookCategories = [
      { code: 'TP', name: '计算机科学', keywords: '编程,算法,软件,硬件' },
      { code: 'I', name: '文学', keywords: '小说,诗歌,散文,戏剧' },
      { code: 'K', name: '历史地理', keywords: '历史,地理,考古' },
      { code: 'O', name: '数理科学', keywords: '数学,物理,化学' },
      { code: 'J', name: '艺术', keywords: '音乐,美术,设计,摄影' }
    ]

    const insertBookCat = db.prepare(`
      INSERT INTO book_categories (code, name, keywords)
      VALUES (?, ?, ?)
    `)

    for (const cat of bookCategories) {
      insertBookCat.run(cat.code, cat.name, cat.keywords)
    }

    console.log('✅ 默认数据初始化完成')
  }
}

// 修复旧的明文密码
function fixAdminPassword() {
  try {
    const adminUser = db.prepare('SELECT id, password FROM users WHERE username = ?').get('admin') as { id: number, password: string } | undefined
    
    if (adminUser && adminUser.password === 'admin123') {
      console.log('🔄 检测到管理员密码为明文，正在进行加密修复...')
      const salt = bcrypt.genSaltSync(10)
      const hashedPassword = bcrypt.hashSync('admin123', salt)
      
      db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, adminUser.id)
      console.log('✅ 管理员密码已加密修复')
    }
  } catch (error) {
    console.error('❌ 修复管理员密码失败:', error)
  }
}

// 在应用启动时初始化数据库
export function setupDatabase() {
  try {
    initDatabase()
    seedDatabase()
    fixAdminPassword() // 添加修复步骤
    // 注意：测试用户数据已移至独立脚本
    // 如需生成测试数据，请运行: npm run generate:testdata
    // seedTestUsers()  // 已移除自动调用
    console.log('📚 数据库系统准备就绪')
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error)
    throw error
  }
}
