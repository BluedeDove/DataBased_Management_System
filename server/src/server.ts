import 'dotenv/config'
import { createApp } from './app'
import { setupDatabase } from './database'
import { config } from './config'
import { AIService } from './domains/ai/ai.service'

// 初始化数据库
setupDatabase()

// 初始化 AI 服务
const aiService = new AIService()
aiService.init()

// 创建 Express 应用
const app = createApp()

// 启动服务器
const PORT = config.server.port

app.listen(PORT, () => {
  console.log('='.repeat(50))
  console.log(`🚀 服务器已启动`)
  console.log(`📡 监听端口: ${PORT}`)
  console.log(`🌐 访问地址: http://localhost:${PORT}`)
  console.log(`📚 API 文档: http://localhost:${PORT}/api/v1`)
  console.log(`🏥 健康检查: http://localhost:${PORT}/health`)
  console.log('='.repeat(50))
})

// 导出 app 供测试使用
export { app }
