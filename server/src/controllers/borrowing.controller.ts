import { Request, Response } from 'express'
import { BorrowingService } from '../domains/borrowing/borrowing.service'
import { asyncHandler } from '../middleware/error.middleware'

const borrowingService = new BorrowingService()

export const borrowBook = asyncHandler(async (req: Request, res: Response) => {
  const { readerId, bookId } = req.body
  const record = await borrowingService.borrowBook(readerId, bookId)
  res.json({ success: true, data: record })
})

export const returnBook = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const record = await borrowingService.returnBook(Number(id))
  res.json({ success: true, data: record })
})

export const renewBook = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const record = await borrowingService.renewBook(Number(id))
  res.json({ success: true, data: record })
})

export const requestRenewal = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const { note } = req.body
  const request = await borrowingService.requestRenewal(Number(id), req.user!, note)
  res.json({ success: true, data: request })
})

export const getPendingRenewalRequests = asyncHandler(async (_req: Request, res: Response) => {
  const requests = borrowingService.getPendingRenewalRequests()
  res.json({ success: true, data: requests })
})

export const reviewRenewalRequest = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const { action, note } = req.body

  if (action !== 'approve' && action !== 'reject') {
    res.status(400).json({
      success: false,
      error: { message: '审批动作必须为 approve 或 reject' }
    })
    return
  }

  const result = await borrowingService.reviewRenewalRequest(Number(id), req.user!, action, note)
  res.json({ success: true, data: result })
})

export const markAsLost = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  await borrowingService.markBookAsLost(Number(id))
  res.json({ success: true, data: null })
})

export const getAllRecords = asyncHandler(async (req: Request, res: Response) => {
  const { reader_id, book_id, status, keyword, borrow_date_from, borrow_date_to } = req.query
  const records = borrowingService.getAllRecords({
    reader_id: reader_id ? Number(reader_id) : undefined,
    book_id: book_id ? Number(book_id) : undefined,
    status: status as string,
    keyword: keyword as string,
    borrow_date_from: borrow_date_from as string,
    borrow_date_to: borrow_date_to as string
  })
  res.json({ success: true, data: records })
})

export const getOverdueRecords = asyncHandler(async (req: Request, res: Response) => {
  const records = borrowingService.getOverdueRecords()
  res.json({ success: true, data: records })
})

export const getStatistics = asyncHandler(async (req: Request, res: Response) => {
  const stats = borrowingService.getBorrowingStatistics()
  res.json({ success: true, data: stats })
})

export const getReaderHistory = asyncHandler(async (req: Request, res: Response) => {
  const { readerId } = req.params
  const history = borrowingService.getReaderBorrowingHistory(Number(readerId))
  res.json({ success: true, data: history })
})

export const getBookHistory = asyncHandler(async (req: Request, res: Response) => {
  const { bookId } = req.params
  const history = borrowingService.getBookBorrowingHistory(Number(bookId))
  res.json({ success: true, data: history })
})

export const getPopularBorrowings = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 10 } = req.query
  const popular = borrowingService.getPopularBorrowings(Number(limit))
  res.json({ success: true, data: popular })
})

export const getActiveReaders = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 10 } = req.query
  const readers = borrowingService.getActiveReaders(Number(limit))
  res.json({ success: true, data: readers })
})

export const deleteRecord = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  borrowingService.deleteRecord(Number(id))
  res.json({ success: true })
})

export const getTrend = asyncHandler(async (req: Request, res: Response) => {
  const { days = 30 } = req.query
  const trend = borrowingService.getBorrowingTrend(Number(days))
  res.json({ success: true, data: trend })
})

export const getBookCount = asyncHandler(async (req: Request, res: Response) => {
  const count = borrowingService.getBookCount()
  res.json({ success: true, data: count })
})

export const getMyBorrowings = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!
  const readerId = user.reader_id
  if (!readerId) {
    res.json({ success: true, data: { items: [], total: 0 } })
    return
  }
  const { status, keyword, borrow_date_from, borrow_date_to } = req.query
  const records = borrowingService.getAllRecords({
    reader_id: readerId,
    status: status as string | undefined,
    keyword: keyword as string | undefined,
    borrow_date_from: borrow_date_from as string | undefined,
    borrow_date_to: borrow_date_to as string | undefined
  })
  res.json({ success: true, data: { items: records, total: records.length } })
})
