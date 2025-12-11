<template>
  <div class="login-container">
    <div class="background-blobs">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
    </div>

    <!-- 新增：背景图片层，与渐变点融合 -->
    <div class="background-image"></div>

    <div class="login-box glass-card">
      <div class="login-left">
        <div class="brand">
          <div class="logo-icon">
            <el-icon>
              <Reading />
            </el-icon>
          </div>
          <h1>LMS</h1>
          <p>智能图书管理系统</p>
        </div>
      </div>

      <div class="login-right">
        <h2>欢迎回来</h2>
        <p class="subtitle">请登录您的账号以继续</p>

        <el-form ref="formRef" :model="form" class="login-form">
          <el-form-item>
            <el-input v-model="form.username" placeholder="请输入账号" :prefix-icon="User" size="large" />
          </el-form-item>
          <el-form-item>
            <el-input v-model="form.password" type="password" placeholder="请输入密码" :prefix-icon="Lock" show-password
              size="large" />
          </el-form-item>

          <el-button type="primary" :loading="loading" class="submit-btn" size="large" @click="handleLogin">
            {{ loading ? '登录中...' : '立即登录' }}
          </el-button>
        </el-form>

        <div class="footer-actions">
          <span class="tip">默认账号: admin / admin123</span>
          <el-button link type="primary" @click="$router.push('/register')">注册新账号</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { User, Lock, Reading } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/user'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const form = ref({ username: '', password: '' })

const handleLogin = async () => {
  if (!form.value.username || !form.value.password) return
  loading.value = true
  try {
    // 调用 store 中的 login action
    await userStore.login(form.value)
    ElMessage.success('登录成功')
    router.push('/dashboard')
  } catch (error: any) {
    console.error('Login failed:', error)
    ElMessage.error(error.message || '登录失败，请检查账号密码')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: #f8fafc;
}

.background-blobs .blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.6;
  animation: float 10s infinite ease-in-out;
}

/* 背景图片层 - 与渐变点融合 */
.background-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image:
    /* 渐变叠加层 - 与现有blob颜色融合 */
    linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(244, 114, 182, 0.3) 100%),
    /* 背景图片 */
    url('https://library.gdut.edu.cn/images/bannar2401.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-blend-mode: overlay; /* 混合模式实现融合效果 */
  opacity: 0.5; /* 较明显的透明度 */
  z-index: 2; /* 在blobs之上(z-index: 1)，在登录框之下 */
  filter: blur(1px) brightness(1.1); /* 轻微模糊和亮度调整 */
  pointer-events: none; /* 防止干扰交互 */
}

.blob-1 {
  width: 500px;
  height: 500px;
  background: #818cf8;
  top: -100px;
  left: -100px;
}

.blob-2 {
  width: 400px;
  height: 400px;
  background: #f472b6;
  bottom: -50px;
  right: -50px;
  animation-delay: -5s;
}

.login-box {
  display: flex;
  width: 900px;
  height: 520px;
  z-index: 10;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.8);
}

.login-left {
  flex: 1;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  position: relative;
}

.brand {
  text-align: center;
  z-index: 2;
}

.logo-icon {
  font-size: 48px;
  margin-bottom: 16px;
  background: rgba(255, 255, 255, 0.2);
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  backdrop-filter: blur(4px);
}

.login-right {
  flex: 1.2;
  padding: 60px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: rgba(255, 255, 255, 0.8);
}

.login-right h2 {
  font-size: 28px;
  margin-bottom: 8px;
  color: #1e293b;
}

.subtitle {
  color: #94a3b8;
  margin-bottom: 40px;
}

.submit-btn {
  width: 100%;
  margin-top: 10px;
  height: 44px;
  font-size: 16px;
}

.footer-actions {
  margin-top: 24px;
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #94a3b8;
}

.tip {
  opacity: 0.7;
}
</style>
