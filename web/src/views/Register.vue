<template>
  <div class="rp-page">
    <!-- ═══ 背景光球 ═══ -->
    <div class="rp-orb rp-orb-1" />
    <div class="rp-orb rp-orb-2" />
    <div class="rp-orb rp-orb-3" />
    <div class="rp-orb rp-orb-4" />

    <!-- ═══ 顶部状态栏 ═══ -->
    <div class="rp-topbar">
      <div class="rp-topbar-inner">
        <div class="rp-topbar-logo">
          <div class="rp-dot rp-dot-red" />
          <div class="rp-dot rp-dot-yellow" />
          <div class="rp-dot rp-dot-green" />
        </div>
        <span class="rp-topbar-text">书脉——基于传承笔记的图书知识链路平台 · v2.0</span>
        <div class="rp-topbar-tags">
          <span class="rp-tag">DATABASE</span>
          <span class="rp-tag rp-tag-blue">VUE3</span>
          <span class="rp-tag rp-tag-purple">AI</span>
        </div>
      </div>
    </div>

    <!-- ═══ 主体 ═══ -->
    <div class="rp-body">

      <!-- ────────── 左侧：品牌区 ────────── -->
      <div class="rp-brand-col">
        <div class="rp-brand-card">

          <!-- 徽标 -->
          <div class="rp-emblem">
            <div class="rp-emblem-ring rp-ring-outer">
              <div class="rp-emblem-ring rp-ring-inner">
                <div class="rp-emblem-core">
                  <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" width="40" height="40">
                    <rect x="10" y="10" width="15" height="15" rx="3" fill="rgba(200,16,46,0.75)" />
                    <rect x="10" y="35" width="15" height="15" rx="3" fill="rgba(200,16,46,0.45)" />
                    <rect x="35" y="10" width="15" height="15" rx="3" fill="rgba(124,58,237,0.55)" />
                    <rect x="35" y="35" width="15" height="15" rx="3" fill="rgba(29,78,216,0.55)" />
                    <rect x="22" y="22" width="16" height="16" rx="3" fill="rgba(28,16,51,0.85)" />
                    <text x="30" y="34" text-anchor="middle" fill="#fff" font-size="8" font-weight="800" font-family="Inter, sans-serif">工</text>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <!-- 标题 -->
          <h1 class="rp-brand-title">
            <span class="rp-brand-accent">加入</span>我们
          </h1>
          <p class="rp-brand-sub">Library Management System</p>

          <!-- 分割线 -->
          <div class="rp-divider">
            <span class="rp-divider-line" />
            <span class="rp-divider-dot" />
            <span class="rp-divider-line" />
          </div>

          <!-- 特性列表 -->
          <ul class="rp-features">
            <li class="rp-feature-item">
              <span class="rp-feature-icon rp-fi-red">
                <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
                  <path d="M9 9a2 2 0 114 0 2 2 0 01-4 0z"/><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a4 4 0 00-3.446 6.032l-2.261 2.26a1 1 0 101.414 1.415l2.261-2.261A4 4 0 1011 5z" clip-rule="evenodd"/>
                </svg>
              </span>
              <div class="rp-feature-text">
                <span class="rp-feature-name">在线检索</span>
                <span class="rp-feature-desc">全文检索，快速定位目标图书</span>
              </div>
            </li>
            <li class="rp-feature-item">
              <span class="rp-feature-icon rp-fi-purple">
                <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
                  <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/>
                </svg>
              </span>
              <div class="rp-feature-text">
                <span class="rp-feature-name">到期提醒</span>
                <span class="rp-feature-desc">自动提醒，杜绝逾期烦恼</span>
              </div>
            </li>
            <li class="rp-feature-item">
              <span class="rp-feature-icon rp-fi-blue">
                <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
                </svg>
              </span>
              <div class="rp-feature-text">
                <span class="rp-feature-name">AI 推荐</span>
                <span class="rp-feature-desc">智能分析，个性化书单推送</span>
              </div>
            </li>
            <li class="rp-feature-item">
              <span class="rp-feature-icon rp-fi-green">
                <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
                  <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
                </svg>
              </span>
              <div class="rp-feature-text">
                <span class="rp-feature-name">数据统计</span>
                <span class="rp-feature-desc">可视化图表，掌握阅读脉络</span>
              </div>
            </li>
          </ul>

          <!-- 装饰 -->
          <div class="rp-deco">
            <div class="rp-deco-circle rp-dc1" />
            <div class="rp-deco-circle rp-dc2" />
            <div class="rp-deco-circle rp-dc3" />
          </div>
        </div>
      </div>

      <!-- ────────── 右侧：注册表单 ────────── -->
      <div class="rp-form-col">
        <div class="rp-form-card">
          <!-- 顶部彩条 -->
          <div class="rp-form-bar" />

          <!-- 表单头 -->
          <div class="rp-form-header">
            <div class="rp-form-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
            </div>
            <div>
              <h2 class="rp-form-title">创建账号</h2>
              <p class="rp-form-subtitle">填写以下信息，加入书脉图书知识链路平台</p>
            </div>
          </div>

          <el-form
            ref="formRef"
            :model="form"
            :rules="rules"
            class="rp-form"
          >
            <!-- 用户名 + 真实姓名 -->
            <div class="rp-form-row">
              <div class="rp-field-group">
                <label class="rp-field-label">用户名</label>
                <el-form-item prop="username">
                  <el-input
                    v-model="form.username"
                    placeholder="用于登录的账号"
                    :prefix-icon="User"
                    size="large"
                  />
                </el-form-item>
              </div>
              <div class="rp-field-group">
                <label class="rp-field-label">真实姓名</label>
                <el-form-item prop="name">
                  <el-input
                    v-model="form.name"
                    placeholder="请输入真实姓名"
                    :prefix-icon="User"
                    size="large"
                  />
                </el-form-item>
              </div>
            </div>

            <!-- 邮箱 -->
            <div class="rp-field-group">
              <label class="rp-field-label">电子邮箱 <span class="rp-optional">选填</span></label>
              <el-form-item prop="email">
                <el-input
                  v-model="form.email"
                  placeholder="请输入邮箱地址"
                  :prefix-icon="Message"
                  size="large"
                />
              </el-form-item>
            </div>

            <!-- 密码 + 确认密码 -->
            <div class="rp-form-row">
              <div class="rp-field-group">
                <label class="rp-field-label">密码</label>
                <el-form-item prop="password">
                  <el-input
                    v-model="form.password"
                    type="password"
                    placeholder="至少 6 位字符"
                    :prefix-icon="Lock"
                    show-password
                    size="large"
                  />
                </el-form-item>
              </div>
              <div class="rp-field-group">
                <label class="rp-field-label">确认密码</label>
                <el-form-item prop="confirmPassword">
                  <el-input
                    v-model="form.confirmPassword"
                    type="password"
                    placeholder="再次输入密码"
                    :prefix-icon="Lock"
                    show-password
                    size="large"
                  />
                </el-form-item>
              </div>
            </div>

            <!-- 身份类型 + 手机号 -->
            <div class="rp-form-row">
              <div class="rp-field-group">
                <label class="rp-field-label">身份类型</label>
                <el-form-item prop="identity">
                  <el-select
                    v-model="form.identity"
                    placeholder="请选择身份"
                    size="large"
                    style="width: 100%"
                  >
                    <el-option label="学生" value="student">
                      <el-icon style="margin-right: 6px; vertical-align: -2px;"><User /></el-icon>
                      学生
                    </el-option>
                    <el-option label="教师" value="teacher">
                      <el-icon style="margin-right: 6px; vertical-align: -2px;"><Reading /></el-icon>
                      教师
                    </el-option>
                    <el-option label="读者" value="reader">
                      <el-icon style="margin-right: 6px; vertical-align: -2px;"><Notebook /></el-icon>
                      读者
                    </el-option>
                  </el-select>
                </el-form-item>
              </div>
              <div class="rp-field-group">
                <label class="rp-field-label">手机号码</label>
                <el-form-item prop="phone">
                  <el-input
                    v-model="form.phone"
                    placeholder="请输入手机号"
                    :prefix-icon="Phone"
                    size="large"
                  />
                </el-form-item>
              </div>
            </div>

            <!-- 提交按钮 -->
            <button
              class="rp-submit-btn"
              :class="{ 'is-loading': loading }"
              :disabled="loading"
              type="button"
              @click="handleRegister"
            >
              <template v-if="!loading">
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                  <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z"/>
                </svg>
                <span>完成注册</span>
              </template>
              <template v-else>
                <span class="rp-spinner" />
                <span>注册中...</span>
              </template>
            </button>
          </el-form>

          <!-- 底部链接 -->
          <div class="rp-form-footer">
            <span class="rp-footer-hint">已有账号？</span>
            <button class="rp-login-link" @click="$router.push('/login')">
              立即登录 →
            </button>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { User, Lock, Message, Phone, Reading, Notebook } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { authApi } from '../api/auth.api'

const router = useRouter()
const loading = ref(false)
const formRef = ref<FormInstance>()

const form = ref({
  username: '',
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  identity: '',
  phone: ''
})

const validateConfirmPassword = (_rule: any, value: string, callback: any) => {
  if (!value) {
    callback(new Error('请再次输入密码'))
  } else if (value !== form.value.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度需在 3~20 个字符之间', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入真实姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '姓名长度需在 2~20 个字符之间', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于 6 位', trigger: 'blur' }
  ],
  confirmPassword: [{ required: true, validator: validateConfirmPassword, trigger: 'blur' }],
  identity: [{ required: true, message: '请选择身份类型', trigger: 'change' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的11位手机号', trigger: 'blur' }
  ],
  email: [
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ]
}

const handleRegister = async () => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const response = await authApi.register({
      username: form.value.username,
      password: form.value.password,
      name: form.value.name,
      identity: form.value.identity as 'teacher' | 'student',
      phone: form.value.phone,
      email: form.value.email || undefined
    })
    if (response.success) {
      ElMessage.success('注册成功！请使用您的账号登录')
      router.push('/login')
    } else {
      ElMessage.error(response.error?.message || '注册失败，请稍后重试')
    }
  } catch (error: any) {
    const msg = error?.response?.data?.error?.message || error?.message || ''
    if (msg.includes('already exists') || msg.includes('已存在') || msg.includes('UNIQUE')) {
      ElMessage.error('该用户名已被注册，请换一个')
    } else if (msg.includes('Network') || msg.includes('network') || msg.includes('Failed to fetch')) {
      ElMessage.error('网络连接失败，请检查网络后重试')
    } else if (msg) {
      ElMessage.error(msg)
    } else {
      ElMessage.error('注册失败，请稍后重试')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* ══════════════════════════════════════════════════
   页面容器
   ══════════════════════════════════════════════════ */
.rp-page {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
  background: linear-gradient(140deg, #F5F1EB 0%, #EDE8DE 45%, #E5DFD3 100%);
  font-family: var(--font-sans);
}

/* ══════════════════════════════════════════════════
   背景光球
   ══════════════════════════════════════════════════ */
.rp-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  pointer-events: none;
  z-index: 0;
}
.rp-orb-1 {
  width: 700px; height: 700px;
  background: rgba(200, 16, 46, 0.09);
  top: -200px; left: -100px;
  animation: rpOrbDrift 20s ease-in-out infinite;
}
.rp-orb-2 {
  width: 580px; height: 580px;
  background: rgba(124, 58, 237, 0.08);
  bottom: -160px; right: -80px;
  animation: rpOrbDrift 24s ease-in-out infinite reverse;
}
.rp-orb-3 {
  width: 450px; height: 450px;
  background: rgba(29, 78, 216, 0.07);
  top: 40%; left: 38%;
  animation: rpOrbDrift 17s ease-in-out infinite 6s;
}
.rp-orb-4 {
  width: 320px; height: 320px;
  background: rgba(16, 185, 129, 0.06);
  bottom: 10%; left: 25%;
  animation: rpOrbDrift 22s ease-in-out infinite 3s;
}

@keyframes rpOrbDrift {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33%       { transform: translate(26px, -20px) scale(1.06); }
  66%       { transform: translate(-18px, 16px) scale(0.94); }
}

/* ══════════════════════════════════════════════════
   顶部状态栏
   ══════════════════════════════════════════════════ */
.rp-topbar {
  position: relative;
  z-index: 10;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.52);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.55);
  box-shadow: 0 1px 0 rgba(200, 195, 180, 0.20);
}
.rp-topbar-inner {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 8px 28px;
}
.rp-topbar-logo { display: flex; gap: 5px; align-items: center; }
.rp-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
}
.rp-dot-red    { background: #C8102E; }
.rp-dot-yellow { background: #D97706; }
.rp-dot-green  { background: #10B981; }

.rp-topbar-text {
  flex: 1;
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: 0.5px;
  font-variant-numeric: tabular-nums;
}

.rp-topbar-tags { display: flex; gap: 6px; }
.rp-tag {
  padding: 2px 8px;
  font-size: 9px; font-weight: 700;
  letter-spacing: 1px;
  border-radius: 4px;
  background: rgba(200, 16, 46, 0.08);
  color: var(--gdut-red);
  border: 1px solid rgba(200, 16, 46, 0.18);
}
.rp-tag-blue {
  background: rgba(59, 130, 246, 0.08);
  color: #3B82F6;
  border-color: rgba(59, 130, 246, 0.18);
}
.rp-tag-purple {
  background: rgba(124, 58, 237, 0.08);
  color: var(--gdut-purple);
  border-color: rgba(124, 58, 237, 0.18);
}

/* ══════════════════════════════════════════════════
   主体布局
   ══════════════════════════════════════════════════ */
.rp-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 64px;
  padding: 24px 60px;
  position: relative;
  z-index: 5;
  min-height: 0;
}

/* ══════════════════════════════════════════════════
   左侧品牌区
   ══════════════════════════════════════════════════ */
.rp-brand-col {
  flex-shrink: 0;
  width: 320px;
}

.rp-brand-card {
  background: rgba(255, 255, 255, 0.52);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.60);
  border-radius: 24px;
  padding: 36px 28px 28px;
  box-shadow:
    0 8px 36px rgba(28, 16, 51, 0.07),
    0 0 0 1px rgba(255, 255, 255, 0.45) inset;
  animation: rpCardEntry 0.65s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes rpCardEntry {
  from { opacity: 0; transform: translateX(-24px) scale(0.97); }
  to   { opacity: 1; transform: translateX(0) scale(1); }
}

/* 徽标 */
.rp-emblem { margin-bottom: 22px; }
.rp-emblem-ring {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}
.rp-ring-outer {
  width: 84px; height: 84px;
  border: 1.5px solid rgba(200, 16, 46, 0.18);
  background: rgba(200, 16, 46, 0.03);
  animation: rpRingPulse 3.5s ease-in-out infinite;
}
@keyframes rpRingPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(200,16,46,0); }
  50%       { box-shadow: 0 0 16px 3px rgba(200,16,46,0.10); }
}
.rp-ring-inner {
  width: 64px; height: 64px;
  border: 1.5px solid rgba(200, 16, 46, 0.28);
  background: rgba(200, 16, 46, 0.05);
}
.rp-emblem-core {
  width: 46px; height: 46px;
  background: rgba(28, 16, 51, 0.06);
  border: 1px solid rgba(200, 16, 46, 0.22);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 标题 */
.rp-brand-title {
  font-size: 36px;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 6px;
  letter-spacing: -1px;
  line-height: 1.1;
}
.rp-brand-accent {
  background: linear-gradient(135deg, #C8102E, #7C3AED);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.rp-brand-sub {
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: 1px;
  margin: 0 0 20px;
  font-variant: small-caps;
}

/* 分割线 */
.rp-divider {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 22px;
}
.rp-divider-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, rgba(200,16,46,0.25), rgba(200,195,180,0.20), transparent);
}
.rp-divider-dot {
  width: 5px; height: 5px;
  background: var(--gdut-red);
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(200, 16, 46, 0.35);
}

/* 特性列表 */
.rp-features {
  list-style: none;
  padding: 0;
  margin: 0 0 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.rp-feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
}
.rp-feature-icon {
  width: 30px; height: 30px;
  border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.rp-fi-red    { background: rgba(200,16,46,0.08);  color: var(--gdut-red);   border: 1px solid rgba(200,16,46,0.14); }
.rp-fi-purple { background: rgba(124,58,237,0.08); color: var(--gdut-purple); border: 1px solid rgba(124,58,237,0.14); }
.rp-fi-blue   { background: rgba(59,130,246,0.08); color: #3B82F6;           border: 1px solid rgba(59,130,246,0.14); }
.rp-fi-green  { background: rgba(16,185,129,0.08); color: #059669;           border: 1px solid rgba(16,185,129,0.14); }

.rp-feature-text { display: flex; flex-direction: column; gap: 1px; }
.rp-feature-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.rp-feature-desc { font-size: 11px; color: var(--text-muted); }

/* 装饰圆圈 */
.rp-deco { position: relative; height: 40px; }
.rp-deco-circle {
  position: absolute;
  border-radius: 50%;
  border: 1px solid;
}
.rp-dc1 { width: 36px; height: 36px; border-color: rgba(200,16,46,0.12);  top: 2px; left: 10px; animation: rpCircleFloat 6s ease-in-out infinite; }
.rp-dc2 { width: 24px; height: 24px; border-color: rgba(124,58,237,0.10); top: 10px; left: 56px; animation: rpCircleFloat 8s ease-in-out infinite 2s; }
.rp-dc3 { width: 44px; height: 44px; border-color: rgba(29,78,216,0.09);  top: -2px; left: 88px; animation: rpCircleFloat 7s ease-in-out infinite 1s; }

@keyframes rpCircleFloat {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-6px); }
}

/* ══════════════════════════════════════════════════
   右侧表单区
   ══════════════════════════════════════════════════ */
.rp-form-col {
  flex: 1;
  min-width: 0;
  max-width: 560px;
}

.rp-form-card {
  background: rgba(255, 255, 255, 0.68);
  backdrop-filter: blur(24px) saturate(200%);
  -webkit-backdrop-filter: blur(24px) saturate(200%);
  border: 1px solid rgba(255, 255, 255, 0.60);
  border-radius: 24px;
  overflow: hidden;
  box-shadow:
    0 16px 50px rgba(28, 16, 51, 0.09),
    0 0 0 1px rgba(255, 255, 255, 0.45) inset;
  animation: rpCardEntry2 0.65s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both;
  transition: box-shadow 0.35s ease, transform 0.35s ease;
}
@keyframes rpCardEntry2 {
  from { opacity: 0; transform: translateY(24px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.rp-form-card:hover {
  box-shadow:
    0 20px 60px rgba(28, 16, 51, 0.11),
    0 0 0 1px rgba(200, 16, 46, 0.07) inset;
  transform: translateY(-2px);
}

/* 顶部彩条 */
.rp-form-bar {
  height: 4px;
  background: linear-gradient(90deg, #C8102E 0%, #7C3AED 45%, #1D4ED8 72%, #10B981 100%);
  position: relative;
  overflow: hidden;
}
.rp-form-bar::after {
  content: '';
  position: absolute;
  top: 0; left: -100%;
  width: 60%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent);
  animation: rpBarSheen 4.5s ease-in-out infinite;
}
@keyframes rpBarSheen {
  0%, 100% { left: -100%; }
  50%       { left: 150%; }
}

/* 表单头 */
.rp-form-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 24px 32px 0;
  margin-bottom: 18px;
}
.rp-form-icon {
  width: 46px; height: 46px;
  border-radius: 14px;
  background: var(--gradient-brand);
  display: flex; align-items: center; justify-content: center;
  color: #fff; flex-shrink: 0;
  box-shadow: 0 4px 14px rgba(200, 16, 46, 0.25);
}
.rp-form-title {
  font-size: 20px; font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 3px;
  letter-spacing: -0.4px;
}
.rp-form-subtitle {
  font-size: 11px;
  color: var(--text-muted);
  margin: 0;
}

/* 表单主体 */
.rp-form {
  padding: 0 32px 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rp-form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.rp-field-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rp-field-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 4px;
}
.rp-optional {
  font-size: 10px;
  font-weight: 400;
  color: var(--text-muted);
  text-transform: none;
  letter-spacing: 0;
  background: rgba(200, 195, 180, 0.20);
  padding: 1px 5px;
  border-radius: 4px;
}

/* Element Plus 覆盖 */
:deep(.el-form-item) {
  margin-bottom: 0 !important;
}
:deep(.el-form-item__error) {
  font-size: 11px;
  padding-top: 2px;
  color: var(--gdut-red);
}
:deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.55) !important;
  box-shadow: 0 0 0 1px rgba(200, 195, 180, 0.28) inset !important;
  border-radius: 10px !important;
  transition: all 0.2s ease !important;
}
:deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--gdut-red) inset !important;
  background: rgba(255, 255, 255, 0.70) !important;
}
:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1.5px var(--gdut-red) inset, 0 0 0 4px rgba(200, 16, 46, 0.08) !important;
  background: rgba(255, 255, 255, 0.80) !important;
}
:deep(.el-input__inner) {
  color: var(--text-primary) !important;
  font-size: 13px !important;
}
:deep(.el-input__inner::placeholder) {
  color: var(--text-muted) !important;
}
:deep(.el-input__prefix .el-icon) {
  color: var(--text-muted) !important;
}
:deep(.el-select .el-input__wrapper) {
  background: rgba(255, 255, 255, 0.55) !important;
}

/* 提交按钮 */
.rp-submit-btn {
  width: 100%; height: 46px;
  margin-top: 8px;
  border: none; border-radius: 12px;
  background: var(--gradient-brand);
  color: #fff;
  font-size: 15px; font-weight: 600;
  font-family: var(--font-sans);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  position: relative; overflow: hidden;
  box-shadow: 0 6px 20px rgba(200, 16, 46, 0.22);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.rp-submit-btn::before {
  content: '';
  position: absolute;
  top: 0; left: -100%;
  width: 100%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
  transition: left 0.5s ease;
}
.rp-submit-btn:hover::before { left: 100%; }
.rp-submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 28px rgba(200, 16, 46, 0.32);
}
.rp-submit-btn:active { transform: translateY(0); }
.rp-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

.rp-spinner {
  width: 15px; height: 15px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: rpSpin 0.7s linear infinite;
}
@keyframes rpSpin { to { transform: rotate(360deg); } }

/* 底部链接 */
.rp-form-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 14px 32px 20px;
}
.rp-footer-hint { font-size: 12px; color: var(--text-muted); }
.rp-login-link {
  background: none; border: none;
  font-size: 12px;
  color: var(--gdut-red);
  font-weight: 600;
  cursor: pointer; padding: 0;
  transition: color 0.2s;
  position: relative;
}
.rp-login-link:hover { color: var(--gdut-red-hover); }
.rp-login-link::after {
  content: '';
  position: absolute;
  bottom: -1px; left: 0;
  width: 0; height: 1.5px;
  background: var(--gdut-red);
  transition: width 0.3s ease;
}
.rp-login-link:hover::after { width: 100%; }

/* ══════════════════════════════════════════════════
   响应式
   ══════════════════════════════════════════════════ */
@media (max-width: 1100px) {
  .rp-brand-col { display: none; }
  .rp-body {
    padding: 24px 32px;
    justify-content: center;
  }
  .rp-form-col { max-width: 520px; }
}

@media (max-width: 640px) {
  .rp-body { padding: 16px; }
  .rp-form-row { grid-template-columns: 1fr; gap: 6px; }
  .rp-form { padding: 0 20px 0; }
  .rp-form-header { padding: 20px 20px 0; }
  .rp-form-footer { padding: 12px 20px 16px; }
  .rp-form-title { font-size: 18px; }
}
</style>
