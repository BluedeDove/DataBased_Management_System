<template>
  <div class="lp-page">

    <!-- ── 背景：图书馆实景图 ── -->
    <div class="lp-bg-img" />

    <!-- ── 叠层遮罩：营造景深氛围 ── -->
    <div class="lp-overlay-main" />
    <div class="lp-overlay-vignette" />

    <!-- ── 飘散光晕（细腻，不抢眼） ── -->
    <div class="lp-halo lp-halo-red" />
    <div class="lp-halo lp-halo-purple" />

    <!-- ── 正文内容：垂直居中 ── -->
    <div class="lp-content">

      <!-- 品牌区 -->
      <div class="lp-brand">
        <!-- 书形图标 -->
        <div class="lp-icon-wrap">
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
            <path d="M7 10C7 10 15 8 24 10.5V42C15 39.5 7 42 7 42Z"
              fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.75)" stroke-width="1.4" stroke-linejoin="round"/>
            <path d="M41 10C41 10 33 8 24 10.5V42C33 39.5 41 42 41 42Z"
              fill="rgba(200,16,46,0.10)" stroke="rgba(255,255,255,0.50)" stroke-width="1.4" stroke-linejoin="round"/>
            <line x1="11" y1="19" x2="21.5" y2="20.2" stroke="rgba(255,255,255,0.45)" stroke-width="1.2" stroke-linecap="round"/>
            <line x1="11" y1="25" x2="21.5" y2="26.2" stroke="rgba(255,255,255,0.30)" stroke-width="1.2" stroke-linecap="round"/>
            <line x1="11" y1="31" x2="19"   y2="32"   stroke="rgba(255,255,255,0.18)" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
        </div>

        <!-- 书脉 主标题 -->
        <h1 class="lp-brand-name">书脉</h1>
        <p class="lp-brand-tagline">基于传承笔记的图书知识链路平台</p>

        <!-- 装饰分割线 -->
        <div class="lp-brand-rule">
          <span class="lp-rule-line" />
          <span class="lp-rule-gem" />
          <span class="lp-rule-line" />
        </div>
      </div>

      <!-- 登录卡片 -->
      <div class="lp-card">
        <!-- 顶部渐变彩条 -->
        <div class="lp-card-bar" />

        <!-- 卡片标题 -->
        <div class="lp-card-header">
          <div>
            <h2 class="lp-card-title">欢迎回来</h2>
            <p class="lp-card-sub">登录您的账号以继续使用</p>
          </div>
          <div class="lp-card-badge">LOGIN</div>
        </div>

        <!-- 表单 -->
        <el-form ref="formRef" :model="form" class="lp-form" @submit.prevent="handleLogin">

          <div class="lp-field">
            <label class="lp-label">账号</label>
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

          <div class="lp-field">
            <label class="lp-label">密码</label>
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

          <div class="lp-row-opts">
            <label class="lp-remember">
              <input v-model="form.remember" type="checkbox" class="lp-cb" />
              <span class="lp-cb-ui" />
              <span class="lp-cb-text">记住我</span>
            </label>
            <button type="button" class="lp-reg-link" @click="goRegister">
              没有账号？立即注册
            </button>
          </div>

          <button
            type="submit"
            class="lp-submit"
            :class="{ 'is-loading': loading }"
            :disabled="loading"
            @click.prevent="handleLogin"
          >
            <template v-if="!loading">
              <span>登 录</span>
              <svg class="lp-arrow" viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
                <path fill-rule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"/>
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
      <p class="lp-footer">© 2025 书脉——基于传承笔记的图书知识链路平台</p>
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

const goRegister = () => router.push('/register')

const handleLogin = async () => {
  if (!form.username.trim()) { ElMessage.warning('请输入账号'); return }
  if (!form.password.trim()) { ElMessage.warning('请输入密码'); return }

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
.lp-page {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-sans);
}

/* ══════════════════════════════════════════════════
   背景：图书馆实景图（缓慢 Ken Burns 推进）
   ══════════════════════════════════════════════════ */
.lp-bg-img {
  position: absolute;
  inset: -5%;          /* 留出 Ken Burns 缩放空间 */
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.04)),
    url('https://library.gdut.edu.cn/images/bannar2401.png')
    center center / cover no-repeat;
  z-index: 0;
  animation: lpKenBurns 40s ease-in-out infinite alternate;
  will-change: transform;
}
@keyframes lpKenBurns {
  from { transform: scale(1);    }
  to   { transform: scale(1.06); }
}

/* ══════════════════════════════════════════════════
   叠层遮罩：为文字和卡片制造可读层次
   ══════════════════════════════════════════════════ */
/* 主遮罩 — 整体压暗，中心偏亮 */
.lp-overlay-main {
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    radial-gradient(ellipse 70% 80% at 50% 50%,
      rgba(8, 5, 18, 0.40) 0%,
      rgba(8, 5, 18, 0.72) 100%);
}
/* 上下暗角遮罩 */
.lp-overlay-vignette {
  position: absolute;
  inset: 0;
  z-index: 2;
  background:
    linear-gradient(
      to bottom,
      rgba(8, 5, 18, 0.55) 0%,
      transparent 30%,
      transparent 65%,
      rgba(8, 5, 18, 0.60) 100%
    );
}

/* ══════════════════════════════════════════════════
   飘散光晕（在遮罩上方，内容下方）
   ══════════════════════════════════════════════════ */
.lp-halo {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
  z-index: 3;
}
.lp-halo-red {
  width: 480px; height: 480px;
  background: rgba(200, 16, 46, 0.12);
  top: -60px; right: -80px;
  animation: lpHaloDrift 18s ease-in-out infinite;
}
.lp-halo-purple {
  width: 380px; height: 380px;
  background: rgba(124, 58, 237, 0.10);
  bottom: -60px; left: -60px;
  animation: lpHaloDrift 22s ease-in-out infinite reverse;
}
@keyframes lpHaloDrift {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50%       { transform: translate(20px, -15px) scale(1.07); }
}

/* ══════════════════════════════════════════════════
   内容区（相对定位在所有层之上）
   ══════════════════════════════════════════════════ */
.lp-content {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 460px;
  padding: 0 24px;
}

/* ══════════════════════════════════════════════════
   品牌区
   ══════════════════════════════════════════════════ */
.lp-brand {
  text-align: center;
  margin-bottom: 26px;
  animation: lpSlideDown 0.75s cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes lpSlideDown {
  from { opacity: 0; transform: translateY(-18px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* 书形图标容器 */
.lp-icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 68px; height: 68px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  margin-bottom: 14px;
  box-shadow:
    0 4px 24px rgba(0, 0, 0, 0.30),
    0 0 0 1px rgba(255,255,255,0.06) inset;
  animation: lpIconFloat 7s ease-in-out infinite;
}
@keyframes lpIconFloat {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-6px); }
}

/* 主标题 */
.lp-brand-name {
  font-size: 58px;
  font-weight: 900;
  color: transparent;
  /* 白色→暖红 渐变文字 */
  background: linear-gradient(
    135deg,
    #ffffff 30%,
    rgba(255, 180, 180, 0.95) 65%,
    rgba(200, 16, 46, 0.85) 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0 0 8px;
  letter-spacing: 10px;
  line-height: 1;
  text-shadow: none;
  /* 柔和投影让文字在图上浮现 */
  filter: drop-shadow(0 2px 16px rgba(0,0,0,0.40));
}

.lp-brand-tagline {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.52);
  margin: 0;
  letter-spacing: 1.8px;
  font-weight: 400;
}

/* 装饰分割线 */
.lp-brand-rule {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 16px auto 0;
  width: 180px;
}
.lp-rule-line {
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.18);
}
.lp-rule-gem {
  width: 5px; height: 5px;
  transform: rotate(45deg);
  background: var(--gdut-red);
  box-shadow: 0 0 8px rgba(200, 16, 46, 0.70);
  flex-shrink: 0;
}

/* ══════════════════════════════════════════════════
   登录卡片 — 高透明磨砂白
   ══════════════════════════════════════════════════ */
.lp-card {
  width: 100%;
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(30px) saturate(180%);
  -webkit-backdrop-filter: blur(30px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 22px;
  overflow: hidden;
  box-shadow:
    0 24px 64px rgba(0, 0, 0, 0.38),
    0 0 0 1px rgba(255, 255, 255, 0.55) inset;
  animation: lpCardEntry 0.75s cubic-bezier(0.16, 1, 0.3, 1) 0.12s both;
  transition: box-shadow 0.4s ease, transform 0.4s ease;
}
.lp-card:hover {
  box-shadow:
    0 30px 80px rgba(0, 0, 0, 0.42),
    0 0 0 1px rgba(200,16,46,0.10) inset;
  transform: translateY(-2px);
}
@keyframes lpCardEntry {
  from { opacity: 0; transform: translateY(28px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* 顶部彩条 */
.lp-card-bar {
  height: 3px;
  background: linear-gradient(90deg, #C8102E 0%, #A855F7 42%, #3B82F6 72%, #10B981 100%);
  position: relative;
  overflow: hidden;
}
.lp-card-bar::after {
  content: '';
  position: absolute;
  top: 0; left: -100%;
  width: 55%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.65), transparent);
  animation: lpBarSheen 4.5s ease-in-out infinite;
}
@keyframes lpBarSheen {
  0%, 100% { left: -100%; }
  50%       { left: 150%; }
}

/* 卡片标题行 */
.lp-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 32px 0;
  margin-bottom: 20px;
}
.lp-card-title {
  font-size: 20px; font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 3px;
  letter-spacing: -0.3px;
}
.lp-card-sub {
  font-size: 12px; color: var(--text-muted); margin: 0;
}
.lp-card-badge {
  font-size: 9px; font-weight: 700;
  letter-spacing: 2px;
  color: var(--gdut-red);
  background: rgba(200, 16, 46, 0.07);
  border: 1px solid rgba(200, 16, 46, 0.14);
  border-radius: 6px;
  padding: 4px 8px;
  flex-shrink: 0;
}

/* ══════════════════════════════════════════════════
   表单
   ══════════════════════════════════════════════════ */
.lp-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 0 32px 28px;
}

.lp-field {
  display: flex; flex-direction: column; gap: 6px;
}
.lp-label {
  font-size: 11px; font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

/* Element Plus Input 覆盖 */
.lp-form :deep(.el-input__wrapper) {
  border-radius: 10px;
  padding: 4px 14px;
  background: rgba(255, 255, 255, 0.55) !important;
  box-shadow: 0 0 0 1px rgba(200, 195, 180, 0.28) inset;
  transition: all 0.25s ease;
}
.lp-form :deep(.el-input__wrapper:hover) {
  background: rgba(255, 255, 255, 0.72) !important;
  box-shadow: 0 0 0 1px var(--gdut-red) inset;
}
.lp-form :deep(.el-input__wrapper.is-focus) {
  background: rgba(255, 255, 255, 0.85) !important;
  box-shadow: 0 0 0 1.5px var(--gdut-red) inset, 0 0 0 4px rgba(200,16,46,0.08);
}
.lp-form :deep(.el-input__prefix .el-icon) {
  color: var(--text-muted); font-size: 15px;
}

/* 选项行 */
.lp-row-opts {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: -2px;
}
.lp-remember {
  display: flex; align-items: center; gap: 7px;
  cursor: pointer; user-select: none;
}
.lp-cb { display: none; }
.lp-cb-ui {
  width: 16px; height: 16px; border-radius: 5px;
  border: 1.5px solid var(--border-medium);
  position: relative; transition: all 0.2s; flex-shrink: 0;
}
.lp-cb:checked + .lp-cb-ui {
  background: var(--gdut-red); border-color: var(--gdut-red); transform: scale(1.05);
}
.lp-cb:checked + .lp-cb-ui::after {
  content: '';
  position: absolute; left: 4px; top: 1px;
  width: 4px; height: 8px;
  border: 1.5px solid #fff; border-top: none; border-left: none;
  transform: rotate(45deg);
}
.lp-cb-text { font-size: 12px; color: var(--text-secondary); }

.lp-reg-link {
  background: none; border: none;
  font-size: 12px; color: var(--gdut-red);
  font-weight: 600; cursor: pointer; padding: 0;
  position: relative; transition: color 0.2s;
}
.lp-reg-link:hover { color: var(--gdut-red-hover); }
.lp-reg-link::after {
  content: ''; position: absolute; bottom: -1px; left: 0;
  width: 0; height: 1.5px; background: var(--gdut-red);
  transition: width 0.3s ease;
}
.lp-reg-link:hover::after { width: 100%; }

/* 提交按钮 */
.lp-submit {
  width: 100%; height: 46px;
  border: none; border-radius: 11px;
  background: var(--gradient-brand);
  color: #fff;
  font-size: 15px; font-weight: 600;
  font-family: var(--font-sans);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  position: relative; overflow: hidden;
  letter-spacing: 2px;
  box-shadow: 0 5px 18px rgba(200, 16, 46, 0.28);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.lp-submit::before {
  content: ''; position: absolute; top: 0; left: -100%;
  width: 100%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
  transition: left 0.5s ease;
}
.lp-submit:hover::before { left: 100%; }
.lp-submit:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 28px rgba(200, 16, 46, 0.38);
}
.lp-submit:active { transform: translateY(0); }
.lp-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
.lp-arrow { transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.lp-submit:hover .lp-arrow { transform: translateX(4px); }

.lp-spinner {
  width: 15px; height: 15px;
  border: 2px solid rgba(255,255,255,0.30);
  border-top-color: #fff;
  border-radius: 50%;
  animation: lpSpin 0.7s linear infinite;
}
@keyframes lpSpin { to { transform: rotate(360deg); } }

/* ══════════════════════════════════════════════════
   版权行
   ══════════════════════════════════════════════════ */
.lp-footer {
  margin-top: 18px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.32);
  letter-spacing: 0.4px;
  text-align: center;
  animation: lpSlideDown 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both;
}

/* ══════════════════════════════════════════════════
   响应式
   ══════════════════════════════════════════════════ */
@media (max-width: 540px) {
  .lp-content { padding: 0 16px; }
  .lp-brand-name { font-size: 44px; letter-spacing: 6px; }
  .lp-card-header { padding: 20px 24px 0; }
  .lp-form { padding: 0 24px 24px; }
}
</style>
