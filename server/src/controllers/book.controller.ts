import { Request, Response } from 'express'
import { BookService } from '../domains/book/book.service'
import { RegexSearchService } from '../domains/search/regex-search.service'
import { asyncHandler } from '../middleware/error.middleware'

const bookService = new BookService()
const regexSearchService = new RegexSearchService()

// 图书类别
export const getAllCategories = asyncHandler(async (req: Request, res: Response) => {
  const categories = bookService.getAllCategories()
  res.json({ success: true, data: categories })
})

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = bookService.createCategory(req.body)
  res.json({ success: true, data: category })
})

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const category = bookService.updateCategory(Number(id), req.body)
  res.json({ success: true, data: category })
})

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  bookService.deleteCategory(Number(id))
  res.json({ success: true })
})

// 图书
export const getAllBooks = asyncHandler(async (req: Request, res: Response) => {
  const { category_id, status, keyword } = req.query
  const books = bookService.getAllBooks({
    category_id: category_id ? Number(category_id) : undefined,
    status: status as string,
    keyword: keyword as string
  })
  res.json({ success: true, data: books })
})

export const getBookById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const book = bookService.getBookById(Number(id))
  res.json({ success: true, data: book })
})

export const getBookByIsbn = asyncHandler(async (req: Request, res: Response) => {
  const { isbn } = req.params
  const book = bookService.getBookByIsbn(isbn)
  res.json({ success: true, data: book })
})

export const createBook = asyncHandler(async (req: Request, res: Response) => {
  const book = bookService.createBook(req.body)
  res.json({ success: true, data: book })
})

export const updateBook = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const book = bookService.updateBook(Number(id), req.body)
  res.json({ success: true, data: book })
})

export const deleteBook = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  bookService.deleteBook(Number(id))
  res.json({ success: true })
})

export const addCopies = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const { quantity } = req.body
  const book = bookService.addCopies(Number(id), quantity)
  res.json({ success: true, data: book })
})

export const destroyBook = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const { reason } = req.body
  const book = bookService.destroyBook(Number(id), reason)
  res.json({ success: true, data: book })
})

export const markAsLost = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const book = bookService.markAsLost(Number(id))
  res.json({ success: true, data: book })
})

export const markAsDamaged = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const { notes } = req.body
  const book = bookService.markAsDamaged(Number(id), notes)
  res.json({ success: true, data: book })
})

export const advancedSearch = asyncHandler(async (req: Request, res: Response) => {
  const books = bookService.advancedSearch(req.body)
  res.json({ success: true, data: books })
})

export const regexSearchBooks = asyncHandler(async (req: Request, res: Response) => {
  const { pattern, fields, categoryId, searchMode = 'contains' } = req.body
  const books = regexSearchService.searchBooks(pattern, fields, categoryId, searchMode)
  res.json({ success: true, data: books })
})

export const getBorrowingStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const status = bookService.getBorrowingStatus(Number(id))
  res.json({ success: true, data: status })
})

export const getPopularBooks = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 10 } = req.query
  const books = bookService.getPopularBooks(Number(limit))
  res.json({ success: true, data: books })
})

export const getNewBooks = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 10 } = req.query
  const books = bookService.getNewBooks(Number(limit))
  res.json({ success: true, data: books })
})

export const getCategoryStatistics = asyncHandler(async (req: Request, res: Response) => {
  const stats = bookService.getCategoryStatistics()
  res.json({ success: true, data: stats })
})
