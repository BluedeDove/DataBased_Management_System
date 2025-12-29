# 多问题修复计划

## 概述
本文档详细描述了需要修复的4个问题及其解决方案。

## 问题1：Books.vue高级搜索中的"An object could not be cloned"错误

### 问题描述
- 错误位置：`Books.vue:324` 在 `handleAdvancedSearch` 函数中
- 错误信息：`Error: An object could not be cloned`
- 影响范围：正则匹配功能无法正常使用

### 根本原因
在 `Books.vue` 第324行调用 `window.api.book.regexSearch(advancedForm.pattern, advancedForm.fields)` 时，`advancedForm.fields` 是一个数组对象，通过Electron IPC传递时可能无法被正确序列化。

### 解决方案

#### 前端修改 (Books.vue)
1. 修改 `handleAdvancedSearch` 函数，确保参数正确传递：
   ```typescript
   const handleAdvancedSearch = async () => {
     loading.value = true
     advancedSearchVisible.value = false
     try {
       let result
       if (searchType.value === 'regex') {
         // 确保fields是字符串数组
         const fields = Array.isArray(advancedForm.fields) ? advancedForm.fields : ['title', 'author']
         result = await window.api.book.regexSearch(advancedForm.pattern, fields)
       }
       // ... 其他搜索类型
     }
   }
   ```

#### 后端验证 (ipcHandlers.ts)
- 确认 `book:regexSearch` IPC处理器正确接收参数
- 验证 `RegexSearchService.searchBooks` 方法能正确处理参数

### 测试验证
- 测试正则表达式搜索功能
- 验证不同字段组合的搜索结果

---

## 问题2：图书类别功能增强

### 问题描述
1. 主搜索栏的类别选择只有硬编码的"科技"和"文学"两个选项
2. 高级搜索对话框中没有图书类别选项
3. 类别数据与实际数据库中的类别不匹配

### 数据库中的实际类别
根据 `database/index.ts`，默认图书类别包括：
- 计算机科学 (TP)
- 文学 (I)
- 历史地理 (K)
- 数理科学 (O)
- 艺术 (J)

### 解决方案

#### 前端修改 (Books.vue)

1. **修改主搜索栏的类别选择**
   ```vue
   <!-- 替换硬编码的类别选项 -->
   <el-select v-model="category" placeholder="图书类别" size="large" style="width: 160px" clearable @change="fetchData">
     <el-option label="全部" value="" />
     <el-option
       v-for="cat in categories"
       :key="cat.id"
       :label="cat.name"
       :value="cat.id"
     />
   </el-select>
   ```

2. **在高级搜索对话框中添加类别选择**
   ```vue
   <el-tab-pane label="正则匹配" name="regex">
     <el-form label-position="top">
       <el-form-item label="图书类别">
         <el-select v-model="advancedForm.category_id" placeholder="选择类别" clearable style="width: 100%">
           <el-option
             v-for="cat in categories"
             :key="cat.id"
             :label="cat.name"
             :value="cat.id"
           />
         </el-select>
       </el-form-item>
       <el-form-item label="正则表达式">
         <el-input v-model="advancedForm.pattern" placeholder="例如: ^Java.*Script$" />
       </el-form-item>
       <!-- ... 其他字段 -->
     </el-form>
   </el-tab-pane>
   ```

3. **修改advancedForm数据结构**
   ```typescript
   const advancedForm = reactive({
     category_id: null as number | null,
     pattern: '',
     fields: ['title', 'author'],
     sql: '',
     vectorQuery: ''
   })
   ```

4. **修改handleAdvancedSearch函数**
   ```typescript
   const handleAdvancedSearch = async () => {
     loading.value = true
     advancedSearchVisible.value = false
     try {
       let result
       if (searchType.value === 'regex') {
         const fields = Array.isArray(advancedForm.fields) ? advancedForm.fields : ['title', 'author']
         // 传递category_id参数
         result = await window.api.book.regexSearch(advancedForm.pattern, fields, advancedForm.category_id)
       }
       // ... 其他搜索类型
     }
   }
   ```

#### 后端修改

1. **修改RegexSearchService (regex-search.service.ts)**
   ```typescript
   searchBooks(pattern: string, fields: string[] = ['title', 'author', 'description'], categoryId?: number): BookWithCategory[] {
     try {
       const regex = new RegExp(pattern, 'i')
       const books = this.bookRepository.findAll()

       const results = books.filter(book => {
         // 先按类别筛选
         if (categoryId !== null && categoryId !== undefined && book.category_id !== categoryId) {
           return false
         }
         // 再按正则表达式筛选
         return fields.some(field => {
           const value = book[field as keyof BookWithCategory]
           if (typeof value === 'string') {
             return regex.test(value)
           }
           return false
         })
       })

       return results
     } catch (error: any) {
       throw new ValidationError(`无效的正则表达式: ${error.message}`)
     }
   }
   ```

2. **修改IPC处理器 (ipcHandlers.ts)**
   ```typescript
   ipcMain.handle('book:regexSearch', async (_, pattern, fields, categoryId) => {
     try {
       const books = regexSearchService.searchBooks(pattern, fields, categoryId)
       return { success: true, data: books } as SuccessResponse
     } catch (error) {
       return errorHandler.handle(error)
     }
   })
   ```

3. **修改preload/index.ts**
   ```typescript
   book: {
     // ...
     regexSearch: (pattern, fields, categoryId) => ipcRenderer.invoke('book:regexSearch', pattern, fields, categoryId),
     // ...
   }
   ```

### 测试验证
- 验证主搜索栏显示所有实际类别
- 验证高级搜索中类别选择功能
- 验证类别筛选与正则搜索组合使用

---

## 问题3：AI助手对话历史功能

### 问题描述
- AI助手是临时对话，刷新页面后历史记录丢失
- 前端已有历史对话列表UI，但只保存在内存中
- 需要实现对话历史持久化功能

### 解决方案

#### 数据库修改 (database/index.ts)

添加 `ai_conversations` 表：
```typescript
// 9. AI对话历史表
db.exec(`
  CREATE TABLE IF NOT EXISTS ai_conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    messages TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`)

// 创建索引
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id);
  CREATE INDEX IF NOT EXISTS idx_ai_conversations_created ON ai_conversations(created_at DESC);
`)
```

#### 后端修改

1. **创建AI对话历史Repository (src/main/domains/ai/conversation.repository.ts)**
   ```typescript
   import { db } from '../../database'

   export interface Conversation {
     id: number
     user_id: number
     title: string
     messages: string // JSON字符串
     created_at: string
     updated_at: string
   }

   export class ConversationRepository {
     create(userId: number, title: string, messages: any[]): Conversation {
       const stmt = db.prepare(`
         INSERT INTO ai_conversations (user_id, title, messages)
         VALUES (?, ?, ?)
       `)
       const result = stmt.run(userId, title, JSON.stringify(messages))
       return this.findById(result.lastInsertRowid as number)
     }

     findById(id: number): Conversation | undefined {
       const stmt = db.prepare('SELECT * FROM ai_conversations WHERE id = ?')
       const row = stmt.get(id) as any
       if (row) {
         row.messages = JSON.parse(row.messages)
       }
       return row
     }

     findByUserId(userId: number, limit: number = 20): Conversation[] {
       const stmt = db.prepare(`
         SELECT * FROM ai_conversations
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT ?
       `)
       const rows = stmt.all(userId, limit) as any[]
       return rows.map(row => ({
         ...row,
         messages: JSON.parse(row.messages)
       }))
     }

     update(id: number, title: string, messages: any[]): Conversation | undefined {
       const stmt = db.prepare(`
         UPDATE ai_conversations
         SET title = ?, messages = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?
       `)
       stmt.run(title, JSON.stringify(messages), id)
       return this.findById(id)
     }

     delete(id: number): void {
       db.prepare('DELETE FROM ai_conversations WHERE id = ?').run(id)
     }
   }
   ```

2. **修改AIService (ai.service.ts)**
   添加对话历史管理方法：
   ```typescript
   import { ConversationRepository } from './conversation.repository'

   export class AIService {
     private conversationRepository = new ConversationRepository()

     // 保存对话
     saveConversation(userId: number, title: string, messages: ChatMessage[]): Conversation {
       return this.conversationRepository.create(userId, title, messages)
     }

     // 获取用户对话列表
     getUserConversations(userId: number, limit: number = 20): Conversation[] {
       return this.conversationRepository.findByUserId(userId, limit)
     }

     // 获取对话详情
     getConversation(conversationId: number): Conversation | undefined {
       return this.conversationRepository.findById(conversationId)
     }

     // 更新对话
     updateConversation(conversationId: number, title: string, messages: ChatMessage[]): Conversation | undefined {
       return this.conversationRepository.update(conversationId, title, messages)
     }

     // 删除对话
     deleteConversation(conversationId: number): void {
       this.conversationRepository.delete(conversationId)
     }
   }
   ```

3. **修改IPC处理器 (ipcHandlers.ts)**
   添加对话历史相关的IPC处理器：
   ```typescript
   // AI对话历史相关
   ipcMain.handle('ai:saveConversation', async (_, userId, title, messages) => {
     try {
       const conversation = aiService.saveConversation(userId, title, messages)
       return { success: true, data: conversation } as SuccessResponse
     } catch (error) {
       return errorHandler.handle(error)
     }
   })

   ipcMain.handle('ai:getConversations', async (_, userId, limit) => {
     try {
       const conversations = aiService.getUserConversations(userId, limit)
       return { success: true, data: conversations } as SuccessResponse
     } catch (error) {
       return errorHandler.handle(error)
     }
   })

   ipcMain.handle('ai:getConversation', async (_, conversationId) => {
     try {
       const conversation = aiService.getConversation(conversationId)
       return { success: true, data: conversation } as SuccessResponse
     } catch (error) {
       return errorHandler.handle(error)
     }
   })

   ipcMain.handle('ai:updateConversation', async (_, conversationId, title, messages) => {
     try {
       const conversation = aiService.updateConversation(conversationId, title, messages)
       return { success: true, data: conversation } as SuccessResponse
     } catch (error) {
       return errorHandler.handle(error)
     }
   })

   ipcMain.handle('ai:deleteConversation', async (_, conversationId) => {
     try {
       aiService.deleteConversation(conversationId)
       return { success: true } as SuccessResponse
     } catch (error) {
       return errorHandler.handle(error)
     }
   })
   ```

4. **修改preload/index.ts**
   添加对话历史API：
   ```typescript
   ai: {
     // ... 现有方法
     saveConversation: (userId: number, title: string, messages: any[]) => Promise<any>
     getConversations: (userId: number, limit?: number) => Promise<any>
     getConversation: (conversationId: number) => Promise<any>
     updateConversation: (conversationId: number, title: string, messages: any[]) => Promise<any>
     deleteConversation: (conversationId: number) => Promise<any>
   }
   ```

#### 前端修改 (AIAssistant.vue)

1. **修改数据结构**
   ```typescript
   interface Conversation {
     id: number
     title: string
     messages: Message[]
     created_at: string
   }

   const currentConversationId = ref<number | null>(null)
   const chatHistoryList = ref<Conversation[]>([])
   ```

2. **修改startNewChat函数**
   ```typescript
   const startNewChat = async () => {
     // 如果有当前对话且有内容，先保存
     if (currentConversationId.value && chatHistory.value.length > 1) {
       const lastUserMsg = chatHistory.value.findLast(m => m.role === 'user')
       if (lastUserMsg) {
         const title = lastUserMsg.content.substring(0, 50) + (lastUserMsg.content.length > 50 ? '...' : '')
         await window.api.ai.updateConversation(
           currentConversationId.value,
           title,
           chatHistory.value
         )
         await loadConversations()
       }
     }

     // 创建新对话
     chatHistory.value = [
       { role: 'assistant', content: '你好！我是图书馆智能助手。你可以问我关于馆藏图书的问题，或者让我为你推荐书籍。' }
     ]
     currentConversationId.value = null
     recommendedBooks.value = []
   }
   ```

3. **添加loadConversations函数**
   ```typescript
   const loadConversations = async () => {
     if (!userStore.user?.id) return

     try {
       const result = await window.api.ai.getConversations(userStore.user.id, 20)
       if (result.success) {
         chatHistoryList.value = result.data
       }
     } catch (error) {
      console.error('加载对话历史失败:', error)
     }
   }
   ```

4. **修改loadChatHistory函数**
   ```typescript
   const loadChatHistory = async (item: Conversation) => {
     try {
       const result = await window.api.ai.getConversation(item.id)
       if (result.success) {
         chatHistory.value = result.data.messages
         currentConversationId.value = result.data.id
         recommendedBooks.value = []
         scrollToBottom()
       }
     } catch (error) {
      ElMessage.error('加载对话失败')
     }
   }
   ```

5. **修改sendMessage函数**
   ```typescript
   const sendMessage = async () => {
     const text = inputMessage.value.trim()
     if (!text || loading.value) return

     // 添加用户消息
     chatHistory.value.push({ role: 'user', content: text })
     inputMessage.value = ''
     loading.value = true
     scrollToBottom()

     // 如果是新对话，创建对话记录
     if (!currentConversationId.value && userStore.user?.id) {
       const title = text.substring(0, 50) + (text.length > 50 ? '...' : '')
       try {
         const result = await window.api.ai.saveConversation(
           userStore.user.id,
           title,
           chatHistory.value
         )
         if (result.success) {
           currentConversationId.value = result.data.id
           await loadConversations()
         }
       } catch (error) {
        console.error('保存对话失败:', error)
       }
     }

     // ... AI回复逻辑

    // 更新对话
    if (currentConversationId.value) {
      try {
        await window.api.ai.updateConversation(
          currentConversationId.value,
          chatHistoryList.value.find(c => c.id === currentConversationId.value)?.title || '对话',
          chatHistory.value
        )
      } catch (error) {
        console.error('更新对话失败:', error)
      }
    }
   }
   ```

6. **添加删除对话功能**
   ```typescript
   const deleteConversation = async (id: number) => {
     try {
      await ElMessageBox.confirm('确定要删除这条对话吗？', '提示', { type: 'warning' })
      await window.api.ai.deleteConversation(id)
      ElMessage.success('删除成功')
      await loadConversations()

      // 如果删除的是当前对话，创建新对话
      if (currentConversationId.value === id) {
        startNewChat()
      }
     } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error('删除失败')
      }
     }
   }
   ```

7. **在onMounted中加载对话历史**
   ```typescript
   onMounted(() => {
     checkAIStatus()
     loadConversations()
     window.addEventListener('resize', handleResize)
     handleResize()
   })
   ```

### 测试验证
- 验证新对话创建和保存
- 验证对话历史列表显示
- 验证加载历史对话
- 验证删除对话功能
- 验证刷新页面后对话历史仍然存在

---

## 问题4：借阅管理功能问题

### 问题描述
1. 借阅按钮在失败时存在动画bug（状态未正确重置）
2. 借阅失败时错误提示不够友好
3. 借阅功能在失败后无法正常重试

### 解决方案

#### 前端修改 (Borrowing.vue)

1. **修复借阅按钮状态管理**
   ```typescript
   const handleBorrow = async () => {
     if (!selectedReader.value) {
       ElMessage.warning('请先选择读者（输入编号或姓名后点击搜索图标）')
       return
     }

     if (!selectedBook.value) {
       ElMessage.warning('请先选择图书（输入ISBN或书名后点击搜索图标）')
       return
     }

     isBorrowing.value = true

     try {
       console.log('========== [前端] 开始借书流程 ==========')

       // 使用防重复提交和重试机制
       const result = await DebounceSubmitManager.submitWithRetry(
         `borrow_${selectedReader.value.id}_${selectedBook.value.id}`,
         async () => {
           const borrowResult = await window.api.borrowing.borrow(
             selectedReader.value.id,
             selectedBook.value.id
           )
           if (!borrowResult.success) {
             throw new Error(borrowResult.error?.message || '借书失败')
           }
           return borrowResult.data
         },
         3,
         {
           ...DebounceConfigs.BORROW,
           showMessage: true
         }
       )

       if (result.success) {
         ElMessage.success('借阅成功！')
         borrowForm.readerNo = ''
         borrowForm.bookIsbn = ''
         selectedReader.value = null
         selectedBook.value = null
         await searchBorrowedBooks()
       }
     } catch (error) {
       console.error('[前端] 借书操作异常:', error)
       // 错误消息已在DebounceSubmitManager中处理
     } finally {
       // 确保无论成功或失败都重置状态
       isBorrowing.value = false
       console.log('========== [前端] 借书流程结束 ==========\n')
     }
   }
   ```

2. **改进错误提示**
   根据错误类型提供更友好的提示：
   ```typescript
   // 在catch块中根据错误类型显示不同的提示
   if (error.message.includes('暂无可借图书')) {
     ElMessage.error('该图书暂时无可借库存，请稍后再试')
   } else if (error.message.includes('已达到最大借阅数量')) {
     ElMessage.error('该读者已达到最大借阅数量，请先归还部分图书')
   } else if (error.message.includes('逾期未还')) {
     ElMessage.error('该读者有图书逾期未还，请先归还逾期图书')
   } else {
     ElMessage.error('借阅失败：' + error.message)
   }
   ```

3. **添加图书库存检查**
   ```typescript
   // 在选择图书后显示库存信息
   const handleSelectBook = (book: any) => {
     selectedBook.value = book
     bookSelectDialogVisible.value = false

     if (book.available_quantity <= 0) {
       ElMessage.warning('该图书暂时无可借库存')
     } else {
       ElMessage.success(`已选择图书：${book.title}（库存：${book.available_quantity}/${book.total_quantity}）`)
     }
   }
   ```

#### 前端修改 (Books.vue)

1. **修复用户借阅功能的状态管理**
   ```typescript
   const handleUserBorrow = async (book: any) => {
     if (!userStore.user?.id) {
       ElMessage.warning('请先登录')
       return
     }

     if (book.available_quantity <= 0) {
       ElMessage.warning('该图书暂时无可借库存')
       return
     }

     if (!userStore.user.reader_id) {
       ElMessage.info('管理员和图书管理员请使用专门的借阅管理页面进行借阅操作')
       return
     }

     if (borrowing.value.has(book.id)) {
       ElMessage.warning('正在借阅中，请稍候...')
       return
     }

     try {
       console.log('========== [图书页面] 用户借阅开始 ==========')

       // 标记为正在借阅
       borrowing.value.add(book.id)

       const readerResult = await window.api.reader.getById(userStore.user.reader_id)
       if (!readerResult.success) {
         ElMessage.error('无法找到您的读者记录，请联系管理员')
         return
       }

       const reader = readerResult.data
       const result = await window.api.borrowing.borrow(reader.id, book.id)

       if (result.success) {
         ElMessage.success(`借阅成功：《${book.book_title}》`)
         await fetchData()
       } else {
         ElMessage.error(result.error?.message || '借阅失败')
       }
     } catch (error) {
      console.error('[图书页面] 借阅操作异常:', error)
      ElMessage.error('借阅操作失败: ' + (error instanceof Error ? error.message : String(error)))
     } finally {
       // 确保无论成功或失败都移除借阅标记
       borrowing.value.delete(book.id)
       console.log('========== [图书页面] 用户借阅结束 ==========\n')
     }
   }
   ```

### 测试验证
- 验证借阅成功时状态正确重置
- 验证借阅失败时状态正确重置
- 验证错误提示友好准确
- 验证借阅失败后可以正常重试
- 验证库存不足时的提示

---

## 实施顺序

建议按以下顺序实施修复：

1. **问题1** - 高级搜索错误（优先级高，影响核心功能）
2. **问题4** - 借阅管理问题（优先级高，影响核心业务流程）
3. **问题2** - 图书类别功能增强（优先级中，影响用户体验）
4. **问题3** - AI助手对话历史（优先级中，影响用户体验）

## 注意事项

1. 所有修改后都需要进行充分测试
2. 数据库迁移需要考虑向后兼容性
3. 前端修改需要保持UI一致性
4. 错误处理需要统一风格
