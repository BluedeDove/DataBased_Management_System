import apiClient, { request, ApiResponse } from './index'

export interface DownloadResponse {
  blob: Blob
  filename: string
}

const extractFilename = (contentDisposition: string | undefined, fallback: string): string => {
  if (!contentDisposition) return fallback

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1])
    } catch {
      return utf8Match[1]
    }
  }

  const plainMatch = contentDisposition.match(/filename="?([^";]+)"?/i)
  return plainMatch?.[1] || fallback
}

const downloadFile = async (url: string, fallbackFilename: string): Promise<DownloadResponse> => {
  const response = await apiClient.get<Blob>(url, { responseType: 'blob' })
  return {
    blob: response.data,
    filename: extractFilename(response.headers['content-disposition'], fallbackFilename)
  }
}

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
  booksToCSV: (): Promise<DownloadResponse> =>
    downloadFile('/export/books/csv', 'books.csv'),

  booksToJSON: (): Promise<DownloadResponse> =>
    downloadFile('/export/books/json', 'books.json'),

  toCSV: (data: any[], filename: string): Promise<ApiResponse<string>> =>
    request.post('/export/csv', { data, filename }),

  toJSON: (data: any[], filename: string): Promise<ApiResponse<string>> =>
    request.post('/export/json', { data, filename }),

  report: (options: any): Promise<ApiResponse<string>> =>
    request.post('/export/report', options)
}
