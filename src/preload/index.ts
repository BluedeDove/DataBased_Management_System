import { contextBridge, ipcRenderer } from 'electron'

// 定义 API 接口类型
export interface ElectronAPI {
  // 认证相关
  auth: {
    login: (credentials: { username: string; password: string }) => Promise<any>
    logout: (token: string) => Promise<any>
    validate: (token: string) => Promise<any>
    changePassword: (userId: number, oldPassword: string, newPassword: string) => Promise<any>
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
    suspend: (id: number, reason?: string) => Promise<any>
    activate: (id: number) => Promise<any>
    renew: (id: number, days: number) => Promise<any>
    canBorrow: (id: number) => Promise<any>
    getStatistics: (id: number) => Promise<any>
  }

  // 图书类别
  bookCategory: {
    getAll: () => Promise<any>
    create: (data: any) => Promise<any>
    update: (id: number, updates: any) => Promise<any>
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
    getBorrowingStatus: (id: number) => Promise<any>
    getPopular: (limit?: number) => Promise<any>
    getNew: (limit?: number) => Promise<any>
    getCategoryStatistics: () => Promise<any>
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
  }

  // AI功能
  ai: {
    isAvailable: () => Promise<any>
    createBookEmbedding: (bookId: number) => Promise<any>
    batchCreateEmbeddings: (bookIds: number[]) => Promise<any>
    semanticSearch: (query: string, topK?: number) => Promise<any>
    chat: (message: string, history?: any[], context?: string) => Promise<any>
    recommendBooks: (query: string, limit?: number) => Promise<any>
    getStatistics: () => Promise<any>
  }
}

// 将 API 暴露给渲染进程
const api: ElectronAPI = {
  auth: {
    login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
    logout: (token) => ipcRenderer.invoke('auth:logout', token),
    validate: (token) => ipcRenderer.invoke('auth:validate', token),
    changePassword: (userId, oldPassword, newPassword) =>
      ipcRenderer.invoke('auth:changePassword', userId, oldPassword, newPassword)
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
    suspend: (id, reason) => ipcRenderer.invoke('reader:suspend', id, reason),
    activate: (id) => ipcRenderer.invoke('reader:activate', id),
    renew: (id, days) => ipcRenderer.invoke('reader:renew', id, days),
    canBorrow: (id) => ipcRenderer.invoke('reader:canBorrow', id),
    getStatistics: (id) => ipcRenderer.invoke('reader:getStatistics', id)
  },

  bookCategory: {
    getAll: () => ipcRenderer.invoke('book:getAllCategories'),
    create: (data) => ipcRenderer.invoke('book:createCategory', data),
    update: (id, updates) => ipcRenderer.invoke('book:updateCategory', id, updates)
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
    getBorrowingStatus: (id) => ipcRenderer.invoke('book:getBorrowingStatus', id),
    getPopular: (limit) => ipcRenderer.invoke('book:getPopular', limit),
    getNew: (limit) => ipcRenderer.invoke('book:getNew', limit),
    getCategoryStatistics: () => ipcRenderer.invoke('book:getCategoryStatistics')
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
    getActiveReaders: (limit) => ipcRenderer.invoke('borrowing:getActiveReaders', limit)
  },

  ai: {
    isAvailable: () => ipcRenderer.invoke('ai:isAvailable'),
    createBookEmbedding: (bookId) => ipcRenderer.invoke('ai:createBookEmbedding', bookId),
    batchCreateEmbeddings: (bookIds) => ipcRenderer.invoke('ai:batchCreateEmbeddings', bookIds),
    semanticSearch: (query, topK) => ipcRenderer.invoke('ai:semanticSearch', query, topK),
    chat: (message, history, context) => ipcRenderer.invoke('ai:chat', message, history, context),
    recommendBooks: (query, limit) => ipcRenderer.invoke('ai:recommendBooks', query, limit),
    getStatistics: () => ipcRenderer.invoke('ai:getStatistics')
  }
}

contextBridge.exposeInMainWorld('api', api)

// 类型声明，供 TypeScript 使用
declare global {
  interface Window {
    api: ElectronAPI
  }
}
