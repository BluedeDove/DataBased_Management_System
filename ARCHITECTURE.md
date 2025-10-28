# 项目架构设计文档

## 🏗️ 总体架构

本项目采用 **Electron + Vue3** 构建跨平台桌面应用，遵循 **领域驱动设计（DDD）** 和 **分层架构** 原则。

```
┌─────────────────────────────────────┐
│         渲染进程 (Frontend)          │
│    Vue3 + TypeScript + Element Plus │
└─────────────────────────────────────┘
                  ↕ IPC
┌─────────────────────────────────────┐
│         主进程 (Backend)             │
│  领域驱动设计 + 分层架构              │
└─────────────────────────────────────┘
                  ↕
┌─────────────────────────────────────┐
│         数据层 (Database)            │
│           SQLite 数据库              │
└─────────────────────────────────────┘
```

## 📊 数据流架构

### 请求流程
```
用户操作 → Vue组件 → window.api → IPC → Handler → Service → Repository → Database
```

### 响应流程
```
Database → Repository → Service → Handler → IPC → window.api → Vue组件 → 用户界面
```

## 🔧 后端架构详解

### 1. 分层设计

#### **表现层 (Presentation Layer)**
- **位置**: `src/main/lib/ipcHandlers.ts`
- **职责**:
  - 接收前端IPC请求
  - 参数验证
  - 调用Service层
  - 统一错误处理
  - 返回格式化响应

```typescript
// 示例：借书处理器
ipcMain.handle('borrowing:borrow', async (_, readerId, bookId) => {
  try {
    const result = await borrowingService.borrowBook(readerId, bookId)
    return { success: true, data: result }
  } catch (error) {
    return errorHandler.handle(error)
  }
})
```

#### **业务层 (Service Layer)**
- **位置**: `src/main/domains/*/xxx.service.ts`
- **职责**:
  - 实现核心业务逻辑
  - 编排多个Repository操作
  - 执行业务规则验证
  - 处理事务
  - 抛出业务异常

```typescript
// 示例：借书业务逻辑
class BorrowingService {
  async borrowBook(readerId, bookId) {
    // 1. 验证读者
    const reader = await readerRepository.findById(readerId)
    if (reader.status !== 'active') {
      throw new BusinessError('读者证未激活')
    }

    // 2. 验证图书
    const book = await bookRepository.findById(bookId)
    if (book.available_quantity < 1) {
      throw new StockUnavailableError()
    }

    // 3. 检查借阅限制
    const currentCount = await readerRepository.getBorrowingCount(readerId)
    if (currentCount >= reader.max_borrow_count) {
      throw new BorrowLimitError()
    }

    // 4. 执行借阅（事务）
    return db.transaction(() => {
      const record = borrowingRepository.create({...})
      bookRepository.decreaseAvailableQuantity(bookId)
      return record
    })
  }
}
```

#### **数据访问层 (Repository Layer)**
- **位置**: `src/main/domains/*/xxx.repository.ts`
- **职责**:
  - 封装数据库操作
  - 提供CRUD方法
  - 执行SQL查询
  - 数据映射

```typescript
// 示例：图书数据访问
class BookRepository {
  findById(id: number): Book | undefined {
    return db.prepare('SELECT * FROM books WHERE id = ?').get(id)
  }

  update(id: number, updates: Partial<Book>): Book {
    // SQL UPDATE 操作
  }

  decreaseAvailableQuantity(id: number, amount: number) {
    db.prepare(`
      UPDATE books
      SET available_quantity = available_quantity - ?
      WHERE id = ?
    `).run(amount, id)
  }
}
```

### 2. 领域划分

项目按业务能力划分为4个核心领域：

#### **认证领域 (Auth Domain)**
- 用户登录/登出
- 密码管理
- Token验证
- 权限控制

#### **图书领域 (Book Domain)**
- 图书CRUD
- 图书分类管理
- 库存管理
- 图书状态管理

#### **读者领域 (Reader Domain)**
- 读者CRUD
- 读者种类管理
- 读者证管理
- 借阅权限验证

#### **借阅领域 (Borrowing Domain)**
- 借书业务
- 还书业务
- 续借业务
- 逾期处理
- 罚款计算

## 🎨 前端架构详解

### 1. 组件层次

```
App.vue
├── Layout.vue (主布局)
│   ├── Sidebar (侧边栏)
│   ├── Header (顶部栏)
│   └── Main Content
│       ├── Dashboard (仪表盘)
│       ├── Books (图书管理)
│       ├── Readers (读者管理)
│       ├── Borrowing (借还管理)
│       ├── Statistics (统计分析)
│       └── Settings (系统设置)
└── Login.vue (登录页)
```

### 2. 状态管理

使用 **Pinia** 进行全局状态管理：

```typescript
// 用户状态
const useUserStore = defineStore('user', {
  state: () => ({
    user: null,
    token: ''
  }),
  getters: {
    isLoggedIn: (state) => !!state.token,
    isAdmin: (state) => state.user?.role === 'admin'
  },
  actions: {
    login(credentials),
    logout(),
    changePassword()
  }
})
```

### 3. 路由设计

```typescript
const routes = [
  {
    path: '/login',
    component: Login,
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: Layout,
    meta: { requiresAuth: true },
    children: [
      { path: 'dashboard', component: Dashboard },
      { path: 'books', component: Books },
      { path: 'readers', component: Readers },
      { path: 'borrowing', component: Borrowing },
      { path: 'statistics', component: Statistics },
      { path: 'settings', component: Settings }
    ]
  }
]
```

## 🗄️ 数据库设计

### ER图概览

```
users (系统用户)
    ↓
reader_categories (读者种类)
    ↓
readers (读者信息)
    ↓
borrowing_records (借阅记录)
    ↓
books (图书信息)
    ↓
book_categories (图书分类)
```

### 核心表结构

#### users (用户表)
- id, username, password, name, role, email, phone

#### reader_categories (读者种类)
- id, code, name, max_borrow_count, max_borrow_days, validity_days

#### readers (读者表)
- id, reader_no, name, category_id, gender, status, expiry_date

#### book_categories (图书分类)
- id, code, name, keywords, parent_id

#### books (图书表)
- id, isbn, title, author, publisher, category_id
- total_quantity, available_quantity, status

#### borrowing_records (借阅记录)
- id, reader_id, book_id, borrow_date, due_date, return_date
- renewal_count, status, fine_amount

### 索引设计

- 读者编号索引: `readers(reader_no)`
- 图书ISBN索引: `books(isbn)`
- 借阅状态索引: `borrowing_records(status)`
- 借阅日期索引: `borrowing_records(borrow_date, due_date)`

## 🔒 安全设计

### 1. Electron安全配置

```typescript
webPreferences: {
  nodeIntegration: false,        // 禁用Node集成
  contextIsolation: true,        // 启用上下文隔离
  preload: path.join(__dirname, 'preload.js')
}
```

### 2. API隔离

通过 `contextBridge` 安全地暴露API：

```typescript
contextBridge.exposeInMainWorld('api', {
  auth: { login, logout, ... },
  book: { getAll, create, ... },
  // 只暴露必要的API
})
```

### 3. 数据验证

- 前端表单验证
- 后端Service层业务验证
- SQL参数化查询防止注入

## 🚀 性能优化

### 1. 数据库优化
- 使用索引加速查询
- 批量操作使用事务
- 连接池管理

### 2. 前端优化
- 组件懒加载
- 路由懒加载
- 虚拟滚动（大列表）
- 防抖节流

### 3. 渲染优化
- 页面过渡动画
- 骨架屏加载
- 数据缓存

## 📝 编码规范

### 命名约定
- 类名: PascalCase (UserService)
- 函数名: camelCase (getUserById)
- 变量名: camelCase (userName)
- 常量名: UPPER_SNAKE_CASE (MAX_COUNT)
- 文件名: kebab-case (user-service.ts)

### TypeScript规范
- 所有公共API必须有类型注解
- 避免使用 `any` 类型
- 使用接口定义数据结构
- 使用枚举定义常量集合

### 错误处理
- 使用自定义错误类
- 统一错误处理机制
- 友好的错误提示

## 🧪 测试策略

### 单元测试
- Service层业务逻辑测试
- Repository层数据访问测试
- 使用Mock隔离依赖

### 集成测试
- IPC通信测试
- 数据库事务测试

### E2E测试
- 关键业务流程测试
- 用户交互测试

## 🔄 扩展性设计

### 1. 插件化架构
- 领域模块独立
- 易于添加新领域
- 服务可替换

### 2. 配置化
- 业务规则配置化
- 系统参数可调整

### 3. 未来扩展
- AI语义搜索（向量数据库）
- AI智能助手（RAG）
- 数据导入导出
- 报表生成
- 移动端适配

---

**本架构设计确保了系统的高可维护性、可扩展性和可测试性** ✨
