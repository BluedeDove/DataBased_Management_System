import { Request, Response } from 'express'
import { ReaderService } from '../domains/reader/reader.service'
import { RegexSearchService } from '../domains/search/regex-search.service'
import { asyncHandler } from '../middleware/error.middleware'

const readerService = new ReaderService()
const regexSearchService = new RegexSearchService()

// 读者种类
export const getAllCategories = asyncHandler(async (req: Request, res: Response) => {
  const categories = readerService.getAllCategories()
  res.json({ success: true, data: categories })
})

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = readerService.createCategory(req.body)
  res.json({ success: true, data: category })
})

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const category = readerService.updateCategory(Number(id), req.body)
  res.json({ success: true, data: category })
})

// 读者
export const getAllReaders = asyncHandler(async (req: Request, res: Response) => {
  const { status, category_id } = req.query
  const readers = readerService.getAllReaders({
    status: status as string,
    category_id: category_id ? Number(category_id) : undefined
  })
  res.json({ success: true, data: readers })
})

export const getReaderById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const reader = readerService.getReaderById(Number(id))
  res.json({ success: true, data: reader })
})

export const getReaderByNo = asyncHandler(async (req: Request, res: Response) => {
  const { readerNo } = req.params
  const reader = readerService.getReaderByNo(readerNo)
  res.json({ success: true, data: reader })
})

export const createReader = asyncHandler(async (req: Request, res: Response) => {
  const reader = readerService.createReader(req.body)
  res.json({ success: true, data: reader })
})

export const updateReader = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const reader = readerService.updateReader(Number(id), req.body)
  res.json({ success: true, data: reader })
})

export const deleteReader = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  readerService.deleteReader(Number(id))
  res.json({ success: true })
})

export const searchReaders = asyncHandler(async (req: Request, res: Response) => {
  const { keyword } = req.query
  const readers = readerService.searchReaders(keyword as string)
  res.json({ success: true, data: readers })
})

export const regexSearchReaders = asyncHandler(async (req: Request, res: Response) => {
  const { pattern, fields, searchMode = 'contains' } = req.body
  const readers = regexSearchService.searchReaders(pattern, fields, searchMode)
  res.json({ success: true, data: readers })
})

export const suspendReader = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const { reason } = req.body
  const reader = readerService.suspendReader(Number(id), reason)
  res.json({ success: true, data: reader })
})

export const activateReader = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const reader = readerService.activateReader(Number(id))
  res.json({ success: true, data: reader })
})

export const renewReader = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const { days } = req.body
  const reader = readerService.renewReader(Number(id), days)
  res.json({ success: true, data: reader })
})

export const canBorrow = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const result = readerService.canBorrow(Number(id))
  res.json({ success: true, data: result })
})

export const getReaderStatistics = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const stats = readerService.getReaderStatistics(Number(id))
  res.json({ success: true, data: stats })
})
