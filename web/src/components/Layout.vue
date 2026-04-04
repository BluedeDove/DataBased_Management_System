<template>
  <div class="app-shell">
    <!-- Background decorative orbs -->
    <div class="bg-orb orb-1" />
    <div class="bg-orb orb-2" />
    <div class="bg-orb orb-3" />

    <!-- Floating Sidebar -->
    <aside class="floating-sidebar glass-sidebar">
      <div class="sidebar-logo">
        <div class="logo-mark"><span class="logo-g">G</span></div>
      </div>

      <nav class="sidebar-nav">
        <el-tooltip
          v-for="item in navItems"
          :key="item.name"
          :content="item.label"
          placement="right"
          :show-after="300"
        >
          <router-link
            :to="item.path"
            class="nav-item"
            :class="{ active: isActive(item.path) }"
          >
            <el-icon class="nav-icon"><component :is="item.icon" /></el-icon>
            <span class="nav-indicator" v-if="isActive(item.path)" />
          </router-link>
        </el-tooltip>
      </nav>

      <div class="sidebar-bottom">
        <el-tooltip :content="isStaff ? '个人设置' : `${username}·${roleLabel}`" placement="right" :show-after="300">
          <div class="nav-avatar" :class="{ 'non-staff': !isStaff }" @click="isStaff ? goSettings() : undefined">
            <div class="avatar-circle">{{ userInitial }}</div>
          </div>
        </el-tooltip>
        <el-tooltip content="退出登录" placement="right" :show-after="300">
          <button class="nav-item logout-btn" @click="handleLogout">
            <el-icon class="nav-icon"><SwitchButton /></el-icon>
          </button>
        </el-tooltip>
      </div>
    </aside>

    <!-- Main Area -->
    <div class="main-area">
      <header class="main-header glass-header">
        <div class="header-left">
          <h1 class="header-title">{{ currentPageTitle }}</h1>
          <p class="header-date">{{ todayStr }}</p>
        </div>
        <div class="header-right">
          <div class="header-search">
            <el-icon class="search-icon-h"><Search /></el-icon>
            <input v-model="globalSearch" placeholder="搜索图书、读者…" @keydown.enter="handleGlobalSearch" />
          </div>
          <NotificationCenter />
          <el-dropdown trigger="click" placement="bottom-end">
            <div class="header-avatar">
              <div class="header-avatar-circle">{{ userInitial }}</div>
              <div class="header-user-info">
                <span class="header-username">{{ username }}</span>
                <span class="header-role">{{ roleLabel }}</span>
              </div>
              <el-icon class="avatar-chevron"><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-if="isStaff" @click="goSettings"><el-icon><Setting /></el-icon> 个人设置</el-dropdown-item>
                <el-dropdown-item :divided="isStaff" @click="handleLogout">
                  <el-icon style="color: var(--danger)"><SwitchButton /></el-icon>
                  <span style="color: var(--danger)">退出登录</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="page-fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/store/user'
import NotificationCenter from './NotificationCenter.vue'
import {
  Odometer, Collection, Tickets, User, DataAnalysis,
  ChatDotRound, Setting, SwitchButton, Search, ArrowDown, EditPen
} from '@element-plus/icons-vue'

const router = useRouter()
const route  = useRoute()
const userStore = useUserStore()

const isStaff = computed(() => ['admin', 'librarian'].includes(userStore.user?.role || ''))

const navItems = computed(() => {
  const role = userStore.user?.role || ''
  const items = [
    { name: 'dashboard',  label: '控制台',   path: '/dashboard',    icon: Odometer },
    { name: 'books',      label: '图书管理', path: '/books',        icon: Collection },
    { name: 'borrowing',  label: '借阅管理', path: '/borrowing',    icon: Tickets },
  ]
  if (isStaff.value) items.push({ name: 'readers',    label: '读者管理', path: '/readers',      icon: User })
  items.push(                    { name: 'notes',      label: '读书笔记', path: '/notes',        icon: EditPen })
  items.push(                    { name: 'ai',         label: 'AI 助手',  path: '/ai-assistant', icon: ChatDotRound })
  if (isStaff.value) items.push({ name: 'statistics', label: '统计分析', path: '/statistics',   icon: DataAnalysis })
  if (isStaff.value) items.push({ name: 'settings',   label: '系统设置', path: '/settings',     icon: Setting })
  return items
})

const isActive = (path: string) => {
  if (path === '/dashboard') return route.path === '/dashboard'
  return route.path.startsWith(path)
}

const username = computed(() => userStore.user?.name || userStore.user?.username || '用户')
const userInitial = computed(() => (userStore.user?.name || userStore.user?.username || 'U')[0].toUpperCase())
const roleLabel = computed(() => {
  const map: Record<string, string> = {
    admin: '管理员', librarian: '图书管理员',
    teacher: '教师', student: '学生', reader: '读者'
  }
  return map[userStore.user?.role || ''] || userStore.user?.role || '用户'
})

const titleMap: Record<string, string> = {
  '/dashboard': '控制台', '/books': '图书管理', '/borrowing': '借阅管理',
  '/readers': '读者管理', '/statistics': '统计分析', '/notes': '读书笔记', '/ai-assistant': 'AI 助手', '/settings': '系统设置',
}
const currentPageTitle = computed(() => {
  for (const [key, val] of Object.entries(titleMap)) {
    if (key === '/dashboard' ? route.path === key : route.path.startsWith(key)) return val
  }
  return '图书馆'
})

const todayStr = computed(() => {
  const d = new Date()
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
})

const globalSearch = ref('')
const handleGlobalSearch = () => {
  if (globalSearch.value.trim()) {
    router.push({ path: '/books', query: { search: globalSearch.value.trim() } })
    globalSearch.value = ''
  }
}

const goSettings  = () => router.push('/settings')
const handleLogout = () => { userStore.logout(); router.push('/login') }
</script>

<style scoped>
.app-shell {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: transparent;
  position: relative;
}

/* ════════════════════════════════════════════
   Background Decorative Orbs
   ════════════════════════════════════════════ */
.bg-orb {
  position: fixed;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
  z-index: 0;
}
.orb-1 {
  width: 700px; height: 700px;
  background: rgba(200, 16, 46, 0.18);
  top: -15%; right: -5%;
  animation: orbDrift 25s ease-in-out infinite;
}
.orb-2 {
  width: 600px; height: 600px;
  background: rgba(124, 58, 237, 0.16);
  bottom: -10%; left: 10%;
  animation: orbDrift 30s ease-in-out infinite reverse;
}
.orb-3 {
  width: 450px; height: 450px;
  background: rgba(14, 165, 233, 0.12);
  top: 30%; left: 50%;
  animation: orbDrift 22s ease-in-out infinite 5s;
}
@keyframes orbDrift {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33%      { transform: translate(30px, -25px) scale(1.05); }
  66%      { transform: translate(-20px, 20px) scale(0.95); }
}

/* ════════════════════════════════════════════
   Floating Glassmorphic Sidebar
   ════════════════════════════════════════════ */
.floating-sidebar {
  position: fixed;
  left: 14px;
  top: 14px;
  bottom: 14px;
  width: var(--sidebar-width);
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 0;
  transition: box-shadow 0.3s ease;
}
.floating-sidebar:hover {
  box-shadow: 0 8px 40px rgba(28, 16, 51, 0.12);
}

.glass-sidebar {
  background: rgba(255, 255, 255, 0.42);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.45);
  border-radius: 22px;
  box-shadow: 0 4px 30px rgba(28, 16, 51, 0.08);
}

.sidebar-logo { margin-bottom: 28px; }
.logo-mark {
  width: 40px; height: 40px;
  background: var(--gradient-brand); border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 16px rgba(200, 16, 46, 0.30);
  animation: logoGlow 4s ease-in-out infinite;
}
@keyframes logoGlow {
  0%, 100% { box-shadow: 0 4px 16px rgba(200, 16, 46, 0.30); }
  50%      { box-shadow: 0 4px 24px rgba(200, 16, 46, 0.45), 0 0 12px rgba(200, 16, 46, 0.10); }
}
.logo-g { color: #fff; font-size: 22px; font-weight: 800; font-family: var(--font-sans); letter-spacing: -1px; }

.sidebar-nav {
  display: flex; flex-direction: column; align-items: center;
  gap: 4px; flex: 1; width: 100%; padding: 0 12px;
}
.nav-item {
  width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;
  border-radius: 14px; color: var(--text-muted); text-decoration: none;
  position: relative; cursor: pointer; border: none; background: transparent;
  font-size: inherit; transition: background 0.18s ease, color 0.18s ease;
}
.nav-item:hover { background: rgba(200, 16, 46, 0.06); color: var(--gdut-red); }
.nav-item.active { background: rgba(200, 16, 46, 0.08); color: var(--gdut-red); }
.nav-icon { font-size: 20px; }
.nav-indicator {
  position: absolute; left: -12px; top: 50%; transform: translateY(-50%);
  width: 4px; height: 28px; background: var(--gradient-brand); border-radius: 0 4px 4px 0;
}

.sidebar-bottom {
  display: flex; flex-direction: column; align-items: center;
  gap: 4px; width: 100%; padding: 0 12px;
}
.nav-avatar {
  width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;
  cursor: pointer; border-radius: 14px; transition: background 0.18s;
}
.nav-avatar:hover { background: rgba(124, 58, 237, 0.06); }
.nav-avatar.non-staff { cursor: default; }
.nav-avatar.non-staff:hover { background: transparent; }
.avatar-circle {
  width: 34px; height: 34px; border-radius: 10px;
  background: var(--gradient-brand); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 15px; font-weight: 700; font-family: var(--font-sans);
}
.logout-btn { color: var(--text-muted); }
.logout-btn:hover { background: rgba(220, 38, 38, 0.06) !important; color: var(--danger) !important; }

/* ════════════════════════════════════════════
   Main Area
   ════════════════════════════════════════════ */
.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100vh;
  overflow: hidden;
  margin-left: calc(var(--sidebar-width) + 28px);
  padding: 14px 14px 0 0;
}

/* Glassmorphic Header — floating with rounded corners */
.glass-header {
  height: 64px; min-height: 64px;
  background: rgba(255, 255, 255, 0.40);
  backdrop-filter: blur(18px) saturate(180%);
  -webkit-backdrop-filter: blur(18px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.40);
  border-radius: 18px;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 28px; z-index: 50;
  margin: 0 18px 0 0;
  box-shadow: 0 2px 20px rgba(28, 16, 51, 0.05);
  transition: box-shadow 0.3s ease;
}
.glass-header:hover {
  box-shadow: 0 4px 28px rgba(28, 16, 51, 0.08);
}
.header-left { display: flex; flex-direction: column; gap: 2px; }
.header-title { font-size: 20px; font-weight: 700; color: var(--text-primary); letter-spacing: -0.3px; line-height: 1; }
.header-date { font-size: 12px; color: var(--text-muted); line-height: 1; }

.header-right { display: flex; align-items: center; gap: 12px; }

.header-search { position: relative; display: flex; align-items: center; }
.search-icon-h { position: absolute; left: 12px; color: var(--text-muted); font-size: 15px; pointer-events: none; }
.header-search input {
  width: 240px; height: 38px; padding: 0 14px 0 36px;
  border: 1.5px solid var(--border-color); border-radius: var(--radius-input);
  font-size: 13px; font-family: var(--font-sans);
  background: rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(8px);
  color: var(--text-primary); outline: none;
  transition: border-color 0.2s, box-shadow 0.2s, width 0.25s, background 0.2s;
}
.header-search input:focus {
  border-color: var(--gdut-red);
  box-shadow: 0 0 0 3px rgba(200, 16, 46, 0.08);
  width: 280px;
  background: rgba(255, 255, 255, 0.7);
}
.header-search input::placeholder { color: var(--text-muted); }

.header-icon-btn {
  width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;
  border-radius: 10px; border: 1.5px solid var(--border-color);
  background: rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(8px);
  cursor: pointer; font-size: 16px; color: var(--text-secondary); transition: all 0.18s;
}
.header-icon-btn:hover { border-color: var(--gdut-red); color: var(--gdut-red); background: rgba(200, 16, 46, 0.06); }

.header-avatar {
  display: flex; align-items: center; gap: 10px; cursor: pointer;
  padding: 6px 12px 6px 8px; border-radius: 12px;
  border: 1.5px solid var(--border-color);
  background: rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(8px);
  transition: all 0.18s;
}
.header-avatar:hover { border-color: var(--gdut-red); background: rgba(200, 16, 46, 0.04); }
.header-avatar-circle {
  width: 32px; height: 32px; border-radius: 9px; background: var(--gradient-brand);
  color: #fff; display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700; font-family: var(--font-sans);
}
.header-user-info { display: flex; flex-direction: column; gap: 1px; }
.header-username { font-size: 13px; font-weight: 600; color: var(--text-primary); line-height: 1; }
.header-role { font-size: 11px; color: var(--text-muted); line-height: 1; }
.avatar-chevron { font-size: 12px; color: var(--text-muted); }

.main-content {
  flex: 1; overflow-y: auto; padding: 20px 28px 28px 18px; position: relative; z-index: 1;
}

/* Responsive */
@media (max-width: 900px) {
  .floating-sidebar {
    left: 8px; top: 8px; bottom: 8px;
  }
  .main-area {
    margin-left: calc(var(--sidebar-width) + 20px);
    padding: 10px 10px 0 0;
  }
  .main-content {
    padding: 16px 12px;
  }
  .glass-header {
    margin-right: 8px;
    padding: 0 16px;
    border-radius: 14px;
  }
}
</style>
