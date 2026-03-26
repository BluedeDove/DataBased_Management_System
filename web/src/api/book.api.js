import { request } from './index';
export const bookApi = {
    // 图书类别
    getCategories: () => request.get('/books/categories'),
    createCategory: (data) => request.post('/books/categories', data),
    updateCategory: (id, data) => request.put(`/books/categories/${id}`, data),
    deleteCategory: (id) => request.delete(`/books/categories/${id}`),
    // 图书
    getAll: (filters) => request.get('/books', filters),
    getById: (id) => request.get(`/books/${id}`),
    getByIsbn: (isbn) => request.get(`/books/isbn/${isbn}`),
    create: (data) => request.post('/books', data),
    update: (id, data) => request.put(`/books/${id}`, data),
    delete: (id) => request.delete(`/books/${id}`),
    addCopies: (id, quantity) => request.post(`/books/${id}/copies`, { quantity }),
    destroy: (id, reason) => request.post(`/books/${id}/destroy`, { reason }),
    markAsLost: (id) => request.post(`/books/${id}/mark-lost`),
    markAsDamaged: (id, notes) => request.post(`/books/${id}/mark-damaged`, { notes }),
    advancedSearch: (criteria) => request.post('/books/advanced-search', criteria),
    regexSearch: (pattern, fields, categoryId, searchMode) => request.post('/books/regex-search', { pattern, fields, categoryId, searchMode }),
    getBorrowingStatus: (id) => request.get(`/books/${id}/borrowing-status`),
    getPopular: (limit) => request.get('/books/popular', { limit }),
    getNew: (limit) => request.get('/books/new', { limit }),
    getCategoryStatistics: () => request.get('/books/category-statistics')
};
export const bookCategoryApi = {
    getAll: () => request.get('/books/categories'),
    getById: (id) => request.get(`/books/categories/${id}`),
    create: (data) => request.post('/books/categories', data),
    update: (id, data) => request.put(`/books/categories/${id}`, data),
    delete: (id) => request.delete(`/books/categories/${id}`)
};
//# sourceMappingURL=book.api.js.map