<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">系统设置</h1>
      <p class="page-description">管理系统参数和配置</p>
    </div>

    <div class="card">
      <el-tabs>
        <el-tab-pane label="基本信息">
          <el-descriptions title="系统信息" :column="2" border>
            <el-descriptions-item label="系统名称">智能图书管理系统</el-descriptions-item>
            <el-descriptions-item label="版本">1.0.0</el-descriptions-item>
            <el-descriptions-item label="当前用户">{{ userStore.user?.name }}</el-descriptions-item>
            <el-descriptions-item label="角色">
              {{ userStore.user?.role === 'admin' ? '管理员' : '图书管理员' }}
            </el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>

        <el-tab-pane label="读者种类">
          <el-button type="primary" :icon="Plus" @click="showCategoryDialog = true">
            新增种类
          </el-button>
          <el-table :data="readerCategories" style="margin-top: 16px">
            <el-table-column prop="code" label="编码" width="100" />
            <el-table-column prop="name" label="名称" width="120" />
            <el-table-column prop="max_borrow_count" label="最大借阅数" width="110" />
            <el-table-column prop="max_borrow_days" label="借阅期限(天)" width="120" />
            <el-table-column prop="validity_days" label="有效期(天)" width="110" />
            <el-table-column prop="notes" label="备注" />
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="关于">
          <div style="text-align: center; padding: 40px">
            <el-icon :size="80" color="#409eff"><Reading /></el-icon>
            <h2 style="margin: 20px 0">智能图书管理系统</h2>
            <p style="color: #909399; line-height: 2">
              基于 Electron + Vue 3 + TypeScript 开发<br />
              采用领域驱动设计和分层架构<br />
              提供完整的图书馆管理解决方案
            </p>
            <div style="margin-top: 40px">
              <el-tag>v1.0.0</el-tag>
              <el-tag type="success" style="margin-left: 10px">企业级</el-tag>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <el-dialog v-model="showCategoryDialog" title="新增读者种类" width="500px">
      <el-form :model="categoryForm" label-width="120px">
        <el-form-item label="编码">
          <el-input v-model="categoryForm.code" />
        </el-form-item>
        <el-form-item label="名称">
          <el-input v-model="categoryForm.name" />
        </el-form-item>
        <el-form-item label="最大借阅数">
          <el-input-number v-model="categoryForm.max_borrow_count" :min="1" />
        </el-form-item>
        <el-form-item label="借阅期限(天)">
          <el-input-number v-model="categoryForm.max_borrow_days" :min="1" />
        </el-form-item>
        <el-form-item label="有效期(天)">
          <el-input-number v-model="categoryForm.validity_days" :min="1" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="categoryForm.notes" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCategoryDialog = false">取消</el-button>
        <el-button type="primary" @click="handleCreateCategory">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import { ElMessage } from 'element-plus'

const userStore = useUserStore()
const showCategoryDialog = ref(false)
const readerCategories = ref<any[]>([])

const categoryForm = reactive({
  code: '',
  name: '',
  max_borrow_count: 5,
  max_borrow_days: 30,
  validity_days: 365,
  notes: ''
})

const loadCategories = async () => {
  const result = await window.api.readerCategory.getAll()
  if (result.success) {
    readerCategories.value = result.data
  }
}

const handleCreateCategory = async () => {
  if (!categoryForm.code || !categoryForm.name) {
    ElMessage.warning('请填写完整信息')
    return
  }

  const result = await window.api.readerCategory.create(categoryForm)
  if (result.success) {
    ElMessage.success('创建成功')
    showCategoryDialog.value = false
    loadCategories()
    Object.assign(categoryForm, {
      code: '',
      name: '',
      max_borrow_count: 5,
      max_borrow_days: 30,
      validity_days: 365,
      notes: ''
    })
  } else {
    ElMessage.error(result.error?.message || '创建失败')
  }
}

onMounted(() => {
  loadCategories()
})
</script>
