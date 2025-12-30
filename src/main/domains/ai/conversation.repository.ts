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
    logger.info('[Conversation] ========== 创建对话 ==========')
    logger.info('[Conversation] 用户ID:', userId)
    logger.info('[Conversation] 对话标题:', title)
    logger.info('[Conversation] 消息数量:', messages.length)

    const stmt = db.prepare(`
      INSERT INTO ai_conversations (user_id, title, messages)
      VALUES (?, ?, ?)
    `)
    const result = stmt.run(userId, title, JSON.stringify(messages))
    logger.info('[Conversation] 对话创建成功，ID:', result.lastInsertRowid)
    logger.info('[Conversation] ========== 创建对话结束 ==========')
    return this.findById(result.lastInsertRowid as number)!
  }

  findById(id: number): ConversationWithMessages | undefined {
    logger.info('[Conversation] ========== 查找对话 ==========')
    logger.info('[Conversation] 对话ID:', id)

    const stmt = db.prepare('SELECT * FROM ai_conversations WHERE id = ?')
    const row = stmt.get(id) as any
    if (row) {
      try {
        row.messages = JSON.parse(row.messages)
        logger.info('[Conversation] 对话加载成功，消息数量:', row.messages.length)
      } catch (error) {
        logger.error('[Conversation] 解析对话消息失败', { id, error })
        row.messages = []
      }
    } else {
      logger.warn('[Conversation] 对话不存在，ID:', id)
    }
    return row
  }

  findByUserId(userId: number, limit: number = 20): ConversationWithMessages[] {
    logger.info('[Conversation] ========== 查找用户对话 ==========')
    logger.info('[Conversation] 用户ID:', userId)
    logger.info('[Conversation] 数量限制:', limit)

    const stmt = db.prepare(`
      SELECT * FROM ai_conversations
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `)
    const rows = stmt.all(userId, limit) as any[]
    logger.info('[Conversation] 找到对话数量:', rows.length)

    const result = rows.map(row => {
      try {
        return {
          ...row,
          messages: JSON.parse(row.messages)
        }
      } catch (error) {
        logger.error('[Conversation] 解析对话消息失败', { id: row.id, error })
        return {
          ...row,
          messages: []
        }
      }
    })
    logger.info('[Conversation] ========== 查找用户对话结束 ==========')
    return result
  }

  update(id: number, title: string, messages: any[]): ConversationWithMessages | undefined {
    logger.info('[Conversation] ========== 更新对话 ==========')
    logger.info('[Conversation] 对话ID:', id)
    logger.info('[Conversation] 对话标题:', title)
    logger.info('[Conversation] 消息数量:', messages.length)

    const stmt = db.prepare(`
      UPDATE ai_conversations
      SET title = ?, messages = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    const result = stmt.run(title, JSON.stringify(messages), id)
    logger.info('[Conversation] 更新成功，影响行数:', result.changes)
    logger.info('[Conversation] ========== 更新对话结束 ==========')
    return this.findById(id)
  }

  delete(id: number): void {
    logger.info('[Conversation] ========== 删除对话 ==========')
    logger.info('[Conversation] 对话ID:', id)

    db.prepare('DELETE FROM ai_conversations WHERE id = ?').run(id)
    logger.info('[Conversation] 删除成功')
    logger.info('[Conversation] ========== 删除对话结束 ==========')
  }

  deleteByUserId(userId: number): void {
    logger.info('[Conversation] ========== 删除用户所有对话 ==========')
    logger.info('[Conversation] 用户ID:', userId)

    db.prepare('DELETE FROM ai_conversations WHERE user_id = ?').run(userId)
    logger.info('[Conversation] 删除成功')
    logger.info('[Conversation] ========== 删除用户所有对话结束 ==========')
  }
}
