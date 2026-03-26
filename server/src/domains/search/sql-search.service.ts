import { db } from '../../database'
import { logger } from '../../lib/logger'
import { ValidationError } from '../../lib/errorHandler'

export class SqlSearchService {
  // 禁止的关键字（防止危险操作）
  private static FORBIDDEN_KEYWORDS = [
    'DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE', 'INSERT', 'UPDATE',
    'GRANT', 'REVOKE', 'EXEC', 'EXECUTE', 'INTO', 'OUTFILE', 'LOAD_FILE'
  ]

  // 允许查询的表
  private static ALLOWED_TABLES = [
    'users', 'readers', 'reader_categories', 'books', 'book_categories',
    'borrowing_records', 'role_permissions', 'system_settings', 'ai_conversations'
  ]

  private validateQuery(query: string): { valid: boolean; error?: string } {
    const upperQuery = query.toUpperCase().trim()

    // 检查禁止的关键字
    for (const keyword of SqlSearchService.FORBIDDEN_KEYWORDS) {
      if (upperQuery.includes(keyword)) {
        return { valid: false, error: `禁止使用关键字: ${keyword}` }
      }
    }

    // 只允许 SELECT 语句
    if (!upperQuery.startsWith('SELECT')) {
      return { valid: false, error: '只允许执行 SELECT 查询' }
    }

    return { valid: true }
  }

  executeQuery(query: string): { rows: any[]; columns: string[] } {
    logger.info('执行SQL查询', { query })

    const validation = this.validateQuery(query)
    if (!validation.valid) {
      throw new ValidationError(validation.error || '无效的查询')
    }

    try {
      const stmt = db.prepare(query)
      const rows = stmt.all() as any[]

      // 获取列名
      const columns = rows.length > 0 ? Object.keys(rows[0]) : []

      logger.info('SQL查询完成', { rowCount: rows.length })
      return { rows, columns }
    } catch (error: any) {
      logger.error('SQL查询失败', error)
      throw new ValidationError(`SQL执行错误: ${error.message}`)
    }
  }

  getAllTables(): Array<{ name: string; type: string }> {
    const tables = db.prepare(`
      SELECT name, type FROM sqlite_master
      WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%'
      ORDER BY type, name
    `).all() as Array<{ name: string; type: string }>

    return tables.filter(t => SqlSearchService.ALLOWED_TABLES.includes(t.name))
  }

  getTableSchema(tableName: string): { name: string; columns: Array<{ name: string; type: string; notnull: boolean; pk: boolean }> } {
    if (!SqlSearchService.ALLOWED_TABLES.includes(tableName)) {
      throw new ValidationError(`不允许访问表: ${tableName}`)
    }

    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{
      name: string
      type: string
      notnull: number
      pk: number
    }>

    return {
      name: tableName,
      columns: columns.map(col => ({
        name: col.name,
        type: col.type,
        notnull: col.notnull === 1,
        pk: col.pk === 1
      }))
    }
  }
}
