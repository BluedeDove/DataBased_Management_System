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
    chatModel: map['ai.openai.chatModel'] || 'gpt-4o-mini',
    embeddingModel: map['ai.openai.embeddingModel'] || 'text-embedding-3-small',
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * (b[i] || 0)
    normA += a[i] * a[i]
    normB += (b[i] || 0) * (b[i] || 0)
  }
  return normA > 0 && normB > 0 ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0
}

const router = Router()

// AI服务状态检查
router.get('/available', authMiddleware, asyncHandler(async (_req: Request, res: Response) => {
  const { apiKey } = getAIConfig()
  res.json({ success: true, data: !!apiKey })
}))

// 创建图书向量嵌入（单本）
router.post('/embeddings/:bookId', authMiddleware, requirePermission('books:write'), asyncHandler(async (req: Request, res: Response) => {
  const bookId = parseInt(req.params.bookId)
  const book = db.prepare('SELECT * FROM books WHERE id = ? AND is_deleted = 0').get(bookId) as any
  if (!book) { res.status(404).json({ success: false, error: { message: '图书不存在' } }); return }

  const text = [book.title, book.author, book.description, book.keywords].filter(Boolean).join(' ')
  const { apiKey, baseURL, embeddingModel } = getAIConfig()

  if (!apiKey) {
    db.prepare(`INSERT OR REPLACE INTO book_vectors (book_id, vector, text) VALUES (?, '[]', ?)`).run(bookId, text)
    res.json({ success: true, data: { generated: false, reason: '未配置 API Key，已标记索引位但无向量' } })
    return
  }

  const client = new OpenAI({ apiKey, baseURL })
  const resp = await client.embeddings.create({ model: embeddingModel, input: text })
  const vector = JSON.stringify(resp.data[0].embedding)
  db.prepare(`INSERT OR REPLACE INTO book_vectors (book_id, vector, text) VALUES (?, ?, ?)`).run(bookId, vector, text)
  res.json({ success: true, data: { generated: true } })
}))

// 批量创建向量嵌入
router.post('/embeddings/batch', authMiddleware, requirePermission('books:write'), asyncHandler(async (req: Request, res: Response) => {
  const { bookIds } = req.body
  if (!Array.isArray(bookIds) || bookIds.length === 0) {
    res.json({ success: true, data: { generated: 0, skipped: 0 } }); return
  }

  const { apiKey, baseURL, embeddingModel } = getAIConfig()
  let generated = 0, skipped = 0

  for (const bookId of bookIds) {
    const book = db.prepare('SELECT * FROM books WHERE id = ? AND is_deleted = 0').get(bookId) as any
    if (!book) { skipped++; continue }
    const text = [book.title, book.author, book.description, book.keywords].filter(Boolean).join(' ')
    if (!apiKey) {
      db.prepare(`INSERT OR REPLACE INTO book_vectors (book_id, vector, text) VALUES (?, '[]', ?)`).run(bookId, text)
      skipped++
    } else {
      try {
        const client = new OpenAI({ apiKey, baseURL })
        const resp = await client.embeddings.create({ model: embeddingModel, input: text })
        const vector = JSON.stringify(resp.data[0].embedding)
        db.prepare(`INSERT OR REPLACE INTO book_vectors (book_id, vector, text) VALUES (?, ?, ?)`).run(bookId, vector, text)
        generated++
      } catch (e) { logger.error(`嵌入生成失败 bookId=${bookId}`, e); skipped++ }
    }
  }
  res.json({ success: true, data: { generated, skipped } })
}))

// 语义搜索：优先使用向量余弦相似度，回退到关键词匹配
router.post('/semantic-search', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { query, topK = 10 } = req.body
  if (!query) { res.json({ success: true, data: [] }); return }

  const { apiKey, baseURL, embeddingModel } = getAIConfig()

  // Try vector-based search
  if (apiKey) {
    try {
      const rows = db.prepare(`
        SELECT bv.book_id, bv.vector, b.*, bc.name as category_name
        FROM book_vectors bv
        JOIN books b ON bv.book_id = b.id
        JOIN book_categories bc ON b.category_id = bc.id
        WHERE bv.vector != '[]' AND b.is_deleted = 0
      `).all() as any[]

      if (rows.length > 0) {
        const client = new OpenAI({ apiKey, baseURL })
        const qResp = await client.embeddings.create({ model: embeddingModel, input: query })
        const qVec = qResp.data[0].embedding

        const scored = rows.map(r => {
          const vec: number[] = JSON.parse(r.vector)
          const sim = cosineSimilarity(vec, qVec)
          const { vector, ...book } = r
          return { ...book, similarity: parseFloat(sim.toFixed(4)) }
        }).sort((a, b) => b.similarity - a.similarity).slice(0, topK)

        res.json({ success: true, data: scored }); return
      }
    } catch (e) { logger.warn('向量搜索失败，回退到关键词搜索', e) }
  }

  // Keyword fallback
  const books = db.prepare(`
    SELECT b.*, bc.name as category_name FROM books b
    JOIN book_categories bc ON b.category_id = bc.id
    WHERE b.is_deleted = 0 AND (b.title LIKE ? OR b.description LIKE ? OR b.keywords LIKE ? OR b.author LIKE ?)
    LIMIT ?
  `).all(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, topK) as any[]

  const q = query.toLowerCase()
  const scored = books.map((b, idx) => {
    const title = (b.title || '').toLowerCase()
    const author = (b.author || '').toLowerCase()
    const kw = (b.keywords || '').toLowerCase()
    const desc = (b.description || '').toLowerCase()
    let score = 0.40
    if (title === q) score = 0.98
    else if (title.startsWith(q)) score = 0.90
    else if (title.includes(q)) score = 0.78
    else if (author.includes(q)) score = 0.65
    else if (kw.includes(q)) score = 0.55
    else if (desc.includes(q)) score = 0.45
    score = Math.max(0.10, score - idx * 0.01)
    return { ...b, similarity: parseFloat(score.toFixed(2)) }
  }).sort((a, b) => b.similarity - a.similarity)

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
router.post('/chat/cancel', authMiddleware, (_req: Request, res: Response) => {
  res.json({ success: true })
})

// ── AI 智能书籍推荐（核心功能）──────────────────────────────
// 根据对话上下文，让 AI 从图书目录中选出最相关的书籍并返回完整图书数据
router.post('/chat-recommend', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { messages = [], userQuery = '' } = req.body

  // 从数据库获取全部可用图书（最多100本，按可用数量优先）
  const allBooks = db.prepare(`
    SELECT b.id, b.title, b.author, b.description, b.keywords,
           bc.name as category_name, b.available_quantity, b.total_quantity, b.status
    FROM books b
    JOIN book_categories bc ON b.category_id = bc.id
    WHERE b.is_deleted = 0
    ORDER BY b.available_quantity DESC, b.id ASC
    LIMIT 120
  `).all() as any[]

  const { apiKey, baseURL, chatModel } = getAIConfig()

  if (!apiKey) {
    // 无 AI：基于关键词评分回退
    const q = (userQuery || '').toLowerCase()
    let candidates = allBooks
    if (q.length >= 2) {
      candidates = allBooks.filter(b =>
        (b.title || '').toLowerCase().includes(q) ||
        (b.author || '').toLowerCase().includes(q) ||
        (b.keywords || '').toLowerCase().includes(q) ||
        (b.description || '').toLowerCase().includes(q) ||
        (b.category_name || '').toLowerCase().includes(q)
      )
    }
    const fallback = (candidates.length > 0 ? candidates : allBooks).slice(0, 5)
    const ids = fallback.map((b: any) => b.id)
    const full = ids.length > 0
      ? db.prepare(`SELECT b.*, bc.name as category_name FROM books b JOIN book_categories bc ON b.category_id = bc.id WHERE b.id IN (${ids.join(',')}) AND b.is_deleted = 0`).all()
      : []
    res.json({ success: true, data: { books: full, ai_powered: false } })
    return
  }

  // 构建给 AI 的图书目录（紧凑格式）
  const catalog = allBooks.map(b =>
    `${b.id}|${b.title}|${b.author}|${b.category_name}|${[b.keywords, b.description].filter(Boolean).join(' ').slice(0, 60)}`
  ).join('\n')

  // 取最近 8 条对话作为上下文
  const context = (messages as any[])
    .filter((m: any) => m.role && m.content && !m.loading)
    .slice(-8)
    .map((m: any) => `${m.role === 'user' ? '用户' : '助手'}: ${m.content}`)
    .join('\n')

  const prompt = `你是图书馆推荐引擎。根据对话分析用户需求，从图书目录中挑选3-5本最合适的图书。

对话上下文：
${context || `用户询问：${userQuery}`}

图书目录（格式：ID|书名|作者|分类|关键词）：
${catalog}

只返回 JSON，不要任何说明文字：
{"book_ids":[ID1,ID2,ID3]}`

  try {
    const client = new OpenAI({ apiKey, baseURL })
    const completion = await client.chat.completions.create({
      model: chatModel,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
      temperature: 0.2
    })

    const raw = (completion.choices[0]?.message?.content || '').trim()
    // 提取 JSON（防止 AI 在 JSON 外面加了说明文字或代码块）
    const jsonMatch = raw.match(/\{[\s\S]*?\}/)
    let bookIds: number[] = []
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])
        bookIds = (parsed.book_ids || []).filter((id: any) => typeof id === 'number' && Number.isInteger(id))
      } catch { /* fall through */ }
    }

    if (bookIds.length === 0) {
      // AI didn't return valid JSON — fallback to keyword search
      const q = (userQuery || '').toLowerCase()
      const fallback = q.length >= 2
        ? allBooks.filter(b => (b.title || '').toLowerCase().includes(q) || (b.author || '').toLowerCase().includes(q))
        : allBooks
      bookIds = fallback.slice(0, 5).map((b: any) => b.id)
    }

    // 获取完整图书数据（保持 AI 推荐的顺序）
    const placeholders = bookIds.map(() => '?').join(',')
    const bookMap = new Map<number, any>()
    if (bookIds.length > 0) {
      const fullBooks = db.prepare(`
        SELECT b.*, bc.name as category_name
        FROM books b
        JOIN book_categories bc ON b.category_id = bc.id
        WHERE b.id IN (${placeholders}) AND b.is_deleted = 0
      `).all(...bookIds) as any[]
      fullBooks.forEach(b => bookMap.set(b.id, b))
    }
    const ordered = bookIds.map(id => bookMap.get(id)).filter(Boolean)

    res.json({ success: true, data: { books: ordered, ai_powered: true } })
  } catch (err: any) {
    logger.error('chat-recommend error:', err)
    // 完全回退到热门图书
    const fallback = db.prepare(`
      SELECT b.*, bc.name as category_name FROM books b
      JOIN book_categories bc ON b.category_id = bc.id
      WHERE b.is_deleted = 0
      ORDER BY b.available_quantity DESC LIMIT 5
    `).all()
    res.json({ success: true, data: { books: fallback, ai_powered: false } })
  }
}))

// 图书推荐（旧接口，保留兼容）
router.post('/recommend', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { query, limit = 5 } = req.body
  const books = db.prepare(`SELECT b.*, bc.name as category_name FROM books b JOIN book_categories bc ON b.category_id = bc.id WHERE b.is_deleted = 0 AND (b.title LIKE ? OR b.description LIKE ?) LIMIT ?`).all(`%${query}%`, `%${query}%`, limit)
  res.json({ success: true, data: books })
}))

// 流式推荐（旧接口，保留兼容）
router.post('/recommend/stream', authMiddleware, (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
  res.end()
})

// 取消推荐
router.post('/recommend/cancel', authMiddleware, (_req: Request, res: Response) => {
  res.json({ success: true })
})

// 获取向量统计（含覆盖率）
router.get('/statistics', authMiddleware, asyncHandler(async (_req: Request, res: Response) => {
  const vectorCount = (db.prepare(`SELECT COUNT(*) as count FROM book_vectors WHERE vector != '[]'`).get() as { count: number }).count
  const totalBooks = (db.prepare(`SELECT COUNT(*) as count FROM books WHERE is_deleted = 0`).get() as { count: number }).count
  const coverageRate = totalBooks > 0 ? Math.round(vectorCount / totalBooks * 100) : 0
  res.json({ success: true, data: { vectorCount, totalVectors: vectorCount, totalBooks, coverageRate } })
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
