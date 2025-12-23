# 借阅管理搜索功能增强计划

## 目标
将借阅管理部分的搜索功能改进为类似书籍搜索的模糊搜索，支持通过读者编号、读者姓名、图书标题、图书ISBN、图书作者等多个字段进行匹配搜索，并支持借书日期范围筛选。

## 当前实现分析

### 前端 (Borrowing.vue)
- `searchBorrowedBooks` 函数（第420-443行）在前端进行数据过滤
- 只支持 `reader_name` 和 `reader_no` 字段
- 使用简单的 `includes()` 方法进行字符串匹配
- 搜索框提示文本：`"搜索读者姓名或编号"`

### 后端 (borrowing.repository.ts)
- `findAll` 方法只支持 `reader_id`、`book_id`、`status` 过滤
- 没有关键词搜索功能
- 没有日期范围搜索功能

### 参考实现 (book.repository.ts)
- `findAll` 方法使用 SQL `LIKE` 操作符
- 支持多个字段的模糊搜索：`title`、`author`、`publisher`、`isbn`
- 搜索模式：`%keyword%`
- `advancedSearch` 方法支持日期范围搜索

## 修改方案

### 1. 修改 borrowing.repository.ts

在 `findAll` 方法中添加 `keyword` 和日期范围参数支持：

```typescript
findAll(filters?: {
  reader_id?: number
  book_id?: number
  status?: string
  keyword?: string          // 新增：关键词模糊搜索
  borrow_date_from?: string  // 新增：借书日期起始
  borrow_date_to?: string    // 新增：借书日期结束
}): BorrowingRecordWithDetails[]
```

实现 SQL 模糊搜索和日期范围筛选：

```sql
-- 关键词模糊搜索
AND (
  r.name LIKE ? OR
  r.reader_no LIKE ? OR
  b.title LIKE ? OR
  b.isbn LIKE ? OR
  b.author LIKE ?
)

-- 日期范围筛选
AND br.borrow_date >= ?
AND br.borrow_date <= ?
```

### 2. 修改 borrowing.service.ts

更新 `getAllRecords` 方法以传递 `keyword` 和日期范围参数：

```typescript
getAllRecords(filters?: {
  reader_id?: number
  book_id?: number
  status?: string
  keyword?: string          // 新增
  borrow_date_from?: string  // 新增
  borrow_date_to?: string    // 新增
}): BorrowingRecordWithDetails[]
```

### 3. 修改 Borrowing.vue

#### 3.1 添加日期范围选择器

在还书标签页添加日期范围选择器：

```vue
<div class="search-bar">
  <el-input
    v-model="returnSearchKeyword"
    placeholder="搜索读者编号/姓名、图书ISBN/书名..."
    style="width: 320px"
    @keyup.enter="searchBorrowedBooks"
    size="large"
    clearable
  >
    <template #prefix><el-icon><Search /></el-icon></template>
    <template #append>
      <el-button :icon="Search" @click="searchBorrowedBooks">搜索</el-button>
    </template>
  </el-input>
  <el-date-picker
    v-model="dateRange"
    type="daterange"
    range-separator="至"
    start-placeholder="借书起始日期"
    end-placeholder="借书结束日期"
    size="large"
    @change="searchBorrowedBooks"
    clearable
  />
</div>
```

#### 3.2 添加日期范围响应式变量

```javascript
const dateRange = ref<[Date, Date] | null>(null)
```

#### 3.3 更新 searchBorrowedBooks 函数

```javascript
const searchBorrowedBooks = async () => {
  // 构建搜索参数
  const searchParams: any = {
    status: 'borrowed'
  }

  // 添加关键词搜索
  if (returnSearchKeyword.value) {
    searchParams.keyword = returnSearchKeyword.value
  }

  // 添加日期范围搜索
  if (dateRange.value && dateRange.value.length === 2) {
    searchParams.borrow_date_from = dateRange.value[0].toISOString().split('T')[0]
    searchParams.borrow_date_to = dateRange.value[1].toISOString().split('T')[0]
  }

  const result = await window.api.borrowing.getAll(searchParams)
  if (result.success) {
    // 根据角色过滤记录
    borrowedBooks.value = filterRecordsByUser(result.data)

    // 计算逾期数量（仅教师/学生）
    if (!canViewAllRecords.value) {
      overdueCount.value = borrowedBooks.value.filter((r: any) => isOverdue(r.due_date)).length
    }
  }
}
```

#### 3.4 更新 loadAllRecords 函数

```javascript
const loadAllRecords = async () => {
  const searchParams: any = {}

  // 添加关键词搜索
  if (returnSearchKeyword.value) {
    searchParams.keyword = returnSearchKeyword.value
  }

  // 添加日期范围搜索
  if (dateRange.value && dateRange.value.length === 2) {
    searchParams.borrow_date_from = dateRange.value[0].toISOString().split('T')[0]
    searchParams.borrow_date_to = dateRange.value[1].toISOString().split('T')[0]
  }

  const result = await window.api.borrowing.getAll(searchParams)
  if (result.success) {
    // 根据角色过滤记录
    allRecords.value = filterRecordsByUser(result.data)
  }
}
```

#### 3.5 更新搜索区域样式

```css
.search-bar {
  margin-bottom: 20px;
  display: flex;
  gap: 12px;
  align-items: center;
}
```

## 修改文件清单

1. `src/main/domains/borrowing/borrowing.repository.ts`
2. `src/main/domains/borrowing/borrowing.service.ts`
3. `src/renderer/src/views/Borrowing.vue`

## 预期效果

修改后，用户可以：

### 关键词搜索
- 输入读者编号进行模糊匹配
- 输入读者姓名进行模糊匹配
- 输入图书ISBN进行模糊匹配
- 输入图书书名进行模糊匹配
- 输入图书作者进行模糊匹配

### 日期范围筛选
- 选择借书起始日期
- 选择借书结束日期
- 组合关键词和日期范围进行精确筛选

搜索将在数据库层面完成，性能更好，体验更流畅。

## 实施步骤

1. 修改 `borrowing.repository.ts` 添加 keyword 和日期范围参数
2. 修改 `borrowing.service.ts` 更新 getAllRecords 方法
3. 修改 `Borrowing.vue` 添加日期范围选择器组件
4. 修改 `Borrowing.vue` 更新 searchBorrowedBooks 函数
5. 修改 `Borrowing.vue` 更新 loadAllRecords 函数
6. 更新搜索区域样式
7. 测试验证功能
