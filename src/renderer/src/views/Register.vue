<template>
  <div class="register-container">
    <div class="register-bg">
      <!-- 动态背景装饰 -->
      <div class="bg-decoration"></div>
    </div>

    <div class="register-card">
      <div class="register-header">
        <el-icon class="logo-icon" :size="48"><UserFilled /></el-icon>
        <h1 class="register-title">账号注册</h1>
        <p class="register-subtitle">Register New Account</p>
      </div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        class="register-form"
        label-width="100px"
      >
        <el-form-item label="姓名" prop="name">
          <el-input
            v-model="form.name"
            placeholder="请输入真实姓名"
            size="large"
            :prefix-icon="User"
          />
        </el-form-item>

        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="form.username"
            placeholder="请输入用户名（用于登录）"
            size="large"
            :prefix-icon="User"
          />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码（至少6位）"
            size="large"
            show-password
            :prefix-icon="Lock"
          />
        </el-form-item>

        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            size="large"
            show-password
            :prefix-icon="Lock"
          />
        </el-form-item>

        <el-form-item label="身份类型" prop="identity">
          <el-select
            v-model="form.identity"
            placeholder="请选择身份类型"
            size="large"
            style="width: 100%"
          >
            <el-option label="教师" value="teacher" />
            <el-option label="学生" value="student" />
          </el-select>
        </el-form-item>

        <el-form-item label="学号/工号" prop="id_card">
          <el-input
            v-model="form.id_card"
            placeholder="请输入学号或工号"
            size="large"
            :prefix-icon="Postcard"
          />
        </el-form-item>

        <el-form-item label="手机号" prop="phone">
          <el-input
            v-model="form.phone"
            placeholder="请输入手机号"
            size="large"
            :prefix-icon="Iphone"
          />
        </el-form-item>

        <el-form-item label="邮箱" prop="email">
          <el-input
            v-model="form.email"
            placeholder="请输入邮箱（可选）"
            size="large"
            :prefix-icon="Message"
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            class="register-button"
            @click="handleRegister"
          >
            {{ loading ? '注册中...' : '立即注册' }}
          </el-button>
        </el-form-item>

        <el-form-item>
          <div class="login-link">
            <span>已有账号？</span>
            <el-link type="primary" @click="goToLogin">立即登录</el-link>
          </div>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock, UserFilled, Postcard, Iphone, Message } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'

const router = useRouter()

const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive({
  name: '',
  username: '',
  password: '',
  confirmPassword: '',
  identity: '' as 'teacher' | 'student' | '',
  id_card: '',
  phone: '',
  email: ''
})

// 验证确认密码
const validateConfirmPassword = (_rule: any, value: string, callback: any) => {
  if (value === '') {
    callback(new Error('请再次输入密码'))
  } else if (value !== form.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

// 预留：手机号验证（暂不实现详细验证）
const validatePhone = (_rule: any, value: string, callback: any) => {
  if (!value) {
    callback(new Error('请输入手机号'))
  } else {
    // TODO: 添加手机号格式验证
    callback()
  }
}

// 预留：邮箱验证（暂不实现详细验证）
const validateEmail = (_rule: any, value: string, callback: any) => {
  if (value && value.trim()) {
    // TODO: 添加邮箱格式验证
    callback()
  } else {
    callback()
  }
}

const rules: FormRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在3到20个字符之间', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能小于6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, validator: validateConfirmPassword, trigger: 'blur' }
  ],
  identity: [{ required: true, message: '请选择身份类型', trigger: 'change' }],
  id_card: [{ required: true, message: '请输入学号或工号', trigger: 'blur' }],
  phone: [{ required: true, validator: validatePhone, trigger: 'blur' }],
  email: [{ validator: validateEmail, trigger: 'blur' }]
}

const handleRegister = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    loading.value = true

    // 调用注册API
    const response = await window.api.auth.register({
      username: form.username,
      password: form.password,
      name: form.name,
      identity: form.identity as 'teacher' | 'student',
      id_card: form.id_card,
      phone: form.phone,
      email: form.email || undefined
    })

    if (response.success) {
      ElMessage.success('注册成功！请使用您的账号登录')
      // 跳转到登录页
      router.push('/login')
    } else {
      ElMessage.error(response.error?.message || '注册失败')
    }
  } catch (error: any) {
    console.error('注册失败:', error)
    if (error instanceof Error) {
      ElMessage.error(error.message || '注册失败，请稍后重试')
    }
  } finally {
    loading.value = false
  }
}

const goToLogin = () => {
  router.push('/login')
}
</script>

<style scoped>
.register-container {
  position: relative;
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  overflow: hidden;
}

.register-bg {
  position: absolute;
  width: 100%;
  height: 100%;
}

.bg-decoration {
  position: absolute;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
  background-size: 50px 50px;
  animation: moveBackground 20s linear infinite;
}

@keyframes moveBackground {
  0% {
    transform: translate(0, 0);
  }
  100% {
    transform: translate(50px, 50px);
  }
}

.register-card {
  position: relative;
  width: 520px;
  max-height: 90vh;
  padding: 48px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  z-index: 1;
  animation: slideUp 0.6s ease-out;
  overflow-y: auto;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.register-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo-icon {
  color: #667eea;
  margin-bottom: 16px;
}

.register-title {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.register-subtitle {
  font-size: 14px;
  color: #909399;
  letter-spacing: 2px;
}

.register-form {
  margin-bottom: 0;
}

.register-button {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 8px;
  transition: transform 0.2s;
}

.register-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
}

.register-button:active {
  transform: translateY(0);
}

.login-link {
  width: 100%;
  text-align: center;
  color: #606266;
  font-size: 14px;
}

.login-link span {
  margin-right: 8px;
}
</style>
