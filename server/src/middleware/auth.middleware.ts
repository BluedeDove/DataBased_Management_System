import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../lib/jwt'
import { db } from '../database'
import { logger } from '../lib/logger'

// 扩展 Request 类型
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number
        username: string
        role: string
        name: string
      }
    }
  }
}

export interface User {
  id: number
  username: string
  name: string
  role: string
  reader_id?: number
  email?: string
  phone?: string
}

/**
 * 认证中间件
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: '未提供认证令牌'
      }
    })
  }

  const token = authHeader.substring(7)
  const payload = verifyToken(token)

  if (!payload) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: '无效或过期的令牌'
      }
    })
  }

  // 从数据库获取用户信息
  try {
    const user = db.prepare(`
      SELECT id, username, name, role, reader_id, email, phone
      FROM users
      WHERE id = ? AND is_deleted = 0
    `).get(payload.userId) as User | undefined

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: '用户不存在'
        }
      })
    }

    req.user = user
    next()
  } catch (error) {
    logger.error('认证中间件错误:', error)
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '服务器内部错误'
      }
    })
  }
}

/**
 * 可选认证中间件（不强制要求登录）
 */
export function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (payload) {
      try {
        const user = db.prepare(`
          SELECT id, username, name, role, reader_id, email, phone
          FROM users
          WHERE id = ? AND is_deleted = 0
        `).get(payload.userId) as User | undefined

        if (user) {
          req.user = user
        }
      } catch (error) {
        logger.error('可选认证中间件错误:', error)
      }
    }
  }

  next()
}
