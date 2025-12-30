# 数据库脚本分析报告

## 概述

本报告详细分析了 `scripts/generate-data.ts` 和 `scripts/clear-database.ts` 两个脚本文件与当前数据库结构的一致性。

## 当前数据库表结构

### 核心业务表

| 表名 | 说明 | 关键字段 | 外键 |
|------|------|----------|------|
| `users` | 用户表 | id, username, password, name, role, reader_id, version, is_deleted | reader_id → readers(id) |
| `reader_categories` | 读者种类表 | id, code, name, max_borrow_count, max_borrow_days, version, is_deleted | - |
| `readers` | 读者表 | id, reader_no, name, category_id, user_id, status, version, is_deleted | category_id → reader_categories(id), user_id → users(id) |
| `book_categories` | 图书类别表 | id, code, name, keywords, parent_id, version, is_deleted | parent_id → book_categories(id) |
| `books` | 图书表 | id, isbn, title, category_id, total_quantity, available_quantity, status, version, is_deleted | category_id → book_categories(id) |
| `borrowing_records` | 借阅记录表 | id, reader_id, book_id, status, fine_amount, version, is_deleted | reader_id → readers(id), book_id → books(id) |

### 系统配置表

| 表名 | 说明 | 关键字段 | 外键 |
|------|------|----------|------|
| `role_permissions` | 角色权限表 | id, role, permission | - |
| `system_settings` | 系统设置表 | id, setting_key, setting_value, setting_type, category | - |

### AI 相关表

| 表名 | 说明 | 关键字段 | 外键 |
|------|------|----------|------|
| `ai_conversations` | AI对话历史表 | id, user_id, title, messages | user_id → users(id) |
| `book_vectors` | 图书向量表 | id, book_id, vector, text | book_id → books(id) |

### 日志表（在 repairDatabase 中创建）

| 表名 | 说明 | 关键字段 | 外键 |
|------|------|----------|------|
| `operation_logs` | 操作日志表 | id, operation_id, table_name, record_id, operation_type, status | created_by → users(id) |
| `audit_logs` | 审计日志表 | id, user_id, action, table_name, record_id | user_id → users(id) |

---

## scripts/generate-data.ts 分析

### 1. 数据清理逻辑（第263-269行）

```typescript
db.exec('DELETE FROM borrowing_records')
db.exec('DELETE FROM books WHERE id > 0')
db.exec('DELETE FROM users WHERE id > 1') // 保留admin账号
db.exec('DELETE FROM readers WHERE id > 0')
```

**问题：**
- ❌ **未清理 `ai_conversations` 表**：保留 admin 账号时，其 AI 对话历史不会被清理
- ❌ **未清理 `book_vectors` 表**：图书向量数据不会被清理
- ❌ **未清理 `operation_logs` 表**：操作日志数据不会被清理
- ❌ **未清理 `audit_logs` 表**：审计日志数据不会被清理
- ❌ **未清理 `role_permissions` 表**：虽然这是默认数据，但重复运行可能累积
- ❌ **未清理 `system_settings` 表**：系统设置不会被清理

### 2. 图书数据生成（第279-318行）

```typescript
INSERT INTO books (isbn, title, author, publisher, category_id, publish_date, price, pages,
                   keywords, description, cover_url, total_quantity, available_quantity, status, registration_date, is_deleted)
```

**字段对比：**
| 字段 | 脚本中 | 数据库定义 | 状态 |
|------|--------|-----------|------|
| id | - | INTEGER PRIMARY KEY AUTOINCREMENT | ✅ 自动生成 |
| isbn | ✅ | TEXT UNIQUE NOT NULL | ✅ |
| title | ✅ | TEXT NOT NULL | ✅ |
| category_id | ✅ | INTEGER NOT NULL | ✅ |
| author | ✅ | TEXT NOT NULL | ✅ |
| publisher | ✅ | TEXT NOT NULL | ✅ |
| publish_date | ✅ | DATE | ✅ |
| price | ✅ | REAL | ✅ |
| pages | ✅ | INTEGER | ✅ |
| keywords | ✅ | TEXT | ✅ |
| description | ✅ | TEXT | ✅ |
| cover_url | ✅ | TEXT | ✅ |
| total_quantity | ✅ | INTEGER NOT NULL DEFAULT 1 | ✅ |
| available_quantity | ✅ | INTEGER NOT NULL DEFAULT 1 | ✅ |
| status | ✅ | TEXT NOT NULL DEFAULT 'normal' | ✅ |
| registration_date | ✅ | DATE DEFAULT (date('now')) | ✅ |
| version | ❌ | INTEGER DEFAULT 1 | ⚠️ 有默认值 |
| is_deleted | ✅ | BOOLEAN DEFAULT 0 | ✅ |
| notes | ❌ | TEXT | ⚠️ 可以为空 |
| created_at | ❌ | DATETIME DEFAULT CURRENT_TIMESTAMP | ⚠️ 有默认值 |
| updated_at | ❌ | DATETIME DEFAULT CURRENT_TIMESTAMP | ⚠️ 有默认值 |

**结论：** ✅ 字段基本一致，缺少的字段都有默认值

### 3. 读者和用户数据生成（第332-412行）

#### readers 表插入
```typescript
INSERT INTO readers (reader_no, name, category_id, user_id, gender, id_card, organization,
                     phone, email, address, status, registration_date, expiry_date, notes)
```

**字段对比：**
| 字段 | 脚本中 | 数据库定义 | 状态 |
|------|--------|-----------|------|
| id | - | INTEGER PRIMARY KEY AUTOINCREMENT | ✅ 自动生成 |
| reader_no | ✅ | TEXT UNIQUE NOT NULL | ✅ |
| name | ✅ | TEXT NOT NULL | ✅ |
| category_id | ✅ | INTEGER NOT NULL | ✅ |
| user_id | ✅ | INTEGER | ✅ |
| gender | ✅ | TEXT CHECK(...) | ✅ |
| id_card | ✅ | TEXT UNIQUE | ✅ |
| organization | ✅ | TEXT | ✅ |
| address | ✅ | TEXT | ✅ |
| phone | ✅ | TEXT | ✅ |
| email | ✅ | TEXT | ✅ |
| registration_date | ✅ | DATE DEFAULT (date('now')) | ✅ |
| expiry_date | ✅ | DATE | ✅ |
| status | ✅ | TEXT NOT NULL DEFAULT 'active' | ✅ |
| version | ❌ | INTEGER DEFAULT 1 | ⚠️ 有默认值 |
| is_deleted | ❌ | BOOLEAN DEFAULT 0 | ⚠️ 有默认值 |
| notes | ✅ | TEXT | ✅ |
| created_at | ❌ | DATETIME DEFAULT CURRENT_TIMESTAMP | ⚠️ 有默认值 |
| updated_at | ❌ | DATETIME DEFAULT CURRENT_TIMESTAMP | ⚠️ 有默认值 |

**结论：** ✅ 字段基本一致，缺少的字段都有默认值

#### users 表插入
```typescript
INSERT INTO users (username, password, name, role, reader_id, email, phone, is_deleted)
```

**字段对比：**
| 字段 | 脚本中 | 数据库定义 | 状态 |
|------|--------|-----------|------|
| id | - | INTEGER PRIMARY KEY AUTOINCREMENT | ✅ 自动生成 |
| username | ✅ | TEXT UNIQUE NOT NULL | ✅ |
| password | ✅ | TEXT NOT NULL | ✅ |
| name | ✅ | TEXT NOT NULL | ✅ |
| role | ✅ | TEXT NOT NULL CHECK(...) | ✅ |
| reader_id | ✅ | INTEGER | ✅ |
| email | ✅ | TEXT | ✅ |
| phone | ✅ | TEXT | ✅ |
| version | ❌ | INTEGER DEFAULT 1 | ⚠️ 有默认值 |
| is_deleted | ✅ | BOOLEAN DEFAULT 0 | ✅ |
| created_at | ❌ | DATETIME DEFAULT CURRENT_TIMESTAMP | ⚠️ 有默认值 |
| updated_at | ❌ | DATETIME DEFAULT CURRENT_TIMESTAMP | ⚠️ 有默认值 |

**结论：** ✅ 字段基本一致，缺少的字段都有默认值

### 4. 读者编号生成格式问题

**脚本中的格式（第347-381行）：**
```typescript
const generateReaderNo = (categoryCode: string, sequence: number) => {
  const today = new Date()
  const dateStr = today.toISOString().split('T')[0].replace(/-/g, '')
  return `${categoryCode}${dateStr}${sequence.toString().padStart(4, '0')}`
}

// 使用时：
if (isTeacher) {
  readerNoPrefix = 'T'  // 使用 'T' 前缀
  sequence = teacherSeq++
} else if (isStudent) {
  readerNoPrefix = 'S'  // 使用 'S' 前缀
  sequence = studentSeq++
}
const readerNo = generateReaderNo(readerNoPrefix, sequence)
```

**repository 中的格式（reader.repository.ts 第252-285行）：**
```typescript
generateNextReaderNo(categoryId: number): string {
  const category = this.findCategoryById(categoryId)
  // 格式: {CATEGORY_CODE}{YYYYMMDD}{4位顺序号}
  const prefix = `${category.code}${dateStr}`  // 使用 category.code，如 'STUDENT', 'TEACHER'
  ...
}
```

**问题：**
- ❌ **格式不一致**：脚本使用 'T'/'S' 前缀，而 repository 使用 'STUDENT'/'TEACHER'
- ❌ **编号格式不同**：脚本生成的编号与业务逻辑不一致

### 5. 借阅记录生成（第419-497行）

```typescript
INSERT INTO borrowing_records (reader_id, book_id, borrow_date, due_date, return_date,
                              renewal_count, status, fine_amount, is_deleted)
```

**字段对比：**
| 字段 | 脚本中 | 数据库定义 | 状态 |
|------|--------|-----------|------|
| id | - | INTEGER PRIMARY KEY AUTOINCREMENT | ✅ 自动生成 |
| reader_id | ✅ | INTEGER NOT NULL | ✅ |
| book_id | ✅ | INTEGER NOT NULL | ✅ |
| borrow_date | ✅ | DATE DEFAULT (date('now')) | ✅ |
| due_date | ✅ | DATE NOT NULL | ✅ |
| return_date | ✅ | DATE | ✅ |
| renewal_count | ✅ | INTEGER DEFAULT 0 | ✅ |
| status | ✅ | TEXT NOT NULL DEFAULT 'borrowed' | ✅ |
| fine_amount | ✅ | REAL DEFAULT 0 | ✅ |
| version | ❌ | INTEGER DEFAULT 1 | ⚠️ 有默认值 |
| is_deleted | ✅ | BOOLEAN DEFAULT 0 | ✅ |
| notes | ❌ | TEXT | ⚠️ 可以为空 |
| created_at | ❌ | DATETIME DEFAULT CURRENT_TIMESTAMP | ⚠️ 有默认值 |
| updated_at | ❌ | DATETIME DEFAULT CURRENT_TIMESTAMP | ⚠️ 有默认值 |

**结论：** ✅ 字段基本一致，缺少的字段都有默认值

### 6. 图书可用数量更新问题

**脚本中的更新（第425-427行）：**
```typescript
const updateBookQuantity = db.prepare(`
  UPDATE books SET available_quantity = available_quantity - 1 WHERE id = ?
`)
```

**问题：**
- ❌ **未使用乐观锁**：没有检查和更新 `version` 字段，与 repository 中的实现不一致
- ⚠️ 虽然在脚本中不会产生并发问题，但与业务逻辑不一致

---

## scripts/clear-database.ts 分析

### 1. 数据库路径问题

**脚本中的路径（第20-25行）：**
```typescript
const userDataPath = process.env.APPDATA
  ? path.join(process.env.APPDATA, 'electron-smart-library')
  : path.join(os.homedir(), '.electron-smart-library')
```

**src/main/database/index.ts 中的路径（第8-10行）：**
```typescript
const userDataPath = app.getPath('userData')
const dbPath = path.join(userDataPath, 'library.db')
```

**问题：**
- ⚠️ **路径计算方式不同**：脚本使用环境变量判断，而主程序使用 Electron API
- ⚠️ 可能导致脚本无法找到正确的数据库文件

### 2. 数据清理逻辑（第68-75行）

```typescript
tables.forEach(table => {
  const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get() as { count: number }
  if (count.count > 0) {
    db.exec(`DELETE FROM ${table.name}`)
    console.log(`✅ 已删除 ${table.name} 表的 ${count.count} 条记录`)
  }
})
```

**问题：**
- ❌ **删除所有表的数据**：包括默认数据（如默认读者种类、图书类别、角色权限等）
- ❌ **运行后需要重新启动应用**：才能重新初始化默认数据
- ⚠️ **没有明确说明会删除哪些表**：用户可能不知道会删除系统配置和日志数据

---

## 总结

### 严重问题

| # | 问题 | 脚本 | 影响 |
|---|------|------|------|
| 1 | 未清理 `ai_conversations` 表 | generate-data.ts | 保留 admin 账号时，AI 对话历史不会被清理 |
| 2 | 未清理 `book_vectors` 表 | generate-data.ts | 图书向量数据不会被清理 |
| 3 | 未清理 `operation_logs` 表 | generate-data.ts | 操作日志数据不会被清理 |
| 4 | 未清理 `audit_logs` 表 | generate-data.ts | 审计日志数据不会被清理 |
| 5 | 读者编号格式不一致 | generate-data.ts | 生成的编号与业务逻辑不一致 |
| 6 | 数据库路径计算方式不同 | 两个脚本 | 可能无法找到正确的数据库文件 |

### 中等问题

| # | 问题 | 脚本 | 影响 |
|---|------|------|------|
| 1 | 未清理 `role_permissions` 表 | generate-data.ts | 重复运行可能累积数据 |
| 2 | 未清理 `system_settings` 表 | generate-data.ts | 系统设置不会被清理 |
| 3 | 图书可用数量更新未使用乐观锁 | generate-data.ts | 与 repository 实现不一致 |
| 4 | 删除所有表的数据 | clear-database.ts | 包括默认数据，需要重新初始化 |

### 轻微问题

| # | 问题 | 脚本 | 影响 |
|---|------|------|------|
| 1 | INSERT 语句缺少部分字段 | generate-data.ts | 有默认值，不影响功能 |

---

## 建议修复方案

### 1. 修复 scripts/generate-data.ts

#### 1.1 添加完整的清理逻辑
```typescript
// 清理现有数据
console.log('🧹 清理现有数据...')
db.exec('DELETE FROM borrowing_records')
db.exec('DELETE FROM books WHERE id > 0')
db.exec('DELETE FROM users WHERE id > 1') // 保留admin账号
db.exec('DELETE FROM readers WHERE id > 0')
db.exec('DELETE FROM ai_conversations WHERE user_id > 1') // 清理admin以外的对话
db.exec('DELETE FROM book_vectors') // 清理向量数据
db.exec('DELETE FROM operation_logs') // 清理操作日志
db.exec('DELETE FROM audit_logs') // 清理审计日志
console.log('✅ 清理完成\n')
```

#### 1.2 修复读者编号生成格式
```typescript
const generateReaderNo = (categoryCode: string, sequence: number) => {
  const today = new Date()
  const dateStr = today.toISOString().split('T')[0].replace(/-/g, '')
  return `${categoryCode}${dateStr}${sequence.toString().padStart(4, '0')}`
}

// 使用时：
if (isTeacher) {
  role = 'teacher'
  readerNoPrefix = 'TEACHER'  // 使用完整的类别代码
  sequence = teacherSeq++
} else if (isStudent) {
  role = 'student'
  readerNoPrefix = 'STUDENT'  // 使用完整的类别代码
  sequence = studentSeq++
}
const readerNo = generateReaderNo(readerNoPrefix, sequence)
```

#### 1.3 修复图书可用数量更新（添加乐观锁）
```typescript
const updateBookQuantity = db.prepare(`
  UPDATE books
  SET available_quantity = available_quantity - 1,
      updated_at = CURRENT_TIMESTAMP,
      version = version + 1
  WHERE id = ? AND available_quantity >= 1
`)
```

### 2. 修复 scripts/clear-database.ts

#### 2.1 统一数据库路径计算方式
建议使用与主程序相同的方式，或者添加路径检测逻辑：
```typescript
// 尝试多个可能的数据库路径
const possiblePaths = [
  path.join(process.env.APPDATA || '', 'electron-smart-library', 'library.db'),
  path.join(os.homedir(), '.electron-smart-library', 'library.db'),
  path.join(os.homedir(), 'AppData', 'Roaming', 'electron-smart-library', 'library.db')
]

let dbPath = possiblePaths.find(p => existsSync(p))
if (!dbPath) {
  dbPath = possiblePaths[0]  // 使用默认路径
}
```

#### 2.2 添加更清晰的提示信息
```typescript
console.log('\n⚠️  警告：此操作将删除所有表的数据，包括：')
console.log('   - 用户、读者、图书、借阅记录')
console.log('   - 默认的读者种类、图书类别')
console.log('   - 角色权限、系统设置')
console.log('   - AI对话历史、图书向量')
console.log('   - 操作日志、审计日志')
console.log('\n💡 清理后需要重新启动应用来初始化默认数据')
```

---

## 附录：完整数据库表结构参考

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

### ai_conversations 表
```sql
CREATE TABLE IF NOT EXISTS ai_conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  messages TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)
```

### book_vectors 表
```sql
CREATE TABLE IF NOT EXISTS book_vectors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL UNIQUE,
  vector TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
)
```
