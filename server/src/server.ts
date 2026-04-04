import 'dotenv/config'
import { createApp } from './app'
import { setupDatabase, db } from './database'
import { config } from './config'
import { getAIConfig } from './domains/ai/ai.service'
import { autoSeedIfEmpty } from './lib/autoSeed'

// 初始化数据库
setupDatabase()

// 自动填充种子数据（生产环境空库时触发）
autoSeedIfEmpty(db).catch(err => console.error('自动种子数据失败:', err))

// 检查 AI 服务状态
const aiCfg = getAIConfig()
if (aiCfg.apiKey) {
  console.log(`🤖 AI服务已配置，模型: ${aiCfg.chatModel}`)
} else {
  console.log('⚠️  AI服务未配置：未设置 API Key')
}

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
