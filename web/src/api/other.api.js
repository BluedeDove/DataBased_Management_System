import { request } from './index';
export const configApi = {
    getAISettings: () => request.get('/config/ai'),
    updateAISettings: (settings) => request.put('/config/ai', settings),
    testAIConnection: () => request.post('/config/ai/test')
};
export const searchApi = {
    executeSql: (query) => request.post('/search/sql', { query }),
    getAllTables: () => request.get('/search/tables'),
    getTableSchema: (tableName) => request.get(`/search/tables/${tableName}/schema`)
};
export const exportApi = {
    booksToCSV: () => fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1'}/export/books/csv`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(res => res.blob()),
    booksToJSON: () => fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1'}/export/books/json`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(res => res.blob()),
    toCSV: (data, filename) => request.post('/export/csv', { data, filename }),
    toJSON: (data, filename) => request.post('/export/json', { data, filename }),
    report: (options) => request.post('/export/report', options)
};
//# sourceMappingURL=other.api.js.map