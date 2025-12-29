# 智能图书管理系统 - 数据创建流程完整分析报告

## 目录
1. [应用启动与数据库初始化](#1-应用启动与数据库初始化)
2. [数据库表结构详解](#2-数据库表结构详解)
3. [核心业务数据流程](#3-核心业务数据流程)
4. [数据变更追踪](#4-数据变更追踪)

---

## 1. 应用启动与数据库初始化

### 1.1 启动流程

```
应用启动 (src/main/index.ts)
    ↓
app.whenReady()
    ↓
setupDatabase() (src/main/database/index.ts)
    ↓
initDatabase() - 初始化表结构
    ↓
seedDatabase() - 插入默认数据
    ↓
fixAdminPassword() - 修复明文密码
    ↓
DatabaseMigration.migrate() - 执行数据库迁移
    ↓
registerIpcHandlers() - 注册IPC处理器
    ↓
createWindow() - 创建主窗口
```

### 1.2 数据库文件位置

- **数据库文件路径**: `app.getPath('userData')/library.db`
- **Windows**: `C:\Users\[用户名]\AppData\Roaming\[应用名]\library.db`
- **macOS**: `~/Library/Application Support/[应用名]/library.db`
- **Linux**: `~/.config/[应用名]/library.db`

### 1.3 数据库初始化步骤

#### 步骤1: 创建数据库连接并启用外键约束
```typescript
// src/main/database/index.ts:18-21
export const db = new Database(dbPath)
db.pragma('foreign_keys = ON')
```

#### 步骤2: 检查并迁移旧版本表结构

**users表迁移**:
- 检查是否为旧schema（只有admin, librarian角色）
- 如果是旧版本，执行迁移：
  1. 创建新表 `users_new`（支持4角色：admin, librarian, teacher, student）
  2. 复制现有数据到新表
  3. 删除旧表 `users`
  4. 重命名 `users_new` 为 `users`

**users表字段添加**:
- 检查是否缺少 `reader_id` 字段
- 如果缺少，重建表添加该字段（带外键约束）

**readers表字段添加**:
- 检查是否缺少 `user_id` 字段
- 如果缺少，重建表添加该字段（带外键约束）

#### 步骤3: 创建所有表结构

按顺序创建以下表：

1. **users** - 用户表
2. **reader_categories** - 读者种类表
3. **readers** - 读者表
4. **book_categories** - 图书类别表
5. **books** - 图书表
6. **borrowing_records** - 借阅记录表
7. **role_permissions** - 角色权限表
8. **system_settings** - 系统设置表
9. **ai_conversations** - AI对话历史表

#### 步骤4: 插入默认数据

**默认角色权限** (role_permissions表):
```sql
INSERT OR IGNORE INTO role_permissions (role, permission) VALUES
  ('admin', '*'),
  ('librarian', 'books:*'),
  ('librarian', 'readers:*'),
  ('librarian', 'borrowing:*'),
  ('librarian', 'statistics:read'),
  ('teacher', 'books:read'),
  ('teacher', 'borrowing:read'),
  ('teacher', 'borrowing:borrow'),
  ('teacher', 'statistics:read'),
  ('student', 'books:read'),
  ('student', 'borrowing:read'),
  ('student', 'borrowing:borrow')
```

**默认AI设置** (system_settings表):
```sql
INSERT OR IGNORE INTO system_settings (setting_key, setting_value, setting_type, category, description) VALUES
  ('ai.openai.apiKey', '', 'string', 'ai', 'OpenAI API Key'),
  ('ai.openai.baseURL', 'https://api.openai.com/v1', 'string', 'ai', 'OpenAI Base URL'),
  ('ai.openai.embeddingModel', 'text-embedding-3-small', 'string', 'ai', 'Embedding Model'),
  ('ai.openai.chatModel', 'gpt-4-turbo-preview', 'string', 'ai', 'Chat Model')
```

#### 步骤5: 创建索引

```sql
-- 读者表索引
CREATE INDEX IF NOT EXISTS idx_readers_category ON readers(category_id);
CREATE INDEX IF NOT EXISTS idx_readers_status ON readers(status);

-- 图书表索引
CREATE INDEX IF NOT EXISTS idx_books_category ON books(category_id);
CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);

-- 借阅记录索引
CREATE INDEX IF NOT EXISTS idx_borrowing_reader ON borrowing_records(reader_id);
CREATE INDEX IF NOT EXISTS idx_borrowing_book ON borrowing_records(book_id);
CREATE INDEX IF NOT EXISTS idx_borrowing_status ON borrowing_records(status);
CREATE INDEX IF NOT EXISTS idx_borrowing_dates ON borrowing_records(borrow_date, due_date);

-- AI对话索引
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_created ON ai_conversations(created_at DESC);
```

#### 步骤6: 种子数据初始化 (seedDatabase)

**默认管理员账户** (users表):
```sql
INSERT INTO users (username, password, name, role, email)
VALUES ('admin', '<bcrypt加密后的密码>', '系统管理员', 'admin', 'admin@library.com')
```
- 用户名: `admin`
- 密码: `admin123` (bcrypt加密)
- 角色: `admin`

**默认读者种类** (reader_categories表):
```sql
INSERT INTO reader_categories (code, name, max_borrow_count, max_borrow_days, validity_days) VALUES
  ('STUDENT', '学生', 5, 30, 365),
  ('TEACHER', '教师', 10, 60, 1095),
  ('STAFF', '职工', 8, 45, 730)
```

**默认图书类别** (book_categories表):
```sql
INSERT INTO book_categories (code, name, keywords) VALUES
  ('TP', '计算机科学', '编程,算法,软件,硬件'),
  ('I', '文学', '小说,诗歌,散文,戏剧'),
  ('K', '历史地理', '历史,地理,考古'),
  ('O', '数理科学', '数学,物理,化学'),
  ('J', '艺术', '音乐,美术,设计,摄影')
```

#### 步骤7: 修复明文密码

检查管理员密码是否为明文，如果是则进行bcrypt加密：
```typescript
// src/main/database/index.ts:446-461
function fixAdminPassword() {
  const adminUser = db.prepare('SELECT id, password FROM users WHERE username = ?').get('admin')
  if (adminUser && adminUser.password === 'admin123') {
    const salt = bcrypt.genSaltSync(10)
    const hashedPassword = bcrypt.hashSync('admin123', salt)
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, adminUser.id)
  }
}
```

#### 步骤8: 数据库迁移 (DatabaseMigration.migrate)

**迁移版本2**:
1. 添加乐观锁版本字段 (`version INTEGER`) 到各表
2. 添加软删除字段 (`is_deleted BOOLEAN`) 到各表
3. 创建操作日志表 (`operation_logs`)
4. 创建审计日志表 (`audit_logs`)
5. 创建相关索引

---

## 2. 数据库表结构详解

### 2.1 users (用户表)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 用户ID |
| username | TEXT | UNIQUE NOT NULL | 用户名 |
| password | TEXT | NOT NULL | 密码（bcrypt加密） |
| name | TEXT | NOT NULL | 姓名 |
| role | TEXT | CHECK IN ('admin', 'librarian', 'teacher', 'student') | 角色 |
| reader_id | INTEGER | FOREIGN KEY → readers(id) ON DELETE SET NULL | 关联的读者ID |
| email | TEXT | - | 邮箱 |
| phone | TEXT | - | 电话 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

**外键关系**:
- `reader_id` → `readers(id)` ON DELETE SET NULL

**索引**:
- PRIMARY KEY (id)
- UNIQUE (username)

### 2.2 reader_categories (读者种类表)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 种类ID |
| code | TEXT | UNIQUE NOT NULL | 种类编码 |
| name | TEXT | NOT NULL | 种类名称 |
| max_borrow_count | INTEGER | NOT NULL DEFAULT 5 | 最大借阅数量 |
| max_borrow_days | INTEGER | NOT NULL DEFAULT 30 | 最大借阅天数 |
| validity_days | INTEGER | NOT NULL DEFAULT 365 | 有效期天数 |
| notes | TEXT | - | 备注 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

**索引**:
- PRIMARY KEY (id)
- UNIQUE (code)

### 2.3 readers (读者表)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 读者ID |
| reader_no | TEXT | UNIQUE NOT NULL | 读者编号 |
| name | TEXT | NOT NULL | 姓名 |
| category_id | INTEGER | FOREIGN KEY → reader_categories(id) ON DELETE RESTRICT | 读者种类ID |
| user_id | INTEGER | FOREIGN KEY → users(id) ON DELETE SET NULL | 关联的用户ID |
| gender | TEXT | CHECK IN ('male', 'female', 'other') | 性别 |
| id_card | TEXT | UNIQUE | 身份证号 |
| organization | TEXT | - | 单位/学校 |
| address | TEXT | - | 地址 |
| phone | TEXT | - | 电话 |
| email | TEXT | - | 邮箱 |
| registration_date | DATE | DEFAULT (date('now')) | 注册日期 |
| expiry_date | DATE | - | 有效期截止日期 |
| status | TEXT | CHECK IN ('active', 'suspended', 'expired', 'pending') DEFAULT 'active' | 状态 |
| notes | TEXT | - | 备注 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

**外键关系**:
- `category_id` → `reader_categories(id)` ON DELETE RESTRICT
- `user_id` → `users(id)` ON DELETE SET NULL

**索引**:
- PRIMARY KEY (id)
- UNIQUE (reader_no)
- UNIQUE (id_card)
- INDEX (category_id)
- INDEX (status)

### 2.4 book_categories (图书类别表)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 类别ID |
| code | TEXT | UNIQUE NOT NULL | 类别编码 |
| name | TEXT | NOT NULL | 类别名称 |
| keywords | TEXT | - | 关键词 |
| parent_id | INTEGER | FOREIGN KEY → book_categories(id) ON DELETE SET NULL | 父类别ID |
| notes | TEXT | - | 备注 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

**外键关系**:
- `parent_id` → `book_categories(id)` ON DELETE SET NULL (自引用)

**索引**:
- PRIMARY KEY (id)
- UNIQUE (code)

### 2.5 books (图书表)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 图书ID |
| isbn | TEXT | UNIQUE NOT NULL | ISBN编号 |
| title | TEXT | NOT NULL | 书名 |
| category_id | INTEGER | FOREIGN KEY → book_categories(id) ON DELETE RESTRICT | 图书类别ID |
| author | TEXT | NOT NULL | 作者 |
| publisher | TEXT | NOT NULL | 出版社 |
| publish_date | DATE | - | 出版日期 |
| price | REAL | - | 价格 |
| pages | INTEGER | - | 页数 |
| keywords | TEXT | - | 关键词 |
| description | TEXT | - | 描述 |
| cover_url | TEXT | - | 封面URL |
| total_quantity | INTEGER | NOT NULL DEFAULT 1 | 总数量 |
| available_quantity | INTEGER | NOT NULL DEFAULT 1 | 可借数量 |
| status | TEXT | CHECK IN ('normal', 'damaged', 'lost', 'destroyed') DEFAULT 'normal' | 状态 |
| registration_date | DATE | DEFAULT (date('now')) | 登记日期 |
| notes | TEXT | - | 备注 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

**外键关系**:
- `category_id` → `book_categories(id)` ON DELETE RESTRICT

**索引**:
- PRIMARY KEY (id)
- UNIQUE (isbn)
- INDEX (category_id)
- INDEX (status)
- INDEX (title)
- INDEX (author)

### 2.6 borrowing_records (借阅记录表)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 记录ID |
| reader_id | INTEGER | FOREIGN KEY → readers(id) ON DELETE RESTRICT | 读者ID |
| book_id | INTEGER | FOREIGN KEY → books(id) ON DELETE RESTRICT | 图书ID |
| borrow_date | DATE | DEFAULT (date('now')) | 借阅日期 |
| due_date | DATE | NOT NULL | 应还日期 |
| return_date | DATE | - | 实际归还日期 |
| renewal_count | INTEGER | DEFAULT 0 | 续借次数 |
| status | TEXT | CHECK IN ('borrowed', 'returned', 'overdue', 'lost') DEFAULT 'borrowed' | 状态 |
| fine_amount | REAL | DEFAULT 0 | 罚款金额 |
| notes | TEXT | - | 备注 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

**外键关系**:
- `reader_id` → `readers(id)` ON DELETE RESTRICT
- `book_id` → `books(id)` ON DELETE RESTRICT

**索引**:
- PRIMARY KEY (id)
- INDEX (reader_id)
- INDEX (book_id)
- INDEX (status)
- INDEX (borrow_date, due_date)

### 2.7 role_permissions (角色权限表)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 权限ID |
| role | TEXT | CHECK IN ('admin', 'librarian', 'teacher', 'student') NOT NULL | 角色 |
| permission | TEXT | NOT NULL | 权限 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

**唯一约束**:
- UNIQUE(role, permission)

### 2.8 system_settings (系统设置表)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 设置ID |
| setting_key | TEXT | UNIQUE NOT NULL | 设置键 |
| setting_value | TEXT | - | 设置值 |
| setting_type | TEXT | CHECK IN ('string', 'number', 'boolean', 'json') NOT NULL | 设置类型 |
| category | TEXT | CHECK IN ('ai', 'system', 'business') NOT NULL | 分类 |
| description | TEXT | - | 描述 |
| is_encrypted | INTEGER | NOT NULL DEFAULT 0 | 是否加密 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

**唯一约束**:
- UNIQUE (setting_key)

### 2.9 ai_conversations (AI对话历史表)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 对话ID |
| user_id | INTEGER | FOREIGN KEY → users(id) ON DELETE CASCADE | 用户ID |
| title | TEXT | NOT NULL | 对话标题 |
| messages | TEXT | NOT NULL | 消息（JSON字符串） |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

**外键关系**:
- `user_id` → `users(id)` ON DELETE CASCADE

**索引**:
- PRIMARY KEY (id)
- INDEX (user_id)
- INDEX (created_at DESC)

### 2.10 database_version (数据库版本表)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 版本ID |
| version | INTEGER | NOT NULL | 版本号 |
| applied_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 应用时间 |
| notes | TEXT | - | 备注 |

### 2.11 operation_logs (操作日志表)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 日志ID |
| operation_id | TEXT | UNIQUE NOT NULL | 操作ID |
| table_name | TEXT | NOT NULL | 表名 |
| record_id | INTEGER | NOT NULL | 记录ID |
| operation_type | TEXT | CHECK IN ('INSERT', 'UPDATE', 'DELETE') NOT NULL | 操作类型 |
| old_data | TEXT | - | 旧数据（JSON） |
| new_data | TEXT | - | 新数据（JSON） |
| status | TEXT | CHECK IN ('pending', 'committed', 'rolled_back', 'failed') DEFAULT 'pending' | 状态 |
| created_by | INTEGER | FOREIGN KEY → users(id) ON DELETE SET NULL | 创建者 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| committed_at | DATETIME | - | 提交时间 |
| rolled_back_at | DATETIME | - | 回滚时间 |
| error_message | TEXT | - | 错误信息 |

**外键关系**:
- `created_by` → `users(id)` ON DELETE SET NULL

**索引**:
- PRIMARY KEY (id)
- UNIQUE (operation_id)
- INDEX (operation_id)
- INDEX (status)
- INDEX (created_at)

### 2.12 audit_logs (审计日志表)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 日志ID |
| user_id | INTEGER | FOREIGN KEY → users(id) ON DELETE SET NULL | 用户ID |
| action | TEXT | NOT NULL | 操作动作 |
| table_name | TEXT | - | 表名 |
| record_id | INTEGER | - | 记录ID |
| old_values | TEXT | - | 旧值（JSON） |
| new_values | TEXT | - | 新值（JSON） |
| ip_address | TEXT | - | IP地址 |
| user_agent | TEXT | - | 用户代理 |
| session_id | TEXT | - | 会话ID |
| additional_info | TEXT | - | 附加信息 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

**外键关系**:
- `user_id` → `users(id)` ON DELETE SET NULL

**索引**:
- PRIMARY KEY (id)
- INDEX (user_id)
- INDEX (action)
- INDEX (table_name)
- INDEX (created_at)

---

## 3. 核心业务数据流程

### 3.1 借阅流程

#### 3.1.1 借书操作 (borrowBook)

**入口**: `src/main/domains/borrowing/borrowing.service.ts:16`

**流程图**:
```
用户点击借阅
    ↓
borrowBook(readerId, bookId)
    ↓
1. 验证读者
    - 检查读者是否存在
    - 检查读者状态是否为 active
    - 检查读者证是否过期
    ↓
2. 检查借阅数量限制
    - 获取当前借阅数量
    - 检查是否达到最大借阅数量
    ↓
3. 检查是否有逾期未还
    ↓
4. 验证图书
    - 检查图书是否存在
    - 检查图书状态是否为 normal
    - 检查可借数量是否 >= 1
    ↓
5. 检查是否已借阅该书
    ↓
6. 计算归还日期
    - due_date = borrow_date + reader.max_borrow_days
    ↓
7. 执行事务
    ├─ 7.1 创建借阅记录
    │   INSERT INTO borrowing_records
    │   (reader_id, book_id, borrow_date, due_date, renewal_count, status, fine_amount)
    │   VALUES (?, ?, ?, ?, ?, 'borrowed', 0)
    │
    └─ 7.2 减少图书可借数量
        UPDATE books
        SET available_quantity = available_quantity - 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND available_quantity >= 1
    ↓
返回借阅记录
```

**涉及的表变更**:
1. **borrowing_records** - 新增1条记录
   - 字段: reader_id, book_id, borrow_date, due_date, renewal_count=0, status='borrowed', fine_amount=0

2. **books** - 更新1条记录
   - 字段: available_quantity 减1, updated_at 更新

**关键代码**:
```typescript
// src/main/domains/borrowing/borrowing.service.ts:77-100
const transaction = db.transaction(() => {
  // 7.1 创建借阅记录
  const record = this.borrowingRepository.create({
    reader_id: readerId,
    book_id: bookId,
    borrow_date: borrowDate.toISOString().split('T')[0],
    due_date: dueDate.toISOString().split('T')[0],
    renewal_count: 0,
    status: 'borrowed',
    fine_amount: 0
  })

  // 7.2 减少图书可借数量
  this.bookRepository.decreaseAvailableQuantity(bookId, 1)

  return record
})
```

#### 3.1.2 还书操作 (returnBook)

**入口**: `src/main/domains/borrowing/borrowing.service.ts:145`

**流程图**:
```
用户点击还书
    ↓
returnBook(recordId)
    ↓
1. 查找借阅记录
    - 检查记录是否存在
    - 检查是否已归还
    ↓
2. 计算罚款
    - fine = 逾期天数 × config.business.overdueFinePerDay (0.1元/天)
    ↓
3. 执行事务
    ├─ 3.1 更新借阅记录
    │   UPDATE borrowing_records
    │   SET return_date = ?,
    │       status = 'returned',
    │       fine_amount = ?,
    │       updated_at = CURRENT_TIMESTAMP
    │   WHERE id = ?
    │
    └─ 3.2 增加图书可借数量
        UPDATE books
        SET available_quantity = available_quantity + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ↓
返回更新后的借阅记录
```

**涉及的表变更**:
1. **borrowing_records** - 更新1条记录
   - 字段: return_date, status='returned', fine_amount, updated_at

2. **books** - 更新1条记录
   - 字段: available_quantity 加1, updated_at 更新

**关键代码**:
```typescript
// src/main/domains/borrowing/borrowing.service.ts:179-198
const transaction = db.transaction(() => {
  // 更新借阅记录
  const updated = this.borrowingRepository.update(recordId, {
    return_date: returnDate.toISOString().split('T')[0],
    status: 'returned',
    fine_amount: fine
  })

  // 增加图书可借数量
  this.bookRepository.increaseAvailableQuantity(record.book_id, 1)

  return updated
})
```

#### 3.1.3 续借操作 (renewBook)

**入口**: `src/main/domains/borrowing/borrowing.service.ts:234`

**流程图**:
```
用户点击续借
    ↓
renewBook(recordId)
    ↓
1. 查找借阅记录
    - 检查记录是否存在
    - 检查状态是否为 borrowed
    ↓
2. 检查续借次数
    - 检查是否达到最大续借次数 (2次)
    ↓
3. 检查是否逾期
    ↓
4. 获取读者信息
    ↓
5. 计算新的归还日期
    - newDueDate = oldDueDate + reader.max_borrow_days
    ↓
6. 更新借阅记录
    UPDATE borrowing_records
    SET due_date = ?,
        renewal_count = renewal_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    ↓
返回更新后的借阅记录
```

**涉及的表变更**:
1. **borrowing_records** - 更新1条记录
   - 字段: due_date, renewal_count 加1, updated_at

#### 3.1.4 图书丢失处理 (markBookAsLost)

**入口**: `src/main/domains/borrowing/borrowing.service.ts:281`

**流程图**:
```
标记图书丢失
    ↓
markBookAsLost(recordId)
    ↓
1. 查找借阅记录
    ↓
2. 获取图书信息
    ↓
3. 计算赔偿金
    - compensationFee = book.price × 2
    ↓
4. 执行事务
    ├─ 4.1 更新借阅记录
    │   UPDATE borrowing_records
    │   SET status = 'lost',
    │       fine_amount = ?,
    │       notes = ?,
    │       updated_at = CURRENT_TIMESTAMP
    │   WHERE id = ?
    │
    └─ 4.2 减少图书总数
        UPDATE books
        SET total_quantity = total_quantity - 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ↓
完成
```

**涉及的表变更**:
1. **borrowing_records** - 更新1条记录
   - 字段: status='lost', fine_amount, notes, updated_at

2. **books** - 更新1条记录
   - 字段: total_quantity 减1, updated_at

### 3.2 图书管理流程

#### 3.2.1 创建图书 (createBook)

**入口**: `src/main/domains/book/book.service.ts:68`

**流程图**:
```
创建图书
    ↓
createBook(data)
    ↓
1. 验证数据
    - 检查书名、作者、出版社是否为空
    - 检查是否选择了图书类别
    ↓
2. 检查类别是否存在
    ↓
3. 处理ISBN
    - 如果为空或为 'AUTO'，自动生成
    - 否则检查ISBN是否已存在
    ↓
4. 确保数量一致
    - available_quantity = total_quantity
    ↓
5. 创建图书
    INSERT INTO books
    (isbn, title, category_id, author, publisher, publish_date,
     price, pages, keywords, description, cover_url,
     total_quantity, available_quantity, status, registration_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'normal', date('now'), ?)
    ↓
返回创建的图书
```

**涉及的表变更**:
1. **books** - 新增1条记录
   - 所有字段根据传入数据填充
   - status 默认为 'normal'
   - registration_date 默认为当前日期

**ISBN自动生成规则**:
```
格式: {CATEGORY_CODE}-{YYYY}-{6位顺序号}
示例: TP-2025-000001
```

**关键代码**:
```typescript
// src/main/domains/book/book.repository.ts:368-401
generateNextISBN(categoryId: number): string {
  const category = this.findCategoryById(categoryId)
  const today = new Date()
  const year = today.getFullYear().toString()
  const prefix = `${category.code}-${year}-`

  // 查找今年同类别的最大ISBN
  const stmt = db.prepare(`
    SELECT isbn FROM books
    WHERE isbn LIKE ?
    ORDER BY isbn DESC
    LIMIT 1
  `)
  const result = stmt.get(`${prefix}%`) as { isbn?: string } | undefined

  let sequence = 1
  if (result?.isbn) {
    const lastSequence = result.isbn.slice(prefix.length)
    const lastNum = parseInt(lastSequence, 10)
    if (!isNaN(lastNum)) {
      sequence = lastNum + 1
    }
  }

  const sequenceStr = sequence.toString().padStart(6, '0')
  return `${prefix}${sequenceStr}`
}
```

#### 3.2.2 更新图书 (updateBook)

**入口**: `src/main/domains/book/book.service.ts:129`

**流程图**:
```
更新图书
    ↓
updateBook(id, updates)
    ↓
1. 查找现有图书
    ↓
2. 如果更新了总数量
    - 计算差值: diff = updates.total_quantity - existing.total_quantity
    - 调整可借数量: available_quantity = existing.available_quantity + diff
    ↓
3. 更新图书
    UPDATE books
    SET {updated_fields},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    ↓
返回更新后的图书
```

**涉及的表变更**:
1. **books** - 更新1条记录
   - 根据传入的 updates 更新对应字段
   - updated_at 自动更新

#### 3.2.3 增加馆藏 (addCopies)

**入口**: `src/main/domains/book/book.service.ts:156`

**流程图**:
```
增加馆藏
    ↓
addCopies(id, quantity)
    ↓
1. 验证数量 > 0
    ↓
2. 查找图书
    ↓
3. 更新图书
    UPDATE books
    SET total_quantity = total_quantity + ?,
        available_quantity = available_quantity + ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    ↓
返回更新后的图书
```

**涉及的表变更**:
1. **books** - 更新1条记录
   - total_quantity 加 quantity
   - available_quantity 加 quantity
   - updated_at 更新

#### 3.2.4 删除图书 (deleteBook)

**入口**: `src/main/domains/book/book.service.ts:312`

**流程图**:
```
删除图书
    ↓
deleteBook(id)
    ↓
1. 查找图书
    ↓
2. 检查是否有未归还的借阅记录
    SELECT COUNT(*) FROM borrowing_records
    WHERE book_id = ? AND status IN ('borrowed', 'overdue')
    ↓
3. 如果有未归还记录，抛出错误
    ↓
4. 删除图书
    DELETE FROM books WHERE id = ?
    ↓
完成
```

**涉及的表变更**:
1. **books** - 删除1条记录

### 3.3 读者管理流程

#### 3.3.1 创建读者 (createReader)

**入口**: `src/main/domains/reader/reader.service.ts:64`

**流程图**:
```
创建读者
    ↓
createReader(data)
    ↓
1. 验证数据
    - 检查姓名和种类是否为空
    ↓
2. 检查种类是否存在
    ↓
3. 处理读者编号
    - 如果为空或为 'AUTO'，自动生成
    - 否则检查编号是否已存在
    ↓
4. 计算有效期
    - expiry_date = 当前日期 + category.validity_days
    ↓
5. 创建读者
    INSERT INTO readers
    (reader_no, name, category_id, user_id, gender, id_card, organization,
     address, phone, email, registration_date, expiry_date, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, date('now'), ?, 'active', ?)
    ↓
返回创建的读者
```

**涉及的表变更**:
1. **readers** - 新增1条记录
   - status 默认为 'active'
   - registration_date 默认为当前日期

**读者编号自动生成规则**:
```
格式: {CATEGORY_CODE}{YYYYMMDD}{4位顺序号}
示例: STUDENT202512290001
```

**关键代码**:
```typescript
// src/main/domains/reader/reader.repository.ts:252-285
generateNextReaderNo(categoryId: number): string {
  const category = this.findCategoryById(categoryId)
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD
  const prefix = `${category.code}${dateStr}`

  // 查找今天同类别的最大编号
  const stmt = db.prepare(`
    SELECT reader_no FROM readers
    WHERE reader_no LIKE ?
    ORDER BY reader_no DESC
    LIMIT 1
  `)
  const result = stmt.get(`${prefix}%`) as { reader_no?: string } | undefined

  let sequence = 1
  if (result?.reader_no) {
    const lastSequence = result.reader_no.slice(prefix.length)
    const lastNum = parseInt(lastSequence, 10)
    if (!isNaN(lastNum)) {
      sequence = lastNum + 1
    }
  }

  const sequenceStr = sequence.toString().padStart(4, '0')
  return `${prefix}${sequenceStr}`
}
```

#### 3.3.2 更新读者 (updateReader)

**入口**: `src/main/domains/reader/reader.service.ts:119`

**流程图**:
```
更新读者
    ↓
updateReader(id, updates)
    ↓
1. 查找现有读者
    ↓
2. 如果更新了种类
    - 重新计算有效期
    - expiry_date = 当前日期 + newCategory.validity_days
    ↓
3. 更新读者
    UPDATE readers
    SET {updated_fields},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    ↓
返回更新后的读者
```

**涉及的表变更**:
1. **readers** - 更新1条记录
   - 根据传入的 updates 更新对应字段
   - updated_at 自动更新

#### 3.3.3 删除读者 (deleteReader)

**入口**: `src/main/domains/reader/reader.service.ts:243`

**流程图**:
```
删除读者
    ↓
deleteReader(id)
    ↓
1. 查找读者
    ↓
2. 检查是否有未归还的借阅记录
    SELECT COUNT(*) FROM borrowing_records
    WHERE reader_id = ? AND status IN ('borrowed', 'overdue')
    ↓
3. 如果有未归还记录，抛出错误
    ↓
4. 删除读者
    DELETE FROM readers WHERE id = ?
    ↓
完成
```

**涉及的表变更**:
1. **readers** - 删除1条记录

### 3.4 用户管理流程

#### 3.4.1 创建用户

**入口**: `src/main/domains/auth/user.repository.ts:28`

**流程图**:
```
创建用户
    ↓
create(user)
    ↓
INSERT INTO users
(username, password, name, role, reader_id, email, phone)
VALUES (?, ?, ?, ?, ?, ?, ?)
    ↓
返回创建的用户
```

**涉及的表变更**:
1. **users** - 新增1条记录

#### 3.4.2 更新用户

**入口**: `src/main/domains/auth/user.repository.ts:42`

**流程图**:
```
更新用户
    ↓
update(id, updates)
    ↓
UPDATE users
SET {updated_fields},
    updated_at = CURRENT_TIMESTAMP
WHERE id = ?
    ↓
返回更新后的用户
```

**涉及的表变更**:
1. **users** - 更新1条记录

### 3.5 AI对话流程

#### 3.5.1 创建对话

**入口**: `src/main/domains/ai/conversation.repository.ts:23`

**流程图**:
```
创建AI对话
    ↓
create(userId, title, messages)
    ↓
INSERT INTO ai_conversations
(user_id, title, messages)
VALUES (?, ?, ?)
    ↓
messages 参数会被 JSON.stringify()
    ↓
返回创建的对话
```

**涉及的表变更**:
1. **ai_conversations** - 新增1条记录
   - messages 字段存储为 JSON 字符串

#### 3.5.2 更新对话

**入口**: `src/main/domains/ai/conversation.repository.ts:71`

**流程图**:
```
更新AI对话
    ↓
update(id, title, messages)
    ↓
UPDATE ai_conversations
SET title = ?,
    messages = ?,
    updated_at = CURRENT_TIMESTAMP
WHERE id = ?
    ↓
messages 参数会被 JSON.stringify()
    ↓
返回更新后的对话
```

**涉及的表变更**:
1. **ai_conversations** - 更新1条记录
   - title, messages, updated_at 更新

#### 3.5.3 删除对话

**入口**: `src/main/domains/ai/conversation.repository.ts:82`

**流程图**:
```
删除AI对话
    ↓
delete(id)
    ↓
DELETE FROM ai_conversations WHERE id = ?
    ↓
完成
```

**涉及的表变更**:
1. **ai_conversations** - 删除1条记录

---

## 4. 数据变更追踪

### 4.1 表结构变更历史

#### 版本1 (初始版本)
- 创建基础表结构
- users表支持2角色: admin, librarian
- readers表无user_id字段
- 无version字段（乐观锁）
- 无is_deleted字段（软删除）
- 无operation_logs表
- 无audit_logs表

#### 版本2 (当前版本)
通过 `DatabaseMigration.migrate()` 升级：

**新增字段**:
- 所有业务表添加 `version INTEGER DEFAULT 1` (乐观锁)
- 所有业务表添加 `is_deleted BOOLEAN DEFAULT 0` (软删除)

**新增表**:
- `operation_logs` - 操作日志表
- `audit_logs` - 审计日志表
- `database_version` - 数据库版本表

**新增索引**:
- operation_logs相关索引
- audit_logs相关索引
- 软删除查询优化索引
- 乐观锁索引

### 4.2 每次操作的数据变更汇总

| 操作 | 涉及表 | 变更类型 | 变更内容 |
|------|--------|----------|----------|
| **借书** | borrowing_records | INSERT | 新增借阅记录 |
| | books | UPDATE | available_quantity 减1 |
| **还书** | borrowing_records | UPDATE | status='returned', return_date, fine_amount |
| | books | UPDATE | available_quantity 加1 |
| **续借** | borrowing_records | UPDATE | due_date, renewal_count 加1 |
| **图书丢失** | borrowing_records | UPDATE | status='lost', fine_amount |
| | books | UPDATE | total_quantity 减1 |
| **创建图书** | books | INSERT | 新增图书记录 |
| **更新图书** | books | UPDATE | 根据updates更新字段 |
| **增加馆藏** | books | UPDATE | total_quantity, available_quantity 增加 |
| **删除图书** | books | DELETE | 删除图书记录 |
| **创建读者** | readers | INSERT | 新增读者记录 |
| **更新读者** | readers | UPDATE | 根据updates更新字段 |
| **删除读者** | readers | DELETE | 删除读者记录 |
| **创建用户** | users | INSERT | 新增用户记录 |
| **更新用户** | users | UPDATE | 根据updates更新字段 |
| **创建AI对话** | ai_conversations | INSERT | 新增对话记录 |
| **更新AI对话** | ai_conversations | UPDATE | title, messages |
| **删除AI对话** | ai_conversations | DELETE | 删除对话记录 |

### 4.3 关键业务规则

#### 借阅限制
1. 读者状态必须为 `active`
2. 读者证未过期
3. 未达到最大借阅数量（根据读者种类）
4. 无逾期未还的图书
5. 图书状态为 `normal`
6. 图书可借数量 >= 1
7. 不能重复借阅同一本书

#### 续借限制
1. 借阅状态必须为 `borrowed`
2. 续借次数 <= 2
3. 未逾期

#### 删除限制
1. 图书：不能删除有未归还借阅记录的图书
2. 读者：不能删除有未归还借阅记录的读者
3. 图书类别：不能删除有图书使用的类别

### 4.4 数据一致性保证

所有关键操作都使用事务保证数据一致性：

```typescript
// 借书事务示例
const transaction = db.transaction(() => {
  // 1. 创建借阅记录
  const record = this.borrowingRepository.create({...})

  // 2. 减少图书可借数量
  this.bookRepository.decreaseAvailableQuantity(bookId, 1)

  return record
})

const result = transaction()
```

事务确保：
- 要么全部成功，要么全部回滚
- 避免数据不一致
- 保证业务逻辑完整性

---

## 附录

### A. 业务配置参数

```typescript
// src/main/config/index.ts
business: {
  maxRenewalCount: 2,        // 最大续借次数
  overdueFinePerDay: 0.1,    // 逾期罚款（元/天）
  maxOverdueDays: 90          // 最大逾期天数
}
```

### B. 默认数据

**默认管理员**:
- 用户名: `admin`
- 密码: `admin123`
- 角色: `admin`

**默认读者种类**:
| 编码 | 名称 | 最大借阅数 | 最大借阅天数 | 有效期 |
|------|------|------------|--------------|--------|
| STUDENT | 学生 | 5 | 30 | 365 |
| TEACHER | 教师 | 10 | 60 | 1095 |
| STAFF | 职工 | 8 | 45 | 730 |

**默认图书类别**:
| 编码 | 名称 | 关键词 |
|------|------|--------|
| TP | 计算机科学 | 编程,算法,软件,硬件 |
| I | 文学 | 小说,诗歌,散文,戏剧 |
| K | 历史地理 | 历史,地理,考古 |
| O | 数理科学 | 数学,物理,化学 |
| J | 艺术 | 音乐,美术,设计,摄影 |

### C. 外键关系图

```
users
  ├── reader_id → readers(id) [ON DELETE SET NULL]
  └── (被 ai_conversations.user_id 引用) [ON DELETE CASCADE]

readers
  ├── category_id → reader_categories(id) [ON DELETE RESTRICT]
  └── user_id → users(id) [ON DELETE SET NULL]

books
  └── category_id → book_categories(id) [ON DELETE RESTRICT]

borrowing_records
  ├── reader_id → readers(id) [ON DELETE RESTRICT]
  └── book_id → books(id) [ON DELETE RESTRICT]

book_categories
  └── parent_id → book_categories(id) [ON DELETE SET NULL] (自引用)

ai_conversations
  └── user_id → users(id) [ON DELETE CASCADE]

operation_logs
  └── created_by → users(id) [ON DELETE SET NULL]

audit_logs
  └── user_id → users(id) [ON DELETE SET NULL]
```

---

**文档版本**: 1.0
**最后更新**: 2025-12-29
**作者**: 系统分析
