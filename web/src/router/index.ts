import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'
import { useUserStore } from '@/store/user'
import { getHomeRoute } from '@/utils/homeRoute'
import Layout from '@/components/Layout.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/Register.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/machine-terminal',
    name: 'MachineTerminal',
    component: () => import('@/views/MachineTerminal.vue'),
    meta: { requiresAuth: true, roles: ['machine'] }
  },
  {
    path: '/',
    component: Layout,
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '控制台', roles: ['admin', 'librarian'] }
      },
      {
        path: 'books',
        name: 'Books',
        component: () => import('@/views/Books.vue'),
        meta: { title: '找书预约', roles: ['admin', 'librarian', 'teacher', 'student'] }
      },
      {
        path: 'readers',
        name: 'Readers',
        component: () => import('@/views/Readers.vue'),
        meta: { title: '读者管理', roles: ['admin', 'librarian'] }
      },
      {
        path: 'borrowing',
        name: 'Borrowing',
        component: () => import('@/views/Borrowing.vue'),
        meta: { title: '借阅中心', roles: ['admin', 'librarian', 'teacher', 'student'] }
      },
      {
        path: 'statistics',
        name: 'Statistics',
        component: () => import('@/views/Statistics.vue'),
        meta: { title: '统计分析', roles: ['admin', 'librarian'] }
      },
      {
        path: 'notes',
        name: 'Notes',
        component: () => import('@/views/Notes.vue'),
        meta: { title: '传承笔记', roles: ['admin', 'librarian', 'teacher', 'student'] }
      },
      {
        path: 'ai-assistant',
        name: 'AIAssistant',
        component: () => import('@/views/AIAssistant.vue'),
        meta: { title: 'AI 智能图书馆', roles: ['admin', 'librarian', 'teacher', 'student'] }
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/Settings.vue'),
        meta: { title: '系统设置', roles: ['admin', 'librarian'] }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

let initialized = false

router.beforeEach(async (to, _from, next) => {
  const userStore = useUserStore()

  if (!initialized) {
    initialized = true
    await userStore.initialize()
  }

  if (to.meta.requiresAuth !== false && !userStore.isLoggedIn) {
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }

  if ((to.path === '/login' || to.path === '/register') && userStore.isLoggedIn) {
    next(getHomeRoute(userStore.user?.role))
    return
  }

  if (to.path === '/' && userStore.isLoggedIn) {
    next(getHomeRoute(userStore.user?.role))
    return
  }

  if (to.meta.roles && userStore.user) {
    const allowedRoles = to.meta.roles as string[]
    if (!allowedRoles.includes(userStore.user.role)) {
      next(getHomeRoute(userStore.user.role))
      return
    }
  }

  next()
})

export default router
