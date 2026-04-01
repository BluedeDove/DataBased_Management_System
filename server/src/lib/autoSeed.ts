import Database from 'better-sqlite3'
import * as bcrypt from 'bcryptjs'

/**
 * 仅在以下条件满足时自动填充种子数据：
 * - NODE_ENV=production 或 AUTO_SEED=true
 * - books 表行数为 0
 */
export async function autoSeedIfEmpty(db: Database.Database): Promise<void> {
  const shouldSeed =
    process.env.NODE_ENV === 'production' || process.env.AUTO_SEED === 'true'

  if (!shouldSeed) return

  const bookCount = (db.prepare('SELECT COUNT(*) as count FROM books').get() as { count: number }).count
  if (bookCount > 0) return

  console.log('🌱 检测到空数据库，开始自动填充种子数据...')

  // ── 1. 确保默认账号存在 ──────────────────────────────────────
  const adminExists = db.prepare("SELECT id FROM users WHERE username = 'admin'").get()
  if (!adminExists) {
    const hash = bcrypt.hashSync('admin123', 10)
    db.prepare(`INSERT OR IGNORE INTO users (username, password, name, role, email) VALUES (?, ?, ?, ?, ?)`)
      .run('admin', hash, '系统管理员', 'admin', 'admin@library.com')
  }

  const libExists = db.prepare("SELECT id FROM users WHERE username = 'librarian'").get()
  if (!libExists) {
    const hash = bcrypt.hashSync('lib123', 10)
    db.prepare(`INSERT OR IGNORE INTO users (username, password, name, role, email) VALUES (?, ?, ?, ?, ?)`)
      .run('librarian', hash, '图书管理员', 'librarian', 'librarian@library.com')
  }

  // ── 2. 确保读者类别存在 ──────────────────────────────────────
  const catCount = (db.prepare('SELECT COUNT(*) as count FROM reader_categories').get() as { count: number }).count
  if (catCount === 0) {
    const insertCat = db.prepare(`INSERT OR IGNORE INTO reader_categories (code, name, max_borrow_count, max_borrow_days, validity_days) VALUES (?, ?, ?, ?, ?)`)
    insertCat.run('STUDENT', '学生', 5, 30, 365)
    insertCat.run('TEACHER', '教师', 10, 60, 1095)
    insertCat.run('STAFF', '职工', 8, 45, 730)
  }

  // ── 3. 确保图书类别存在 ──────────────────────────────────────
  const bookCatCount = (db.prepare('SELECT COUNT(*) as count FROM book_categories').get() as { count: number }).count
  if (bookCatCount === 0) {
    const insertBookCat = db.prepare(`INSERT OR IGNORE INTO book_categories (code, name, keywords) VALUES (?, ?, ?)`)
    insertBookCat.run('TP', '计算机科学', '编程,算法,软件,硬件')
    insertBookCat.run('I', '文学', '小说,诗歌,散文,戏剧')
    insertBookCat.run('K', '历史地理', '历史,地理,考古')
    insertBookCat.run('O', '数理科学', '数学,物理,化学')
    insertBookCat.run('J', '艺术', '音乐,美术,设计,摄影')
    insertBookCat.run('F', '经济管理', '经济,管理,金融,会计')
    insertBookCat.run('R', '医学卫生', '医学,药学,卫生,健康')
  }

  // ── 4. 插入 50 本图书 ─────────────────────────────────────────
  const getCatId = (code: string): number => {
    const row = db.prepare('SELECT id FROM book_categories WHERE code = ?').get(code) as { id: number } | undefined
    return row?.id ?? 1
  }

  const books = [
    // 计算机科学
    { isbn: '9787111213826', title: '算法导论（第3版）', author: 'Thomas H. Cormen 等', publisher: '机械工业出版社', catCode: 'TP', year: '2012-12-01', price: 128.0, pages: 780 },
    { isbn: '9787111549987', title: '深入理解计算机系统（第3版）', author: 'Randal E. Bryant', publisher: '机械工业出版社', catCode: 'TP', year: '2016-11-01', price: 139.0, pages: 736 },
    { isbn: '9787115428028', title: 'Python编程：从入门到实践', author: 'Eric Matthes', publisher: '人民邮电出版社', catCode: 'TP', year: '2016-07-01', price: 79.0, pages: 459 },
    { isbn: '9787111641247', title: '设计模式：可复用面向对象软件的基础', author: 'GoF', publisher: '机械工业出版社', catCode: 'TP', year: '2000-09-01', price: 59.0, pages: 395 },
    { isbn: '9787111586128', title: '重构：改善既有代码的设计（第2版）', author: 'Martin Fowler', publisher: '机械工业出版社', catCode: 'TP', year: '2019-04-01', price: 119.0, pages: 448 },
    { isbn: '9787115474889', title: '代码整洁之道', author: 'Robert C. Martin', publisher: '人民邮电出版社', catCode: 'TP', year: '2019-03-01', price: 69.0, pages: 388 },
    { isbn: '9787111642664', title: 'Java核心技术 卷I', author: 'Cay S. Horstmann', publisher: '机械工业出版社', catCode: 'TP', year: '2019-12-01', price: 149.0, pages: 832 },
    { isbn: '9787115539908', title: 'Vue.js设计与实现', author: '霍春阳', publisher: '人民邮电出版社', catCode: 'TP', year: '2022-01-01', price: 99.0, pages: 468 },
    { isbn: '9787111596417', title: '数据库系统概念（第7版）', author: 'Abraham Silberschatz', publisher: '机械工业出版社', catCode: 'TP', year: '2021-03-01', price: 89.0, pages: 836 },
    { isbn: '9787115471208', title: '操作系统三易之门', author: 'Remzi H. Arpaci-Dusseau', publisher: '人民邮电出版社', catCode: 'TP', year: '2019-09-01', price: 89.0, pages: 696 },
    { isbn: '9787111640929', title: '计算机网络（第7版）', author: '谢希仁', publisher: '电子工业出版社', catCode: 'TP', year: '2017-04-01', price: 49.8, pages: 416 },
    { isbn: '9787115558510', title: 'TypeScript编程', author: 'Boris Cherny', publisher: '人民邮电出版社', catCode: 'TP', year: '2020-07-01', price: 89.0, pages: 314 },
    // 文学
    { isbn: '9787020002207', title: '红楼梦', author: '曹雪芹', publisher: '人民文学出版社', catCode: 'I', year: '1996-12-01', price: 59.7, pages: 1606 },
    { isbn: '9787020024759', title: '三国演义', author: '罗贯中', publisher: '人民文学出版社', catCode: 'I', year: '1998-05-01', price: 39.5, pages: 854 },
    { isbn: '9787506365437', title: '平凡的世界（全三册）', author: '路遥', publisher: '作家出版社', catCode: 'I', year: '2012-03-01', price: 68.0, pages: 1200 },
    { isbn: '9787544291200', title: '百年孤独', author: '加西亚·马尔克斯', publisher: '南海出版公司', catCode: 'I', year: '2017-06-01', price: 39.5, pages: 360 },
    { isbn: '9787544291217', title: '活着', author: '余华', publisher: '作家出版社', catCode: 'I', year: '2012-08-01', price: 28.0, pages: 191 },
    { isbn: '9787532775842', title: '围城', author: '钱钟书', publisher: '上海文艺出版社', catCode: 'I', year: '2019-01-01', price: 45.0, pages: 368 },
    { isbn: '9787020108497', title: '哈利·波特与魔法石', author: 'J.K.罗琳', publisher: '人民文学出版社', catCode: 'I', year: '2000-09-01', price: 29.0, pages: 371 },
    { isbn: '9787532762033', title: '追风筝的人', author: '卡勒德·胡赛尼', publisher: '上海人民出版社', catCode: 'I', year: '2006-05-01', price: 29.0, pages: 363 },
    // 历史地理
    { isbn: '9787101060867', title: '史记（全十册）', author: '司马迁', publisher: '中华书局', catCode: 'K', year: '2013-03-01', price: 248.0, pages: 3322 },
    { isbn: '9787108027559', title: '万历十五年', author: '黄仁宇', publisher: '三联书店', catCode: 'K', year: '2006-05-01', price: 28.0, pages: 271 },
    { isbn: '9787300105581', title: '人类简史', author: '尤瓦尔·赫拉利', publisher: '中信出版社', catCode: 'K', year: '2014-11-01', price: 68.0, pages: 440 },
    { isbn: '9787559619907', title: '文明、现代化、价值投资与中国', author: '李录', publisher: '北京联合出版公司', catCode: 'K', year: '2020-06-01', price: 78.0, pages: 448 },
    { isbn: '9787101061031', title: '资治通鉴（全二十册）', author: '司马光', publisher: '中华书局', catCode: 'K', year: '2011-10-01', price: 680.0, pages: 9856 },
    // 数理科学
    { isbn: '9787040396638', title: '线性代数（第六版）', author: '同济大学数学系', publisher: '高等教育出版社', catCode: 'O', year: '2014-06-01', price: 33.0, pages: 306 },
    { isbn: '9787040212402', title: '高等数学（第七版 上册）', author: '同济大学数学系', publisher: '高等教育出版社', catCode: 'O', year: '2014-06-01', price: 38.0, pages: 370 },
    { isbn: '9787040212419', title: '高等数学（第七版 下册）', author: '同济大学数学系', publisher: '高等教育出版社', catCode: 'O', year: '2014-06-01', price: 34.0, pages: 333 },
    { isbn: '9787040396645', title: '概率论与数理统计（第四版）', author: '浙大盛骤等', publisher: '高等教育出版社', catCode: 'O', year: '2012-03-01', price: 35.0, pages: 401 },
    { isbn: '9787519267919', title: '普通物理学（第七版）', author: '马文蔚', publisher: '高等教育出版社', catCode: 'O', year: '2019-07-01', price: 48.0, pages: 472 },
    // 艺术
    { isbn: '9787549554447', title: '写给大家的西方美术史', author: '蒋勋', publisher: '广西师范大学出版社', catCode: 'J', year: '2015-04-01', price: 88.0, pages: 468 },
    { isbn: '9787547742143', title: '艺术的故事', author: 'E.H.贡布里希', publisher: '广西美术出版社', catCode: 'J', year: '2008-04-01', price: 168.0, pages: 692 },
    { isbn: '9787549554454', title: '蒋勋说红楼梦（全八册）', author: '蒋勋', publisher: '广西师范大学出版社', catCode: 'J', year: '2014-01-01', price: 268.0, pages: 2400 },
    // 经济管理
    { isbn: '9787508647357', title: '原则', author: '瑞·达利欧', publisher: '中信出版社', catCode: 'F', year: '2018-01-01', price: 98.0, pages: 576 },
    { isbn: '9787521715279', title: '聪明的投资者', author: '本杰明·格雷厄姆', publisher: '中国人民大学出版社', catCode: 'F', year: '2021-06-01', price: 69.0, pages: 672 },
    { isbn: '9787508678108', title: '从0到1', author: '彼得·蒂尔', publisher: '中信出版社', catCode: 'F', year: '2015-01-01', price: 42.0, pages: 236 },
    { isbn: '9787508683058', title: '精益创业', author: 'Eric Ries', publisher: '中信出版社', catCode: 'F', year: '2012-08-01', price: 42.0, pages: 280 },
    { isbn: '9787508657660', title: '思考，快与慢', author: '丹尼尔·卡尼曼', publisher: '中信出版社', catCode: 'F', year: '2012-07-01', price: 69.0, pages: 474 },
    { isbn: '9787508696041', title: '纳瓦尔宝典', author: '埃里克·乔根森', publisher: '中信出版社', catCode: 'F', year: '2021-10-01', price: 58.0, pages: 256 },
    { isbn: '9787508695594', title: '穷查理宝典', author: '彼得·考夫曼', publisher: '中信出版社', catCode: 'F', year: '2016-07-01', price: 128.0, pages: 472 },
    { isbn: '9787508600024', title: '经济学原理（第七版）微观', author: 'N·格里高利·曼昆', publisher: '北京大学出版社', catCode: 'F', year: '2015-01-01', price: 75.0, pages: 514 },
    // 医学卫生
    { isbn: '9787117119054', title: '内科学（第8版）', author: '葛均波 徐永健', publisher: '人民卫生出版社', catCode: 'R', year: '2013-07-01', price: 98.0, pages: 942 },
    { isbn: '9787117247511', title: '外科学（第9版）', author: '陈孝平 汪建平', publisher: '人民卫生出版社', catCode: 'R', year: '2018-08-01', price: 108.0, pages: 832 },
    { isbn: '9787115556240', title: '运动改造大脑', author: 'John J. Ratey', publisher: '人民邮电出版社', catCode: 'R', year: '2020-05-01', price: 59.0, pages: 304 },
    { isbn: '9787115568021', title: '最好的告别', author: 'Atul Gawande', publisher: '人民邮电出版社', catCode: 'R', year: '2015-11-01', price: 42.0, pages: 300 },
    // 补充计算机
    { isbn: '9787115569691', title: 'Node.js设计模式（第三版）', author: 'Mario Casciaro', publisher: '人民邮电出版社', catCode: 'TP', year: '2021-06-01', price: 109.0, pages: 660 },
    { isbn: '9787111615637', title: '微服务架构设计模式', author: 'Chris Richardson', publisher: '机械工业出版社', catCode: 'TP', year: '2019-05-01', price: 139.0, pages: 492 },
    { isbn: '9787115565150', title: 'Docker技术入门与实战（第3版）', author: '杨保华 戴王剑 曹亚仑', publisher: '人民邮电出版社', catCode: 'TP', year: '2018-12-01', price: 79.0, pages: 416 },
    { isbn: '9787111689218', title: 'Kubernetes权威指南（第5版）', author: '龚正 吴治辉 等', publisher: '机械工业出版社', catCode: 'TP', year: '2021-11-01', price: 148.0, pages: 728 },
  ]

  const insertBook = db.prepare(`
    INSERT OR IGNORE INTO books
      (isbn, title, category_id, author, publisher, publish_date, price, pages, total_quantity, available_quantity)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertMany = db.transaction(() => {
    for (const b of books) {
      const qty = Math.floor(Math.random() * 4) + 1
      insertBook.run(b.isbn, b.title, getCatId(b.catCode), b.author, b.publisher, b.year, b.price, b.pages, qty, qty)
    }
  })
  insertMany()

  // ── 5. 插入 20 个读者 ─────────────────────────────────────────
  const getReaderCatId = (code: string): number => {
    const row = db.prepare('SELECT id FROM reader_categories WHERE code = ?').get(code) as { id: number } | undefined
    return row?.id ?? 1
  }

  const readers = [
    { no: 'R2024001', name: '张伟', catCode: 'STUDENT', gender: 'male', phone: '13800138001', org: '计算机科学学院' },
    { no: 'R2024002', name: '王芳', catCode: 'STUDENT', gender: 'female', phone: '13800138002', org: '计算机科学学院' },
    { no: 'R2024003', name: '李娜', catCode: 'STUDENT', gender: 'female', phone: '13800138003', org: '数学系' },
    { no: 'R2024004', name: '刘洋', catCode: 'STUDENT', gender: 'male', phone: '13800138004', org: '物理系' },
    { no: 'R2024005', name: '陈静', catCode: 'STUDENT', gender: 'female', phone: '13800138005', org: '文学院' },
    { no: 'R2024006', name: '杨光', catCode: 'STUDENT', gender: 'male', phone: '13800138006', org: '经济管理学院' },
    { no: 'R2024007', name: '赵敏', catCode: 'STUDENT', gender: 'female', phone: '13800138007', org: '医学院' },
    { no: 'R2024008', name: '孙强', catCode: 'STUDENT', gender: 'male', phone: '13800138008', org: '计算机科学学院' },
    { no: 'R2024009', name: '周梅', catCode: 'STUDENT', gender: 'female', phone: '13800138009', org: '艺术学院' },
    { no: 'R2024010', name: '吴浩', catCode: 'STUDENT', gender: 'male', phone: '13800138010', org: '历史系' },
    { no: 'R2024011', name: '郑华', catCode: 'TEACHER', gender: 'male', phone: '13800138011', org: '计算机科学学院' },
    { no: 'R2024012', name: '冯丽', catCode: 'TEACHER', gender: 'female', phone: '13800138012', org: '数学系' },
    { no: 'R2024013', name: '徐磊', catCode: 'TEACHER', gender: 'male', phone: '13800138013', org: '物理系' },
    { no: 'R2024014', name: '谢琳', catCode: 'TEACHER', gender: 'female', phone: '13800138014', org: '文学院' },
    { no: 'R2024015', name: '韩志', catCode: 'TEACHER', gender: 'male', phone: '13800138015', org: '经济管理学院' },
    { no: 'R2024016', name: '唐雪', catCode: 'STAFF', gender: 'female', phone: '13800138016', org: '图书馆' },
    { no: 'R2024017', name: '曹勇', catCode: 'STAFF', gender: 'male', phone: '13800138017', org: '行政处' },
    { no: 'R2024018', name: '彭晓', catCode: 'STUDENT', gender: 'female', phone: '13800138018', org: '医学院' },
    { no: 'R2024019', name: '蒋俊', catCode: 'STUDENT', gender: 'male', phone: '13800138019', org: '艺术学院' },
    { no: 'R2024020', name: '邓颖', catCode: 'STUDENT', gender: 'female', phone: '13800138020', org: '历史系' },
  ]

  const insertReader = db.prepare(`
    INSERT OR IGNORE INTO readers
      (reader_no, name, category_id, gender, phone, organization, registration_date, expiry_date, status)
    VALUES (?, ?, ?, ?, ?, ?, date('now'), date('now', '+365 days'), 'active')
  `)

  const insertReaders = db.transaction(() => {
    for (const r of readers) {
      insertReader.run(r.no, r.name, getReaderCatId(r.catCode), r.gender, r.phone, r.org)
    }
  })
  insertReaders()

  // ── 6. 插入若干借阅记录（含在借、已还、逾期样本）────────────
  const bookIds = (db.prepare('SELECT id, available_quantity, total_quantity FROM books LIMIT 30').all() as { id: number; available_quantity: number; total_quantity: number }[])
  const readerIds = (db.prepare('SELECT id FROM readers').all() as { id: number }[])

  if (bookIds.length > 0 && readerIds.length > 0) {
    const insertBorrow = db.prepare(`
      INSERT OR IGNORE INTO borrowing_records
        (reader_id, book_id, borrow_date, due_date, return_date, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    const updateQty = db.prepare(`UPDATE books SET available_quantity = available_quantity - 1 WHERE id = ? AND available_quantity > 0`)

    const insertBorrows = db.transaction(() => {
      // 已还（10条）
      for (let i = 0; i < 10 && i < bookIds.length; i++) {
        const daysAgo = 20 + i * 3
        const borrowDate = offsetDate(-daysAgo)
        const dueDate = offsetDate(-daysAgo + 30)
        const returnDate = offsetDate(-daysAgo + 15)
        insertBorrow.run(readerIds[i % readerIds.length].id, bookIds[i].id, borrowDate, dueDate, returnDate, 'returned')
      }
      // 在借（8条）
      for (let i = 10; i < 18 && i < bookIds.length; i++) {
        const daysAgo = 5 + (i - 10) * 2
        const borrowDate = offsetDate(-daysAgo)
        const dueDate = offsetDate(-daysAgo + 30)
        insertBorrow.run(readerIds[i % readerIds.length].id, bookIds[i].id, borrowDate, dueDate, null, 'borrowed')
        updateQty.run(bookIds[i].id)
      }
      // 逾期（3条）
      for (let i = 18; i < 21 && i < bookIds.length; i++) {
        const daysAgo = 50 + (i - 18) * 10
        const borrowDate = offsetDate(-daysAgo)
        const dueDate = offsetDate(-daysAgo + 30)
        insertBorrow.run(readerIds[i % readerIds.length].id, bookIds[i].id, borrowDate, dueDate, null, 'overdue')
        updateQty.run(bookIds[i].id)
      }
    })
    insertBorrows()
  }

  console.log(`✅ 自动种子数据填充完成：${books.length} 本书、${readers.length} 个读者`)
}

function offsetDate(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}
