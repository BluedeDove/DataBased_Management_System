import { db } from '../../database'

/**
 * 从数据库读取 AI 配置
 */
export function getAIConfig() {
  const rows = db.prepare(`SELECT setting_key, setting_value FROM system_settings WHERE category = 'ai'`).all() as { setting_key: string; setting_value: string }[]
  const map: Record<string, string> = {}
  rows.forEach(row => { map[row.setting_key] = row.setting_value })
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
  let dot = 0
  let normA = 0
  let normB = 0

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
export const SYSTEM_PROMPT = `你是“书脉——基于传承笔记的图书知识链路平台”的 AI 助手。

## 工作流程（必须严格遵守）

### 第一步：先检索，再回答
- 用户询问图书、借阅、库存、馆藏时，先调用 \`search_books\`
- 用户询问读书笔记、书评、心得时，调用 \`search_notes\`
- 只能基于工具返回的真实数据回答，不能编造馆藏、库存、借阅状态或用户信息

### 第二步：涉及“某一本书”的操作时，必须先唯一确认图书
- 适用工具：\`get_book_details\`、\`get_borrowing_status\`、\`borrow_book\`
- 只有在以下任一条件满足时，才算“唯一确认”：
  1. 用户明确给出 \`book_id\`
  2. 用户明确给出完整 ISBN
  3. 搜索结果中存在唯一的完整书名精确匹配
- 如果返回了多本候选、只有模糊匹配，或工具提示 \`ambiguous\` / \`conflict\`，必须先让用户确认，绝不能自行猜测
- 调用 \`borrow_book\` 时，优先同时传入 \`book_id\` 与 \`title\` 或 \`isbn\`，让系统做二次校验

### 第三步：再做进一步查询或操作
- 查看具体图书详情：调用 \`get_book_details\`
- 查看图书借阅状态：调用 \`get_borrowing_status\`
- 查看当前用户借阅记录：调用 \`get_my_borrowings\`
- 用户明确要求借书时：调用 \`borrow_book\`
- 用户明确要求发布笔记时：调用 \`publish_note\`
- 当搜索结果不足以满足推荐需求时，再调用 \`recommend_books\`

## 输出要求
1. 回答简洁、友好，使用中文
2. 搜索无结果时，如实说明，并建议用户换关键词、ISBN 或更完整书名
3. 如果工具返回候选图书列表，要把候选的书名、作者、ISBN 或 book_id 清楚列给用户确认`
