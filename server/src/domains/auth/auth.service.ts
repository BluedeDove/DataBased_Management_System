import { UserRepository, User } from './user.repository'
import { AuthenticationError, ValidationError } from '../../lib/errorHandler'
import { logger } from '../../lib/logger'
import { db } from '../../database'
import * as bcrypt from 'bcryptjs'
import { generateToken } from '../../lib/jwt'

export interface LoginCredentials {
  username: string
  password: string
}

export interface AuthResult {
  user: Omit<User, 'password'>
  token: string
}

export interface RegisterData {
  username: string
  password: string
  name: string
  identity: 'teacher' | 'student'
  id_card?: string
  phone: string
  email?: string
  address?: string
}

export class AuthService {
  private userRepository = new UserRepository()

  async login(credentials: LoginCredentials): Promise<AuthResult> {
    logger.info('========== [后端] 用户登录尝试 ==========')
    logger.info('[后端] 用户名:', credentials.username)

    const { username, password } = credentials

    if (!username || !password) {
      logger.error('[后端] 登录失败: 用户名或密码为空')
      throw new ValidationError('用户名和密码不能为空')
    }

    const user = this.userRepository.findByUsername(username)
    logger.info('[后端] 用户查询结果:', user ? `找到用户 ${user.username}` : '用户不存在')

    if (!user) {
      logger.warn('[后端] 登录失败: 用户不存在', username)
      throw new AuthenticationError('用户名或密码错误')
    }

    // 使用 bcrypt 验证密码
    logger.info('[后端] 开始验证密码...')
    const isPasswordValid = await bcrypt.compare(password, user.password)
    logger.info('[后端] 密码验证结果:', isPasswordValid ? '密码正确' : '密码错误')

    if (!isPasswordValid) {
      logger.warn('[后端] 登录失败: 密码错误', username)
      throw new AuthenticationError('用户名或密码错误')
    }

    // 生成 JWT Token
    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role
    })

    logger.info('[后端] 用户登录成功, userId:', user.id)
    logger.info('========== [后端] 登录流程结束 ==========\n')

    // 移除密码字段
    const { password: _, ...userWithoutPassword } = user

    return {
      user: userWithoutPassword,
      token
    }
  }

  validateToken(userId: number): User | null {
    const user = this.userRepository.findById(userId)
    return user || null
  }

  hasPermission(user: User, requiredPermission: string): boolean {
    const permissions = this.getUserPermissions(user.id)

    // Admin has wildcard access
    if (permissions.includes('*')) {
      return true
    }

    // Check exact match
    if (permissions.includes(requiredPermission)) {
      return true
    }

    // Check wildcard patterns (e.g., 'books:*' matches 'books:read')
    const [resource] = requiredPermission.split(':')
    if (permissions.includes(`${resource}:*`)) {
      return true
    }

    return false
  }

  getUserPermissions(userId: number): string[] {
    return this.userRepository.getUserPermissions(userId)
  }

  // 修改密码
  async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<void> {
    logger.info('========== [后端] 修改密码 ==========')
    logger.info('[后端] userId:', userId)

    const user = this.userRepository.findById(userId)
    if (!user) {
      logger.error('[后端] 修改密码失败: 用户不存在')
      throw new AuthenticationError('用户不存在')
    }

    // 使用 bcrypt 验证原密码
    logger.info('[后端] 验证原密码...')
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password)
    logger.info('[后端] 原密码验证结果:', isOldPasswordValid ? '正确' : '错误')

    if (!isOldPasswordValid) {
      logger.error('[后端] 修改密码失败: 原密码错误')
      throw new AuthenticationError('原密码错误')
    }

    if (newPassword.length < 6) {
      logger.error('[后端] 修改密码失败: 新密码长度不足')
      throw new ValidationError('新密码长度不能少于6位')
    }

    // 加密新密码
    logger.info('[后端] 加密新密码...')
    const hashedNewPassword = await bcrypt.hash(newPassword, 10)

    this.userRepository.update(userId, { password: hashedNewPassword })
    logger.info('[后端] 密码修改成功, username:', user.username)
    logger.info('========== [后端] 修改密码结束 ==========\n')
  }

  // 用户注册
  async register(data: RegisterData): Promise<Omit<User, 'password'>> {
    logger.info('========== [后端] 用户注册尝试 ==========')
    logger.info('[后端] 用户名:', data.username)

    // 1. 验证必填字段
    if (!data.username || !data.password || !data.name || !data.identity || !data.phone) {
      logger.error('[后端] 注册失败: 必填字段缺失')
      throw new ValidationError('请填写所有必填信息')
    }

    // 2. 验证密码长度
    if (data.password.length < 6) {
      logger.error('[后端] 注册失败: 密码长度不足')
      throw new ValidationError('密码长度不能少于6位')
    }

    // 3. 检查用户名是否已存在
    logger.info('[后端] 检查用户名是否存在...')
    const existingUser = this.userRepository.findByUsername(data.username)
    if (existingUser) {
      logger.error('[后端] 注册失败: 用户名已存在')
      throw new ValidationError('用户名已存在')
    }
    logger.info('[后端] 用户名可用')

    // 4. 检查身份证号是否已存在（如果提供了）
    if (data.id_card) {
      logger.info('[后端] 检查身份证号是否存在...')
      const existingIdCard = db.prepare('SELECT id FROM readers WHERE id_card = ?').get(data.id_card)
      if (existingIdCard) {
        logger.error('[后端] 注册失败: 身份证号已被注册')
        throw new ValidationError('身份证号已被注册')
      }
      logger.info('[后端] 身份证号可用')
    }

    // 5. 根据身份类型查找对应的 reader_category_id
    logger.info('[后端] 查找读者类别...')
    const categoryCode = data.identity === 'teacher' ? 'TEACHER' : 'STUDENT'
    const category = db.prepare('SELECT id, validity_days FROM reader_categories WHERE code = ?').get(categoryCode) as
      { id: number; validity_days: number } | undefined

    if (!category) {
      logger.error('[后端] 注册失败: 读者种类不存在, code:', categoryCode)
      throw new ValidationError(`读者种类 ${categoryCode} 不存在，请联系管理员`)
    }
    logger.info('[后端] 读者类别找到, id:', category.id)

    // 6. 加密密码
    logger.info('[后端] 加密密码...')
    const hashedPassword = await bcrypt.hash(data.password, 10)
    logger.info('[后端] 密码加密完成')

    // 7. 生成读者编号
    logger.info('[后端] 生成读者编号...')
    const readerNo = this.generateReaderNo(data.identity)
    logger.info('[后端] 读者编号生成:', readerNo)

    // 8. 计算有效期
    const registrationDate = new Date()
    const expiryDate = new Date(registrationDate)
    expiryDate.setDate(expiryDate.getDate() + category.validity_days)

    // 9. 使用数据库事务同时创建 user 和 reader 记录
    logger.info('[后端] 开始数据库事务...')
    const transaction = db.transaction(() => {
      // 创建 reader 记录
      const insertReader = db.prepare(`
        INSERT INTO readers (
          reader_no, name, category_id, id_card, phone, email, address,
          registration_date, expiry_date, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      const readerResult = insertReader.run(
        readerNo,
        data.name,
        category.id,
        data.id_card || null,
        data.phone,
        data.email || null,
        data.address || null,
        registrationDate.toISOString().split('T')[0],
        expiryDate.toISOString().split('T')[0],
        'active'
      )
      const readerId = readerResult.lastInsertRowid as number

      // 创建 user 记录
      const role = data.identity === 'teacher' ? 'teacher' : 'student'
      const insertUser = db.prepare(`
        INSERT INTO users (username, password, name, role, reader_id, email, phone)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      const userResult = insertUser.run(
        data.username,
        hashedPassword,
        data.name,
        role,
        readerId,
        data.email || null,
        data.phone
      )
      const userId = userResult.lastInsertRowid as number

      // 更新 reader 记录的 user_id
      db.prepare('UPDATE readers SET user_id = ? WHERE id = ?').run(userId, readerId)

      return userId
    })

    const userId = transaction()
    logger.info('[后端] 用户注册成功', { username: data.username, userId })

    const user = this.userRepository.findById(userId)
    if (!user) {
      throw new Error('注册成功但无法获取用户信息')
    }

    const { password: _, ...userWithoutPassword } = user
    return userWithoutPassword
  }

  // 生成读者编号
  private generateReaderNo(identity: 'teacher' | 'student'): string {
    const prefix = identity === 'teacher' ? 'T' : 'S'
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const dateStr = `${year}${month}${day}`
    const readerNoPrefix = `${prefix}${dateStr}`

    const stmt = db.prepare(`
      SELECT reader_no FROM readers
      WHERE reader_no LIKE ?
      ORDER BY reader_no DESC
      LIMIT 1
    `)
    const result = stmt.get(`${readerNoPrefix}%`) as { reader_no?: string } | undefined

    let sequence = 1
    if (result?.reader_no) {
      const lastSequence = result.reader_no.slice(-4)
      const lastNum = parseInt(lastSequence, 10)
      if (!isNaN(lastNum)) {
        sequence = lastNum + 1
      }
    }

    const sequenceStr = sequence.toString().padStart(4, '0')
    return `${readerNoPrefix}${sequenceStr}`
  }
}
