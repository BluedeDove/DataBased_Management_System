import { Router } from 'express'
import * as borrowingController from '../controllers/borrowing.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { requirePermission, librarianOrAbove } from '../middleware/permission.middleware'

const router = Router()

router.use(authMiddleware)

// 当前登录用户的借阅记录（无需特殊权限，仅需登录）
router.get('/my', borrowingController.getMyBorrowings)
router.get('/renewal-requests/pending', librarianOrAbove, borrowingController.getPendingRenewalRequests)
router.post('/renewal-requests/:id/review', librarianOrAbove, borrowingController.reviewRenewalRequest)

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
router.post('/:id/renew-request', requirePermission('borrowing:borrow'), borrowingController.requestRenewal)
router.put('/:id/mark-lost', requirePermission('borrowing:write'), borrowingController.markAsLost)
router.delete('/:id', requirePermission('borrowing:write'), borrowingController.deleteRecord)

export { router as borrowingRoutes }
