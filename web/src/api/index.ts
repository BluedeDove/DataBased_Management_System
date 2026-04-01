import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

// 创建axios实例
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 是否正在刷新Token
let isRefreshing = false
// 等待Token刷新的请求队列
let refreshSubscribers: Array<(token: string) => void> = []

/**
 * 订阅Token刷新完成事件
 */
const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb)
}

/**
 * 通知所有订阅者Token已刷新
 */
const onRefreshed = (token: string) => {
  refreshSubscribers.forEach(cb => cb(token))
  refreshSubscribers = []
}

/**
 * 刷新Token
 */
const refreshToken = async (): Promise<string | null> => {
  const token = localStorage.getItem('token')
  if (!token) return null

  try {
    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (response.data.success && response.data.data.token) {
      const newToken = response.data.data.token
      localStorage.setItem('token', newToken)
      return newToken
    }
  } catch (error) {
    console.error('Token刷新失败:', error)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
  }

  return null
}

// 请求拦截器 - 添加token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器 - 处理Token刷新和错误
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // 检查响应头中是否有新Token
    const newToken = response.headers['x-new-token']
    if (newToken) {
      localStorage.setItem('token', newToken)
      console.log('Token已自动刷新')
    }
    return response
  },
  async (error: AxiosError<any>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // 401错误处理
    if (error.response?.status === 401) {
      // 如果是登录请求失败，直接跳转
      if (originalRequest.url?.includes('/auth/login')) {
        return Promise.reject(error)
      }

      // 如果正在刷新Token，将请求加入队列
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(apiClient(originalRequest))
          })
        })
      }

      // 尝试刷新Token
      if (!originalRequest._retry) {
        originalRequest._retry = true
        isRefreshing = true

        const newToken = await refreshToken()
        isRefreshing = false

        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          onRefreshed(newToken)
          return apiClient(originalRequest)
        }
      }

      // 刷新失败，清除登录状态
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }

    // 409冲突错误特殊处理（乐观锁冲突）
    if (error.response?.status === 409) {
      const errorData = error.response.data
      console.warn('数据版本冲突:', errorData)
    }

    return Promise.reject(error)
  }
)

// 统一响应类型
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code?: string
    message: string
    details?: any
  }
}

// 通用请求方法
export const request = {
  get: <T = any>(url: string, params?: any): Promise<ApiResponse<T>> =>
    apiClient.get(url, { params }).then(res => res.data),

  post: <T = any>(url: string, data?: any): Promise<ApiResponse<T>> =>
    apiClient.post(url, data).then(res => res.data),

  put: <T = any>(url: string, data?: any): Promise<ApiResponse<T>> =>
    apiClient.put(url, data).then(res => res.data),

  delete: <T = any>(url: string): Promise<ApiResponse<T>> =>
    apiClient.delete(url).then(res => res.data)
}

export default apiClient
