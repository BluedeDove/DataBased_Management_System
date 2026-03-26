import { Router } from 'express'
import * as bookController from '../controllers/book.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { requirePermission } from '../middleware/permission.middleware'

const router = Router()

// 所有路由需要认证
router.use(authMiddleware)

// 图书类别路由
router.get('/categories', bookController.getAllCategories)
router.post('/categories', requirePermission('books:write'), bookController.createCategory)
router.put('/categories/:id', requirePermission('books:write'), bookController.updateCategory)
router.delete('/categories/:id', requirePermission('books:write'), bookController.deleteCategory)

// 图书路由
router.get('/', requirePermission('books:read'), bookController.getAllBooks)
router.get('/popular', requirePermission('books:read'), bookController.getPopularBooks)
router.get('/new', requirePermission('books:read'), bookController.getNewBooks)
router.get('/category-statistics', requirePermission('books:read'), bookController.getCategoryStatistics)
router.post('/advanced-search', requirePermission('books:read'), bookController.advancedSearch)
router.post('/regex-search', requirePermission('books:read'), bookController.regexSearchBooks)
router.get('/isbn/:isbn', requirePermission('books:read'), bookController.getBookByIsbn)
router.get('/:id', requirePermission('books:read'), bookController.getBookById)
router.post('/', requirePermission('books:write'), bookController.createBook)
router.put('/:id', requirePermission('books:write'), bookController.updateBook)
router.delete('/:id', requirePermission('books:write'), bookController.deleteBook)
router.post('/:id/copies', requirePermission('books:write'), bookController.addCopies)
router.post('/:id/destroy', requirePermission('books:write'), bookController.destroyBook)
router.post('/:id/mark-lost', requirePermission('books:write'), bookController.markAsLost)
router.post('/:id/mark-damaged', requirePermission('books:write'), bookController.markAsDamaged)
router.get('/:id/borrowing-status', requirePermission('books:read'), bookController.getBorrowingStatus)

export { router as bookRoutes }
