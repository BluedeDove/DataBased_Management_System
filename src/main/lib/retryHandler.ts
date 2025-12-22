import { logger } from './logger'
import { AppError } from './errorHandler'

/**
 * 重试策略选项
 */
export interface RetryOptions {
  maxRetries?: number          // 最大重试次数，默认3次
  initialDelay?: number        // 初始延迟时间（毫秒），默认1000ms
  maxDelay?: number           // 最大延迟时间（毫秒），默认10000ms
  backoffFactor?: number      // 退避因子，默认2
  jitter?: boolean            // 是否添加随机抖动，默认true
  retryableErrors?: string[]  // 可重试的错误类型
  nonRetryableErrors?: string[] // 不可重试的错误类型
}

/**
 * 重试结果
 */
export interface RetryResult<T> {
  success: boolean
  data?: T
  error?: Error
  attempts: number
  totalDelay: number
}

/**
 * 重试处理器错误
 */
export class RetryHandlerError extends AppError {
  constructor(message: string, public details?: any) {
    super(message, 'RETRY_HANDLER_ERROR', details)
    this.name = 'RetryHandlerError'
  }
}

/**
 * 智能重试处理器
 * 实现指数退避、抖动、可配置的重试策略
 */
export class RetryHandler {
  private static readonly DEFAULT_OPTIONS: Required<RetryOptions> = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
    jitter: true,
    retryableErrors: [
      'NETWORK_ERROR',
      'TIMEOUT_ERROR',
      'CONNECTION_ERROR',
      'SERVER_ERROR',
      'SERVICE_UNAVAILABLE',
      'RATE_LIMIT_EXCEEDED'
    ],
    nonRetryableErrors: [
      'VALIDATION_ERROR',
      'AUTH_ERROR',
      'BUSINESS_ERROR',
      'NOT_FOUND_ERROR',
      'PERMISSION_ERROR'
    ]
  }

  /**
   * 执行可重试的操作
   * @param operation 要执行的操作
   * @param options 重试选项
   * @returns 重试结果
   */
  static async execute<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<RetryResult<T>> {
    const finalOptions = { ...this.DEFAULT_OPTIONS, ...options }
    let totalDelay = 0
    let lastError: Error

    for (let attempt = 0; attempt <= finalOptions.maxRetries; attempt++) {
      try {
        logger.debug('执行重试操作', {
          attempt: attempt + 1,
          maxRetries: finalOptions.maxRetries,
          operation: operation.toString().substring(0, 100)
        })

        const result = await operation()
        
        if (attempt > 0) {
          logger.info('重试操作成功', {
            attempts: attempt + 1,
            totalDelay
          })
        }

        return {
          success: true,
          data: result,
          attempts: attempt + 1,
          totalDelay
        }
      } catch (error) {
        lastError = error as Error
        const errorCode = this.getErrorCode(lastError)
        
        logger.warn('操作失败', {
          attempt: attempt + 1,
          maxRetries: finalOptions.maxRetries,
          errorCode,
          errorMessage: lastError.message
        })

        // 检查是否应该重试
        if (!this.shouldRetry(lastError, errorCode, finalOptions)) {
          logger.info('操作不可重试，立即返回失败', {
            errorCode,
            errorMessage: lastError.message
          })
          
          return {
            success: false,
            error: lastError,
            attempts: attempt + 1,
            totalDelay
          }
        }

        // 如果是最后一次尝试
        if (attempt === finalOptions.maxRetries) {
          logger.warn('已达到最大重试次数，操作失败', {
            attempts: finalOptions.maxRetries + 1,
            totalDelay,
            finalError: lastError.message
          })
          break
        }

        // 计算延迟时间
        const delay = this.calculateDelay(attempt, finalOptions)
        totalDelay += delay

        logger.info(`延迟 ${delay}ms 后重试`, {
          attempt: attempt + 1,
          nextAttempt: attempt + 2,
          delay,
          totalDelay,
          errorCode
        })

        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    return {
      success: false,
      error: lastError!,
      attempts: finalOptions.maxRetries + 1,
      totalDelay
    }
  }

  /**
   * 执行可重试的操作，如果失败则抛出异常
   * @param operation 要执行的操作
   * @param options 重试选项
   * @returns 操作结果
   */
  static async executeOrThrow<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const result = await this.execute(operation, options)
    
    if (!result.success) {
      throw new RetryHandlerError(
        `操作重试 ${result.attempts} 次后仍然失败: ${result.error?.message}`,
        {
          attempts: result.attempts,
          totalDelay: result.totalDelay,
          originalError: result.error
        }
      )
    }

    return result.data!
  }

  /**
   * 计算延迟时间（指数退避 + 抖动）
   * @param attempt 当前尝试次数
   * @param options 重试选项
   * @returns 延迟时间（毫秒）
   */
  private static calculateDelay(attempt: number, options: Required<RetryOptions>): number {
    // 指数退避
    const exponentialDelay = options.initialDelay * Math.pow(options.backoffFactor, attempt)
    
    // 限制最大延迟
    const cappedDelay = Math.min(exponentialDelay, options.maxDelay)
    
    // 添加抖动
    if (options.jitter) {
      const jitterRange = cappedDelay * 0.1 // 10%的抖动范围
      const jitter = (Math.random() - 0.5) * 2 * jitterRange
      return Math.max(0, Math.floor(cappedDelay + jitter))
    }
    
    return Math.floor(cappedDelay)
  }

  /**
   * 判断错误是否应该重试
   * @param error 错误对象
   * @param errorCode 错误代码
   * @param options 重试选项
   * @returns 是否应该重试
   */
  private static shouldRetry(
    error: Error,
    errorCode: string,
    options: Required<RetryOptions>
  ): boolean {
    // 检查不可重试的错误类型
    if (options.nonRetryableErrors.includes(errorCode)) {
      return false
    }
    
    // 检查可重试的错误类型
    if (options.retryableErrors.includes(errorCode)) {
      return true
    }
    
    // 网络错误和超时错误总是可重试
    if (error.message.includes('network') || 
        error.message.includes('timeout') ||
        error.message.includes('ECONNRESET') ||
        error.message.includes('ETIMEDOUT')) {
      return true
    }
    
    // 默认不重试
    return false
  }

  /**
   * 从错误中提取错误代码
   * @param error 错误对象
   * @returns 错误代码
   */
  private static getErrorCode(error: Error): string {
    // 尝试从错误对象获取代码
    if ((error as any).code) {
      return (error as any).code
    }
    
    // 从错误名称获取
    if (error.name && error.name !== 'Error') {
      return error.name.toUpperCase().replace(/ERROR$/, '')
    }
    
    // 从错误消息提取常见错误类型
    const message = error.message.toLowerCase()
    if (message.includes('validation')) return 'VALIDATION_ERROR'
    if (message.includes('auth') || message.includes('permission')) return 'AUTH_ERROR'
    if (message.includes('not found')) return 'NOT_FOUND_ERROR'
    if (message.includes('network') || message.includes('timeout')) return 'NETWORK_ERROR'
    if (message.includes('server error') || message.includes('500')) return 'SERVER_ERROR'
    if (message.includes('rate limit')) return 'RATE_LIMIT_EXCEEDED'
    
    return 'UNKNOWN_ERROR'
  }

  /**
   * 创建自定义重试策略
   * @param name 策略名称
   * @param options 重试选项
   * @returns 配置好的重试函数
   */
  static createStrategy<T>(
    name: string,
    options: RetryOptions
  ): (operation: () => Promise<T>) => Promise<RetryResult<T>> {
    logger.debug('创建自定义重试策略', {
      name,
      options
    })
    
    return (operation: () => Promise<T>) => {
      return this.execute(operation, options)
    }
  }

  /**
   * 预设的重试策略
   */
  static strategies = {
    // 快速重试策略（适合轻量级操作）
    quick: this.createStrategy('quick', {
      maxRetries: 2,
      initialDelay: 500,
      maxDelay: 3000,
      backoffFactor: 1.5
    }),
    
    // 标准重试策略（适合大部分操作）
    standard: this.createStrategy('standard', {}),
    
    // 慢速重试策略（适合重量级操作）
    slow: this.createStrategy('slow', {
      maxRetries: 5,
      initialDelay: 2000,
      maxDelay: 30000,
      backoffFactor: 1.5
    }),
    
    // 网络操作重试策略
    network: this.createStrategy('network', {
      maxRetries: 4,
      initialDelay: 1000,
      maxDelay: 15000,
      retryableErrors: [
        'NETWORK_ERROR',
        'TIMEOUT_ERROR',
        'CONNECTION_ERROR',
        'RATE_LIMIT_EXCEEDED'
      ]
    })
  }
}