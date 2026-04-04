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

// 分类关键词池
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  TP: ['编程', '算法', '数据结构', '人工智能', '机器学习', '深度学习', '数据库', '网络', '操作系统', '前端', '后端', 'Python', 'Java', 'JavaScript', '计算机视觉', '自然语言处理', '云计算', '微服务', '设计模式', '软件工程'],
  I: ['文学', '小说', '散文', '诗歌', '古典文学', '现代文学', '外国文学', '中国文学', '文学批评', '文学理论', '叙事', '创作', '写作', '文艺', '经典', '名著'],
  K: ['历史', '古代史', '近代史', '世界史', '中国史', '考古', '文明', '朝代', '史料', '历史人物', '战争', '文化', '传承', '纪实', '年代'],
  O: ['数学', '物理', '统计学', '概率论', '线性代数', '微积分', '量子力学', '力学', '光学', '数论', '应用数学', '计算数学', '分析', '方程'],
  J: ['艺术', '绘画', '设计', '音乐', '雕塑', '摄影', '美术', '书法', '视觉艺术', '当代艺术', '艺术史', '美学', '创意', '色彩', '构图']
}

// 描述模板（8种）
const DESCRIPTION_TEMPLATES = [
  (cat: string, author: string, pub: string) => `本书系统介绍了${cat}领域的核心知识，由${author}倾力编写。${pub}出版发行，内容详实，适合作为教材或自学参考。`,
  (cat: string, author: string, pub: string) => `${author}结合多年研究与实践经验，在本书中对${cat}进行了深入浅出的讲解。${pub}出品，深受读者好评。`,
  (cat: string, author: string, pub: string) => `这是一部${cat}领域的重要著作。${author}以独特的视角和严谨的论证，为读者呈现了丰富的学术内容。`,
  (cat: string, author: string, pub: string) => `${pub}出版的这部作品，汇集了${author}在${cat}方面的多年研究成果，理论联系实际，具有很强的参考价值。`,
  (cat: string, author: string, pub: string) => `本书从基础概念出发，逐步深入${cat}的核心内容。${author}的写作风格清晰易懂，是入门和进阶的理想读物。`,
  (cat: string, author: string, pub: string) => `${author}在${cat}领域深耕多年，本书是其研究心得的精华总结。全书结构严谨，案例丰富，${pub}荣誉出版。`,
  (cat: string, author: string, pub: string) => `本书全面覆盖${cat}的关键知识点，${author}以生动的案例和详尽的分析帮助读者深入理解。${pub}出品。`,
  (cat: string, author: string, pub: string) => `作为${cat}领域的经典读物，本书经${author}反复修订，内容与时俱进。${pub}出版，广受学界和业界推崇。`
]

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

    // 随机价格（偏态分布）
    const priceRand = rng.next()
    let price: number
    if (priceRand < 0.70) {
      price = Math.round((25 + rng.next() * 55) * 100) / 100   // 70% → 25-80 元
    } else if (priceRand < 0.90) {
      price = Math.round((80 + rng.next() * 70) * 100) / 100   // 20% → 80-150 元
    } else {
      price = Math.round((150 + rng.next() * 250) * 100) / 100  // 10% → 150-400 元
    }
    const pages = rng.nextInt(100, 800)

    // 库存分布（加权）
    const qtyRand = rng.next()
    let quantity: number
    if (qtyRand < 0.40) {
      quantity = rng.nextInt(1, 2)      // 40% → 1-2 本
    } else if (qtyRand < 0.75) {
      quantity = rng.nextInt(3, 5)      // 35% → 3-5 本
    } else if (qtyRand < 0.90) {
      quantity = rng.nextInt(6, 15)     // 15% → 6-15 本
    } else {
      quantity = rng.nextInt(20, 50)    // 10% → 20-50 本
    }

    // 生成关键词（从分类关键词池中随机选取）
    let keywords: string
    if (rng.next() < 0.10) {
      keywords = ''  // 10% 概率为空
    } else {
      const pool = CATEGORY_KEYWORDS[categoryCode] || CATEGORY_KEYWORDS['TP']
      const tagCount = rng.nextInt(2, 3)
      const selectedTags: string[] = []
      const shuffledPool = [...pool].sort(() => rng.next() - 0.5)
      for (let t = 0; t < Math.min(tagCount, shuffledPool.length); t++) {
        selectedTags.push(shuffledPool[t])
      }
      // 加作者名中的关键词
      if (rng.next() < 0.5) {
        selectedTags.push(bookData.author)
      }
      keywords = selectedTags.join(',')
    }

    // 生成描述（8种模板，15% 概率为空）
    let description: string
    if (rng.next() < 0.15) {
      description = ''
    } else {
      const templateIndex = rng.nextInt(0, DESCRIPTION_TEMPLATES.length - 1)
      description = DESCRIPTION_TEMPLATES[templateIndex](category.name, bookData.author, bookData.publisher)
    }

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
