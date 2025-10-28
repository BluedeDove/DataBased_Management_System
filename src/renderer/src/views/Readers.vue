<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">读者管理</h1>
      <p class="page-description">管理读者信息和读者证</p>
    </div>

    <div class="toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索姓名、编号、电话..."
          style="width: 300px"
          clearable
          @keyup.enter="handleSearch"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-button :icon="Search" @click="handleSearch">搜索</el-button>
      </div>
      <div class="toolbar-right">
        <el-button type="primary" :icon="Plus" @click="showDialog = true">
          新增读者
        </el-button>
      </div>
    </div>

    <div class="card">
      <el-table v-loading="loading" :data="readers" style="width: 100%">
        <el-table-column type="index" label="#" width="60" />
        <el-table-column prop="reader_no" label="读者编号" width="120" />
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="category_name" label="类别" width="100" />
        <el-table-column prop="phone" label="电话" width="130" />
        <el-table-column prop="organization" label="单位" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.status === 'active'" type="success">正常</el-tag>
            <el-tag v-else-if="row.status === 'suspended'" type="danger">挂失</el-tag>
            <el-tag v-else type="warning">过期</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="200">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button type="success" link size="small" @click="handleRenew(row)">续期</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="showDialog" title="读者信息" width="600px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="读者编号" prop="reader_no">
          <el-input v-model="form.reader_no" :disabled="!!editingReader" />
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
  organization: '',
  phone: '',
  email: '',
  address: '',
  registration_date: new Date().toISOString().split('T')[0],
  status: 'active'
})

const rules = {
  reader_no: [{ required: true, message: '请输入读者编号', trigger: 'blur' }],
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
  } catch (error) {}
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    const result = editingReader.value
      ? await window.api.reader.update(editingReader.value.id, form)
      : await window.api.reader.create(form)

    if (result.success) {
      ElMessage.success(editingReader.value ? '更新成功' : '创建成功')
      showDialog.value = false
      loadReaders()
    }
  } catch (error) {}
}

onMounted(() => {
  loadReaders()
  loadCategories()
})
</script>
