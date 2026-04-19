import { Router } from 'express'
import * as machineController from '../controllers/machine.controller'
import { authMiddleware } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/permission.middleware'
import { validate, Schemas } from '../middleware/validation.middleware'

const router = Router()

router.use(authMiddleware)
router.use(requireRole('machine', 'admin', 'librarian'))

router.get('/readers/suggest', requireRole('admin', 'librarian'), machineController.getReaderSuggestions)
router.get('/copies/suggest', machineController.getCopySuggestions)
router.get('/reader/:readerNo', machineController.getReaderSummary)
router.get('/copy/:barcode', machineController.getCopySummary)
router.post('/reader/verify', validate(Schemas.machineVerifyReader), machineController.verifyReaderIdentity)
router.post('/borrow', validate(Schemas.machineBorrow), machineController.borrowByMachine)
router.post('/return', validate(Schemas.machineReturn), machineController.returnByMachine)

export { router as machineRoutes }
