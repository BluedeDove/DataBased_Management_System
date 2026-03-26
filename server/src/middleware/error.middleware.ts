import { Request, Response, NextFunction } from 'express'
import { logger } from '../lib/logger'
import {
  AppError,
  NotFoundError,
  ValidationError,
  AuthenticationError,
  BusinessError
} from '../lib/errorHandler'

/**
 * 统一错误处理中间件
 */
export function errorMiddleware(err: Error, req: Request, res: Response, _next: NextFunction) {
  logger.error(`请求错误 [${req.method}] ${req.path}:`, err)

  // 已知错误类型
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

  // 未知错误
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message
    }
  })
}

/**
 * 404 处理中间件
 */
export function notFoundMiddleware(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `路由不存在: ${req.method} ${req.path}`
    }
  })
}

/**
 * 异步处理器包装函数
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
