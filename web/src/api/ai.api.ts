import apiClient, { request, ApiResponse } from './index'

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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

export const aiApi = {
  isAvailable: (): Promise<ApiResponse<boolean>> =>
    request.get('/ai/available'),

  createBookEmbedding: (bookId: number): Promise<ApiResponse<{ generated: boolean; model?: string; reason?: string }>> =>
    request.post(`/ai/embeddings/${bookId}`),

  batchCreateEmbeddings: (bookIds: number[]): Promise<ApiResponse<{ generated: number; skipped: number; model?: string }>> =>
    apiClient.post('/ai/embeddings/batch', { bookIds }, { timeout: 600000 }).then(response => response.data),

  semanticSearch: (query: string, topK?: number): Promise<ApiResponse<any[]>> =>
    request.post('/ai/semantic-search', { query, topK }),

  chat: (message: string, history?: any[], context?: string): Promise<ApiResponse<string>> =>
    request.post('/ai/chat', { message, history, context }),

  chatStream: (
    message: string,
    history: any[],
    context: string | undefined,
    onChunk: (chunk: string) => void,
    onError: (error: string) => void,
    onComplete: () => void,
    onToolCall?: (toolCall: ToolCallEvent) => void,
    onRecommend?: (data: { books: any[]; ai_powered: boolean }) => void
  ): (() => void) => {
    const controller = new AbortController()
    const token = localStorage.getItem('token')
    let finished = false
    let buffer = ''

    const finishOnce = () => {
      if (finished) return
      finished = true
      onComplete()
    }

    const failOnce = (error: string) => {
      if (finished) return
      finished = true
      onError(error)
    }

    const handlePayload = (payload: any) => {
      if (payload.chunk) onChunk(payload.chunk)
      if (payload.tool_call && onToolCall) onToolCall(payload.tool_call)
      if (payload.recommend && onRecommend) onRecommend(payload.recommend)

      if (payload.error) {
        failOnce(payload.error)
        return
      }

      if (payload.done) {
        finishOnce()
      }
    }

    const flushBuffer = () => {
      const events = buffer.split('\n\n')
      buffer = events.pop() ?? ''

      for (const event of events) {
        const dataLines = event
          .split('\n')
          .filter(line => line.startsWith('data: '))
          .map(line => line.slice(6))

        if (!dataLines.length) continue

        try {
          handlePayload(JSON.parse(dataLines.join('\n')))
        } catch {
        }
      }
    }

    ;(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/ai/chat/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify({ message, history, context }),
          signal: controller.signal
        })

        if (!response.ok) {
          failOnce((await response.text()) || `请求失败（${response.status}）`)
          return
        }

        const reader = response.body?.getReader()
        if (!reader) {
          failOnce('无法建立流式会话。')
          return
        }

        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          flushBuffer()
        }

        buffer += decoder.decode()
        flushBuffer()
        finishOnce()
      } catch (error: any) {
        if (error?.name === 'AbortError') return
        failOnce(error?.message || '请求失败。')
      }
    })()

    return () => {
      finished = true
      controller.abort()
    }
  },

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

    fetch(`${API_BASE_URL}/ai/recommend/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({ query, limit }),
      signal: controller.signal
    }).then(async response => {
      const reader = response.body?.getReader()
      if (!reader) {
        onError('无法建立推荐流。')
        return
      }

      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          onComplete()
          break
        }

        const text = decoder.decode(value)
        const lines = text.split('\n')
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const payload = JSON.parse(line.slice(6))
            if (payload.chunk) onChunk(payload.chunk)
            if (payload.done) onComplete()
            if (payload.error) onError(payload.error)
          } catch {
          }
        }
      }
    }).catch(error => {
      if (error?.name !== 'AbortError') {
        onError(error?.message || '请求失败。')
      }
    })

    return () => controller.abort()
  },

  chatRecommend: (messages: any[], userQuery: string): Promise<ApiResponse<{ books: any[]; ai_powered: boolean }>> =>
    request.post('/ai/chat-recommend', { messages, userQuery }),

  getStatistics: (): Promise<ApiResponse<{ totalVectors: number; coverageRate: number; totalBooks?: number; currentModel?: string }>> =>
    request.get('/ai/statistics'),

  saveConversation: (userId: number, title: string, messages: any[]): Promise<ApiResponse<Conversation>> =>
    request.post('/ai/conversations', { userId, title, messages }),

  getConversations: (_userId: number, limit?: number): Promise<ApiResponse<Conversation[]>> =>
    request.get('/ai/conversations', { limit }),

  getConversation: (conversationId: number): Promise<ApiResponse<Conversation>> =>
    request.get(`/ai/conversations/${conversationId}`),

  updateConversation: (conversationId: number, title: string, messages: any[]): Promise<ApiResponse<Conversation>> =>
    request.put(`/ai/conversations/${conversationId}`, { title, messages }),

  deleteConversation: (conversationId: number): Promise<ApiResponse<void>> =>
    request.delete(`/ai/conversations/${conversationId}`)
}
