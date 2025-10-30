import { UserRepository, User } from './user.repository'
import { ReaderRepository } from '../reader/reader.repository'
import { AuthenticationError, ValidationError } from '../../lib/errorHandler'
import { logger } from '../../lib/logger'
import { db } from '../../database'
import * as bcrypt from 'bcryptjs'

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
  id_card: string
  phone: string
  email?: string
}

export class AuthService {
  private userRepository = new UserRepository()
  private readerRepository = new ReaderRepository()
  private sessions = new Map<string, number>() // token -> userId

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

    // 生成简单的token（生产环境应使用JWT）
    const token = this.generateToken(user.id)
    this.sessions.set(token, user.id)

    logger.info('[后端] 用户登录成功, userId:', user.id)
    logger.info('========== [后端] 登录流程结束 ==========\n')

    // 移除密码字段
    const { password: _, ...userWithoutPassword } = user

    return {
      user: userWithoutPassword,
      token
    }
  }

  logout(token: string): void {
    this.sessions.delete(token)
    logger.info('用户登出')
  }

  validateToken(token: string): User | null {
    const userId = this.sessions.get(token)
    if (!userId) {
      return null
    }

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

  private generateToken(userId: number): string {
    return `token_${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}`
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
    logger.info('[后端] 姓名:', data.name)
    logger.info('[后端] 身份:', data.identity)
    logger.info('[后端] 身份证号:', data.id_card ? data.id_card.substring(0, 6) + '****' : '未提供')
    logger.info('[后端] 手机号:', data.phone)
    logger.info('[后端] 邮箱:', data.email || '未提供')

    // 1. 验证必填字段
    if (!data.username || !data.password || !data.name || !data.identity || !data.id_card || !data.phone) {
      logger.error('[后端] 注册失败: 必填字段缺失')
      logger.error('[后端] 缺失的字段:', {
        username: !data.username,
        password: !data.password,
        name: !data.name,
        identity: !data.identity,
        id_card: !data.id_card,
        phone: !data.phone
      })
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

    // 4. 检查身份证号是否已存在
    logger.info('[后端] 检查身份证号是否存在...')
    const existingIdCard = db.prepare('SELECT id FROM readers WHERE id_card = ?').get(data.id_card)
    if (existingIdCard) {
      logger.error('[后端] 注册失败: 身份证号已被注册')
      throw new ValidationError('身份证号已被注册')
    }
    logger.info('[后端] 身份证号可用')

    // 5. 根据身份类型查找对应的 reader_category_id
    logger.info('[后端] 查找读者类别...')
    const categoryCode = data.identity === 'teacher' ? 'TEACHER' : 'STUDENT'
    const category = db.prepare('SELECT id, validity_days FROM reader_categories WHERE code = ?').get(categoryCode) as
      { id: number; validity_days: number } | undefined

    if (!category) {
      logger.error('[后端] 注册失败: 读者种类不存在, code:', categoryCode)
      throw new ValidationError(`读者种类 ${categoryCode} 不存在，请联系管理员`)
    }
    logger.info('[后端] 读者类别找到, id:', category.id, 'validity_days:', category.validity_days)

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
    logger.info('[后端] 有效期计算完成, 注册日期:', registrationDate.toISOString().split('T')[0], '到期日期:', expiryDate.toISOString().split('T')[0])

    // 9. 使用数据库事务同时创建 user 和 reader 记录
    logger.info('[后端] 开始数据库事务...')
    const transaction = db.transaction(() => {
      // 创建 reader 记录
      logger.info('[后端] 创建reader记录...')
      const insertReader = db.prepare(`
        INSERT INTO readers (
          reader_no, name, category_id, id_card, phone, email,
          registration_date, expiry_date, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      const readerResult = insertReader.run(
        readerNo,
        data.name,
        category.id,
        data.id_card,
        data.phone,
        data.email || null,
        registrationDate.toISOString().split('T')[0],
        expiryDate.toISOString().split('T')[0],
        'active'
      )
      const readerId = readerResult.lastInsertRowid as number
      logger.info('[后端] reader记录创建成功, readerId:', readerId)

      // 创建 user 记录，并关联 reader_id
      logger.info('[后端] 创建user记录...')
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
      logger.info('[后端] user记录创建成功, userId:', userId)

      // 更新 reader 记录的 user_id（建立双向关联）
      logger.info('[后端] 更新reader的user_id建立双向关联...')
      const updateReader = db.prepare('UPDATE readers SET user_id = ? WHERE id = ?')
      updateReader.run(userId, readerId)
      logger.info('[后端] 双向关联建立成功')

      return userId
    })

    // 执行事务
    logger.info('[后端] 执行事务...')
    const userId = transaction()
    logger.info('[后端] 事务执行成功')

    logger.info('[后端] 用户注册成功', { username: data.username, userId, readerNo })
    logger.info('========== [后端] 注册流程结束 ==========\n')

    // 10. 返回创建的用户对象（不包含密码）
    const user = this.userRepository.findById(userId)
    if (!user) {
      throw new Error('注册成功但无法获取用户信息')
    }

    const { password: _, ...userWithoutPassword } = user
    return userWithoutPassword
  }

  // 生成读者编号: T202501150001 (教师) 或 S202501150001 (学生)
  private generateReaderNo(identity: 'teacher' | 'student'): string {
    const prefix = identity === 'teacher' ? 'T' : 'S'
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const dateStr = `${year}${month}${day}`
    const readerNoPrefix = `${prefix}${dateStr}`

    // 查找今天同类型的最大编号
    const stmt = db.prepare(`
      SELECT reader_no FROM readers
      WHERE reader_no LIKE ?
      ORDER BY reader_no DESC
      LIMIT 1
    `)
    const result = stmt.get(`${readerNoPrefix}%`) as { reader_no?: string } | undefined

    let sequence = 1
    if (result?.reader_no) {
      // 从编号中提取序号部分（最后4位）
      const lastSequence = result.reader_no.slice(-4)
      const lastNum = parseInt(lastSequence, 10)
      if (!isNaN(lastNum)) {
        sequence = lastNum + 1
      }
    }

    // 格式化为4位数字
    const sequenceStr = sequence.toString().padStart(4, '0')
    return `${readerNoPrefix}${sequenceStr}`
  }
}
