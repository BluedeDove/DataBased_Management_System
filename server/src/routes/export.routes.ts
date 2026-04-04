import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import { requirePermission } from '../middleware/permission.middleware'
import { asyncHandler } from '../middleware/error.middleware'
import { BookService } from '../domains/book/book.service'

const router = Router()
const bookService = new BookService()

const buildAttachmentHeader = (filename: string) =>
  `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`

const escapeCsvCell = (cell: unknown) => `"${String(cell ?? '').replace(/"/g, '""')}"`

router.get('/books/csv', authMiddleware, requirePermission('books:read'), asyncHandler(async (_req: Request, res: Response) => {
  const books = bookService.getAllBooksForExport()
  const headers = ['ISBN', '书名', '作者', '出版社', '分类', '总量', '可借数量', '状态']
  const rows = books.map(book => [
    book.isbn,
    book.title,
    book.author,
    book.publisher,
    book.category_name,
    book.total_quantity,
    book.available_quantity,
    book.status
  ])

  let csv = headers.map(escapeCsvCell).join(',') + '\n'
  rows.forEach(row => { csv += row.map(escapeCsvCell).join(',') + '\n' })

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', buildAttachmentHeader('books.csv'))
  res.send('\ufeff' + csv)
}))

router.get('/books/json', authMiddleware, requirePermission('books:read'), asyncHandler(async (_req: Request, res: Response) => {
  const books = bookService.getAllBooksForExport()
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Content-Disposition', buildAttachmentHeader('books.json'))
  res.send(JSON.stringify(books, null, 2))
}))

router.post('/csv', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { data, filename = 'export.csv' } = req.body
  if (!Array.isArray(data) || data.length === 0) {
    res.json({ success: false, error: { message: '无数据可导出' } })
    return
  }

  const headers = Object.keys(data[0])
  let csv = headers.map(escapeCsvCell).join(',') + '\n'
  data.forEach((row: any) => { csv += headers.map(header => escapeCsvCell(row[header])).join(',') + '\n' })

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', buildAttachmentHeader(filename))
  res.send('\ufeff' + csv)
}))

router.post('/json', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { data, filename = 'export.json' } = req.body
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Content-Disposition', buildAttachmentHeader(filename))
  res.send(JSON.stringify(data, null, 2))
}))

router.post('/report', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { type, data } = req.body
  const filename = `${type}-report.json`
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Content-Disposition', buildAttachmentHeader(filename))
  res.send(JSON.stringify({ type, data, generatedAt: new Date().toISOString() }, null, 2))
}))

export { router as exportRoutes }
