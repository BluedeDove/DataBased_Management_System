import { request, ApiResponse } from './index'

export interface Book {
  id: number
  isbn: string
  title: string
  category_id: number
  category_name: string
  category_code: string
  author: string
  publisher: string
  publish_date?: string
  price?: number
  pages?: number
  keywords?: string
  description?: string
  cover_url?: string
  total_quantity: number
  available_quantity: number
  status: string
  registration_date: string
  notes?: string
}

export interface BookCategory {
  id: number
  code: string
  name: string
  keywords?: string
  parent_id?: number
  notes?: string
}

export const bookApi = {
  // 图书类别
  getCategories: (): Promise<ApiResponse<BookCategory[]>> =>
    request.get('/books/categories'),

  createCategory: (data: Partial<BookCategory>): Promise<ApiResponse<BookCategory>> =>
    request.post('/books/categories', data),

  updateCategory: (id: number, data: Partial<BookCategory>): Promise<ApiResponse<BookCategory>> =>
    request.put(`/books/categories/${id}`, data),

  deleteCategory: (id: number): Promise<ApiResponse<void>> =>
    request.delete(`/books/categories/${id}`),

  // 图书
  getAll: (filters?: { category_id?: number; status?: string; keyword?: string }): Promise<ApiResponse<Book[]>> =>
    request.get('/books', filters),

  getById: (id: number): Promise<ApiResponse<Book>> =>
    request.get(`/books/${id}`),

  getByIsbn: (isbn: string): Promise<ApiResponse<Book>> =>
    request.get(`/books/isbn/${isbn}`),

  create: (data: Partial<Book>): Promise<ApiResponse<Book>> =>
    request.post('/books', data),

  update: (id: number, data: Partial<Book>): Promise<ApiResponse<Book>> =>
    request.put(`/books/${id}`, data),

  delete: (id: number): Promise<ApiResponse<void>> =>
    request.delete(`/books/${id}`),

  addCopies: (id: number, quantity: number): Promise<ApiResponse<Book>> =>
    request.post(`/books/${id}/copies`, { quantity }),

  destroy: (id: number, reason: string): Promise<ApiResponse<Book>> =>
    request.post(`/books/${id}/destroy`, { reason }),

  markAsLost: (id: number): Promise<ApiResponse<Book>> =>
    request.post(`/books/${id}/mark-lost`),

  markAsDamaged: (id: number, notes?: string): Promise<ApiResponse<Book>> =>
    request.post(`/books/${id}/mark-damaged`, { notes }),

  advancedSearch: (criteria: any): Promise<ApiResponse<Book[]>> =>
    request.post('/books/advanced-search', criteria),

  regexSearch: (pattern: string, fields?: string[], categoryId?: number, searchMode?: string): Promise<ApiResponse<Book[]>> =>
    request.post('/books/regex-search', { pattern, fields, categoryId, searchMode }),

  getBorrowingStatus: (id: number): Promise<ApiResponse<any>> =>
    request.get(`/books/${id}/borrowing-status`),

  getPopular: (limit?: number): Promise<ApiResponse<Book[]>> =>
    request.get('/books/popular', { limit }),

  getNew: (limit?: number): Promise<ApiResponse<Book[]>> =>
    request.get('/books/new', { limit }),

  getCategoryStatistics: (): Promise<ApiResponse<any[]>> =>
    request.get('/books/category-statistics')
}

export const bookCategoryApi = {
  getAll: (): Promise<ApiResponse<BookCategory[]>> =>
    request.get('/books/categories'),

  getById: (id: number): Promise<ApiResponse<BookCategory>> =>
    request.get(`/books/categories/${id}`),

  create: (data: Partial<BookCategory>): Promise<ApiResponse<BookCategory>> =>
    request.post('/books/categories', data),

  update: (id: number, data: Partial<BookCategory>): Promise<ApiResponse<BookCategory>> =>
    request.put(`/books/categories/${id}`, data),

  delete: (id: number): Promise<ApiResponse<void>> =>
    request.delete(`/books/categories/${id}`)
}
