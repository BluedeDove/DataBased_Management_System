<template>
  <div class="login-page">
    <div class="login-card">
      <div class="hero">
        <div class="hero-badge">AI Library</div>
        <h1>AI 智能图书馆</h1>
        <p>学生 / 教师默认进入对话式找书与预约入口，机器账号进入实体书自助借还终端。</p>

        <div class="hero-points">
          <div class="point">
            <span class="point-title">学生 / 教师</span>
            <span class="point-desc">AI 搜索、推荐、预约、借阅查询、归还后传承笔记</span>
          </div>
          <div class="point">
            <span class="point-title">机器终端</span>
            <span class="point-desc">单册条码级借书 / 还书，避免线上误借实体书</span>
          </div>
        </div>
      </div>

      <div class="form-panel">
        <div class="form-header">
          <h2>登录账号</h2>
          <p>进入你的智能图书馆工作台</p>
        </div>

        <el-form :model="form" class="login-form" @submit.prevent="handleLogin">
          <el-form-item>
            <el-input v-model="form.username" size="large" placeholder="请输入账号" @keyup.enter="handleLogin">
              <template #prefix><el-icon><User /></el-icon></template>
            </el-input>
          </el-form-item>

          <el-form-item>
            <el-input
              v-model="form.password"
              size="large"
              type="password"
              show-password
              placeholder="请输入密码"
              @keyup.enter="handleLogin"
            >
              <template #prefix><el-icon><Lock /></el-icon></template>
            </el-input>
          </el-form-item>

          <button class="submit-btn" type="submit" :disabled="loading" @click.prevent="handleLogin">
            <span v-if="loading">登录中...</span>
            <span v-else>登录</span>
          </button>
        </el-form>

        <div class="helper-row">
          <button class="link-btn" @click="goRegister">没有账号？立即注册</button>
          <span class="machine-tip">机器演示账号：`machine01 / machine123`</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { User, Lock } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/user'
import { getHomeRoute } from '@/utils/homeRoute'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const loading = ref(false)
const form = reactive({
  username: '',
  password: ''
})

const goRegister = () => router.push('/register')

const handleLogin = async () => {
  if (!form.username.trim()) {
    ElMessage.warning('请输入账号。')
    return
  }

  if (!form.password.trim()) {
    ElMessage.warning('请输入密码。')
    return
  }

  loading.value = true
  try {
    await userStore.login({
      username: form.username.trim(),
      password: form.password
    })

    ElMessage.success('登录成功。')
    const redirect = (route.query.redirect as string) || getHomeRoute(userStore.user?.role)
    await router.push(redirect)
  } catch (error: any) {
    ElMessage.error(error?.message || '登录失败，请检查账号和密码。')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #7c2d12 100%);
}

.login-card {
  width: min(1120px, 100%);
  min-height: 620px;
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  overflow: hidden;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 30px 60px rgba(15, 23, 42, 0.32);
}

.hero {
  padding: 56px 48px;
  color: #fff;
  background: linear-gradient(135deg, #c8102e 0%, #7c3aed 50%, #2563eb 100%);
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.18);
}

.hero h1 {
  margin: 20px 0 14px;
  font-size: 40px;
}

.hero p {
  margin: 0;
  font-size: 16px;
  line-height: 1.8;
  opacity: 0.95;
}

.hero-points {
  margin-top: 40px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.point {
  padding: 18px 20px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(12px);
}

.point-title {
  display: block;
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 8px;
}

.point-desc {
  font-size: 14px;
  line-height: 1.7;
  opacity: 0.95;
}

.form-panel {
  padding: 56px 42px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.form-header h2 {
  margin: 0 0 10px;
  font-size: 30px;
  color: #0f172a;
}

.form-header p {
  margin: 0 0 28px;
  color: #64748b;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.submit-btn {
  width: 100%;
  height: 48px;
  border: none;
  border-radius: 16px;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  background: linear-gradient(135deg, #c8102e 0%, #7c3aed 100%);
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.helper-row {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.link-btn {
  align-self: flex-start;
  padding: 0;
  border: none;
  background: transparent;
  color: #7c3aed;
  cursor: pointer;
}

.machine-tip {
  font-size: 13px;
  color: #64748b;
}

@media (max-width: 960px) {
  .login-card {
    grid-template-columns: 1fr;
  }

  .hero,
  .form-panel {
    padding: 32px 24px;
  }
}
</style>
