<template>
  <div class="page-container">
    <div class="action-bar">
      <div class="title-group">
        <h2 class="page-title">
          图书库
        </h2>
        <div class="gdut-decoration" />
        <span class="sub-text">管理全馆 {{ total }} 本藏书</span>
      </div>
      <div class="actions">
        <el-button
          v-if="canManage"
          type="primary"
          size="large"
          icon="Plus"
          class="glow-btn"
          @click="handleAdd"
        >
          新增图书
        </el-button>
        <el-button
          icon="Download"
          size="large"
          @click="handleExportClick"
        >
          导出数据
        </el-button>
      </div>
    </div>

    <!-- 搜索过滤卡片 -->
    <div class="glass-card search-card">
      <div class="search-row">
        <el-input
          v-model="searchQuery"
          placeholder="搜索书名、ISBN或作者..."
          prefix-icon="Search"
          size="large"
          class="main-search"
          clearable
          @clear="fetchData"
          @keyup.enter="fetchData"
        />
        <el-select
          v-model="category"
          placeholder="图书类别"
          size="large"
          style="width: 160px"
          clearable
          @change="fetchData"
        >
          <el-option
            label="全部"
            :value="null"
          />
          <el-option
            v-for="cat in categories"
            :key="cat.id"
            :label="cat.name"
            :value="cat.id"
          />
        </el-select>
        <el-button
          type="primary"
          size="large"
          @click="fetchData"
        >
          查询
        </el-button>
        <el-button
          :icon="Filter"
          size="large"
          @click="advancedSearchVisible = true"
        >
          高级搜索
        </el-button>
        <el-button
          size="large"
          plain
          @click="handleReset"
        >
          重置
        </el-button>
      </div>
    </div>

    <!-- 高级搜索对话框 -->
    <el-dialog
      v-model="advancedSearchVisible"
      title="高级搜索"
      width="600px"
      destroy-on-close
    >
      <el-tabs v-model="searchType">
        <el-tab-pane
          label="正则匹配"
          name="regex"
        >
          <el-form label-position="top">
            <el-form-item label="图书类别">
              <el-select
                v-model="advancedForm.category_id"
                placeholder="选择类别"
                clearable
                style="width: 100%"
              >
                <el-option
                  v-for="cat in categories"
                  :key="cat.id"
                  :label="cat.name"
                  :value="cat.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="搜索模式">
              <el-select
                v-model="advancedForm.searchMode"
                style="width: 100%"
              >
                <el-option
                  label="包含匹配"
                  value="contains"
                />
                <el-option
                  label="精确匹配"
                  value="exact"
                />
                <el-option
                  label="前缀匹配"
                  value="startsWith"
                />
                <el-option
                  label="后缀匹配"
                  value="endsWith"
                />
                <el-option
                  label="正则表达式"
                  value="regex"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="搜索内容">
              <el-input
                v-model="advancedForm.pattern"
                :placeholder="getSearchPlaceholder()"
                clearable
                @input="validateRegexPattern"
              />
              <div
                v-if="regexError"
                style="color: #f56c6c; font-size: 12px; margin-top: 4px;"
              >
                {{ regexError }}
              </div>
              <div
                v-if="advancedForm.searchMode === 'regex'"
                style="color: #909399; font-size: 12px; margin-top: 4px;"
              >
                提示：正则表达式模式支持完整的正则语法，如 ^Java$、Py.*n 等
              </div>
            </el-form-item>
            <el-form-item label="匹配字段">
              <el-checkbox-group v-model="advancedForm.fields">
                <el-checkbox label="title">
                  书名
                </el-checkbox>
                <el-checkbox label="author">
                  作者
                </el-checkbox>
                <el-checkbox label="isbn">
                  ISBN
                </el-checkbox>
              </el-checkbox-group>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        <el-tab-pane
          label="语义检索"
          name="vector"
        >
          <el-form label-position="top">
            <el-form-item label="自然语言描述">
              <el-input
                v-model="advancedForm.vectorQuery"
                type="textarea"
                rows="3"
                placeholder="例如: 适合初学者的Python编程书籍，最好有实战案例"
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>
        <el-tab-pane
          label="SQL查询"
          name="sql"
        >
          <el-form label-position="top">
            <el-form-item label="SQL WHERE 子句">
              <el-input
                v-model="advancedForm.sql"
                type="textarea"
                rows="3"
                placeholder="例如: SELECT * FROM books WHERE price > 50 AND available_quantity > 0"
              />
              <span style="font-size:12px;color:#999">注意：仅限SELECT查询，需直接编写完整SQL</span>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
      <template #footer>
        <el-button @click="advancedSearchVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="loading"
          @click="handleAdvancedSearch"
        >
          执行搜索
        </el-button>
        <el-button @click="handleReset">
          重置所有
        </el-button>
      </template>
    </el-dialog>

    <!-- 编辑图书对话框 -->
    <el-dialog
      v-model="editVisible"
      title="编辑图书"
      width="500px"
      destroy-on-close
    >
      <el-form
        :model="currentBook"
        label-width="80px"
      >
        <el-form-item label="书名">
          <el-input v-model="currentBook.title" />
        </el-form-item>
        <el-form-item label="作者">
          <el-input v-model="currentBook.author" />
        </el-form-item>
        <el-form-item label="出版社">
          <el-input v-model="currentBook.publisher" />
        </el-form-item>
        <el-form-item label="定价">
          <el-input-number
            v-model="currentBook.price"
            :precision="2"
            :step="0.1"
          />
        </el-form-item>
        <el-form-item label="总库存">
          <el-input-number
            v-model="currentBook.total_quantity"
            :min="1"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="saveEdit"
        >
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 新增图书对话框 -->
    <el-dialog
      v-model="addVisible"
      title="新增图书"
      width="500px"
      destroy-on-close
    >
      <el-form
        :model="addForm"
        label-width="80px"
      >
        <el-form-item
          label="书名"
          required
        >
          <el-input
            v-model="addForm.title"
            placeholder="请输入书名"
          />
        </el-form-item>
        <el-form-item
          label="作者"
          required
        >
          <el-input
            v-model="addForm.author"
            placeholder="请输入作者"
          />
        </el-form-item>
        <el-form-item
          label="出版社"
          required
        >
          <el-input
            v-model="addForm.publisher"
            placeholder="请输入出版社"
          />
        </el-form-item>
        <el-form-item
          label="ISBN"
          required
        >
          <el-input
            v-model="addForm.isbn"
            placeholder="留空自动生成"
          >
            <template #append>
              <el-button @click="addForm.isbn = 'AUTO'">
                自动生成
              </el-button>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item
          label="图书类别"
          required
        >
          <el-select
            v-model="addForm.category_id"
            placeholder="请选择图书类别"
            style="width: 100%"
          >
            <el-option
              v-for="cat in categories"
              :key="cat.id"
              :label="cat.name"
              :value="cat.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="定价">
          <el-input-number
            v-model="addForm.price"
            :precision="2"
            :step="0.1"
            :min="0"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item
          label="总库存"
          required
        >
          <el-input-number
            v-model="addForm.total_quantity"
            :min="1"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="addLoading"
          @click="handleAddSubmit"
        >
          添加
        </el-button>
      </template>
    </el-dialog>

    <!-- 导出数据对话框 -->
    <el-dialog
      v-model="exportVisible"
      title="导出图书数据"
      width="400px"
      destroy-on-close
    >
      <el-form label-position="top">
        <el-form-item label="选择导出格式">
          <el-radio-group v-model="exportFormat">
            <el-radio value="csv">
              CSV 格式
            </el-radio>
            <el-radio value="json">
              JSON 格式
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-alert
          title="提示"
          type="info"
          :closable="false"
          style="margin-top: 16px"
        >
          文件将保存到您的下载文件夹中
        </el-alert>
      </el-form>
      <template #footer>
        <el-button @click="exportVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="exportLoading"
          @click="handleExport"
        >
          导出
        </el-button>
      </template>
    </el-dialog>

    <!-- 图书表格 -->
    <div class="glass-card table-wrapper">
      <el-table
        v-loading="loading"
        :data="bookList"
        style="width: 100%"
        size="large"
      >
        <el-table-column
          label="图书信息"
          min-width="280"
        >
          <template #default="{ row }">
            <div class="book-info-cell">
              <div class="book-cover-icon">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <rect width="24" height="24" rx="4" fill="#6366f1"/>
                  <text x="12" y="16" text-anchor="middle" fill="white" font-size="8" font-weight="bold">书</text>
                </svg>
              </div>
              <div>
                <div
                  class="title"
                  v-html="highlightText(row.book_title)"
                />
                <div class="isbn">
                  ISBN: <span v-html="highlightText(row.isbn)" />
                </div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          prop="author"
          label="作者"
          width="180"
        >
          <template #default="{ row }">
            <span v-html="highlightText(row.author)" />
          </template>
        </el-table-column>
        <el-table-column
          prop="category"
          label="分类"
          width="120"
        >
          <template #default="{ row }">
            <el-tag
              effect="plain"
              round
            >
              {{ row.category }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column
          label="库存状态"
          width="200"
        >
          <template #default="{ row }">
            <div class="stock-status">
              <el-progress
                :percentage="Number((row.available_quantity / row.total_quantity * 100).toFixed(0))"
                :status="row.available_quantity == 0 ? 'exception' : ''"
                :stroke-width="6"
              />
              <span class="stock-text">{{ row.available_quantity }} / {{ row.total_quantity }} 本</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column
          label="操作"
          width="180"
          fixed="right"
        >
          <template #default="{ row }">
            <div v-if="canManage">
              <el-button
                link
                type="primary"
                @click="handleEdit(row)"
              >
                编辑
              </el-button>
              <el-button
                link
                type="danger"
                @click="handleDelete(row)"
              >
                下架
              </el-button>
            </div>
            <div v-else>
              <el-button
                link
                type="primary"
                :disabled="row.available_quantity <= 0 || borrowing.has(row.id)"
                :loading="borrowing.has(row.id)"
                @click="handleUserBorrow(row)"
              >
                {{ borrowing.has(row.id) ? '借阅中...' : '借阅' }}
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          background
          layout="prev, pager, next"
          :total="total"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { Search, Plus, Download, Filter } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/store/user'
import { bookApi, bookCategoryApi } from '../api/book.api'
import { borrowingApi } from '../api/borrowing.api'
import { aiApi } from '../api/ai.api'
import { searchApi, exportApi } from '../api/other.api'

const userStore = useUserStore()
const canManage = computed(() => ['admin', 'librarian'].includes(userStore.user?.role || ''))

const bookList = ref([])
const total = ref(0)
const searchQuery = ref('')
const category = ref<number | null>(null)
const loading = ref(false)
const borrowing = ref<Set<number>>(new Set())

// 高级搜索
const advancedSearchVisible = ref(false)
const searchType = ref('regex')
const regexError = ref('')
const advancedForm = reactive({
  category_id: null as number | null,
  pattern: '',
  searchMode: 'contains' as 'contains' | 'exact' | 'startsWith' | 'endsWith' | 'regex',
  fields: ['title', 'author'],
  sql: '',
  vectorQuery: ''
})

// 获取搜索占位符文本
const getSearchPlaceholder = () => {
  switch (advancedForm.searchMode) {
    case 'contains':
      return '输入要包含的文本，如：Python'
    case 'exact':
      return '输入要精确匹配的文本，如：Python'
    case 'startsWith':
      return '输入开头文本，如：Java'
    case 'endsWith':
      return '输入结尾文本，如：编程'
    case 'regex':
      return '输入正则表达式，如：^Java.*Script$'
    default:
      return '输入搜索内容'
  }
}

// 验证正则表达式
const validateRegexPattern = () => {
  if (advancedForm.searchMode === 'regex' && advancedForm.pattern) {
    try {
      new RegExp(advancedForm.pattern)
      regexError.value = ''
    } catch (e: any) {
      regexError.value = `无效的正则表达式: ${e.message}`
    }
  } else {
    regexError.value = ''
  }
}

// 编辑图书
const editVisible = ref(false)
const currentBook = ref<any>({})

// 新增图书
const addVisible = ref(false)
const addForm = reactive({
  title: '',
  author: '',
  publisher: '',
  isbn: 'AUTO',
  category_id: null as number | null,
  price: null as number | null,
  total_quantity: 1
})
const categories = ref<any[]>([])
const addLoading = ref(false)

// 导出数据
const exportVisible = ref(false)
const exportFormat = ref('csv')
const exportLoading = ref(false)

// 初始加载
onMounted(() => {
  fetchData()
  fetchCategories()
})

const handleReset = () => {
  searchQuery.value = ''
  category.value = null
  advancedForm.category_id = null
  advancedForm.pattern = ''
  advancedForm.searchMode = 'contains'
  advancedForm.sql = ''
  advancedForm.vectorQuery = ''
  regexError.value = ''
  advancedSearchVisible.value = false
  fetchData()
}

const fetchData = async () => {
  loading.value = true
  try {
    const result = await bookApi.getAll({ keyword: searchQuery.value })
    if (result.success) {
      bookList.value = result.data.map((book: any) => ({
        ...book,
        book_title: book.title,
        category: book.category_name || '通用',
      }))
      total.value = result.data.length
    } else {
      ElMessage.error(result.error?.message || '获取图书失败')
    }
  } catch (error) {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

const handleAdvancedSearch = async () => {
  loading.value = true
  try {
    let result
    if (searchType.value === 'regex') {
      if (advancedForm.searchMode === 'regex' && advancedForm.pattern) {
        try {
          new RegExp(advancedForm.pattern)
          regexError.value = ''
        } catch (e: any) {
          regexError.value = `无效的正则表达式: ${e.message}`
          ElMessage.error(`无效的正则表达式: ${e.message}`)
          loading.value = false
          return
        }
      }

      const fields = Array.isArray(advancedForm.fields)
        ? [...advancedForm.fields]
        : ['title', 'author']
      result = await bookApi.regexSearch(advancedForm.pattern, fields, advancedForm.category_id, advancedForm.searchMode)
    } else if (searchType.value === 'sql') {
      result = await searchApi.executeSql(advancedForm.sql)
    } else if (searchType.value === 'vector') {
      result = await aiApi.semanticSearch(advancedForm.vectorQuery, 20)
    }

    if (result && result.success) {
      let data = result.data
      bookList.value = data.map((book: any) => ({
        ...book,
        book_title: book.title || book.book_title,
        category: book.category_name || '未知',
        isbn: book.isbn || '-',
        total_quantity: book.total_quantity || 0,
        available_quantity: book.available_quantity || 0
      }))
      total.value = data.length
      ElMessage.success(`搜索到 ${data.length} 条结果`)
      advancedSearchVisible.value = false
    } else {
      ElMessage.error(result?.error?.message || '搜索失败')
    }
  } catch (error: any) {
    console.error(error)
    if (error.message && error.message.includes('无效的正则表达式')) {
      regexError.value = error.message
      ElMessage.error(error.message)
    } else {
      ElMessage.error('搜索失败: ' + (error.message || '未知错误'))
    }
  } finally {
    loading.value = false
  }
}

// 高亮显示
const highlightText = (text: string) => {
  if (!text) return ''

  if (searchType.value === 'regex' && advancedForm.pattern) {
    try {
      let pattern = advancedForm.pattern

      switch (advancedForm.searchMode) {
        case 'exact':
          pattern = `^${escapeRegex(pattern)}$`
          break
        case 'startsWith':
          pattern = `^${escapeRegex(pattern)}`
          break
        case 'endsWith':
          pattern = `${escapeRegex(pattern)}$`
          break
        case 'contains':
          pattern = escapeRegex(pattern)
          break
        case 'regex':
          break
      }

      const regex = new RegExp(`(${pattern})`, 'gi')
      return text.replace(regex, '<span style="background-color: #fef08a; color: #854d0e">$1</span>')
    } catch (e) {
      return text
    }
  }

  if (searchQuery.value) {
    try {
      const regex = new RegExp(`(${escapeRegex(searchQuery.value)})`, 'gi')
      return text.replace(regex, '<span style="background-color: #fef08a; color: #854d0e">$1</span>')
    } catch (e) {
      return text
    }
  }

  return text
}

const escapeRegex = (pattern: string): string => {
  return pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const handleAdd = () => {
  addVisible.value = true
}

const fetchCategories = async () => {
  try {
    const result = await bookCategoryApi.getAll()
    if (result.success) {
      categories.value = result.data
    }
  } catch (error) {
    console.error('获取图书类别失败:', error)
  }
}

const handleAddSubmit = async () => {
  if (!addForm.title || !addForm.author || !addForm.publisher || !addForm.category_id || !addForm.total_quantity) {
    ElMessage.error('请填写所有必填字段')
    return
  }

  addLoading.value = true
  try {
    const result = await bookApi.create({
      title: addForm.title,
      author: addForm.author,
      publisher: addForm.publisher,
      isbn: addForm.isbn,
      category_id: addForm.category_id,
      price: addForm.price,
      total_quantity: addForm.total_quantity,
      available_quantity: addForm.total_quantity,
      status: 'normal',
      registration_date: new Date().toISOString().split('T')[0]
    })

    if (result.success) {
      ElMessage.success('图书添加成功')
      addVisible.value = false
      Object.assign(addForm, {
        title: '',
        author: '',
        publisher: '',
        isbn: 'AUTO',
        category_id: null,
        price: null,
        total_quantity: 1
      })
      fetchData()
    } else {
      ElMessage.error(result.error?.message || '添加失败')
    }
  } catch (error) {
    ElMessage.error('操作失败')
  } finally {
    addLoading.value = false
  }
}

const handleExportClick = () => {
  exportVisible.value = true
}

const handleExport = async () => {
  exportLoading.value = true
  try {
    let blob
    if (exportFormat.value === 'csv') {
      blob = await exportApi.booksToCSV()
    } else {
      blob = await exportApi.booksToJSON()
    }

    // Download the file
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `books.${exportFormat.value}`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)

    ElMessage.success('导出成功！')
    exportVisible.value = false
  } catch (error) {
    ElMessage.error('导出失败')
  } finally {
    exportLoading.value = false
  }
}

const handleEdit = (book: any) => {
  currentBook.value = { ...book, title: book.book_title }
  editVisible.value = true
}

const saveEdit = async () => {
  try {
    const updates = {
      title: currentBook.value.title,
      author: currentBook.value.author,
      publisher: currentBook.value.publisher,
      price: currentBook.value.price,
      total_quantity: currentBook.value.total_quantity
    }
    const result = await bookApi.update(currentBook.value.id, updates)
    if (result.success) {
      ElMessage.success('更新成功')
      editVisible.value = false
      fetchData()
    } else {
      ElMessage.error('更新失败')
    }
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

const handleDelete = async (book: any) => {
  try {
    await ElMessageBox.confirm('确定要下架这本图书吗？如果有借出记录将无法删除。', '提示', { type: 'warning' })
    const result = await bookApi.delete(book.id)
    if (result.success) {
      ElMessage.success('删除成功')
      fetchData()
    } else {
      ElMessage.error(result.error?.message || '删除失败')
    }
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('操作失败')
  }
}

const handleUserBorrow = async (book: any) => {
  if (!userStore.user?.id) {
    ElMessage.warning('请先登录')
    return
  }

  if (book.available_quantity <= 0) {
    ElMessage.warning('该图书暂时无可借库存')
    return
  }

  if (!userStore.user.reader_id) {
    ElMessage.info('管理员和图书管理员请使用专门的借阅管理页面进行借阅操作')
    return
  }

  if (borrowing.value.has(book.id)) {
    ElMessage.warning('正在借阅中，请稍候...')
    return
  }

  try {
    borrowing.value.add(book.id)

    const result = await borrowingApi.borrow(userStore.user.reader_id, book.id)

    if (result.success) {
      ElMessage.success(`借阅成功：《${book.book_title}》`)
      await fetchData()
    } else {
      const errorMsg = result.error?.message || '借阅失败'
      if (errorMsg.includes('暂无可借图书')) {
        ElMessage.error('该图书暂时无可借库存，请稍后再试')
      } else if (errorMsg.includes('已达到最大借阅数量')) {
        ElMessage.error('您已达到最大借阅数量，请先归还部分图书')
      } else if (errorMsg.includes('逾期未还')) {
        ElMessage.error('您有图书逾期未还，请先归还逾期图书')
      } else {
        ElMessage.error(errorMsg)
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    if (errorMsg.includes('暂无可借图书')) {
      ElMessage.error('该图书暂时无可借库存，请稍后再试')
    } else if (errorMsg.includes('已达到最大借阅数量')) {
      ElMessage.error('您已达到最大借阅数量，请先归还部分图书')
    } else if (errorMsg.includes('逾期未还')) {
      ElMessage.error('您有图书逾期未还，请先归还逾期图书')
    } else {
      ElMessage.error('借阅操作失败: ' + errorMsg)
    }
  } finally {
    borrowing.value.delete(book.id)
  }
}
</script>

<style scoped>
.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 24px;
}

.title-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.gdut-decoration {
  width: 40px;
  height: 3px;
  background: linear-gradient(90deg, var(--gdut-red), var(--gdut-blue));
  border-radius: 2px;
}

.sub-text {
  font-size: 14px;
  color: #64748b;
}

.search-card {
  padding: 20px;
  margin-bottom: 24px;
}

.search-row {
  display: flex;
  gap: 16px;
}

.main-search {
  flex: 1;
  max-width: 500px;
}

.table-wrapper {
  padding: 0;
  overflow: hidden;
}

.book-info-cell {
  display: flex;
  align-items: center;
  gap: 16px;
}

.book-cover-icon {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.book-cover-icon svg {
  width: 100%;
  height: 100%;
}

.title {
  font-weight: 600;
  color: #333;
  font-size: 15px;
}

.isbn {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
  font-family: monospace;
}

.stock-status {
  padding-right: 20px;
}

.stock-text {
  font-size: 12px;
  color: #94a3b8;
  display: block;
  margin-top: 4px;
  text-align: right;
}

.pagination {
  padding: 20px;
  display: flex;
  justify-content: flex-end;
}

.glow-btn {
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
}
</style>
