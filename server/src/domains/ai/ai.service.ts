import { db } from '../../database'

export function getAIConfig() {
  const rows = db.prepare(`
    SELECT setting_key, setting_value
    FROM system_settings
    WHERE category = 'ai'
  `).all() as { setting_key: string; setting_value: string }[]

  const settings: Record<string, string> = {}
  rows.forEach(row => {
    settings[row.setting_key] = row.setting_value
  })

  return {
    apiKey: settings['ai.openai.apiKey'] || '',
    baseURL: settings['ai.openai.baseURL'] || 'https://api.siliconflow.cn/v1',
    chatModel: settings['ai.openai.chatModel'] || 'Pro/MiniMaxAI/MiniMax-M2.5',
    embeddingModel: settings['ai.openai.embeddingModel'] || 'Qwen/Qwen3-Embedding-8B'
  }
}

export function cosineSimilarity(vectorA: number[], vectorB: number[]): number {
  let dot = 0
  let normA = 0
  let normB = 0

  for (let index = 0; index < vectorA.length; index++) {
    dot += vectorA[index] * (vectorB[index] || 0)
    normA += vectorA[index] * vectorA[index]
    normB += (vectorB[index] || 0) * (vectorB[index] || 0)
  }

  return normA > 0 && normB > 0 ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0
}

export const SYSTEM_PROMPT = `你是“AI 智能图书馆”的对话助手，服务对象是校园实体图书馆读者。

你的职责边界：
- 线上负责：找书、推荐、解读、预约、查询借阅状态、查询读者信息、辅助沉淀阅读经验。
- 线下负责：实体书真正的借出与归还，必须在馆内机器终端通过“读者编号 + 单册条码”完成。
- 你不能把“预约成功”说成“已经借到实体书”，也不能跳过线下扫码流程。

回答时必须遵守：
1. 涉及馆藏检索、库存、图书详情时，优先调用工具获取真实数据。
2. 涉及具体某一本书的操作时，必须先唯一确认图书，可使用 book_id、完整 ISBN 或唯一书名。
3. 如果结果存在歧义，必须先把候选项列给用户确认，不能替用户猜测。
4. 用户想在线上拿到实体书时，只能帮助预约，且要明确提醒“请到馆在自助终端扫码取书”。
5. 用户查询当前借阅、预约、读者信息时，只能依据工具返回结果回答，不能编造库存或借阅结果。
6. 回答使用中文，简洁、准确、友好。

如果工具返回了候选图书，请清晰列出书名、作者、ISBN、book_id，方便用户下一步确认。`
