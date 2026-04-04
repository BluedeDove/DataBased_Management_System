import { request, ApiResponse } from './index'

export interface NotificationItem {
  id: number
  recipient_user_id: number
  title: string
  content: string
  type: 'system' | 'broadcast' | 'renewal_request' | 'renewal_result' | 'due_soon'
  level: 'info' | 'success' | 'warning' | 'error'
  is_read: boolean
  metadata?: Record<string, any> | null
  related_record_id?: number | null
  created_at: string
  updated_at: string
}

export interface NotificationCenterData {
  unreadCount: number
  items: NotificationItem[]
}

export const notificationApi = {
  getAll: (limit: number = 20): Promise<ApiResponse<NotificationCenterData>> =>
    request.get('/notifications', { limit }),

  markRead: (id: number): Promise<ApiResponse<null>> =>
    request.put(`/notifications/${id}/read`),

  markAllRead: (): Promise<ApiResponse<null>> =>
    request.put('/notifications/read-all'),

  broadcast: (payload: { title: string; content: string }): Promise<ApiResponse<null>> =>
    request.post('/notifications/broadcast', payload)
}
