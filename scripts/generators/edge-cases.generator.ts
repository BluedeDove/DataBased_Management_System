/**
 * 边界测试数据生成器
 * 生成各种边界场景的测试数据
 */

import { GeneratedReader } from './reader.generator'
import { GeneratedBook } from './book.generator'
import { GeneratedBorrowing, generateLongOverdueBorrowings, generateHighFineBorrowings, generateMultipleRenewalBorrowings, generateMaxBorrowingReaders } from './borrowing.generator'
import { SeededRandom } from '../utils/random-utils'

export interface EdgeCasesConfig {
  // 达到借阅上限的读者数量
  maxBorrowingReaders: number
  // 即将过期的读者证数量
  expiringReaders: number
  // 库存为0的图书数量
  zeroStockBooks: number
  // 损坏/丢失的图书数量
  damagedBooks: number
  // 长期逾期记录数量
  longOverdueRecords: number
  // 高额罚款记录数量
  highFineRecords: number
  // 多次续借记录数量
  multipleRenewalRecords: number
  // 字段缺失的读者数量
  emptyFieldReaders: number
  // status=suspended 的读者数量
  suspendedReaders: number
  // status=expired（真正过期）的读者数量
  expiredReaders: number
  // status=pending 的读者数量
  pendingReaders: number
  // 热门书被多人同时借的数量
  hotBookBorrowings: number
  // 同一读者反复借同一本书的数量
  sameReaderRepeatBorrows: number
}

export interface GeneratedEdgeCases {
  // 修改后的读者列表（包含即将过期的）
  readers: Array<GeneratedReader & { id: number }>
  // 修改后的图书列表（包含库存为0和损坏的）
  books: Array<GeneratedBook & { id: number }>
  // 额外的借阅记录
  borrowings: GeneratedBorrowing[]
  // 统计信息
  stats: {
    maxBorrowingReaders: number
    expiringReaders: number
    zeroStockBooks: number
    damagedBooks: number
    longOverdueRecords: number
    highFineRecords: number
    multipleRenewalRecords: number
    emptyFieldReaders: number
    suspendedReaders: number
    expiredReaders: number
    pendingReaders: number
    hotBookBorrowings: number
    sameReaderRepeatBorrows: number
  }
}

/**
 * 默认边界配置
 */
export const DEFAULT_EDGE_CASES_CONFIG: EdgeCasesConfig = {
  maxBorrowingReaders: 5,
  expiringReaders: 5,
  zeroStockBooks: 10,
  damagedBooks: 5,
  longOverdueRecords: 15,
  highFineRecords: 10,
  multipleRenewalRecords: 20,
  emptyFieldReaders: 5,
  suspendedReaders: 3,
  expiredReaders: 5,
  pendingReaders: 3,
  hotBookBorrowings: 10,
  sameReaderRepeatBorrows: 8
}

/**
 * 生成边界测试数据
 */
export function generateEdgeCases(
  readers: Array<GeneratedReader & { id: number }>,
  books: Array<GeneratedBook & { id: number }>,
  readerCategories: Array<{ id: number; code: string; max_borrow_count?: number; max_borrow_days?: number }>,
  config: EdgeCasesConfig = DEFAULT_EDGE_CASES_CONFIG,
  rng: SeededRandom = new SeededRandom(Date.now())
): GeneratedEdgeCases {
  const modifiedReaders = [...readers]
  const modifiedBooks = [...books]
  const allBorrowings: GeneratedBorrowing[] = []

  // 1. 生成达到借阅上限的读者
  if (config.maxBorrowingReaders > 0 && readers.length >= config.maxBorrowingReaders) {
    const { readers: maxBorrowReaders, borrowings: maxBorrowings } = generateMaxBorrowingReaders(
      modifiedReaders,
      modifiedBooks,
      readerCategories,
      config.maxBorrowingReaders,
      rng
    )
    allBorrowings.push(...maxBorrowings)

    console.log(`  📚 生成 ${config.maxBorrowingReaders} 个达到借阅上限的读者`)
  }

  // 2. 生成即将过期的读者证
  if (config.expiringReaders > 0 && modifiedReaders.length >= config.expiringReaders) {
    const shuffled = [...modifiedReaders].sort(() => rng.next() - 0.5)
    for (let i = 0; i < config.expiringReaders; i++) {
      const daysUntilExpiry = Math.floor(rng.next() * 30) + 1
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + daysUntilExpiry)
      shuffled[i].expiry_date = expiryDate.toISOString().split('T')[0]
    }
    console.log(`  ⏰ 生成 ${config.expiringReaders} 个即将过期的读者证`)
  }

  // 3. 生成库存为0的图书
  if (config.zeroStockBooks > 0 && modifiedBooks.length >= config.zeroStockBooks) {
    const shuffled = [...modifiedBooks].sort(() => rng.next() - 0.5)
    for (let i = 0; i < config.zeroStockBooks; i++) {
      shuffled[i].total_quantity = 3
      shuffled[i].available_quantity = 0
    }
    console.log(`  📕 生成 ${config.zeroStockBooks} 本库存为0的图书`)
  }

  // 4. 生成损坏/丢失的图书
  if (config.damagedBooks > 0 && modifiedBooks.length >= config.damagedBooks) {
    const shuffled = [...modifiedBooks].sort(() => rng.next() - 0.5)
    for (let i = 0; i < config.damagedBooks; i++) {
      shuffled[i].status = rng.next() < 0.5 ? 'damaged' : 'lost'
    }
    console.log(`  🔧 生成 ${config.damagedBooks} 本损坏/丢失的图书`)
  }

  // 5. 生成长期逾期记录
  if (config.longOverdueRecords > 0) {
    const longOverdue = generateLongOverdueBorrowings(
      modifiedReaders,
      modifiedBooks,
      config.longOverdueRecords,
      rng
    )
    allBorrowings.push(...longOverdue)
    console.log(`  ⚠️ 生成 ${config.longOverdueRecords} 条长期逾期记录`)
  }

  // 6. 生成高额罚款记录
  if (config.highFineRecords > 0) {
    const highFine = generateHighFineBorrowings(
      modifiedReaders,
      modifiedBooks,
      config.highFineRecords,
      rng
    )
    allBorrowings.push(...highFine)
    console.log(`  💰 生成 ${config.highFineRecords} 条高额罚款记录`)
  }

  // 7. 生成多次续借记录
  if (config.multipleRenewalRecords > 0) {
    const multipleRenewal = generateMultipleRenewalBorrowings(
      modifiedReaders,
      modifiedBooks,
      config.multipleRenewalRecords,
      rng
    )
    allBorrowings.push(...multipleRenewal)
    console.log(`  🔄 生成 ${config.multipleRenewalRecords} 条多次续借记录`)
  }

  // 8. 生成字段缺失的读者
  if (config.emptyFieldReaders > 0 && modifiedReaders.length >= config.emptyFieldReaders) {
    const shuffled = [...modifiedReaders].sort(() => rng.next() - 0.5)
    for (let i = 0; i < config.emptyFieldReaders; i++) {
      // 随机清空 1-2 个可选字段
      const fieldsToEmpty: Array<'phone' | 'email' | 'address' | 'notes'> = ['phone', 'email', 'address', 'notes']
      const count = rng.nextInt(1, 2)
      const shuffledFields = fieldsToEmpty.sort(() => rng.next() - 0.5)
      for (let f = 0; f < count; f++) {
        shuffled[i][shuffledFields[f]] = ''
      }
    }
    console.log(`  📝 生成 ${config.emptyFieldReaders} 个字段缺失的读者`)
  }

  // 9. 生成 status=suspended 的读者
  if (config.suspendedReaders > 0 && modifiedReaders.length >= config.suspendedReaders) {
    const shuffled = [...modifiedReaders].sort(() => rng.next() - 0.5)
    for (let i = 0; i < config.suspendedReaders; i++) {
      shuffled[i].status = 'suspended'
    }
    console.log(`  🚫 生成 ${config.suspendedReaders} 个 suspended 读者`)
  }

  // 10. 生成 status=expired 的读者（真正过期）
  if (config.expiredReaders > 0 && modifiedReaders.length >= config.expiredReaders) {
    const shuffled = [...modifiedReaders].sort(() => rng.next() - 0.5)
    for (let i = 0; i < config.expiredReaders; i++) {
      shuffled[i].status = 'expired'
      // 确保过期日期在过去
      const daysAgo = rng.nextInt(30, 365)
      const expDate = new Date()
      expDate.setDate(expDate.getDate() - daysAgo)
      shuffled[i].expiry_date = expDate.toISOString().split('T')[0]
    }
    console.log(`  ⏰ 生成 ${config.expiredReaders} 个真正过期的读者`)
  }

  // 11. 生成 status=pending 的读者
  if (config.pendingReaders > 0 && modifiedReaders.length >= config.pendingReaders) {
    const shuffled = [...modifiedReaders].sort(() => rng.next() - 0.5)
    for (let i = 0; i < config.pendingReaders; i++) {
      shuffled[i].status = 'pending'
    }
    console.log(`  ⏳ 生成 ${config.pendingReaders} 个 pending 读者`)
  }

  // 12. 生成热门书被多人同时借的借阅记录
  if (config.hotBookBorrowings > 0 && modifiedBooks.length > 0 && modifiedReaders.length > 0) {
    // 选一本热门书
    const hotBook = modifiedBooks[rng.nextInt(0, modifiedBooks.length - 1)]
    const readerSubset = [...modifiedReaders].sort(() => rng.next() - 0.5).slice(0, Math.min(config.hotBookBorrowings, modifiedReaders.length))
    for (const reader of readerSubset) {
      const daysAgo = rng.nextInt(1, 14) // 最近借出
      const borrowDate = new Date()
      borrowDate.setDate(borrowDate.getDate() - daysAgo)
      const dueDate = new Date(borrowDate)
      dueDate.setDate(dueDate.getDate() + 30)
      allBorrowings.push({
        reader_id: reader.id,
        book_id: hotBook.id,
        borrow_date: borrowDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        return_date: null,
        renewal_count: 0,
        status: 'borrowed',
        fine_amount: 0
      })
    }
    console.log(`  🔥 生成 ${readerSubset.length} 条热门书同时借阅记录 (图书ID: ${hotBook.id})`)
  }

  // 13. 生成同一读者反复借同一本书的记录
  if (config.sameReaderRepeatBorrows > 0 && modifiedReaders.length > 0 && modifiedBooks.length > 0) {
    const repeatReader = modifiedReaders[rng.nextInt(0, modifiedReaders.length - 1)]
    const repeatBook = modifiedBooks[rng.nextInt(0, modifiedBooks.length - 1)]
    for (let i = 0; i < config.sameReaderRepeatBorrows; i++) {
      // 每次借阅间隔 30-60 天，从最久远的开始
      const daysAgo = rng.nextInt(30 + i * 45, 60 + i * 45)
      const borrowDate = new Date()
      borrowDate.setDate(borrowDate.getDate() - daysAgo)
      const dueDate = new Date(borrowDate)
      dueDate.setDate(dueDate.getDate() + 30)
      // 最后一条是当前借阅中
      const isLast = i === config.sameReaderRepeatBorrows - 1
      const returnDate = isLast ? null : (() => {
        const ret = new Date(borrowDate)
        ret.setDate(ret.getDate() + rng.nextInt(5, 28))
        return ret.toISOString().split('T')[0]
      })()
      allBorrowings.push({
        reader_id: repeatReader.id,
        book_id: repeatBook.id,
        borrow_date: borrowDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        return_date: returnDate,
        renewal_count: rng.nextInt(0, 2),
        status: isLast ? 'borrowed' : 'returned',
        fine_amount: 0
      })
    }
    console.log(`  🔁 生成 ${config.sameReaderRepeatBorrows} 条同一读者重复借阅记录 (读者ID: ${repeatReader.id}, 图书ID: ${repeatBook.id})`)
  }

  return {
    readers: modifiedReaders,
    books: modifiedBooks,
    borrowings: allBorrowings,
    stats: {
      maxBorrowingReaders: config.maxBorrowingReaders,
      expiringReaders: config.expiringReaders,
      zeroStockBooks: config.zeroStockBooks,
      damagedBooks: config.damagedBooks,
      longOverdueRecords: config.longOverdueRecords,
      highFineRecords: config.highFineRecords,
      multipleRenewalRecords: config.multipleRenewalRecords,
      emptyFieldReaders: config.emptyFieldReaders,
      suspendedReaders: config.suspendedReaders,
      expiredReaders: config.expiredReaders,
      pendingReaders: config.pendingReaders,
      hotBookBorrowings: config.hotBookBorrowings,
      sameReaderRepeatBorrows: config.sameReaderRepeatBorrows
    }
  }
}

/**
 * 禁用边界测试的配置
 */
export const DISABLED_EDGE_CASES_CONFIG: EdgeCasesConfig = {
  maxBorrowingReaders: 0,
  expiringReaders: 0,
  zeroStockBooks: 0,
  damagedBooks: 0,
  longOverdueRecords: 0,
  highFineRecords: 0,
  multipleRenewalRecords: 0,
  emptyFieldReaders: 0,
  suspendedReaders: 0,
  expiredReaders: 0,
  pendingReaders: 0,
  hotBookBorrowings: 0,
  sameReaderRepeatBorrows: 0
}
