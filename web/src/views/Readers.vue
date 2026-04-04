<template>
  <div class="readers-page">
    <!-- Header -->
    <div class="page-header animate-fade-in">
      <div class="page-header-left">
        <div class="page-title">读者管理</div>
        <div class="page-subtitle">共 {{ readers.length }} 位注册读者</div>
      </div>
      <div class="header-actions">
        <button class="gradient-btn" @click="handleAdd">
          <el-icon><Plus /></el-icon> 新增读者
        </button>
      </div>
    </div>

    <!-- Search -->
    <div class="filter-card animate-fade-in-delay-1">
      <div class="search-bar" style="max-width: 400px">
        <el-icon class="search-icon"><Search /></el-icon>
        <input
          v-model="searchKeyword"
          placeholder="搜索姓名、编号、电话…"
          @keydown.enter="handleSearch"
          @input="handleSearchDebounce"
        />
      </div>
    </div>

    <!-- Table -->
    <div class="table-card animate-fade-in-delay-2">
      <el-table v-loading="loading" :data="readers" style="width: 100%">
        <el-table-column label="读者信息" min-width="220">
          <template #default="{ row }">
            <div class="reader-cell">
              <div class="reader-avatar">{{ (row.name || '?')[0] }}</div>
              <div class="reader-meta">
                <div class="reader-name">{{ row.name }}</div>
                <div class="reader-no">{{ row.reader_no }}</div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="category_name" label="类别" width="120">
          <template #default="{ row }">
            <span class="pill-badge purple">{{ row.category_name || '—' }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="id_card" label="学号/工号" width="140">
          <template #default="{ row }">
            <span class="text-secondary-small">{{ row.id_card || '—' }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="phone" label="电话" width="140">
          <template #default="{ row }">
            <span class="text-secondary-small">{{ row.phone || '—' }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="organization" label="单位" min-width="140">
          <template #default="{ row }">
            <span class="text-secondary-small">{{ row.organization || '—' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <span v-if="row.status === 'active'" class="pill-badge success">正常</span>
            <span v-else-if="row.status === 'suspended'" class="pill-badge warning">挂失</span>
            <span v-else class="pill-badge danger">过期</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="140" align="right" fixed="right">
          <template #default="{ row }">
            <div class="action-cell">
              <button class="icon-btn" @click="handleEdit(row)" title="编辑">
                <el-icon><Edit /></el-icon>
              </button>
              <button class="icon-btn" @click="handleRenew(row)" title="续期">
                <el-icon><Timer /></el-icon>
              </button>
              <button class="icon-btn danger" @click="handleDelete(row)" title="删除">
                <el-icon><Delete /></el-icon>
              </button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Dialog -->
    <el-dialog v-model="showDialog" :title="editingReader ? '编辑读者' : '新增读者'" width="560px" align-center>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="读者编号" prop="reader_no">
          <el-input v-model="form.reader_no" :disabled="!!editingReader" placeholder="留空自动生成" />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="类别" prop="category_id">
          <el-select v-model="form.category_id" style="width: 100%" placeholder="请选择类别">
            <el-option v-for="cat in categories" :key="cat.id" :label="cat.name" :value="cat.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="学号/工号">
          <el-input v-model="form.id_card" placeholder="请输入学号或工号" />
        </el-form-item>
        <el-form-item label="性别">
          <el-radio-group v-model="form.gender">
            <el-radio value="male">男</el-radio>
            <el-radio value="female">女</el-radio>
            <el-radio value="other">其他</el-radio>
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
        <el-button type="primary" @click="handleSubmit">{{ editingReader ? '保存' : '创建' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Edit, Delete, Timer } from '@element-plus/icons-vue'
import { readerApi, readerCategoryApi } from '../api/reader.api'

const loading = ref(false)
const readers = ref<any[]>([])
const categories = ref<any[]>([])
const searchKeyword = ref('')
const showDialog = ref(false)
const editingReader = ref<any>(null)
const formRef = ref()

const form = reactive({
  reader_no: '', name: '', category_id: undefined as number | undefined,
  gender: 'male', id_card: '', organization: '', phone: '', email: '',
  address: '', registration_date: new Date().toISOString().split('T')[0], status: 'active'
})

const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  category_id: [{ required: true, message: '请选择类别', trigger: 'change' }]
}

let debounceTimer: any
const handleSearchDebounce = () => { clearTimeout(debounceTimer); debounceTimer = setTimeout(loadReaders, 500) }
const handleSearch = () => loadReaders()

const loadReaders = async () => {
  loading.value = true
  try {
    const result = searchKeyword.value
      ? await readerApi.search(searchKeyword.value)
      : await readerApi.getAll()
    if (result.success) readers.value = result.data
  } finally { loading.value = false }
}

const loadCategories = async () => {
  const result = await readerCategoryApi.getAll()
  if (result.success) categories.value = result.data
}

const handleAdd = () => {
  editingReader.value = null
  Object.assign(form, {
    reader_no: '', name: '', category_id: undefined, gender: 'male',
    id_card: '', organization: '', phone: '', email: '', address: '',
    registration_date: new Date().toISOString().split('T')[0], status: 'active'
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
      inputValue: '365', inputPattern: /^[1-9]\d*$/, inputErrorMessage: '请输入正整数'
    })
    const result = await readerApi.renew(row.id, parseInt(value))
    if (result.success) { ElMessage.success('续期成功'); loadReaders() }
  } catch {}
}

const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm(`确定要删除读者 "${row.name}" (${row.reader_no}) 吗？`, '删除确认', { type: 'warning' })
    const result = await readerApi.delete(row.id)
    if (result.success) { ElMessage.success('删除成功'); loadReaders() }
    else ElMessage.error(result.error?.message || '删除失败')
  } catch {}
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    const plainData = JSON.parse(JSON.stringify(form))
    const result = editingReader.value
      ? await readerApi.update(editingReader.value.id, plainData)
      : await readerApi.create(plainData)
    if (result.success) {
      ElMessage.success(editingReader.value ? '更新成功' : '创建成功')
      showDialog.value = false; loadReaders()
    } else ElMessage.error(result.error?.message || '操作失败')
  } catch {}
}

onMounted(() => { loadReaders(); loadCategories() })
</script>

<style scoped>
.readers-page { display: flex; flex-direction: column; gap: 20px; width: 100%; max-width: 1400px; margin: 0 auto; }

.filter-card {
  background: rgba(255,255,255,0.42); backdrop-filter: blur(18px) saturate(180%);
  -webkit-backdrop-filter: blur(18px) saturate(180%);
  border-radius: var(--radius-card);
  padding: 16px 20px; border: 1px solid rgba(255,255,255,0.40); box-shadow: var(--shadow-glass);
  transition: all 0.3s ease;
}
.filter-card:hover { box-shadow: 0 6px 24px rgba(28,16,51,0.08); }

.table-card {
  background: rgba(255,255,255,0.42); backdrop-filter: blur(18px) saturate(180%);
  -webkit-backdrop-filter: blur(18px) saturate(180%);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-glass); border: 1px solid rgba(255,255,255,0.40); overflow: hidden;
  transition: all 0.3s ease;
  width: 100%;
}

.reader-cell { display: flex; align-items: center; gap: 12px; }
.reader-avatar {
  width: 38px; height: 38px; border-radius: 10px;
  background: var(--gradient-brand); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 15px; font-weight: 700; flex-shrink: 0;
}
.reader-meta { display: flex; flex-direction: column; }
.reader-name { font-weight: 600; color: var(--text-primary); font-size: 14px; }
.reader-no { font-size: 12px; color: var(--text-muted); margin-top: 2px; font-family: 'Courier New', monospace; }
.text-secondary-small { font-size: 13px; color: var(--text-secondary); }

.action-cell { display: flex; align-items: center; gap: 4px; justify-content: flex-end; }

.header-actions { display: flex; gap: 10px; }
</style>
