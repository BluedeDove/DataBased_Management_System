import { db } from '../../database'
import { ValidationError, PermissionError } from '../../lib/errorHandler'
import { logger } from '../../lib/logger'

export interface QueryResult {
  columns: string[]
  rows: any[]
  rowCount: number
}

export class SqlSearchService {
  // 只允许SELECT查询（安全限制）
  private readonly ALLOWED_KEYWORDS = ['SELECT', 'WITH']
  private readonly FORBIDDEN_KEYWORDS = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'TRUNCATE', 'EXEC', 'EXECUTE']
  private readonly MAX_ROWS = 1000

  /**
   * 执行SQL查询
   * @param query SQL查询语句
   * @returns 查询结果
   */
  executeQuery(query: string): QueryResult {
    // 验证查询不为空
    if (!query || query.trim().length === 0) {
      throw new ValidationError('SQL查询不能为空')
    }

    const normalizedQuery = query.trim().toUpperCase()

    // 检查是否包含禁止的关键词
    for (const keyword of this.FORBIDDEN_KEYWORDS) {
      if (normalizedQuery.includes(keyword)) {
        throw new PermissionError(`不允许执行${keyword}操作，只能执行SELECT查询`)
      }
    }

    // 检查是否以允许的关键词开头
    const startsWithAllowed = this.ALLOWED_KEYWORDS.some(keyword =>
      normalizedQuery.startsWith(keyword)
    )

    if (!startsWithAllowed) {
      throw new PermissionError('只允许执行SELECT或WITH查询')
    }

    try {
      logger.info('执行SQL查询', query.substring(0, 100))

      // 执行查询
      const stmt = db.prepare(query)
      const rows = stmt.all()

      // 限制返回行数
      const limitedRows = rows.slice(0, this.MAX_ROWS)

      // 获取列名
      let columns: string[] = []
      if (limitedRows.length > 0) {
        columns = Object.keys(limitedRows[0])
      }

      const result: QueryResult = {
        columns,
        rows: limitedRows,
        rowCount: limitedRows.length
      }

      logger.info(`SQL查询完成，返回${result.rowCount}行`)

      if (rows.length > this.MAX_ROWS) {
        logger.warn(`查询结果超过${this.MAX_ROWS}行，已截断`)
      }

      return result
    } catch (error: any) {
      logger.error('SQL查询失败', error.message)
      throw new ValidationError(`SQL查询错误: ${error.message}`)
    }
  }

  /**
   * 获取所有表名
   */
  getAllTables(): string[] {
    const stmt = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table'
      ORDER BY name
    `)
    const tables = stmt.all() as { name: string }[]
    return tables.map(t => t.name)
  }

  /**
   * 获取表结构
   */
  getTableSchema(tableName: string): any[] {
    const stmt = db.prepare(`PRAGMA table_info(${tableName})`)
    return stmt.all()
  }
}
