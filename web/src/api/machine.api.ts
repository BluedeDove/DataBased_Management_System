import { request, ApiResponse } from './index'

export interface MachineReaderSummary {
  id: number
  reader_no: string
  display_name: string
  category_name: string
  current_borrowing_count: number
  max_borrow_count: number
  has_overdue_books: boolean
  status: string
  expiry_date?: string
  is_verified: boolean
  borrow_pin_configured: boolean
  verification_expires_at?: string
}

export interface MachineReaderVerificationResult {
  verification_token: string
  expires_at: string
  reader: MachineReaderSummary
}

export interface MachineCopySummary {
  copy: {
    id: number
    book_id: number
    barcode: string
    status: string
    title: string
    author: string
    isbn: string
    category_name: string
    book_status: string
  }
  active_borrowing?: {
    due_date: string
  } | null
  suggested_action: 'borrow' | 'return' | 'unavailable'
  action_hint: string
}

export interface MachineReaderSuggestion extends MachineReaderSummary {
  value: string
}

export interface MachineCopySuggestion {
  id: number
  value: string
  barcode: string
  title: string
  author: string
  isbn: string
  status: string
  book_status: string
  suggested_action: 'borrow' | 'return' | 'unavailable'
  action_hint: string
}

export const machineApi = {
  getReaderSuggestions: (keyword: string): Promise<ApiResponse<MachineReaderSuggestion[]>> =>
    request.get('/machine/readers/suggest', { keyword }),

  getReaderSummary: (readerNo: string): Promise<ApiResponse<MachineReaderSummary>> =>
    request.get(`/machine/reader/${encodeURIComponent(readerNo)}`),

  verifyReader: (readerNo: string, borrowPin: string): Promise<ApiResponse<MachineReaderVerificationResult>> =>
    request.post('/machine/reader/verify', { readerNo, borrowPin }),

  getCopySuggestions: (keyword: string): Promise<ApiResponse<MachineCopySuggestion[]>> =>
    request.get('/machine/copies/suggest', { keyword }),

  getCopySummary: (barcode: string): Promise<ApiResponse<MachineCopySummary>> =>
    request.get(`/machine/copy/${encodeURIComponent(barcode)}`),

  borrow: (readerNo: string, barcode: string, verificationToken: string): Promise<ApiResponse<any>> =>
    request.post('/machine/borrow', { readerNo, barcode, verificationToken }),

  returnByBarcode: (barcode: string): Promise<ApiResponse<any>> =>
    request.post('/machine/return', { barcode })
}
