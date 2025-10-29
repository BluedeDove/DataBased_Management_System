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
        <el-button @click="showAdvancedSearch = !showAdvancedSearch">
          {{ showAdvancedSearch ? '收起高级搜索' : '高级搜索' }}
        </el-button>
      </div>

      <div class="toolbar-right">
        <el-dropdown @command="handleExport" style="margin-right: 12px">
          <el-button :icon="Download">
            导出数据<el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="csv">导出为CSV</el-dropdown-item>
              <el-dropdown-item command="json">导出为JSON</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button v-if="canManageBooks" type="primary" :icon="Plus" @click="showAddDialog = true">
          新增图书
        </el-button>
        <el-button v-if="canManageBooks" :icon="Setting" @click="showCategoryDialog = true">
          类别管理
        </el-button>
      </div>
    </div>

    <!-- 高级搜索面板 -->
    <el-collapse-transition>
      <div v-show="showAdvancedSearch" class="card advanced-search-panel">
        <el-tabs v-model="activeSearchTab" type="border-card">
          <!-- 条件搜索 -->
          <el-tab-pane label="条件搜索" name="conditional">
            <el-form :model="conditionalForm" label-width="100px">
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="书名">
                    <el-input v-model="conditionalForm.title" placeholder="请输入书名" clearable />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="作者">
                    <el-input v-model="conditionalForm.author" placeholder="请输入作者" clearable />
                  </el-form-item>
                </el-col>
              </el-row>
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="出版社">
                    <el-input v-model="conditionalForm.publisher" placeholder="请输入出版社" clearable />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="类别">
                    <el-select v-model="conditionalForm.category_id" placeholder="选择类别" clearable style="width: 100%">
                      <el-option
                        v-for="cat in categories"
                        :key="cat.id"
                        :label="cat.name"
                        :value="cat.id"
                      />
                    </el-select>
                  </el-form-item>
                </el-col>
              </el-row>
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="出版日期">
                    <el-date-picker
                      v-model="conditionalForm.publishDateRange"
                      type="daterange"
                      range-separator="至"
                      start-placeholder="开始日期"
                      end-placeholder="结束日期"
                      format="YYYY-MM-DD"
                      value-format="YYYY-MM-DD"
                      style="width: 100%"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="价格范围">
                    <div style="display: flex; align-items: center; gap: 8px">
                      <el-input-number v-model="conditionalForm.priceMin" :min="0" :precision="2" placeholder="最低价" style="width: 100%" />
                      <span>-</span>
                      <el-input-number v-model="conditionalForm.priceMax" :min="0" :precision="2" placeholder="最高价" style="width: 100%" />
                    </div>
                  </el-form-item>
                </el-col>
              </el-row>
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="关键词">
                    <el-input v-model="conditionalForm.keyword" placeholder="请输入关键词" clearable />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="状态">
                    <el-select v-model="conditionalForm.status" placeholder="选择状态" clearable style="width: 100%">
                      <el-option label="正常" value="normal" />
                      <el-option label="损坏" value="damaged" />
                      <el-option label="丢失" value="lost" />
                      <el-option label="已销毁" value="destroyed" />
                    </el-select>
                  </el-form-item>
                </el-col>
              </el-row>
              <el-form-item>
                <el-button type="primary" @click="handleConditionalSearch">搜索</el-button>
                <el-button @click="resetConditionalForm">重置</el-button>
              </el-form-item>
            </el-form>
          </el-tab-pane>

          <!-- 正则搜索 -->
          <el-tab-pane label="正则搜索" name="regex">
            <el-form :model="regexForm" label-width="100px">
              <el-form-item label="正则表达式">
                <el-input
                  v-model="regexForm.pattern"
                  placeholder="请输入正则表达式，例如：^[A-Z].*"
                  clearable
                >
                  <template #prepend>
                    <span>/</span>
                  </template>
                  <template #append>
                    <span>/</span>
                  </template>
                </el-input>
              </el-form-item>
              <el-form-item label="搜索字段">
                <el-checkbox-group v-model="regexForm.fields">
                  <el-checkbox label="title">书名</el-checkbox>
                  <el-checkbox label="author">作者</el-checkbox>
                  <el-checkbox label="publisher">出版社</el-checkbox>
                  <el-checkbox label="isbn">ISBN</el-checkbox>
                  <el-checkbox label="keywords">关键词</el-checkbox>
                  <el-checkbox label="description">简介</el-checkbox>
                </el-checkbox-group>
              </el-form-item>
              <el-form-item>
                <el-alert
                  title="提示：正则表达式使用JavaScript语法，例如 ^[A-Z].* 匹配以大写字母开头的内容"
                  type="info"
                  :closable="false"
                  show-icon
                />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="handleRegexSearch">搜索</el-button>
                <el-button @click="resetRegexForm">重置</el-button>
              </el-form-item>
            </el-form>
          </el-tab-pane>

          <!-- SQL搜索 (所有人可用) -->
          <el-tab-pane label="SQL搜索" name="sql">
            <el-form :model="sqlForm" label-width="100px">
              <el-form-item label="SQL查询">
                <el-input
                  v-model="sqlForm.query"
                  type="textarea"
                  :rows="10"
                  placeholder="请输入SQL查询语句，例如：&#10;SELECT * FROM books WHERE price > 50 AND status = 'normal'&#10;&#10;注意：仅支持SELECT查询"
                  style="font-family: 'Courier New', monospace"
                />
              </el-form-item>
              <el-form-item>
                <el-alert
                  title="警告：此功能仅对管理员开放。请确保SQL语句安全，仅支持SELECT查询。"
                  type="warning"
                  :closable="false"
                  show-icon
                />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="handleSqlSearch">执行查询</el-button>
                <el-button @click="resetSqlForm">重置</el-button>
              </el-form-item>
            </el-form>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-collapse-transition>

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
            <el-button v-if="canManageBooks" type="primary" link size="small" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button v-if="canManageBooks" type="warning" link size="small" @click="handleAddCopies(row)">
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
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const loading = ref(false)
const books = ref<any[]>([])
const categories = ref<any[]>([])

const searchKeyword = ref('')
const filterCategory = ref<number>()

// Advanced search state
const showAdvancedSearch = ref(false)
const activeSearchTab = ref('conditional')

// 角色权限相关
const userRole = computed(() => userStore.user?.role || '')
const isAdmin = computed(() => userRole.value === 'admin')
const isLibrarian = computed(() => userRole.value === 'librarian')
const canManageBooks = computed(() => isAdmin.value || isLibrarian.value)

// Conditional search form
const conditionalForm = reactive({
  title: '',
  author: '',
  publisher: '',
  category_id: undefined as number | undefined,
  publishDateRange: [] as string[],
  priceMin: undefined as number | undefined,
  priceMax: undefined as number | undefined,
  keyword: '',
  status: ''
})

// Regex search form
const regexForm = reactive({
  pattern: '',
  fields: [] as string[]
})

// SQL search form
const sqlForm = reactive({
  query: ''
})

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

const handleExport = async (command: string) => {
  if (books.value.length === 0) {
    ElMessage.warning('暂无数据可导出')
    return
  }

  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `图书数据_${timestamp}`

  try {
    if (command === 'csv') {
      const result = await window.api.export.toCSV({
        filename: `${filename}.csv`,
        data: books.value.map((book: any) => ({
          ISBN: book.isbn,
          书名: book.title,
          作者: book.author,
          出版社: book.publisher,
          类别: book.category_name,
          出版日期: book.publish_date || '',
          价格: book.price || 0,
          总数量: book.total_quantity,
          可借数量: book.available_quantity,
          状态: book.status
        }))
      })

      if (result.success) {
        ElMessage.success('导出成功')
      }
    } else if (command === 'json') {
      const result = await window.api.export.toJSON({
        filename: `${filename}.json`,
        data: books.value
      })

      if (result.success) {
        ElMessage.success('导出成功')
      }
    }
  } catch (error: any) {
    if (error.message !== '用户取消导出') {
      ElMessage.error('导出失败')
    }
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

// Advanced search handlers
const handleConditionalSearch = async () => {
  loading.value = true
  try {
    const criteria: any = {}

    if (conditionalForm.title) criteria.title = conditionalForm.title
    if (conditionalForm.author) criteria.author = conditionalForm.author
    if (conditionalForm.publisher) criteria.publisher = conditionalForm.publisher
    if (conditionalForm.category_id) criteria.category_id = conditionalForm.category_id
    if (conditionalForm.publishDateRange && conditionalForm.publishDateRange.length === 2) {
      criteria.publishDateStart = conditionalForm.publishDateRange[0]
      criteria.publishDateEnd = conditionalForm.publishDateRange[1]
    }
    if (conditionalForm.priceMin !== undefined) criteria.priceMin = conditionalForm.priceMin
    if (conditionalForm.priceMax !== undefined) criteria.priceMax = conditionalForm.priceMax
    if (conditionalForm.keyword) criteria.keyword = conditionalForm.keyword
    if (conditionalForm.status) criteria.status = conditionalForm.status

    const result = await window.api.book.advancedSearch(criteria)

    if (result.success) {
      books.value = result.data
      ElMessage.success(`找到 ${result.data.length} 条结果`)
    } else {
      ElMessage.error(result.error?.message || '搜索失败')
    }
  } catch (error) {
    ElMessage.error('搜索失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

const handleRegexSearch = async () => {
  if (!regexForm.pattern) {
    ElMessage.warning('请输入正则表达式')
    return
  }

  if (regexForm.fields.length === 0) {
    ElMessage.warning('请选择至少一个搜索字段')
    return
  }

  // Validate regex pattern
  try {
    new RegExp(regexForm.pattern)
  } catch (e) {
    ElMessage.error('正则表达式格式错误')
    return
  }

  loading.value = true
  try {
    const result = await window.api.book.regexSearch(regexForm.pattern, regexForm.fields)

    if (result.success) {
      books.value = result.data
      ElMessage.success(`找到 ${result.data.length} 条结果`)
    } else {
      ElMessage.error(result.error?.message || '搜索失败')
    }
  } catch (error) {
    ElMessage.error('搜索失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

const handleSqlSearch = async () => {
  if (!sqlForm.query.trim()) {
    ElMessage.warning('请输入SQL查询语句')
    return
  }

  // Basic validation to ensure only SELECT queries
  const trimmedQuery = sqlForm.query.trim().toUpperCase()
  if (!trimmedQuery.startsWith('SELECT')) {
    ElMessage.error('仅支持SELECT查询语句')
    return
  }

  loading.value = true
  try {
    const result = await window.api.search.executeSql(sqlForm.query)

    if (result.success) {
      books.value = result.data
      ElMessage.success(`找到 ${result.data.length} 条结果`)
    } else {
      ElMessage.error(result.error?.message || '查询失败')
    }
  } catch (error) {
    ElMessage.error('查询失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

const resetConditionalForm = () => {
  Object.assign(conditionalForm, {
    title: '',
    author: '',
    publisher: '',
    category_id: undefined,
    publishDateRange: [],
    priceMin: undefined,
    priceMax: undefined,
    keyword: '',
    status: ''
  })
}

const resetRegexForm = () => {
  Object.assign(regexForm, {
    pattern: '',
    fields: []
  })
}

const resetSqlForm = () => {
  sqlForm.query = ''
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

.advanced-search-panel {
  margin-bottom: 16px;
}

.advanced-search-panel :deep(.el-tabs__content) {
  padding: 20px;
}

.advanced-search-panel :deep(.el-form-item) {
  margin-bottom: 18px;
}

.advanced-search-panel :deep(.el-checkbox) {
  margin-right: 20px;
}
</style>
