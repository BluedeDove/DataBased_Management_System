import { Request, Response, NextFunction } from 'express'
import { logger } from '../lib/logger'

/**
 * 限流配置接口
 */
interface RateLimitConfig {
  windowMs: number       // 时间窗口（毫秒）
  max: number            // 最大请求数
  message?: string       // 自定义错误消息
  keyGenerator?: (req: Request) => string  // 自定义key生成器
  skip?: (req: Request) => boolean         // 跳过条件
}

/**
 * 限流记录
 */
interface RateLimitRecord {
  count: number
  resetTime: number
  blocked: boolean
}

/**
 * 内存限流存储
 */
class RateLimitStore {
  private records = new Map<string, RateLimitRecord>()
  private cleanupInterval: ReturnType<typeof setInterval>

  constructor() {
    // 每分钟清理过期记录
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60000)
  }

  /**
   * 获取记录
   */
  get(key: string): RateLimitRecord | undefined {
    return this.records.get(key)
  }

  /**
   * 设置记录
   */
  set(key: string, record: RateLimitRecord): void {
    this.records.set(key, record)
  }

  /**
   * 递增计数
   */
  increment(key: string, windowMs: number, max: number): { count: number; resetTime: number; blocked: boolean } {
    const now = Date.now()
    let record = this.records.get(key)

    if (!record || now > record.resetTime) {
      // 创建新窗口
      record = {
        count: 1,
        resetTime: now + windowMs,
        blocked: false
      }
    } else {
      record.count++
      if (record.count > max) {
        record.blocked = true
      }
    }

    this.records.set(key, record)
    return {
      count: record.count,
      resetTime: record.resetTime,
      blocked: record.blocked
    }
  }

  /**
   * 重置记录
   */
  reset(key: string): void {
    this.records.delete(key)
  }

  /**
   * 清理过期记录
   */
  private cleanup(): void {
    const now = Date.now()
    for (const [key, record] of this.records.entries()) {
      if (now > record.resetTime) {
        this.records.delete(key)
      }
    }
  }

  /**
   * 销毁
   */
  destroy(): void {
    clearInterval(this.cleanupInterval)
    this.records.clear()
  }
}

// 全局存储实例
const store = new RateLimitStore()

/**
 * 默认key生成器（基于IP）
 */
const defaultKeyGenerator = (req: Request): string => {
  // 尝试获取真实IP（考虑代理）
  const forwarded = req.headers['x-forwarded-for']
  const ip = forwarded
    ? (typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0])
    : req.socket.remoteAddress || 'unknown'
  return ip.trim()
}

/**
 * 创建限流中间件
 */
export function createRateLimiter(config: RateLimitConfig) {
  const {
    windowMs,
    max,
    message = '请求过于频繁，请稍后再试',
    keyGenerator = defaultKeyGenerator,
    skip
  } = config

  return (req: Request, res: Response, next: NextFunction) => {
    // 检查是否跳过
    if (skip && skip(req)) {
      return next()
    }

    const key = keyGenerator(req)
    const result = store.increment(key, windowMs, max)

    // 设置响应头
    res.setHeader('X-RateLimit-Limit', max)
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - result.count))
    res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString())

    if (result.blocked) {
      const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000)
      res.setHeader('Retry-After', retryAfter)

      logger.warn(`限流触发: ${key} - ${req.method} ${req.path}`)

      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message,
          retryAfter
        }
      })
    }

    next()
  }
}

// 非生产环境跳过所有限流（开发/演示模式）
const skipInDev = () => process.env.NODE_ENV !== 'production'

/**
 * 全局限流器（生产：1000请求/15分钟）
 */
export const globalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: '请求过于频繁，请15分钟后再试',
  skip: skipInDev
})

/**
 * 登录限流器（生产：20次尝试/15分钟）
 */
export const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: '登录尝试过多，请15分钟后再试',
  skip: skipInDev,
  keyGenerator: (req: Request) => {
    const ip = defaultKeyGenerator(req)
    const username = req.body?.username || ''
    return `login:${ip}:${username}`
  }
})

/**
 * 注册限流器（生产：20次/小时）
 */
export const registerLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: '注册请求过多，请1小时后再试',
  skip: skipInDev
})

/**
 * API限流器（生产：300请求/分钟）
 */
export const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 300,
  message: 'API请求过于频繁，请稍后再试',
  skip: skipInDev
})

/**
 * 敏感操作限流器（生产：50次/小时）
 */
export const sensitiveLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: '敏感操作次数过多，请稍后再试',
  skip: skipInDev
})

/**
 * AI请求限流器（生产：30次/分钟）
 */
export const aiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'AI请求过于频繁，请稍后再试',
  skip: skipInDev
})

// 导出存储实例（用于测试）
export { store as rateLimitStore }
