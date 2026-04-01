import { Router } from 'express'
import { login, logout, validate as validateToken, changePassword, register, getPermissions, checkPermission, refresh } from '../controllers/auth.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { loginLimiter, registerLimiter, sensitiveLimiter, apiLimiter } from '../middleware/rateLimit.middleware'
import { validate, Schemas } from '../middleware/validation.middleware'

const router = Router()

// 公开路由（带限流和验证）
router.post('/login', loginLimiter, validate(Schemas.login), login)
router.post('/register', registerLimiter, validate(Schemas.register), register)
router.post('/refresh', apiLimiter, refresh)  // Token刷新

// 需要认证的路由
router.post('/logout', authMiddleware, logout)
router.get('/validate', authMiddleware, validateToken)
router.put('/password', authMiddleware, sensitiveLimiter, validate(Schemas.changePassword), changePassword)
router.get('/permissions', authMiddleware, getPermissions)
router.post('/check-permission', authMiddleware, checkPermission)

export { router as authRoutes }
