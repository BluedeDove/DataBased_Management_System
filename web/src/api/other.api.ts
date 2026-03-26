import { request, ApiResponse } from './index'

export const configApi = {
  getAISettings: (): Promise<ApiResponse<any>> =>
    request.get('/config/ai'),

  updateAISettings: (settings: any): Promise<ApiResponse<void>> =>
    request.put('/config/ai', settings),

  testAIConnection: (): Promise<ApiResponse<{ success: boolean; message: string }>> =>
    request.post('/config/ai/test')
}

export const searchApi = {
  executeSql: (query: string): Promise<ApiResponse<any[]>> =>
    request.post('/search/sql', { query }),

  getAllTables: (): Promise<ApiResponse<any[]>> =>
    request.get('/search/tables'),

  getTableSchema: (tableName: string): Promise<ApiResponse<any>> =>
    request.get(`/search/tables/${tableName}/schema`)
}

export const exportApi = {
  booksToCSV: (): Promise<Blob> =>
    fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1'}/export/books/csv`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(res => res.blob()),

  booksToJSON: (): Promise<Blob> =>
    fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1'}/export/books/json`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(res => res.blob()),

  toCSV: (data: any[], filename: string): Promise<ApiResponse<string>> =>
    request.post('/export/csv', { data, filename }),

  toJSON: (data: any[], filename: string): Promise<ApiResponse<string>> =>
    request.post('/export/json', { data, filename }),

  report: (options: any): Promise<ApiResponse<string>> =>
    request.post('/export/report', options)
}
