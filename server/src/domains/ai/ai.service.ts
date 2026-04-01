import OpenAI from 'openai'
import { db } from '../../database'
import { logger } from '../../lib/logger'

/**
 * 从数据库读取 AI 配置
 */
function loadAIConfig(): { apiKey: string; baseURL: string; embeddingModel: string; chatModel: string } {
  const rows = db.prepare(`SELECT setting_key, setting_value FROM system_settings WHERE category = 'ai'`).all() as { setting_key: string; setting_value: string }[]
  const map: Record<string, string> = {}
  rows.forEach(r => { map[r.setting_key] = r.setting_value })
  return {
    apiKey: map['ai.openai.apiKey'] || '',
    baseURL: map['ai.openai.baseURL'] || 'https://api.openai.com/v1',
    embeddingModel: map['ai.openai.embeddingModel'] || 'text-embedding-3-small',
    chatModel: map['ai.openai.chatModel'] || 'gpt-4-turbo-preview',
  }
}

export class AIService {
  private initialized = false

  init() {
    const cfg = loadAIConfig()
    this.initialized = !!cfg.apiKey
    if (this.initialized) {
      logger.info(`AI服务已初始化，模型: ${cfg.chatModel}，baseURL: ${cfg.baseURL}`)
    } else {
      logger.warn('AI服务未启用：未配置 API Key')
    }
  }

  isAvailable(): boolean {
    // 每次检查都从数据库读，保证保存后立即生效
    return !!loadAIConfig().apiKey
  }

  private getClient(): OpenAI {
    const cfg = loadAIConfig()
    return new OpenAI({ apiKey: cfg.apiKey, baseURL: cfg.baseURL })
  }

  async chatStream(
    message: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    _context: string | undefined,
    onChunk: (chunk: string) => void,
    onError: (error: Error) => void,
    onComplete: () => void
  ): Promise<(() => void) | null> {
    const cfg = loadAIConfig()
    if (!cfg.apiKey) {
      onError(new Error('AI服务未配置，请先在系统设置中填写 API Key'))
      return null
    }

    const client = this.getClient()
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: '你是一个图书馆智能助手，帮助用户查询图书信息、推荐书籍、解答图书馆相关问题。回答简洁友好，使用中文。' },
      ...history.map(m => ({ role: m.role, content: m.content } as OpenAI.Chat.ChatCompletionMessageParam)),
      { role: 'user', content: message }
    ]

    let aborted = false
    const controller = new AbortController()

    ;(async () => {
      try {
        const stream = await client.chat.completions.create(
          { model: cfg.chatModel, messages, stream: true },
          { signal: controller.signal }
        )
        for await (const chunk of stream) {
          if (aborted) break
          const text = chunk.choices[0]?.delta?.content || ''
          if (text) onChunk(text)
        }
        if (!aborted) onComplete()
      } catch (err: any) {
        if (aborted) return
        logger.error('AI chatStream 错误:', err)
        onError(new Error(err?.message || 'AI请求失败'))
      }
    })()

    return () => { aborted = true; controller.abort() }
  }

  async semanticSearchBooks(query: string, topK: number = 10): Promise<any[]> {
    return db.prepare(`
      SELECT b.*, bc.name as category_name FROM books b
      JOIN book_categories bc ON b.category_id = bc.id
      WHERE b.is_deleted = 0 AND (b.title LIKE ? OR b.description LIKE ? OR b.keywords LIKE ?)
      LIMIT ?
    `).all(`%${query}%`, `%${query}%`, `%${query}%`, topK)
  }

  async createBookEmbedding(_bookId: number): Promise<void> {
    db.prepare(`INSERT OR REPLACE INTO book_vectors (book_id, vector, text) VALUES (?, '[]', '')`).run(_bookId)
  }

  async batchCreateBookEmbeddings(bookIds: number[]): Promise<void> {
    for (const bookId of bookIds) {
      await this.createBookEmbedding(bookId)
    }
  }

  async recommendBooks(query: string, limit: number = 5): Promise<any> {
    const books = db.prepare(`
      SELECT b.*, bc.name as category_name FROM books b
      JOIN book_categories bc ON b.category_id = bc.id
      WHERE b.is_deleted = 0 AND (b.title LIKE ? OR b.description LIKE ?)
      LIMIT ?
    `).all(`%${query}%`, `%${query}%`, limit)
    return { books, summary: `找到 ${books.length} 本相关图书` }
  }

  async recommendBooksStream(query: string, limit: number, onChunk: (chunk: string) => void, onError: (error: Error) => void, onComplete: () => void): Promise<(() => void) | null> {
    if (!this.isAvailable()) { onError(new Error('AI服务未启用')); return null }
    const result = await this.recommendBooks(query, limit)
    setTimeout(() => { onChunk(JSON.stringify(result)); onComplete() }, 100)
    return () => {}
  }

  getVectorStatistics(): { totalVectors: number } {
    const result = db.prepare('SELECT COUNT(*) as count FROM book_vectors').get() as { count: number }
    return { totalVectors: result.count }
  }

  saveConversation(userId: number, title: string, messages: any[]): any {
    const result = db.prepare(`INSERT INTO ai_conversations (user_id, title, messages) VALUES (?, ?, ?)`).run(userId, title, JSON.stringify(messages))
    return { id: result.lastInsertRowid, userId, title, messages }
  }

  getUserConversations(userId: number, limit: number = 20): any[] {
    return db.prepare(`SELECT id, title, created_at, updated_at FROM ai_conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?`).all(userId, limit)
  }

  getConversation(conversationId: number): any {
    return db.prepare(`SELECT * FROM ai_conversations WHERE id = ?`).get(conversationId)
  }

  updateConversation(conversationId: number, title: string, messages: any[]): any {
    db.prepare(`UPDATE ai_conversations SET title = ?, messages = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(title, JSON.stringify(messages), conversationId)
    return this.getConversation(conversationId)
  }

  deleteConversation(conversationId: number): void {
    db.prepare(`DELETE FROM ai_conversations WHERE id = ?`).run(conversationId)
  }
}
