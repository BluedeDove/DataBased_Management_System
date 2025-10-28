<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">图书管理</h1>
      <p class="page-description">管理图书信息、分类和库存</p>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索书名、作者、ISBN..."
          style="width: 300px"
          clearable
          @clear="handleSearch"
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-select
          v-model="filterCategory"
          placeholder="选择类别"
          clearable
          style="width: 150px"
          @change="handleSearch"
        >
          <el-option
            v-for="cat in categories"
            :key="cat.id"
            :label="cat.name"
            :value="cat.id"
          />
        </el-select>
        <el-button :icon="Search" @click="handleSearch">搜索</el-button>
      </div>

      <div class="toolbar-right">
        <el-button type="primary" :icon="Plus" @click="showAddDialog = true">
          新增图书
        </el-button>
        <el-button :icon="Setting" @click="showCategoryDialog = true">
          类别管理
        </el-button>
      </div>
    </div>

    <!-- 图书列表 -->
    <div class="card">
      <el-table v-loading="loading" :data="books" style="width: 100%">
        <el-table-column type="index" label="#" width="60" />
        <el-table-column prop="isbn" label="ISBN" width="140" />
        <el-table-column label="书名" width="220">
          <template #default="{ row }">
            <div class="book-cell">
              <div class="book-title">{{ row.title }}</div>
              <div class="book-author">{{ row.author }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="category_name" label="类别" width="100" />
        <el-table-column prop="publisher" label="出版社" width="150" />
        <el-table-column prop="publish_date" label="出版日期" width="110" />
        <el-table-column label="库存" width="120" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.available_quantity > 0" type="success">
              {{ row.available_quantity }}/{{ row.total_quantity }}
            </el-tag>
            <el-tag v-else type="danger">
              {{ row.available_quantity }}/{{ row.total_quantity }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.status === 'normal'" type="success">正常</el-tag>
            <el-tag v-else-if="row.status === 'damaged'" type="warning">损坏</el-tag>
            <el-tag v-else-if="row.status === 'lost'" type="danger">丢失</el-tag>
            <el-tag v-else type="info">已销毁</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="200">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleView(row)">
              详情
            </el-button>
            <el-button type="primary" link size="small" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button type="warning" link size="small" @click="handleAddCopies(row)">
              增加馆藏
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 新增/编辑图书对话框 -->
    <el-dialog
      v-model="showAddDialog"
      :title="editingBook ? '编辑图书' : '新增图书'"
      width="600px"
      @close="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="ISBN" prop="isbn">
          <el-input v-model="form.isbn" :disabled="!!editingBook" />
        </el-form-item>
        <el-form-item label="书名" prop="title">
          <el-input v-model="form.title" />
        </el-form-item>
        <el-form-item label="作者" prop="author">
          <el-input v-model="form.author" />
        </el-form-item>
        <el-form-item label="出版社" prop="publisher">
          <el-input v-model="form.publisher" />
        </el-form-item>
        <el-form-item label="类别" prop="category_id">
          <el-select v-model="form.category_id" placeholder="请选择类别" style="width: 100%">
            <el-option
              v-for="cat in categories"
              :key="cat.id"
              :label="cat.name"
              :value="cat.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="出版日期" prop="publish_date">
          <el-date-picker
            v-model="form.publish_date"
            type="date"
            placeholder="选择日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="价格" prop="price">
              <el-input-number v-model="form.price" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="页数" prop="pages">
              <el-input-number v-model="form.pages" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="数量" prop="total_quantity">
          <el-input-number v-model="form.total_quantity" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="form.keywords" placeholder="用逗号分隔" />
        </el-form-item>
        <el-form-item label="简介">
          <el-input v-model="form.description" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 类别管理对话框 -->
    <el-dialog v-model="showCategoryDialog" title="类别管理" width="500px">
      <el-button type="primary" :icon="Plus" size="small" @click="handleAddCategory">
        新增类别
      </el-button>
      <el-table :data="categories" style="width: 100%; margin-top: 16px">
        <el-table-column prop="code" label="编码" width="100" />
        <el-table-column prop="name" label="名称" />
        <el-table-column prop="keywords" label="关键词" />
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

const loading = ref(false)
const books = ref<any[]>([])
const categories = ref<any[]>([])

const searchKeyword = ref('')
const filterCategory = ref<number>()

const showAddDialog = ref(false)
const showCategoryDialog = ref(false)
const editingBook = ref<any>(null)
const formRef = ref<FormInstance>()

const form = reactive({
  isbn: '',
  title: '',
  author: '',
  publisher: '',
  category_id: undefined as number | undefined,
  publish_date: '',
  price: 0,
  pages: 0,
  total_quantity: 1,
  keywords: '',
  description: '',
  registration_date: new Date().toISOString().split('T')[0],
  status: 'normal',
  available_quantity: 1
})

const rules: FormRules = {
  isbn: [{ required: true, message: '请输入ISBN', trigger: 'blur' }],
  title: [{ required: true, message: '请输入书名', trigger: 'blur' }],
  author: [{ required: true, message: '请输入作者', trigger: 'blur' }],
  publisher: [{ required: true, message: '请输入出版社', trigger: 'blur' }],
  category_id: [{ required: true, message: '请选择类别', trigger: 'change' }]
}

const loadBooks = async () => {
  loading.value = true
  try {
    const result = await window.api.book.getAll({
      category_id: filterCategory.value,
      keyword: searchKeyword.value
    })
    if (result.success) {
      books.value = result.data
    }
  } catch (error) {
    ElMessage.error('加载图书列表失败')
  } finally {
    loading.value = false
  }
}

const loadCategories = async () => {
  try {
    const result = await window.api.bookCategory.getAll()
    if (result.success) {
      categories.value = result.data
    }
  } catch (error) {
    ElMessage.error('加载类别列表失败')
  }
}

const handleSearch = () => {
  loadBooks()
}

const handleView = (row: any) => {
  ElMessageBox.alert(
    `
    <div style="line-height: 2">
      <p><strong>ISBN:</strong> ${row.isbn}</p>
      <p><strong>书名:</strong> ${row.title}</p>
      <p><strong>作者:</strong> ${row.author}</p>
      <p><strong>出版社:</strong> ${row.publisher}</p>
      <p><strong>类别:</strong> ${row.category_name}</p>
      <p><strong>总数量:</strong> ${row.total_quantity}</p>
      <p><strong>可借数量:</strong> ${row.available_quantity}</p>
      ${row.description ? `<p><strong>简介:</strong> ${row.description}</p>` : ''}
    </div>
    `,
    '图书详情',
    {
      dangerouslyUseHTMLString: true,
      confirmButtonText: '关闭'
    }
  )
}

const handleEdit = (row: any) => {
  editingBook.value = row
  Object.assign(form, row)
  showAddDialog.value = true
}

const handleAddCopies = async (row: any) => {
  try {
    const { value } = await ElMessageBox.prompt('请输入要增加的数量', '增加馆藏', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /^[1-9]\d*$/,
      inputErrorMessage: '请输入正整数'
    })

    const quantity = parseInt(value)
    const result = await window.api.book.addCopies(row.id, quantity)

    if (result.success) {
      ElMessage.success(`成功增加 ${quantity} 册`)
      loadBooks()
    } else {
      ElMessage.error(result.error?.message || '操作失败')
    }
  } catch (error) {
    // 用户取消
  }
}

const handleAddCategory = async () => {
  try {
    const { value } = await ElMessageBox.prompt('请输入类别信息（格式：编码,名称）', '新增类别', {
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })

    const [code, name] = value.split(',').map((s: string) => s.trim())
    if (!code || !name) {
      ElMessage.warning('格式错误')
      return
    }

    const result = await window.api.bookCategory.create({ code, name })
    if (result.success) {
      ElMessage.success('创建成功')
      loadCategories()
    } else {
      ElMessage.error(result.error?.message || '创建失败')
    }
  } catch (error) {
    // 用户取消
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()

    form.available_quantity = form.total_quantity

    const result = editingBook.value
      ? await window.api.book.update(editingBook.value.id, form)
      : await window.api.book.create(form)

    if (result.success) {
      ElMessage.success(editingBook.value ? '更新成功' : '创建成功')
      showAddDialog.value = false
      loadBooks()
    } else {
      ElMessage.error(result.error?.message || '操作失败')
    }
  } catch (error) {
    // 验证失败
  }
}

const resetForm = () => {
  editingBook.value = null
  formRef.value?.resetFields()
  Object.assign(form, {
    isbn: '',
    title: '',
    author: '',
    publisher: '',
    category_id: undefined,
    publish_date: '',
    price: 0,
    pages: 0,
    total_quantity: 1,
    keywords: '',
    description: '',
    registration_date: new Date().toISOString().split('T')[0],
    status: 'normal',
    available_quantity: 1
  })
}

onMounted(() => {
  loadBooks()
  loadCategories()
})
</script>

<style scoped>
.book-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.book-title {
  font-weight: 500;
  color: #303133;
}

.book-author {
  font-size: 12px;
  color: #909399;
}
</style>
