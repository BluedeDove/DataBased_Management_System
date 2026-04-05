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
    chatModel: map['ai.openai.chatModel'] || 'Pro/MiniMaxAI/MiniMax-M2.5',
    embeddingModel: map['ai.openai.embeddingModel'] || 'Qwen/Qwen3-Embedding-8B',
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
export const SYSTEM_PROMPT = `你是智能图书管理系统的AI助手。

## 工作流程（必须严格遵守）

当用户提出问题时，按以下优先级执行：

### 第一步：搜索整理
- 用户询问图书相关问题时，**必须先调用 search_books** 搜索相关图书
- 用户询问笔记/读书心得时，调用 search_notes 搜索公共笔记
- 根据搜索结果整理信息，向用户呈现实际数据

### 第二步：深入查询（如需）
- 查看具体图书详情：调用 get_book_details
- 查看借阅状态：调用 get_borrowing_status
- 查看用户的借阅记录：调用 get_my_borrowings

### 第三步：推荐或操作（仅在适当时机）
- 搜索结果不足以回答用户需求时，可调用 recommend_books 补充推荐
- 用户明确要求推荐时，先搜索再推荐，不要直接推荐
- 用户明确要求借书时，调用 borrow_book
- 用户要求发布笔记时，调用 publish_note

## 关键规则
1. 禁止在没有搜索结果的情况下直接推荐书籍
2. 所有回答必须基于工具返回的实际数据，不要编造信息
3. 回答简洁友好，使用中文
4. 搜索结果为空时，如实告知并建议调整关键词`
