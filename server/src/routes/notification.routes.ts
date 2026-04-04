import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import { asyncHandler } from '../middleware/error.middleware'
import { librarianOrAbove } from '../middleware/permission.middleware'
import { notificationService } from '../domains/notification/notification.service'

const router = Router()

router.use(authMiddleware)

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const limit = Number(req.query.limit || 20)
  const data = notificationService.getUserNotifications(req.user!, limit)
  res.json({ success: true, data })
}))

router.put('/read-all', asyncHandler(async (req: Request, res: Response) => {
  notificationService.markAllRead(req.user!.id)
  res.json({ success: true, data: null })
}))

router.put('/:id/read', asyncHandler(async (req: Request, res: Response) => {
  notificationService.markRead(req.user!.id, Number(req.params.id))
  res.json({ success: true, data: null })
}))

router.post('/broadcast', librarianOrAbove, asyncHandler(async (req: Request, res: Response) => {
  const { title, content } = req.body
  if (!title || !content) {
    res.status(400).json({
      success: false,
      error: { message: '通知标题和内容不能为空' }
    })
    return
  }

  notificationService.sendBroadcast(req.user!.id, String(title).trim(), String(content).trim())
  res.json({ success: true, data: null })
}))

export { router as notificationRoutes }
