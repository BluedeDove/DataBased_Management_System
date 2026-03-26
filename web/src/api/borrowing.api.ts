import { request, ApiResponse } from './index'

export interface BorrowingRecord {
  id: number
  reader_id: number
  reader_name: string
  reader_no: string
  book_id: number
  book_title: string
  book_author: string
  book_isbn: string
  borrow_date: string
  due_date: string
  return_date?: string
  renewal_count: number
  status: string
  fine_amount: number
  notes?: string
}

export const borrowingApi = {
  borrow: (readerId: number, bookId: number): Promise<ApiResponse<BorrowingRecord>> =>
    request.post('/borrowings', { readerId, bookId }),

  return: (id: number): Promise<ApiResponse<BorrowingRecord>> =>
    request.put(`/borrowings/${id}/return`),

  renew: (id: number): Promise<ApiResponse<BorrowingRecord>> =>
    request.put(`/borrowings/${id}/renew`),

  markAsLost: (id: number): Promise<ApiResponse<void>> =>
    request.put(`/borrowings/${id}/mark-lost`),

  getAll: (filters?: { reader_id?: number; book_id?: number; status?: string; keyword?: string }): Promise<ApiResponse<BorrowingRecord[]>> =>
    request.get('/borrowings', filters),

  getOverdue: (): Promise<ApiResponse<BorrowingRecord[]>> =>
    request.get('/borrowings/overdue'),

  getStatistics: (): Promise<ApiResponse<any>> =>
    request.get('/borrowings/statistics'),

  getReaderHistory: (readerId: number): Promise<ApiResponse<BorrowingRecord[]>> =>
    request.get(`/borrowings/reader/${readerId}`),

  getBookHistory: (bookId: number): Promise<ApiResponse<BorrowingRecord[]>> =>
    request.get(`/borrowings/book/${bookId}`),

  getPopular: (limit?: number): Promise<ApiResponse<any[]>> =>
    request.get('/borrowings/popular', { limit }),

  getActiveReaders: (limit?: number): Promise<ApiResponse<any[]>> =>
    request.get('/borrowings/active-readers', { limit }),

  delete: (id: number): Promise<ApiResponse<void>> =>
    request.delete(`/borrowings/${id}`),

  getTrend: (days?: number): Promise<ApiResponse<any[]>> =>
    request.get('/borrowings/trend', { days }),

  getBookCount: (): Promise<ApiResponse<number>> =>
    request.get('/borrowings/book-count')
}
