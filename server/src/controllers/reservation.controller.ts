import { Request, Response } from 'express'
import { ReservationService } from '../domains/reservation/reservation.service'
import { asyncHandler } from '../middleware/error.middleware'

const reservationService = new ReservationService()

export const createReservation = asyncHandler(async (req: Request, res: Response) => {
  const readerId = req.user?.reader_id
  if (!readerId) {
    res.status(400).json({ success: false, error: { message: '当前账号未绑定读者信息，无法预约' } })
    return
  }

  const { bookId } = req.body
  const reservation = reservationService.createReservation(readerId, Number(bookId))
  res.json({ success: true, data: reservation })
})

export const getMyReservations = asyncHandler(async (req: Request, res: Response) => {
  const readerId = req.user?.reader_id
  if (!readerId) {
    res.json({ success: true, data: [] })
    return
  }

  const reservations = reservationService.getMyReservations(readerId)
  res.json({ success: true, data: reservations })
})

export const cancelReservation = asyncHandler(async (req: Request, res: Response) => {
  const readerId = req.user?.reader_id
  if (!readerId) {
    res.status(400).json({ success: false, error: { message: '当前账号未绑定读者信息，无法取消预约' } })
    return
  }

  const reservation = reservationService.cancelReservation(Number(req.params.id), readerId)
  res.json({ success: true, data: reservation })
})

