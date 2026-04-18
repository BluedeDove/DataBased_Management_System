import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '../api/auth.api'

interface User {
  id: number
  username: string
  name: string
  role: 'admin' | 'librarian' | 'teacher' | 'student' | 'machine'
  email?: string
  phone?: string
  reader_id?: number
}

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const token = ref('')
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

    throw new Error(result.error?.message || '登录失败。')
  }

  function clearSession() {
    user.value = null
    token.value = ''
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  function logout() {
    clearSession()
  }

  function restoreSession() {
    const savedToken = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')

    if (!savedToken || !savedUser) return

    token.value = savedToken
    try {
      user.value = JSON.parse(savedUser)
    } catch {
      clearSession()
    }
  }

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
        token.value = savedToken
        localStorage.setItem('user', JSON.stringify(result.data))
        return true
      }
    } catch {
    }

    clearSession()
    return false
  }

  async function initialize(): Promise<boolean> {
    if (isInitialized.value) {
      return isLoggedIn.value
    }

    restoreSession()

    if (token.value) {
      const valid = await validateToken()
      if (!valid) {
        isInitialized.value = true
        return false
      }
    }

    isInitialized.value = true
    return isLoggedIn.value
  }

  function updateToken(newToken: string) {
    token.value = newToken
    localStorage.setItem('token', newToken)
  }

  async function changePassword(oldPassword: string, newPassword: string) {
    if (!user.value) {
      throw new Error('当前未登录。')
    }

    const result = await authApi.changePassword(oldPassword, newPassword)
    if (!result.success) {
      throw new Error(result.error?.message || '修改密码失败。')
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
