import { Request, Response, NextFunction } from 'express'
import { logger } from '../lib/logger'
import fs from 'fs'
import path from 'path'

/**
 * 审计日志配置
 */
interface AuditConfig {
  /** 是否启用审计日志 */
  enabled: boolean
  /** 日志文件路径 */
  logPath: string
  /** 需要审计的操作类型 */
  auditedMethods: string[]
  /** 需要审计的路径模式 */
  auditedPaths: RegExp[]
  /** 敏感字段（需要脱敏） */
  sensitiveFields: string[]
}

const auditConfig: AuditConfig = {
  enabled: true,
  logPath: process.env.AUDIT_LOG_PATH || './logs/audit.log',
  auditedMethods: ['POST', 'PUT', 'DELETE', 'PATCH'],
  auditedPaths: [
    /^\/api\/v1\/auth\/(login|logout|register|password)/,
    /^\/api\/v1\/(books|readers|borrowings)/
  ],
  sensitiveFields: ['password', 'token', 'secret', 'apiKey', 'credit_card']
}

/**
 * 审计日志条目
 */
interface AuditLogEntry {
  timestamp: string
  requestId: string
  userId?: number
  username?: string
  role?: string
  ip: string
  method: string
  path: string
  query?: any
  body?: any
  statusCode?: number
  duration: number
  userAgent?: string
  action: string
  resource?: string
  resourceId?: string
}

// 确保日志目录存在
const ensureLogDir = () => {
  const logDir = path.dirname(auditConfig.logPath)
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true })
  }
}

// 生成请求ID
const generateRequestId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// 获取客户端IP
const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) {
    return (typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0]).trim()
  }
  return req.socket.remoteAddress || 'unknown'
}

// 脱敏处理
const sanitize = (obj: any, sensitiveFields: string[]): any => {
  if (!obj || typeof obj !== 'object') return obj

  const sanitized = Array.isArray(obj) ? [...obj] : { ...obj }

  for (const key of Object.keys(sanitized)) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      sanitized[key] = '***REDACTED***'
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitize(sanitized[key], sensitiveFields)
    }
  }

  return sanitized
}

// 判断是否需要审计
const shouldAudit = (req: Request): boolean => {
  if (!auditConfig.enabled) return false

  // 检查方法
  if (!auditConfig.auditedMethods.includes(req.method)) return false

  // 检查路径
  return auditConfig.auditedPaths.some(pattern => pattern.test(req.path))
}

// 解析操作类型
const parseAction = (method: string, path: string): { action: string; resource?: string; resourceId?: string } => {
  const pathParts = path.split('/').filter(Boolean)

  // 解析资源类型
  const resourceMap: Record<string, string> = {
    'auth': '认证',
    'books': '图书',
    'readers': '读者',
    'borrowings': '借阅',
    'ai': 'AI助手'
  }

  const resource = pathParts[2] ? resourceMap[pathParts[2]] || pathParts[2] : undefined
  const resourceId = pathParts[3] && !isNaN(Number(pathParts[3])) ? pathParts[3] : undefined

  const actionMap: Record<string, string> = {
    'POST': resourceId ? '执行' : '创建',
    'PUT': '更新',
    'PATCH': '部分更新',
    'DELETE': '删除'
  }

  // 特殊路径处理
  let action = actionMap[method] || method
  if (path.includes('/login')) action = '登录'
  if (path.includes('/logout')) action = '登出'
  if (path.includes('/register')) action = '注册'
  if (path.includes('/password')) action = '修改密码'

  return { action, resource, resourceId }
}

// 写入审计日志
const writeAuditLog = (entry: AuditLogEntry): void => {
  try {
    ensureLogDir()
    const logLine = JSON.stringify(entry) + '\n'
    fs.appendFileSync(auditConfig.logPath, logLine, 'utf-8')
  } catch (error) {
    logger.error('写入审计日志失败:', error)
  }
}

/**
 * 审计中间件
 */
export function auditMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now()
  const requestId = generateRequestId()

  // 添加请求ID到请求对象
  ;(req as any).requestId = requestId

  // 基础请求日志
  logger.info(`[${requestId}] ${req.method} ${req.path}`)

  // 判断是否需要审计
  const needsAudit = shouldAudit(req)

  // 记录响应结束
  res.on('finish', () => {
    const duration = Date.now() - startTime

    // 基础访问日志
    const logData = {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      ip: getClientIp(req),
      userId: req.user?.id,
      username: req.user?.username
    }

    // 根据状态码选择日志级别
    if (res.statusCode >= 400) {
      logger.warn(`请求完成 [${res.statusCode}]`, logData)
    } else {
      logger.debug('请求完成', logData)
    }

    // 写入审计日志
    if (needsAudit) {
      const { action, resource, resourceId } = parseAction(req.method, req.path)

      const auditEntry: AuditLogEntry = {
        timestamp: new Date().toISOString(),
        requestId,
        userId: req.user?.id,
        username: req.user?.username,
        role: req.user?.role,
        ip: getClientIp(req),
        method: req.method,
        path: req.path,
        query: Object.keys(req.query || {}).length > 0 ? req.query : undefined,
        body: req.body && Object.keys(req.body).length > 0
          ? sanitize(req.body, auditConfig.sensitiveFields)
          : undefined,
        statusCode: res.statusCode,
        duration,
        userAgent: req.headers['user-agent'],
        action,
        resource,
        resourceId
      }

      writeAuditLog(auditEntry)

      // 控制台输出关键操作
      if (action === '登录' || action === '修改密码' || action === '删除') {
        logger.info(`审计: ${action} - ${resource || ''} - 用户: ${req.user?.username || '匿名'} - IP: ${auditEntry.ip}`)
      }
    }
  })

  next()
}

/**
 * 查询审计日志（供管理员使用）
 */
export interface AuditLogQuery {
  startTime?: string
  endTime?: string
  userId?: number
  action?: string
  resource?: string
  page?: number
  pageSize?: number
}

export const queryAuditLogs = (query: AuditLogQuery): { logs: AuditLogEntry[]; total: number } => {
  const { startTime, endTime, userId, action, resource, page = 1, pageSize = 50 } = query

  if (!fs.existsSync(auditConfig.logPath)) {
    return { logs: [], total: 0 }
  }

  const logs: AuditLogEntry[] = []
  const fileContent = fs.readFileSync(auditConfig.logPath, 'utf-8')
  const lines = fileContent.trim().split('\n')

  for (const line of lines) {
    if (!line.trim()) continue

    try {
      const entry: AuditLogEntry = JSON.parse(line)

      // 过滤条件
      if (startTime && new Date(entry.timestamp) < new Date(startTime)) continue
      if (endTime && new Date(entry.timestamp) > new Date(endTime)) continue
      if (userId && entry.userId !== userId) continue
      if (action && entry.action !== action) continue
      if (resource && entry.resource !== resource) continue

      logs.push(entry)
    } catch {
      // 忽略解析错误的行
    }
  }

  // 分页
  const total = logs.length
  const startIndex = (page - 1) * pageSize
  const paginatedLogs = logs.slice(startIndex, startIndex + pageSize)

  return { logs: paginatedLogs, total }
}
