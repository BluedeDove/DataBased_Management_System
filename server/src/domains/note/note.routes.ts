import { Router } from 'express'
import { authMiddleware } from '../../middleware/auth.middleware'
import { apiLimiter } from '../../middleware/rateLimit.middleware'
import {
  createNote, getNoteById, getUserNotes,
  getPlazaNotes, getLegacyNote, getLegacyForMe, updateNote, deleteNote
} from './note.controller'

const router = Router()

router.use(authMiddleware, apiLimiter)

router.get('/plaza', getPlazaNotes)                // GET /notes/plaza       — 公开广场
router.get('/my', getUserNotes)                    // GET /notes/my          — 我的笔记
router.get('/legacy-for-me', getLegacyForMe)       // GET /notes/legacy-for-me — 传承给我的笔记
router.get('/legacy/:bookId', getLegacyNote)       // GET /notes/legacy/:bookId
router.get('/:id', getNoteById)                    // GET /notes/:id
router.post('/', createNote)                       // POST /notes
router.put('/:id', updateNote)                     // PUT /notes/:id
router.delete('/:id', deleteNote)                  // DELETE /notes/:id

export { router as noteRoutes }
