<template>
  <div class="login-page">
    <!-- ═══ 背景装饰光球 ═══ -->
    <div class="lp-orb lp-orb-1" />
    <div class="lp-orb lp-orb-2" />
    <div class="lp-orb lp-orb-3" />
    <div class="lp-orb lp-orb-4" />

    <!-- ═══ 浮动粒子 ═══ -->
    <div class="lp-particle lp-p1" />
    <div class="lp-particle lp-p2" />
    <div class="lp-particle lp-p3" />
    <div class="lp-particle lp-p4" />
    <div class="lp-particle lp-p5" />

    <!-- ═══ 主体分栏布局 ═══ -->
    <div class="lp-layout">

      <!-- ────────── 左半：品牌区 ────────── -->
      <div class="lp-brand-side">
        <div class="lp-brand-glass">

          <!-- Logo 标记 -->
          <div class="lp-logo-wrap">
            <div class="lp-logo-pulse" />
            <div class="lp-logo-box">
              <span class="lp-logo-g">G</span>
            </div>
          </div>

          <!-- 标题 -->
          <div class="lp-brand-title-wrap">
            <span class="lp-brand-hi">书脉</span>
            <span class="lp-brand-sys">基于传承笔记的图书知识链路平台</span>
          </div>

          <!-- CSS 书籍插图 -->
          <div class="lp-book-scene">
            <div class="lp-bookshelf">
              <div class="lp-book lp-b1" />
              <div class="lp-book lp-b2" />
              <div class="lp-book lp-b3" />
              <div class="lp-book lp-b4" />
              <div class="lp-book lp-b5" />
              <div class="lp-book lp-b6" />
              <div class="lp-shelf-line" />
            </div>
          </div>

          <!-- 标语 -->
          <div class="lp-tagline-block">
            <p class="lp-tagline">知识就在指尖</p>
            <p class="lp-tagline-desc">
              集图书管理、智能检索、数据统计于一体的现代化图书馆管理平台
            </p>
          </div>

          <!-- 统计栏 -->
          <div class="lp-stats-bar">
            <div class="lp-stat-item">
              <span class="lp-stat-num">50,000+</span>
              <span class="lp-stat-label">馆藏</span>
            </div>
            <div class="lp-stat-sep" />
            <div class="lp-stat-item">
              <span class="lp-stat-num">8,000+</span>
              <span class="lp-stat-label">读者</span>
            </div>
            <div class="lp-stat-sep" />
            <div class="lp-stat-item">
              <span class="lp-stat-num">99.9%</span>
              <span class="lp-stat-label">可用</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ────────── 右半：登录表单 ────────── -->
      <div class="lp-form-side">
        <div class="lp-login-card">
          <!-- 顶部彩条 -->
          <div class="lp-card-bar" />

          <!-- 卡片头部 -->
          <div class="lp-card-header">
            <div class="lp-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
              </svg>
            </div>
            <div>
              <h2 class="lp-card-title">欢迎回来</h2>
              <p class="lp-card-subtitle">登录您的账号以继续使用</p>
            </div>
          </div>

          <!-- 登录表单 -->
          <el-form
            ref="formRef"
            :model="form"
            class="lp-form"
            @submit.prevent="handleLogin"
          >
            <div class="lp-field-wrap">
              <label class="lp-field-label">账号</label>
              <el-input
                v-model="form.username"
                placeholder="请输入您的账号"
                size="large"
                clearable
                @keyup.enter="handleLogin"
              >
                <template #prefix><el-icon><User /></el-icon></template>
              </el-input>
            </div>

            <div class="lp-field-wrap">
              <label class="lp-field-label">密码</label>
              <el-input
                v-model="form.password"
                type="password"
                placeholder="请输入您的密码"
                size="large"
                show-password
                @keyup.enter="handleLogin"
              >
                <template #prefix><el-icon><Lock /></el-icon></template>
              </el-input>
            </div>

            <div class="lp-form-extras">
              <label class="lp-remember-wrap">
                <input v-model="form.remember" type="checkbox" class="lp-cb-input" />
                <span class="lp-cb-box" />
                <span class="lp-cb-text">记住我</span>
              </label>
              <button type="button" class="lp-reg-link" @click="goRegister">
                没有账号？立即注册
              </button>
            </div>

            <button
              type="submit"
              class="lp-submit-btn"
              :class="{ 'is-loading': loading }"
              :disabled="loading"
              @click.prevent="handleLogin"
            >
              <template v-if="!loading">
                <span>登 录</span>
                <svg class="lp-btn-arrow" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                  <path fill-rule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" />
                </svg>
              </template>
              <template v-else>
                <span class="lp-spinner" />
                <span>登录中...</span>
              </template>
            </button>
          </el-form>
        </div>

        <!-- 版权 -->
        <p class="lp-copyright">© 2025 书脉——基于传承笔记的图书知识链路平台</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { User, Lock } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
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
   页面根容器
   ══════════════════════════════════════════════════ */
.login-page {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  position: relative;
  background: linear-gradient(140deg, #F5F1EB 0%, #EDE8DE 45%, #E5DFD3 100%);
  font-family: var(--font-sans);
}

/* ══════════════════════════════════════════════════
   背景装饰光球
   ══════════════════════════════════════════════════ */
.lp-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  pointer-events: none;
}
.lp-orb-1 {
  width: 640px; height: 640px;
  background: rgba(200, 16, 46, 0.10);
  top: -160px; left: -120px;
  animation: lpOrbDrift 18s ease-in-out infinite;
}
.lp-orb-2 {
  width: 540px; height: 540px;
  background: rgba(124, 58, 237, 0.09);
  bottom: -120px; right: -100px;
  animation: lpOrbDrift 22s ease-in-out infinite reverse;
}
.lp-orb-3 {
  width: 420px; height: 420px;
  background: rgba(14, 165, 233, 0.07);
  top: 35%; left: 35%;
  animation: lpOrbDrift 16s ease-in-out infinite 5s;
}
.lp-orb-4 {
  width: 300px; height: 300px;
  background: rgba(16, 185, 129, 0.06);
  bottom: 15%; right: 30%;
  animation: lpOrbDrift 20s ease-in-out infinite 8s;
}

@keyframes lpOrbDrift {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33%       { transform: translate(28px, -22px) scale(1.07); }
  66%       { transform: translate(-18px, 18px) scale(0.94); }
}

/* ══════════════════════════════════════════════════
   浮动粒子
   ══════════════════════════════════════════════════ */
.lp-particle {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}
.lp-p1 { width: 5px; height: 5px; background: rgba(200,16,46,0.28); top: 14%; left: 9%; animation: lpParticleFloat 9s ease-in-out infinite; }
.lp-p2 { width: 4px; height: 4px; background: rgba(124,58,237,0.22); top: 68%; left: 22%; animation: lpParticleFloat 11s ease-in-out infinite 2s; }
.lp-p3 { width: 6px; height: 6px; background: rgba(59,130,246,0.18); top: 28%; right: 16%; animation: lpParticleFloat 8s ease-in-out infinite 4s; }
.lp-p4 { width: 3px; height: 3px; background: rgba(200,16,46,0.22); top: 78%; right: 22%; animation: lpParticleFloat 13s ease-in-out infinite 1s; }
.lp-p5 { width: 5px; height: 5px; background: rgba(16,185,129,0.18); top: 48%; left: 48%; animation: lpParticleFloat 10s ease-in-out infinite 3s; }

@keyframes lpParticleFloat {
  0%, 100% { transform: translateY(0) scale(1); opacity: 0.5; }
  50%       { transform: translateY(-22px) scale(1.3); opacity: 1; }
}

/* ══════════════════════════════════════════════════
   主体布局
   ══════════════════════════════════════════════════ */
.lp-layout {
  display: flex;
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 1;
}

/* ══════════════════════════════════════════════════
   左侧：品牌区
   ══════════════════════════════════════════════════ */
.lp-brand-side {
  flex: 1.1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 32px 40px 48px;
}

/* 磨砂玻璃品牌卡片 */
.lp-brand-glass {
  background: rgba(255, 255, 255, 0.52);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.60);
  border-radius: 28px;
  padding: 44px 40px;
  max-width: 440px;
  width: 100%;
  box-shadow:
    0 8px 40px rgba(28, 16, 51, 0.07),
    0 0 0 1px rgba(255, 255, 255, 0.45) inset;
  animation: lpCardEntry 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes lpCardEntry {
  from { opacity: 0; transform: translateY(28px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* Logo */
.lp-logo-wrap {
  position: relative;
  width: 64px; height: 64px;
  margin-bottom: 28px;
}
.lp-logo-pulse {
  position: absolute;
  inset: -8px;
  border-radius: 22px;
  background: rgba(200, 16, 46, 0.10);
  animation: lpLogoPulse 3s ease-in-out infinite;
}
@keyframes lpLogoPulse {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50%       { transform: scale(1.18); opacity: 0; }
}
.lp-logo-box {
  width: 64px; height: 64px;
  border-radius: 18px;
  background: var(--gradient-brand);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 6px 24px rgba(200, 16, 46, 0.28);
  animation: lpLogoFloat 6s ease-in-out infinite;
}
@keyframes lpLogoFloat {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-5px); }
}
.lp-logo-g {
  font-size: 30px; font-weight: 800; color: #fff; line-height: 1;
}

/* 品牌标题 */
.lp-brand-title-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 32px;
}
.lp-brand-hi {
  font-size: 32px;
  font-weight: 800;
  background: linear-gradient(135deg, #C8102E 0%, #7C3AED 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.5px;
  line-height: 1.1;
}
.lp-brand-sys {
  font-size: 19px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 1px;
}

/* 书籍插图场景 */
.lp-book-scene {
  margin-bottom: 28px;
  padding: 22px 16px 16px;
  background: rgba(200, 16, 46, 0.03);
  border: 1px solid rgba(200, 16, 46, 0.07);
  border-radius: 16px;
}
.lp-bookshelf {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  position: relative;
}
.lp-book {
  border-radius: 2px 4px 4px 2px;
  position: relative;
}
.lp-book::after {
  content: '';
  position: absolute;
  left: 3px; top: 4px; bottom: 4px;
  width: 1px;
  background: rgba(255, 255, 255, 0.18);
  border-radius: 1px;
}
.lp-b1 { width: 18px; height: 56px; background: linear-gradient(180deg, #C8102E, #A50E26); animation: lpBookTilt 6s ease-in-out infinite; box-shadow: 0 3px 10px rgba(200,16,46,0.22); }
.lp-b2 { width: 14px; height: 68px; background: linear-gradient(180deg, #7C3AED, #6D28D9); animation: lpBookTilt 7s ease-in-out infinite 0.5s; box-shadow: 0 3px 10px rgba(124,58,237,0.22); }
.lp-b3 { width: 20px; height: 50px; background: linear-gradient(180deg, #3B82F6, #2563EB); animation: lpBookTilt 5s ease-in-out infinite 1s; box-shadow: 0 3px 10px rgba(59,130,246,0.22); }
.lp-b4 { width: 12px; height: 70px; background: linear-gradient(180deg, #F59E0B, #D97706); animation: lpBookTilt 8s ease-in-out infinite 1.5s; box-shadow: 0 3px 10px rgba(245,158,11,0.22); }
.lp-b5 { width: 16px; height: 58px; background: linear-gradient(180deg, #10B981, #059669); animation: lpBookTilt 6s ease-in-out infinite 2s; box-shadow: 0 3px 10px rgba(16,185,129,0.22); }
.lp-b6 { width: 22px; height: 46px; background: linear-gradient(180deg, #EC4899, #DB2777); animation: lpBookTilt 7s ease-in-out infinite 2.5s; box-shadow: 0 3px 10px rgba(236,72,153,0.22); }

@keyframes lpBookTilt {
  0%, 100% { transform: rotate(0deg) translateY(0); }
  25%       { transform: rotate(-2deg) translateY(-2px); }
  75%       { transform: rotate(1deg) translateY(-1px); }
}

.lp-shelf-line {
  position: absolute;
  bottom: -5px; left: -4px; right: -4px;
  height: 3px;
  background: linear-gradient(90deg, rgba(200,195,180,0.1), rgba(200,195,180,0.35), rgba(200,195,180,0.1));
  border-radius: 2px;
}

/* 标语 */
.lp-tagline-block { margin-bottom: 28px; }
.lp-tagline {
  font-size: 20px; font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 6px;
  letter-spacing: 1px;
}
.lp-tagline-desc {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.75;
  margin: 0;
  max-width: 340px;
}

/* 统计栏 */
.lp-stats-bar {
  display: flex;
  align-items: center;
  padding: 14px 18px;
  background: rgba(255, 255, 255, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.55);
  border-radius: 14px;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}
.lp-stats-bar:hover {
  background: rgba(255, 255, 255, 0.55);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(28,16,51,0.06);
}
.lp-stat-item { flex: 1; text-align: center; display: flex; flex-direction: column; gap: 2px; }
.lp-stat-num {
  font-size: 15px; font-weight: 800;
  background: var(--gradient-brand);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.lp-stat-label { font-size: 10px; color: var(--text-muted); letter-spacing: 0.8px; }
.lp-stat-sep { width: 1px; height: 24px; background: rgba(200, 195, 180, 0.30); }

/* ══════════════════════════════════════════════════
   右侧：登录表单区
   ══════════════════════════════════════════════════ */
.lp-form-side {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 48px 40px 32px;
  gap: 20px;
}

/* 登录卡片 */
.lp-login-card {
  width: 100%;
  max-width: 450px;
  background: rgba(255, 255, 255, 0.68);
  backdrop-filter: blur(24px) saturate(200%);
  -webkit-backdrop-filter: blur(24px) saturate(200%);
  border: 1px solid rgba(255, 255, 255, 0.60);
  border-radius: 24px;
  overflow: hidden;
  box-shadow:
    0 16px 50px rgba(28, 16, 51, 0.09),
    0 0 0 1px rgba(255, 255, 255, 0.45) inset;
  animation: lpCardEntry 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both;
  transition: box-shadow 0.35s ease, transform 0.35s ease;
}
.lp-login-card:hover {
  box-shadow:
    0 20px 60px rgba(28, 16, 51, 0.12),
    0 0 0 1px rgba(200,16,46,0.08) inset;
  transform: translateY(-2px);
}

/* 顶部彩条 */
.lp-card-bar {
  height: 4px;
  background: linear-gradient(90deg, #C8102E 0%, #A855F7 42%, #3B82F6 72%, #10B981 100%);
  position: relative;
  overflow: hidden;
}
.lp-card-bar::after {
  content: '';
  position: absolute;
  top: 0; left: -100%;
  width: 60%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent);
  animation: lpBarSheen 4s ease-in-out infinite;
}
@keyframes lpBarSheen {
  0%, 100% { left: -100%; }
  50%       { left: 150%; }
}

/* 卡片头 */
.lp-card-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 28px 36px 0;
  margin-bottom: 22px;
}
.lp-card-icon {
  width: 46px; height: 46px;
  border-radius: 14px;
  background: var(--gradient-brand);
  display: flex; align-items: center; justify-content: center;
  color: #fff; flex-shrink: 0;
  box-shadow: 0 4px 14px rgba(200, 16, 46, 0.25);
}
.lp-card-title {
  font-size: 22px; font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 3px;
  letter-spacing: -0.4px;
}
.lp-card-subtitle {
  font-size: 12px;
  color: var(--text-muted);
  margin: 0;
}

/* 表单 */
.lp-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 36px 30px;
}

.lp-field-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.lp-field-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

/* Element Plus Input 覆盖 */
.lp-form :deep(.el-input__wrapper) {
  border-radius: 12px;
  padding: 4px 14px;
  background: rgba(255, 255, 255, 0.50) !important;
  box-shadow: 0 0 0 1px rgba(200, 195, 180, 0.28) inset;
  transition: all 0.25s ease;
}
.lp-form :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--gdut-red) inset;
  background: rgba(255, 255, 255, 0.65) !important;
}
.lp-form :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1.5px var(--gdut-red) inset, 0 0 0 4px rgba(200, 16, 46, 0.08);
  background: rgba(255, 255, 255, 0.75) !important;
}
.lp-form :deep(.el-input__prefix .el-icon) {
  color: var(--text-muted);
  font-size: 15px;
}

/* 记住我 & 注册 */
.lp-form-extras {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: -4px;
}
.lp-remember-wrap {
  display: flex; align-items: center; gap: 7px;
  cursor: pointer; user-select: none;
}
.lp-cb-input { display: none; }
.lp-cb-box {
  width: 16px; height: 16px;
  border-radius: 5px;
  border: 1.5px solid var(--border-medium);
  position: relative;
  transition: all 0.2s;
  flex-shrink: 0;
}
.lp-cb-input:checked + .lp-cb-box {
  background: var(--gdut-red);
  border-color: var(--gdut-red);
  transform: scale(1.08);
}
.lp-cb-input:checked + .lp-cb-box::after {
  content: '';
  position: absolute;
  left: 4px; top: 1px;
  width: 4px; height: 8px;
  border: 1.5px solid #fff;
  border-top: none; border-left: none;
  transform: rotate(45deg);
}
.lp-cb-text { font-size: 12px; color: var(--text-secondary); }

.lp-reg-link {
  background: none; border: none;
  font-size: 12px; color: var(--gdut-red);
  font-weight: 600; cursor: pointer; padding: 0;
  position: relative;
  transition: color 0.2s;
}
.lp-reg-link:hover { color: var(--gdut-red-hover); }
.lp-reg-link::after {
  content: '';
  position: absolute;
  bottom: -1px; left: 0;
  width: 0; height: 1.5px;
  background: var(--gdut-red);
  transition: width 0.3s ease;
}
.lp-reg-link:hover::after { width: 100%; }

/* 提交按钮 */
.lp-submit-btn {
  width: 100%; height: 48px;
  border: none; border-radius: 13px;
  background: var(--gradient-brand);
  color: #fff;
  font-size: 15px; font-weight: 600;
  font-family: var(--font-sans);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  position: relative; overflow: hidden;
  letter-spacing: 2px;
  box-shadow: 0 6px 20px rgba(200, 16, 46, 0.22);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.lp-submit-btn::before {
  content: '';
  position: absolute;
  top: 0; left: -100%;
  width: 100%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
  transition: left 0.5s ease;
}
.lp-submit-btn:hover::before { left: 100%; }
.lp-submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(200, 16, 46, 0.32);
}
.lp-submit-btn:active { transform: translateY(0); }
.lp-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
.lp-btn-arrow {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.lp-submit-btn:hover .lp-btn-arrow { transform: translateX(4px); }

.lp-spinner {
  width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: lpSpin 0.7s linear infinite;
}
@keyframes lpSpin { to { transform: rotate(360deg); } }

/* 版权 */
.lp-copyright {
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: 0.3px;
}

/* ══════════════════════════════════════════════════
   响应式
   ══════════════════════════════════════════════════ */
@media (max-width: 1024px) {
  .lp-brand-side { display: none; }
  .lp-form-side {
    flex: 1;
    padding: 40px 24px;
  }
  .lp-login-card { max-width: 480px; }
}

@media (max-width: 540px) {
  .lp-form-side { padding: 24px 16px; }
  .lp-login-card { max-width: 100%; }
  .lp-form { padding: 0 24px 24px; }
  .lp-card-header { padding: 24px 24px 0; }
  .lp-card-title { font-size: 20px; }
}
</style>
