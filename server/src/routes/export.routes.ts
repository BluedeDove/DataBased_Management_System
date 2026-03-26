import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import { requirePermission } from '../middleware/permission.middleware'
import { asyncHandler } from '../middleware/error.middleware'
import { BookService } from '../domains/book/book.service'

const router = Router()
const bookService = new BookService()

// 导出图书CSV
router.get('/books/csv', authMiddleware, requirePermission('books:read'), asyncHandler(async (req: Request, res: Response) => {
  const books = bookService.getAllBooksForExport()
  const headers = ['ISBN', '书名', '作者', '出版社', '分类', '数量', '可借数量', '状态']
  const rows = books.map(b => [b.isbn, b.title, b.author, b.publisher, b.category_name, b.total_quantity, b.available_quantity, b.status])

  let csv = headers.join(',') + '\n'
  rows.forEach(row => { csv += row.map(cell => `"${cell}"`).join(',') + '\n' })

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename=books.csv')
  res.send('\ufeff' + csv) // BOM for UTF-8
}))

// 导出图书JSON
router.get('/books/json', authMiddleware, requirePermission('books:read'), asyncHandler(async (req: Request, res: Response) => {
  const books = bookService.getAllBooksForExport()
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Content-Disposition', 'attachment; filename=books.json')
  res.json({ success: true, data: books })
}))

// 通用CSV导出
router.post('/csv', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { data, filename = 'export.csv' } = req.body
  if (!Array.isArray(data) || data.length === 0) {
    res.json({ success: false, error: { message: '无数据可导出' } })
    return
  }
  const headers = Object.keys(data[0])
  let csv = headers.join(',') + '\n'
  data.forEach((row: any) => { csv += headers.map(h => `"${row[h] ?? ''}"`).join(',') + '\n' })

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`)
  res.send('\ufeff' + csv)
}))

// 通用JSON导出
router.post('/json', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { data, filename = 'export.json' } = req.body
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`)
  res.json({ success: true, data })
}))

// 报告导出
router.post('/report', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { type, data } = req.body
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Content-Disposition', `attachment; filename=${type}-report.json`)
  res.json({ success: true, data: { type, data, generatedAt: new Date().toISOString() } })
}))

export { router as exportRoutes }
