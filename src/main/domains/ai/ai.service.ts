import { EmbeddingService } from './embedding.service'
import { VectorRepository } from './vector.repository'
import { BookRepository } from '../book/book.repository'
import { logger } from '../../lib/logger'
import { BusinessError } from '../../lib/errorHandler'
import axios from 'axios'
import { config } from '../../config'

export interface SemanticSearchResult {
  bookId: number
  title: string
  author: string
  description: string
  similarity: number
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export class AIService {
  private embeddingService = new EmbeddingService()
  private vectorRepository = new VectorRepository()
  private bookRepository = new BookRepository()

  constructor() {
    // 初始化向量表
    this.vectorRepository.initTable()
  }

  // 检查AI服务是否可用
  isAvailable(): boolean {
    return this.embeddingService.isAvailable()
  }

  // 为图书创建向量
  async createBookEmbedding(bookId: number): Promise<void> {
    if (!this.isAvailable()) {
      logger.warn('AI服务未配置，跳过向量生成')
      return
    }

    try {
      const book = this.bookRepository.findById(bookId)
      if (!book) {
        throw new BusinessError('图书不存在')
      }

      // 组合图书信息作为文本
      const text = `${book.title} ${book.author} ${book.publisher} ${book.keywords || ''} ${
        book.description || ''
      }`.trim()

      logger.info('为图书生成向量', { bookId, title: book.title })

      // 生成向量
      const vector = await this.embeddingService.generateEmbedding(text)

      // 保存向量
      this.vectorRepository.save(bookId, vector, text)

      logger.info('图书向量保存成功', { bookId })
    } catch (error: any) {
      logger.error('创建图书向量失败', { bookId, error: error.message })
      throw error
    }
  }

  // 批量为图书创建向量
  async batchCreateBookEmbeddings(bookIds: number[]): Promise<void> {
    if (!this.isAvailable()) {
      logger.warn('AI服务未配置，跳过批量向量生成')
      return
    }

    logger.info('批量生成图书向量', { count: bookIds.length })

    for (const bookId of bookIds) {
      try {
        await this.createBookEmbedding(bookId)
        // 添加延迟避免API限流
        await new Promise((resolve) => setTimeout(resolve, 500))
      } catch (error) {
        logger.error('批量生成向量时出错', { bookId, error })
      }
    }

    logger.info('批量向量生成完成')
  }

  // 语义搜索图书
  async semanticSearchBooks(query: string, topK: number = 5): Promise<SemanticSearchResult[]> {
    if (!this.isAvailable()) {
      throw new BusinessError('AI服务未配置，无法使用语义搜索功能')
    }

    try {
      logger.info('执行语义搜索', { query, topK })

      // 生成查询向量
      const queryVector = await this.embeddingService.generateEmbedding(query)

      // 搜索相似向量
      const searchResults = this.vectorRepository.search(queryVector, topK)

      // 获取图书详情
      const results: SemanticSearchResult[] = []
      for (const result of searchResults) {
        const book = this.bookRepository.findById(result.bookId)
        if (book) {
          results.push({
            bookId: book.id,
            title: book.title,
            author: book.author,
            description: book.description || '',
            similarity: result.similarity
          })
        }
      }

      logger.info('语义搜索完成', { resultCount: results.length })
      return results
    } catch (error: any) {
      logger.error('语义搜索失败', error)
      throw new BusinessError(`语义搜索失败: ${error.message}`)
    }
  }

  // AI助手对话
  async chat(
    message: string,
    history: ChatMessage[] = [],
    context?: string
  ): Promise<string> {
    if (!this.isAvailable()) {
      throw new BusinessError('AI服务未配置，无法使用AI助手功能')
    }

    try {
      logger.info('AI助手对话', { messageLength: message.length })

      // 构建系统提示词
      let systemPrompt = `你是一个专业的图书管理员助手。你需要帮助用户管理图书馆、推荐图书、解答问题。
请用友好、专业的语气回答问题。如果用户询问图书推荐，请基于提供的上下文信息进行推荐。`

      if (context) {
        systemPrompt += `\n\n以下是图书馆的相关图书信息:\n${context}`
      }

      // 构建消息列表
      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: message }
      ]

      // 调用OpenAI API
      const response = await axios.post(
        `${config.ai.openai.baseURL}/chat/completions`,
        {
          model: config.ai.openai.chatModel,
          messages: messages,
          temperature: 0.7,
          max_tokens: 1000
        },
        {
          headers: {
            Authorization: `Bearer ${config.ai.openai.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      )

      const reply = response.data.choices[0].message.content
      logger.info('AI助手回复生成成功')

      return reply
    } catch (error: any) {
      logger.error('AI助手对话失败', error)
      throw new BusinessError(`AI助手对话失败: ${error.message}`)
    }
  }

  // 智能图书推荐（RAG）
  async recommendBooks(userQuery: string, limit: number = 5): Promise<string> {
    if (!this.isAvailable()) {
      throw new BusinessError('AI服务未配置')
    }

    try {
      logger.info('执行智能图书推荐', { query: userQuery, limit })

      // 1. 语义搜索相关图书
      const searchResults = await this.semanticSearchBooks(userQuery, limit)

      // 2. 构建上下文
      const context = searchResults
        .map(
          (book, index) =>
            `${index + 1}. 《${book.title}》 - ${book.author}\n   简介: ${
              book.description || '暂无'
            }\n   相关度: ${(book.similarity * 100).toFixed(1)}%`
        )
        .join('\n\n')

      // 3. 生成推荐
      const prompt = `基于用户的需求："${userQuery}"，我为您找到了以下相关图书。请为用户提供详细的推荐说明，包括推荐理由和阅读建议。`

      const recommendation = await this.chat(prompt, [], context)

      logger.info('智能推荐生成成功')
      return recommendation
    } catch (error: any) {
      logger.error('智能推荐失败', error)
      throw error
    }
  }

  // 获取向量数据库统计
  getVectorStatistics(): { totalVectors: number; coverageRate: number } {
    const vectorCount = this.vectorRepository.count()
    const totalBooks = this.bookRepository.findAll().length

    return {
      totalVectors: vectorCount,
      coverageRate: totalBooks > 0 ? (vectorCount / totalBooks) * 100 : 0
    }
  }
}
