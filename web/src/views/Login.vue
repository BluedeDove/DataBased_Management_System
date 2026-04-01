<template>
  <div class="login-page">
    <!-- ═══════════════ 左半：品牌区 ═══════════════ -->
    <div class="brand-side">
      <!-- 多层背景光晕 -->
      <div class="halo halo-red" />
      <div class="halo halo-purple" />
      <div class="halo halo-blue" />
      <div class="halo halo-accent" />

      <!-- 网格背景 -->
      <div class="grid-bg" />

      <!-- 扫描线 -->
      <div class="scanline" />

      <div class="brand-content">
        <!-- Logo Mark — 带呼吸脉冲 -->
        <div class="logo-mark">
          <div class="logo-pulse" />
          <div class="logo-ring">
            <span class="logo-letter">G</span>
          </div>
        </div>

        <h1 class="brand-title">
          广东工业大学<br />
          <span class="brand-highlight">智能图书馆管理系统</span>
        </h1>

        <!-- CSS-only 装饰书籍插图 — 更灵动 -->
        <div class="book-illustration">
          <div class="bookshelf">
            <div class="book book-1" />
            <div class="book book-2" />
            <div class="book book-3" />
            <div class="book book-4" />
            <div class="book book-5" />
            <div class="book book-6" />
            <div class="shelf-line" />
          </div>
        </div>

        <!-- 标语 -->
        <div class="tagline-block">
          <p class="tagline">知识就在指尖</p>
          <p class="tagline-desc">
            集图书管理、智能检索、数据统计于一体的现代化图书馆管理平台
          </p>
        </div>

        <!-- 底部统计条 — 磨砂玻璃 -->
        <div class="stats-bar">
          <div class="stats-item">
            <span class="stats-num">50,000+</span>
            <span class="stats-label">馆藏</span>
          </div>
          <div class="stats-divider" />
          <div class="stats-item">
            <span class="stats-num">8,000+</span>
            <span class="stats-label">读者</span>
          </div>
          <div class="stats-divider" />
          <div class="stats-item">
            <span class="stats-num">99.9%</span>
            <span class="stats-label">可用</span>
          </div>
        </div>
      </div>

      <!-- 浮动装饰粒子 — 更多更灵动 -->
      <div class="particle p1" />
      <div class="particle p2" />
      <div class="particle p3" />
      <div class="particle p4" />
      <div class="particle p5" />
      <div class="particle p6" />
      <div class="particle p7" />
      <div class="particle p8" />
    </div>

    <!-- ═══════════════ 右半：登录卡片 ═══════════════ -->
    <div class="form-side">
      <!-- 多层背景光晕 — 更强 -->
      <div class="form-halo form-halo-red" />
      <div class="form-halo form-halo-purple" />
      <div class="form-halo form-halo-blue" />

      <!-- 浮动光点 -->
      <div class="form-particle fp1" />
      <div class="form-particle fp2" />
      <div class="form-particle fp3" />

      <div class="login-card">
        <!-- 顶部彩色装饰条 -->
        <div class="card-top-bar" />

        <!-- 卡片标题 -->
        <div class="card-header">
          <div class="card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
            </svg>
          </div>
          <div>
            <h2 class="card-title">欢迎回来</h2>
            <p class="card-subtitle">登录您的账号以继续使用</p>
          </div>
        </div>

        <!-- 登录表单 -->
        <el-form
          ref="formRef"
          :model="form"
          class="login-form"
          @submit.prevent="handleLogin"
        >
          <!-- 用户名 -->
          <div class="field-group">
            <label class="field-label">账号</label>
            <el-input
              v-model="form.username"
              placeholder="请输入您的账号"
              size="large"
              clearable
              @keyup.enter="handleLogin"
            >
              <template #prefix>
                <el-icon><User /></el-icon>
              </template>
            </el-input>
          </div>

          <!-- 密码 -->
          <div class="field-group">
            <label class="field-label">密码</label>
            <el-input
              v-model="form.password"
              type="password"
              placeholder="请输入您的密码"
              size="large"
              show-password
              @keyup.enter="handleLogin"
            >
              <template #prefix>
                <el-icon><Lock /></el-icon>
              </template>
            </el-input>
          </div>

          <!-- 记住我 & 注册链接 -->
          <div class="form-options">
            <label class="remember-me">
              <input v-model="form.remember" type="checkbox" class="checkbox-input" />
              <span class="checkbox-custom" />
              <span class="checkbox-label">记住我</span>
            </label>
            <button type="button" class="register-link" @click="goRegister">
              没有账号？立即注册
            </button>
          </div>

          <!-- 提交按钮 -->
          <button
            type="submit"
            class="submit-btn"
            :class="{ 'is-loading': loading }"
            :disabled="loading"
            @click.prevent="handleLogin"
          >
            <template v-if="!loading">
              <span>登 录</span>
              <svg class="btn-arrow" viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                <path fill-rule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" />
              </svg>
            </template>
            <template v-else>
              <span class="spinner" />
              <span>登录中...</span>
            </template>
          </button>
        </el-form>

      </div>

      <!-- 底部版权 -->
      <p class="copyright">&copy; 2026 广东工业大学 计算机学院 &middot; 数据库课程设计</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { User, Lock, Loading, Right, InfoFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { authApi } from '../api/auth.api'
import { useUserStore } from '@/store/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const loading = ref(false)
const formRef = ref()
const form = reactive({
  username: '',
  password: '',
  remember: false
})

const goRegister = () => {
  router.push('/register')
}

const handleLogin = async () => {
  if (!form.username.trim()) {
    ElMessage.warning('请输入账号')
    return
  }
  if (!form.password.trim()) {
    ElMessage.warning('请输入密码')
    return
  }

  loading.value = true
  try {
    await userStore.login({ username: form.username, password: form.password })
    ElMessage.success('登录成功，欢迎回来！')
    const redirect = (route.query.redirect as string) || '/dashboard'
    router.push(redirect)
  } catch (error: any) {
    ElMessage.error(error?.message || '登录失败，请检查账号密码')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* ══════════════════════════════════════════════════
   页面根容器 — 全屏分栏布局
   ══════════════════════════════════════════════════ */
.login-page {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  font-family: var(--font-sans);
}

/* ══════════════════════════════════════════════════
   左半 — 品牌区（深色主题）
   ══════════════════════════════════════════════════ */
.brand-side {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(160deg, #0A0618 0%, #1C1033 50%, #2D1B69 100%);
  overflow: hidden;
}

/* 网格背景 */
.grid-bg {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 48px 48px;
  animation: gridDrift 80s linear infinite;
  z-index: 0;
}
@keyframes gridDrift {
  0% { background-position: 0 0; }
  100% { background-position: 48px 48px; }
}

/* 扫描线 */
.scanline {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 2px;
  background: linear-gradient(90deg, transparent, rgba(200,16,46,0.5), rgba(124,58,237,0.3), transparent);
  animation: scanDown 6s linear infinite;
  z-index: 1;
  pointer-events: none;
}
@keyframes scanDown {
  0% { top: -2px; opacity: 1; }
  90% { opacity: 0.2; }
  100% { top: 100%; opacity: 0; }
}

/* 背景光晕 — 更大更亮 */
.halo {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  pointer-events: none;
}
.halo-red {
  width: 600px; height: 600px;
  background: rgba(200, 16, 46, 0.22);
  top: -15%; left: -10%;
  animation: haloDrift 14s ease-in-out infinite;
}
.halo-purple {
  width: 500px; height: 500px;
  background: rgba(124, 58, 237, 0.18);
  bottom: -10%; right: -8%;
  animation: haloDrift 18s ease-in-out infinite reverse;
}
.halo-blue {
  width: 350px; height: 350px;
  background: rgba(59, 130, 246, 0.10);
  top: 50%; left: 30%;
  animation: haloDrift 12s ease-in-out infinite 3s;
}
.halo-accent {
  width: 250px; height: 250px;
  background: rgba(236, 72, 153, 0.08);
  top: 20%; right: 20%;
  animation: haloDrift 15s ease-in-out infinite 6s;
}
@keyframes haloDrift {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33%      { transform: translate(30px, -20px) scale(1.08); }
  66%      { transform: translate(-20px, 25px) scale(0.92); }
}

/* 浮动粒子 — 更多，多形状 */
.particle {
  position: absolute;
  border-radius: 50%;
  background: rgba(200, 16, 46, 0.4);
  pointer-events: none;
}
.p1 { width: 4px; height: 4px; top: 15%; left: 10%; animation: floatUp 7s ease-in-out infinite; }
.p2 { width: 3px; height: 3px; top: 70%; left: 20%; animation: floatUp 9s ease-in-out infinite 1.5s; background: rgba(124, 58, 237, 0.5); }
.p3 { width: 5px; height: 5px; top: 25%; right: 12%; animation: floatUp 11s ease-in-out infinite 3s; }
.p4 { width: 3px; height: 3px; top: 80%; right: 18%; animation: floatUp 8s ease-in-out infinite 0.5s; background: rgba(124, 58, 237, 0.4); }
.p5 { width: 6px; height: 6px; top: 40%; left: 45%; animation: floatUp 10s ease-in-out infinite 2s; background: rgba(59, 130, 246, 0.3); }
.p6 { width: 4px; height: 4px; top: 60%; right: 35%; animation: floatUp 12s ease-in-out infinite 4s; background: rgba(236, 72, 153, 0.3); }
.p7 { width: 3px; height: 3px; top: 10%; left: 55%; animation: floatUp 8s ease-in-out infinite 1s; background: rgba(16, 185, 129, 0.4); }
.p8 { width: 5px; height: 5px; top: 90%; left: 65%; animation: floatUp 9s ease-in-out infinite 2.5s; background: rgba(245, 158, 11, 0.3); }
@keyframes floatUp {
  0%, 100% { transform: translateY(0) scale(1); opacity: 0.4; }
  50%      { transform: translateY(-25px) scale(1.3); opacity: 1; }
}

/* 品牌内容 */
.brand-content {
  position: relative;
  z-index: 2;
  max-width: 440px;
  padding: 40px;
}

/* Logo 标记 — 呼吸脉冲 */
.logo-mark {
  margin-bottom: 32px;
  position: relative;
  width: 68px;
  height: 68px;
}
.logo-pulse {
  position: absolute;
  inset: -8px;
  border-radius: 22px;
  background: rgba(200, 16, 46, 0.15);
  animation: logoPulse 3s ease-in-out infinite;
}
@keyframes logoPulse {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50%      { transform: scale(1.15); opacity: 0; }
}
.logo-ring {
  position: relative;
  width: 68px;
  height: 68px;
  border-radius: 18px;
  background: var(--gradient-brand);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 32px rgba(200, 16, 46, 0.40), 0 0 0 1px rgba(255,255,255,0.1) inset;
  animation: logoFloat 6s ease-in-out infinite;
}
@keyframes logoFloat {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-6px); }
}
.logo-letter {
  font-size: 32px;
  font-weight: 800;
  color: #fff;
  line-height: 1;
  letter-spacing: -1px;
}

/* 品牌标题 */
.brand-title {
  font-size: 30px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.92);
  line-height: 1.35;
  margin: 0 0 8px;
  letter-spacing: -0.3px;
}
.brand-highlight {
  background: linear-gradient(135deg, #C8102E 0%, #F87171 40%, #A78BFA 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* ═══ CSS-only 书籍插图 — 更灵动 ═══ */
.book-illustration {
  margin: 36px 0 32px;
  padding: 28px 20px 12px;
  position: relative;
}
.bookshelf {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  position: relative;
}
.book {
  border-radius: 2px 4px 4px 2px;
  position: relative;
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.book:hover {
  transform: translateY(-12px) rotate(-3deg) !important;
}
.book::after {
  content: '';
  position: absolute;
  left: 3px;
  top: 4px;
  bottom: 4px;
  width: 1px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 1px;
}

.book-1 {
  width: 18px; height: 58px;
  background: linear-gradient(180deg, #C8102E, #A50E26);
  animation: bookTilt 6s ease-in-out infinite;
  box-shadow: 0 4px 12px rgba(200,16,46,0.30);
}
.book-2 {
  width: 14px; height: 68px;
  background: linear-gradient(180deg, #7C3AED, #6D28D9);
  animation: bookTilt 7s ease-in-out infinite 0.5s;
  box-shadow: 0 4px 12px rgba(124,58,237,0.30);
}
.book-3 {
  width: 20px; height: 52px;
  background: linear-gradient(180deg, #3B82F6, #2563EB);
  animation: bookTilt 5s ease-in-out infinite 1s;
  box-shadow: 0 4px 12px rgba(59,130,246,0.30);
}
.book-4 {
  width: 12px; height: 72px;
  background: linear-gradient(180deg, #F59E0B, #D97706);
  animation: bookTilt 8s ease-in-out infinite 1.5s;
  box-shadow: 0 4px 12px rgba(245,158,11,0.30);
}
.book-5 {
  width: 16px; height: 60px;
  background: linear-gradient(180deg, #10B981, #059669);
  animation: bookTilt 6s ease-in-out infinite 2s;
  box-shadow: 0 4px 12px rgba(16,185,129,0.30);
}
.book-6 {
  width: 22px; height: 48px;
  background: linear-gradient(180deg, #EC4899, #DB2777);
  animation: bookTilt 7s ease-in-out infinite 2.5s;
  box-shadow: 0 4px 12px rgba(236,72,153,0.30);
}

@keyframes bookTilt {
  0%, 100% { transform: rotate(0deg) translateY(0); }
  25%      { transform: rotate(-2deg) translateY(-3px); }
  75%      { transform: rotate(1deg) translateY(-1px); }
}

.shelf-line {
  position: absolute;
  bottom: -6px;
  left: -4px;
  right: -4px;
  height: 4px;
  background: linear-gradient(90deg,
    rgba(255, 255, 255, 0.04),
    rgba(255, 255, 255, 0.15),
    rgba(255, 255, 255, 0.04)
  );
  border-radius: 2px;
}

/* 标语 */
.tagline-block { margin-bottom: 36px; }
.tagline {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 8px;
  letter-spacing: 2px;
}
.tagline-desc {
  font-size: 13px;
  line-height: 1.7;
  color: rgba(148, 163, 184, 0.7);
  margin: 0;
  max-width: 360px;
}

/* 统计条 — 磨砂 */
.stats-bar {
  display: flex;
  align-items: center;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 16px;
  backdrop-filter: blur(12px) saturate(150%);
  -webkit-backdrop-filter: blur(12px) saturate(150%);
  transition: all 0.3s ease;
}
.stats-bar:hover {
  background: rgba(255, 255, 255, 0.10);
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateY(-2px);
}
.stats-item { flex: 1; text-align: center; display: flex; flex-direction: column; gap: 2px; }
.stats-num {
  font-size: 18px; font-weight: 800;
  background: linear-gradient(135deg, #F87171, #C8102E, #A78BFA);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.stats-label { font-size: 11px; color: rgba(148, 163, 184, 0.5); letter-spacing: 1px; }
.stats-divider { width: 1px; height: 28px; background: rgba(255, 255, 255, 0.08); }

/* ══════════════════════════════════════════════════
   右半 — 登录表单区（带背景渐变）
   ══════════════════════════════════════════════════ */
.form-side {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(160deg, #FAF8F5 0%, #F0EDE6 40%, #E8E2D8 100%);
  overflow: hidden;
}

/* 右侧背景光晕 */
.form-halo {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  pointer-events: none;
}
.form-halo-red {
  width: 450px; height: 450px;
  background: rgba(200, 16, 46, 0.14);
  top: -12%; right: -8%;
  animation: haloDrift 16s ease-in-out infinite;
}
.form-halo-purple {
  width: 400px; height: 400px;
  background: rgba(124, 58, 237, 0.12);
  bottom: -10%; left: -10%;
  animation: haloDrift 20s ease-in-out infinite reverse;
}
.form-halo-blue {
  width: 300px; height: 300px;
  background: rgba(14, 165, 233, 0.08);
  top: 50%; right: 20%;
  animation: haloDrift 14s ease-in-out infinite 4s;
}

/* 浮动光点 */
.form-particle {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}
.fp1 { width: 80px; height: 80px; background: rgba(200,16,46,0.06); top: 20%; right: 30%; animation: fpFloat 10s ease-in-out infinite; }
.fp2 { width: 60px; height: 60px; background: rgba(124,58,237,0.05); bottom: 25%; left: 20%; animation: fpFloat 12s ease-in-out infinite 3s; }
.fp3 { width: 100px; height: 100px; background: rgba(14,165,233,0.04); top: 60%; right: 10%; animation: fpFloat 8s ease-in-out infinite 1s; }
@keyframes fpFloat {
  0%, 100% { transform: translate(0,0) scale(1); opacity: 0.6; }
  50%      { transform: translate(15px,-20px) scale(1.1); opacity: 1; }
}

/* ═══ 登录卡片 — 磨砂玻璃 ═══ */
.login-card {
  position: relative;
  z-index: 2;
  width: 480px;
  padding: 0 0 0 0;
  background: rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(24px) saturate(200%);
  -webkit-backdrop-filter: blur(24px) saturate(200%);
  border: 1px solid rgba(255, 255, 255, 0.40);
  border-radius: 24px;
  box-shadow:
    0 20px 60px rgba(28, 16, 51, 0.12),
    0 0 0 1px rgba(255,255,255,0.3) inset;
  overflow: hidden;
  animation: cardEntry 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.login-card:hover {
  box-shadow:
    0 24px 70px rgba(28, 16, 51, 0.16),
    0 0 0 1px rgba(200,16,46,0.08) inset;
  transform: translateY(-3px);
}
@keyframes cardEntry {
  from { opacity: 0; transform: translateY(30px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* 顶部彩色装饰条 */
.card-top-bar {
  height: 4px;
  background: linear-gradient(90deg, #C8102E 0%, #A855F7 40%, #3B82F6 70%, #10B981 100%);
  position: relative;
  overflow: hidden;
}
.card-top-bar::after {
  content: '';
  position: absolute;
  top: 0; left: -100%;
  width: 60%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent);
  animation: barSheen 4s ease-in-out infinite;
}
@keyframes barSheen {
  0%, 100% { left: -100%; }
  50%      { left: 150%; }
}

.card-header {
  padding: 32px 40px 0;
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 28px;
}
.card-icon {
  width: 48px; height: 48px; border-radius: 14px;
  background: var(--gradient-brand);
  display: flex; align-items: center; justify-content: center;
  color: #fff; flex-shrink: 0;
  box-shadow: 0 4px 16px rgba(200,16,46,0.30);
}
.card-title {
  font-size: 24px;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 4px;
  letter-spacing: -0.5px;
}
.card-subtitle {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
}

/* ═══ 表单 ═══ */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 0 40px 28px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.field-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

/* 覆盖 Element Plus Input */
.login-form :deep(.el-input) {
  --el-input-border-color: rgba(200, 195, 180, 0.25);
  --el-input-hover-border-color: var(--gdut-red);
  --el-input-focus-border-color: var(--gdut-red);
}
.login-form :deep(.el-input__wrapper) {
  border-radius: 12px;
  padding: 4px 14px;
  background: rgba(255, 255, 255, 0.40) !important;
  box-shadow: 0 0 0 1px rgba(200, 195, 180, 0.25) inset;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.login-form :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--gdut-red) inset;
  background: rgba(255, 255, 255, 0.55) !important;
}
.login-form :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1.5px var(--gdut-red) inset, 0 0 0 4px rgba(200, 16, 46, 0.08);
  background: rgba(255, 255, 255, 0.60) !important;
}
.login-form :deep(.el-input__prefix .el-icon) {
  color: var(--text-muted);
  font-size: 16px;
}

/* ═══ 记住我 & 注册 ═══ */
.form-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: -4px;
}

.remember-me {
  display: flex; align-items: center; gap: 8px;
  cursor: pointer; user-select: none;
}
.checkbox-input { display: none; }
.checkbox-custom {
  width: 18px; height: 18px; border-radius: 6px;
  border: 2px solid var(--border-medium);
  display: flex; align-items: center; justify-content: center;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative; flex-shrink: 0;
}
.checkbox-input:checked + .checkbox-custom {
  background: var(--gdut-red);
  border-color: var(--gdut-red);
  transform: scale(1.1);
}
.checkbox-input:checked + .checkbox-custom::after {
  content: '';
  width: 5px; height: 9px;
  border: 2px solid #fff;
  border-top: none; border-left: none;
  transform: rotate(45deg) translate(-1px, -1px);
}
.checkbox-label { font-size: 13px; color: var(--text-secondary); }

.register-link {
  background: none; border: none;
  font-size: 13px; color: var(--gdut-red);
  font-weight: 600; cursor: pointer; padding: 0;
  transition: all 0.2s;
  position: relative;
}
.register-link:hover { color: var(--gdut-red-hover); }
.register-link::after {
  content: '';
  position: absolute; bottom: -2px; left: 0;
  width: 0; height: 1.5px;
  background: var(--gdut-red);
  transition: width 0.3s ease;
}
.register-link:hover::after { width: 100%; }

/* ═══ 提交按钮 — 渐变 + 悬浮动效 ═══ */
.submit-btn {
  width: 100%;
  height: 50px;
  border: none;
  border-radius: 14px;
  background: var(--gradient-brand);
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  font-family: var(--font-sans);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  letter-spacing: 2px;
}
.submit-btn::before {
  content: '';
  position: absolute;
  top: 0; left: -100%;
  width: 100%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}
.submit-btn:hover::before { left: 100%; }
.submit-btn:hover {
  transform: translateY(-3px) scale(1.01);
  box-shadow: 0 10px 32px rgba(200, 16, 46, 0.40), 0 0 20px rgba(200, 16, 46, 0.15);
}
.submit-btn:active { transform: translateY(-1px) scale(0.99); }
.submit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
.submit-btn .btn-arrow {
  font-size: 16px;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.submit-btn:hover .btn-arrow { transform: translateX(4px); }

.spinner {
  width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* 卡片底部留白 */

/* ═══ 版权 ═══ */
.copyright {
  position: relative; z-index: 2;
  margin-top: 24px;
  font-size: 12px;
  color: var(--text-muted);
  letter-spacing: 0.3px;
}

/* ══════════════════════════════════════════════════
   响应式适配
   ══════════════════════════════════════════════════ */
@media (max-width: 1024px) {
  .brand-side { display: none; }
  .form-side {
    flex: 1;
    background: linear-gradient(160deg, #0A0618 0%, #1C1033 50%, #2D1B69 100%);
  }
  .login-card {
    background: rgba(255, 255, 255, 0.60);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
  }
  .copyright { color: rgba(255,255,255,0.3); }
}

@media (max-width: 540px) {
  .login-card {
    width: calc(100vw - 32px);
    padding: 0;
  }
  .login-form { padding: 0 24px 24px; }
  .card-header { padding: 24px 24px 0; }
  .demo-hint { margin: 16px 24px 0; }
  .card-title { font-size: 22px; }
}
</style>
