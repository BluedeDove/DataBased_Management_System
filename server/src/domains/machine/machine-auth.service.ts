import * as bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { ReaderRepository, ReaderWithCategory } from '../reader/reader.repository'
import { BorrowingService } from '../borrowing/borrowing.service'
import { BusinessError, ValidationError } from '../../lib/errorHandler'
import { logger } from '../../lib/logger'
import type { User } from '../../middleware/auth.middleware'

const MAX_FAILED_ATTEMPTS = 5
const LOCK_WINDOW_MS = 10 * 60 * 1000
const VERIFICATION_TOKEN_TTL_MS = 2 * 60 * 1000

interface FailedAttemptState {
  count: number
  lockedUntil?: number
}

interface VerificationSession {
  readerId: number
  readerNo: string
  actorUserId: number
  expiresAt: number
}

const failedAttempts = new Map<string, FailedAttemptState>()
const verificationSessions = new Map<string, VerificationSession>()

export interface MachineReaderSummary {
  id: number
  reader_no: string
  display_name: string
  category_name: string
  current_borrowing_count: number
  max_borrow_count: number
  has_overdue_books: boolean
  status: string
  expiry_date?: string
  is_verified: boolean
  borrow_pin_configured: boolean
  verification_expires_at?: string
}

export interface MachineReaderVerificationResult {
  verification_token: string
  expires_at: string
  reader: MachineReaderSummary
}

export class MachineAuthService {
  private readerRepository = new ReaderRepository()
  private borrowingService = new BorrowingService()

  private cleanupState() {
    const now = Date.now()

    for (const [key, state] of failedAttempts.entries()) {
      if (state.lockedUntil && state.lockedUntil <= now) {
        failedAttempts.delete(key)
      }
    }

    for (const [token, session] of verificationSessions.entries()) {
      if (session.expiresAt <= now) {
        verificationSessions.delete(token)
      }
    }
  }

  private getAttemptKey(actorUserId: number, readerId: number) {
    return `${actorUserId}:${readerId}`
  }

  private maskName(name: string) {
    const trimmed = name.trim()
    if (trimmed.length <= 1) return '*'
    if (trimmed.length === 2) return `${trimmed[0]}*`
    return `${trimmed[0]}${'*'.repeat(trimmed.length - 2)}${trimmed[trimmed.length - 1]}`
  }

  private getReader(readerNo: string): ReaderWithCategory {
    const reader = this.readerRepository.findByReaderNo(readerNo.trim())
    if (!reader) {
      throw new ValidationError('璇昏€呬笉瀛樺湪')
    }
    return reader
  }

  private buildReaderSummary(
    reader: ReaderWithCategory,
    options?: { verified?: boolean; expiresAt?: number }
  ): MachineReaderSummary {
    const verified = options?.verified ?? false

    return {
      id: reader.id,
      reader_no: reader.reader_no,
      display_name: verified ? reader.name : this.maskName(reader.name),
      category_name: reader.category_name,
      current_borrowing_count: this.readerRepository.getBorrowingCount(reader.id),
      max_borrow_count: reader.max_borrow_count,
      has_overdue_books: this.readerRepository.hasOverdueBooks(reader.id),
      status: reader.status,
      expiry_date: reader.expiry_date,
      is_verified: verified,
      borrow_pin_configured: !!reader.borrow_pin_hash,
      verification_expires_at: options?.expiresAt ? new Date(options.expiresAt).toISOString() : undefined
    }
  }

  getReaderSummaryByReaderNo(readerNo: string): MachineReaderSummary {
    const reader = this.getReader(readerNo)
    return this.buildReaderSummary(reader)
  }

  async verifyReaderByBorrowPin(
    readerNo: string,
    borrowPin: string,
    actor: User
  ): Promise<MachineReaderVerificationResult> {
    this.cleanupState()

    const reader = this.getReader(readerNo)

    if (!reader.borrow_pin_hash) {
      throw new BusinessError('璇ヨ鑰呭皻鏈缃€熼槄 PIN锛岃鍏堝湪绾夸笂璐﹀彿璁剧疆鎴栬仈绯婚鍛?')
    }

    const attemptKey = this.getAttemptKey(actor.id, reader.id)
    const existingAttempt = failedAttempts.get(attemptKey)
    const now = Date.now()

    if (existingAttempt?.lockedUntil && existingAttempt.lockedUntil > now) {
      const retryAfter = Math.ceil((existingAttempt.lockedUntil - now) / 1000)
      throw new BusinessError('鍊熼槄 PIN 杩炵画閿欒杩囧锛岃绋嶅悗鍐嶈瘯', { retryAfter })
    }

    const matched = await bcrypt.compare(borrowPin, reader.borrow_pin_hash)
    if (!matched) {
      const nextCount = (existingAttempt?.count || 0) + 1
      const remainingAttempts = Math.max(0, MAX_FAILED_ATTEMPTS - nextCount)
      const shouldLock = nextCount >= MAX_FAILED_ATTEMPTS

      failedAttempts.set(attemptKey, {
        count: nextCount,
        lockedUntil: shouldLock ? now + LOCK_WINDOW_MS : undefined
      })

      logger.warn('鏈哄櫒缁堢鍊熼槄 PIN 鏍搁獙澶辫触', {
        actor: actor.username,
        readerNo: reader.reader_no,
        remainingAttempts
      })

      if (shouldLock) {
        throw new BusinessError('鍊熼槄 PIN 杩炵画閿欒 5 娆★紝宸叉殏鏃堕攣瀹?10 鍒嗛挓', {
          remainingAttempts,
          retryAfter: Math.ceil(LOCK_WINDOW_MS / 1000)
        })
      }

      throw new BusinessError(`鍊熼槄 PIN 閿欒锛岃繕鍓? ${remainingAttempts} 娆℃満浼?`, {
        remainingAttempts
      })
    }

    failedAttempts.delete(attemptKey)

    const verificationToken = typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : crypto.randomBytes(24).toString('hex')
    const expiresAt = now + VERIFICATION_TOKEN_TTL_MS

    verificationSessions.set(verificationToken, {
      readerId: reader.id,
      readerNo: reader.reader_no,
      actorUserId: actor.id,
      expiresAt
    })

    logger.info('鏈哄櫒缁堢璇昏€呮牳楠屾垚鍔?', {
      actor: actor.username,
      readerNo: reader.reader_no,
      expiresAt: new Date(expiresAt).toISOString()
    })

    return {
      verification_token: verificationToken,
      expires_at: new Date(expiresAt).toISOString(),
      reader: this.buildReaderSummary(reader, { verified: true, expiresAt })
    }
  }

  private requireVerification(readerNo: string, verificationToken: string, actor: User): ReaderWithCategory {
    this.cleanupState()

    const session = verificationSessions.get(verificationToken)
    if (!session || session.actorUserId !== actor.id || session.readerNo !== readerNo.trim()) {
      throw new BusinessError('璇昏€呮牳楠屽凡澶辨晥锛岃閲嶆柊杈撳叆鍊熼槄 PIN')
    }

    if (session.expiresAt <= Date.now()) {
      verificationSessions.delete(verificationToken)
      throw new BusinessError('璇昏€呮牳楠屽凡杩囨湡锛岃閲嶆柊杈撳叆鍊熼槄 PIN')
    }

    const reader = this.getReader(readerNo)
    if (reader.id !== session.readerId) {
      throw new BusinessError('璇昏€呮牳楠岀姸鎬佷笌褰撳墠璇昏€呬笉鍖归厤锛岃閲嶆柊鏍搁獙')
    }

    return reader
  }

  async borrowByMachine(
    readerNo: string,
    barcode: string,
    verificationToken: string,
    actor: User
  ) {
    const reader = this.requireVerification(readerNo, verificationToken, actor)

    logger.info('鏈哄櫒缁堢鎻愪氦鍊熶功璇锋眰', {
      actor: actor.username,
      readerNo: reader.reader_no,
      barcode
    })

    return this.borrowingService.borrowCopyByBarcode(reader.reader_no, barcode)
  }

  async returnByMachine(barcode: string, actor: User) {
    logger.info('鏈哄櫒缁堢鎻愪氦杩樹功璇锋眰', {
      actor: actor.username,
      barcode
    })

    return this.borrowingService.returnCopyByBarcode(barcode)
  }

  getCopySummaryByBarcode(barcode: string) {
    const result = this.borrowingService.getCopySummaryByBarcode(barcode)

    return {
      copy: result.copy,
      active_borrowing: result.active_borrowing
        ? { due_date: result.active_borrowing.due_date }
        : null,
      suggested_action: result.suggested_action,
      action_hint: result.action_hint
    }
  }

  getCopySuggestions(keyword: string) {
    return this.borrowingService.getCopySuggestions(keyword).map(copy => ({
      id: copy.id,
      barcode: copy.barcode,
      title: copy.title,
      author: copy.author,
      isbn: copy.isbn,
      status: copy.status,
      book_status: copy.book_status,
      suggested_action: copy.suggested_action,
      action_hint: copy.action_hint
    }))
  }
}
