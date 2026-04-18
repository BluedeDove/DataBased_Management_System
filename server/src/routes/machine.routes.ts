import { Router } from 'express'
import * as machineController from '../controllers/machine.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/permission.middleware'

const router = Router()

router.use(authMiddleware)
router.use(requireRole('machine', 'admin', 'librarian'))

router.get('/readers/suggest', machineController.getReaderSuggestions)
router.get('/copies/suggest', machineController.getCopySuggestions)
router.get('/reader/:readerNo', machineController.getReaderSummary)
router.get('/copy/:barcode', machineController.getCopySummary)
router.post('/borrow', machineController.borrowByMachine)
router.post('/return', machineController.returnByMachine)

export { router as machineRoutes }
