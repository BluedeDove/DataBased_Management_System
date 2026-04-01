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
  multipleRenewalRecords: 20
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
      multipleRenewalRecords: config.multipleRenewalRecords
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
  multipleRenewalRecords: 0
}
