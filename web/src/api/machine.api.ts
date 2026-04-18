import { request, ApiResponse } from './index'

export interface MachineReaderSummary {
  id: number
  reader_no: string
  name: string
  category_name: string
  current_borrowing_count: number
  max_borrow_count: number
  has_overdue_books: boolean
  status: string
  expiry_date?: string
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
    id: number
    reader_name: string
    reader_no: string
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
  active_reader_name?: string | null
  active_reader_no?: string | null
}

export const machineApi = {
  getReaderSuggestions: (keyword: string): Promise<ApiResponse<MachineReaderSuggestion[]>> =>
    request.get('/machine/readers/suggest', { keyword }),

  getReaderSummary: (readerNo: string): Promise<ApiResponse<MachineReaderSummary>> =>
    request.get(`/machine/reader/${encodeURIComponent(readerNo)}`),

  getCopySuggestions: (keyword: string): Promise<ApiResponse<MachineCopySuggestion[]>> =>
    request.get('/machine/copies/suggest', { keyword }),

  getCopySummary: (barcode: string): Promise<ApiResponse<MachineCopySummary>> =>
    request.get(`/machine/copy/${encodeURIComponent(barcode)}`),

  borrow: (readerNo: string, barcode: string): Promise<ApiResponse<any>> =>
    request.post('/machine/borrow', { readerNo, barcode }),

  returnByBarcode: (barcode: string): Promise<ApiResponse<any>> =>
    request.post('/machine/return', { barcode })
}
