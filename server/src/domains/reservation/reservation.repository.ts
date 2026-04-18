import { db } from '../../database'
import { NotFoundError } from '../../lib/errorHandler'

export type ReservationStatus = 'pending' | 'fulfilled' | 'cancelled' | 'expired'

export interface Reservation {
  id: number
  reader_id: number
  book_id: number
  status: ReservationStatus
  pickup_code?: string | null
  reserved_at: string
  expires_at?: string | null
  fulfilled_at?: string | null
  cancelled_at?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface ReservationWithDetails extends Reservation {
  reader_name: string
  reader_no: string
  book_title: string
  book_author: string
  book_isbn: string
}

export class ReservationRepository {
  private baseSelect = `
    SELECT
      r.*,
      readers.name AS reader_name,
      readers.reader_no,
      books.title AS book_title,
      books.author AS book_author,
      books.isbn AS book_isbn
    FROM reservations r
    JOIN readers ON r.reader_id = readers.id
    JOIN books ON r.book_id = books.id
  `

  findById(id: number): ReservationWithDetails | undefined {
    return db.prepare(`${this.baseSelect} WHERE r.id = ?`).get(id) as ReservationWithDetails | undefined
  }

  findPendingByReaderBook(readerId: number, bookId: number): ReservationWithDetails | undefined {
    return db.prepare(`
      ${this.baseSelect}
      WHERE r.reader_id = ?
        AND r.book_id = ?
        AND r.status = 'pending'
      ORDER BY r.id DESC
      LIMIT 1
    `).get(readerId, bookId) as ReservationWithDetails | undefined
  }

  create(data: {
    reader_id: number
    book_id: number
    pickup_code: string
    expires_at?: string | null
    notes?: string | null
  }): ReservationWithDetails {
    const result = db.prepare(`
      INSERT INTO reservations (
        reader_id, book_id, pickup_code, expires_at, notes
      ) VALUES (?, ?, ?, ?, ?)
    `).run(data.reader_id, data.book_id, data.pickup_code, data.expires_at ?? null, data.notes ?? null)

    const created = this.findById(result.lastInsertRowid as number)
    if (!created) {
      throw new NotFoundError('预约记录')
    }

    return created
  }

  findByReader(readerId: number): ReservationWithDetails[] {
    return db.prepare(`
      ${this.baseSelect}
      WHERE r.reader_id = ?
      ORDER BY datetime(r.created_at) DESC, r.id DESC
    `).all(readerId) as ReservationWithDetails[]
  }

  update(id: number, updates: Partial<Reservation>): ReservationWithDetails {
    const fields: string[] = []
    const values: any[] = []

    Object.keys(updates).forEach((key) => {
      if (!['id', 'created_at', 'updated_at'].includes(key)) {
        fields.push(`${key} = ?`)
        values.push(updates[key as keyof Reservation])
      }
    })

    if (fields.length > 0) {
      fields.push('updated_at = CURRENT_TIMESTAMP')
      values.push(id)
      db.prepare(`UPDATE reservations SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    }

    const updated = this.findById(id)
    if (!updated) {
      throw new NotFoundError('预约记录')
    }

    return updated
  }

  fulfillLatestPending(readerId: number, bookId: number): ReservationWithDetails | undefined {
    const pending = this.findPendingByReaderBook(readerId, bookId)
    if (!pending) return undefined

    return this.update(pending.id, {
      status: 'fulfilled',
      fulfilled_at: new Date().toISOString()
    })
  }
}

