import { db } from './index'
import { logger } from '../lib/logger'

/**
 * 数据库迁移管理器
 * 处理从旧版本到新版本的数据库结构迁移
 */
export class DatabaseMigration {
  /**
   * 检查并执行必要的数据库迁移
   */
  static async migrate(): Promise<void> {
    try {
      logger.info('开始数据库迁移检查...')
      
      // 检查数据库版本
      const currentVersion = await this.getCurrentVersion()
      const targetVersion = 2 // 新版本号
      
      logger.info(`当前数据库版本: ${currentVersion}, 目标版本: ${targetVersion}`)
      
      if (currentVersion < targetVersion) {
        logger.info(`开始从版本 ${currentVersion} 迁移到版本 ${targetVersion}...`)
        
        await this.migrateToVersion2()
        
        // 更新数据库版本
        await this.updateVersion(targetVersion)
        
        logger.info('数据库迁移完成')
      } else {
        logger.info('数据库已是最新版本')
      }
    } catch (error) {
      logger.error('数据库迁移失败', error)
      throw error
    }
  }

  /**
   * 获取当前数据库版本
   */
  private static async getCurrentVersion(): Promise<number> {
    try {
      // 检查是否存在数据库版本表
      const versionTableExists = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type = 'table' AND name = 'database_version'
      `).get()

      if (!versionTableExists) {
        return 1 // 默认版本为1
      }

      const result = db.prepare(`
        SELECT version FROM database_version ORDER BY id DESC LIMIT 1
      `).get() as { version: number } | undefined

      return result?.version || 1
    } catch (error) {
      logger.warn('无法获取数据库版本，默认为1', error)
      return 1
    }
  }

  /**
   * 更新数据库版本
   */
  private static async updateVersion(version: number): Promise<void> {
    // 创建版本表（如果不存在）
    db.exec(`
      CREATE TABLE IF NOT EXISTS database_version (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version INTEGER NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        notes TEXT
      )
    `)

    // 插入新版本记录
    db.prepare(`
      INSERT INTO database_version (version, notes)
      VALUES (?, ?)
    `).run(version, `迁移到版本 ${version}`)
  }

  /**
   * 迁移到版本2：添加乐观锁、软删除和审计功能
   */
  private static async migrateToVersion2(): Promise<void> {
    logger.info('开始版本2迁移...')

    // 1. 添加乐观锁版本字段
    await this.addOptimisticLockFields()

    // 2. 添加软删除字段
    await this.addSoftDeleteFields()

    // 3. 创建操作日志表
    await this.createOperationLogsTable()

    // 4. 创建审计日志表
    await this.createAuditLogsTable()

    // 5. 创建索引
    await this.createIndexes()

    logger.info('版本2迁移完成')
  }

  /**
   * 添加乐观锁版本字段
   */
  private static async addOptimisticLockFields(): Promise<void> {
    const tables = ['users', 'readers', 'books', 'borrowing_records', 'book_categories', 'reader_categories']
    
    for (const table of tables) {
      try {
        // 检查是否已存在version字段
        const tableInfo = db.prepare(`
          SELECT sql FROM sqlite_master 
          WHERE type = 'table' AND name = ?
        `).get(table) as { sql: string } | undefined

        if (tableInfo && !tableInfo.sql.includes('version INTEGER')) {
          logger.info(`添加乐观锁版本字段到 ${table} 表...`)
          
          db.exec(`
            ALTER TABLE ${table} 
            ADD COLUMN version INTEGER DEFAULT 1
          `)
          
          logger.info(`${table} 表版本字段添加完成`)
        }
      } catch (error) {
        logger.warn(`为表 ${table} 添加版本字段失败`, error)
      }
    }
  }

  /**
   * 添加软删除字段
   */
  private static async addSoftDeleteFields(): Promise<void> {
    const tables = ['users', 'readers', 'books', 'borrowing_records', 'book_categories', 'reader_categories']
    
    for (const table of tables) {
      try {
        // 检查是否已存在is_deleted字段
        const tableInfo = db.prepare(`
          SELECT sql FROM sqlite_master 
          WHERE type = 'table' AND name = ?
        `).get(table) as { sql: string } | undefined

        if (tableInfo && !tableInfo.sql.includes('is_deleted BOOLEAN')) {
          logger.info(`添加软删除字段到 ${table} 表...`)
          
          db.exec(`
            ALTER TABLE ${table} 
            ADD COLUMN is_deleted BOOLEAN DEFAULT 0
          `)
          
          logger.info(`${table} 表软删除字段添加完成`)
        }
      } catch (error) {
        logger.warn(`为表 ${table} 添加软删除字段失败`, error)
      }
    }
  }

  /**
   * 创建操作日志表
   */
  private static async createOperationLogsTable(): Promise<void> {
    try {
      logger.info('创建操作日志表...')
      
      db.exec(`
        CREATE TABLE IF NOT EXISTS operation_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          operation_id TEXT UNIQUE NOT NULL,
          table_name TEXT NOT NULL,
          record_id INTEGER NOT NULL,
          operation_type TEXT NOT NULL CHECK(operation_type IN ('INSERT', 'UPDATE', 'DELETE')),
          old_data TEXT,
          new_data TEXT,
          status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'committed', 'rolled_back', 'failed')),
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          committed_at DATETIME,
          rolled_back_at DATETIME,
          error_message TEXT,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        )
      `)
      
      logger.info('操作日志表创建完成')
    } catch (error) {
      logger.error('创建操作日志表失败', error)
      throw error
    }
  }

  /**
   * 创建审计日志表
   */
  private static async createAuditLogsTable(): Promise<void> {
    try {
      logger.info('创建审计日志表...')
      
      db.exec(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          action TEXT NOT NULL,
          table_name TEXT,
          record_id INTEGER,
          old_values TEXT,
          new_values TEXT,
          ip_address TEXT,
          user_agent TEXT,
          session_id TEXT,
          additional_info TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
      `)
      
      logger.info('审计日志表创建完成')
    } catch (error) {
      logger.error('创建审计日志表失败', error)
      throw error
    }
  }

  /**
   * 创建必要的索引
   */
  private static async createIndexes(): Promise<void> {
    try {
      logger.info('创建索引...')
      
      const indexes = [
        // 操作日志索引
        'CREATE INDEX IF NOT EXISTS idx_operation_logs_operation_id ON operation_logs(operation_id)',
        'CREATE INDEX IF NOT EXISTS idx_operation_logs_status ON operation_logs(status)',
        'CREATE INDEX IF NOT EXISTS idx_operation_logs_created_at ON operation_logs(created_at)',
        
        // 审计日志索引
        'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)',
        'CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name)',
        'CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)',
        
        // 软删除查询优化索引
        'CREATE INDEX IF NOT EXISTS idx_books_is_deleted ON books(is_deleted)',
        'CREATE INDEX IF NOT EXISTS idx_readers_is_deleted ON readers(is_deleted)',
        'CREATE INDEX IF NOT EXISTS idx_users_is_deleted ON users(is_deleted)',
        'CREATE INDEX IF NOT EXISTS idx_borrowing_records_is_deleted ON borrowing_records(is_deleted)',
        
        // 乐观锁索引
        'CREATE INDEX IF NOT EXISTS idx_books_version ON books(version)',
        'CREATE INDEX IF NOT EXISTS idx_borrowing_records_version ON borrowing_records(version)'
      ]

      for (const indexSql of indexes) {
        try {
          db.exec(indexSql)
        } catch (error) {
          logger.warn('创建索引失败', { sql: indexSql, error })
        }
      }
      
      logger.info('索引创建完成')
    } catch (error) {
      logger.error('创建索引失败', error)
      throw error
    }
  }

  /**
   * 获取迁移状态
   */
  static async getMigrationStatus(): Promise<{
    currentVersion: number
    migrations: Array<{
      version: number
      applied_at: string
      notes?: string
    }>
  }> {
    try {
      const currentVersion = await this.getCurrentVersion()
      
      const migrations = db.prepare(`
        SELECT version, applied_at, notes 
        FROM database_version 
        ORDER BY id ASC
      `).all() as Array<{ version: number, applied_at: string, notes?: string }>
      
      return {
        currentVersion,
        migrations
      }
    } catch (error) {
      logger.error('获取迁移状态失败', error)
      return {
        currentVersion: 1,
        migrations: []
      }
    }
  }

  /**
   * 验证数据库完整性
   */
  static async validateDatabase(): Promise<{
    isValid: boolean
    issues: string[]
  }> {
    const issues: string[] = []
    
    try {
      // 检查必要表是否存在
      const requiredTables = [
        'users', 'readers', 'books', 'borrowing_records', 
        'book_categories', 'reader_categories', 'operation_logs', 'audit_logs'
      ]
      
      for (const table of requiredTables) {
        const exists = db.prepare(`
          SELECT name FROM sqlite_master 
          WHERE type = 'table' AND name = ?
        `).get(table)
        
        if (!exists) {
          issues.push(`缺少必要的数据表: ${table}`)
        }
      }
      
      // 检查乐观锁字段
      const optimisticTables = ['books', 'borrowing_records']
      for (const table of optimisticTables) {
        const tableInfo = db.prepare(`
          SELECT sql FROM sqlite_master 
          WHERE type = 'table' AND name = ?
        `).get(table) as { sql: string } | undefined
        
        if (tableInfo && !tableInfo.sql.includes('version INTEGER')) {
          issues.push(`表 ${table} 缺少乐观锁版本字段`)
        }
      }
      
      // 检查软删除字段
      const softDeleteTables = ['users', 'readers', 'books', 'borrowing_records']
      for (const table of softDeleteTables) {
        const tableInfo = db.prepare(`
          SELECT sql FROM sqlite_master 
          WHERE type = 'table' AND name = ?
        `).get(table) as { sql: string } | undefined
        
        if (tableInfo && !tableInfo.sql.includes('is_deleted BOOLEAN')) {
          issues.push(`表 ${table} 缺少软删除字段`)
        }
      }
      
    } catch (error) {
      issues.push(`数据库验证异常: ${error instanceof Error ? error.message : String(error)}`)
    }
    
    return {
      isValid: issues.length === 0,
      issues
    }
  }
}