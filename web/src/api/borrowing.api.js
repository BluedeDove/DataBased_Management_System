import { request } from './index';
export const borrowingApi = {
    borrow: (readerId, bookId) => request.post('/borrowings', { readerId, bookId }),
    return: (id) => request.put(`/borrowings/${id}/return`),
    renew: (id) => request.put(`/borrowings/${id}/renew`),
    markAsLost: (id) => request.put(`/borrowings/${id}/mark-lost`),
    getAll: (filters) => request.get('/borrowings', filters),
    getOverdue: () => request.get('/borrowings/overdue'),
    getStatistics: () => request.get('/borrowings/statistics'),
    getReaderHistory: (readerId) => request.get(`/borrowings/reader/${readerId}`),
    getBookHistory: (bookId) => request.get(`/borrowings/book/${bookId}`),
    getPopular: (limit) => request.get('/borrowings/popular', { limit }),
    getActiveReaders: (limit) => request.get('/borrowings/active-readers', { limit }),
    delete: (id) => request.delete(`/borrowings/${id}`),
    getTrend: (days) => request.get('/borrowings/trend', { days }),
    getBookCount: () => request.get('/borrowings/book-count')
};
//# sourceMappingURL=borrowing.api.js.map