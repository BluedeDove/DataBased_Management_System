import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import { logger } from './logger'

export interface BookExportData {
  id: number
  isbn: string
  title: string
  category_name: string
  author: string
  publisher: string
  publish_date?: string | null
  price?: number | null
  total_quantity: number
  available_quantity: number
  status: string
  registration_date: string
  notes?: string | null
}

class ExportService {
  /**
   * 导出图书数据为 CSV 格式
   * @param data 图书数据数组
   * @param filename 文件名（可选）
   * @returns 文件完整路径
   */
  async exportToCSV(data: BookExportData[], filename?: string): Promise<string> {
    logger.info('Exporting books to CSV')

    const downloadPath = app.getPath('downloads')
    const fileName = filename || `books_export_${Date.now()}.csv`
    const filePath = path.join(downloadPath, fileName)

    // CSV 头部（与数据库 books 表字段对应）
    const headers = ['ID', 'ISBN', '书名', '类别', '作者', '出版社', '出版日期', '定价', '总库存', '可借库存', '状态', '登记日期', '备注']

    // 构建 CSV 内容
    const csvRows = [headers.join(',')]

    for (const book of data) {
      const row = [
        book.id,
        book.isbn,
        this.escapeCSV(book.title),
        this.escapeCSV(book.category_name),
        this.escapeCSV(book.author),
        this.escapeCSV(book.publisher),
        book.publish_date || '',
        book.price || '',
        book.total_quantity,
        book.available_quantity,
        book.status,
        book.registration_date,
        this.escapeCSV(book.notes || '')
      ]
      csvRows.push(row.join(','))
    }

    const content = csvRows.join('\n')
    await fs.promises.writeFile(filePath, content, 'utf-8')

    logger.info(`CSV export completed: ${filePath}`)
    return filePath
  }

  /**
   * 导出图书数据为 JSON 格式
   * @param data 图书数据数组
   * @param filename 文件名（可选）
   * @returns 文件完整路径
   */
  async exportToJSON(data: BookExportData[], filename?: string): Promise<string> {
    logger.info('Exporting books to JSON')

    const downloadPath = app.getPath('downloads')
    const fileName = filename || `books_export_${Date.now()}.json`
    const filePath = path.join(downloadPath, fileName)

    const content = JSON.stringify({
      export_time: new Date().toISOString(),
      total_count: data.length,
      books: data
    }, null, 2)

    await fs.promises.writeFile(filePath, content, 'utf-8')

    logger.info(`JSON export completed: ${filePath}`)
    return filePath
  }

  /**
   * CSV 转义处理
   * 如果包含逗号、引号或换行符，需要用引号包裹并转义内部引号
   */
  private escapeCSV(value: string): string {
    if (!value) return ''
    // 如果包含逗号、引号或换行符，需要用引号包裹并转义内部引号
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }

  /**
   * 导出报告（保留原有接口，用于其他模块）
   */
  async exportReport(options: any): Promise<string> {
    logger.info('Exporting report with options:', options)
    const downloadPath = app.getPath('downloads')
    const fileName = `report_${Date.now()}.txt`
    const filePath = path.join(downloadPath, fileName)

    const content = 'Test Report\nGenerated at: ' + new Date().toISOString()
    await fs.promises.writeFile(filePath, content, 'utf-8')

    return filePath
  }
}

export const exportService = new ExportService()
