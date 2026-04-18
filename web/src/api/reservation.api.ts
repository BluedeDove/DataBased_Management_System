import { request, ApiResponse } from './index'

export interface ReservationRecord {
  id: number
  reader_id: number
  book_id: number
  status: 'pending' | 'fulfilled' | 'cancelled' | 'expired'
  pickup_code?: string | null
  reserved_at: string
  expires_at?: string | null
  fulfilled_at?: string | null
  cancelled_at?: string | null
  book_title: string
  book_author: string
  book_isbn: string
}

export const reservationApi = {
  create: (bookId: number): Promise<ApiResponse<ReservationRecord>> =>
    request.post('/reservations', { bookId }),

  getMy: (): Promise<ApiResponse<ReservationRecord[]>> =>
    request.get('/reservations/my'),

  cancel: (id: number): Promise<ApiResponse<ReservationRecord>> =>
    request.put(`/reservations/${id}/cancel`)
}

