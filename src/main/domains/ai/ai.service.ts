import { EmbeddingService } from './embedding.service'
import { VectorRepository } from './vector.repository'
import { BookRepository } from '../book/book.repository'
import { ConfigService } from '../config/config.service'
import { ConversationRepository, ConversationWithMessages } from './conversation.repository'
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
  private embeddingService: EmbeddingService
  private vectorRepository: VectorRepository
  private bookRepository: BookRepository
  private configService: ConfigService
  private conversationRepository: ConversationRepository
  private initialized = false

  constructor() {
    // 延迟初始化，避免在 app.whenReady() 之前访问数据库
    this.embeddingService = new EmbeddingService()
    this.vectorRepository = new VectorRepository()
    this.bookRepository = new BookRepository()
    this.configService = new ConfigService()
    this.conversationRepository = new ConversationRepository()
  }

  /**
   * 初始化 AI 服务（在 app.whenReady() 之后调用）
   */
  init() {
    if (!this.initialized) {
      this.vectorRepository.initTable()
      this.initialized = true
    }
  }

  // 获取当前AI配置（优先使用数据库配置）
  private getAIConfig() {
    try {
      const dbConfig = this.configService.getAISettings()
      if (dbConfig.apiKey) {
        return {
          apiKey: dbConfig.apiKey,
          baseURL: dbConfig.baseURL,
          chatModel: dbConfig.chatModel,
          embeddingModel: dbConfig.embeddingModel
        }
      }
    } catch (error) {
      logger.warn('读取数据库AI配置失败，使用环境变量配置', error)
    }

    // Fallback to environment variables
    return {
      apiKey: config.ai.openai.apiKey,
      baseURL: config.ai.openai.baseURL,
      chatModel: config.ai.openai.chatModel,
      embeddingModel: config.ai.openai.embeddingModel
    }
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

  // AI助手对话（非流式）
  async chat(
    message: string,
    history: ChatMessage[] = [],
    context?: string
  ): Promise<string> {
    if (!this.isAvailable()) {
      throw new BusinessError('AI服务未配置，无法使用AI助手功能')
    }

    try {
      logger.info('AI助手对话（非流式）', { messageLength: message.length })

      // 获取当前配置（优先使用数据库配置）
      const aiConfig = this.getAIConfig()

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
        `${aiConfig.baseURL}/chat/completions`,
        {
          model: aiConfig.chatModel,
          messages: messages,
          temperature: 0.7,
          max_tokens: 1000
        },
        {
          headers: {
            Authorization: `Bearer ${aiConfig.apiKey}`,
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

  // AI助手对话（流式传输 / Agent模式）
  async chatStream(
    message: string,
    history: ChatMessage[] = [],
    context: string | undefined,
    onChunk: (chunk: string) => void,
    onError: (error: Error) => void,
    onComplete: () => void,
    abortSignal?: AbortSignal // 新增：取消信号
  ): Promise<(() => void) | undefined> {
    if (!this.isAvailable()) {
      throw new BusinessError('AI服务未配置，无法使用AI助手功能')
    }

    // 创建AbortController用于取消请求
    const abortController = new AbortController()
    const signal = abortController.signal

    // 如果传入了外部abortSignal，当它被触发时也取消当前请求
    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        logger.info('[AI] 收到外部取消信号，正在取消请求...')
        abortController.abort()
      })
    }

    try {
      logger.info('========== [AI] 开始流式对话 ==========')
      logger.info('[AI] 用户消息:', message.substring(0, 100))
      logger.info('[AI] 历史消息数量:', history.length)

      // 简单的意图识别：如果包含搜索关键词，自动触发语义搜索（模拟Agent工具调用）
      const searchKeywords = ['找', '书', '推荐', '查询', 'book', 'recommend', 'search', 'find', '关于', '有', '帮']
      const shouldSearch = searchKeywords.some(kw => message.toLowerCase().includes(kw))

      if (shouldSearch) {
        logger.info('[AI] 检测到搜索意图，正在调用搜索工具...')
        try {
          onChunk('> 🤖 **正在调用工具检索图书馆藏...**\n\n')

          const searchResults = await this.semanticSearchBooks(message, 5)

          if (searchResults.length > 0) {
            onChunk(`> ✅ **检索完成**，找到 ${searchResults.length} 本相关图书，正在生成回答...\n\n---\n\n`)

            const searchContext = searchResults
              .map((book, index) => `${index + 1}. 《${book.title}》 - ${book.author} (简介: ${book.description})`)
              .join('\n')

            // 追加到 Context
            const toolOutput = `\n\n[工具调用结果 - 检索到的相关图书]:\n${searchContext}\n请基于以上图书信息回答用户问题。`
            context = (context || '') + toolOutput
            logger.info('[AI] 搜索完成，已注入上下文')
          } else {
            onChunk(`> ⚠️ **检索完成**，但未找到高度相关的图书，将基于通用知识回答。\n\n---\n\n`)
          }
        } catch (e: any) {
          onChunk(`> ❌ **工具调用失败**：${e.message}，尝试直接回答...\n\n---\n\n`)
          logger.warn('[AI] 自动搜索失败，继续普通对话', e)
        }
      }

      // 获取当前配置（优先使用数据库配置）
      const aiConfig = this.getAIConfig()
      logger.info('[AI] 使用模型:', aiConfig.chatModel)

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

      logger.info('[AI] 准备调用OpenAI API（流式）...')

      // 调用OpenAI API (streaming)
      const response = await axios.post(
        `${aiConfig.baseURL}/chat/completions`,
        {
          model: aiConfig.chatModel,
          messages: messages,
          temperature: 0.7,
          max_tokens: 1000,
          stream: true // 启用流式传输
        },
        {
          headers: {
            Authorization: `Bearer ${aiConfig.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000,
          responseType: 'stream', // 设置响应类型为流
          signal: abortController.signal // 传递取消信号
        }
      )

      logger.info('[AI] OpenAI API连接成功，开始接收流式数据...')

      let chunkCount = 0
      let isCompleted = false

      // 处理流式响应
      response.data.on('data', (chunk: Buffer) => {
        if (isCompleted) return

        const lines = chunk.toString().split('\n').filter(line => line.trim() !== '')

        for (const line of lines) {
          if (line.includes('[DONE]')) {
            continue
          }

          // 移除 "data: " 前缀
          const message = line.replace(/^data: /, '')
          if (message === '[DONE]') {
            continue
          }

          try {
            const parsed = JSON.parse(message)
            const content = parsed.choices[0]?.delta?.content

            if (content) {
              chunkCount++
              // 移除每个chunk的日志，避免刷屏
              // console.log(`[AI] 收到chunk #${chunkCount}:`, content.substring(0, 20) + (content.length > 20 ? '...' : ''))
              onChunk(content)
            }
          } catch (error) {
            // 忽略无法解析的行
          }
        }
      })

      response.data.on('end', () => {
        if (isCompleted) return
        isCompleted = true
        logger.info(`[AI] 流式传输完成，共${chunkCount}个chunk`)
        logger.info('========== [AI] 流式对话结束 ==========\n')
        onComplete()
      })

      response.data.on('error', (error: Error) => {
        if (isCompleted) return
        isCompleted = true
        if (error.name === 'AbortError' || signal.aborted) {
          logger.info('[AI] 流式传输被用户取消')
          onError(new Error('生成已停止'))
        } else {
          logger.error('[AI] 流式传输错误:', error)
          onError(error)
        }
      })

      // 返回取消函数
      return () => {
        if (!isCompleted) {
          isCompleted = true
          logger.info('[AI] 调用取消函数，停止流式传输')
          abortController.abort()
          response.data.destroy()
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError' || signal.aborted) {
        logger.info('[AI] 请求被取消')
        onError(new Error('生成已停止'))
      } else {
        logger.error('[AI] 流式对话失败:', error.message)
        logger.info('========== [AI] 流式对话结束（出错） ==========\n')
        onError(new Error(`AI助手对话失败: ${error.message}`))
      }
      return undefined
    }
  }

  // 智能图书推荐（RAG，非流式）
  async recommendBooks(userQuery: string, limit: number = 5): Promise<string> {
    if (!this.isAvailable()) {
      throw new BusinessError('AI服务未配置')
    }

    try {
      logger.info('执行智能图书推荐（非流式）', { query: userQuery, limit })

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

  // 智能图书推荐（RAG，流式传输）
  async recommendBooksStream(
    userQuery: string,
    limit: number = 5,
    onChunk: (chunk: string) => void,
    onError: (error: Error) => void,
    onComplete: () => void,
    abortSignal?: AbortSignal // 新增：取消信号
  ): Promise<(() => void) | undefined> {
    if (!this.isAvailable()) {
      throw new BusinessError('AI服务未配置')
    }

    try {
      logger.info('========== [AI] 开始智能图书推荐（流式） ==========')
      logger.info('[AI] 用户查询:', userQuery)
      logger.info('[AI] 推荐数量限制:', limit)

      // 1. 语义搜索相关图书
      logger.info('[AI] 执行语义搜索...')
      const searchResults = await this.semanticSearchBooks(userQuery, limit)
      logger.info(`[AI] 找到${searchResults.length}本相关图书`)

      // 2. 构建上下文
      const context = searchResults
        .map(
          (book, index) =>
            `${index + 1}. 《${book.title}》 - ${book.author}\n   简介: ${
              book.description || '暂无'
            }\n   相关度: ${(book.similarity * 100).toFixed(1)}%`
        )
        .join('\n\n')

      logger.info('[AI] 上下文构建完成，长度:', context.length)

      // 3. 生成推荐（流式）
      const prompt = `基于用户的需求："${userQuery}"，我为您找到了以下相关图书。请为用户提供详细的推荐说明，包括推荐理由和阅读建议。`

      logger.info('[AI] 准备调用流式聊天生成推荐...')
      const cancelFn = await this.chatStream(prompt, [], context, onChunk, onError, () => {
        logger.info('[AI] 智能推荐生成完成')
        logger.info('========== [AI] 智能图书推荐结束 ==========\n')
        onComplete()
      }, abortSignal)

      logger.info('========== [AI] 智能图书推荐结束（出错） ==========\n')
      return cancelFn
    } catch (error: any) {
      logger.error('[AI] 智能推荐失败:', error)
      logger.info('========== [AI] 智能图书推荐结束（出错） ==========\n')
      onError(error)
      return undefined
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

  // ============ AI对话历史相关 ============

  // 保存对话
  saveConversation(userId: number, title: string, messages: ChatMessage[]): ConversationWithMessages {
    return this.conversationRepository.create(userId, title, messages)
  }

  // 获取用户对话列表
  getUserConversations(userId: number, limit: number = 20): ConversationWithMessages[] {
    return this.conversationRepository.findByUserId(userId, limit)
  }

  // 获取对话详情
  getConversation(conversationId: number): ConversationWithMessages | undefined {
    return this.conversationRepository.findById(conversationId)
  }

  // 更新对话
  updateConversation(conversationId: number, title: string, messages: ChatMessage[]): ConversationWithMessages | undefined {
    return this.conversationRepository.update(conversationId, title, messages)
  }

  // 删除对话
  deleteConversation(conversationId: number): void {
    this.conversationRepository.delete(conversationId)
  }
}
