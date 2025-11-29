import { contextBridge, ipcRenderer } from 'electron'

// 定义 API 接口类型
export interface ElectronAPI {
  // 认证相关
  auth: {
    login: (credentials: { username: string; password: string }) => Promise<any>
    logout: (token: string) => Promise<any>
    validate: (token: string) => Promise<any>
    changePassword: (userId: number, oldPassword: string, newPassword: string) => Promise<any>
    getUserPermissions: (userId: number) => Promise<any>
    checkPermission: (userId: number, permission: string) => Promise<any>
    register: (data: {
      username: string
      password: string
      name: string
      identity: 'teacher' | 'student'
      id_card: string
      phone: string
      email?: string
    }) => Promise<any>
  }

  // 读者种类
  readerCategory: {
    getAll: () => Promise<any>
    create: (data: any) => Promise<any>
    update: (id: number, updates: any) => Promise<any>
  }

  // 读者
  reader: {
    getAll: (filters?: any) => Promise<any>
    getById: (id: number) => Promise<any>
    getByNo: (readerNo: string) => Promise<any>
    create: (data: any) => Promise<any>
    update: (id: number, updates: any) => Promise<any>
    search: (keyword: string) => Promise<any>
    regexSearch: (pattern: string, fields?: string[]) => Promise<any>
    suspend: (id: number, reason?: string) => Promise<any>
    activate: (id: number) => Promise<any>
    renew: (id: number, days: number) => Promise<any>
    canBorrow: (id: number) => Promise<any>
    getStatistics: (id: number) => Promise<any>
    delete: (id: number) => Promise<any>
  }

  // 图书类别
  bookCategory: {
    getAll: () => Promise<any>
    create: (data: any) => Promise<any>
    update: (id: number, updates: any) => Promise<any>
    delete: (id: number) => Promise<any>
  }

  // 图书
  book: {
    getAll: (filters?: any) => Promise<any>
    getById: (id: number) => Promise<any>
    create: (data: any) => Promise<any>
    update: (id: number, updates: any) => Promise<any>
    addCopies: (id: number, quantity: number) => Promise<any>
    destroy: (id: number, reason: string) => Promise<any>
    markAsLost: (id: number) => Promise<any>
    markAsDamaged: (id: number, notes?: string) => Promise<any>
    advancedSearch: (criteria: any) => Promise<any>
    regexSearch: (pattern: string, fields?: string[]) => Promise<any>
    getBorrowingStatus: (id: number) => Promise<any>
    getPopular: (limit?: number) => Promise<any>
    getNew: (limit?: number) => Promise<any>
    getCategoryStatistics: () => Promise<any>
    delete: (id: number) => Promise<any>
  }

  // 借阅
  borrowing: {
    borrow: (readerId: number, bookId: number) => Promise<any>
    return: (recordId: number) => Promise<any>
    renew: (recordId: number) => Promise<any>
    markAsLost: (recordId: number) => Promise<any>
    getAll: (filters?: any) => Promise<any>
    getOverdue: () => Promise<any>
    getStatistics: () => Promise<any>
    getReaderHistory: (readerId: number) => Promise<any>
    getBookHistory: (bookId: number) => Promise<any>
    getPopular: (limit?: number) => Promise<any>
    getActiveReaders: (limit?: number) => Promise<any>
    delete: (id: number) => Promise<any>
    getTrend: (days?: number) => Promise<any>
  }

  // AI功能
  ai: {
    isAvailable: () => Promise<any>
    createBookEmbedding: (bookId: number) => Promise<any>
    batchCreateEmbeddings: (bookIds: number[]) => Promise<any>
    semanticSearch: (query: string, topK?: number) => Promise<any>
    chat: (message: string, history?: any[], context?: string) => Promise<any>
    chatStream: (
      message: string,
      history: any[],
      context: string | undefined,
      onChunk: (chunk: string) => void,
      onError: (error: string) => void,
      onComplete: () => void
    ) => () => void
    recommendBooks: (query: string, limit?: number) => Promise<any>
    recommendBooksStream: (
      query: string,
      limit: number,
      onChunk: (chunk: string) => void,
      onError: (error: string) => void,
      onComplete: () => void
    ) => () => void
    getStatistics: () => Promise<any>
  }

  // 数据导出
  export: {
    toCSV: (options: { filename: string; data: any[]; headers?: string[] }) => Promise<any>
    toJSON: (options: { filename: string; data: any[] }) => Promise<any>
    report: (options: any) => Promise<any>
  }

  // 配置
  config: {
    getAISettings: () => Promise<any>
    updateAISettings: (settings: any) => Promise<any>
    testAIConnection: () => Promise<any>
  }

  // SQL搜索
  search: {
    executeSql: (query: string) => Promise<any>
    getAllTables: () => Promise<any>
    getTableSchema: (tableName: string) => Promise<any>
  }
}

// 将 API 暴露给渲染进程
const api: ElectronAPI = {
  auth: {
    login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
    logout: (token) => ipcRenderer.invoke('auth:logout', token),
    validate: (token) => ipcRenderer.invoke('auth:validate', token),
    changePassword: (userId, oldPassword, newPassword) =>
      ipcRenderer.invoke('auth:changePassword', userId, oldPassword, newPassword),
    getUserPermissions: (userId) => ipcRenderer.invoke('auth:getUserPermissions', userId),
    checkPermission: (userId, permission) =>
      ipcRenderer.invoke('auth:checkPermission', userId, permission),
    register: (data) => ipcRenderer.invoke('auth:register', data)
  },

  readerCategory: {
    getAll: () => ipcRenderer.invoke('reader:getAllCategories'),
    create: (data) => ipcRenderer.invoke('reader:createCategory', data),
    update: (id, updates) => ipcRenderer.invoke('reader:updateCategory', id, updates)
  },

  reader: {
    getAll: (filters) => ipcRenderer.invoke('reader:getAll', filters),
    getById: (id) => ipcRenderer.invoke('reader:getById', id),
    getByNo: (readerNo) => ipcRenderer.invoke('reader:getByNo', readerNo),
    create: (data) => ipcRenderer.invoke('reader:create', data),
    update: (id, updates) => ipcRenderer.invoke('reader:update', id, updates),
    search: (keyword) => ipcRenderer.invoke('reader:search', keyword),
    regexSearch: (pattern, fields) => ipcRenderer.invoke('reader:regexSearch', pattern, fields),
    suspend: (id, reason) => ipcRenderer.invoke('reader:suspend', id, reason),
    activate: (id) => ipcRenderer.invoke('reader:activate', id),
    renew: (id, days) => ipcRenderer.invoke('reader:renew', id, days),
    canBorrow: (id) => ipcRenderer.invoke('reader:canBorrow', id),
    getStatistics: (id) => ipcRenderer.invoke('reader:getStatistics', id),
    delete: (id) => ipcRenderer.invoke('reader:delete', id)
  },

  bookCategory: {
    getAll: () => ipcRenderer.invoke('book:getAllCategories'),
    create: (data) => ipcRenderer.invoke('book:createCategory', data),
    update: (id, updates) => ipcRenderer.invoke('book:updateCategory', id, updates),
    delete: (id) => ipcRenderer.invoke('book:deleteCategory', id)
  },

  book: {
    getAll: (filters) => ipcRenderer.invoke('book:getAll', filters),
    getById: (id) => ipcRenderer.invoke('book:getById', id),
    create: (data) => ipcRenderer.invoke('book:create', data),
    update: (id, updates) => ipcRenderer.invoke('book:update', id, updates),
    addCopies: (id, quantity) => ipcRenderer.invoke('book:addCopies', id, quantity),
    destroy: (id, reason) => ipcRenderer.invoke('book:destroy', id, reason),
    markAsLost: (id) => ipcRenderer.invoke('book:markAsLost', id),
    markAsDamaged: (id, notes) => ipcRenderer.invoke('book:markAsDamaged', id, notes),
    advancedSearch: (criteria) => ipcRenderer.invoke('book:advancedSearch', criteria),
    regexSearch: (pattern, fields) => ipcRenderer.invoke('book:regexSearch', pattern, fields),
    getBorrowingStatus: (id) => ipcRenderer.invoke('book:getBorrowingStatus', id),
    getPopular: (limit) => ipcRenderer.invoke('book:getPopular', limit),
    getNew: (limit) => ipcRenderer.invoke('book:getNew', limit),
    getCategoryStatistics: () => ipcRenderer.invoke('book:getCategoryStatistics'),
    delete: (id) => ipcRenderer.invoke('book:delete', id)
  },

  borrowing: {
    borrow: (readerId, bookId) => ipcRenderer.invoke('borrowing:borrow', readerId, bookId),
    return: (recordId) => ipcRenderer.invoke('borrowing:return', recordId),
    renew: (recordId) => ipcRenderer.invoke('borrowing:renew', recordId),
    markAsLost: (recordId) => ipcRenderer.invoke('borrowing:markAsLost', recordId),
    getAll: (filters) => ipcRenderer.invoke('borrowing:getAll', filters),
    getOverdue: () => ipcRenderer.invoke('borrowing:getOverdue'),
    getStatistics: () => ipcRenderer.invoke('borrowing:getStatistics'),
    getReaderHistory: (readerId) => ipcRenderer.invoke('borrowing:getReaderHistory', readerId),
    getBookHistory: (bookId) => ipcRenderer.invoke('borrowing:getBookHistory', bookId),
    getPopular: (limit) => ipcRenderer.invoke('borrowing:getPopular', limit),
    getActiveReaders: (limit) => ipcRenderer.invoke('borrowing:getActiveReaders', limit),
    delete: (id) => ipcRenderer.invoke('borrowing:delete', id),
    getTrend: (days) => ipcRenderer.invoke('borrowing:getTrend', days)
  },

  ai: {
    isAvailable: () => ipcRenderer.invoke('ai:isAvailable'),
    createBookEmbedding: (bookId) => ipcRenderer.invoke('ai:createBookEmbedding', bookId),
    batchCreateEmbeddings: (bookIds) => ipcRenderer.invoke('ai:batchCreateEmbeddings', bookIds),
    semanticSearch: (query, topK) => ipcRenderer.invoke('ai:semanticSearch', query, topK),
    chat: (message, history, context) => ipcRenderer.invoke('ai:chat', message, history, context),
    chatStream: (message, history, context, onChunk, onError, onComplete) => {
      // 生成唯一的请求ID
      const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      console.log('[Preload] 创建流式聊天请求，ID:', requestId)

      // 注册监听器
      const chunkListener = (_event: any, chunk: string) => {
        console.log('[Preload] 收到chunk，长度:', chunk.length)
        onChunk(chunk)
      }
      const errorListener = (_event: any, error: string) => {
        console.error('[Preload] 收到错误:', error)
        onError(error)
      }
      const completeListener = () => {
        console.log('[Preload] 流式传输完成')
        onComplete()
        // 自动清理监听器
        cleanup()
      }

      ipcRenderer.on(`ai:chatStream:chunk:${requestId}`, chunkListener)
      ipcRenderer.on(`ai:chatStream:error:${requestId}`, errorListener)
      ipcRenderer.on(`ai:chatStream:complete:${requestId}`, completeListener)

      // 发送请求
      console.log('[Preload] 发送流式聊天请求到主进程')
      ipcRenderer.send('ai:chatStream', { requestId, message, history, context })

      // 返回清理函数
      const cleanup = () => {
        console.log('[Preload] 清理流式聊天监听器')
        ipcRenderer.removeListener(`ai:chatStream:chunk:${requestId}`, chunkListener)
        ipcRenderer.removeListener(`ai:chatStream:error:${requestId}`, errorListener)
        ipcRenderer.removeListener(`ai:chatStream:complete:${requestId}`, completeListener)
      }

      return cleanup
    },
    recommendBooks: (query, limit) => ipcRenderer.invoke('ai:recommendBooks', query, limit),
    recommendBooksStream: (query, limit, onChunk, onError, onComplete) => {
      // 生成唯一的请求ID
      const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      console.log('[Preload] 创建流式推荐请求，ID:', requestId)

      // 注册监听器
      const chunkListener = (_event: any, chunk: string) => {
        console.log('[Preload] 收到推荐chunk，长度:', chunk.length)
        onChunk(chunk)
      }
      const errorListener = (_event: any, error: string) => {
        console.error('[Preload] 收到推荐错误:', error)
        onError(error)
      }
      const completeListener = () => {
        console.log('[Preload] 流式推荐完成')
        onComplete()
        // 自动清理监听器
        cleanup()
      }

      ipcRenderer.on(`ai:recommendBooksStream:chunk:${requestId}`, chunkListener)
      ipcRenderer.on(`ai:recommendBooksStream:error:${requestId}`, errorListener)
      ipcRenderer.on(`ai:recommendBooksStream:complete:${requestId}`, completeListener)

      // 发送请求
      console.log('[Preload] 发送流式推荐请求到主进程')
      ipcRenderer.send('ai:recommendBooksStream', { requestId, query, limit })

      // 返回清理函数
      const cleanup = () => {
        console.log('[Preload] 清理流式推荐监听器')
        ipcRenderer.removeListener(`ai:recommendBooksStream:chunk:${requestId}`, chunkListener)
        ipcRenderer.removeListener(`ai:recommendBooksStream:error:${requestId}`, errorListener)
        ipcRenderer.removeListener(`ai:recommendBooksStream:complete:${requestId}`, completeListener)
      }

      return cleanup
    },
    getStatistics: () => ipcRenderer.invoke('ai:getStatistics')
  },

  export: {
    toCSV: (options) => ipcRenderer.invoke('export:csv', options),
    toJSON: (options) => ipcRenderer.invoke('export:json', options),
    report: (options) => ipcRenderer.invoke('export:report', options)
  },

  config: {
    getAISettings: () => ipcRenderer.invoke('config:getAISettings'),
    updateAISettings: (settings) => ipcRenderer.invoke('config:updateAISettings', settings),
    testAIConnection: () => ipcRenderer.invoke('config:testAIConnection')
  },

  search: {
    executeSql: (query) => ipcRenderer.invoke('search:executeSql', query),
    getAllTables: () => ipcRenderer.invoke('search:getAllTables'),
    getTableSchema: (tableName) => ipcRenderer.invoke('search:getTableSchema', tableName)
  }
}

contextBridge.exposeInMainWorld('api', api)

// 类型声明，供 TypeScript 使用
declare global {
  interface Window {
    api: ElectronAPI
  }
}
