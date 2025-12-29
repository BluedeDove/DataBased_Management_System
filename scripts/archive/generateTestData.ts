import Database from 'better-sqlite3'
import path from 'path'
import { existsSync, mkdirSync } from 'fs'
import os from 'os'
import bcrypt from 'bcryptjs'

// 获取数据库路径（兼容独立运行和 Electron 环境）
const userDataPath = process.env.APPDATA
  ? path.join(process.env.APPDATA, 'electron-smart-library')
  : path.join(os.homedir(), '.electron-smart-library')

if (!existsSync(userDataPath)) {
  mkdirSync(userDataPath, { recursive: true })
}
const dbPath = path.join(userDataPath, 'library.db')
const db = new Database(dbPath)

// Enable foreign keys
db.pragma('foreign_keys = ON')

// 删除所有现有表（完全重新初始化）
console.log('🗑️  删除现有表结构...')
db.exec(`
  DROP TABLE IF EXISTS borrowing_records;
  DROP TABLE IF EXISTS books;
  DROP TABLE IF EXISTS book_categories;
  DROP TABLE IF EXISTS readers;
  DROP TABLE IF EXISTS reader_categories;
  DROP TABLE IF EXISTS users;
  DROP TABLE IF EXISTS role_permissions;
  DROP TABLE IF EXISTS system_settings;
`)
console.log('✅ 现有表已删除\n')

// 初始化数据库表结构（从 src/main/database/index.ts 复制）
console.log('🔧 初始化数据库表结构...')

// 1. 用户表
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reader_id) REFERENCES readers(id) ON DELETE SET NULL
  )
`)

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
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES reader_categories(id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  )
`)

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

// 创建索引
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

// 插入默认数据
console.log('📝 插入默认数据（用户、权限、类别）...')

// 创建默认管理员账户
const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin')
if (!adminExists) {
  const salt = bcrypt.genSaltSync(10)
  const hashedPassword = bcrypt.hashSync('admin123', salt)

  db.prepare(`
    INSERT INTO users (username, password, name, role, email)
    VALUES (?, ?, ?, ?, ?)
  `).run('admin', hashedPassword, '系统管理员', 'admin', 'admin@library.com')
}

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

// 创建默认读者种类
const readerCategoriesCount = db.prepare('SELECT COUNT(*) as count FROM reader_categories').get() as { count: number }
if (readerCategoriesCount.count === 0) {
  const insertReaderCategory = db.prepare(`
    INSERT INTO reader_categories (code, name, max_borrow_count, max_borrow_days, validity_days)
    VALUES (?, ?, ?, ?, ?)
  `)
  insertReaderCategory.run('STUDENT', '学生', 5, 30, 365)
  insertReaderCategory.run('TEACHER', '教师', 10, 60, 1095)
  insertReaderCategory.run('STAFF', '职工', 8, 45, 730)
}

// 创建默认图书类别
const bookCategoriesCount = db.prepare('SELECT COUNT(*) as count FROM book_categories').get() as { count: number }
if (bookCategoriesCount.count === 0) {
  const insertBookCat = db.prepare(`
    INSERT INTO book_categories (code, name, keywords)
    VALUES (?, ?, ?)
  `)
  insertBookCat.run('TP', '计算机科学', '编程,算法,软件,硬件')
  insertBookCat.run('I', '文学', '小说,诗歌,散文,戏剧')
  insertBookCat.run('K', '历史地理', '历史,地理,考古')
  insertBookCat.run('O', '数理科学', '数学,物理,化学')
  insertBookCat.run('J', '艺术', '音乐,美术,设计,摄影')
}

console.log('✅ 数据库初始化完成\n')

console.log('📊 开始生成测试数据...\n')

// 清理现有测试数据（保留配置数据）
console.log('🧹 清理现有数据...')
db.exec('DELETE FROM borrowing_records')
db.exec('DELETE FROM books WHERE id > 0')
db.exec('DELETE FROM users WHERE id > 1') // 保留admin账号
db.exec('DELETE FROM readers WHERE id > 0')
console.log('✅ 清理完成\n')

// 1. 生成图书数据
console.log('📚 生成图书数据...')
const bookCategories = db.prepare('SELECT * FROM book_categories').all()
const bookNames = [
  // 计算机科学
  '深入理解计算机系统', 'JavaScript高级程序设计', 'Python编程从入门到实践', 'Java核心技术',
  '算法导论', '设计模式', '重构', '代码大全', '人工智能导论', '机器学习实战',
  'C++ Primer', 'Effective Java', 'Clean Code', '计算机网络：自顶向下方法', '现代操作系统',
  '编译原理', '数据库系统概念', 'HTTP权威指南', '鸟哥的Linux私房菜', '黑客与画家',
  '人月神话', '编程珠玑', '深度学习', '统计学习方法', 'Python数据分析',
  'Vue.js权威指南', 'React进阶之路', 'Node.js实战', 'Go语言实战', 'Rust编程之道',
  // 文学
  '平凡的世界', '活着', '围城', '白夜行', '百年孤独', '追风筝的人', '三体', '1984',
  '红楼梦', '三国演义', '水浒传', '西游记', '呐喊', '彷徨', '朝花夕拾',
  '骆驼祥子', '四世同堂', '边城', '呼兰河传', '倾城之恋',
  '老人与海', '了不起的盖茨比', '麦田里的守望者', '杀死一只知更鸟', '傲慢与偏见',
  '简爱', '呼啸山庄', '复活', '战争与和平', '罪与罚',
  // 历史地理/社科
  '中国通史', '明朝那些事儿', '万历十五年', '人类简史', '未来简史', '全球通史',
  '枪炮、病菌与钢铁', '乌合之众', '社会契约论', '理想国', '君主论',
  '国富论', '资本论', '梦的解析', '存在与时间', '苏菲的世界',
  '中国地理', '世界地理', '国家地理百科', '美丽中国',
  // 数理科学
  '线性代数', '概率论与数理统计', '高等数学', '离散数学', '数学分析',
  '微积分之屠龙宝刀', '什么是数学', '数学之美', '物理学的进化', '时间简史',
  '果壳中的宇宙', '从一到无穷大', '化学原理', '普通生物学', '天文学概论',
  // 艺术
  '艺术的故事', '美术鉴赏', '音乐欣赏', '设计心理学', '写给大家看的设计书',
  '配色设计原理', '电影艺术', '西方美术史', '中国美术史', '建筑形式语言'
]
const authors = [
  '张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十',
  'John Smith', 'Jane Doe', 'Robert Brown', 'Mary Johnson'
]
const publishers = [
  '人民出版社', '清华大学出版社', '机械工业出版社', '电子工业出版社',
  '北京大学出版社', '中信出版社', '商务印书馆', '上海译文出版社'
]

const insertBook = db.prepare(`
  INSERT INTO books (isbn, title, author, publisher, category_id, publish_date, price, pages,
                     keywords, description, cover_url, total_quantity, available_quantity, status, registration_date)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'normal', date('now'))
`)

const insertBookTransaction = db.transaction((count) => {
  for (let i = 0; i < count; i++) {
    const category = bookCategories[i % bookCategories.length]
    const isbn = `978-7-111-${String(10000 + i).padStart(5, '0')}-${Math.floor(Math.random() * 10)}`
    const title = bookNames[i % bookNames.length] + (i >= bookNames.length ? ` (第${Math.floor(i / bookNames.length) + 1}版)` : '')
    const author = authors[Math.floor(Math.random() * authors.length)]
    const publisher = publishers[Math.floor(Math.random() * publishers.length)]
    const publishDate = `202${Math.floor(Math.random() * 5)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`
    const price = (Math.random() * 150 + 30).toFixed(2)
    const pages = Math.floor(Math.random() * 500) + 100
    const quantity = Math.floor(Math.random() * 5) + 1
    const keywords = `${category.name},${author},热门`
    const description = `这是一本关于${category.name}的优秀图书，由${author}撰写，${publisher}出版。`
    // 30% 的图书有封面URL
    const coverUrl = Math.random() < 0.3 ? `https://picsum.photos/seed/${i}/300/400` : null

    insertBook.run(isbn, title, author, publisher, category.id, publishDate, price, pages,
      keywords, description, coverUrl, quantity, quantity)
  }
})

insertBookTransaction(200)
console.log('✅ 生成了 200 本图书\n')

// 2. 生成读者和用户数据（双向关联）
console.log('👥 生成读者和用户数据...')
const readerCategories = db.prepare('SELECT * FROM reader_categories').all()
const surnames = ['张', '李', '王', '赵', '钱', '孙', '周', '吴', '郑', '冯', '陈', '褚', '卫', '蒋', '沈', '韩', '杨']
const names = ['伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '涛', '明', '超', '娟']
const organizations = ['计算机学院', '软件学院', '数学学院', '物理学院', '文学院', '历史学院', '化学学院', '生命科学学院']

const insertReader = db.prepare(`
  INSERT INTO readers (reader_no, name, category_id, user_id, gender, id_card, organization,
                       phone, email, address, status, registration_date, expiry_date, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', date('now'), date('now', '+1 year'), ?)
`)

const insertUser = db.prepare(`
  INSERT INTO users (username, password, name, role, reader_id, email, phone)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`)

const updateReaderUserId = db.prepare(`
  UPDATE readers SET user_id = ? WHERE id = ?
`)

// 生成读者编号（新格式：T/S + YYYYMMDD + 4位序号）
const generateReaderNo = (categoryCode: string, sequence: number) => {
  const today = new Date()
  const dateStr = today.toISOString().split('T')[0].replace(/-/g, '')
  return `${categoryCode}${dateStr}${sequence.toString().padStart(4, '0')}`
}

const insertReaderAndUserTransaction = db.transaction((count) => {
  let teacherSeq = 1
  let studentSeq = 1

  for (let i = 0; i < count; i++) {
    const category = readerCategories[i % readerCategories.length]
    const isTeacher = category.code === 'TEACHER'
    const isStudent = category.code === 'STUDENT'

    // 根据类别确定用户角色和读者编号前缀
    let role: string
    let readerNoPrefix: string
    let sequence: number

    if (isTeacher) {
      role = 'teacher'
      readerNoPrefix = 'T'
      sequence = teacherSeq++
    } else if (isStudent) {
      role = 'student'
      readerNoPrefix = 'S'
      sequence = studentSeq++
    } else {
      role = 'student' // 其他类别默认为student角色
      readerNoPrefix = 'S'
      sequence = studentSeq++
    }

    const readerNo = generateReaderNo(readerNoPrefix, sequence)
    const name = surnames[Math.floor(Math.random() * surnames.length)] +
                 names[Math.floor(Math.random() * names.length)] +
                 names[Math.floor(Math.random() * names.length)]
    const username = `${role}${String(i + 1).padStart(3, '0')}` // teacher001, student001, etc.
    const password = bcrypt.hashSync('123456', 10) // 默认密码：123456
    const gender = Math.random() > 0.5 ? 'male' : 'female'
    const idCard = `${110101}${1990 + Math.floor(Math.random() * 15)}${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}X`
    const organization = isTeacher ? '教职工' : organizations[Math.floor(Math.random() * organizations.length)]
    const phone = `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`
    const email = `${username}@example.com`
    const address = `北京市海淀区中关村大街${Math.floor(Math.random() * 200) + 1}号`
    const notes = `${category.name}读者`

    // 1. 先创建reader记录（user_id暂时为NULL）
    const readerResult = insertReader.run(
      readerNo, name, category.id, null, gender, idCard, organization,
      phone, email, address, notes
    )
    const readerId = readerResult.lastInsertRowid as number

    // 2. 创建user记录（关联reader_id）
    const userResult = insertUser.run(
      username, password, name, role, readerId, email, phone
    )
    const userId = userResult.lastInsertRowid as number

    // 3. 更新reader记录的user_id（建立双向关联）
    updateReaderUserId.run(userId, readerId)
  }
})

insertReaderAndUserTransaction(50)
console.log('✅ 生成了 50 个读者和用户（双向关联）')
console.log('   - 默认密码: 123456')
console.log('   - 用户名格式: teacher001, student001, etc.\n')

// 3. 生成借阅记录
console.log('📖 生成借阅记录...')
const readers = db.prepare('SELECT * FROM readers').all()
const books = db.prepare('SELECT * FROM books').all()

const insertBorrowing = db.prepare(`
  INSERT INTO borrowing_records (reader_id, book_id, borrow_date, due_date, return_date,
                                  renewal_count, status, fine_amount)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`)

const updateBookQuantity = db.prepare(`
  UPDATE books SET available_quantity = available_quantity - 1 WHERE id = ?
`)

const insertBorrowingTransaction = db.transaction((count) => {
  const usedPairs = new Set()

  for (let i = 0; i < count; i++) {
    // 随机选择读者和图书（确保不重复）
    let reader, book, pairKey
    let attempts = 0
    do {
      reader = readers[Math.floor(Math.random() * readers.length)]
      book = books[Math.floor(Math.random() * books.length)]
      pairKey = `${reader.id}-${book.id}`
      attempts++
      if (attempts > 50) break // 防止死循环
    } while (usedPairs.has(pairKey))

    if (usedPairs.has(pairKey)) continue
    usedPairs.add(pairKey)

    // 获取读者类别信息
    const readerCategory = readerCategories.find(c => c.id === reader.category_id)
    const borrowDays = readerCategory.max_borrow_days

    // 随机生成借阅日期（过去3个月内）
    const daysAgo = Math.floor(Math.random() * 90)
    const borrowDate = new Date()
    borrowDate.setDate(borrowDate.getDate() - daysAgo)
    const borrowDateStr = borrowDate.toISOString().split('T')[0]

    // 计算到期日期
    const dueDate = new Date(borrowDate)
    dueDate.setDate(dueDate.getDate() + borrowDays)
    const dueDateStr = dueDate.toISOString().split('T')[0]

    // 随机决定借阅状态
    const rand = Math.random()
    let status, returnDate, renewalCount, fineAmount

    if (rand < 0.4) {
      // 40% 已还书（正常）
      status = 'returned'
      const returnDay = Math.floor(Math.random() * borrowDays)
      const returnDateObj = new Date(borrowDate)
      returnDateObj.setDate(returnDateObj.getDate() + returnDay)
      returnDate = returnDateObj.toISOString().split('T')[0]
      renewalCount = Math.floor(Math.random() * 2) // 0-1次续借
      fineAmount = 0
    } else if (rand < 0.6) {
      // 20% 已还书（逾期）
      status = 'returned'
      const overdueDays = Math.floor(Math.random() * 15) + 1
      const returnDateObj = new Date(dueDate)
      returnDateObj.setDate(returnDateObj.getDate() + overdueDays)
      returnDate = returnDateObj.toISOString().split('T')[0]
      renewalCount = Math.floor(Math.random() * 3)
      fineAmount = overdueDays * 0.1
    } else if (rand < 0.8) {
      // 20% 借阅中（正常）
      status = 'borrowed'
      returnDate = null
      renewalCount = Math.floor(Math.random() * 2)
      fineAmount = 0
      // 更新图书可借数量
      updateBookQuantity.run(book.id)
    } else {
      // 20% 借阅中（逾期）
      status = 'overdue'
      returnDate = null
      renewalCount = Math.floor(Math.random() * 3)
      const overdueDays = Math.max(0, Math.floor((new Date() - dueDate) / (1000 * 60 * 60 * 24)))
      fineAmount = overdueDays * 0.1
      // 更新图书可借数量
      updateBookQuantity.run(book.id)
    }

    insertBorrowing.run(reader.id, book.id, borrowDateStr, dueDateStr, returnDate,
      renewalCount, status, fineAmount)
  }
})

insertBorrowingTransaction(150)
console.log('✅ 生成了 150 条借阅记录')
console.log('   - 正常归还: ~60 条')
console.log('   - 逾期归还: ~30 条')
console.log('   - 借阅中: ~30 条')
console.log('   - 逾期未还: ~30 条\n')

// 4. 统计信息
console.log('📊 数据统计:')
const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get()
const totalBooks = db.prepare('SELECT COUNT(*) as count FROM books').get()
const totalReaders = db.prepare('SELECT COUNT(*) as count FROM readers').get()
const totalBorrowings = db.prepare('SELECT COUNT(*) as count FROM borrowing_records').get()
const activeBorrowings = db.prepare("SELECT COUNT(*) as count FROM borrowing_records WHERE status = 'borrowed' OR status = 'overdue'").get()
const overdueBorrowings = db.prepare("SELECT COUNT(*) as count FROM borrowing_records WHERE status = 'overdue'").get()
const totalFine = db.prepare('SELECT SUM(fine_amount) as total FROM borrowing_records').get()

console.log(`   用户总数: ${totalUsers.count}`)
console.log(`   图书总数: ${totalBooks.count}`)
console.log(`   读者总数: ${totalReaders.count}`)
console.log(`   借阅记录: ${totalBorrowings.count}`)
console.log(`   进行中: ${activeBorrowings.count}`)
console.log(`   逾期未还: ${overdueBorrowings.count}`)
console.log(`   总罚款: ¥${(totalFine.total || 0).toFixed(2)}`)

console.log('\n✅ 测试数据生成完成！')
console.log('💡 提示: 现在可以重启应用查看生成的数据')

db.close()
process.exit(0)
