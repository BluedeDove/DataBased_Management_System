import { Request, Response } from 'express'
import { BorrowingService } from '../domains/borrowing/borrowing.service'
import { MachineAuthService } from '../domains/machine/machine-auth.service'
import { asyncHandler } from '../middleware/error.middleware'

const borrowingService = new BorrowingService()
const machineAuthService = new MachineAuthService()

export const getReaderSummary = asyncHandler(async (req: Request, res: Response) => {
  const { readerNo } = req.params
  const reader = machineAuthService.getReaderSummaryByReaderNo(readerNo)
  res.json({ success: true, data: reader })
})

export const getReaderSuggestions = asyncHandler(async (req: Request, res: Response) => {
  const keyword = String(req.query.keyword || '')
  const readers = borrowingService.getReaderSuggestions(keyword)
  res.json({ success: true, data: readers })
})

export const getCopySummary = asyncHandler(async (req: Request, res: Response) => {
  const { barcode } = req.params
  const result = machineAuthService.getCopySummaryByBarcode(barcode)
  res.json({ success: true, data: result })
})

export const getCopySuggestions = asyncHandler(async (req: Request, res: Response) => {
  const keyword = String(req.query.keyword || '')
  const copies = machineAuthService.getCopySuggestions(keyword)
  res.json({ success: true, data: copies })
})

export const verifyReaderIdentity = asyncHandler(async (req: Request, res: Response) => {
  const { readerNo, borrowPin } = req.body
  const result = await machineAuthService.verifyReaderByBorrowPin(
    String(readerNo || ''),
    String(borrowPin || ''),
    req.user!
  )
  res.json({ success: true, data: result })
})

export const borrowByMachine = asyncHandler(async (req: Request, res: Response) => {
  const { readerNo, barcode, verificationToken } = req.body
  const result = await machineAuthService.borrowByMachine(
    String(readerNo || ''),
    String(barcode || ''),
    String(verificationToken || ''),
    req.user!
  )
  res.json({ success: true, data: result })
})

export const returnByMachine = asyncHandler(async (req: Request, res: Response) => {
  const { barcode } = req.body
  const result = await machineAuthService.returnByMachine(String(barcode || ''), req.user!)
  res.json({ success: true, data: result })
})
