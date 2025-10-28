import axios from 'axios'
import { config } from '../../config'
import { logger } from '../../lib/logger'

export interface EmbeddingResult {
  embedding: number[]
  model: string
  usage: {
    prompt_tokens: number
    total_tokens: number
  }
}

export class EmbeddingService {
  private apiKey: string
  private baseURL: string
  private model: string

  constructor() {
    this.apiKey = config.ai.openai.apiKey
    this.baseURL = config.ai.openai.baseURL
    this.model = config.ai.openai.embeddingModel
  }

  isAvailable(): boolean {
    return config.ai.enabled && !!this.apiKey
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.isAvailable()) {
      throw new Error('AI服务未配置，请在.env文件中设置OPENAI_API_KEY')
    }

    try {
      logger.info('生成文本向量', { textLength: text.length })

      const response = await axios.post(
        `${this.baseURL}/embeddings`,
        {
          input: text,
          model: this.model
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      )

      const embedding = response.data.data[0].embedding
      logger.info('向量生成成功', { dimension: embedding.length })

      return embedding
    } catch (error: any) {
      logger.error('向量生成失败', error)
      throw new Error(`生成向量失败: ${error.message}`)
    }
  }

  async generateMultipleEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.isAvailable()) {
      throw new Error('AI服务未配置')
    }

    try {
      logger.info('批量生成向量', { count: texts.length })

      const response = await axios.post(
        `${this.baseURL}/embeddings`,
        {
          input: texts,
          model: this.model
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      )

      const embeddings = response.data.data.map((item: any) => item.embedding)
      logger.info('批量向量生成成功')

      return embeddings
    } catch (error: any) {
      logger.error('批量向量生成失败', error)
      throw new Error(`批量生成向量失败: ${error.message}`)
    }
  }

  // 计算余弦相似度
  cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('向量维度不匹配')
    }

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i]
      normA += vecA[i] * vecA[i]
      normB += vecB[i] * vecB[i]
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  }
}
