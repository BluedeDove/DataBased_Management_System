import { ReservationRepository, ReservationWithDetails } from './reservation.repository'
import { ReaderService } from '../reader/reader.service'
import { BookRepository } from '../book/book.repository'
import { BusinessError, NotFoundError } from '../../lib/errorHandler'

function generatePickupCode(): string {
  const now = new Date()
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `RES-${datePart}-${randomPart}`
}

export class ReservationService {
  private reservationRepository = new ReservationRepository()
  private readerService = new ReaderService()
  private bookRepository = new BookRepository()

  createReservation(readerId: number, bookId: number): ReservationWithDetails {
    this.readerService.getReaderById(readerId)
    const borrowEligibility = this.readerService.canBorrow(readerId)
    if (!borrowEligibility.canBorrow) {
      throw new BusinessError(borrowEligibility.reason || '当前读者状态不可预约')
    }

    const book = this.bookRepository.findById(bookId)
    if (!book) throw new NotFoundError('图书')
    if (book.status !== 'normal') throw new BusinessError('当前图书状态不可预约')
    if (book.available_quantity <= 0) throw new BusinessError('当前图书暂无可预约库存')

    const existing = this.reservationRepository.findPendingByReaderBook(readerId, bookId)
    if (existing) throw new BusinessError('您已预约过这本书，请勿重复预约')

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 3)

    return this.reservationRepository.create({
      reader_id: readerId,
      book_id: bookId,
      pickup_code: generatePickupCode(),
      expires_at: expiresAt.toISOString()
    })
  }

  getMyReservations(readerId: number): ReservationWithDetails[] {
    return this.reservationRepository.findByReader(readerId)
  }

  cancelReservation(id: number, readerId: number): ReservationWithDetails {
    const reservation = this.reservationRepository.findById(id)
    if (!reservation) throw new NotFoundError('预约记录')
    if (reservation.reader_id !== readerId) throw new BusinessError('只能取消自己的预约')
    if (reservation.status !== 'pending') throw new BusinessError('当前预约状态不可取消')

    return this.reservationRepository.update(id, {
      status: 'cancelled',
      cancelled_at: new Date().toISOString()
    })
  }

  fulfillReservation(readerId: number, bookId: number): ReservationWithDetails | undefined {
    return this.reservationRepository.fulfillLatestPending(readerId, bookId)
  }
}
