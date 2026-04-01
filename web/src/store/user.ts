import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '../api/auth.api'

interface User {
  id: number
  username: string
  name: string
  role: 'admin' | 'librarian' | 'teacher' | 'student'
  email?: string
  phone?: string
  reader_id?: number
}

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const token = ref<string>('')
  const isInitialized = ref(false)

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  async function login(credentials: { username: string; password: string }) {
    const result = await authApi.login(credentials)
    if (result.success && result.data) {
      user.value = result.data.user as User
      token.value = result.data.token
      localStorage.setItem('token', result.data.token)
      localStorage.setItem('user', JSON.stringify(result.data.user))
      return true
    }
    throw new Error(result.error?.message || '登录失败')
  }

  async function logout() {
    if (token.value) {
      try {
        await authApi.logout()
      } catch (e) {
        // ignore logout errors
      }
    }
    user.value = null
    token.value = ''
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  /**
   * 从localStorage恢复会话
   */
  function restoreSession() {
    const savedToken = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    if (savedToken && savedUser) {
      token.value = savedToken
      try {
        user.value = JSON.parse(savedUser)
      } catch (e) {
        user.value = null
      }
    }
  }

  /**
   * 验证Token有效性并获取最新用户信息
   * @returns Token是否有效
   */
  async function validateToken(): Promise<boolean> {
    const savedToken = localStorage.getItem('token')
    if (!savedToken) {
      clearSession()
      return false
    }

    try {
      const result = await authApi.validate()
      if (result.success && result.data) {
        user.value = result.data as User
        token.value = localStorage.getItem('token') || ''
        // 更新localStorage中的用户信息
        localStorage.setItem('user', JSON.stringify(result.data))
        return true
      }
    } catch (error) {
      console.warn('Token验证失败:', error)
    }

    clearSession()
    return false
  }

  /**
   * 初始化用户状态（页面刷新时调用）
   * 优先从localStorage恢复，然后验证Token
   */
  async function initialize(): Promise<boolean> {
    if (isInitialized.value) {
      return isLoggedIn.value
    }

    // 先从localStorage恢复
    restoreSession()

    // 如果有token，验证有效性
    if (token.value) {
      const isValid = await validateToken()
      if (!isValid) {
        return false
      }
    }

    isInitialized.value = true
    return isLoggedIn.value
  }

  /**
   * 清除会话
   */
  function clearSession() {
    user.value = null
    token.value = ''
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  /**
   * 更新Token（由API拦截器调用）
   */
  function updateToken(newToken: string) {
    token.value = newToken
    localStorage.setItem('token', newToken)
  }

  async function changePassword(oldPassword: string, newPassword: string) {
    if (!user.value) throw new Error('未登录')
    const result = await authApi.changePassword(oldPassword, newPassword)
    if (!result.success) {
      throw new Error(result.error?.message || '修改密码失败')
    }
  }

  return {
    user,
    token,
    isInitialized,
    isLoggedIn,
    isAdmin,
    login,
    logout,
    restoreSession,
    validateToken,
    initialize,
    clearSession,
    updateToken,
    changePassword
  }
})
