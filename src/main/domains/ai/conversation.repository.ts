import { db } from '../../database'
import { logger } from '../../lib/logger'

export interface Conversation {
  id: number
  user_id: number
  title: string
  messages: string // JSON字符串
  created_at: string
  updated_at: string
}

export interface ConversationWithMessages {
  id: number
  user_id: number
  title: string
  messages: any[] // 解析后的消息数组
  created_at: string
  updated_at: string
}

export class ConversationRepository {
  create(userId: number, title: string, messages: any[]): ConversationWithMessages {
    const stmt = db.prepare(`
      INSERT INTO ai_conversations (user_id, title, messages)
      VALUES (?, ?, ?)
    `)
    const result = stmt.run(userId, title, JSON.stringify(messages))
    logger.info('创建AI对话历史', { id: result.lastInsertRowid, userId, title })
    return this.findById(result.lastInsertRowid as number)!
  }

  findById(id: number): ConversationWithMessages | undefined {
    const stmt = db.prepare('SELECT * FROM ai_conversations WHERE id = ?')
    const row = stmt.get(id) as any
    if (row) {
      try {
        row.messages = JSON.parse(row.messages)
      } catch (error) {
        logger.error('解析对话消息失败', { id, error })
        row.messages = []
      }
    }
    return row
  }

  findByUserId(userId: number, limit: number = 20): ConversationWithMessages[] {
    const stmt = db.prepare(`
      SELECT * FROM ai_conversations
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `)
    const rows = stmt.all(userId, limit) as any[]
    return rows.map(row => {
      try {
        return {
          ...row,
          messages: JSON.parse(row.messages)
        }
      } catch (error) {
        logger.error('解析对话消息失败', { id: row.id, error })
        return {
          ...row,
          messages: []
        }
      }
    })
  }

  update(id: number, title: string, messages: any[]): ConversationWithMessages | undefined {
    const stmt = db.prepare(`
      UPDATE ai_conversations
      SET title = ?, messages = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    stmt.run(title, JSON.stringify(messages), id)
    logger.info('更新AI对话历史', { id, title })
    return this.findById(id)
  }

  delete(id: number): void {
    db.prepare('DELETE FROM ai_conversations WHERE id = ?').run(id)
    logger.info('删除AI对话历史', { id })
  }

  deleteByUserId(userId: number): void {
    db.prepare('DELETE FROM ai_conversations WHERE user_id = ?').run(userId)
    logger.info('删除用户所有AI对话历史', { userId })
  }
}
