// 应用配置
export const config = {
  app: {
    name: '智能图书管理系统',
    version: '1.0.0'
  },

  database: {
    name: 'library.db'
  },

  // AI 配置（从环境变量读取）
  ai: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
      chatModel: process.env.CHAT_MODEL || 'gpt-4-turbo-preview'
    },
    enabled: !!process.env.OPENAI_API_KEY
  },

  // 业务规则配置
  business: {
    // 最大续借次数
    maxRenewalCount: 2,
    // 逾期罚款（元/天）
    overdueFinePerDay: 0.1,
    // 最大逾期天数（超过后禁止借书）
    maxOverdueDays: 90
  }
}
