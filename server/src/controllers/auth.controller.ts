import { Request, Response, NextFunction } from 'express'
import { AuthService } from '../domains/auth/auth.service'
import { asyncHandler } from '../middleware/error.middleware'

const authService = new AuthService()

/**
 * 登录
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body)
  res.json({
    success: true,
    data: result
  })
})

/**
 * 登出
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  // JWT 无状态，客户端删除 token 即可
  res.json({
    success: true,
    data: null
  })
})

/**
 * 验证 Token
 */
export const validate = asyncHandler(async (req: Request, res: Response) => {
  // 如果通过了 authMiddleware，user 一定存在
  res.json({
    success: true,
    data: req.user
  })
})

/**
 * 修改密码
 */
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { oldPassword, newPassword } = req.body
  const userId = req.user!.id

  await authService.changePassword(userId, oldPassword, newPassword)
  res.json({
    success: true,
    data: null
  })
})

/**
 * 注册
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.register(req.body)
  res.json({
    success: true,
    data: user
  })
})

/**
 * 获取用户权限
 */
export const getPermissions = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id
  const permissions = authService.getUserPermissions(userId)
  res.json({
    success: true,
    data: permissions
  })
})

/**
 * 检查权限
 */
export const checkPermission = asyncHandler(async (req: Request, res: Response) => {
  const { permission } = req.body
  const user = req.user!

  const hasPermission = authService.hasPermission(user as any, permission)
  res.json({
    success: true,
    data: hasPermission
  })
})
