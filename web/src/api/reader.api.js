import { request } from './index';
export const readerApi = {
    // 读者
    getAll: (filters) => request.get('/readers', filters),
    getById: (id) => request.get(`/readers/${id}`),
    getByNo: (readerNo) => request.get(`/readers/no/${readerNo}`),
    create: (data) => request.post('/readers', data),
    update: (id, data) => request.put(`/readers/${id}`, data),
    delete: (id) => request.delete(`/readers/${id}`),
    search: (keyword) => request.get('/readers/search', { keyword }),
    regexSearch: (pattern, fields, searchMode) => request.post('/readers/regex-search', { pattern, fields, searchMode }),
    suspend: (id, reason) => request.post(`/readers/${id}/suspend`, { reason }),
    activate: (id) => request.post(`/readers/${id}/activate`),
    renew: (id, days) => request.post(`/readers/${id}/renew`, { days }),
    canBorrow: (id) => request.get(`/readers/${id}/can-borrow`),
    getStatistics: (id) => request.get(`/readers/${id}/statistics`)
};
export const readerCategoryApi = {
    getAll: () => request.get('/readers/categories'),
    getById: (id) => request.get(`/readers/categories/${id}`),
    create: (data) => request.post('/readers/categories', data),
    update: (id, data) => request.put(`/readers/categories/${id}`, data),
    delete: (id) => request.delete(`/readers/categories/${id}`)
};
//# sourceMappingURL=reader.api.js.map