import { db } from '../database'
import { logger } from './logger'
import { AppError } from './errorHandler'

/**
 * 软删除错误
 */
export class SoftDeleteError extends AppError {
  constructor(message: string, public details?: any) {
    super(message, 'SOFT_DELETE_ERROR', details)
    this.name = 'SoftDeleteError'
  }
}

/**
 * 软删除工具类
 * 实现基于is_deleted字段的软删除功能
 */
export class SoftDeleteManager {
  /**
   * 软删除记录
   * @param tableName 表名
   * @param id 记录ID
   * @param deletedBy 删除人ID
   * @param reason 删除原因
   * @returns 是否成功
   */
  static async softDelete(
    tableName: string,
    id: number,
    deletedBy?: number,
    reason?: string
  ): Promise<boolean> {
    try {
      logger.info('执行软删除', {
        table: tableName,
        id,
        deletedBy,
        reason
      })

      // 构建更新SQL
      const updates: string[] = ['is_deleted = 1']
      const values: any[] = [id]

      if (deletedBy !== undefined) {
        updates.push('deleted_by = ?')
        values.push(deletedBy)
      }

      if (reason) {
        updates.push('delete_reason = ?')
        values.push(reason)
      }

      updates.push('deleted_at = CURRENT_TIMESTAMP')
      updates.push('updated_at = CURRENT_TIMESTAMP')

      const sql = `
        UPDATE ${tableName}
        SET ${updates.join(', ')}
        WHERE id = ? AND is_deleted = 0
      `

      const result = db.prepare(sql).run(...values)

      if (result.changes === 0) {
        logger.warn('软删除失败，记录不存在或已被删除', {
          table: tableName,
          id
        })
        return false
      }

      logger.info('软删除成功', {
        table: tableName,
        id,
        deletedBy
      })

      return true
    } catch (error) {
      logger.error('软删除异常', {
        table: tableName,
        id,
        deletedBy,
        reason,
        error
      })
      throw new SoftDeleteError('软删除失败', error)
    }
  }

  /**
   * 恢复软删除的记录
   * @param tableName 表名
   * @param id 记录ID
   * @param restoredBy 恢复人ID
   * @returns 是否成功
   */
  static async restore(
    tableName: string,
    id: number,
    restoredBy?: number
  ): Promise<boolean> {
    try {
      logger.info('恢复软删除记录', {
        table: tableName,
        id,
        restoredBy
      })

      const updates: string[] = [
        'is_deleted = 0',
        'deleted_by = NULL',
        'delete_reason = NULL',
        'deleted_at = NULL',
        'updated_at = CURRENT_TIMESTAMP'
      ]
      const values: any[] = [id]

      if (restoredBy !== undefined) {
        updates.push('restored_by = ?')
        updates.push('restored_at = CURRENT_TIMESTAMP')
        values.push(restoredBy)
      }

      const sql = `
        UPDATE ${tableName}
        SET ${updates.join(', ')}
        WHERE id = ? AND is_deleted = 1
      `

      const result = db.prepare(sql).run(...values)

      if (result.changes === 0) {
        logger.warn('恢复失败，记录不存在或未软删除', {
          table: tableName,
          id
        })
        return false
      }

      logger.info('软删除记录恢复成功', {
        table: tableName,
        id,
        restoredBy
      })

      return true
    } catch (error) {
      logger.error('恢复软删除记录异常', {
        table: tableName,
        id,
        restoredBy,
        error
      })
      throw new SoftDeleteError('恢复软删除记录失败', error)
    }
  }

  /**
   * 彻底删除记录（硬删除）
   * @param tableName 表名
   * @param id 记录ID
   * @returns 是否成功
   */
  static async hardDelete(
    tableName: string,
    id: number
  ): Promise<boolean> {
    try {
      logger.warn('执行硬删除', {
        table: tableName,
        id
      })

      const sql = `DELETE FROM ${tableName} WHERE id = ?`
      const result = db.prepare(sql).run(id)

      if (result.changes === 0) {
        logger.warn('硬删除失败，记录不存在', {
          table: tableName,
          id
        })
        return false
      }

      logger.info('硬删除成功', {
        table: tableName,
        id
      })

      return true
    } catch (error) {
      logger.error('硬删除异常', {
        table: tableName,
        id,
        error
      })
      throw new SoftDeleteError('硬删除失败', error)
    }
  }

  /**
   * 检查记录是否存在（忽略软删除状态）
   * @param tableName 表名
   * @param id 记录ID
   * @returns 是否存在
   */
  static async exists(
    tableName: string,
    id: number
  ): Promise<boolean> {
    try {
      const stmt = db.prepare(`
        SELECT id FROM ${tableName} WHERE id = ?
      `)
      const result = stmt.get(id) as { id: number } | undefined
      return !!result
    } catch (error) {
      logger.error('检查记录存在性失败', {
        table: tableName,
        id,
        error
      })
      throw new SoftDeleteError('检查记录存在性失败', error)
    }
  }

  /**
   * 检查记录是否已被软删除
   * @param tableName 表名
   * @param id 记录ID
   * @returns 是否已被删除
   */
  static async isDeleted(
    tableName: string,
    id: number
  ): Promise<boolean> {
    try {
      const stmt = db.prepare(`
        SELECT is_deleted FROM ${tableName} WHERE id = ?
      `)
      const result = stmt.get(id) as { is_deleted: boolean } | undefined
      return result?.is_deleted ?? false
    } catch (error) {
      logger.error('检查软删除状态失败', {
        table: tableName,
        id,
        error
      })
      throw new SoftDeleteError('检查软删除状态失败', error)
    }
  }

  /**
   * 获取活跃记录（未软删除）
   * @param tableName 表名
   * @param id 记录ID
   * @returns 记录数据或null
   */
  static async getActiveRecord(
    tableName: string,
    id: number
  ): Promise<any | null> {
    try {
      const stmt = db.prepare(`
        SELECT * FROM ${tableName} WHERE id = ? AND is_deleted = 0
      `)
      return stmt.get(id) || null
    } catch (error) {
      logger.error('获取活跃记录失败', {
        table: tableName,
        id,
        error
      })
      throw new SoftDeleteError('获取活跃记录失败', error)
    }
  }

  /**
   * 获取包括已删除记录在内的完整记录
   * @param tableName 表名
   * @param id 记录ID
   * @returns 记录数据或null
   */
  static async getRecordIncludingDeleted(
    tableName: string,
    id: number
  ): Promise<any | null> {
    try {
      const stmt = db.prepare(`
        SELECT * FROM ${tableName} WHERE id = ?
      `)
      return stmt.get(id) || null
    } catch (error) {
      logger.error('获取记录（包括已删除）失败', {
        table: tableName,
        id,
        error
      })
      throw new SoftDeleteError('获取记录失败', error)
    }
  }

  /**
   * 清理过期的软删除记录
   * @param tableName 表名
   * @param days 保留天数，默认30天
   * @returns 清理的记录数
   */
  static async cleanupExpiredSoftDeletes(
    tableName: string,
    days: number = 30
  ): Promise<number> {
    try {
      logger.info('清理过期软删除记录', {
        table: tableName,
        days
      })

      const sql = `
        DELETE FROM ${tableName}
        WHERE is_deleted = 1 
        AND deleted_at < datetime('now', '-${days} days')
      `

      const result = db.prepare(sql).run()
      const deletedCount = result.changes

      logger.info('过期软删除记录清理完成', {
        table: tableName,
        days,
        deletedCount
      })

      return deletedCount
    } catch (error) {
      logger.error('清理过期软删除记录失败', {
        table: tableName,
        days,
        error
      })
      throw new SoftDeleteError('清理过期软删除记录失败', error)
    }
  }

  /**
   * 获取已删除记录列表
   * @param tableName 表名
   * @param limit 限制数量
   * @param offset 偏移量
   * @returns 已删除记录列表
   */
  static async getDeletedRecords(
    tableName: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    try {
      const stmt = db.prepare(`
        SELECT * FROM ${tableName}
        WHERE is_deleted = 1
        ORDER BY deleted_at DESC
        LIMIT ? OFFSET ?
      `)

      return stmt.all(limit, offset) as any[]
    } catch (error) {
      logger.error('获取已删除记录失败', {
        table: tableName,
        limit,
        offset,
        error
      })
      throw new SoftDeleteError('获取已删除记录失败', error)
    }
  }

  /**
   * 批量软删除
   * @param tableName 表名
   * @param ids 记录ID数组
   * @param deletedBy 删除人ID
   * @param reason 删除原因
   * @returns 成功删除的记录数
   */
  static async batchSoftDelete(
    tableName: string,
    ids: number[],
    deletedBy?: number,
    reason?: string
  ): Promise<number> {
    try {
      logger.info('批量软删除', {
        table: tableName,
        count: ids.length,
        deletedBy,
        reason
      })

      const updates: string[] = [
        'is_deleted = 1',
        'deleted_at = CURRENT_TIMESTAMP',
        'updated_at = CURRENT_TIMESTAMP'
      ]
      const values: any[] = []

      if (deletedBy !== undefined) {
        updates.push('deleted_by = ?')
        values.push(deletedBy)
      }

      if (reason) {
        updates.push('delete_reason = ?')
        values.push(reason)
      }

      // 构建WHERE子句
      const placeholders = ids.map(() => '?').join(',')
      const sql = `
        UPDATE ${tableName}
        SET ${updates.join(', ')}
        WHERE id IN (${placeholders}) AND is_deleted = 0
      `

      const result = db.prepare(sql).run(...values, ...ids)

      logger.info('批量软删除完成', {
        table: tableName,
        totalIds: ids.length,
        deletedCount: result.changes
      })

      return result.changes
    } catch (error) {
      logger.error('批量软删除异常', {
        table: tableName,
        count: ids.length,
        deletedBy,
        reason,
        error
      })
      throw new SoftDeleteError('批量软删除失败', error)
    }
  }
}