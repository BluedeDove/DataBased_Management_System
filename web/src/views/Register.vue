<template>
  <div class="register-page">
    <!-- 背景网格 -->
    <div class="bg-grid" />
    <!-- 背景光晕 -->
    <div class="bg-glow bg-glow-red" />
    <div class="bg-glow bg-glow-purple" />
    <div class="bg-glow bg-glow-blue" />

    <!-- 扫描线装饰 -->
    <div class="scanline" />

    <!-- 顶部 GDUT 标语栏 -->
    <div class="top-bar">
      <div class="top-bar-inner">
        <div class="top-bar-logo">
          <span class="dot red" />
          <span class="dot yellow" />
          <span class="dot green" />
        </div>
        <span class="top-bar-text">广东工业大学 · 智能图书管理系统 · GDUT LMS v2.0</span>
        <div class="top-bar-tags">
          <span class="mini-tag">DATABASE</span>
          <span class="mini-tag blue">VUE3</span>
          <span class="mini-tag purple">AI</span>
        </div>
      </div>
    </div>

    <!-- 主体 -->
    <div class="register-body">
      <!-- 左侧品牌区 -->
      <div class="brand-panel">
        <!-- GDUT Logo -->
        <div class="gdut-emblem">
          <div class="emblem-ring outer">
            <div class="emblem-ring inner">
              <div class="emblem-core">
                <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="10" y="10" width="16" height="16" rx="2" fill="rgba(200,16,46,0.8)" />
                  <rect x="10" y="34" width="16" height="16" rx="2" fill="rgba(200,16,46,0.5)" />
                  <rect x="34" y="10" width="16" height="16" rx="2" fill="rgba(124,58,237,0.6)" />
                  <rect x="34" y="34" width="16" height="16" rx="2" fill="rgba(29,78,216,0.6)" />
                  <rect x="22" y="22" width="16" height="16" rx="2" fill="rgba(255,255,255,0.9)" />
                  <text x="30" y="33" text-anchor="middle" fill="#0A0F1E" font-size="7" font-weight="800" font-family="Inter, sans-serif">工</text>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <h1 class="brand-title">
          <span class="brand-sub">GDUT</span>
          加入我们
        </h1>
        <p class="brand-desc">广东工业大学 · Library Management System</p>

        <!-- 装饰分割线 -->
        <div class="brand-divider">
          <span class="divider-line" />
          <span class="divider-dot" />
          <span class="divider-line" />
        </div>

        <!-- 特性列表 -->
        <ul class="feature-list">
          <li>
            <span class="feature-icon red">
              <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85zm-5.242.156a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"/></svg>
            </span>
            <span>在线检索 · 快速查找图书</span>
          </li>
          <li>
            <span class="feature-icon purple">
              <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14"><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.01-.402-.29-.402l-.452.003.082-.381 1.96-.424h.32l-.108.507z"/><circle cx="8" cy="4.5" r="1"/></svg>
            </span>
            <span>到期提醒 · 借阅不逾期</span>
          </li>
          <li>
            <span class="feature-icon blue">
              <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14"><path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zM2.5 2a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm-6.5 8A1.5 1.5 0 0 1 5.5 9h3A1.5 1.5 0 0 1 10 10.5v3A1.5 1.5 0 0 1 8.5 15h-3A1.5 1.5 0 0 1 4 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zM12 9a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1h-1z"/></svg>
            </span>
            <span>AI 推荐 · 个性化书单</span>
          </li>
        </ul>

        <!-- 装饰圆圈 -->
        <div class="deco-circles">
          <div class="deco-circle c1" />
          <div class="deco-circle c2" />
          <div class="deco-circle c3" />
        </div>
      </div>

      <!-- 右侧注册表单 -->
      <div class="form-panel">
        <div class="form-card">
          <!-- 顶部装饰条 -->
          <div class="card-top-bar" />

          <div class="form-header">
            <h2 class="form-title">创建账号</h2>
            <p class="form-subtitle">Create Account · 填写以下信息完成注册</p>
          </div>

          <el-form
            ref="formRef"
            :model="form"
            :rules="rules"
            class="register-form"
          >
            <!-- 用户名 + 真实姓名 -->
            <div class="form-row">
              <div class="field-group">
                <label class="field-label">用户名</label>
                <el-form-item prop="username">
                  <el-input
                    v-model="form.username"
                    placeholder="用于登录的账号"
                    :prefix-icon="User"
                    size="large"
                  />
                </el-form-item>
              </div>
              <div class="field-group">
                <label class="field-label">真实姓名</label>
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
            <div class="field-group">
              <label class="field-label">电子邮箱</label>
              <el-form-item prop="email">
                <el-input
                  v-model="form.email"
                  placeholder="请输入邮箱地址（选填）"
                  :prefix-icon="Message"
                  size="large"
                />
              </el-form-item>
            </div>

            <!-- 密码 + 确认密码 -->
            <div class="form-row">
              <div class="field-group">
                <label class="field-label">密码</label>
                <el-form-item prop="password">
                  <el-input
                    v-model="form.password"
                    type="password"
                    placeholder="至少6位字符"
                    :prefix-icon="Lock"
                    show-password
                    size="large"
                  />
                </el-form-item>
              </div>
              <div class="field-group">
                <label class="field-label">确认密码</label>
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

            <!-- 身份选择 + 手机号 -->
            <div class="form-row">
              <div class="field-group">
                <label class="field-label">身份类型</label>
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
              <div class="field-group">
                <label class="field-label">手机号码</label>
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

            <button
              class="register-btn"
              :class="{ loading }"
              :disabled="loading"
              type="button"
              @click="handleRegister"
            >
              <span v-if="!loading" class="btn-content">
                <svg class="btn-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM12.447 13.106A4.49 4.49 0 008 10.5H8a4.49 4.49 0 00-4.447 2.606A1 1 0 003 14.5h10a1 1 0 00.447-1.394z" />
                  <path d="M14 7h2v2a1 1 0 102 0V7h2a1 1 0 100-2h-2V3a1 1 0 10-2 0v2h-2a1 1 0 100 2z" />
                </svg>
                完成注册
              </span>
              <span v-else class="btn-loading">
                <span class="spinner" />
                注册中...
              </span>
            </button>
          </el-form>

          <div class="form-footer">
            <span class="footer-text">已有账号？</span>
            <button class="link-btn" @click="$router.push('/login')">
              立即登录 →
            </button>
          </div>
        </div>

        <!-- 底部版权 -->
        <p class="copyright">
          &copy; 2026 广东工业大学 计算机学院 &middot; 数据库课程设计
        </p>
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
  // 先做前端校验，不通过直接返回（Element Plus 会在字段下方显示错误）
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
/* ===================== 页面基础 ===================== */
.register-page {
  position: relative;
  width: 100%;
  height: 100vh;
  background: #070B14;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ===================== 背景层 ===================== */
.bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 40px 40px;
  animation: gridDrift 60s linear infinite;
  z-index: 0;
}

@keyframes gridDrift {
  0%   { background-position: 0 0; }
  100% { background-position: 40px 40px; }
}

.bg-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  pointer-events: none;
  z-index: 0;
}
.bg-glow-red {
  width: 700px; height: 700px;
  background: rgba(200, 16, 46, 0.18);
  top: -200px; left: -100px;
  animation: glowFloat 12s ease-in-out infinite;
}
.bg-glow-purple {
  width: 600px; height: 600px;
  background: rgba(124, 58, 237, 0.16);
  bottom: -150px; right: 100px;
  animation: glowFloat 15s ease-in-out infinite reverse;
}
.bg-glow-blue {
  width: 450px; height: 450px;
  background: rgba(29, 78, 216, 0.12);
  top: 40%; left: 40%;
  animation: glowFloat 10s ease-in-out infinite 3s;
}

@keyframes glowFloat {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33%       { transform: translate(30px, -20px) scale(1.05); }
  66%       { transform: translate(-20px, 10px) scale(0.95); }
}

/* 扫描线 */
.scanline {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 2px;
  background: linear-gradient(90deg, transparent, rgba(200,16,46,0.4), transparent);
  animation: scanDown 8s linear infinite;
  z-index: 1;
  pointer-events: none;
}
@keyframes scanDown {
  0%   { top: -2px; opacity: 1; }
  90%  { opacity: 0.3; }
  100% { top: 100vh; opacity: 0; }
}

/* ===================== 顶部栏 ===================== */
.top-bar {
  position: relative;
  z-index: 10;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  background: rgba(7,11,20,0.6);
  backdrop-filter: blur(10px);
  flex-shrink: 0;
}
.top-bar-inner {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 24px;
}
.top-bar-logo { display: flex; gap: 5px; }
.dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  display: block;
}
.dot.red    { background: #C8102E; }
.dot.yellow { background: #D97706; }
.dot.green  { background: #10B981; }
.top-bar-text {
  flex: 1;
  font-size: 11px;
  color: rgba(255,255,255,0.35);
  font-family: 'Courier New', monospace;
  letter-spacing: 0.5px;
}
.top-bar-tags { display: flex; gap: 6px; }
.mini-tag {
  padding: 1px 6px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1px;
  border-radius: 3px;
  background: rgba(200,16,46,0.15);
  color: rgba(200,16,46,0.8);
  border: 1px solid rgba(200,16,46,0.25);
}
.mini-tag.blue {
  background: rgba(59,130,246,0.12);
  color: rgba(96,165,250,0.8);
  border-color: rgba(59,130,246,0.2);
}
.mini-tag.purple {
  background: rgba(124,58,237,0.12);
  color: rgba(167,139,250,0.8);
  border-color: rgba(124,58,237,0.2);
}

/* ===================== 主体布局 ===================== */
.register-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 80px;
  padding: 0 60px;
  position: relative;
  z-index: 5;
}

/* ===================== 左侧品牌区 ===================== */
.brand-panel {
  flex: 1;
  max-width: 460px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0;
}

/* GDUT 徽标 */
.gdut-emblem {
  margin-bottom: 28px;
}
.emblem-ring {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}
.emblem-ring.outer {
  width: 96px; height: 96px;
  border: 1px solid rgba(200,16,46,0.25);
  background: rgba(200,16,46,0.04);
  animation: ringPulse 3s ease-in-out infinite;
}
.emblem-ring.inner {
  width: 74px; height: 74px;
  border: 1px solid rgba(200,16,46,0.4);
  background: rgba(200,16,46,0.06);
}
.emblem-core {
  width: 54px; height: 54px;
  background: rgba(200,16,46,0.08);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(200,16,46,0.3);
}
.emblem-core svg { width: 40px; height: 40px; }

@keyframes ringPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(200,16,46,0); }
  50%       { box-shadow: 0 0 20px 4px rgba(200,16,46,0.12); }
}

.brand-title {
  font-size: 42px;
  font-weight: 800;
  color: #E2E8F0;
  line-height: 1.1;
  margin: 0 0 10px 0;
  letter-spacing: -1px;
}
.brand-sub {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #C8102E;
  letter-spacing: 4px;
  margin-bottom: 4px;
  font-family: 'Courier New', monospace;
}

.brand-desc {
  font-size: 13px;
  color: rgba(148,163,184,0.7);
  margin: 0 0 24px 0;
  letter-spacing: 0.5px;
}

.brand-divider {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 28px;
  width: 100%;
}
.divider-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, rgba(200,16,46,0.4), rgba(124,58,237,0.2), transparent);
}
.divider-dot {
  width: 5px; height: 5px;
  background: #C8102E;
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(200,16,46,0.6);
}

/* 特性列表 */
.feature-list {
  list-style: none;
  padding: 0; margin: 0 0 32px 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.feature-list li {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: #94A3B8;
}
.feature-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  flex-shrink: 0;
  color: rgba(148,163,184,0.4);
  background: rgba(148,163,184,0.05);
  border: 1px solid rgba(148,163,184,0.08);
}
.feature-icon.red {
  color: #C8102E;
  background: rgba(200,16,46,0.06);
  border-color: rgba(200,16,46,0.15);
}
.feature-icon.purple {
  color: #7C3AED;
  background: rgba(124,58,237,0.06);
  border-color: rgba(124,58,237,0.15);
}
.feature-icon.blue {
  color: #3B82F6;
  background: rgba(59,130,246,0.06);
  border-color: rgba(59,130,246,0.15);
}

/* 装饰圆圈 */
.deco-circles {
  position: relative;
  width: 180px;
  height: 60px;
  margin-top: 8px;
}
.deco-circle {
  position: absolute;
  border-radius: 50%;
  border: 1px solid;
}
.deco-circle.c1 {
  width: 48px; height: 48px;
  border-color: rgba(200,16,46,0.12);
  top: 6px; left: 20px;
  animation: circleFloat 6s ease-in-out infinite;
}
.deco-circle.c2 {
  width: 32px; height: 32px;
  border-color: rgba(124,58,237,0.12);
  top: 20px; left: 80px;
  animation: circleFloat 8s ease-in-out infinite 2s;
}
.deco-circle.c3 {
  width: 56px; height: 56px;
  border-color: rgba(29,78,216,0.10);
  top: 0; left: 120px;
  animation: circleFloat 7s ease-in-out infinite 1s;
}

@keyframes circleFloat {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-8px); }
}

/* ===================== 右侧表单区 ===================== */
.form-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.form-card {
  width: 520px;
  background: rgba(15, 22, 41, 0.55);
  backdrop-filter: blur(28px) saturate(200%);
  -webkit-backdrop-filter: blur(28px) saturate(200%);
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 22px;
  overflow: hidden;
  box-shadow:
    0 20px 60px rgba(0,0,0,0.5),
    0 0 0 1px rgba(255,255,255,0.05) inset,
    0 0 40px rgba(124,58,237,0.06);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.form-card:hover {
  box-shadow:
    0 24px 70px rgba(0,0,0,0.6),
    0 0 0 1px rgba(200,16,46,0.12) inset,
    0 0 60px rgba(200,16,46,0.08);
  transform: translateY(-3px);
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(24px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* 顶部彩色装饰条 */
.card-top-bar {
  height: 3px;
  background: linear-gradient(90deg, #C8102E 0%, #7C3AED 50%, #1D4ED8 100%);
}

.form-header {
  padding: 24px 32px 0;
}
.form-title {
  font-size: 24px;
  font-weight: 700;
  color: #E2E8F0;
  margin: 0 0 6px;
}
.form-subtitle {
  font-size: 12px;
  color: rgba(148,163,184,0.6);
  margin: 0;
  letter-spacing: 0.5px;
}

.register-form {
  padding: 20px 32px 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* 2列网格布局 */
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.field-label {
  font-size: 11px;
  font-weight: 600;
  color: rgba(148,163,184,0.8);
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

/* 覆盖 Element Plus 表单项样式 */
:deep(.el-form-item) {
  margin-bottom: 0 !important;
}
:deep(.el-form-item__error) {
  font-size: 11px;
  padding-top: 2px;
}
:deep(.el-input__wrapper) {
  background: rgba(255,255,255,0.04) !important;
  border: 1px solid rgba(255,255,255,0.08) !important;
  box-shadow: none !important;
  border-radius: 8px !important;
  transition: border-color 0.2s ease !important;
}
:deep(.el-input__wrapper:hover) {
  border-color: rgba(200,16,46,0.25) !important;
}
:deep(.el-input__wrapper.is-focus) {
  border-color: rgba(200,16,46,0.5) !important;
  box-shadow: 0 0 0 2px rgba(200,16,46,0.1) !important;
}
:deep(.el-input__inner) {
  color: #E2E8F0 !important;
  font-size: 13px !important;
}
:deep(.el-input__inner::placeholder) {
  color: rgba(148,163,184,0.35) !important;
}
:deep(.el-input__prefix .el-icon) {
  color: rgba(148,163,184,0.45) !important;
}
:deep(.el-select .el-input__wrapper) {
  background: rgba(255,255,255,0.04) !important;
}

/* 注册按钮 */
.register-btn {
  width: 100%;
  height: 46px;
  background: linear-gradient(135deg, #C8102E 0%, #A00C24 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  margin-top: 12px;
  margin-bottom: 4px;
}
.register-btn::before {
  content: '';
  position: absolute;
  top: 0; left: -100%;
  width: 100%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
  transition: left 0.4s ease;
}
.register-btn:hover::before { left: 100%; }
.register-btn:hover {
  background: linear-gradient(135deg, #E63347 0%, #C8102E 100%);
  box-shadow: 0 12px 32px rgba(200,16,46,0.50), 0 0 20px rgba(200,16,46,0.15);
  transform: translateY(-3px) scale(1.01);
}
.register-btn:active { transform: translateY(-1px) scale(0.99); }
.register-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

.btn-content, .btn-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.btn-icon { width: 16px; height: 16px; }
.spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

.form-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 32px 24px;
  font-size: 13px;
}
.footer-text { color: rgba(148,163,184,0.5); }
.link-btn {
  background: none;
  border: none;
  color: #C8102E;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  transition: color 0.2s;
}
.link-btn:hover { color: #E63347; text-decoration: underline; }

.copyright {
  font-size: 11px;
  color: rgba(148,163,184,0.3);
  text-align: center;
  margin: 0;
  letter-spacing: 0.3px;
}
</style>
