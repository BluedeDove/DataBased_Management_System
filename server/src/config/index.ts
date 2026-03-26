import dotenv from 'dotenv'

// 加载环境变量
dotenv.config()

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
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },

  database: {
    path: process.env.DATABASE_PATH || './data/library.db'
  },

  cors: {
    origins: (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:5173').split(',')
  },

  ai: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
      chatModel: process.env.CHAT_MODEL || 'gpt-4-turbo-preview'
    },
    enabled: !!process.env.OPENAI_API_KEY
  },

  business: {
    maxRenewalCount: 2,
    overdueFinePerDay: 0.1,
    maxOverdueDays: 90
  }
}
