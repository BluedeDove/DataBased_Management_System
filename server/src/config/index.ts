import dotenv from 'dotenv'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

// 加载环境变量
const loadEnvFiles = () => {
  const appRoot = process.env.APP_ROOT || process.cwd()
  const candidates = [
    path.join(appRoot, '.env'),
    path.join(appRoot, 'server', '.env'),
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), 'server', '.env')
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      dotenv.config({ path: candidate })
      return
    }
  }

  dotenv.config()
}

loadEnvFiles()

const DEFAULT_JWT_SECRET = 'your-super-secret-jwt-key-change-in-production'

/**
 * 生成随机JWT Secret
 */
const generateSecret = (): string => {
  return crypto.randomBytes(64).toString('hex')
}

/**
 * 获取并验证JWT Secret
 */
const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET

  if (!secret || secret === DEFAULT_JWT_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ 错误: 生产环境必须设置自定义JWT_SECRET环境变量')
      process.exit(1)
    }
    console.warn('⚠️  警告: 使用默认JWT密钥，请在生产环境中设置JWT_SECRET环境变量')
    console.warn('⚠️  建议使用以下随机生成的密钥:')
    console.warn(`   JWT_SECRET=${generateSecret()}`)
    return DEFAULT_JWT_SECRET
  }

  return secret
}

export const config = {
  app: {
    name: '智能图书管理系统',
    version: '1.0.0'
  },

  server: {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development'
  },

  jwt: {
    secret: getJwtSecret(),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  },

  database: {
    path: process.env.DATABASE_PATH || './data/library.db'
  },

  cors: {
    origins: (process.env.CORS_ORIGIN || '*').split(',')
  },

  ai: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.siliconflow.cn/v1',
      embeddingModel: process.env.EMBEDDING_MODEL || 'Qwen/Qwen3-Embedding-8B',
      chatModel: process.env.CHAT_MODEL || 'Pro/MiniMaxAI/MiniMax-M2.5'
    },
    enabled: !!process.env.OPENAI_API_KEY
  },

  business: {
    maxRenewalCount: 2,
    overdueFinePerDay: 0.1,
    maxOverdueDays: 90
  }
}
