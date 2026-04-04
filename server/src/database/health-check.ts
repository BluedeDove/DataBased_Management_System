import Database from 'better-sqlite3'

/**
 * 健康问题类型
 */
export type HealthIssueType = 'missing_table' | 'missing_field' | 'missing_index'

/**
 * 问题严重程度
 */
export type HealthSeverity = 'critical' | 'warning'

/**
 * 健康问题详情
 */
export interface HealthIssue {
  table: string
  type: HealthIssueType
  field?: string
  severity: HealthSeverity
  description: string
}

/**
 * 健康检查报告
 */
export interface HealthReport {
  isHealthy: boolean
  issues: HealthIssue[]
  timestamp: Date
}

/**
 * 必需的表及其必需字段
 */
const REQUIRED_TABLES: Record<string, string[]> = {
  users: ['version', 'is_deleted'],
  readers: ['version', 'is_deleted'],
  books: ['version', 'is_deleted'],
  borrowing_records: ['version', 'is_deleted'],
  book_categories: ['version', 'is_deleted'],
  reader_categories: ['version', 'is_deleted'],
  role_permissions: [],
  system_settings: [],
  ai_conversations: [],
  renewal_requests: [],
  notifications: []
}

/**
 * 可选的表（日志表）
 */
const OPTIONAL_TABLES: Record<string, string[]> = {
  operation_logs: [],
  audit_logs: []
}

/**
 * 必需的索引
 */
const REQUIRED_INDEXES: string[] = [
  'idx_readers_category',
  'idx_readers_status',
  'idx_books_category',
  'idx_books_status',
  'idx_books_title',
  'idx_books_author',
  'idx_borrowing_reader',
  'idx_borrowing_book',
  'idx_borrowing_status',
  'idx_borrowing_dates',
  'idx_ai_conversations_user',
  'idx_ai_conversations_created',
  'idx_renewal_requests_record',
  'idx_renewal_requests_status',
  'idx_notifications_recipient',
  'idx_notifications_unread'
]

/**
 * 检查数据库健康状态
 */
export function checkDatabaseHealth(db: Database.Database): HealthReport {
  const issues: HealthIssue[] = []

  // 1. 检查必需表是否存在
  for (const tableName of Object.keys(REQUIRED_TABLES)) {
    const tableExists = checkTableExists(db, tableName)
    if (!tableExists) {
      issues.push({
        table: tableName,
        type: 'missing_table',
        severity: 'critical',
        description: `缺少必要的数据表: ${tableName}`
      })
    }
  }

  // 2. 检查可选表是否存在
  for (const tableName of Object.keys(OPTIONAL_TABLES)) {
    const tableExists = checkTableExists(db, tableName)
    if (!tableExists) {
      issues.push({
        table: tableName,
        type: 'missing_table',
        severity: 'warning',
        description: `缺少可选的数据表: ${tableName}`
      })
    }
  }

  // 3. 检查表的字段完整性
  const allTables = { ...REQUIRED_TABLES, ...OPTIONAL_TABLES }
  for (const [tableName, requiredFields] of Object.entries(allTables)) {
    if (!checkTableExists(db, tableName)) {
      continue
    }

    const missingFields = detectMissingFields(db, tableName, requiredFields)
    for (const field of missingFields) {
      issues.push({
        table: tableName,
        type: 'missing_field',
        field,
        severity: 'warning',
        description: `表 ${tableName} 缺少字段: ${field}`
      })
    }
  }

  // 4. 检查必需的索引是否存在
  const existingIndexes = getExistingIndexes(db)
  for (const indexName of REQUIRED_INDEXES) {
    if (!existingIndexes.includes(indexName)) {
      issues.push({
        table: 'N/A',
        type: 'missing_index',
        severity: 'warning',
        description: `缺少索引: ${indexName}`
      })
    }
  }

  return {
    isHealthy: issues.length === 0,
    issues,
    timestamp: new Date()
  }
}

/**
 * 检查表是否存在
 */
export function checkTableExists(db: Database.Database, tableName: string): boolean {
  const result = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name = ?
  `).get(tableName)

  return result !== undefined
}

/**
 * 验证表结构
 */
export function validateTableStructure(db: Database.Database, tableName: string): boolean {
  const requiredFields = REQUIRED_TABLES[tableName] || OPTIONAL_TABLES[tableName]
  if (!requiredFields) {
    return false
  }

  if (!checkTableExists(db, tableName)) {
    return false
  }

  const missingFields = detectMissingFields(db, tableName, requiredFields)
  return missingFields.length === 0
}

/**
 * 检测表中缺失的字段
 */
export function detectMissingFields(db: Database.Database, tableName: string, requiredFields: string[]): string[] {
  const missing: string[] = []

  try {
    const tableInfo = db.prepare(`
      SELECT sql FROM sqlite_master
      WHERE type = 'table' AND name = ?
    `).get(tableName) as { sql: string } | undefined

    if (!tableInfo) {
      return requiredFields
    }

    const createSql = tableInfo.sql.toLowerCase()
    for (const field of requiredFields) {
      if (!createSql.includes(`${field.toLowerCase()}`)) {
        missing.push(field)
      }
    }
  } catch (error) {
    console.error(`检测表 ${tableName} 字段失败:`, error)
    return requiredFields
  }

  return missing
}

/**
 * 获取现有的索引列表
 */
function getExistingIndexes(db: Database.Database): string[] {
  try {
    const indexes = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type = 'index' AND name NOT LIKE 'sqlite_%'
    `).all() as Array<{ name: string }>

    return indexes.map(idx => idx.name)
  } catch (error) {
    console.error('获取索引列表失败:', error)
    return []
  }
}

/**
 * 打印健康检查报告
 */
export function printHealthReport(report: HealthReport): void {
  console.log('='.repeat(50))
  console.log('数据库健康检查报告')
  console.log('='.repeat(50))
  console.log(`检查时间: ${report.timestamp.toISOString()}`)
  console.log(`健康状态: ${report.isHealthy ? '✅ 健康' : '⚠️  存在问题'}`)
  console.log('')

  if (report.issues.length === 0) {
    console.log('✅ 所有检查项均通过，数据库结构完整。')
  } else {
    console.log(`发现 ${report.issues.length} 个问题:\n`)

    for (const issue of report.issues) {
      const severityIcon = issue.severity === 'critical' ? '🔴' : '🟡'
      console.log(`${severityIcon} [${issue.severity.toUpperCase()}] ${issue.description}`)
      if (issue.field) {
        console.log(`   表: ${issue.table}, 缺少字段: ${issue.field}`)
      } else if (issue.table !== 'N/A') {
        console.log(`   表: ${issue.table}`)
      }
      console.log('')
    }

    console.log('💡 提示: 如需修复这些问题，请调用 repairDatabase() 函数')
  }

  console.log('='.repeat(50))
}
