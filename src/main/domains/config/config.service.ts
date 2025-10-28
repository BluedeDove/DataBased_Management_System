import { ConfigRepository } from './config.repository'
import { logger } from '../../lib/logger'
import axios from 'axios'

export interface AISettings {
  baseURL: string
  apiKey: string
  embeddingModel: string
  chatModel: string
}

export class ConfigService {
  private configRepository = new ConfigRepository()

  getAISettings(): AISettings {
    const settings = this.configRepository.getAllByCategory('ai')
    return {
      baseURL: settings.find(s => s.setting_key === 'ai.openai.baseURL')?.setting_value || 'https://api.openai.com/v1',
      apiKey: settings.find(s => s.setting_key === 'ai.openai.apiKey')?.setting_value || '',
      embeddingModel: settings.find(s => s.setting_key === 'ai.openai.embeddingModel')?.setting_value || 'text-embedding-3-small',
      chatModel: settings.find(s => s.setting_key === 'ai.openai.chatModel')?.setting_value || 'gpt-4-turbo-preview'
    }
  }

  updateAISettings(settings: AISettings): void {
    logger.info('更新AI配置')
    this.configRepository.updateSetting('ai.openai.baseURL', settings.baseURL)
    this.configRepository.updateSetting('ai.openai.apiKey', settings.apiKey)
    this.configRepository.updateSetting('ai.openai.embeddingModel', settings.embeddingModel)
    this.configRepository.updateSetting('ai.openai.chatModel', settings.chatModel)
  }

  async testAIConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const settings = this.getAISettings()

      if (!settings.apiKey) {
        return { success: false, message: 'API Key未配置' }
      }

      // Test embedding API
      const response = await axios.post(
        `${settings.baseURL}/embeddings`,
        {
          input: 'test',
          model: settings.embeddingModel
        },
        {
          headers: {
            'Authorization': `Bearer ${settings.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      )

      if (response.status === 200) {
        logger.info('AI连接测试成功')
        return { success: true, message: 'AI服务连接成功' }
      }

      return { success: false, message: '连接失败' }
    } catch (error: any) {
      logger.error('AI连接测试失败', error)
      return { success: false, message: error.message }
    }
  }
}
