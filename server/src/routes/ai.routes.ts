import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import { requirePermission } from '../middleware/permission.middleware'
import { asyncHandler } from '../middleware/error.middleware'
import { db } from '../database'
import { config } from '../config'
import { logger } from '../lib/logger'

const router = Router()

// AI服务状态检查
router.get('/available', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: config.ai.enabled })
}))

// 创建图书向量嵌入
router.post('/embeddings/:bookId', authMiddleware, requirePermission('books:write'), asyncHandler(async (req: Request, res: Response) => {
  const { bookId } = req.params
  // 简化实现：标记为已创建
  db.prepare(`INSERT OR REPLACE INTO book_vectors (book_id, vector, text) VALUES (?, '[]', '')`).run(bookId)
  res.json({ success: true, data: null })
}))

// 批量创建向量嵌入
router.post('/embeddings/batch', authMiddleware, requirePermission('books:write'), asyncHandler(async (req: Request, res: Response) => {
  const { bookIds } = req.body
  for (const bookId of bookIds) {
    db.prepare(`INSERT OR REPLACE INTO book_vectors (book_id, vector, text) VALUES (?, '[]', '')`).run(bookId)
  }
  res.json({ success: true, data: null })
}))

// 语义搜索
router.post('/semantic-search', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { query, topK = 10 } = req.body
  // 简化实现：使用普通文本搜索
  const books = db.prepare(`
    SELECT b.*, bc.name as category_name FROM books b
    JOIN book_categories bc ON b.category_id = bc.id
    WHERE b.is_deleted = 0 AND (b.title LIKE ? OR b.description LIKE ? OR b.keywords LIKE ?)
    LIMIT ?
  `).all(`%${query}%`, `%${query}%`, `%${query}%`, topK)
  res.json({ success: true, data: books })
}))

// AI对话（非流式）
router.post('/chat', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { message } = req.body
  if (!config.ai.enabled) {
    res.json({ success: true, data: 'AI服务未配置' })
    return
  }
  // 简化实现
  res.json({ success: true, data: `收到消息: ${message}` })
}))

// AI对话（流式SSE）
router.post('/chat/stream', authMiddleware, (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const { message } = req.body
  res.write(`data: ${JSON.stringify({ chunk: `回复: ${message}` })}\n\n`)
  res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
  res.end()
})

// 取消流式对话
router.post('/chat/cancel', authMiddleware, (req: Request, res: Response) => {
  res.json({ success: true })
})

// 图书推荐
router.post('/recommend', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { query, limit = 5 } = req.body
  const books = db.prepare(`SELECT b.*, bc.name as category_name FROM books b JOIN book_categories bc ON b.category_id = bc.id WHERE b.is_deleted = 0 AND (b.title LIKE ? OR b.description LIKE ?) LIMIT ?`).all(`%${query}%`, `%${query}%`, limit)
  res.json({ success: true, data: books })
}))

// 流式推荐
router.post('/recommend/stream', authMiddleware, (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
  res.end()
})

// 取消推荐
router.post('/recommend/cancel', authMiddleware, (req: Request, res: Response) => {
  res.json({ success: true })
})

// 获取向量统计
router.get('/statistics', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const count = db.prepare('SELECT COUNT(*) as count FROM book_vectors').get() as { count: number }
  res.json({ success: true, data: { vectorCount: count.count } })
}))

// 保存对话
router.post('/conversations', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { title, messages } = req.body
  const userId = req.user!.id
  const result = db.prepare(`INSERT INTO ai_conversations (user_id, title, messages) VALUES (?, ?, ?)`).run(userId, title, JSON.stringify(messages))
  res.json({ success: true, data: { id: result.lastInsertRowid, title, messages } })
}))

// 获取对话列表
router.get('/conversations', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id
  const { limit = 20 } = req.query
  const conversations = db.prepare(`SELECT id, title, created_at, updated_at FROM ai_conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?`).all(userId, limit)
  res.json({ success: true, data: conversations })
}))

// 获取单个对话
router.get('/conversations/:id', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const conversation = db.prepare(`SELECT * FROM ai_conversations WHERE id = ?`).get(id)
  res.json({ success: true, data: conversation })
}))

// 更新对话
router.put('/conversations/:id', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const { title, messages } = req.body
  db.prepare(`UPDATE ai_conversations SET title = ?, messages = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(title, JSON.stringify(messages), id)
  res.json({ success: true, data: { id, title, messages } })
}))

// 删除对话
router.delete('/conversations/:id', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  db.prepare(`DELETE FROM ai_conversations WHERE id = ?`).run(id)
  res.json({ success: true })
}))

export { router as aiRoutes }
