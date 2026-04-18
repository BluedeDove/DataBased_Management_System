import { db } from '../../database'
import { NotFoundError } from '../../lib/errorHandler'

export type BookCopyStatus = 'available' | 'borrowed' | 'reserved' | 'lost' | 'damaged' | 'maintenance'

export interface BookCopy {
  id: number
  book_id: number
  barcode: string
  status: BookCopyStatus
  location?: string | null
  version: number
  is_deleted: number
  created_at: string
  updated_at: string
}

export interface BookCopyWithBook extends BookCopy {
  title: string
  author: string
  isbn: string
  category_name: string
  book_status: string
}

function generateCopyBarcode(bookId: number, sequence: number): string {
  return `BK${String(bookId).padStart(6, '0')}-${String(sequence).padStart(4, '0')}`
}

export class BookCopyRepository {
  private baseSelect = `
    SELECT
      bc.*,
      b.title,
      b.author,
      b.isbn,
      b.status AS book_status,
      cat.name AS category_name
    FROM book_copies bc
    JOIN books b ON bc.book_id = b.id
    JOIN book_categories cat ON b.category_id = cat.id
    WHERE bc.is_deleted = 0 AND b.is_deleted = 0
  `

  findById(id: number): BookCopyWithBook | undefined {
    return db.prepare(`${this.baseSelect} AND bc.id = ?`).get(id) as BookCopyWithBook | undefined
  }

  findByBarcode(barcode: string): BookCopyWithBook | undefined {
    return db.prepare(`${this.baseSelect} AND bc.barcode = ?`).get(barcode.trim()) as BookCopyWithBook | undefined
  }

  findAvailableByBookId(bookId: number): BookCopyWithBook | undefined {
    return db.prepare(`
      ${this.baseSelect}
      AND bc.book_id = ?
      AND bc.status = 'available'
      ORDER BY bc.id ASC
      LIMIT 1
    `).get(bookId) as BookCopyWithBook | undefined
  }

  countByBookId(bookId: number): number {
    const row = db.prepare(`
      SELECT COUNT(*) AS count
      FROM book_copies
      WHERE book_id = ? AND is_deleted = 0
    `).get(bookId) as { count: number }

    return row.count
  }

  createCopies(bookId: number, quantity: number): void {
    const existingCount = this.countByBookId(bookId)
    const insert = db.prepare(`
      INSERT INTO book_copies (book_id, barcode, status)
      VALUES (?, ?, 'available')
    `)

    for (let index = 1; index <= quantity; index++) {
      insert.run(bookId, generateCopyBarcode(bookId, existingCount + index))
    }
  }

  updateStatus(id: number, status: BookCopyStatus): BookCopyWithBook {
    const result = db.prepare(`
      UPDATE book_copies
      SET status = ?, updated_at = CURRENT_TIMESTAMP, version = version + 1
      WHERE id = ? AND is_deleted = 0
    `).run(status, id)

    if (result.changes === 0) {
      throw new NotFoundError('图书副本')
    }

    const updated = this.findById(id)
    if (!updated) {
      throw new NotFoundError('图书副本')
    }

    return updated
  }

  getCopiesByBookId(bookId: number): BookCopy[] {
    return db.prepare(`
      SELECT *
      FROM book_copies
      WHERE book_id = ? AND is_deleted = 0
      ORDER BY id ASC
    `).all(bookId) as BookCopy[]
  }

  searchSuggestions(keyword: string, limit = 6): BookCopyWithBook[] {
    const query = keyword.trim()
    const pattern = `%${query}%`

    return db.prepare(`
      ${this.baseSelect}
      AND (bc.barcode LIKE ? OR b.title LIKE ? OR b.author LIKE ? OR b.isbn LIKE ?)
      ORDER BY
        CASE WHEN bc.barcode LIKE ? THEN 0 ELSE 1 END,
        CASE
          WHEN bc.status = 'available' AND b.status = 'normal' THEN 0
          WHEN bc.status = 'borrowed' THEN 1
          ELSE 2
        END,
        bc.updated_at DESC,
        bc.id ASC
      LIMIT ?
    `).all(pattern, pattern, pattern, pattern, `${query}%`, limit) as BookCopyWithBook[]
  }
}
