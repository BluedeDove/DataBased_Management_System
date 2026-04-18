import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import path from 'path'
import fs from 'fs'
import { config } from './config'
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware'
import { globalLimiter, apiLimiter } from './middleware/rateLimit.middleware'
import { auditMiddleware } from './middleware/audit.middleware'

import { authRoutes } from './routes/auth.routes'
import { readerRoutes } from './routes/reader.routes'
import { bookRoutes } from './routes/book.routes'
import { borrowingRoutes } from './routes/borrowing.routes'
import { reservationRoutes } from './routes/reservation.routes'
import { machineRoutes } from './routes/machine.routes'
import { aiRoutes } from './routes/ai.routes'
import { exportRoutes } from './routes/export.routes'
import { configRoutes } from './routes/config.routes'
import { searchRoutes } from './routes/search.routes'
import { notificationRoutes } from './routes/notification.routes'
import { noteRoutes } from './domains/note/note.routes'

const loopbackHosts = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

const normalizeOrigin = (origin: string): string => origin.trim().replace(/\/$/, '')

const parseOrigin = (origin: string): URL | null => {
  try {
    return new URL(normalizeOrigin(origin))
  } catch {
    return null
  }
}

const isLoopbackOrigin = (origin: string): boolean => {
  const parsedOrigin = parseOrigin(origin)
  return !!parsedOrigin && loopbackHosts.has(parsedOrigin.hostname)
}

const isReplitOrigin = (origin: string): boolean => {
  const parsedOrigin = parseOrigin(origin)

  if (!parsedOrigin) {
    return false
  }

  return (
    parsedOrigin.hostname.endsWith('.replit.app') ||
    parsedOrigin.hostname.endsWith('.replit.dev') ||
    parsedOrigin.hostname.endsWith('.repl.co')
  )
}

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const wildcardToRegex = (pattern: string): RegExp => {
  const escapedPattern = escapeRegex(normalizeOrigin(pattern)).replace(/\\\*/g, '.*')
  return new RegExp(`^${escapedPattern}$`)
}

const matchesConfiguredOrigin = (origin: string, configuredOrigin: string): boolean => {
  const normalizedOrigin = normalizeOrigin(origin)
  const normalizedConfiguredOrigin = normalizeOrigin(configuredOrigin)

  if (!normalizedConfiguredOrigin) {
    return false
  }

  if (normalizedConfiguredOrigin === '*') {
    return true
  }

  if (normalizedConfiguredOrigin.includes('*')) {
    return wildcardToRegex(normalizedConfiguredOrigin).test(normalizedOrigin)
  }

  const parsedOrigin = parseOrigin(normalizedOrigin)
  const parsedConfiguredOrigin = parseOrigin(normalizedConfiguredOrigin)

  if (parsedOrigin && parsedConfiguredOrigin) {
    if (loopbackHosts.has(parsedOrigin.hostname) && loopbackHosts.has(parsedConfiguredOrigin.hostname)) {
      return parsedOrigin.protocol === parsedConfiguredOrigin.protocol && parsedOrigin.port === parsedConfiguredOrigin.port
    }

    return parsedOrigin.origin === parsedConfiguredOrigin.origin
  }

  return normalizedOrigin === normalizedConfiguredOrigin
}

const isAllowedCorsOrigin = (origin: string): boolean => {
  if (isLoopbackOrigin(origin) || isReplitOrigin(origin)) {
    return true
  }

  return config.cors.origins.some(configuredOrigin => matchesConfiguredOrigin(origin, configuredOrigin))
}

export function createApp() {
  const app = express()

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
    crossOriginEmbedderPolicy: false,
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

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('X-XSS-Protection', '1; mode=block')
    res.removeHeader('X-Powered-By')
    next()
  })

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true)

      if (isAllowedCorsOrigin(origin)) {
        return callback(null, true)
      }

      callback(new Error('CORS origin is not allowed'))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }))

  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))

  app.use(globalLimiter)
  app.use('/api', apiLimiter)
  app.use(auditMiddleware)

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

  app.use('/api/v1/auth', authRoutes)
  app.use('/api/v1/readers', readerRoutes)
  app.use('/api/v1/books', bookRoutes)
  app.use('/api/v1/borrowings', borrowingRoutes)
  app.use('/api/v1/reservations', reservationRoutes)
  app.use('/api/v1/machine', machineRoutes)
  app.use('/api/v1/ai', aiRoutes)
  app.use('/api/v1/export', exportRoutes)
  app.use('/api/v1/config', configRoutes)
  app.use('/api/v1/search', searchRoutes)
  app.use('/api/v1/notifications', notificationRoutes)
  app.use('/api/v1/notes', noteRoutes)

  app.use('/api/v1/reader-categories', readerRoutes)
  app.use('/api/v1/book-categories', bookRoutes)

  const appRoot = process.env.APP_ROOT || process.cwd()
  const distPath = path.join(appRoot, 'web', 'dist')
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath))
    app.get(/^(?!\/api(?:\/|$)|\/health$).*/, (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'))
    })
  }

  app.use(notFoundMiddleware)
  app.use(errorMiddleware)

  return app
}
