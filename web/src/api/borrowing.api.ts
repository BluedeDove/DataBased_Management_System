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
  renewal_request_id?: number | null
  renewal_request_status?: 'pending' | 'approved' | 'rejected' | 'cancelled' | null
}

export interface RenewalRequest {
  id: number
  borrowing_record_id: number
  request_user_id: number
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  request_note?: string | null
  review_note?: string | null
  reviewed_by?: number | null
  requested_at: string
  reviewed_at?: string | null
  reader_id: number
  reader_name: string
  reader_no: string
  book_id: number
  book_title: string
  book_isbn: string
  due_date: string
  request_user_name: string
  reviewed_by_name?: string | null
}

export const borrowingApi = {
  borrow: (readerId: number, bookId: number): Promise<ApiResponse<BorrowingRecord>> =>
    request.post('/borrowings', { readerId, bookId }),

  return: (id: number): Promise<ApiResponse<BorrowingRecord>> =>
    request.put(`/borrowings/${id}/return`),

  renew: (id: number): Promise<ApiResponse<BorrowingRecord>> =>
    request.put(`/borrowings/${id}/renew`),

  requestRenewal: (id: number, note?: string): Promise<ApiResponse<RenewalRequest>> =>
    request.post(`/borrowings/${id}/renew-request`, { note }),

  getPendingRenewalRequests: (): Promise<ApiResponse<RenewalRequest[]>> =>
    request.get('/borrowings/renewal-requests/pending'),

  reviewRenewalRequest: (
    id: number,
    action: 'approve' | 'reject',
    note?: string
  ): Promise<ApiResponse<{ request: RenewalRequest; record: BorrowingRecord | null }>> =>
    request.post(`/borrowings/renewal-requests/${id}/review`, { action, note }),

  markAsLost: (id: number): Promise<ApiResponse<void>> =>
    request.put(`/borrowings/${id}/mark-lost`),

  getAll: (
    filters?: {
      reader_id?: number
      book_id?: number
      status?: string
      keyword?: string
      borrow_date_from?: string
      borrow_date_to?: string
    }
  ): Promise<ApiResponse<BorrowingRecord[]>> =>
    request.get('/borrowings', filters),

  getMy: (
    filters?: { status?: string; keyword?: string; borrow_date_from?: string; borrow_date_to?: string }
  ): Promise<ApiResponse<{ items: BorrowingRecord[]; total: number }>> =>
    request.get('/borrowings/my', filters),

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
