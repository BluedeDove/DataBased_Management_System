<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-group">
        <h1 class="page-title">读者管理</h1>
        <div class="gdut-dot"></div>
      </div>
      <p class="page-description">管理读者信息和读者证</p>
    </div>

    <div class="toolbar glass-toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索姓名、编号、电话..."
          style="width: 320px"
          clearable
          @keyup.enter="handleSearch"
          size="large"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-button :icon="Search" @click="handleSearch" size="large">搜索</el-button>
      </div>
      <div class="toolbar-right">
        <el-button type="primary" :icon="Plus" @click="handleAdd" size="large" class="add-btn">
          新增读者
        </el-button>
      </div>
    </div>

    <div class="glass-card table-container">
      <el-table v-loading="loading" :data="readers" style="width: 100%" class="custom-table">
        <el-table-column type="index" label="#" width="60" />
        <el-table-column prop="reader_no" label="读者编号" width="120" />
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="category_name" label="类别" width="100" />
        <el-table-column prop="id_card" label="学号/工号" width="130" />
        <el-table-column prop="phone" label="电话" width="130" />
        <el-table-column prop="organization" label="单位" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.status === 'active'" type="success">正常</el-tag>
            <el-tag v-else-if="row.status === 'suspended'" type="danger">挂失</el-tag>
            <el-tag v-else type="warning">过期</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="250">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button type="success" link size="small" @click="handleRenew(row)">续期</el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="showDialog" title="读者信息" width="600px" class="reader-dialog">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="读者编号" prop="reader_no">
          <el-input v-model="form.reader_no" :disabled="!!editingReader" placeholder="留空或输入AUTO自动生成" />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="类别" prop="category_id">
          <el-select v-model="form.category_id" style="width: 100%">
            <el-option
              v-for="cat in categories"
              :key="cat.id"
              :label="cat.name"
              :value="cat.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="学号/工号" prop="id_card">
          <el-input v-model="form.id_card" placeholder="请输入学号或工号" />
        </el-form-item>
        <el-form-item label="性别">
          <el-radio-group v-model="form.gender">
            <el-radio label="male">男</el-radio>
            <el-radio label="female">女</el-radio>
            <el-radio label="other">其他</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="单位">
          <el-input v-model="form.organization" />
        </el-form-item>
        <el-form-item label="电话">
          <el-input v-model="form.phone" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="form.email" />
        </el-form-item>
        <el-form-item label="地址">
          <el-input v-model="form.address" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus } from '@element-plus/icons-vue'

const loading = ref(false)
const readers = ref<any[]>([])
const categories = ref<any[]>([])
const searchKeyword = ref('')
const showDialog = ref(false)
const editingReader = ref<any>(null)
const formRef = ref()

const form = reactive({
  reader_no: '',
  name: '',
  category_id: undefined,
  gender: 'male',
  id_card: '',
  organization: '',
  phone: '',
  email: '',
  address: '',
  registration_date: new Date().toISOString().split('T')[0],
  status: 'active'
})

const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  category_id: [{ required: true, message: '请选择类别', trigger: 'change' }]
}

const loadReaders = async () => {
  loading.value = true
  try {
    const result = searchKeyword.value
      ? await window.api.reader.search(searchKeyword.value)
      : await window.api.reader.getAll()
    if (result.success) {
      readers.value = result.data
    }
  } finally {
    loading.value = false
  }
}

const loadCategories = async () => {
  const result = await window.api.readerCategory.getAll()
  if (result.success) {
    categories.value = result.data
  }
}

const handleSearch = () => {
  loadReaders()
}

const handleAdd = () => {
  editingReader.value = null
  Object.assign(form, {
    reader_no: '',
    name: '',
    category_id: undefined,
    gender: 'male',
    id_card: '',
    organization: '',
    phone: '',
    email: '',
    address: '',
    registration_date: new Date().toISOString().split('T')[0],
    status: 'active'
  })
  showDialog.value = true
}

const handleEdit = (row: any) => {
  editingReader.value = row
  Object.assign(form, row)
  showDialog.value = true
}

const handleRenew = async (row: any) => {
  try {
    const { value } = await ElMessageBox.prompt('请输入续期天数', '读者证续期', {
      inputValue: '365',
      inputPattern: /^[1-9]\d*$/,
      inputErrorMessage: '请输入正整数'
    })
    const result = await window.api.reader.renew(row.id, parseInt(value))
    if (result.success) {
      ElMessage.success('续期成功')
      loadReaders()
    }
  } catch (error) {
    // 用户取消操作
  }
}

const handleDelete = async (row: any) => {
  console.log('========== [前端] 开始删除读者 ==========')
  console.log('[前端] 读者信息:', { id: row.id, name: row.name, reader_no: row.reader_no })

  try {
    await ElMessageBox.confirm(
      `确定要删除读者 "${row.name}" (${row.reader_no}) 吗？如果该读者有未归还的借阅记录，将无法删除。`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    console.log('[前端] 用户确认删除')

    console.log('[前端] 调用delete API...')
    const result = await window.api.reader.delete(row.id)
    console.log('[前端] API返回结果:', result)

    if (result.success) {
      console.log('[前端] 删除成功')
      ElMessage.success('删除成功')
      loadReaders()
    } else {
      console.error('[前端] 删除失败:', result.error)
      ElMessage.error(result.error?.message || '删除失败')
    }
  } catch (error: any) {
    console.error('[前端] 删除出错:', error)
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error.message || '删除失败')
    } else {
      console.log('[前端] 用户取消删除')
    }
  }
  console.log('========== [前端] 删除读者结束 ==========\n')
}

const handleSubmit = async () => {
  console.log('========== [前端] 开始提交读者表单 ==========')
  console.log('[前端] 当前表单数据:', JSON.parse(JSON.stringify(form)))
  console.log('[前端] 是否为编辑模式:', !!editingReader.value)
  if (editingReader.value) {
    console.log('[前端] 编辑的读者ID:', editingReader.value.id)
  }

  try {
    console.log('[前端] 开始表单验证...')
    await formRef.value.validate()
    console.log('[前端] 表单验证通过')

    console.log('[前端] 准备调用API...')
    // 将响应式对象转换为普通对象，否则IPC无法克隆
    const plainData = JSON.parse(JSON.stringify(form))
    console.log('[前端] 转换为普通对象:', plainData)
    const result = editingReader.value
      ? await window.api.reader.update(editingReader.value.id, plainData)
      : await window.api.reader.create(plainData)

    console.log('[前端] API调用返回结果:', result)

    if (result.success) {
      console.log('[前端] 操作成功，准备关闭对话框并刷新列表')
      ElMessage.success(editingReader.value ? '更新成功' : '创建成功')
      showDialog.value = false
      loadReaders()
    } else {
      console.error('[前端] 操作失败:', result.error)
      ElMessage.error(result.error?.message || '操作失败')
    }
  } catch (error) {
    console.error('[前端] 捕获到错误:', error)
    if (error instanceof Error) {
      console.error('[前端] 错误堆栈:', error.stack)
    }
  }
  console.log('========== [前端] 读者表单提交结束 ==========\n')
}

onMounted(() => {
  loadReaders()
  loadCategories()
})
</script>

<style scoped>
.header-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.gdut-dot {
  width: 8px;
  height: 8px;
  background: var(--gdut-red);
  border-radius: 50%;
}

/* 工具栏样式 */
.glass-toolbar {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.add-btn {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-hover)) !important;
  border: none !important;
  font-weight: 600;
  padding: 0 24px;
}

/* 表格容器 */
.table-container {
  padding: 0;
  overflow: hidden;
  animation: fadeInUp 0.4s ease-out;
}

/* 表格样式增强 */
:deep(.custom-table .el-table__header-wrapper) {
  background: rgba(248, 250, 252, 0.8);
}

:deep(.custom-table .el-table__body tr) {
  transition: all 0.2s ease;
}

:deep(.custom-table .el-table__body tr:hover) {
  background: rgba(99, 102, 241, 0.04) !important;
  transform: scale(1.005);
}

/* 操作按钮 */
:deep(.el-button--text) {
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 6px;
  transition: all 0.2s ease;
}

:deep(.el-button--text.el-button--primary) {
  color: var(--primary-color);
}

:deep(.el-button--text.el-button--primary:hover) {
  background: rgba(99, 102, 241, 0.1);
}

:deep(.el-button--text.el-button--success) {
  color: var(--success-color);
}

:deep(.el-button--text.el-button--success:hover) {
  background: rgba(16, 185, 129, 0.1);
}

:deep(.el-button--text.el-button--danger) {
  color: var(--danger-color);
}

:deep(.el-button--text.el-button--danger:hover) {
  background: rgba(239, 68, 68, 0.1);
}

/* 对话框样式 */
:deep(.reader-dialog .el-dialog__body) {
  padding: 24px 32px;
}

:deep(.reader-dialog .el-form-item__label) {
  font-weight: 600;
  color: var(--text-secondary);
}

:deep(.reader-dialog .el-input__wrapper) {
  transition: all 0.2s ease;
}

:deep(.reader-dialog .el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--primary-light) inset !important;
}

/* 状态标签增强 */
:deep(.el-tag) {
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 6px;
  letter-spacing: 0.5px;
}
</style>
