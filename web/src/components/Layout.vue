<template>
  <div class="layout-shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">AI</div>
        <div>
          <div class="brand-title">AI 智能图书馆</div>
          <div class="brand-subtitle">{{ roleLabel }}</div>
        </div>
      </div>

      <nav class="nav-list">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: isActive(item.path) }"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <div class="user-card">
          <div class="avatar">{{ userInitial }}</div>
          <div class="user-meta">
            <div class="user-name">{{ username }}</div>
            <div class="user-role">{{ roleLabel }}</div>
          </div>
        </div>
        <button class="logout-btn" @click="handleLogout">
          <el-icon><SwitchButton /></el-icon>
          <span>退出登录</span>
        </button>
      </div>
    </aside>

    <div class="main-panel">
      <header class="topbar">
        <div>
          <h1 class="page-title">{{ currentPageTitle }}</h1>
          <p class="page-subtitle">{{ todayLabel }}</p>
        </div>

        <div class="topbar-actions">
          <div v-if="showSearch" class="search-box">
            <el-icon><Search /></el-icon>
            <el-autocomplete
              v-model="globalSearch"
              :fetch-suggestions="queryBookSuggestions"
              :debounce="160"
              clearable
              placeholder="搜索馆藏并快速跳到图书页"
              @select="handleSearchSuggestionSelect"
              @keydown.enter="handleGlobalSearch"
            >
              <template #default="{ item }">
                <div class="suggestion-item">
                  <div class="suggestion-title">{{ item.title }}</div>
                  <div class="suggestion-meta">{{ item.author }} · {{ item.isbn }}</div>
                </div>
              </template>
            </el-autocomplete>
          </div>
          <button v-if="isStaff" class="ghost-btn" @click="goSettings">
            <el-icon><Setting /></el-icon>
            <span>系统设置</span>
          </button>
        </div>
      </header>

      <main class="content">
        <router-view v-slot="{ Component, route: childRoute }">
          <transition name="page-fade" mode="out-in">
            <component :is="Component" :key="childRoute.fullPath" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Odometer,
  Collection,
  Tickets,
  User,
  DataAnalysis,
  ChatDotRound,
  Setting,
  SwitchButton,
  Search,
  EditPen
} from '@element-plus/icons-vue'
import { useUserStore } from '@/store/user'
import { fetchBookSuggestions, type BookSuggestionItem } from '@/utils/searchSuggestions'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const isStaff = computed(() => ['admin', 'librarian'].includes(userStore.user?.role || ''))
const globalSearch = ref('')

const navItems = computed(() => {
  if (isStaff.value) {
    return [
      { path: '/dashboard', label: '控制台', icon: Odometer },
      { path: '/books', label: '图书管理', icon: Collection },
      { path: '/borrowing', label: '借还管理', icon: Tickets },
      { path: '/readers', label: '读者管理', icon: User },
      { path: '/notes', label: '读书笔记', icon: EditPen },
      { path: '/ai-assistant', label: 'AI 助手', icon: ChatDotRound },
      { path: '/statistics', label: '统计分析', icon: DataAnalysis },
      { path: '/settings', label: '系统设置', icon: Setting }
    ]
  }

  return [
    { path: '/ai-assistant', label: 'AI 图书馆', icon: ChatDotRound },
    { path: '/books', label: '找书预约', icon: Collection },
    { path: '/borrowing', label: '我的借阅', icon: Tickets },
    { path: '/notes', label: '传承笔记', icon: EditPen }
  ]
})

const username = computed(() => userStore.user?.name || userStore.user?.username || '用户')
const userInitial = computed(() => username.value.slice(0, 1).toUpperCase())
const roleLabel = computed(() => {
  const labelMap: Record<string, string> = {
    admin: '管理员',
    librarian: '图书馆员',
    teacher: '教师读者',
    student: '学生读者',
    machine: '自助终端'
  }

  return labelMap[userStore.user?.role || ''] || '用户'
})

const titleMap: Record<string, string> = {
  '/dashboard': '控制台',
  '/books': '找书预约',
  '/borrowing': '借阅中心',
  '/readers': '读者管理',
  '/statistics': '统计分析',
  '/notes': '传承笔记',
  '/ai-assistant': 'AI 智能图书馆',
  '/settings': '系统设置'
}

const currentPageTitle = computed(() => {
  const matched = Object.entries(titleMap).find(([path]) =>
    path === '/dashboard' ? route.path === path : route.path.startsWith(path)
  )
  return matched?.[1] || 'AI 智能图书馆'
})

const todayLabel = computed(() =>
  new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })
)

const showSearch = computed(() => route.path !== '/notes')

const isActive = (path: string) => {
  if (path === '/dashboard') return route.path === path
  return route.path.startsWith(path)
}

const queryBookSuggestions = async (
  queryString: string,
  callback: (items: BookSuggestionItem[]) => void
) => {
  callback(await fetchBookSuggestions(queryString))
}

const jumpToBooks = (keyword: string) => {
  const query = keyword.trim()
  if (!query) return
  router.push({ path: '/books', query: { search: query } })
  globalSearch.value = ''
}

const handleSearchSuggestionSelect = (item: BookSuggestionItem) => {
  jumpToBooks(item.title)
}

const handleGlobalSearch = () => {
  jumpToBooks(globalSearch.value)
}

const goSettings = () => router.push('/settings')

const handleLogout = async () => {
  userStore.logout()
  await router.replace('/login')
}
</script>

<style scoped>
.layout-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 260px 1fr;
  background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 40%, #fff7ed 100%);
}

.sidebar {
  display: flex;
  flex-direction: column;
  padding: 24px 18px;
  border-right: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(18px);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 28px;
}

.brand-mark {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #c8102e 0%, #7c3aed 100%);
}

.brand-title {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.brand-subtitle {
  font-size: 13px;
  color: #64748b;
}

.nav-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 14px;
  color: #475569;
  text-decoration: none;
  transition: all 0.22s ease;
}

.nav-item:hover,
.nav-item.active {
  color: #c8102e;
  background: rgba(200, 16, 46, 0.08);
  transform: translateX(2px);
}

.sidebar-footer {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(248, 250, 252, 0.9);
}

.avatar {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  background: linear-gradient(135deg, #c8102e 0%, #7c3aed 100%);
}

.user-name {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.user-role {
  font-size: 12px;
  color: #64748b;
}

.logout-btn,
.ghost-btn {
  height: 44px;
  border: none;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  font-weight: 600;
}

.logout-btn {
  color: #fff;
  background: linear-gradient(135deg, #c8102e 0%, #7c3aed 100%);
}

.ghost-btn {
  padding: 0 16px;
  background: rgba(255, 255, 255, 0.9);
  color: #334155;
  border: 1px solid rgba(148, 163, 184, 0.24);
}

.main-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.topbar {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  padding: 24px 28px 16px;
  align-items: center;
}

.page-title {
  margin: 0;
  font-size: 28px;
  color: #0f172a;
}

.page-subtitle {
  margin: 8px 0 0;
  color: #64748b;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-box {
  width: 340px;
  height: 44px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.24);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.search-box:focus-within {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
}

.search-box :deep(.el-autocomplete) {
  flex: 1;
}

.search-box :deep(.el-input__wrapper) {
  box-shadow: none !important;
  background: transparent !important;
}

.search-box :deep(.el-input__inner) {
  font-size: 14px;
}

.content {
  flex: 1;
  padding: 0 28px 28px;
  min-height: 0;
}

.suggestion-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 2px 0;
}

.suggestion-title {
  font-weight: 600;
  color: #0f172a;
}

.suggestion-meta {
  font-size: 12px;
  color: #64748b;
}

@media (max-width: 1100px) {
  .layout-shell {
    grid-template-columns: 1fr;
  }

  .sidebar {
    border-right: none;
    border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  }

  .nav-list {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .topbar {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    width: 100%;
  }
}
</style>
