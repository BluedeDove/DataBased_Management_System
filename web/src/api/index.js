import axios from 'axios';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';
// 创建axios实例
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    }
});
// 请求拦截器 - 添加token
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => Promise.reject(error));
// 响应拦截器 - 处理错误
apiClient.interceptors.response.use((response) => response, (error) => {
    if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    }
    return Promise.reject(error);
});
// 通用请求方法
export const request = {
    get: (url, params) => apiClient.get(url, { params }).then(res => res.data),
    post: (url, data) => apiClient.post(url, data).then(res => res.data),
    put: (url, data) => apiClient.put(url, data).then(res => res.data),
    delete: (url) => apiClient.delete(url).then(res => res.data)
};
export default apiClient;
//# sourceMappingURL=index.js.map