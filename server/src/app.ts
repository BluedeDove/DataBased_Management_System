import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { config } from './config'
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware'

// 导入路由
import { authRoutes } from './routes/auth.routes'
import { readerRoutes } from './routes/reader.routes'
import { bookRoutes } from './routes/book.routes'
import { borrowingRoutes } from './routes/borrowing.routes'
import { aiRoutes } from './routes/ai.routes'
import { exportRoutes } from './routes/export.routes'
import { configRoutes } from './routes/config.routes'
import { searchRoutes } from './routes/search.routes'

/**
 * 创建 Express 应用
 */
export function createApp() {
  const app = express()

  // 安全中间件
  app.use(helmet({
    contentSecurityPolicy: false // 开发时禁用 CSP
  }))

  // CORS 配置
  app.use(cors({
    origin: (origin, callback) => {
      // 允许无 origin 的请求（如移动应用、curl）
      if (!origin) return callback(null, true)

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

  // 请求日志
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
    next()
  })

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

  // 读者类别路由 (别名)
  app.use('/api/v1/reader-categories', readerRoutes)

  // 图书类别路由 (别名)
  app.use('/api/v1/book-categories', bookRoutes)

  // 404 处理
  app.use(notFoundMiddleware)

  // 错误处理
  app.use(errorMiddleware)

  return app
}
