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
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  })
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
