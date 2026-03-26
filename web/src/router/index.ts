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

// 路由守卫
router.beforeEach((to, _from, next) => {
  const userStore = useUserStore()

  if (to.meta.requiresAuth !== false && !userStore.isLoggedIn) {
    next('/login')
  } else if (to.path === '/login' && userStore.isLoggedIn) {
    next('/')
  } else {
    // 权限检查
    if (to.meta.roles && userStore.user) {
      const allowedRoles = to.meta.roles as string[]
      if (!allowedRoles.includes(userStore.user.role)) {
        // 没有权限，重定向到无权限页面或Dashboard
        next('/dashboard')
        return
      }
    }
    next()
  }
})

export default router
