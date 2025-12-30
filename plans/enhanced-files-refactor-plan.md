# -enhanced 文件重构实施计划

## 方案 A：合并增强功能到基础文件

---

## 一、重构目标

1. 消除代码冗余，删除未使用的 `-enhanced` 文件
2. 将增强功能合并到基础文件，通过配置开关控制
3. 保持向后兼容，不影响现有功能
4. 提高代码可维护性和清晰度

---

## 二、文件变更清单

### 2.1 需要删除的文件

```
src/main/domains/book/book.repository-enhanced.ts
src/renderer/src/views/Borrowing-enhanced.vue
```

### 2.2 需要修改的文件

```
src/main/domains/book/book.repository.ts       # 合并增强功能
src/main/domains/book/book.service.ts          # 更新使用方式
src/main/domains/book/book.repository.config.ts # 新增配置文件
```

### 2.3 新增文件

```
src/main/domains/book/book.repository.config.ts  # 配置选项
```

---

## 三、详细实施步骤

### 步骤 1：创建配置文件

**文件：** `src/main/domains/book/book.repository.config.ts`

```typescript
/**
 * BookRepository 配置选项
 *
 * 通过配置开关控制是否启用增强功能：
 * - useAsync: 是否使用异步方法（默认 false）
 * - useOptimisticLock: 是否使用乐观锁（默认 false）
 * - useSoftDelete: 是否使用软删除（默认 false）
 * - useAuditLog: 是否记录审计日志（默认 false）
 */

export interface BookRepositoryConfig {
  /** 是否使用异步方法 */
  useAsync: boolean
  /** 是否使用乐观锁 */
  useOptimisticLock: boolean
  /** 是否使用软删除 */
  useSoftDelete: boolean
  /** 是否记录审计日志 */
  useAuditLog: boolean
}

/**
 * 默认配置：关闭所有增强功能，保持向后兼容
 */
export const defaultConfig: BookRepositoryConfig = {
  useAsync: false,
  useOptimisticLock: false,
  useSoftDelete: false,
  useAuditLog: false
}

/**
 * 生产环境配置：启用所有增强功能
 */
export const productionConfig: BookRepositoryConfig = {
  useAsync: true,
  useOptimisticLock: true,
  useSoftDelete: true,
  useAuditLog: true
}

/**
 * 当前使用的配置（可通过环境变量或配置文件修改）
 */
export const currentConfig: BookRepositoryConfig = defaultConfig
```

---

### 步骤 2：重构 book.repository.ts

**目标：** 合并基础版和增强版的功能

**主要变更：**

1. **更新类型定义**：添加可选的 `version` 和 `is_deleted` 字段
2. **保留同步方法**：确保现有代码不受影响
3. **添加异步方法**：提供增强功能
4. **添加软删除方法**：`softDelete()`, `restore()`, `getDeletedBooks()`, `hardDelete()`
5. **添加乐观锁支持**：使用 `OptimisticLockManager`
6. **添加审计日志**：使用 `AuditLogger` 和 `OperationLogger`
7. **配置驱动**：通过配置控制功能启用

**关键代码结构：**

```typescript
// 导入增强功能的依赖
import { OptimisticLockManager, OptimisticLockError } from '../../lib/optimisticLock'
import { SoftDeleteManager } from '../../lib/softDelete'
import { OperationLogger } from '../../lib/operationLogger'
import { AuditLogger } from '../../lib/auditLogger'
import { currentConfig } from './book.repository.config'

// 更新接口定义
export interface Book {
  id: number
  isbn: string
  title: string
  // ... 其他字段
  version?: number           // 新增：可选字段
  is_deleted?: boolean       // 新增：可选字段
  // ...
}

export class BookRepository {
  // ========== 基础方法（同步，保持向后兼容） ==========

  findAll(filters?: { ... }): BookWithCategory[] {
    // 基础实现
    // 如果启用软删除，自动过滤 is_deleted = 0
  }

  findById(id: number): BookWithCategory | undefined {
    // 基础实现
  }

  create(book: Omit<Book, 'id' | 'created_at' | 'updated_at'>): Book {
    // 基础实现
  }

  update(id: number, updates: Partial<Book>): Book {
    // 基础实现
  }

  delete(id: number): void {
    // 基础实现：硬删除
  }

  // ========== 增强方法（异步，可选启用） ==========

  async createAsync(book: Omit<Book, 'id' | 'created_at' | 'updated_at'>, userId?: number): Promise<Book> {
    if (!currentConfig.useAsync) {
      throw new Error('异步功能未启用，请在配置中设置 useAsync = true')
    }
    // 增强实现：使用 OperationLogger 和 AuditLogger
  }

  async updateAsync(id: number, updates: Partial<Book>, userId?: number): Promise<Book> {
    if (!currentConfig.useAsync) {
      throw new Error('异步功能未启用，请在配置中设置 useAsync = true')
    }
    // 增强实现：使用 OptimisticLockManager
  }

  // ========== 软删除方法 ==========

  async softDelete(id: number, userId?: number, reason?: string): Promise<boolean> {
    if (!currentConfig.useSoftDelete) {
      throw new Error('软删除功能未启用，请在配置中设置 useSoftDelete = true')
    }
    // 使用 SoftDeleteManager
  }

  async restore(id: number, userId?: number): Promise<boolean> {
    if (!currentConfig.useSoftDelete) {
      throw new Error('软删除功能未启用，请在配置中设置 useSoftDelete = true')
    }
    // 恢复软删除的记录
  }

  getDeletedBooks(limit: number = 50, offset: number = 0): BookWithCategory[] {
    if (!currentConfig.useSoftDelete) {
      throw new Error('软删除功能未启用，请在配置中设置 useSoftDelete = true')
    }
    // 获取已删除的记录
  }

  async hardDelete(id: number, userId?: number): Promise<boolean> {
    if (!currentConfig.useSoftDelete) {
      throw new Error('软删除功能未启用，请在配置中设置 useSoftDelete = true')
    }
    // 硬删除（仅限管理员）
  }

  // ========== 其他方法保持不变 ==========

  findAllCategories(): BookCategory[] { /* ... */ }
  findCategoryById(id: number): BookCategory | undefined { /* ... */ }
  createCategory(category: Omit<BookCategory, 'id' | 'created_at' | 'updated_at'>): BookCategory { /* ... */ }
  updateCategory(id: number, updates: Partial<BookCategory>): BookCategory { /* ... */ }
  deleteCategory(id: number): void { /* ... */ }
  findByIsbn(isbn: string): BookWithCategory | undefined { /* ... */ }
  decreaseAvailableQuantity(id: number, amount: number = 1): void { /* ... */ }
  increaseAvailableQuantity(id: number, amount: number = 1): void { /* ... */ }
  advancedSearch(filters: { ... }): BookWithCategory[] { /* ... */ }
  getBorrowingStatus(bookId: number): { ... } { /* ... */ }
  generateNextISBN(categoryId: number): string { /* ... */ }
  getTotalCount(): number { /* ... */ }
}
```

---

### 步骤 3：更新 book.service.ts

**目标：** 更新服务层以支持新的 API

**主要变更：**

1. 保留现有方法（使用同步 API）
2. 添加新的异步方法（可选）
3. 添加软删除相关方法

**关键代码结构：**

```typescript
export class BookService {
  private bookRepository = new BookRepository()

  // ========== 现有方法保持不变 ==========

  getAllCategories(): BookCategory[] { /* ... */ }
  getCategoryById(id: number): BookCategory { /* ... */ }
  createCategory(data: Omit<BookCategory, 'id' | 'created_at' | 'updated_at'>): BookCategory { /* ... */ }
  updateCategory(id: number, updates: Partial<BookCategory>): BookCategory { /* ... */ }
  deleteCategory(id: number): void { /* ... */ }
  getAllBooks(filters?: { ... }): BookWithCategory[] { /* ... */ }
  getBookById(id: number): BookWithCategory { /* ... */ }
  getBookByIsbn(isbn: string): BookWithCategory { /* ... */ }
  createBook(data: Omit<Book, 'id' | 'created_at' | 'updated_at'>): Book { /* ... */ }
  updateBook(id: number, updates: Partial<Book>): Book { /* ... */ }
  addCopies(id: number, quantity: number): Book { /* ... */ }
  destroyBook(id: number, reason: string): Book { /* ... */ }
  markAsLost(id: number): Book { /* ... */ }
  markAsDamaged(id: number, notes?: string): Book { /* ... */ }
  advancedSearch(criteria: { ... }): BookWithCategory[] { /* ... */ }
  advancedSearchBooks(filters: { ... }): BookWithCategory[] { /* ... */ }
  canBorrow(bookId: number): { canBorrow: boolean; reason?: string } { /* ... */ }
  getBorrowingStatus(bookId: number) { /* ... */ }
  getPopularBooks(limit: number = 10): Array<BookWithCategory & { borrow_count: number }> { /* ... */ }
  getNewBooks(limit: number = 10): BookWithCategory[] { /* ... */ }
  getCategoryStatistics(): Array<{ category_name: string; book_count: number; available_count: number }> { /* ... */ }
  deleteBook(id: number): void { /* ... */ }
  getAllBooksForExport(): Array<BookWithCategory> { /* ... */ }

  // ========== 新增方法（异步，可选） ==========

  async createBookAsync(data: Omit<Book, 'id' | 'created_at' | 'updated_at'>, userId?: number): Promise<Book> {
    return await this.bookRepository.createAsync(data, userId)
  }

  async updateBookAsync(id: number, updates: Partial<Book>, userId?: number): Promise<Book> {
    return await this.bookRepository.updateAsync(id, updates, userId)
  }

  // ========== 新增方法（软删除） ==========

  async softDeleteBook(id: number, userId?: number, reason?: string): Promise<boolean> {
    return await this.bookRepository.softDelete(id, userId, reason)
  }

  async restoreBook(id: number, userId?: number): Promise<boolean> {
    return await this.bookRepository.restore(id, userId)
  }

  getDeletedBooks(limit: number = 50, offset: number = 0): BookWithCategory[] {
    return this.bookRepository.getDeletedBooks(limit, offset)
  }

  async hardDeleteBook(id: number, userId?: number): Promise<boolean> {
    return await this.bookRepository.hardDelete(id, userId)
  }
}
```

---

### 步骤 4：删除未使用的文件

```bash
# 删除后端增强版
rm src/main/domains/book/book.repository-enhanced.ts

# 删除前端增强版
rm src/renderer/src/views/Borrowing-enhanced.vue
```

---

### 步骤 5：验证和测试

1. **编译检查**：确保 TypeScript 编译通过
2. **功能测试**：测试所有图书管理功能
3. **向后兼容测试**：确保现有功能不受影响
4. **配置测试**：测试配置开关是否正常工作

---

## 四、迁移指南

### 4.1 启用增强功能

**方式一：修改配置文件**

```typescript
// src/main/domains/book/book.repository.config.ts
export const currentConfig: BookRepositoryConfig = {
  useAsync: true,
  useOptimisticLock: true,
  useSoftDelete: true,
  useAuditLog: true
}
```

**方式二：通过环境变量（推荐）**

```typescript
// src/main/domains/book/book.repository.config.ts
export const currentConfig: BookRepositoryConfig = {
  useAsync: process.env.USE_ASYNC === 'true',
  useOptimisticLock: process.env.USE_OPTIMISTIC_LOCK === 'true',
  useSoftDelete: process.env.USE_SOFT_DELETE === 'true',
  useAuditLog: process.env.USE_AUDIT_LOG === 'true'
}
```

### 4.2 使用异步方法

```typescript
// 旧方式（同步）
const book = bookService.createBook(data)

// 新方式（异步，需要启用 useAsync）
const book = await bookService.createBookAsync(data, userId)
```

### 4.3 使用软删除

```typescript
// 软删除（需要启用 useSoftDelete）
await bookService.softDeleteBook(bookId, userId, '图书损坏')

// 恢复删除
await bookService.restoreBook(bookId, userId)

// 获取已删除的图书
const deletedBooks = bookService.getDeletedBooks()

// 硬删除（永久删除）
await bookService.hardDeleteBook(bookId, userId)
```

---

## 五、风险评估和缓解措施

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 破坏现有功能 | 高 | 中 | 保留同步方法，默认关闭增强功能 |
| 性能下降 | 中 | 低 | 通过配置开关控制，按需启用 |
| 配置复杂度增加 | 低 | 中 | 提供默认配置和文档 |
| 数据迁移问题 | 高 | 低 | 检查数据库 schema，确保支持新字段 |

---

## 六、后续优化建议

1. **统一其他 Repository**：将其他 domain 的 repository 也采用相同模式
2. **添加单元测试**：为增强功能编写完整的单元测试
3. **性能监控**：监控增强功能的性能影响
4. **文档完善**：完善 API 文档和使用指南
5. **代码审查**：进行代码审查，确保代码质量

---

## 七、时间估算

| 步骤 | 预计工作量 |
|------|-----------|
| 步骤 1：创建配置文件 | 30 分钟 |
| 步骤 2：重构 book.repository.ts | 2-3 小时 |
| 步骤 3：更新 book.service.ts | 1 小时 |
| 步骤 4：删除未使用文件 | 10 分钟 |
| 步骤 5：验证和测试 | 1-2 小时 |
| **总计** | **4-6 小时** |

---

## 八、验收标准

- [ ] 所有 TypeScript 编译错误已解决
- [ ] 现有功能测试通过
- [ ] 配置开关正常工作
- [ ] 未使用的 `-enhanced` 文件已删除
- [ ] 代码符合项目编码规范
- [ ] 文档已更新
