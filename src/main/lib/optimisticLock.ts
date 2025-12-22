import { db } from '../database'
import { logger } from './logger'
import { AppError } from './errorHandler'

/**
 * 乐观锁版本冲突错误
 */
export class OptimisticLockError extends AppError {
  constructor(message: string, public details?: any) {
    super(message, 'OPTIMISTIC_LOCK_ERROR', details)
    this.name = 'OptimisticLockError'
  }
}

/**
 * 乐观锁工具类
 * 使用版本号（version字段）实现乐观锁控制
 * 通过CAS（Compare-And-Swap）操作确保数据一致性
 */
export class OptimisticLockManager {
  /**
   * 使用乐观锁更新记录
   * @param tableName 表名
   * @param id 记录ID
   * @param updates 更新字段
   * @param currentVersion 当前版本号
   * @returns 更新成功返回true，版本冲突返回false
   */
  static async updateWithOptimisticLock(
    tableName: string,
    id: number,
    updates: Record<string, any>,
    currentVersion: number
  ): Promise<boolean> {
    try {
      logger.debug('开始乐观锁更新', {
        table: tableName,
        id,
        currentVersion,
        updates: Object.keys(updates)
      })

      // 准备更新字段和值
      const fields: string[] = []
      const values: any[] = []

      Object.keys(updates).forEach(key => {
        if (key !== 'version' && key !== 'created_at') { // 排除系统字段
          fields.push(`${key} = ?`)
          values.push(updates[key])
        }
      })

      // 添加版本号检查和更新
      fields.push('version = ?')
      fields.push('updated_at = CURRENT_TIMESTAMP')
      values.push(currentVersion + 1, id, currentVersion)

      const sql = `
        UPDATE ${tableName} 
        SET ${fields.join(', ')}
        WHERE id = ? AND version = ?
      `

      logger.debug('执行乐观锁SQL', { sql, values })

      const result = db.prepare(sql).run(...values)

      const success = result.changes > 0

      if (success) {
        logger.info('乐观锁更新成功', {
          table: tableName,
          id,
          newVersion: currentVersion + 1
        })
      } else {
        logger.warn('乐观锁更新失败 - 版本冲突', {
          table: tableName,
          id,
          currentVersion
        })
      }

      return success
    } catch (error) {
      logger.error('乐观锁更新异常', {
        table: tableName,
        id,
        currentVersion,
        error
      })
      throw error
    }
  }

  /**
   * 获取记录当前版本号
   * @param tableName 表名
   * @param id 记录ID
   * @returns 版本号，如果记录不存在返回null
   */
  static async getCurrentVersion(
    tableName: string,
    id: number
  ): Promise<number | null> {
    try {
      const stmt = db.prepare(`
        SELECT version FROM ${tableName} WHERE id = ?
      `)
      const result = stmt.get(id) as { version: number } | undefined

      return result?.version ?? null
    } catch (error) {
      logger.error('获取版本号失败', {
        table: tableName,
        id,
        error
      })
      throw error
    }
  }

  /**
   * 检查记录是否存在且获取版本号
   * @param tableName 表名
   * @param id 记录ID
   * @returns 记录存在返回版本号，不存在返回null
   */
  static async checkRecordExists(
    tableName: string,
    id: number
  ): Promise<number | null> {
    return this.getCurrentVersion(tableName, id)
  }

  /**
   * 乐观锁更新并获取新版本
   * @param tableName 表名
   * @param id 记录ID
   * @param updates 更新字段
   * @param currentVersion 当前版本号
   * @returns 成功返回新版本号，失败返回null
   */
  static async updateAndGetNewVersion(
    tableName: string,
    id: number,
    updates: Record<string, any>,
    currentVersion: number
  ): Promise<number | null> {
    const success = await this.updateWithOptimisticLock(
      tableName,
      id,
      updates,
      currentVersion
    )

    return success ? currentVersion + 1 : null
  }

  /**
   * 原子性增加/减少数值字段（带乐观锁）
   * @param tableName 表名
   * @param id 记录ID
   * @param fieldName 字段名
   * @param delta 变化值（正数为增加，负数为减少）
   * @param currentVersion 当前版本号
   * @param minValue 最小值限制（可选）
   * @param maxValue 最大值限制（可选）
   * @returns 成功返回true，失败返回false
   */
  static async atomicUpdateNumericField(
    tableName: string,
    id: number,
    fieldName: string,
    delta: number,
    currentVersion: number,
    minValue?: number,
    maxValue?: number
  ): Promise<boolean> {
    try {
      // 构建SQL条件
      let whereCondition = 'id = ? AND version = ?'
      const params = [id, currentVersion]

      // 添加数值范围检查
      if (minValue !== undefined || maxValue !== undefined) {
        if (delta > 0) {
          // 增加操作，检查最大值
          if (maxValue !== undefined) {
            whereCondition += ` AND ${fieldName} <= ?`
            params.push(maxValue - delta)
          }
        } else if (delta < 0) {
          // 减少操作，检查最小值
          if (minValue !== undefined) {
            whereCondition += ` AND ${fieldName} >= ?`
            params.push(minValue - delta) // delta为负数，所以用减法
          }
        }
      }

      const sql = `
        UPDATE ${tableName}
        SET ${fieldName} = ${fieldName} + ?,
            version = version + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE ${whereCondition}
      `

      logger.debug('原子性数值更新', {
        table: tableName,
        id,
        field: fieldName,
        delta,
        currentVersion,
        whereCondition,
        params
      })

      const result = db.prepare(sql).run(delta, ...params)
      const success = result.changes > 0

      if (success) {
        logger.info('原子性数值更新成功', {
          table: tableName,
          id,
          field: fieldName,
          delta,
          newVersion: currentVersion + 1
        })
      } else {
        logger.warn('原子性数值更新失败', {
          table: tableName,
          id,
          field: fieldName,
          delta,
          currentVersion,
          reason: '版本冲突或数值超出限制'
        })
      }

      return success
    } catch (error) {
      logger.error('原子性数值更新异常', {
        table: tableName,
        id,
        field: fieldName,
        delta,
        currentVersion,
        error
      })
      throw error
    }
  }

  /**
   * 重试乐观锁更新操作
   * @param tableName 表名
   * @param id 记录ID
   * @param updates 更新字段
   * @param maxRetries 最大重试次数
   * @param retryCallback 重试回调函数，可以用来获取最新数据
   * @returns 成功返回新版本号，失败返回null
   */
  static async retryOptimisticUpdate(
    tableName: string,
    id: number,
    updates: Record<string, any>,
    maxRetries: number = 3,
    retryCallback?: () => Promise<any>
  ): Promise<number | null> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // 获取当前版本
        const currentVersion = await this.getCurrentVersion(tableName, id)
        if (currentVersion === null) {
          logger.warn('记录不存在，无法更新', { table: tableName, id })
          return null
        }

        // 尝试更新
        const newVersion = await this.updateAndGetNewVersion(
          tableName,
          id,
          updates,
          currentVersion
        )

        if (newVersion !== null) {
          return newVersion
        }

        // 更新失败，如果是最后一次尝试，则退出
        if (attempt === maxRetries - 1) {
          break
        }

        // 如果有重试回调，执行它来获取最新数据
        if (retryCallback) {
          await retryCallback()
        }

        logger.info('乐观锁更新失败，准备重试', {
          attempt: attempt + 1,
          maxRetries,
          table: tableName,
          id
        })

        // 短暂延迟后重试
        await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)))
      } catch (error) {
        logger.error('乐观锁重试更新异常', {
          attempt: attempt + 1,
          maxRetries,
          table: tableName,
          id,
          error
        })
        
        if (attempt === maxRetries - 1) {
          throw error
        }
      }
    }

    return null
  }
}