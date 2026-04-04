import { db } from '../../database'

/**
 * 从数据库读取 AI 配置
 */
export function getAIConfig() {
  const rows = db.prepare(`SELECT setting_key, setting_value FROM system_settings WHERE category = 'ai'`).all() as { setting_key: string; setting_value: string }[]
  const map: Record<string, string> = {}
  rows.forEach(r => { map[r.setting_key] = r.setting_value })
  return {
    apiKey: map['ai.openai.apiKey'] || '',
    baseURL: map['ai.openai.baseURL'] || 'https://api.siliconflow.cn/v1',
    chatModel: map['ai.openai.chatModel'] || 'Pro/zai-org/GLM-4.7',
    embeddingModel: map['ai.openai.embeddingModel'] || 'BAAI/bge-large-zh-v1.5',
  }
}

/**
 * 余弦相似度计算
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * (b[i] || 0)
    normA += a[i] * a[i]
    normB += (b[i] || 0) * (b[i] || 0)
  }
  return normA > 0 && normB > 0 ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0
}

/**
 * Agent 系统提示词
 */
export const SYSTEM_PROMPT = `你是智能图书管理系统的AI助手，可以搜索图书、推荐书籍、查看借阅状态、协助借阅。

可用工具：
- search_books: 搜索图书（支持关键词、正则、语义三种模式）
- recommend_books: 根据主题/类型推荐图书
- get_book_details: 查看图书详细信息和借阅状态
- get_borrowing_status: 查询某本书的当前借阅状态
- borrow_book: 帮用户借阅图书（仅在用户明确要求时调用）

规则：
1. 必须基于工具返回的实际数据回答，不要编造图书信息
2. 借阅操作需要用户明确确认后才可执行
3. 回答简洁友好，使用中文
4. 如果工具返回的结果为空，如实告知用户`
