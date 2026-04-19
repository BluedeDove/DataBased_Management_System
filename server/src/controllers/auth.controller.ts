import { Request, Response, NextFunction } from 'express'
import { AuthService } from '../domains/auth/auth.service'
import { asyncHandler } from '../middleware/error.middleware'
import { generateToken, verifyToken, decodeToken } from '../lib/jwt'

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
 * 刷新 Token
 */
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: '未提供认证令牌'
      }
    })
  }

  const token = authHeader.substring(7)

  // 尝试验证Token（即使过期也尝试解码）
  let payload = verifyToken(token)

  // 如果Token完全无效，返回错误
  if (!payload) {
    // 尝试解码以检查是否只是过期
    const decoded = decodeToken(token)
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: '无效的令牌'
        }
      })
    }

    // Token已过期但格式正确，允许刷新
    payload = decoded
  }

  // 生成新Token
  const newToken = generateToken({
    userId: payload.userId,
    username: payload.username,
    role: payload.role
  })

  res.json({
    success: true,
    data: {
      token: newToken,
      expiresIn: 7 * 24 * 60 * 60  // 7天（秒）
    }
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

export const getBorrowPinStatus = asyncHandler(async (req: Request, res: Response) => {
  const status = authService.getBorrowPinStatus(req.user!.id)
  res.json({
    success: true,
    data: status
  })
})

export const changeBorrowPin = asyncHandler(async (req: Request, res: Response) => {
  const { loginPassword, borrowPin } = req.body
  const status = await authService.changeBorrowPin(req.user!.id, loginPassword, borrowPin)

  res.json({
    success: true,
    data: status
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
