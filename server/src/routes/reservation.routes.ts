import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import * as reservationController from '../controllers/reservation.controller'

const router = Router()

router.use(authMiddleware)

router.get('/my', reservationController.getMyReservations)
router.post('/', reservationController.createReservation)
router.put('/:id/cancel', reservationController.cancelReservation)

export { router as reservationRoutes }

