/**
 * 借阅记录生成器
 */

import { SeededRandom } from '../utils/random-utils'

export interface GeneratedBorrowing {
  reader_id: number
  book_id: number
  borrow_date: string
  due_date: string
  return_date: string | null
  renewal_count: number
  status: string
  fine_amount: number
}

export interface BorrowingGeneratorOptions {
  count: number
  readers: Array<{ id: number }>
  books: Array<{ id: number; price?: number }>
  readerCategories: Array<{ id: number; code: string; max_borrow_days?: number }>
  rng?: SeededRandom
}

// 借阅状态分布
const STATUS_DISTRIBUTION = {
  returned: 0.40,      // 正常归还 40%
  overdue_returned: 0.20, // 逾期归还 20%
  borrowed: 0.25,      // 借阅中 25%
  overdue: 0.10,       // 逾期未还 10%
  lost: 0.05           // 丢失 5%
}

/**
 * 生成借阅记录
 */
export function generateBorrowings(options: BorrowingGeneratorOptions): GeneratedBorrowing[] {
  const {
    count,
    readers,
    books,
    readerCategories,
    rng = new SeededRandom(Date.now())
  } = options

  const borrowings: GeneratedBorrowing[] = []
  const usedPairs = new Set<string>()

  // 跟踪每本书的可用数量
  const bookAvailability = new Map<number, number>()
  for (const book of books) {
    bookAvailability.set(book.id, 10) // 假设每本书初始有10本
  }

  for (let i = 0; i < count; i++) {
    // 随机选择读者和图书
    let reader = readers[randomInt(0, readers.length - 1, rng)]
    let book = books[randomInt(0, books.length - 1, rng)]
    let pairKey = `${reader.id}-${book.id}`
    let attempts = 0

    // 避免重复借阅
    while (usedPairs.has(pairKey) && attempts < 50) {
      reader = readers[randomInt(0, readers.length - 1, rng)]
      book = books[randomInt(0, books.length - 1, rng)]
      pairKey = `${reader.id}-${book.id}`
      attempts++
    }

    if (usedPairs.has(pairKey)) continue
    usedPairs.add(pairKey)

    // 获取读者的借阅天数限制
    const readerCategory = readerCategories.find(c => c.id === (reader as any).category_id)
    const borrowDays = readerCategory?.max_borrow_days || 30

    // 生成借阅日期（最近180天内）
    const daysAgo = randomInt(1, 180, rng)
    const borrowDate = new Date()
    borrowDate.setDate(borrowDate.getDate() - daysAgo)
    const borrowDateStr = borrowDate.toISOString().split('T')[0]

    // 生成应还日期
    const dueDate = new Date(borrowDate)
    dueDate.setDate(dueDate.getDate() + borrowDays)
    const dueDateStr = dueDate.toISOString().split('T')[0]

    // 根据分布确定状态
    const statusRand = rng.next()
    let status: string
    let returnDate: string | null = null
    let renewalCount = 0
    let fineAmount = 0

    if (statusRand < STATUS_DISTRIBUTION.returned) {
      // 正常归还
      status = 'returned'
      const returnDay = randomInt(1, borrowDays, rng)
      const returnDateObj = new Date(borrowDate)
      returnDateObj.setDate(returnDateObj.getDate() + returnDay)
      returnDate = returnDateObj.toISOString().split('T')[0]
      renewalCount = randomInt(0, 2, rng)
    } else if (statusRand < STATUS_DISTRIBUTION.returned + STATUS_DISTRIBUTION.overdue_returned) {
      // 逾期归还
      status = 'returned'
      const overdueDays = randomInt(1, 15, rng)
      const returnDateObj = new Date(dueDate)
      returnDateObj.setDate(returnDateObj.getDate() + overdueDays)
      returnDate = returnDateObj.toISOString().split('T')[0]
      renewalCount = randomInt(0, 3, rng)
      fineAmount = overdueDays * 0.1
    } else if (statusRand < STATUS_DISTRIBUTION.returned + STATUS_DISTRIBUTION.overdue_returned + STATUS_DISTRIBUTION.borrowed) {
      // 借阅中
      status = 'borrowed'
      returnDate = null
      renewalCount = randomInt(0, 2, rng)
      // 更新库存
      const available = bookAvailability.get(book.id) || 0
      if (available > 0) {
        bookAvailability.set(book.id, available - 1)
      }
    } else if (statusRand < STATUS_DISTRIBUTION.returned + STATUS_DISTRIBUTION.overdue_returned + STATUS_DISTRIBUTION.borrowed + STATUS_DISTRIBUTION.overdue) {
      // 逾期未还
      status = 'overdue'
      returnDate = null
      renewalCount = randomInt(0, 3, rng)
      const overdueDays = Math.max(1, Math.floor((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)))
      fineAmount = overdueDays * 0.1
      // 更新库存
      const available = bookAvailability.get(book.id) || 0
      if (available > 0) {
        bookAvailability.set(book.id, available - 1)
      }
    } else {
      // 丢失
      status = 'lost'
      returnDate = null
      renewalCount = 0
      fineAmount = (book as any).price || 50
      // 更新库存
      const available = bookAvailability.get(book.id) || 0
      if (available > 0) {
        bookAvailability.set(book.id, available - 1)
      }
    }

    borrowings.push({
      reader_id: reader.id,
      book_id: book.id,
      borrow_date: borrowDateStr,
      due_date: dueDateStr,
      return_date: returnDate,
      renewal_count: renewalCount,
      status,
      fine_amount: fineAmount
    })
  }

  return borrowings
}

/**
 * 辅助函数：带种子的随机整数
 */
function randomInt(min: number, max: number, rng?: SeededRandom): number {
  if (rng) {
    return rng.nextInt(min, max)
  }
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * 生成达到借阅上限的读者（边界测试用）
 */
export function generateMaxBorrowingReaders(
  readers: Array<{ id: number; category_id?: number }>,
  books: Array<{ id: number; price?: number }>,
  readerCategories: Array<{ id: number; code: string; max_borrow_count?: number; max_borrow_days?: number }>,
  count: number,
  rng: SeededRandom = new SeededRandom(Date.now())
): { readers: typeof readers; borrowings: GeneratedBorrowing[] } {
  const selectedReaders = readers.slice(0, Math.min(count, readers.length))
  const borrowings: GeneratedBorrowing[] = []

  for (const reader of selectedReaders) {
    const category = readerCategories.find(c => c.id === reader.category_id)
    const maxCount = category?.max_borrow_count || 5

    // 为该读者生成最大借阅数量的记录
    for (let i = 0; i < maxCount; i++) {
      const book = books[randomInt(0, books.length - 1, rng)]
      const borrowDate = new Date()
      borrowDate.setDate(borrowDate.getDate() - randomInt(1, 7, rng))
      const dueDate = new Date(borrowDate)
      dueDate.setDate(dueDate.getDate() + (category?.max_borrow_days || 30))

      borrowings.push({
        reader_id: reader.id,
        book_id: book.id,
        borrow_date: borrowDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        return_date: null,
        renewal_count: 0,
        status: 'borrowed',
        fine_amount: 0
      })
    }
  }

  return { readers: selectedReaders, borrowings }
}

/**
 * 生成长期逾期记录（边界测试用）
 */
export function generateLongOverdueBorrowings(
  readers: Array<{ id: number }>,
  books: Array<{ id: number; price?: number }>,
  count: number,
  rng: SeededRandom = new SeededRandom(Date.now())
): GeneratedBorrowing[] {
  const borrowings: GeneratedBorrowing[] = []

  for (let i = 0; i < count; i++) {
    const reader = readers[randomInt(0, readers.length - 1, rng)]
    const book = books[randomInt(0, books.length - 1, rng)]

    // 生成30-120天前的借阅
    const daysAgo = randomInt(30, 120, rng)
    const borrowDate = new Date()
    borrowDate.setDate(borrowDate.getDate() - daysAgo)
    const dueDate = new Date(borrowDate)
    dueDate.setDate(dueDate.getDate() + 30) // 30天借阅期

    const overdueDays = Math.max(1, Math.floor((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)))

    borrowings.push({
      reader_id: reader.id,
      book_id: book.id,
      borrow_date: borrowDate.toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      return_date: null,
      renewal_count: randomInt(0, 3, rng),
      status: 'overdue',
      fine_amount: overdueDays * 0.1
    })
  }

  return borrowings
}

/**
 * 生成高额罚款记录（边界测试用）
 */
export function generateHighFineBorrowings(
  readers: Array<{ id: number }>,
  books: Array<{ id: number; price?: number }>,
  count: number,
  rng: SeededRandom = new SeededRandom(Date.now())
): GeneratedBorrowing[] {
  const borrowings: GeneratedBorrowing[] = []

  for (let i = 0; i < count; i++) {
    const reader = readers[randomInt(0, readers.length - 1, rng)]
    const book = books[randomInt(0, books.length - 1, rng)]

    // 生成60-90天前借阅，严重逾期
    const daysAgo = randomInt(60, 90, rng)
    const borrowDate = new Date()
    borrowDate.setDate(borrowDate.getDate() - daysAgo)
    const dueDate = new Date(borrowDate)
    dueDate.setDate(dueDate.getDate() + 30)

    // 逾期30-60天，罚款6-12元
    const overdueDays = randomInt(60, 120, rng)

    borrowings.push({
      reader_id: reader.id,
      book_id: book.id,
      borrow_date: borrowDate.toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      return_date: null,
      renewal_count: randomInt(0, 5, rng),
      status: 'overdue',
      fine_amount: overdueDays * 0.1 // 6-12元
    })
  }

  return borrowings
}

/**
 * 生成多次续借记录（边界测试用）
 */
export function generateMultipleRenewalBorrowings(
  readers: Array<{ id: number }>,
  books: Array<{ id: number; price?: number }>,
  count: number,
  rng: SeededRandom = new SeededRandom(Date.now())
): GeneratedBorrowing[] {
  const borrowings: GeneratedBorrowing[] = []

  for (let i = 0; i < count; i++) {
    const reader = readers[randomInt(0, readers.length - 1, rng)]
    const book = books[randomInt(0, books.length - 1, rng)]

    // 生成较早的借阅记录
    const daysAgo = randomInt(60, 90, rng)
    const borrowDate = new Date()
    borrowDate.setDate(borrowDate.getDate() - daysAgo)
    const dueDate = new Date(borrowDate)
    dueDate.setDate(dueDate.getDate() + 30 * (randomInt(2, 5, rng))) // 每次续借延长30天

    borrowings.push({
      reader_id: reader.id,
      book_id: book.id,
      borrow_date: borrowDate.toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      return_date: null,
      renewal_count: randomInt(2, 5, rng),
      status: 'borrowed',
      fine_amount: 0
    })
  }

  return borrowings
}
