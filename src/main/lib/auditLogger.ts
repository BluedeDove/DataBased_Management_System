import { db } from '../database'
import { logger } from './logger'
import { AppError } from './errorHandler'

/**
 * 审计操作类型
 */
export type AuditAction = 
  | 'CREATE' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'LOGIN' 
  | 'LOGOUT' 
  | 'BORROW' 
  | 'RETURN' 
  | 'RENEW' 
  | 'VIEW' 
  | 'EXPORT' 
  | 'IMPORT' 
  | 'SEARCH'

/**
 * 审计日志接口
 */
export interface AuditLog {
  id?: number
  user_id?: number
  action: AuditAction
  table_name?: string
  record_id?: number
  old_values?: string // JSON格式
  new_values?: string // JSON格式
  ip_address?: string
  user_agent?: string
  session_id?: string
  additional_info?: string // JSON格式
  created_at?: string
}

/**
 * 审计日志错误
 */
export class AuditLoggerError extends AppError {
  constructor(message: string, public details?: any) {
    super(message, 'AUDIT_LOGGER_ERROR', details)
    this.name = 'AuditLoggerError'
  }
}

/**
 * 审计日志管理器
 * 记录所有关键操作的审计日志，支持异步记录和查询
 */
export class AuditLogger {
  private static readonly MAX_BATCH_SIZE = 100
  private static readonly FLUSH_INTERVAL = 5000 // 5秒
  private static batch: AuditLog[] = []
  private static flushTimer: NodeJS.Timeout | null = null

  /**
   * 记录审计日志
   * @param logData 审计日志数据
   */
  static async log(logData: AuditLog): Promise<void> {
    try {
      // 添加默认信息
      const enhancedLogData: AuditLog = {
        ...logData,
        created_at: new Date().toISOString()
      }

      // 添加到批处理队列
      this.batch.push(enhancedLogData)

      // 如果批处理队列已满，立即刷新
      if (this.batch.length >= this.MAX_BATCH_SIZE) {
        await this.flushBatch()
      } else if (!this.flushTimer) {
        // 启动定时刷新
        this.flushTimer = setTimeout(() => {
          this.flushBatch().catch(error => {
            logger.error('审计日志定时刷新失败', error)
          })
        }, this.FLUSH_INTERVAL)
      }

      logger.debug('审计日志已加入批处理队列', {
        action: logData.action,
        table: logData.table_name,
        recordId: logData.record_id,
        batchSize: this.batch.length
      })
    } catch (error) {
      logger.error('记录审计日志失败', {
        logData,
        error
      })
      // 审计日志失败不应该影响主要业务逻辑
    }
  }

  /**
   * 记录用户操作
   * @param userId 用户ID
   * @param action 操作类型
   * @param tableName 表名
   * @param recordId 记录ID
   * @param oldValues 旧值
   * @param newValues 新值
   * @param additionalInfo 额外信息
   */
  static async logUserAction(
    userId: number,
    action: AuditAction,
    tableName?: string,
    recordId?: number,
    oldValues?: any,
    newValues?: any,
    additionalInfo?: any
  ): Promise<void> {
    const logData: AuditLog = {
      user_id: userId,
      action,
      table_name: tableName,
      record_id: recordId,
      old_values: oldValues ? JSON.stringify(oldValues) : undefined,
      new_values: newValues ? JSON.stringify(newValues) : undefined,
      additional_info: additionalInfo ? JSON.stringify(additionalInfo) : undefined
    }

    await this.log(logData)
  }

  /**
   * 记录图书操作
   * @param userId 用户ID
   * @param action 操作类型
   * @param bookId 图书ID
   * @param oldBook 旧图书信息
   * @param newBook 新图书信息
   */
  static async logBookOperation(
    userId: number,
    action: AuditAction,
    bookId: number,
    oldBook?: any,
    newBook?: any
  ): Promise<void> {
    await this.logUserAction(
      userId,
      action,
      'books',
      bookId,
      oldBook,
      newBook
    )
  }

  /**
   * 记录读者操作
   * @param userId 用户ID
   * @param action 操作类型
   * @param readerId 读者ID
   * @param oldReader 旧读者信息
   * @param newReader 新读者信息
   */
  static async logReaderOperation(
    userId: number,
    action: AuditAction,
    readerId: number,
    oldReader?: any,
    newReader?: any
  ): Promise<void> {
    await this.logUserAction(
      userId,
      action,
      'readers',
      readerId,
      oldReader,
      newReader
    )
  }

  /**
   * 记录借阅操作
   * @param userId 用户ID
   * @param action 操作类型
   * @param borrowingId 借阅记录ID
   * @param readerId 读者ID
   * @param bookId 图书ID
   * @param additionalInfo 额外信息
   */
  static async logBorrowingOperation(
    userId: number,
    action: AuditAction,
    borrowingId: number,
    readerId: number,
    bookId: number,
    additionalInfo?: any
  ): Promise<void> {
    const info = {
      ...additionalInfo,
      readerId,
      bookId
    }

    await this.logUserAction(
      userId,
      action,
      'borrowing_records',
      borrowingId,
      undefined,
      undefined,
      info
    )
  }

  /**
   * 记录用户登录
   * @param userId 用户ID
   * @param ipAddress IP地址
   * @param userAgent 用户代理
   * @param sessionId 会话ID
   */
  static async logLogin(
    userId: number,
    ipAddress?: string,
    userAgent?: string,
    sessionId?: string
  ): Promise<void> {
    const logData: AuditLog = {
      user_id: userId,
      action: 'LOGIN',
      ip_address: ipAddress,
      user_agent: userAgent,
      session_id: sessionId
    }

    await this.log(logData)
  }

  /**
   * 记录用户登出
   * @param userId 用户ID
   * @param sessionId 会话ID
   */
  static async logLogout(
    userId: number,
    sessionId?: string
  ): Promise<void> {
    const logData: AuditLog = {
      user_id: userId,
      action: 'LOGOUT',
      session_id: sessionId
    }

    await this.log(logData)
  }

  /**
   * 强制刷新批处理队列
   */
  static async flushBatch(): Promise<void> {
    if (this.batch.length === 0) {
      return
    }

    const batchToFlush = [...this.batch]
    this.batch = []

    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }

    try {
      const stmt = db.prepare(`
        INSERT INTO audit_logs (
          user_id, action, table_name, record_id, old_values, new_values,
          ip_address, user_agent, session_id, additional_info, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const transaction = db.transaction((logs: AuditLog[]) => {
        for (const log of logs) {
          stmt.run(
            log.user_id,
            log.action,
            log.table_name,
            log.record_id,
            log.old_values,
            log.new_values,
            log.ip_address,
            log.user_agent,
            log.session_id,
            log.additional_info,
            log.created_at
          )
        }
      })

      transaction(batchToFlush)

      logger.info('审计日志批处理写入成功', {
        batchSize: batchToFlush.length
      })
    } catch (error) {
      logger.error('审计日志批处理写入失败', {
        batchSize: batchToFlush.length,
        error
      })

      // 重新加入队列等待下次重试
      this.batch.unshift(...batchToFlush)
      throw error
    }
  }

  /**
   * 查询审计日志
   * @param filters 查询条件
   * @param page 页码
   * @param pageSize 每页大小
   * @returns 审计日志列表
   */
  static async queryLogs(
    filters: {
      user_id?: number
      action?: AuditAction
      table_name?: string
      record_id?: number
      date_from?: string
      date_to?: string
    } = {},
    page: number = 1,
    pageSize: number = 50
  ): Promise<{ logs: AuditLog[], total: number }> {
    try {
      const whereConditions: string[] = []
      const params: any[] = []

      if (filters.user_id) {
        whereConditions.push('user_id = ?')
        params.push(filters.user_id)
      }

      if (filters.action) {
        whereConditions.push('action = ?')
        params.push(filters.action)
      }

      if (filters.table_name) {
        whereConditions.push('table_name = ?')
        params.push(filters.table_name)
      }

      if (filters.record_id) {
        whereConditions.push('record_id = ?')
        params.push(filters.record_id)
      }

      if (filters.date_from) {
        whereConditions.push('created_at >= ?')
        params.push(filters.date_from)
      }

      if (filters.date_to) {
        whereConditions.push('created_at <= ?')
        params.push(filters.date_to)
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : ''

      // 查询总数
      const countStmt = db.prepare(`
        SELECT COUNT(*) as total FROM audit_logs ${whereClause}
      `)
      const countResult = countStmt.get(...params) as { total: number }
      const total = countResult.total

      // 查询分页数据
      const offset = (page - 1) * pageSize
      const selectStmt = db.prepare(`
        SELECT * FROM audit_logs 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `)

      const logs = selectStmt.all(...params, pageSize, offset) as AuditLog[]

      logger.debug('查询审计日志', {
        filters,
        page,
        pageSize,
        total,
        resultCount: logs.length
      })

      return { logs, total }
    } catch (error) {
      logger.error('查询审计日志失败', { filters, page, pageSize, error })
      throw new AuditLoggerError('查询审计日志失败', error)
    }
  }

  /**
   * 获取用户活动统计
   * @param userId 用户ID
   * @param days 统计天数
   * @returns 活动统计
   */
  static async getUserActivityStats(
    userId: number,
    days: number = 30
  ): Promise<{
    total_actions: number
    action_breakdown: Record<string, number>
    daily_activity: Array<{ date: string, count: number }>
  }> {
    try {
      const dateFrom = new Date()
      dateFrom.setDate(dateFrom.getDate() - days)
      const dateFromStr = dateFrom.toISOString().split('T')[0]

      // 总操作数
      const totalStmt = db.prepare(`
        SELECT COUNT(*) as count FROM audit_logs 
        WHERE user_id = ? AND created_at >= ?
      `)
      const totalResult = totalStmt.get(userId, dateFromStr) as { count: number }
      const total_actions = totalResult.count

      // 操作类型统计
      const breakdownStmt = db.prepare(`
        SELECT action, COUNT(*) as count 
        FROM audit_logs 
        WHERE user_id = ? AND created_at >= ?
        GROUP BY action
        ORDER BY count DESC
      `)
      const breakdownResults = breakdownStmt.all(userId, dateFromStr) as Array<{ action: string, count: number }>
      const action_breakdown: Record<string, number> = {}
      breakdownResults.forEach(result => {
        action_breakdown[result.action] = result.count
      })

      // 每日活动统计
      const dailyStmt = db.prepare(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count
        FROM audit_logs 
        WHERE user_id = ? AND created_at >= ?
        GROUP BY DATE(created_at)
        ORDER BY date
      `)
      const dailyResults = dailyStmt.all(userId, dateFromStr) as Array<{ date: string, count: number }>

      logger.debug('获取用户活动统计', {
        userId,
        days,
        total_actions,
        actionTypes: Object.keys(action_breakdown).length,
        dailyRecords: dailyResults.length
      })

      return {
        total_actions,
        action_breakdown,
        daily_activity: dailyResults
      }
    } catch (error) {
      logger.error('获取用户活动统计失败', { userId, days, error })
      throw new AuditLoggerError('获取用户活动统计失败', error)
    }
  }

  /**
   * 清理过期审计日志
   * @param days 保留天数，默认365天
   * @returns 清理的记录数
   */
  static async cleanupOldLogs(days: number = 365): Promise<number> {
    try {
      const stmt = db.prepare(`
        DELETE FROM audit_logs
        WHERE created_at < datetime('now', '-${days} days')
      `)

      const result = stmt.run()
      const deletedCount = result.changes

      logger.info('清理过期审计日志', {
        days,
        deletedCount
      })

      return deletedCount
    } catch (error) {
      logger.error('清理过期审计日志失败', { days, error })
      throw new AuditLoggerError('清理过期审计日志失败', error)
    }
  }

  /**
   * 获取系统活动概览
   * @param days 统计天数
   * @returns 系统活动概览
   */
  static async getSystemActivityOverview(days: number = 7): Promise<{
    total_logs: number
    active_users: number
    top_actions: Array<{ action: string, count: number }>
    top_tables: Array<{ table_name: string, count: number }>
  }> {
    try {
      const dateFrom = new Date()
      dateFrom.setDate(dateFrom.getDate() - days)
      const dateFromStr = dateFrom.toISOString()

      // 总日志数
      const totalStmt = db.prepare(`
        SELECT COUNT(*) as count FROM audit_logs WHERE created_at >= ?
      `)
      const totalResult = totalStmt.get(dateFromStr) as { count: number }
      const total_logs = totalResult.count

      // 活跃用户数
      const usersStmt = db.prepare(`
        SELECT COUNT(DISTINCT user_id) as count 
        FROM audit_logs 
        WHERE created_at >= ? AND user_id IS NOT NULL
      `)
      const usersResult = usersStmt.get(dateFromStr) as { count: number }
      const active_users = usersResult.count

      // 热门操作
      const actionsStmt = db.prepare(`
        SELECT action, COUNT(*) as count 
        FROM audit_logs 
        WHERE created_at >= ?
        GROUP BY action
        ORDER BY count DESC
        LIMIT 5
      `)
      const top_actions = actionsStmt.all(dateFromStr) as Array<{ action: string, count: number }>

      // 热门表
      const tablesStmt = db.prepare(`
        SELECT table_name, COUNT(*) as count 
        FROM audit_logs 
        WHERE created_at >= ? AND table_name IS NOT NULL
        GROUP BY table_name
        ORDER BY count DESC
        LIMIT 5
      `)
      const top_tables = tablesStmt.all(dateFromStr) as Array<{ table_name: string, count: number }>

      logger.debug('获取系统活动概览', {
        days,
        total_logs,
        active_users,
        topActions: top_actions.length,
        topTables: top_tables.length
      })

      return {
        total_logs,
        active_users,
        top_actions,
        top_tables
      }
    } catch (error) {
      logger.error('获取系统活动概览失败', { days, error })
      throw new AuditLoggerError('获取系统活动概览失败', error)
    }
  }

  /**
   * 启动定期清理
   */
  static startPeriodicCleanup(): void {
    // 每天凌晨2点执行清理
    const scheduleCleanup = () => {
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(2, 0, 0, 0)

      const timeUntilCleanup = tomorrow.getTime() - now.getTime()

      setTimeout(async () => {
        try {
          await this.cleanupOldLogs()
        } catch (error) {
          logger.error('定期清理审计日志失败', error)
        } finally {
          scheduleCleanup() // 重新调度
        }
      }, timeUntilCleanup)
    }

    scheduleCleanup()
    logger.info('审计日志定期清理已启动')
  }
}