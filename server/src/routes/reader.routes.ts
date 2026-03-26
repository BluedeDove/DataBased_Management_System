import { Router } from 'express'
import * as readerController from '../controllers/reader.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { requirePermission } from '../middleware/permission.middleware'

const router = Router()

// 所有路由需要认证
router.use(authMiddleware)

// 读者种类路由
router.get('/categories', readerController.getAllCategories)
router.post('/categories', requirePermission('readers:write'), readerController.createCategory)
router.put('/categories/:id', requirePermission('readers:write'), readerController.updateCategory)

// 读者路由
router.get('/', requirePermission('readers:read'), readerController.getAllReaders)
router.get('/search', requirePermission('readers:read'), readerController.searchReaders)
router.post('/regex-search', requirePermission('readers:read'), readerController.regexSearchReaders)
router.get('/:id', requirePermission('readers:read'), readerController.getReaderById)
router.get('/no/:readerNo', requirePermission('readers:read'), readerController.getReaderByNo)
router.post('/', requirePermission('readers:write'), readerController.createReader)
router.put('/:id', requirePermission('readers:write'), readerController.updateReader)
router.delete('/:id', requirePermission('readers:write'), readerController.deleteReader)
router.post('/:id/suspend', requirePermission('readers:write'), readerController.suspendReader)
router.post('/:id/activate', requirePermission('readers:write'), readerController.activateReader)
router.post('/:id/renew', requirePermission('readers:write'), readerController.renewReader)
router.get('/:id/can-borrow', requirePermission('borrowing:read'), readerController.canBorrow)
router.get('/:id/statistics', requirePermission('readers:read'), readerController.getReaderStatistics)

export { router as readerRoutes }
