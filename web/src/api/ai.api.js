import { request } from './index';
export const aiApi = {
    // AI availability
    isAvailable: () => request.get('/ai/available'),
    // Embeddings
    createBookEmbedding: (bookId) => request.post(`/ai/embeddings/${bookId}`),
    batchCreateEmbeddings: (bookIds) => request.post('/ai/embeddings/batch', { bookIds }),
    // Semantic search
    semanticSearch: (query, topK) => request.post('/ai/semantic-search', { query, topK }),
    // Chat
    chat: (message, history, context) => request.post('/ai/chat', { message, history, context }),
    // Stream chat
    chatStream: (message, history, context, onChunk, onError, onComplete) => {
        const controller = new AbortController();
        const token = localStorage.getItem('token');
        fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1'}/ai/chat/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify({ message, history, context }),
            signal: controller.signal
        }).then(async (response) => {
            const reader = response.body?.getReader();
            if (!reader) {
                onError('无法获取响应流');
                return;
            }
            const decoder = new TextDecoder();
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    onComplete();
                    break;
                }
                const text = decoder.decode(value);
                const lines = text.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.chunk)
                                onChunk(data.chunk);
                            if (data.done)
                                onComplete();
                            if (data.error)
                                onError(data.error);
                        }
                        catch (e) { /* ignore parse errors */ }
                    }
                }
            }
        }).catch(err => {
            if (err.name !== 'AbortError')
                onError(err.message);
        });
        return () => controller.abort();
    },
    // Book recommendations
    recommendBooks: (query, limit) => request.post('/ai/recommend', { query, limit }),
    recommendBooksStream: (query, limit, onChunk, onError, onComplete) => {
        const controller = new AbortController();
        const token = localStorage.getItem('token');
        fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1'}/ai/recommend/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify({ query, limit }),
            signal: controller.signal
        }).then(async (response) => {
            const reader = response.body?.getReader();
            if (!reader) {
                onError('无法获取响应流');
                return;
            }
            const decoder = new TextDecoder();
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    onComplete();
                    break;
                }
                const text = decoder.decode(value);
                const lines = text.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.chunk)
                                onChunk(data.chunk);
                            if (data.done)
                                onComplete();
                            if (data.error)
                                onError(data.error);
                        }
                        catch (e) { /* ignore parse errors */ }
                    }
                }
            }
        }).catch(err => {
            if (err.name !== 'AbortError')
                onError(err.message);
        });
        return () => controller.abort();
    },
    // Statistics
    getStatistics: () => request.get('/ai/statistics'),
    // Conversations
    saveConversation: (userId, title, messages) => request.post('/ai/conversations', { userId, title, messages }),
    getConversations: (userId, limit) => request.get('/ai/conversations', { params: { userId, limit } }),
    getConversation: (conversationId) => request.get(`/ai/conversations/${conversationId}`),
    updateConversation: (conversationId, title, messages) => request.put(`/ai/conversations/${conversationId}`, { title, messages }),
    deleteConversation: (conversationId) => request.delete(`/ai/conversations/${conversationId}`)
};
//# sourceMappingURL=ai.api.js.map