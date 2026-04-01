import { Router, Request, Response } from 'express'
import OpenAI from 'openai'
import { authMiddleware } from '../middleware/auth.middleware'
import { requirePermission } from '../middleware/permission.middleware'
import { asyncHandler } from '../middleware/error.middleware'
import { db } from '../database'
import { logger } from '../lib/logger'

function getAIConfig() {
  const rows = db.prepare(`SELECT setting_key, setting_value FROM system_settings WHERE category = 'ai'`).all() as { setting_key: string; setting_value: string }[]
  const map: Record<string, string> = {}
  rows.forEach(r => { map[r.setting_key] = r.setting_value })
  return {
    apiKey: map['ai.openai.apiKey'] || '',
    baseURL: map['ai.openai.baseURL'] || 'https://api.openai.com/v1',
    chatModel: map['ai.openai.chatModel'] || 'gpt-4-turbo-preview',
    embeddingModel: map['ai.openai.embeddingModel'] || 'text-embedding-3-small',
  }
}

const router = Router()

// AI服务状态检查
router.get('/available', authMiddleware, asyncHandler(async (_req: Request, res: Response) => {
  const { apiKey } = getAIConfig()
  res.json({ success: true, data: !!apiKey })
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
  const q = (query || '').trim().toLowerCase()
  const books = db.prepare(`
    SELECT b.*, bc.name as category_name FROM books b
    JOIN book_categories bc ON b.category_id = bc.id
    WHERE b.is_deleted = 0 AND (b.title LIKE ? OR b.description LIKE ? OR b.keywords LIKE ? OR b.author LIKE ?)
    LIMIT ?
  `).all(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, topK) as any[]

  // 计算相关性分数（0-1），分数越高代表越相关
  const scored = books.map((b, idx) => {
    const title  = (b.title       || '').toLowerCase()
    const desc   = (b.description || '').toLowerCase()
    const kw     = (b.keywords    || '').toLowerCase()
    const author = (b.author      || '').toLowerCase()
    let score = 0.40
    if (title === q)               score = 0.98
    else if (title.startsWith(q))  score = 0.90
    else if (title.includes(q))    score = 0.78
    else if (author.includes(q))   score = 0.65
    else if (kw.includes(q))       score = 0.55
    else if (desc.includes(q))     score = 0.45
    // slight decay by rank
    score = Math.max(0.10, score - idx * 0.01)
    return { ...b, similarity: parseFloat(score.toFixed(2)) }
  })
  // sort highest similarity first
  scored.sort((a, b) => b.similarity - a.similarity)
  res.json({ success: true, data: scored })
}))

// AI对话（非流式）
router.post('/chat', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { apiKey, baseURL, chatModel } = getAIConfig()
  if (!apiKey) { res.json({ success: true, data: 'AI服务未配置，请先在系统设置中填写 API Key' }); return }
  const { message, history = [] } = req.body
  const client = new OpenAI({ apiKey, baseURL })
  const completion = await client.chat.completions.create({
    model: chatModel,
    messages: [
      { role: 'system', content: '你是一个图书馆智能助手，帮助用户查询图书信息、推荐书籍、解答图书馆相关问题。回答简洁友好，使用中文。' },
      ...history,
      { role: 'user', content: message }
    ]
  })
  res.json({ success: true, data: completion.choices[0]?.message?.content || '' })
}))

// AI对话（流式SSE）
router.post('/chat/stream', authMiddleware, async (req: Request, res: Response) => {
  const { apiKey, baseURL, chatModel } = getAIConfig()

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  if (!apiKey) {
    res.write(`data: ${JSON.stringify({ chunk: 'AI服务未配置，请管理员在系统设置中填写 API Key。' })}\n\n`)
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
    res.end()
    return
  }

  const { message, history = [] } = req.body
  const client = new OpenAI({ apiKey, baseURL })

  try {
    const stream = await client.chat.completions.create({
      model: chatModel,
      stream: true,
      messages: [
        { role: 'system', content: '你是一个图书馆智能助手，帮助用户查询图书信息、推荐书籍、解答图书馆相关问题。回答简洁友好，使用中文。' },
        ...history,
        { role: 'user', content: message }
      ]
    })
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || ''
      if (text) res.write(`data: ${JSON.stringify({ chunk: text })}\n\n`)
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
  } catch (err: any) {
    logger.error('AI stream error:', err)
    res.write(`data: ${JSON.stringify({ chunk: `AI请求失败: ${err?.message || '未知错误'}` })}\n\n`)
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
  }
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
