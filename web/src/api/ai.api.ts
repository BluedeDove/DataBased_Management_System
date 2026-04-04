import { request, ApiResponse, default as apiClient } from './index'

export interface Conversation {
  id: number
  user_id: number
  title: string
  messages: any[]
  created_at: string
  updated_at: string
}

export interface ToolCallEvent {
  id: string
  name: string
  status: 'started' | 'completed'
  result?: any
}

export const aiApi = {
  // AI availability
  isAvailable: (): Promise<ApiResponse<boolean>> =>
    request.get('/ai/available'),

  // Embeddings
  createBookEmbedding: (bookId: number): Promise<ApiResponse<void>> =>
    request.post(`/ai/embeddings/${bookId}`),

  batchCreateEmbeddings: (bookIds: number[]): Promise<ApiResponse<{ generated: number; skipped: number }>> =>
    apiClient.post('/ai/embeddings/batch', { bookIds }, { timeout: 600000 }).then(res => res.data),

  // Semantic search
  semanticSearch: (query: string, topK?: number): Promise<ApiResponse<any[]>> =>
    request.post('/ai/semantic-search', { query, topK }),

  // Chat
  chat: (message: string, history?: any[], context?: string): Promise<ApiResponse<string>> =>
    request.post('/ai/chat', { message, history, context }),

  // Stream chat (Agent-enhanced)
  chatStream: (
    message: string,
    history: any[],
    context: string | undefined,
    onChunk: (chunk: string) => void,
    onError: (error: string) => void,
    onComplete: () => void,
    onToolCall?: (tc: ToolCallEvent) => void,
    onRecommend?: (data: { books: any[]; ai_powered: boolean }) => void
  ): (() => void) => {
    const controller = new AbortController()
    const token = localStorage.getItem('token')

    fetch(`${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/ai/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({ message, history, context }),
      signal: controller.signal
    }).then(async response => {
      const reader = response.body?.getReader()
      if (!reader) { onError('无法获取响应流'); return }

      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) { onComplete(); break }
        const text = decoder.decode(value)
        const lines = text.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.chunk) onChunk(data.chunk)
              if (data.done) onComplete()
              if (data.error) onError(data.error)
              if (data.tool_call && onToolCall) onToolCall(data.tool_call)
              if (data.recommend && onRecommend) onRecommend(data.recommend)
            } catch (e) { /* ignore parse errors */ }
          }
        }
      }
    }).catch(err => {
      if (err.name !== 'AbortError') onError(err.message)
    })

    return () => controller.abort()
  },

  // Book recommendations
  recommendBooks: (query: string, limit?: number): Promise<ApiResponse<any>> =>
    request.post('/ai/recommend', { query, limit }),

  recommendBooksStream: (
    query: string,
    limit: number,
    onChunk: (chunk: string) => void,
    onError: (error: string) => void,
    onComplete: () => void
  ): (() => void) => {
    const controller = new AbortController()
    const token = localStorage.getItem('token')

    fetch(`${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/ai/recommend/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({ query, limit }),
      signal: controller.signal
    }).then(async response => {
      const reader = response.body?.getReader()
      if (!reader) { onError('无法获取响应流'); return }

      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) { onComplete(); break }
        const text = decoder.decode(value)
        const lines = text.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.chunk) onChunk(data.chunk)
              if (data.done) onComplete()
              if (data.error) onError(data.error)
            } catch (e) { /* ignore parse errors */ }
          }
        }
      }
    }).catch(err => {
      if (err.name !== 'AbortError') onError(err.message)
    })

    return () => controller.abort()
  },

  // AI 智能书籍推荐（根据对话上下文，AI 返回 book_ids JSON）
  chatRecommend: (messages: any[], userQuery: string): Promise<ApiResponse<{ books: any[]; ai_powered: boolean }>> =>
    request.post('/ai/chat-recommend', { messages, userQuery }),

  // Statistics
  getStatistics: (): Promise<ApiResponse<{ totalVectors: number; coverageRate: number; totalBooks?: number }>> =>
    request.get('/ai/statistics'),

  // Conversations
  saveConversation: (userId: number, title: string, messages: any[]): Promise<ApiResponse<Conversation>> =>
    request.post('/ai/conversations', { userId, title, messages }),

  getConversations: (userId: number, limit?: number): Promise<ApiResponse<Conversation[]>> =>
    request.get('/ai/conversations', { params: { userId, limit } }),

  getConversation: (conversationId: number): Promise<ApiResponse<Conversation>> =>
    request.get(`/ai/conversations/${conversationId}`),

  updateConversation: (conversationId: number, title: string, messages: any[]): Promise<ApiResponse<Conversation>> =>
    request.put(`/ai/conversations/${conversationId}`, { title, messages }),

  deleteConversation: (conversationId: number): Promise<ApiResponse<void>> =>
    request.delete(`/ai/conversations/${conversationId}`)
}
