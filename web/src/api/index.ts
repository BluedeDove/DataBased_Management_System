import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

const redirectToLogin = () => {
  const loginUrl = `${window.location.origin}${window.location.pathname}#/login`
  if (window.location.href !== loginUrl) {
    window.location.replace(loginUrl)
  }
}

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    const newToken = response.headers['x-new-token']
    if (newToken) {
      localStorage.setItem('token', newToken)
    }
    return response
  },
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      redirectToLogin()
    }

    return Promise.reject(error)
  }
)

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code?: string
    message: string
    details?: any
  }
}

export const request = {
  get: <T = any>(url: string, params?: any): Promise<ApiResponse<T>> =>
    apiClient.get(url, { params }).then(response => response.data),

  post: <T = any>(url: string, data?: any): Promise<ApiResponse<T>> =>
    apiClient.post(url, data).then(response => response.data),

  put: <T = any>(url: string, data?: any): Promise<ApiResponse<T>> =>
    apiClient.put(url, data).then(response => response.data),

  delete: <T = any>(url: string): Promise<ApiResponse<T>> =>
    apiClient.delete(url).then(response => response.data)
}

export default apiClient
