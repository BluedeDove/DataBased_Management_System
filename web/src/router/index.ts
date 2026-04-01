import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'
import { useUserStore } from '@/store/user'
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
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '仪表盘', icon: 'DataAnalysis', roles: ['admin', 'librarian', 'teacher', 'student'] }
      },
      {
        path: 'books',
        name: 'Books',
        component: () => import('@/views/Books.vue'),
        meta: { title: '图书管理', icon: 'Reading', roles: ['admin', 'librarian', 'teacher', 'student'] }
      },
      {
        path: 'readers',
        name: 'Readers',
        component: () => import('@/views/Readers.vue'),
        meta: { title: '读者管理', icon: 'User', roles: ['admin', 'librarian'] }
      },
      {
        path: 'borrowing',
        name: 'Borrowing',
        component: () => import('@/views/Borrowing.vue'),
        meta: { title: '借还管理', icon: 'DocumentCopy', roles: ['admin', 'librarian', 'teacher', 'student'] }
      },
      {
        path: 'statistics',
        name: 'Statistics',
        component: () => import('@/views/Statistics.vue'),
        meta: { title: '统计分析', icon: 'PieChart', roles: ['admin', 'librarian'] }
      },
      {
        path: 'notes',
        name: 'Notes',
        component: () => import('@/views/Notes.vue'),
        meta: { title: '读书笔记', icon: 'EditPen', roles: ['admin', 'librarian', 'teacher', 'student'] }
      },
      {
        path: 'ai-assistant',
        name: 'AIAssistant',
        component: () => import('@/views/AIAssistant.vue'),
        meta: { title: 'AI 助手', icon: 'MagicStick', roles: ['admin', 'librarian', 'teacher', 'student'] }
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/Settings.vue'),
        meta: { title: '系统设置', icon: 'Setting', roles: ['admin', 'librarian'] }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 标记是否已初始化
let isInitialized = false

// 路由守卫
router.beforeEach(async (to, _from, next) => {
  const userStore = useUserStore()

  // 首次访问时初始化用户状态（验证Token）
  if (!isInitialized) {
    isInitialized = true
    await userStore.initialize()
  }

  // 需要认证的页面
  if (to.meta.requiresAuth !== false) {
    if (!userStore.isLoggedIn) {
      // 未登录，重定向到登录页
      next({ path: '/login', query: { redirect: to.fullPath } })
      return
    }

    // 权限检查
    if (to.meta.roles && userStore.user) {
      const allowedRoles = to.meta.roles as string[]
      if (!allowedRoles.includes(userStore.user.role)) {
        // 没有权限，重定向到Dashboard
        next('/dashboard')
        return
      }
    }
  }

  // 已登录用户访问登录/注册页，重定向到首页
  if ((to.path === '/login' || to.path === '/register') && userStore.isLoggedIn) {
    next('/')
    return
  }

  next()
})

export default router
