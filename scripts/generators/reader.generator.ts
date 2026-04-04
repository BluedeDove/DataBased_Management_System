/**
 * 读者数据生成器
 */

import { generateChineseName } from '../data/chinese-names'
import { getRandomDepartment, STAFF_DEPARTMENTS } from '../data/universities'
import { generateIdCardByAgeRange } from '../utils/id-generator'
import { generatePhoneNumber } from '../utils/phone-generator'
import { randomEmail, randomAddress, SeededRandom, randomChoice, randomInt } from '../utils/random-utils'
import bcrypt from 'bcryptjs'

export interface GeneratedReader {
  reader_no: string
  name: string
  category_id: number
  user_id: number | null
  gender: string
  id_card: string
  organization: string
  phone: string
  email: string
  address: string
  status: string
  registration_date: string
  expiry_date: string
  notes: string
}

export interface GeneratedUser {
  username: string
  password: string // 加密后的密码
  name: string
  role: string
  reader_id: number
  email: string
  phone: string
}

export interface ReaderGeneratorOptions {
  count: number
  categories: Array<{ id: number; code: string; name: string; max_borrow_days?: number; max_borrow_count?: number }>
  rng?: SeededRandom
  defaultPassword?: string
}

// 性别类型
type Gender = 'male' | 'female'

/**
 * 生成读者数据
 */
export function generateReaders(options: ReaderGeneratorOptions): {
  readers: GeneratedReader[]
  users: Omit<GeneratedUser, 'reader_id'>[]
} {
  const {
    count,
    categories,
    rng = new SeededRandom(Date.now()),
    defaultPassword = '123456'
  } = options

  const readers: GeneratedReader[] = []
  const users: Omit<GeneratedUser, 'reader_id'>[] = []

  // 序列号计数器
  let teacherSeq = 1
  let studentSeq = 1

  // 计算各类别数量（70%学生，30%教师）
  const studentCount = Math.floor(count * 0.7)
  const teacherCount = count - studentCount

  // 生成学生读者
  const studentCategory = categories.find(c => c.code === 'STUDENT') || categories[0]
  for (let i = 0; i < studentCount; i++) {
    const result = generateSingleReader({
      categoryCode: 'STUDENT',
      categories,
      sequence: studentSeq++,
      ageRange: [18, 28],
      rng,
      defaultPassword
    })
    readers.push(result.reader)
    users.push(result.user)
  }

  // 生成教师读者
  const teacherCategory = categories.find(c => c.code === 'TEACHER') || categories[0]
  for (let i = 0; i < teacherCount; i++) {
    const result = generateSingleReader({
      categoryCode: 'TEACHER',
      categories,
      sequence: teacherSeq++,
      ageRange: [28, 60],
      rng,
      defaultPassword
    })
    readers.push(result.reader)
    users.push(result.user)
  }

  return { readers, users }
}

/**
 * 生成单个读者
 */
function generateSingleReader(params: {
  categoryCode: string
  categories: Array<{ id: number; code: string; name: string }>
  sequence: number
  ageRange: [number, number]
  rng: SeededRandom
  defaultPassword: string
}): { reader: GeneratedReader; user: Omit<GeneratedUser, 'reader_id'> } {
  const { categoryCode, categories, sequence, ageRange, rng, defaultPassword } = params

  // 查找类别
  const category = categories.find(c => c.code === categoryCode) || categories[0]
  const isTeacher = categoryCode === 'TEACHER'

  // 确定角色和前缀
  const role = isTeacher ? 'teacher' : 'student'
  const prefix = isTeacher ? 'TEACHER' : 'STUDENT'

  // 生成读者编号
  const today = new Date()
  const dateStr = today.toISOString().split('T')[0].replace(/-/g, '')
  const readerNo = `${prefix}${dateStr}${sequence.toString().padStart(4, '0')}`

  // 生成用户名
  const username = `${role}${String(sequence).padStart(3, '0')}`

  // 随机性别
  const gender: Gender = rng.next() < 0.52 ? 'male' : 'female'

  // 生成姓名
  const name = generateChineseName(gender)

  // 生成身份证号
  const idCard = generateIdCardByAgeRange(ageRange[0], ageRange[1], gender)

  // 生成所属机构
  const organization = isTeacher
    ? randomChoice(STAFF_DEPARTMENTS)
    : getRandomDepartment(true)

  // 生成联系方式（含可选字段缺失）
  const phone = rng.next() < 0.03 ? '' : generatePhoneNumber()
  const email = rng.next() < 0.05 ? '' : randomEmail(username)
  const address = rng.next() < 0.08 ? '' : randomAddress()

  // 生成日期（注册日期分散）
  const registrationDate = new Date()
  const dateRand = rng.next()
  if (dateRand < 0.70) {
    // 70% → 最近 365 天
    registrationDate.setDate(registrationDate.getDate() - rng.nextInt(0, 365))
  } else if (dateRand < 0.90) {
    // 20% → 1-2 年前
    registrationDate.setDate(registrationDate.getDate() - rng.nextInt(366, 730))
  } else {
    // 10% → 2-4 年前
    registrationDate.setDate(registrationDate.getDate() - rng.nextInt(731, 1460))
  }

  // 过期日期 = 注册日期 + validity_days（教师365天，学生365天）
  const validityDays = isTeacher ? 365 : 365
  const expiryDate = new Date(registrationDate)
  expiryDate.setDate(expiryDate.getDate() + validityDays)

  // 状态分布：85% active | 5% suspended | 7% expired | 3% pending
  let status: string
  const statusRand = rng.next()
  if (statusRand < 0.85) {
    status = 'active'
  } else if (statusRand < 0.90) {
    status = 'suspended'
  } else if (statusRand < 0.97) {
    status = 'expired'
  } else {
    status = 'pending'
  }

  // 备注（12% 概率为空）
  const notes = rng.next() < 0.12 ? '' : `${category.name}读者`

  // 密码加密
  const hashedPassword = bcrypt.hashSync(defaultPassword, 10)

  const reader: GeneratedReader = {
    reader_no: readerNo,
    name,
    category_id: category.id,
    user_id: null,
    gender,
    id_card: idCard,
    organization,
    phone,
    email,
    address,
    status,
    registration_date: registrationDate.toISOString().split('T')[0],
    expiry_date: expiryDate.toISOString().split('T')[0],
    notes
  }

  const user: Omit<GeneratedUser, 'reader_id'> = {
    username,
    password: hashedPassword,
    name,
    role,
    email,
    phone
  }

  return { reader, user }
}

/**
 * 生成即将过期的读者证（边界测试用）
 */
export function generateExpiringReaders(
  readers: GeneratedReader[],
  count: number,
  rng: SeededRandom = new SeededRandom(Date.now())
): GeneratedReader[] {
  const shuffled = [...readers].sort(() => rng.next() - 0.5)
  const expiringReaders: GeneratedReader[] = []

  for (let i = 0; i < Math.min(count, shuffled.length); i++) {
    // 设置1-30天内过期
    const daysUntilExpiry = Math.floor(rng.next() * 30) + 1
    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + daysUntilExpiry)

    expiringReaders.push({
      ...shuffled[i],
      expiry_date: expiryDate.toISOString().split('T')[0]
    })
  }

  return expiringReaders
}
