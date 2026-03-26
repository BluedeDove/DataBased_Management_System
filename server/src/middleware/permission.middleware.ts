import { Request, Response, NextFunction } from 'express'
import { db } from '../database'
import { logger } from '../lib/logger'

function getUserPermissions(userId: number): string[] {
  try {
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId) as { role: string } | undefined
    if (!user) return []
    const permissions = db.prepare(`SELECT permission FROM role_permissions WHERE role = ?`).all(user.role) as Array<{ permission: string }>
    return permissions.map(p => p.permission)
  } catch (error) {
    logger.error('获取用户权限失败:', error)
    return []
  }
}

function hasPermission(userId: number, requiredPermission: string): boolean {
  const permissions = getUserPermissions(userId)
  if (permissions.includes('*')) return true
  if (permissions.includes(requiredPermission)) return true
  const [resource] = requiredPermission.split(':')
  if (permissions.includes(`${resource}:*`)) return true
  return false
}

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: '未登录' } })
    }
    if (!hasPermission(req.user.id, permission)) {
      logger.warn(`用户 ${req.user.username} 尝试访问需要权限 ${permission} 的资源`)
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: `需要权限: ${permission}` } })
    }
    next()
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: '未登录' } })
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '权限不足' } })
    }
    next()
  }
}

export const adminOnly = requireRole('admin')
export const librarianOrAbove = requireRole('admin', 'librarian')
