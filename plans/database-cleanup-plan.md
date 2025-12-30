# 数据库目录整理计划

## 概述
整理 `src/main/database` 目录，移除版本迁移逻辑，替换为功能检测和手动修复机制。

## 当前状态分析

### 现有文件
| 文件 | 状态 | 说明 |
|------|------|------|
| `index.ts` | ✅ 使用中 | 主数据库文件，包含初始化和迁移逻辑 |
| `index-enhanced.ts` | ❌ 未使用 | 增强版（缺少AI表和部分索引） |
| `index-backup.ts` | ❌ 未使用 | 备份文件（缺少迁移调用） |
| `migration.ts` | ❌ 待删除 | 版本迁移模块（将被功能检测替代） |

### 外部调用
所有模块通过 `from '../database'` 导入：
- `db` - 数据库连接实例
- `setupDatabase()` - 数据库初始化函数

## 设计目标

1. **移除版本迁移**：删除 `migration.ts` 中的版本号管理
2. **功能检测**：检查表结构是否包含必需字段（乐观锁、软删除等）
3. **手动修复**：提供 `repairDatabase()` 函数供手动触发修复
4. **保持兼容**：确保所有外部调用不受影响

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                      外部调用模块                             │
│  (auth, book, reader, borrowing, ai, config, search, etc.)   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ 导入 db, setupDatabase()
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    src/main/database/                         │
├─────────────────────────────────────────────────────────────┤
│  index.ts (主入口)                                           │
│  ├── db: Database                                          │
│  ├── setupDatabase()                                       │
│  │   ├── initDatabase()                                    │
│  │   ├── seedDatabase()                                    │
│  │   ├── fixAdminPassword()                                │
│  │   └── checkDatabaseHealth()                             │
│  └── repairDatabase() [新增]                               │
├─────────────────────────────────────────────────────────────┤
│  health-check.ts [新增]                                     │
│  ├── checkDatabaseHealth()                                 │
│  ├── validateTableStructure()                              │
│  ├── detectMissingFields()                                 │
│  └── HealthReport                                          │
└─────────────────────────────────────────────────────────────┘
```

## 实施计划

### 1. 创建健康检查模块 (`health-check.ts`)

```typescript
// 功能定义
interface HealthReport {
  isHealthy: boolean
  issues: HealthIssue[]
  timestamp: Date
}

interface HealthIssue {
  table: string
  type: 'missing_table' | 'missing_field' | 'missing_index'
  field?: string
  severity: 'critical' | 'warning'
  description: string
}

// 导出函数
export function checkDatabaseHealth(): HealthReport
export function validateTableStructure(tableName: string): boolean
export function detectMissingFields(tableName: string): string[]
```

### 2. 重构 `index.ts`

#### 2.1 移除的内容
- `import { DatabaseMigration } from './migration'`
- `DatabaseMigration.migrate()` 调用

#### 2.2 保留的内容
- `db` 连接实例
- `initDatabase()` - 表创建逻辑
- `seedDatabase()` - 默认数据初始化
- `fixAdminPassword()` - 密码修复
- `setupDatabase()` - 主入口函数

#### 2.3 新增的内容
- 导入 `checkDatabaseHealth` 和 `repairDatabase`
- 在 `setupDatabase()` 中添加健康检查
- 导出 `repairDatabase()` 函数供手动调用

#### 2.4 更新的表结构定义

确保所有表包含以下字段：
- **乐观锁字段**: `version INTEGER DEFAULT 1`
- **软删除字段**: `is_deleted BOOLEAN DEFAULT 0`

需要更新的表：
- `users`
- `readers`
- `books`
- `borrowing_records`
- `book_categories`
- `reader_categories`

### 3. 创建修复函数 (`repairDatabase`)

```typescript
export function repairDatabase(options?: {
  autoFix?: boolean
  tables?: string[]
}): RepairResult
```

修复操作：
- 添加缺失的乐观锁字段
- 添加缺失的软删除字段
- 创建缺失的索引
- 创建缺失的日志表

### 4. 清理冗余文件

| 文件 | 操作 |
|------|------|
| `migration.ts` | 删除 |
| `index-enhanced.ts` | 删除 |
| `index-backup.ts` | 删除 |

## 表结构规范

### users 表
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'librarian', 'teacher', 'student')),
  reader_id INTEGER,
  email TEXT,
  phone TEXT,
  version INTEGER DEFAULT 1,
  is_deleted BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reader_id) REFERENCES readers(id) ON DELETE SET NULL
)
```

### readers 表
```sql
CREATE TABLE readers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reader_no TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category_id INTEGER NOT NULL,
  user_id INTEGER,
  gender TEXT CHECK(gender IN ('male', 'female', 'other')),
  id_card TEXT UNIQUE,
  organization TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  registration_date DATE DEFAULT (date('now')),
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'expired', 'pending')),
  version INTEGER DEFAULT 1,
  is_deleted BOOLEAN DEFAULT 0,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES reader_categories(id) ON DELETE RESTRICT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
)
```

### books 表
```sql
CREATE TABLE books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  isbn TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category_id INTEGER NOT NULL,
  author TEXT NOT NULL,
  publisher TEXT NOT NULL,
  publish_date DATE,
  price REAL,
  pages INTEGER,
  keywords TEXT,
  description TEXT,
  cover_url TEXT,
  total_quantity INTEGER NOT NULL DEFAULT 1,
  available_quantity INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'normal' CHECK(status IN ('normal', 'damaged', 'lost', 'destroyed')),
  registration_date DATE DEFAULT (date('now')),
  version INTEGER DEFAULT 1,
  is_deleted BOOLEAN DEFAULT 0,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES book_categories(id) ON DELETE RESTRICT
)
```

### borrowing_records 表
```sql
CREATE TABLE borrowing_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reader_id INTEGER NOT NULL,
  book_id INTEGER NOT NULL,
  borrow_date DATE DEFAULT (date('now')),
  due_date DATE NOT NULL,
  return_date DATE,
  renewal_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'borrowed' CHECK(status IN ('borrowed', 'returned', 'overdue', 'lost')),
  fine_amount REAL DEFAULT 0,
  version INTEGER DEFAULT 1,
  is_deleted BOOLEAN DEFAULT 0,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reader_id) REFERENCES readers(id) ON DELETE RESTRICT,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE RESTRICT
)
```

### book_categories 表
```sql
CREATE TABLE book_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  keywords TEXT,
  parent_id INTEGER,
  version INTEGER DEFAULT 1,
  is_deleted BOOLEAN DEFAULT 0,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES book_categories(id) ON DELETE SET NULL
)
```

### reader_categories 表
```sql
CREATE TABLE reader_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  max_borrow_count INTEGER NOT NULL DEFAULT 5,
  max_borrow_days INTEGER NOT NULL DEFAULT 30,
  validity_days INTEGER NOT NULL DEFAULT 365,
  version INTEGER DEFAULT 1,
  is_deleted BOOLEAN DEFAULT 0,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### operation_logs 表
```sql
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
```

### audit_logs 表
```sql
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
```

## 健康检查逻辑

### 检查项目
1. **表存在性检查**
   - 必需表：users, readers, books, borrowing_records, book_categories, reader_categories
   - 日志表：operation_logs, audit_logs

2. **字段完整性检查**
   - 乐观锁字段：`version INTEGER DEFAULT 1`
   - 软删除字段：`is_deleted BOOLEAN DEFAULT 0`

3. **索引检查**
   - 性能索引
   - 外键索引

### 健康报告示例
```typescript
{
  isHealthy: false,
  issues: [
    {
      table: 'books',
      type: 'missing_field',
      field: 'version',
      severity: 'warning',
      description: '缺少乐观锁版本字段'
    },
    {
      table: 'operation_logs',
      type: 'missing_table',
      severity: 'warning',
      description: '操作日志表不存在'
    }
  ],
  timestamp: '2025-12-30T09:58:00.000Z'
}
```

## 外部调用兼容性

### 保持不变的导出
```typescript
export const db: Database
export function setupDatabase(): void
```

### 新增的导出
```typescript
export function checkDatabaseHealth(): HealthReport
export function repairDatabase(options?: RepairOptions): RepairResult
```

## 测试计划

1. **初始化测试**
   - 新数据库初始化
   - 旧数据库升级

2. **健康检查测试**
   - 完整表结构
   - 缺少字段场景
   - 缺少表场景

3. **修复测试**
   - 添加缺失字段
   - 创建缺失表
   - 创建缺失索引

4. **兼容性测试**
   - 所有外部模块正常工作
   - 数据读写正常

## 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 删除迁移导致旧数据库无法升级 | 高 | 保留表结构检测和修复逻辑 |
| 外部调用失败 | 高 | 保持原有导出不变 |
| 数据丢失 | 高 | 只添加字段，不删除数据 |
| 修复逻辑错误 | 中 | 修复前先备份，支持回滚 |

## 实施顺序

1. ✅ 分析现有代码结构
2. ✅ 创建健康检查模块
3. ⏳ 重构 index.ts
4. ⏳ 创建修复函数
5. ⏳ 删除冗余文件
6. ⏳ 测试验证
