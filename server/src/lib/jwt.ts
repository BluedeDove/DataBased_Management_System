import jwt from 'jsonwebtoken'
import { config } from '../config'

export interface JwtPayload {
  userId: number
  username: string
  role: string
  iat?: number
  exp?: number
}

/**
 * 生成 JWT Token
 */
export function generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn } as any)
}

/**
 * 生成刷新 Token
 */
export function generateRefreshToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.refreshExpiresIn } as any)
}

/**
 * 验证 JWT Token
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload
    return decoded
  } catch (error) {
    return null
  }
}

/**
 * 解码 JWT Token (不验证签名)
 */
export function decodeToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.decode(token) as JwtPayload
    return decoded
  } catch (error) {
    return null
  }
}

/**
 * 检查Token是否需要刷新
 * @param token JWT Token
 * @param threshold 刷新阈值（剩余有效期比例，默认1/3）
 * @returns 是否需要刷新
 */
export function shouldRefreshToken(token: string, threshold: number = 1 / 3): boolean {
  const decoded = decodeToken(token)
  if (!decoded || !decoded.exp) return false

  const now = Math.floor(Date.now() / 1000)
  const remaining = decoded.exp - now
  const total = decoded.exp - (decoded.iat || now)

  // 如果剩余时间小于总时长的阈值，则需要刷新
  return remaining > 0 && remaining < total * threshold
}

/**
 * 获取Token剩余有效时间（秒）
 */
export function getTokenRemainingTime(token: string): number {
  const decoded = decodeToken(token)
  if (!decoded || !decoded.exp) return 0

  const now = Math.floor(Date.now() / 1000)
  return Math.max(0, decoded.exp - now)
}

/**
 * 从Token中提取用户信息（不验证）
 */
export function extractUserInfo(token: string): Omit<JwtPayload, 'iat' | 'exp'> | null {
  const decoded = decodeToken(token)
  if (!decoded) return null

  return {
    userId: decoded.userId,
    username: decoded.username,
    role: decoded.role
  }
}
