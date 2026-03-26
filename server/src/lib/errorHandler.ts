import { logger } from './logger'

export interface SuccessResponse {
  success: boolean
  data?: any
  error?: {
    message: string
    code?: string
    details?: any
  }
}

export class AppError extends Error {
  constructor(message: string, public code?: string, public details?: any) {
    super(message)
    this.name = 'AppError'
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'NOT_FOUND', details)
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details)
    this.name = 'ValidationError'
  }
}

export class AuthError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'AUTH_ERROR', details)
    this.name = 'AuthError'
  }
}

export class AuthenticationError extends AuthError {
  constructor(message: string, details?: any) {
    super(message, details)
    this.name = 'AuthenticationError'
  }
}

export class BusinessError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'BUSINESS_ERROR', details)
    this.name = 'BusinessError'
  }
}

export class BorrowLimitError extends BusinessError {
  constructor(message: string, details?: any) {
    super(message, details)
    this.name = 'BorrowLimitError'
  }
}

export class StockUnavailableError extends BusinessError {
  constructor(message: string, details?: any) {
    super(message, details)
    this.name = 'StockUnavailableError'
  }
}

class ErrorHandler {
  handle(error: any): SuccessResponse {
    logger.error('Error occurred:', error)

    let message = 'An unexpected error occurred'
    let code: string | undefined
    let details: any

    if (error instanceof Error) {
      message = error.message
      if ((error as any).code) {
        code = (error as any).code
      }
    } else if (typeof error === 'string') {
      message = error
    }

    return {
      success: false,
      error: {
        message,
        code,
        details
      }
    }
  }
}

export const errorHandler = new ErrorHandler()
