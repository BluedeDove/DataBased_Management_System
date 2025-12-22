import { db } from '../database'
import { logger } from './logger'
import { AppError } from './errorHandler'
import crypto from 'crypto'

/**
 * 操作日志状态
 */
export type OperationStatus = 'pending' | 'committed' | 'rolled_back' | 'failed'

/**
 * 操作类型
 */
export type OperationType = 'INSERT' | 'UPDATE' | 'DELETE'

/**
 * 操作日志接口
 */
export interface OperationLog {
  id?: number
  operation_id: string
  table_name: string
  record_id: number
  operation_type: OperationType
  old_data?: string // JSON格式
  new_data?: string // JSON格式
  status: OperationStatus
  created_by?: number
  created_at?: string
  committed_at?: string | null
  rolled_back_at?: string | null
  error_message?: string
}

/**
 * 操作日志错误
 */
export class OperationLogError extends AppError {
  constructor(message: string, public details?: any) {
    super(message, 'OPERATION_LOG_ERROR', details)
    this.name = 'OperationLogError'
  }
}

/**
 * 预写日志（Write-Ahead Logging）管理器
 * 实现操作日志记录和两阶段提交机制
 */
export class OperationLogger {
  private static readonly MAX_RETRY_ATTEMPTS = 3

  /**
   * 生成UUID
   */
  static generateUUID(): string {
    return crypto.randomUUID()
  }

  /**
   * 生成操作ID
   */
  static generateOperationId(): string {
    return `op_${this.generateUUID()}`
  }

  /**
   * 创建操作日志（阶段1：预写日志）
   * @param operationId 操作唯一标识
   * @param tableName 表名
   * @param recordId 记录ID
   * @param operationType 操作类型
   * @param oldData 旧数据（JSON格式）
   * @param newData 新数据（JSON格式）
   * @param createdBy 操作人ID
   * @returns 操作日志ID
   */
  static async createOperationLog(
    operationId: string,
    tableName: string,
    recordId: number,
    operationType: OperationType,
    oldData?: string,
    newData?: string,
    createdBy?: number
  ): Promise<number> {
    try {
      logger.info('创建操作日志', {
        operationId,
        tableName,
        recordId,
        operationType,
        createdBy
      })

      const stmt = db.prepare(`
        INSERT INTO operation_logs (
          operation_id, table_name, record_id, operation_type,
          old_data, new_data, status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
      `)

      const result = stmt.run(
        operationId,
        tableName,
        recordId,
        operationType,
        oldData,
        newData,
        createdBy
      )

      const logId = result.lastInsertRowid as number

      logger.info('操作日志创建成功', {
        operationId,
        logId,
        tableName,
        recordId
      })

      return logId
    } catch (error) {
      logger.error('创建操作日志失败', {
        operationId,
        tableName,
        recordId,
        operationType,
        error
      })
      throw new OperationLogError('创建操作日志失败', error)
    }
  }

  /**
   * 更新操作日志状态为已提交
   * @param operationId 操作ID
   */
  static async markAsCommitted(operationId: string): Promise<void> {
    try {
      const stmt = db.prepare(`
        UPDATE operation_logs
        SET status = 'committed', committed_at = CURRENT_TIMESTAMP
        WHERE operation_id = ?
      `)

      const result = stmt.run(operationId)

      if (result.changes === 0) {
        logger.warn('未找到操作日志，可能已被处理', { operationId })
        return
      }

      logger.info('操作日志标记为已提交', { operationId })
    } catch (error) {
      logger.error('标记操作日志为已提交失败', {
        operationId,
        error
      })
      throw new OperationLogError('标记操作日志为已提交失败', error)
    }
  }

  /**
   * 更新操作日志状态为已回滚
   * @param operationId 操作ID
   * @param errorMessage 错误信息
   */
  static async markAsRolledBack(
    operationId: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      const stmt = db.prepare(`
        UPDATE operation_logs
        SET status = 'rolled_back', 
            rolled_back_at = CURRENT_TIMESTAMP,
            error_message = ?
        WHERE operation_id = ?
      `)

      const result = stmt.run(errorMessage || null, operationId)

      if (result.changes === 0) {
        logger.warn('未找到操作日志，可能已被处理', { operationId })
        return
      }

      logger.info('操作日志标记为已回滚', { operationId, errorMessage })
    } catch (error) {
      logger.error('标记操作日志为已回滚失败', {
        operationId,
        errorMessage,
        error
      })
      throw new OperationLogError('标记操作日志为已回滚失败', error)
    }
  }

  /**
   * 标记操作日志为失败
   * @param operationId 操作ID
   * @param errorMessage 错误信息
   */
  static async markAsFailed(
    operationId: string,
    errorMessage: string
  ): Promise<void> {
    try {
      const stmt = db.prepare(`
        UPDATE operation_logs
        SET status = 'failed', error_message = ?
        WHERE operation_id = ?
      `)

      const result = stmt.run(errorMessage, operationId)

      if (result.changes === 0) {
        logger.warn('未找到操作日志，可能已被处理', { operationId })
        return
      }

      logger.warn('操作日志标记为失败', { operationId, errorMessage })
    } catch (error) {
      logger.error('标记操作日志为失败失败', {
        operationId,
        errorMessage,
        error
      })
      throw new OperationLogError('标记操作日志为失败失败', error)
    }
  }

  /**
   * 获取操作日志
   * @param operationId 操作ID
   * @returns 操作日志对象
   */
  static async getOperationLog(operationId: string): Promise<OperationLog | null> {
    try {
      const stmt = db.prepare(`
        SELECT * FROM operation_logs WHERE operation_id = ?
      `)

      const result = stmt.get(operationId) as OperationLog | undefined
      return result || null
    } catch (error) {
      logger.error('获取操作日志失败', { operationId, error })
      throw new OperationLogError('获取操作日志失败', error)
    }
  }

  /**
   * 两阶段提交执行器
   * @param operationId 操作ID
   * @param tableName 表名
   * @param recordId 记录ID
   * @param operationType 操作类型
   * @param oldData 旧数据（JSON格式）
   * @param newData 新数据（JSON格式）
   * @param createdBy 操作人ID
   * @param executeAction 实际执行操作的函数
   * @returns 执行结果
   */
  static async executeWithTwoPhaseCommit<T>(
    operationId: string,
    tableName: string,
    recordId: number,
    operationType: OperationType,
    oldData: string | undefined,
    newData: string | undefined,
    createdBy: number | undefined,
    executeAction: () => Promise<T>
  ): Promise<T> {
    let logId: number | null = null

    try {
      // 阶段1：预写日志
      logId = await this.createOperationLog(
        operationId,
        tableName,
        recordId,
        operationType,
        oldData,
        newData,
        createdBy
      )

      // 阶段2：执行实际操作
      logger.info('开始执行实际操作', {
        operationId,
        tableName,
        recordId,
        operationType
      })

      const result = await executeAction()

      // 操作成功，标记日志为已提交
      await this.markAsCommitted(operationId)

      logger.info('两阶段提交成功', {
        operationId,
        tableName,
        recordId,
        operationType
      })

      return result
    } catch (error) {
      logger.error('两阶段提交失败', {
        operationId,
        tableName,
        recordId,
        operationType,
        error
      })

      // 操作失败，标记日志为已回滚
      const errorMessage = error instanceof Error ? error.message : String(error)
      await this.markAsRolledBack(operationId, errorMessage)

      throw error
    }
  }

  /**
   * 清理过期的操作日志
   * @param days 保留天数，默认7天
   * @returns 清理的记录数
   */
  static async cleanupExpiredLogs(days: number = 7): Promise<number> {
    try {
      const stmt = db.prepare(`
        DELETE FROM operation_logs
        WHERE status IN ('committed', 'rolled_back', 'failed')
        AND created_at < datetime('now', '-${days} days')
      `)

      const result = stmt.run()
      const deletedCount = result.changes

      logger.info('清理过期操作日志', {
        days,
        deletedCount
      })

      return deletedCount
    } catch (error) {
      logger.error('清理过期操作日志失败', { days, error })
      throw new OperationLogError('清理过期操作日志失败', error)
    }
  }

  /**
   * 获取未完成的操作（用于恢复）
   * @returns 未完成的操作日志列表
   */
  static async getPendingOperations(): Promise<OperationLog[]> {
    try {
      const stmt = db.prepare(`
        SELECT * FROM operation_logs
        WHERE status = 'pending'
        ORDER BY created_at ASC
      `)

      return stmt.all() as OperationLog[]
    } catch (error) {
      logger.error('获取未完成操作失败', { error })
      throw new OperationLogError('获取未完成操作失败', error)
    }
  }

  /**
   * 批量恢复未完成的操作
   * @param maxOperations 最大处理数量
   * @returns 处理的记录数
   */
  static async recoverPendingOperations(maxOperations: number = 100): Promise<number> {
    try {
      const pendingOps = await this.getPendingOperations()
      const toRecover = pendingOps.slice(0, maxOperations)

      logger.info('开始恢复未完成的操作', {
        totalPending: pendingOps.length,
        toRecover: toRecover.length
      })

      let recoveredCount = 0

      for (const operation of toRecover) {
        try {
          // 对于已过期的pending操作，直接标记为失败
          const operationAge = Date.now() - new Date(operation.created_at!).getTime()
          const maxAge = 24 * 60 * 60 * 1000 // 24小时

          if (operationAge > maxAge) {
            await this.markAsFailed(
              operation.operation_id,
              '恢复时标记为失败：操作超时'
            )
            recoveredCount++
          }
        } catch (error) {
          logger.error('恢复单个操作失败', {
            operationId: operation.operation_id,
            error
          })
        }
      }

      logger.info('批量恢复未完成操作完成', {
        recoveredCount,
        totalPending: pendingOps.length
      })

      return recoveredCount
    } catch (error) {
      logger.error('批量恢复未完成操作失败', { error })
      throw new OperationLogError('批量恢复未完成操作失败', error)
    }
  }

  /**
   * 重试机制包装器
   * @param operationId 操作ID
   * @param action 要执行的操作
   * @param maxRetries 最大重试次数
   * @returns 操作结果
   */
  static async retryOperation<T>(
    operationId: string,
    action: () => Promise<T>,
    maxRetries: number = this.MAX_RETRY_ATTEMPTS
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await action()
      } catch (error) {
        lastError = error as Error

        // 如果是最后一次尝试
        if (attempt === maxRetries) {
          await this.markAsFailed(operationId, lastError.message)
          break
        }

        // 计算延迟时间（指数退避）
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000)
        
        logger.warn('操作重试', {
          operationId,
          attempt: attempt + 1,
          maxRetries,
          delay,
          error: lastError.message
        })

        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw lastError!
  }
}