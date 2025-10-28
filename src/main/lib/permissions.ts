import { IpcMainInvokeEvent } from 'electron'
import { AuthService } from '../domains/auth/auth.service'
import { User } from '../domains/auth/user.repository'

const authService = new AuthService()

// Store for current session tokens (event.sender.id -> token)
const sessionTokens = new Map<number, string>()

export function setSessionToken(senderId: number, token: string) {
  sessionTokens.set(senderId, token)
}

export function getSessionToken(senderId: number): string | undefined {
  return sessionTokens.get(senderId)
}

export function clearSessionToken(senderId: number) {
  sessionTokens.delete(senderId)
}

export function getCurrentUser(event: IpcMainInvokeEvent): User | null {
  const token = getSessionToken(event.sender.id)
  if (!token) {
    return null
  }
  return authService.validateToken(token)
}

export class PermissionError extends Error {
  constructor(message: string = '权限不足') {
    super(message)
    this.name = 'PermissionError'
  }
}

/**
 * Permission checker for IPC handlers
 * Usage:
 * ipcMain.handle('book:create', requirePermission('books:write', async (event, data) => {
 *   // handler code
 * }))
 */
export function requirePermission(permission: string, handler: (event: IpcMainInvokeEvent, ...args: any[]) => Promise<any>) {
  return async (event: IpcMainInvokeEvent, ...args: any[]) => {
    const user = getCurrentUser(event)

    if (!user) {
      throw new PermissionError('未登录')
    }

    const hasPermission = authService.hasPermission(user, permission)

    if (!hasPermission) {
      throw new PermissionError(`需要权限: ${permission}`)
    }

    return handler(event, ...args)
  }
}

/**
 * Require authentication (but no specific permission)
 */
export function requireAuth(handler: (event: IpcMainInvokeEvent, ...args: any[]) => Promise<any>) {
  return async (event: IpcMainInvokeEvent, ...args: any[]) => {
    const user = getCurrentUser(event)

    if (!user) {
      throw new PermissionError('未登录')
    }

    return handler(event, ...args)
  }
}

/**
 * Check if user has permission (utility function)
 */
export function checkPermission(user: User, permission: string): boolean {
  return authService.hasPermission(user, permission)
}
