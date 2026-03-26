import { request, ApiResponse } from './index'

export interface Reader {
  id: number
  reader_no: string
  name: string
  category_id: number
  category_name: string
  max_borrow_count: number
  max_borrow_days: number
  user_id?: number
  gender?: string
  id_card?: string
  organization?: string
  address?: string
  phone?: string
  email?: string
  registration_date: string
  expiry_date?: string
  status: string
  notes?: string
}

export interface ReaderCategory {
  id: number
  code: string
  name: string
  max_borrow_count: number
  max_borrow_days: number
  validity_days: number
  notes?: string
}

export const readerApi = {
  // 读者
  getAll: (filters?: { status?: string; category_id?: number }): Promise<ApiResponse<Reader[]>> =>
    request.get('/readers', filters),

  getById: (id: number): Promise<ApiResponse<Reader>> =>
    request.get(`/readers/${id}`),

  getByNo: (readerNo: string): Promise<ApiResponse<Reader>> =>
    request.get(`/readers/no/${readerNo}`),

  create: (data: Partial<Reader>): Promise<ApiResponse<Reader>> =>
    request.post('/readers', data),

  update: (id: number, data: Partial<Reader>): Promise<ApiResponse<Reader>> =>
    request.put(`/readers/${id}`, data),

  delete: (id: number): Promise<ApiResponse<void>> =>
    request.delete(`/readers/${id}`),

  search: (keyword: string): Promise<ApiResponse<Reader[]>> =>
    request.get('/readers/search', { keyword }),

  regexSearch: (pattern: string, fields?: string[], searchMode?: string): Promise<ApiResponse<Reader[]>> =>
    request.post('/readers/regex-search', { pattern, fields, searchMode }),

  suspend: (id: number, reason?: string): Promise<ApiResponse<Reader>> =>
    request.post(`/readers/${id}/suspend`, { reason }),

  activate: (id: number): Promise<ApiResponse<Reader>> =>
    request.post(`/readers/${id}/activate`),

  renew: (id: number, days: number): Promise<ApiResponse<Reader>> =>
    request.post(`/readers/${id}/renew`, { days }),

  canBorrow: (id: number): Promise<ApiResponse<{ canBorrow: boolean; reason?: string }>> =>
    request.get(`/readers/${id}/can-borrow`),

  getStatistics: (id: number): Promise<ApiResponse<{ totalBorrowed: number; currentBorrowing: number; overdueCount: number }>> =>
    request.get(`/readers/${id}/statistics`)
}

export const readerCategoryApi = {
  getAll: (): Promise<ApiResponse<ReaderCategory[]>> =>
    request.get('/readers/categories'),

  getById: (id: number): Promise<ApiResponse<ReaderCategory>> =>
    request.get(`/readers/categories/${id}`),

  create: (data: Partial<ReaderCategory>): Promise<ApiResponse<ReaderCategory>> =>
    request.post('/readers/categories', data),

  update: (id: number, data: Partial<ReaderCategory>): Promise<ApiResponse<ReaderCategory>> =>
    request.put(`/readers/categories/${id}`, data),

  delete: (id: number): Promise<ApiResponse<void>> =>
    request.delete(`/readers/categories/${id}`)
}
