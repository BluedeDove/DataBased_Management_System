import { Request, Response, NextFunction } from 'express'
import { logger } from '../lib/logger'
import {
  AppError,
  NotFoundError,
  ValidationError,
  AuthenticationError,
  BusinessError,
  ConflictError
} from '../lib/errorHandler'

export function errorMiddleware(err: Error, req: Request, res: Response, _next: NextFunction) {
  logger.error(`Request error [${req.method}] ${req.path}:`, err)

  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'CORS_NOT_ALLOWED',
        message: err.message
      }
    })
  }

  if (err instanceof AuthenticationError) {
    return res.status(401).json({
      success: false,
      error: {
        code: err.code || 'AUTH_ERROR',
        message: err.message
      }
    })
  }

  if (err instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      error: {
        code: err.code || 'VALIDATION_ERROR',
        message: err.message,
        details: err.details
      }
    })
  }

  if (err instanceof NotFoundError) {
    return res.status(404).json({
      success: false,
      error: {
        code: err.code || 'NOT_FOUND',
        message: err.message
      }
    })
  }

  if (err instanceof ConflictError) {
    return res.status(409).json({
      success: false,
      error: {
        code: 'VERSION_CONFLICT',
        message: err.message,
        details: err.details
      }
    })
  }

  if (err.message && err.message.includes('版本冲突')) {
    return res.status(409).json({
      success: false,
      error: {
        code: 'VERSION_CONFLICT',
        message: '数据已被其他用户修改，请刷新后重试'
      }
    })
  }

  if (err instanceof BusinessError) {
    return res.status(400).json({
      success: false,
      error: {
        code: err.code || 'BUSINESS_ERROR',
        message: err.message,
        details: err.details
      }
    })
  }

  if (err instanceof AppError) {
    return res.status(400).json({
      success: false,
      error: {
        code: err.code || 'APP_ERROR',
        message: err.message,
        details: err.details
      }
    })
  }

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message
    }
  })
}

export function notFoundMiddleware(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `路由不存在: ${req.method} ${req.path}`
    }
  })
}

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
