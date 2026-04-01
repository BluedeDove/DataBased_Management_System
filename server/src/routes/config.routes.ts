import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import { adminOnly } from '../middleware/permission.middleware'
import { asyncHandler } from '../middleware/error.middleware'
import { db } from '../database'

const router = Router()

function getAISettingsFromDB(): Record<string, string> {
  const rows = db.prepare(`SELECT setting_key, setting_value FROM system_settings WHERE category = 'ai'`).all() as { setting_key: string; setting_value: string }[]
  const map: Record<string, string> = {}
  rows.forEach(r => { map[r.setting_key.replace('ai.openai.', '')] = r.setting_value })
  return map
}

// 获取AI设置
router.get('/ai', authMiddleware, asyncHandler(async (_req: Request, res: Response) => {
  res.json({ success: true, data: getAISettingsFromDB() })
}))

// 更新AI设置
router.put('/ai', authMiddleware, adminOnly, asyncHandler(async (req: Request, res: Response) => {
  const { apiKey, baseURL, embeddingModel, chatModel } = req.body
  const updates: Array<[string, string]> = []
  if (apiKey !== undefined) updates.push(['ai.openai.apiKey', apiKey])
  if (baseURL !== undefined) updates.push(['ai.openai.baseURL', baseURL])
  if (embeddingModel !== undefined) updates.push(['ai.openai.embeddingModel', embeddingModel])
  if (chatModel !== undefined) updates.push(['ai.openai.chatModel', chatModel])

  const stmt = db.prepare(`UPDATE system_settings SET setting_value = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_key = ?`)
  updates.forEach(([key, value]) => stmt.run(value, key))

  res.json({ success: true, data: null })
}))

// 测试AI连接（读数据库里的真实配置）
router.post('/ai/test', authMiddleware, adminOnly, asyncHandler(async (_req: Request, res: Response) => {
  const settings = getAISettingsFromDB()
  const hasKey = !!settings['apiKey']
  res.json({ success: true, data: { success: hasKey, message: hasKey ? 'AI配置有效' : '未配置API密钥' } })
}))

export { router as configRoutes }
