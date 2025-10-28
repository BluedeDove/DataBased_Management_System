import { UserRepository, User } from './user.repository'
import { AuthenticationError, ValidationError } from '../../lib/errorHandler'
import { logger } from '../../lib/logger'

export interface LoginCredentials {
  username: string
  password: string
}

export interface AuthResult {
  user: Omit<User, 'password'>
  token: string
}

export class AuthService {
  private userRepository = new UserRepository()
  private sessions = new Map<string, number>() // token -> userId

  async login(credentials: LoginCredentials): Promise<AuthResult> {
    logger.info('用户登录尝试', credentials.username)

    const { username, password } = credentials

    if (!username || !password) {
      throw new ValidationError('用户名和密码不能为空')
    }

    const user = this.userRepository.findByUsername(username)

    if (!user || user.password !== password) {
      logger.warn('登录失败：用户名或密码错误', username)
      throw new AuthenticationError('用户名或密码错误')
    }

    // 生成简单的token（生产环境应使用JWT）
    const token = this.generateToken(user.id)
    this.sessions.set(token, user.id)

    logger.info('用户登录成功', username)

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
    const user = this.userRepository.findById(userId)
    if (!user) {
      throw new AuthenticationError('用户不存在')
    }

    if (user.password !== oldPassword) {
      throw new AuthenticationError('原密码错误')
    }

    if (newPassword.length < 6) {
      throw new ValidationError('新密码长度不能少于6位')
    }

    this.userRepository.update(userId, { password: newPassword })
    logger.info('用户修改密码', user.username)
  }
}
