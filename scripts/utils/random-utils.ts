/**
 * 随机工具函数
 */

/**
 * 带权重的随机选择
 * @param items 选项数组
 * @param weights 权重数组
 */
export function weightedRandom<T>(items: T[], weights: number[]): T {
  if (items.length !== weights.length) {
    throw new Error('Items and weights must have the same length')
  }

  const totalWeight = weights.reduce((sum, w) => sum + w, 0)
  let random = Math.random() * totalWeight

  for (let i = 0; i < items.length; i++) {
    random -= weights[i]
    if (random <= 0) {
      return items[i]
    }
  }

  return items[items.length - 1]
}

/**
 * 生成指定范围内的随机整数
 * @param min 最小值（包含）
 * @param max 最大值（包含）
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * 生成指定范围内的随机浮点数
 * @param min 最小值
 * @param max 最大值
 * @param decimals 小数位数
 */
export function randomFloat(min: number, max: number, decimals: number = 2): number {
  const value = Math.random() * (max - min) + min
  return parseFloat(value.toFixed(decimals))
}

/**
 * 从数组中随机选择一个元素
 */
export function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

/**
 * 从数组中随机选择多个不重复的元素
 * @param array 数组
 * @param count 数量
 */
export function randomSample<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, array.length))
}

/**
 * 随机打乱数组
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * 生成随机日期
 * @param startYear 开始年份
 * @param endYear 结束年份
 */
export function randomDate(startYear: number, endYear: number): string {
  const year = randomInt(startYear, endYear)
  const month = randomInt(1, 12).toString().padStart(2, '0')
  const day = randomInt(1, 28).toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 生成随机日期时间
 * @param startDate 开始日期
 * @param endDate 结束日期
 */
export function randomDateTime(startDate: Date, endDate: Date): Date {
  const start = startDate.getTime()
  const end = endDate.getTime()
  return new Date(start + Math.random() * (end - start))
}

/**
 * 生成随机日期字符串（相对于今天）
 * @param daysAgo 最大多少天前
 */
export function randomDateAgo(daysAgo: number): string {
  const today = new Date()
  const days = randomInt(0, daysAgo)
  today.setDate(today.getDate() - days)
  return today.toISOString().split('T')[0]
}

/**
 * 生成随机ISBN（简化版）
 */
export function randomISBN(): string {
  const prefix = '978'
  const group = randomInt(0, 9).toString()
  const publisher = randomInt(100, 999).toString()
  const title = randomInt(10000, 99999).toString()
  const base = prefix + group + publisher + title

  // 计算校验码
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += parseInt(base[i], 10) * (i % 2 === 0 ? 1 : 3)
  }
  const check = (10 - (sum % 10)) % 10

  return base + check
}

/**
 * 生成随机邮箱
 * @param username 用户名（可选）
 */
export function randomEmail(username?: string): string {
  const domains = [
    'qq.com', '163.com', '126.com', 'gmail.com', 'outlook.com',
    'sina.com', 'sohu.com', 'foxmail.com', 'hotmail.com'
  ]
  const name = username || `user${randomInt(10000, 99999)}`
  const domain = randomChoice(domains)
  return `${name}@${domain}`
}

/**
 * 生成随机地址
 */
export function randomAddress(): string {
  const provinces = ['北京市', '上海市', '广东省', '浙江省', '江苏省', '四川省', '湖北省', '陕西省']
  const cities = ['海淀区', '朝阳区', '浦东新区', '天河区', '西湖区', '江宁区', '武侯区', '雁塔区']
  const streets = ['中关村大街', '建国路', '南京路', '天河路', '文三路', '江宁路', '人民南路', '长安路']

  const province = randomChoice(provinces)
  const city = randomChoice(cities)
  const street = randomChoice(streets)
  const number = randomInt(1, 500)
  const building = randomInt(1, 20)
  const room = randomInt(101, 2505)

  return `${province}${city}${street}${number}号${building}栋${room}室`
}

/**
 * 带种子的随机整数（用于生成器）
 */
export function randomIntWithSeed(min: number, max: number, rng?: SeededRandom): number {
  if (rng) {
    return rng.nextInt(min, max)
  }
  return randomInt(min, max)
}

/**
 * 带种子的随机浮点数（用于生成器）
 */
export function randomFloatWithSeed(min: number, max: number, rng?: SeededRandom, decimals: number = 2): number {
  let value: number
  if (rng) {
    value = min + rng.next() * (max - min)
  } else {
    value = Math.random() * (max - min) + min
  }
  return parseFloat(value.toFixed(decimals))
}

/**
 * 简单的种子随机数生成器（用于可复现的随机序列）
 */
export class SeededRandom {
  private seed: number

  constructor(seed: number) {
    this.seed = seed
  }

  /**
   * 设置种子
   */
  setSeed(seed: number): void {
    this.seed = seed
  }

  /**
   * 生成0-1之间的随机数
   */
  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff
    return this.seed / 0x7fffffff
  }

  /**
   * 生成指定范围内的随机整数
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  /**
   * 从数组中随机选择
   */
  choice<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)]
  }
}

/**
 * 延迟函数
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
