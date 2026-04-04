import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import * as bcrypt from 'bcryptjs'
import { checkDatabaseHealth, printHealthReport, HealthReport } from './health-check'

// 数据库实例（延迟初始化）
let _dbInstance: Database.Database | null = null

/**
 * 获取数据库实例
 */
function getDbInstance(): Database.Database {
  if (!_dbInstance) {
    throw new Error('数据库未初始化，请先调用 setupDatabase()')
  }
  return _dbInstance
}

/**
 * 数据库实例（延迟初始化 getter）
 * 使用 getter 来避免在模块顶层初始化
 */
export const db = new Proxy({} as Database.Database, {
  get(target, prop) {
    const instance = getDbInstance()
    return Reflect.get(instance, prop)
  }
}) as Database.Database

/**
 * 修复选项
 */
export interface RepairOptions {
  /** 是否自动修复所有问题 */
  autoFix?: boolean
  /** 指定要修复的表，不指定则修复所有表 */
  tables?: string[]
}

/**
 * 修复结果
 */
export interface RepairResult {
  success: boolean
  repairedIssues: string[]
  failedIssues: string[]
  timestamp: Date
}

/**
 * 初始化数据库表结构
 */
export function initDatabase() {
  // 1. 用户表
  const usersTableExists = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name = 'users'
  `).get()

  if (usersTableExists) {
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
          version INTEGER DEFAULT 1,
          is_deleted BOOLEAN DEFAULT 0,
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
          version INTEGER DEFAULT 1,
          is_deleted BOOLEAN DEFAULT 0,
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
    // 表不存在，创建新表（包含所有必需字段）
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
        version INTEGER DEFAULT 1,
        is_deleted BOOLEAN DEFAULT 0,
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
      version INTEGER DEFAULT 1,
      is_deleted BOOLEAN DEFAULT 0,
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
        INSERT INTO readers_new (id, reader_no, name, category_id, gender, organization, address, phone, email, registration_date, expiry_date, status, notes, created_at, updated_at)
        SELECT id, reader_no, name, category_id, gender, organization, address, phone, email, registration_date, expiry_date, status, notes, created_at, updated_at
        FROM readers
      `)

      db.exec('DROP TABLE readers')
      db.exec('ALTER TABLE readers_new RENAME TO readers')

      console.log('✅ user_id 字段添加完成')
    }
  } else {
    // 表不存在，创建新表（包含所有必需字段）
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
        version INTEGER DEFAULT 1,
        is_deleted BOOLEAN DEFAULT 0,
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
      version INTEGER DEFAULT 1,
      is_deleted BOOLEAN DEFAULT 0,
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
      version INTEGER DEFAULT 1,
      is_deleted BOOLEAN DEFAULT 0,
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
      version INTEGER DEFAULT 1,
      is_deleted BOOLEAN DEFAULT 0,
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

  // 9. AI对话历史表
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      messages TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)

  // 10. 操作日志表
  db.exec(`
    CREATE TABLE IF NOT EXISTS operation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operation_id TEXT UNIQUE NOT NULL,
      table_name TEXT NOT NULL,
      record_id INTEGER NOT NULL,
      operation_type TEXT NOT NULL CHECK(operation_type IN ('INSERT', 'UPDATE', 'DELETE')),
      old_data TEXT,
      new_data TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'committed', 'rolled_back', 'failed')),
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      committed_at DATETIME,
      rolled_back_at DATETIME,
      error_message TEXT,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `)

  // 11. 审计日志表
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      table_name TEXT,
      record_id INTEGER,
      old_values TEXT,
      new_values TEXT,
      ip_address TEXT,
      user_agent TEXT,
      session_id TEXT,
      additional_info TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `)

  // 12. 图书向量表
  db.exec(`
    CREATE TABLE IF NOT EXISTS book_vectors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL UNIQUE,
      vector TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       INTEGER NOT NULL,
      title         TEXT NOT NULL DEFAULT '无标题',
      content       TEXT NOT NULL DEFAULT '',
      book_id       INTEGER,
      visibility    TEXT NOT NULL DEFAULT 'private' CHECK(visibility IN ('private', 'public', 'legacy')),
      legacy_borrowing_id INTEGER,
      view_count    INTEGER NOT NULL DEFAULT 0,
      version       INTEGER NOT NULL DEFAULT 1,
      is_deleted    INTEGER NOT NULL DEFAULT 0,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE SET NULL,
      FOREIGN KEY (legacy_borrowing_id) REFERENCES borrowing_records(id) ON DELETE SET NULL
    )
  `)
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_notes_user_id    ON notes(user_id);
    CREATE INDEX IF NOT EXISTS idx_notes_book_id    ON notes(book_id);
    CREATE INDEX IF NOT EXISTS idx_notes_visibility ON notes(visibility);
    CREATE INDEX IF NOT EXISTS idx_notes_deleted    ON notes(is_deleted);
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS renewal_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      borrowing_record_id INTEGER NOT NULL,
      request_user_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'cancelled')),
      request_note TEXT,
      review_note TEXT,
      reviewed_by INTEGER,
      requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      reviewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (borrowing_record_id) REFERENCES borrowing_records(id) ON DELETE CASCADE,
      FOREIGN KEY (request_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient_user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('system', 'broadcast', 'renewal_request', 'renewal_result', 'due_soon')),
      level TEXT NOT NULL DEFAULT 'info' CHECK(level IN ('info', 'success', 'warning', 'error')),
      is_read INTEGER NOT NULL DEFAULT 0,
      dedupe_key TEXT UNIQUE,
      metadata TEXT,
      created_by INTEGER,
      related_record_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (related_record_id) REFERENCES borrowing_records(id) ON DELETE SET NULL
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
      ('ai.openai.baseURL', 'https://api.siliconflow.cn/v1', 'string', 'ai', 'OpenAI Base URL'),
      ('ai.openai.embeddingModel', 'Qwen/Qwen3-Embedding-8B', 'string', 'ai', 'Embedding Model'),
      ('ai.openai.chatModel', 'Pro/MiniMaxAI/MiniMax-M2.5', 'string', 'ai', 'Chat Model')
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
    CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id);
    CREATE INDEX IF NOT EXISTS idx_ai_conversations_created ON ai_conversations(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_operation_logs_operation_id ON operation_logs(operation_id);
    CREATE INDEX IF NOT EXISTS idx_operation_logs_status ON operation_logs(status);
    CREATE INDEX IF NOT EXISTS idx_operation_logs_created_at ON operation_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_book_vectors_book_id ON book_vectors(book_id);
    CREATE INDEX IF NOT EXISTS idx_renewal_requests_record ON renewal_requests(borrowing_record_id);
    CREATE INDEX IF NOT EXISTS idx_renewal_requests_status ON renewal_requests(status);
    CREATE INDEX IF NOT EXISTS idx_renewal_requests_request_user ON renewal_requests(request_user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(recipient_user_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notifications_related_record ON notifications(related_record_id);
  `)

  console.log('✅ 数据库表结构初始化完成')
}

/**
 * 初始化默认数据
 */
export function seedDatabase() {
  // 检查是否已有用户
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }

  if (userCount.count === 0) {
    // 创建默认管理员账户
    const salt = bcrypt.genSaltSync(10)
    const hashedPassword = bcrypt.hashSync('admin123', salt)

    db.prepare(`
      INSERT INTO users (username, password, name, role, email)
      VALUES (?, ?, ?, ?, ?)
    `).run('admin', hashedPassword, '系统管理员', 'admin', 'admin@library.com')
  }

  // 检查并创建默认读者种类
  const readerCategoryCount = db.prepare('SELECT COUNT(*) as count FROM reader_categories').get() as { count: number }
  if (readerCategoryCount.count === 0) {
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
  }

  // 检查并创建默认图书类别
  const bookCategoryCount = db.prepare('SELECT COUNT(*) as count FROM book_categories').get() as { count: number }
  if (bookCategoryCount.count === 0) {
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
  }

  if (userCount.count === 0 || readerCategoryCount.count === 0 || bookCategoryCount.count === 0) {
    console.log('✅ 默认数据初始化完成')
  }
}

/**
 * 修复旧的明文密码
 */
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

/**
 * 修复数据库问题
 */
export function repairDatabase(_options?: RepairOptions): RepairResult {
  const repairedIssues: string[] = []
  const failedIssues: string[] = []

  try {
    console.log('🔧 开始修复数据库...')

    // 创建索引
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_operation_logs_operation_id ON operation_logs(operation_id)',
      'CREATE INDEX IF NOT EXISTS idx_operation_logs_status ON operation_logs(status)',
      'CREATE INDEX IF NOT EXISTS idx_operation_logs_created_at ON operation_logs(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_books_is_deleted ON books(is_deleted)',
      'CREATE INDEX IF NOT EXISTS idx_readers_is_deleted ON readers(is_deleted)',
      'CREATE INDEX IF NOT EXISTS idx_users_is_deleted ON users(is_deleted)',
      'CREATE INDEX IF NOT EXISTS idx_borrowing_records_is_deleted ON borrowing_records(is_deleted)',
      'CREATE INDEX IF NOT EXISTS idx_books_version ON books(version)',
      'CREATE INDEX IF NOT EXISTS idx_borrowing_records_version ON borrowing_records(version)'
    ]

    for (const indexSql of indexes) {
      try {
        db.exec(indexSql)
      } catch (error) {
        console.warn(`创建索引失败: ${indexSql}`, error)
      }
    }

    console.log('✅ 数据库修复完成')
  } catch (error) {
    console.error('❌ 数据库修复失败:', error)
    failedIssues.push(`修复过程异常: ${error}`)
  }

  return {
    success: failedIssues.length === 0,
    repairedIssues,
    failedIssues,
    timestamp: new Date()
  }
}

/**
 * 检查数据库健康状态
 */
export function checkHealth(): HealthReport {
  return checkDatabaseHealth(db)
}

/**
 * 在应用启动时初始化数据库
 */
export function setupDatabase(dbPath?: string) {
  try {
    // 初始化数据库连接
    if (_dbInstance === null) {
      // 使用环境变量或默认路径
      const finalDbPath = dbPath || process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'library.db')
      const dbDir = path.dirname(finalDbPath)

      // 确保目录存在
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true })
      }

      console.log(`📁 数据库路径: ${finalDbPath}`)

      // 创建数据库连接
      _dbInstance = new Database(finalDbPath)

      // 启用外键约束
      _dbInstance.pragma('foreign_keys = ON')
    }

    initDatabase()
    seedDatabase()
    fixAdminPassword()

    // 执行健康检查
    const healthReport = checkHealth()
    printHealthReport(healthReport)

    if (!healthReport.isHealthy) {
      console.log('⚠️  数据库存在健康问题，如需修复请调用 repairDatabase() 函数')
    }

    console.log('📚 数据库系统准备就绪')
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error)
    throw error
  }
}
