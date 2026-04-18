import { Request, Response } from 'express'
import { BorrowingService } from '../domains/borrowing/borrowing.service'
import { asyncHandler } from '../middleware/error.middleware'

const borrowingService = new BorrowingService()

export const getReaderSummary = asyncHandler(async (req: Request, res: Response) => {
  const { readerNo } = req.params
  const reader = borrowingService.getReaderSummaryByReaderNo(readerNo)
  res.json({ success: true, data: reader })
})

export const getReaderSuggestions = asyncHandler(async (req: Request, res: Response) => {
  const keyword = String(req.query.keyword || '')
  const readers = borrowingService.getReaderSuggestions(keyword)
  res.json({ success: true, data: readers })
})

export const getCopySummary = asyncHandler(async (req: Request, res: Response) => {
  const { barcode } = req.params
  const result = borrowingService.getCopySummaryByBarcode(barcode)
  res.json({ success: true, data: result })
})

export const getCopySuggestions = asyncHandler(async (req: Request, res: Response) => {
  const keyword = String(req.query.keyword || '')
  const copies = borrowingService.getCopySuggestions(keyword)
  res.json({ success: true, data: copies })
})

export const borrowByMachine = asyncHandler(async (req: Request, res: Response) => {
  const { readerNo, barcode } = req.body
  const result = await borrowingService.borrowCopyByBarcode(String(readerNo || ''), String(barcode || ''))
  res.json({ success: true, data: result })
})

export const returnByMachine = asyncHandler(async (req: Request, res: Response) => {
  const { barcode } = req.body
  const result = await borrowingService.returnCopyByBarcode(String(barcode || ''))
  res.json({ success: true, data: result })
})
