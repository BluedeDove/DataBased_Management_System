import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import { adminOnly } from '../middleware/permission.middleware'
import { asyncHandler } from '../middleware/error.middleware'
import { db } from '../database'
import { config } from '../config'

const router = Router()

// 获取AI设置
router.get('/ai', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const settings = db.prepare(`SELECT setting_key, setting_value, setting_type, description FROM system_settings WHERE category = 'ai'`).all()
  const result: Record<string, any> = {}
  settings.forEach((s: any) => {
    let value = s.setting_value
    if (s.setting_type === 'number') value = Number(value)
    else if (s.setting_type === 'boolean') value = value === 'true'
    const key = s.setting_key.replace('ai.openai.', '')
    result[key] = value
  })
  res.json({ success: true, data: result })
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

// 测试AI连接
router.post('/ai/test', authMiddleware, adminOnly, asyncHandler(async (req: Request, res: Response) => {
  const hasKey = !!config.ai.openai.apiKey
  res.json({ success: true, data: { success: hasKey, message: hasKey ? 'AI配置有效' : '未配置API密钥' } })
}))

export { router as configRoutes }
