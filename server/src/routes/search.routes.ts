import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import { adminOnly } from '../middleware/permission.middleware'
import { asyncHandler } from '../middleware/error.middleware'
import { SqlSearchService } from '../domains/search/sql-search.service'

const router = Router()
const sqlSearchService = new SqlSearchService()

// 执行SQL查询（仅管理员）
router.post('/sql', authMiddleware, adminOnly, asyncHandler(async (req: Request, res: Response) => {
  const { query } = req.body
  const result = sqlSearchService.executeQuery(query)
  res.json({ success: true, data: result.rows })
}))

// 获取所有表
router.get('/tables', authMiddleware, adminOnly, asyncHandler(async (req: Request, res: Response) => {
  const tables = sqlSearchService.getAllTables()
  res.json({ success: true, data: tables })
}))

// 获取表结构
router.get('/tables/:name/schema', authMiddleware, adminOnly, asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.params
  const schema = sqlSearchService.getTableSchema(name)
  res.json({ success: true, data: schema })
}))

export { router as searchRoutes }
