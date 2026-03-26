import { Response } from 'express'
import { db } from '../database'
import { logger } from '../lib/logger'
import fs from 'fs'
import path from 'path'

class ExportService {
  async exportToCSV(data: any[], filename?: string): Promise<string> {
    if (!data || data.length === 0) throw new Error('无数据可导出')

    const headers = Object.keys(data[0])
    let csv = headers.join(',') + '\n'

    data.forEach((row: any) => {
      csv += headers.map(h => {
        const value = row[h]
        if (value === null || value === undefined) return '""'
        const str = String(value).replace(/"/g, '""')
        return `"${str}"`
      }).join(',') + '\n'
    })

    const exportDir = path.join(process.cwd(), 'exports')
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true })

    const filePath = path.join(exportDir, filename || `export-${Date.now()}.csv`)
    fs.writeFileSync(filePath, '\ufeff' + csv, 'utf-8')

    logger.info('CSV导出成功', { filePath, rowCount: data.length })
    return filePath
  }

  async exportToJSON(data: any[], filename?: string): Promise<string> {
    if (!data || data.length === 0) throw new Error('无数据可导出')

    const json = JSON.stringify(data, null, 2)

    const exportDir = path.join(process.cwd(), 'exports')
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true })

    const filePath = path.join(exportDir, filename || `export-${Date.now()}.json`)
    fs.writeFileSync(filePath, json, 'utf-8')

    logger.info('JSON导出成功', { filePath, rowCount: data.length })
    return filePath
  }

  async exportReport(options: { type: string; data: any; format: string }): Promise<string> {
    const { type, data, format } = options
    const filename = `${type}-report-${Date.now()}.${format}`

    if (format === 'csv') return this.exportToCSV(data, filename)
    if (format === 'json') return this.exportToJSON(data, filename)

    throw new Error(`不支持的导出格式: ${format}`)
  }

  sendCSVResponse(res: Response, data: any[], filename: string): void {
    if (!data || data.length === 0) {
      res.status(400).json({ success: false, error: { message: '无数据可导出' } })
      return
    }

    const headers = Object.keys(data[0])
    let csv = headers.join(',') + '\n'

    data.forEach((row: any) => {
      csv += headers.map(h => {
        const value = row[h]
        if (value === null || value === undefined) return '""'
        const str = String(value).replace(/"/g, '""')
        return `"${str}"`
      }).join(',') + '\n'
    })

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send('\ufeff' + csv)
  }

  sendJSONResponse(res: Response, data: any[], filename: string): void {
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.json({ success: true, data })
  }
}

export const exportService = new ExportService()
