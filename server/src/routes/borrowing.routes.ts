import { Router } from 'express'
import * as borrowingController from '../controllers/borrowing.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { requirePermission } from '../middleware/permission.middleware'

const router = Router()

router.use(authMiddleware)

router.get('/', requirePermission('borrowing:read'), borrowingController.getAllRecords)
router.get('/overdue', requirePermission('borrowing:read'), borrowingController.getOverdueRecords)
router.get('/statistics', requirePermission('borrowing:read'), borrowingController.getStatistics)
router.get('/popular', requirePermission('borrowing:read'), borrowingController.getPopularBorrowings)
router.get('/active-readers', requirePermission('borrowing:read'), borrowingController.getActiveReaders)
router.get('/trend', requirePermission('borrowing:read'), borrowingController.getTrend)
router.get('/book-count', requirePermission('borrowing:read'), borrowingController.getBookCount)
router.get('/reader/:readerId', requirePermission('borrowing:read'), borrowingController.getReaderHistory)
router.get('/book/:bookId', requirePermission('borrowing:read'), borrowingController.getBookHistory)
router.post('/', requirePermission('borrowing:borrow'), borrowingController.borrowBook)
router.put('/:id/return', requirePermission('borrowing:borrow'), borrowingController.returnBook)
router.put('/:id/renew', requirePermission('borrowing:borrow'), borrowingController.renewBook)
router.put('/:id/mark-lost', requirePermission('borrowing:write'), borrowingController.markAsLost)
router.delete('/:id', requirePermission('borrowing:write'), borrowingController.deleteRecord)

export { router as borrowingRoutes }
