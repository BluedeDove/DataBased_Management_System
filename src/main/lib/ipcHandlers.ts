import { ipcMain } from 'electron'
import { AuthService } from '../domains/auth/auth.service'
import { ReaderService } from '../domains/reader/reader.service'
import { BookService } from '../domains/book/book.service'
import { BorrowingService } from '../domains/borrowing/borrowing.service'
import { AIService } from '../domains/ai/ai.service'
import { ConfigService } from '../domains/config/config.service'
import { RegexSearchService } from '../domains/search/regex-search.service'
import { SqlSearchService } from '../domains/search/sql-search.service'
import { exportService } from './exportService'
import { errorHandler, SuccessResponse } from './errorHandler'
import { logger } from './logger'

// 初始化服务
const authService = new AuthService()
const readerService = new ReaderService()
const bookService = new BookService()
const borrowingService = new BorrowingService()
const aiService = new AIService()
const configService = new ConfigService()
const regexSearchService = new RegexSearchService()
const sqlSearchService = new SqlSearchService()

export function registerIpcHandlers() {
  // ============ 认证相关 ============
  ipcMain.handle('auth:login', async (_, credentials) => {
    try {
      const result = await authService.login(credentials)
      return { success: true, data: result } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('auth:logout', async (_, token) => {
    try {
      authService.logout(token)
      return { success: true, data: null } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('auth:validate', async (_, token) => {
    try {
      const user = authService.validateToken(token)
      return { success: true, data: user } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('auth:changePassword', async (_, userId, oldPassword, newPassword) => {
    try {
      await authService.changePassword(userId, oldPassword, newPassword)
      return { success: true, data: null } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('auth:register', async (_, data) => {
    try {
      logger.info('用户注册IPC处理', data.username)
      const user = await authService.register(data)
      return { success: true, data: user } as SuccessResponse
    } catch (error) {
      logger.error('注册失败', error)
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('auth:getUserPermissions', async (_, userId) => {
    try {
      const permissions = authService.getUserPermissions(userId)
      return { success: true, data: permissions } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('auth:checkPermission', async (_, userId, permission) => {
    try {
      const user = authService.validateToken(userId)
      if (!user) {
        return { success: false, error: { message: '未登录' } }
      }
      const hasPermission = authService.hasPermission(user, permission)
      return { success: true, data: hasPermission } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  // ============ 读者种类相关 ============
  ipcMain.handle('reader:getAllCategories', async () => {
    try {
      const categories = readerService.getAllCategories()
      return { success: true, data: categories } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('reader:createCategory', async (_, data) => {
    try {
      const category = readerService.createCategory(data)
      return { success: true, data: category } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('reader:updateCategory', async (_, id, updates) => {
    try {
      const category = readerService.updateCategory(id, updates)
      return { success: true, data: category } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  // ============ 读者相关 ============
  ipcMain.handle('reader:getAll', async (_, filters) => {
    try {
      const readers = readerService.getAllReaders(filters)
      return { success: true, data: readers } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('reader:getById', async (_, id) => {
    try {
      const reader = readerService.getReaderById(id)
      return { success: true, data: reader } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('reader:getByNo', async (_, readerNo) => {
    try {
      const reader = readerService.getReaderByNo(readerNo)
      return { success: true, data: reader } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('reader:create', async (_, data) => {
    console.log('========== [IPC] reader:create 被调用 ==========')
    console.log('[IPC] 接收到的data:', JSON.stringify(data, null, 2))
    try {
      console.log('[IPC] 准备调用 readerService.createReader...')
      const reader = readerService.createReader(data)
      console.log('[IPC] readerService.createReader 返回成功:', reader.id)
      return { success: true, data: reader } as SuccessResponse
    } catch (error) {
      console.error('[IPC] reader:create 捕获错误:', error)
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('reader:update', async (_, id, updates) => {
    try {
      const reader = readerService.updateReader(id, updates)
      return { success: true, data: reader } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('reader:search', async (_, keyword) => {
    try {
      const readers = readerService.searchReaders(keyword)
      return { success: true, data: readers } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('reader:regexSearch', async (_, pattern, fields) => {
    try {
      const readers = regexSearchService.searchReaders(pattern, fields)
      return { success: true, data: readers } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('reader:suspend', async (_, id, reason) => {
    try {
      const reader = readerService.suspendReader(id, reason)
      return { success: true, data: reader } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('reader:activate', async (_, id) => {
    try {
      const reader = readerService.activateReader(id)
      return { success: true, data: reader } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('reader:renew', async (_, id, days) => {
    try {
      const reader = readerService.renewReader(id, days)
      return { success: true, data: reader } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('reader:delete', async (_, id: number) => {
    console.log('========== [IPC] reader:delete 被调用 ==========')
    console.log('[IPC] Reader ID:', id)
    try {
      console.log('[IPC] 调用 readerService.deleteReader...')
      readerService.deleteReader(id)
      console.log('[IPC] 删除成功')
      return { success: true } as SuccessResponse
    } catch (error) {
      console.error('[IPC] 删除失败:', error)
      return errorHandler.handle(error)
    } finally {
      console.log('========== [IPC] reader:delete 结束 ==========\n')
    }
  })

  ipcMain.handle('reader:canBorrow', async (_, id) => {
    try {
      const result = readerService.canBorrow(id)
      return { success: true, data: result } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('reader:getStatistics', async (_, id) => {
    try {
      const stats = readerService.getReaderStatistics(id)
      return { success: true, data: stats } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  // ============ 图书类别相关 ============
  ipcMain.handle('book:getAllCategories', async () => {
    try {
      const categories = bookService.getAllCategories()
      return { success: true, data: categories } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('book:createCategory', async (_, data) => {
    try {
      const category = bookService.createCategory(data)
      return { success: true, data: category } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('book:updateCategory', async (_, id, updates) => {
    try {
      const category = bookService.updateCategory(id, updates)
      return { success: true, data: category } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('book:deleteCategory', async (_, id) => {
    try {
      bookService.deleteCategory(id)
      return { success: true, data: null } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  // ============ 图书相关 ============
  ipcMain.handle('book:getAll', async (_, filters) => {
    try {
      const books = bookService.getAllBooks(filters)
      return { success: true, data: books } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('book:getById', async (_, id) => {
    try {
      const book = bookService.getBookById(id)
      return { success: true, data: book } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('book:create', async (_, data) => {
    console.log('========== [IPC] book:create 被调用 ==========')
    console.log('[IPC] 接收到的data:', JSON.stringify(data, null, 2))
    try {
      console.log('[IPC] 准备调用 bookService.createBook...')
      const book = bookService.createBook(data)
      console.log('[IPC] bookService.createBook 返回成功:', book.id)
      return { success: true, data: book } as SuccessResponse
    } catch (error) {
      console.error('[IPC] book:create 捕获错误:', error)
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('book:update', async (_, id, updates) => {
    console.log('========== [IPC] book:update 被调用 ==========')
    console.log('[IPC] 接收到的id:', id)
    console.log('[IPC] 接收到的updates:', JSON.stringify(updates, null, 2))
    try {
      console.log('[IPC] 准备调用 bookService.updateBook...')
      const book = bookService.updateBook(id, updates)
      console.log('[IPC] bookService.updateBook 返回成功')
      console.log('[IPC] 更新后的图书数据:', JSON.stringify(book, null, 2))
      return { success: true, data: book } as SuccessResponse
    } catch (error) {
      console.error('[IPC] book:update 捕获错误:', error)
      if (error instanceof Error) {
        console.error('[IPC] 错误堆栈:', error.stack)
      }
      return errorHandler.handle(error)
    } finally {
      console.log('========== [IPC] book:update 结束 ==========\n')
    }
  })

  ipcMain.handle('book:addCopies', async (_, id, quantity) => {
    try {
      const book = bookService.addCopies(id, quantity)
      return { success: true, data: book } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('book:delete', async (_, id: number) => {
    console.log('========== [IPC] book:delete 被调用 ==========')
    console.log('[IPC] Book ID:', id)
    try {
      console.log('[IPC] 调用 bookService.deleteBook...')
      bookService.deleteBook(id)
      console.log('[IPC] 删除成功')
      return { success: true } as SuccessResponse
    } catch (error) {
      console.error('[IPC] 删除失败:', error)
      return errorHandler.handle(error)
    } finally {
      console.log('========== [IPC] book:delete 结束 ==========\n')
    }
  })

  ipcMain.handle('book:destroy', async (_, id, reason) => {
    try {
      const book = bookService.destroyBook(id, reason)
      return { success: true, data: book } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('book:markAsLost', async (_, id) => {
    try {
      const book = bookService.markAsLost(id)
      return { success: true, data: book } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('book:markAsDamaged', async (_, id, notes) => {
    try {
      const book = bookService.markAsDamaged(id, notes)
      return { success: true, data: book } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('book:advancedSearch', async (_, criteria) => {
    try {
      const books = bookService.advancedSearch(criteria)
      return { success: true, data: books } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('book:regexSearch', async (_, pattern, fields) => {
    try {
      const books = regexSearchService.searchBooks(pattern, fields)
      return { success: true, data: books } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('book:getBorrowingStatus', async (_, id) => {
    try {
      const status = bookService.getBorrowingStatus(id)
      return { success: true, data: status } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('book:getPopular', async (_, limit) => {
    try {
      const books = bookService.getPopularBooks(limit)
      return { success: true, data: books } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('book:getNew', async (_, limit) => {
    try {
      const books = bookService.getNewBooks(limit)
      return { success: true, data: books } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('book:getCategoryStatistics', async () => {
    try {
      const stats = bookService.getCategoryStatistics()
      return { success: true, data: stats } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  // ============ 借阅相关 ============
  ipcMain.handle('borrowing:borrow', async (_, readerId, bookId) => {
    try {
      const record = await borrowingService.borrowBook(readerId, bookId)
      return { success: true, data: record } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('borrowing:return', async (_, recordId) => {
    try {
      const record = await borrowingService.returnBook(recordId)
      return { success: true, data: record } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('borrowing:renew', async (_, recordId) => {
    try {
      const record = await borrowingService.renewBook(recordId)
      return { success: true, data: record } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('borrowing:markAsLost', async (_, recordId) => {
    try {
      await borrowingService.markBookAsLost(recordId)
      return { success: true, data: null } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('borrowing:getAll', async (_, filters) => {
    try {
      const records = borrowingService.getAllRecords(filters)
      return { success: true, data: records } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('borrowing:getOverdue', async () => {
    try {
      const records = borrowingService.getOverdueRecords()
      return { success: true, data: records } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('borrowing:getStatistics', async () => {
    try {
      const stats = borrowingService.getBorrowingStatistics()
      return { success: true, data: stats } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('borrowing:getReaderHistory', async (_, readerId) => {
    try {
      const history = borrowingService.getReaderBorrowingHistory(readerId)
      return { success: true, data: history } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('borrowing:getBookHistory', async (_, bookId) => {
    try {
      const history = borrowingService.getBookBorrowingHistory(bookId)
      return { success: true, data: history } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('borrowing:getPopular', async (_, limit) => {
    try {
      const popular = borrowingService.getPopularBorrowings(limit)
      return { success: true, data: popular } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('borrowing:getActiveReaders', async (_, limit) => {
    try {
      const readers = borrowingService.getActiveReaders(limit)
      return { success: true, data: readers } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('borrowing:delete', async (_, id: number) => {
    console.log('========== [IPC] borrowing:delete 被调用 ==========')
    console.log('[IPC] Record ID:', id)
    try {
      console.log('[IPC] 调用 borrowingService.deleteRecord...')
      borrowingService.deleteRecord(id)
      console.log('[IPC] 删除成功')
      return { success: true } as SuccessResponse
    } catch (error) {
      console.error('[IPC] 删除失败:', error)
      return errorHandler.handle(error)
    } finally {
      console.log('========== [IPC] borrowing:delete 结束 ==========\n')
    }
  })

  ipcMain.handle('borrowing:getTrend', async (_, days) => {
    try {
      const trend = borrowingService.getBorrowingTrend(days || 30)
      return { success: true, data: trend } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  // ============ AI功能相关 ============
  ipcMain.handle('ai:isAvailable', async () => {
    try {
      const available = aiService.isAvailable()
      return { success: true, data: available } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('ai:createBookEmbedding', async (_, bookId) => {
    try {
      await aiService.createBookEmbedding(bookId)
      return { success: true, data: null } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('ai:batchCreateEmbeddings', async (_, bookIds) => {
    try {
      await aiService.batchCreateBookEmbeddings(bookIds)
      return { success: true, data: null } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('ai:semanticSearch', async (_, query, topK) => {
    try {
      const results = await aiService.semanticSearchBooks(query, topK)
      return { success: true, data: results } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('ai:chat', async (_, message, history, context) => {
    try {
      const reply = await aiService.chat(message, history, context)
      return { success: true, data: reply } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  // AI流式对话
  ipcMain.on('ai:chatStream', async (event, { requestId, message, history, context }) => {
    console.log('========== [IPC] ai:chatStream 被调用 ==========')
    console.log('[IPC] Request ID:', requestId)
    console.log('[IPC] Message:', message)
    console.log('[IPC] History length:', history?.length || 0)

    try {
      console.log('[IPC] 准备调用 aiService.chatStream...')

      await aiService.chatStream(
        message,
        history || [],
        context,
        // onChunk - 发送每个chunk到渲染进程
        (chunk: string) => {
          console.log(`[IPC] 转发chunk到渲染进程，长度: ${chunk.length}`)
          event.sender.send(`ai:chatStream:chunk:${requestId}`, chunk)
        },
        // onError - 发送错误到渲染进程
        (error: Error) => {
          console.error('[IPC] 流式传输错误:', error.message)
          event.sender.send(`ai:chatStream:error:${requestId}`, error.message)
        },
        // onComplete - 发送完成信号到渲染进程
        () => {
          console.log('[IPC] 流式传输完成，发送完成信号')
          event.sender.send(`ai:chatStream:complete:${requestId}`)
        }
      )
    } catch (error: any) {
      console.error('[IPC] ai:chatStream 捕获错误:', error)
      event.sender.send(`ai:chatStream:error:${requestId}`, error.message || '流式对话失败')
    } finally {
      console.log('========== [IPC] ai:chatStream 结束 ==========\n')
    }
  })

  ipcMain.handle('ai:recommendBooks', async (_, query, limit) => {
    try {
      const recommendation = await aiService.recommendBooks(query, limit)
      return { success: true, data: recommendation } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  // AI流式推荐
  ipcMain.on('ai:recommendBooksStream', async (event, { requestId, query, limit }) => {
    console.log('========== [IPC] ai:recommendBooksStream 被调用 ==========')
    console.log('[IPC] Request ID:', requestId)
    console.log('[IPC] Query:', query)
    console.log('[IPC] Limit:', limit)

    try {
      console.log('[IPC] 准备调用 aiService.recommendBooksStream...')

      await aiService.recommendBooksStream(
        query,
        limit || 5,
        // onChunk - 发送每个chunk到渲染进程
        (chunk: string) => {
          console.log(`[IPC] 转发推荐chunk到渲染进程，长度: ${chunk.length}`)
          event.sender.send(`ai:recommendBooksStream:chunk:${requestId}`, chunk)
        },
        // onError - 发送错误到渲染进程
        (error: Error) => {
          console.error('[IPC] 推荐流式传输错误:', error.message)
          event.sender.send(`ai:recommendBooksStream:error:${requestId}`, error.message)
        },
        // onComplete - 发送完成信号到渲染进程
        () => {
          console.log('[IPC] 推荐流式传输完成，发送完成信号')
          event.sender.send(`ai:recommendBooksStream:complete:${requestId}`)
        }
      )
    } catch (error: any) {
      console.error('[IPC] ai:recommendBooksStream 捕获错误:', error)
      event.sender.send(`ai:recommendBooksStream:error:${requestId}`, error.message || '流式推荐失败')
    } finally {
      console.log('========== [IPC] ai:recommendBooksStream 结束 ==========\n')
    }
  })

  ipcMain.handle('ai:getStatistics', async () => {
    try {
      const stats = aiService.getVectorStatistics()
      return { success: true, data: stats } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  // ============ 数据导出相关 ============
  ipcMain.handle('export:csv', async (_, options) => {
    try {
      const filePath = await exportService.exportToCSV(options)
      return { success: true, data: filePath } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('export:json', async (_, options) => {
    try {
      const filePath = await exportService.exportToJSON(options)
      return { success: true, data: filePath } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('export:report', async (_, options) => {
    try {
      const filePath = await exportService.exportReport(options)
      return { success: true, data: filePath } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  // ============ 配置相关 ============
  ipcMain.handle('config:getAISettings', async () => {
    try {
      const settings = configService.getAISettings()
      return { success: true, data: settings } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('config:updateAISettings', async (_, settings) => {
    try {
      configService.updateAISettings(settings)
      return { success: true, data: null } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('config:testAIConnection', async () => {
    try {
      const result = await configService.testAIConnection()
      return { success: result.success, data: result } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  // ============ SQL搜索相关 (仅管理员) ============
  ipcMain.handle('search:executeSql', async (_, query) => {
    try {
      const result = sqlSearchService.executeQuery(query)
      return { success: true, data: result } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('search:getAllTables', async () => {
    try {
      const tables = sqlSearchService.getAllTables()
      return { success: true, data: tables } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('search:getTableSchema', async (_, tableName) => {
    try {
      const schema = sqlSearchService.getTableSchema(tableName)
      return { success: true, data: schema } as SuccessResponse
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  logger.info('IPC handlers registered successfully')
}
