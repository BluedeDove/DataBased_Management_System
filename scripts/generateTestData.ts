import Database from 'better-sqlite3'
import path from 'path'
import { existsSync, mkdirSync } from 'fs'
import os from 'os'

// 获取数据库路径（兼容独立运行和 Electron 环境）
const userDataPath = process.env.APPDATA
  ? path.join(process.env.APPDATA, 'electron-smart-library')
  : path.join(os.homedir(), '.electron-smart-library')

if (!existsSync(userDataPath)) {
  mkdirSync(userDataPath, { recursive: true })
}
const dbPath = path.join(userDataPath, 'library.db')
const db = new Database(dbPath)

console.log('📊 开始生成测试数据...\n')

// 清理现有测试数据（保留配置数据）
console.log('🧹 清理现有数据...')
db.exec('DELETE FROM borrowing_records')
db.exec('DELETE FROM books WHERE id > 0')
db.exec('DELETE FROM readers WHERE id > 0')
console.log('✅ 清理完成\n')

// 1. 生成图书数据
console.log('📚 生成图书数据...')
const bookCategories = db.prepare('SELECT * FROM book_categories').all()
const bookNames = [
  '深入理解计算机系统', 'JavaScript高级程序设计', 'Python编程从入门到实践', 'Java核心技术',
  '算法导论', '设计模式', '重构', '代码大全', '人工智能导论', '机器学习实战',
  '平凡的世界', '活着', '围城', '白夜行', '百年孤独', '追风筝的人', '三体', '1984',
  '中国通史', '明朝那些事儿', '万历十五年', '人类简史', '未来简史', '全球通史',
  '线性代数', '概率论与数理统计', '高等数学', '离散数学', '数学分析',
  '艺术的故事', '美术鉴赏', '音乐欣赏', '设计心理学'
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
                     keywords, description, total_quantity, available_quantity, status, registration_date)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'normal', date('now'))
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

    insertBook.run(isbn, title, author, publisher, category.id, publishDate, price, pages,
      keywords, description, quantity, quantity)
  }
})

insertBookTransaction(100)
console.log('✅ 生成了 100 本图书\n')

// 2. 生成读者数据
console.log('👥 生成读者数据...')
const readerCategories = db.prepare('SELECT * FROM reader_categories').all()
const surnames = ['张', '李', '王', '赵', '钱', '孙', '周', '吴', '郑', '冯', '陈', '褚', '卫', '蒋', '沈', '韩', '杨']
const names = ['伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '涛', '明', '超', '娟']

const insertReader = db.prepare(`
  INSERT INTO readers (reader_no, name, category_id, gender, phone, email, address, status,
                       registration_date, expiry_date, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, 'active', date('now'), date('now', '+1 year'), ?)
`)

const insertReaderTransaction = db.transaction((count) => {
  for (let i = 0; i < count; i++) {
    const category = readerCategories[i % readerCategories.length]
    const readerNo = category.code + String(100001 + i).padStart(6, '0')
    const name = surnames[Math.floor(Math.random() * surnames.length)] +
                 names[Math.floor(Math.random() * names.length)] +
                 names[Math.floor(Math.random() * names.length)]
    const gender = Math.random() > 0.5 ? 'male' : 'female'
    const phone = `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`
    const email = `reader${i + 1}@example.com`
    const address = `北京市海淀区中关村大街${Math.floor(Math.random() * 200) + 1}号`
    const notes = `${category.name}读者`

    insertReader.run(readerNo, name, category.id, gender, phone, email, address, notes)
  }
})

insertReaderTransaction(50)
console.log('✅ 生成了 50 个读者\n')

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
const totalBooks = db.prepare('SELECT COUNT(*) as count FROM books').get()
const totalReaders = db.prepare('SELECT COUNT(*) as count FROM readers').get()
const totalBorrowings = db.prepare('SELECT COUNT(*) as count FROM borrowing_records').get()
const activeBorrowings = db.prepare("SELECT COUNT(*) as count FROM borrowing_records WHERE status = 'borrowed' OR status = 'overdue'").get()
const overdueBorrowings = db.prepare("SELECT COUNT(*) as count FROM borrowing_records WHERE status = 'overdue'").get()
const totalFine = db.prepare('SELECT SUM(fine_amount) as total FROM borrowing_records').get()

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
