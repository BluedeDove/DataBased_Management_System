/**
 * 图书数据生成器
 */

import { ALL_BOOKS, BookData } from '../data/books-data'
import { randomChoice, randomInt, SeededRandom } from '../utils/random-utils'

export interface GeneratedBook {
  isbn: string
  title: string
  author: string
  publisher: string
  category_id: number
  publish_date: string
  price: number
  pages: number
  keywords: string
  description: string
  cover_url: string | null
  total_quantity: number
  available_quantity: number
  status: string
}

export interface BookGeneratorOptions {
  count: number
  categories: Array<{ id: number; code: string; name: string }>
  rng?: SeededRandom
}

// 类别分布映射
const CATEGORY_DISTRIBUTION: Record<string, number> = {
  TP: 0.35,  // 计算机类 35%
  I: 0.30,   // 文学类 30%
  K: 0.20,   // 历史类 20%
  O: 0.10,   // 数理类 10%
  J: 0.05    // 艺术类 5%
}

/**
 * 根据分布随机选择类别
 */
function selectCategoryByDistribution(rng: SeededRandom): string {
  const rand = rng.next()
  let cumulative = 0
  for (const [code, weight] of Object.entries(CATEGORY_DISTRIBUTION)) {
    cumulative += weight
    if (rand < cumulative) {
      return code
    }
  }
  return 'TP' // 默认
}

/**
 * 生成图书数据
 */
export function generateBooks(options: BookGeneratorOptions): GeneratedBook[] {
  const { count, categories, rng = new SeededRandom(Date.now()) } = options
  const books: GeneratedBook[] = []
  const usedIsbns = new Set<string>()

  // 按类别分组图书数据
  const booksByCategory: Record<string, BookData[]> = {}
  for (const book of ALL_BOOKS) {
    if (!booksByCategory[book.categoryCode]) {
      booksByCategory[book.categoryCode] = []
    }
    booksByCategory[book.categoryCode].push(book)
  }

  // 生成图书
  for (let i = 0; i < count; i++) {
    // 按分布选择类别
    const categoryCode = selectCategoryByDistribution(rng)
    const category = categories.find(c => c.code === categoryCode) || categories[0]

    // 从该类别中选择图书数据
    const categoryBooks = booksByCategory[categoryCode] || ALL_BOOKS
    let bookData: BookData

    // 如果预定义数据不够，生成新的ISBN
    if (i < categoryBooks.length) {
      bookData = categoryBooks[i % categoryBooks.length]
    } else {
      // 随机选择一本书作为模板
      bookData = randomChoice(categoryBooks)
    }

    // 确保ISBN唯一
    let isbn = bookData.isbn
    if (usedIsbns.has(isbn)) {
      // 生成新的ISBN
      isbn = `9787${String(rng.nextInt(1000000, 9999999)).padStart(7, '0')}`
    }
    usedIsbns.add(isbn)

    // 随机价格和页数
    const price = Math.round((30 + rng.next() * 150) * 100) / 100
    const pages = rng.nextInt(100, 800)
    const quantity = rng.nextInt(1, 5)

    // 生成关键词和描述
    const keywords = `${category.name},${bookData.author},热门,推荐`
    const description = `这是一本关于${category.name}的优秀图书，由${bookData.author}撰写，${bookData.publisher}出版。本书内容丰富，适合广大读者阅读学习。`

    // 随机封面
    const coverUrl = rng.next() < 0.3 ? `https://picsum.photos/seed/${i}/300/400` : null

    books.push({
      isbn,
      title: bookData.title,
      author: bookData.author,
      publisher: bookData.publisher,
      category_id: category.id,
      publish_date: bookData.publishDate,
      price,
      pages,
      keywords,
      description,
      cover_url: coverUrl,
      total_quantity: quantity,
      available_quantity: quantity,
      status: 'normal'
    })
  }

  return books
}

/**
 * 生成库存为0的图书（边界测试用）
 */
export function generateZeroStockBooks(
  books: GeneratedBook[],
  count: number,
  rng: SeededRandom = new SeededRandom(Date.now())
): GeneratedBook[] {
  // 随机选择一些图书设置库存为0
  const shuffled = [...books].sort(() => rng.next() - 0.5)
  for (let i = 0; i < Math.min(count, shuffled.length); i++) {
    shuffled[i].total_quantity = 3
    shuffled[i].available_quantity = 0
  }
  return shuffled.slice(0, count)
}

/**
 * 生成损坏/丢失的图书（边界测试用）
 */
export function generateDamagedBooks(
  books: GeneratedBook[],
  count: number,
  rng: SeededRandom = new SeededRandom(Date.now())
): GeneratedBook[] {
  const shuffled = [...books].sort(() => rng.next() - 0.5)
  const damagedBooks: GeneratedBook[] = []

  for (let i = 0; i < Math.min(count, shuffled.length); i++) {
    damagedBooks.push({
      ...shuffled[i],
      status: rng.next() < 0.5 ? 'damaged' : 'lost'
    })
  }

  return damagedBooks
}
