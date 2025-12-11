import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

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
    // 确保传递给 IPC 的是纯对象，去除 Vue 的响应式代理
    const plainCredentials = { ...credentials }
    const result = await window.api.auth.login(plainCredentials)
    if (result.success) {
      user.value = result.data.user
      token.value = result.data.token
      // 保存到 localStorage
      localStorage.setItem('token', result.data.token)
      localStorage.setItem('user', JSON.stringify(result.data.user))
      return true
    }
    throw new Error(result.error?.message || '登录失败')
  }

  async function logout() {
    if (token.value) {
      await window.api.auth.logout(token.value)
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
      user.value = JSON.parse(savedUser)
    }
  }

  async function changePassword(oldPassword: string, newPassword: string) {
    if (!user.value) throw new Error('未登录')
    const result = await window.api.auth.changePassword(user.value.id, oldPassword, newPassword)
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
