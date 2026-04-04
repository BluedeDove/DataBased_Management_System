import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import path from 'path'
import fs from 'fs'
import { config } from './config'
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware'
import { globalLimiter, apiLimiter } from './middleware/rateLimit.middleware'
import { auditMiddleware } from './middleware/audit.middleware'

// 导入路由
import { authRoutes } from './routes/auth.routes'
import { readerRoutes } from './routes/reader.routes'
import { bookRoutes } from './routes/book.routes'
import { borrowingRoutes } from './routes/borrowing.routes'
import { aiRoutes } from './routes/ai.routes'
import { exportRoutes } from './routes/export.routes'
import { configRoutes } from './routes/config.routes'
import { searchRoutes } from './routes/search.routes'
import { notificationRoutes } from './routes/notification.routes'
import { noteRoutes } from './domains/note/note.routes'

/**
 * 创建 Express 应用
 */
export function createApp() {
  const app = express()

  // 安全中间件 - 增强配置
  const isProduction = config.server.nodeEnv === 'production'
  app.use(helmet({
    contentSecurityPolicy: isProduction ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    } : false,
    crossOriginEmbedderPolicy: isProduction,
    crossOriginOpenerPolicy: isProduction,
    crossOriginResourcePolicy: isProduction ? { policy: 'same-origin' } : false,
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: isProduction ? {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    } : false,
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true
  }))

  // 额外的安全Headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('X-XSS-Protection', '1; mode=block')
    res.removeHeader('X-Powered-By')
    next()
  })

  // CORS 配置
  app.use(cors({
    origin: (origin, callback) => {
      // 允许无 origin 的请求（如移动应用、curl）
      if (!origin) return callback(null, true)

      // 允许 ngrok 隧道域名（用于演示/答辩）
      if (origin.endsWith('.ngrok-free.app') || origin.endsWith('.ngrok-free.dev') || origin.endsWith('.ngrok.io')) {
        return callback(null, true)
      }

      if (config.cors.origins.includes(origin) || config.cors.origins.includes('*')) {
        callback(null, true)
      } else {
        callback(new Error('不允许的 CORS 来源'))
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }))

  // 解析请求体
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))

  // 全局限流
  app.use(globalLimiter)

  // API限流
  app.use('/api', apiLimiter)

  // 请求日志和审计
  app.use(auditMiddleware)

  // 健康检查
  app.get('/health', (_req, res) => {
    res.json({
      success: true,
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: config.app.version
      }
    })
  })

  // API 路由
  app.use('/api/v1/auth', authRoutes)
  app.use('/api/v1/readers', readerRoutes)
  app.use('/api/v1/books', bookRoutes)
  app.use('/api/v1/borrowings', borrowingRoutes)
  app.use('/api/v1/ai', aiRoutes)
  app.use('/api/v1/export', exportRoutes)
  app.use('/api/v1/config', configRoutes)
  app.use('/api/v1/search', searchRoutes)
  app.use('/api/v1/notifications', notificationRoutes)
  app.use('/api/v1/notes', noteRoutes)

  // 读者类别路由 (别名)
  app.use('/api/v1/reader-categories', readerRoutes)

  // 图书类别路由 (别名)
  app.use('/api/v1/book-categories', bookRoutes)

  // 静态文件托管（Replit 单端口模式，所有 API 路由之后）
  const distPath = path.join(process.cwd(), 'web', 'dist')
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath))
    // Vue Router hash 模式兜底
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'))
    })
  }

  // 404 处理
  app.use(notFoundMiddleware)

  // 错误处理
  app.use(errorMiddleware)

  return app
}
