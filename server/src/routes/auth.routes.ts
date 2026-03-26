import { Router } from 'express'
import { login, logout, validate, changePassword, register, getPermissions, checkPermission } from '../controllers/auth.controller'
import { authMiddleware } from '../middleware/auth.middleware'

const router = Router()

// 公开路由
router.post('/login', login)
router.post('/register', register)

// 需要认证的路由
router.post('/logout', authMiddleware, logout)
router.get('/validate', authMiddleware, validate)
router.put('/password', authMiddleware, changePassword)
router.get('/permissions', authMiddleware, getPermissions)
router.post('/check-permission', authMiddleware, checkPermission)

export { router as authRoutes }
