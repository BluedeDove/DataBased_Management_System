<template>
  <el-container class="layout-container">
    <el-aside width="240px" class="glass-sidebar">
      <div class="logo-area">
        <el-icon :size="24" color="#6366f1">
          <Reading />
        </el-icon>
        <span class="app-name">智能图书馆</span>
      </div>

      <el-menu :default-active="route.path" router class="custom-menu" background-color="transparent"
        text-color="#64748b" active-text-color="#6366f1">
        <el-menu-item index="/dashboard">
          <el-icon>
            <Odometer />
          </el-icon><span>控制台</span>
        </el-menu-item>
        <el-menu-item index="/books">
          <el-icon>
            <Collection />
          </el-icon><span>图书管理</span>
        </el-menu-item>
        <el-menu-item index="/ai-assistant">
          <el-icon>
            <MagicStick />
          </el-icon><span>AI 助手</span>
        </el-menu-item>
        <el-menu-item v-if="hasPermission(['admin', 'librarian'])" index="/readers">
          <el-icon>
            <User />
          </el-icon><span>读者管理</span>
        </el-menu-item>
        <el-menu-item index="/borrowing">
          <el-icon>
            <Notebook />
          </el-icon><span>借阅管理</span>
        </el-menu-item>
        <el-menu-item v-if="hasPermission(['admin', 'librarian'])" index="/statistics">
          <el-icon>
            <TrendCharts />
          </el-icon><span>统计分析</span>
        </el-menu-item>
        <el-menu-item v-if="hasPermission(['admin', 'librarian'])" index="/settings">
          <el-icon>
            <Setting />
          </el-icon><span>系统设置</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="glass-header">
        <div class="header-content">
          <h2 class="current-title">{{ route.meta.title || '首页' }}</h2>
          <div class="user-profile">
            <el-avatar :size="36" class="user-avatar">{{ userStore.user?.name?.charAt(0) }}</el-avatar>
            <span class="username">{{ userStore.user?.name }}</span>
            <el-button link type="danger" @click="logout">退出</el-button>
          </div>
        </div>
      </el-header>

      <el-main class="main-content">
        <!-- 核心：过渡动画 + 缓存 -->
        <router-view v-slot="{ Component }">
          <transition name="fade-slide" mode="out-in">
            <keep-alive include="AIAssistant">
              <component :is="Component" />
            </keep-alive>
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
// 路径修正：@ 指向 src/renderer/src，文件夹是 store
import { useUserStore } from '@/store/user'
import { Reading, Odometer, Collection, MagicStick, User, Notebook, TrendCharts, Setting } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
import { computed } from 'vue'
const userStore = useUserStore()

// 权限检查
const hasPermission = (roles: string[]) => {
  const userRole = userStore.user?.role
  if (!userRole) return false
  return roles.includes(userRole)
}

const logout = async () => {
  await userStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

.glass-sidebar {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border-right: 1px solid rgba(255, 255, 255, 0.6);
  display: flex;
  flex-direction: column;
}

.logo-area {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 700;
  color: #333;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.custom-menu {
  border-right: none;
  padding: 10px;
}

.custom-menu :deep(.el-menu-item) {
  border-radius: 8px;
  margin-bottom: 4px;
}

.custom-menu :deep(.el-menu-item.is-active) {
  background: rgba(99, 102, 241, 0.1);
  font-weight: 600;
}

.glass-header {
  height: 64px;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.5);
  padding: 0 24px;
}

.header-content {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.current-title {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  background: linear-gradient(135deg, #6366f1, #818cf8);
  color: white;
}

.username {
  font-size: 14px;
  font-weight: 500;
}

.main-content {
  padding: 0;
}
</style>
