import { db } from '../../database'
import type { User } from '../../middleware/auth.middleware'

export type NotificationType = 'system' | 'broadcast' | 'renewal_request' | 'renewal_result' | 'due_soon'
export type NotificationLevel = 'info' | 'success' | 'warning' | 'error'

export interface NotificationItem {
  id: number
  recipient_user_id: number
  title: string
  content: string
  type: NotificationType
  level: NotificationLevel
  is_read: boolean
  dedupe_key?: string | null
  metadata?: Record<string, any> | null
  created_by?: number | null
  related_record_id?: number | null
  created_at: string
  updated_at: string
}

interface CreateNotificationInput {
  title: string
  content: string
  type: NotificationType
  level?: NotificationLevel
  dedupeKey?: string
  metadata?: Record<string, any> | null
  createdBy?: number | null
  relatedRecordId?: number | null
}

export class NotificationService {
  private insertStmt: any = null

  private getInsertStmt() {
    if (!this.insertStmt) {
      this.insertStmt = db.prepare(`
        INSERT OR IGNORE INTO notifications (
          recipient_user_id, title, content, type, level, is_read,
          dedupe_key, metadata, created_by, related_record_id
        ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
      `)
    }

    return this.insertStmt
  }

  private parseRow(row: any): NotificationItem {
    let metadata: Record<string, any> | null = null
    if (row.metadata) {
      try {
        metadata = JSON.parse(row.metadata)
      } catch {
        metadata = null
      }
    }

    return {
      ...row,
      is_read: Boolean(row.is_read),
      metadata
    }
  }

  private getActiveUserIds(): number[] {
    return (db.prepare(`SELECT id FROM users WHERE is_deleted = 0`).all() as Array<{ id: number }>).map(row => row.id)
  }

  private getActiveUserIdsByRoles(roles: string[]): number[] {
    if (!roles.length) return []
    const placeholders = roles.map(() => '?').join(', ')
    return (
      db.prepare(`SELECT id FROM users WHERE is_deleted = 0 AND role IN (${placeholders})`).all(...roles) as Array<{ id: number }>
    ).map(row => row.id)
  }

  private createForUsers(userIds: number[], input: CreateNotificationInput) {
    if (!userIds.length) return
    const insertStmt = this.getInsertStmt()

    const tx = db.transaction((ids: number[]) => {
      for (const userId of ids) {
        const dedupeKey = input.dedupeKey ? `${input.dedupeKey}:${userId}` : null
        insertStmt.run(
          userId,
          input.title,
          input.content,
          input.type,
          input.level || 'info',
          dedupeKey,
          input.metadata ? JSON.stringify(input.metadata) : null,
          input.createdBy ?? null,
          input.relatedRecordId ?? null
        )
      }
    })

    tx(userIds)
  }

  createForUser(userId: number, input: CreateNotificationInput) {
    this.createForUsers([userId], input)
  }

  notifyRenewalRequest(payload: {
    requestId: number
    borrowingRecordId: number
    requesterName: string
    bookTitle: string
    dueDate: string
    note?: string | null
  }) {
    const staffIds = this.getActiveUserIdsByRoles(['admin', 'librarian'])
    if (!staffIds.length) return

    const content = payload.note
      ? `${payload.requesterName} 申请续借《${payload.bookTitle}》，当前应还日期 ${payload.dueDate}。备注：${payload.note}`
      : `${payload.requesterName} 申请续借《${payload.bookTitle}》，当前应还日期 ${payload.dueDate}。`

    this.createForUsers(staffIds, {
      title: '新的续借申请',
      content,
      type: 'renewal_request',
      level: 'warning',
      dedupeKey: `renewal-request:${payload.requestId}`,
      metadata: { requestId: payload.requestId },
      relatedRecordId: payload.borrowingRecordId
    })
  }

  notifyRenewalResult(payload: {
    userId: number
    borrowingRecordId: number
    approved: boolean
    bookTitle: string
    reviewerName: string
    dueDate?: string
    note?: string | null
  }) {
    const title = payload.approved ? '续借申请已通过' : '续借申请未通过'
    const content = payload.approved
      ? `${payload.reviewerName} 已通过《${payload.bookTitle}》的续借申请，新应还日期为 ${payload.dueDate}。${payload.note ? ` 备注：${payload.note}` : ''}`
      : `${payload.reviewerName} 未通过《${payload.bookTitle}》的续借申请。${payload.note ? ` 原因：${payload.note}` : ''}`

    this.createForUser(payload.userId, {
      title,
      content,
      type: 'renewal_result',
      level: payload.approved ? 'success' : 'error',
      relatedRecordId: payload.borrowingRecordId,
      metadata: {
        approved: payload.approved,
        dueDate: payload.dueDate || null
      }
    })
  }

  sendBroadcast(createdBy: number, title: string, content: string) {
    const userIds = this.getActiveUserIds()
    this.createForUsers(userIds, {
      title,
      content,
      type: 'broadcast',
      level: 'info',
      createdBy
    })
  }

  private ensureDueSoonNotifications(user: User) {
    if (!user.reader_id) return

    const dueSoonRecords = db.prepare(`
      SELECT
        br.id,
        br.due_date,
        b.title AS book_title
      FROM borrowing_records br
      JOIN books b ON b.id = br.book_id
      WHERE br.reader_id = ?
        AND br.status = 'borrowed'
        AND br.is_deleted = 0
        AND b.is_deleted = 0
        AND br.due_date >= date('now')
        AND br.due_date <= date('now', '+3 days')
    `).all(user.reader_id) as Array<{ id: number; due_date: string; book_title: string }>

    for (const record of dueSoonRecords) {
      const dueDate = new Date(record.due_date)
      const today = new Date()
      const diffDays = Math.max(0, Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))

      this.createForUser(user.id, {
        title: diffDays === 0 ? '图书今日到期提醒' : '图书临近到期提醒',
        content: `《${record.book_title}》将在 ${record.due_date} 到期${diffDays > 0 ? `（剩余 ${diffDays} 天）` : ''}，如需继续借阅请尽快提交续借申请。`,
        type: 'due_soon',
        level: diffDays <= 1 ? 'warning' : 'info',
        dedupeKey: `due-soon:${record.id}:${record.due_date}`,
        relatedRecordId: record.id,
        metadata: { dueDate: record.due_date }
      })
    }
  }

  getUserNotifications(user: User, limit: number = 20) {
    this.ensureDueSoonNotifications(user)

    const rows = db.prepare(`
      SELECT *
      FROM notifications
      WHERE recipient_user_id = ?
      ORDER BY is_read ASC, datetime(created_at) DESC
      LIMIT ?
    `).all(user.id, limit)

    const unreadResult = db.prepare(`
      SELECT COUNT(*) AS count
      FROM notifications
      WHERE recipient_user_id = ? AND is_read = 0
    `).get(user.id) as { count: number }

    return {
      unreadCount: unreadResult.count,
      items: rows.map(row => this.parseRow(row))
    }
  }

  markRead(userId: number, notificationId: number) {
    db.prepare(`
      UPDATE notifications
      SET is_read = 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND recipient_user_id = ?
    `).run(notificationId, userId)
  }

  markAllRead(userId: number) {
    db.prepare(`
      UPDATE notifications
      SET is_read = 1, updated_at = CURRENT_TIMESTAMP
      WHERE recipient_user_id = ? AND is_read = 0
    `).run(userId)
  }
}

export const notificationService = new NotificationService()
