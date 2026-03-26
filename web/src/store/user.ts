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
    isLoggedIn,
    isAdmin,
    login,
    logout,
    restoreSession,
    changePassword
  }
})
