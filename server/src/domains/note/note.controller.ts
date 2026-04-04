import { Request, Response } from 'express'
import { NoteService } from './note.service'
import { asyncHandler } from '../../middleware/error.middleware'

const noteService = new NoteService()

export const createNote = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!
  const { title, content, book_id, visibility } = req.body
  const note = noteService.createNote(
    user.id,
    user.reader_id ?? null,
    user.role,
    { title, content, book_id: book_id ?? null, visibility }
  )
  res.status(201).json({ success: true, data: note })
})

export const getNoteById = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!
  const id = parseInt(req.params.id)
  const note = noteService.getNoteById(id, user.id, user.role, user.reader_id ?? null)
  res.json({ success: true, data: note })
})

export const getUserNotes = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!
  const { visibility, page = '1', pageSize = '20' } = req.query as Record<string, string>
  const result = noteService.getUserNotes(user.id, {
    visibility: visibility || undefined,
    page: parseInt(page),
    pageSize: parseInt(pageSize)
  })
  res.json({ success: true, data: result })
})

export const getPlazaNotes = asyncHandler(async (req: Request, res: Response) => {
  const { keyword, book_id, page = '1', pageSize = '20', orderBy = 'newest' } = req.query as Record<string, string>
  const result = noteService.getPlazaNotes({
    keyword: keyword || undefined,
    bookId: book_id ? parseInt(book_id) : undefined,
    page: parseInt(page),
    pageSize: parseInt(pageSize),
    orderBy: (orderBy as 'newest' | 'hottest') || 'newest'
  })
  res.json({ success: true, data: result })
})

export const getLegacyForMe = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!
  const result = noteService.getLegacyNotesForMe(user.id, user.reader_id ?? null)
  res.json({ success: true, data: result })
})

export const getLegacyNote = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!
  const bookId = parseInt(req.params.bookId)
  const note = noteService.getLegacyNote(bookId, user.id, user.role, user.reader_id ?? null)
  res.json({ success: true, data: note })
})

export const updateNote = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!
  const id = parseInt(req.params.id)
  const { title, content, book_id, visibility } = req.body
  const note = noteService.updateNote(id, user.id, user.role, user.reader_id ?? null, { title, content, book_id, visibility })
  res.json({ success: true, data: note })
})

export const deleteNote = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!
  const id = parseInt(req.params.id)
  noteService.deleteNote(id, user.id, user.role)
  res.json({ success: true, data: null })
})
