import { Router } from 'express'
import * as borrowingController from '../controllers/borrowing.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { requirePermission, librarianOrAbove, requireRole } from '../middleware/permission.middleware'

const router = Router()
const staffBorrowOnly = requireRole('admin', 'librarian')

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
router.post('/', staffBorrowOnly, borrowingController.borrowBook)
router.put('/:id/return', staffBorrowOnly, borrowingController.returnBook)
router.put('/:id/renew', staffBorrowOnly, borrowingController.renewBook)
router.post('/:id/renew-request', requirePermission('borrowing:borrow'), borrowingController.requestRenewal)
router.put('/:id/mark-lost', staffBorrowOnly, borrowingController.markAsLost)
router.delete('/:id', staffBorrowOnly, borrowingController.deleteRecord)

export { router as borrowingRoutes }
