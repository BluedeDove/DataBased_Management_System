<template>
  <div class="page-container">
    <div class="action-bar">
      <div class="title-group">
        <h2 class="page-title">图书库</h2>
        <div class="gdut-decoration"></div>
        <span class="sub-text">管理全馆 {{ total }} 本藏书</span>
      </div>
      <div class="actions">
        <el-button type="primary" size="large" icon="Plus" class="glow-btn" @click="handleAdd" v-if="canManage">新增图书</el-button>
        <el-button icon="Download" size="large" @click="handleExportClick">导出数据</el-button>
      </div>
    </div>

    <!-- 搜索过滤卡片 -->
    <div class="glass-card search-card">
      <div class="search-row">
        <el-input v-model="searchQuery" placeholder="搜索书名、ISBN或作者..." prefix-icon="Search" size="large"
          class="main-search" clearable @clear="fetchData" @keyup.enter="fetchData" />
        <el-select v-model="category" placeholder="图书类别" size="large" style="width: 160px" clearable @change="fetchData">
          <el-option label="全部" :value="null" />
          <el-option
            v-for="cat in categories"
            :key="cat.id"
            :label="cat.name"
            :value="cat.id"
          />
        </el-select>
        <el-button type="primary" size="large" @click="fetchData">查询</el-button>
        <el-button :icon="Filter" size="large" @click="advancedSearchVisible = true">高级搜索</el-button>
        <el-button size="large" @click="handleReset" plain>重置</el-button>
      </div>
    </div>

    <!-- 高级搜索对话框 -->
    <el-dialog v-model="advancedSearchVisible" title="高级搜索" width="600px" destroy-on-close>
      <el-tabs v-model="searchType">
        <el-tab-pane label="正则匹配" name="regex">
          <el-form label-position="top">
            <el-form-item label="图书类别">
              <el-select v-model="advancedForm.category_id" placeholder="选择类别" clearable style="width: 100%">
                <el-option
                  v-for="cat in categories"
                  :key="cat.id"
                  :label="cat.name"
                  :value="cat.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="正则表达式">
              <el-input v-model="advancedForm.pattern" placeholder="例如: ^Java.*Script$" />
            </el-form-item>
            <el-form-item label="匹配字段">
              <el-checkbox-group v-model="advancedForm.fields">
                <el-checkbox label="title">书名</el-checkbox>
                <el-checkbox label="author">作者</el-checkbox>
                <el-checkbox label="isbn">ISBN</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="语义检索" name="vector">
          <el-form label-position="top">
            <el-form-item label="自然语言描述">
              <el-input v-model="advancedForm.vectorQuery" type="textarea" rows="3" placeholder="例如: 适合初学者的Python编程书籍，最好有实战案例" />
            </el-form-item>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="SQL查询" name="sql">
          <el-form label-position="top">
            <el-form-item label="SQL WHERE 子句">
              <el-input v-model="advancedForm.sql" type="textarea" rows="3" placeholder="例如: SELECT * FROM books WHERE price > 50 AND available_quantity > 0" />
              <span style="font-size:12px;color:#999">注意：仅限SELECT查询，需直接编写完整SQL</span>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
      <template #footer>
        <el-button @click="advancedSearchVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAdvancedSearch" :loading="loading">执行搜索</el-button>
        <el-button @click="handleReset">重置所有</el-button>
      </template>
    </el-dialog>

    <!-- 编辑图书对话框 -->
    <el-dialog v-model="editVisible" title="编辑图书" width="500px" destroy-on-close>
      <el-form :model="currentBook" label-width="80px">
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
          <el-input-number v-model="currentBook.price" :precision="2" :step="0.1" />
        </el-form-item>
        <el-form-item label="总库存">
          <el-input-number v-model="currentBook.total_quantity" :min="1" />
        </el-form-item>
        <!-- 更多字段... -->
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="saveEdit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 新增图书对话框 -->
    <el-dialog v-model="addVisible" title="新增图书" width="500px" destroy-on-close>
      <el-form :model="addForm" label-width="80px">
        <el-form-item label="书名" required>
          <el-input v-model="addForm.title" placeholder="请输入书名" />
        </el-form-item>
        <el-form-item label="作者" required>
          <el-input v-model="addForm.author" placeholder="请输入作者" />
        </el-form-item>
        <el-form-item label="出版社" required>
          <el-input v-model="addForm.publisher" placeholder="请输入出版社" />
        </el-form-item>
        <el-form-item label="ISBN" required>
          <el-input v-model="addForm.isbn" placeholder="留空自动生成">
            <template #append>
              <el-button @click="addForm.isbn = 'AUTO'">自动生成</el-button>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="图书类别" required>
          <el-select v-model="addForm.category_id" placeholder="请选择图书类别" style="width: 100%">
            <el-option
              v-for="cat in categories"
              :key="cat.id"
              :label="cat.name"
              :value="cat.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="定价">
          <el-input-number v-model="addForm.price" :precision="2" :step="0.1" :min="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="总库存" required>
          <el-input-number v-model="addForm.total_quantity" :min="1" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAddSubmit" :loading="addLoading">添加</el-button>
      </template>
    </el-dialog>

    <!-- 导出数据对话框 -->
    <el-dialog v-model="exportVisible" title="导出图书数据" width="400px" destroy-on-close>
      <el-form label-position="top">
        <el-form-item label="选择导出格式">
          <el-radio-group v-model="exportFormat">
            <el-radio value="csv">CSV 格式</el-radio>
            <el-radio value="json">JSON 格式</el-radio>
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
        <el-button @click="exportVisible = false">取消</el-button>
        <el-button type="primary" @click="handleExport" :loading="exportLoading">导出</el-button>
      </template>
    </el-dialog>

    <!-- 图书表格 -->
    <div class="glass-card table-wrapper">
      <el-table :data="bookList" style="width: 100%" size="large" v-loading="loading">
        <el-table-column label="图书信息" min-width="280">
          <template #default="{ row }">
            <div class="book-info-cell">
              <img src="/images/gdut-logo.jpg" alt="广工校徽" class="book-cover-icon" />
              <div>
                <div class="title" v-html="highlightText(row.book_title)"></div>
                <div class="isbn">ISBN: <span v-html="highlightText(row.isbn)"></span></div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="author" label="作者" width="180">
          <template #default="{ row }">
            <span v-html="highlightText(row.author)"></span>
          </template>
        </el-table-column>
        <el-table-column prop="category" label="分类" width="120">
          <template #default="{ row }">
            <el-tag effect="plain" round>{{ row.category }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="库存状态" width="200">
          <template #default="{ row }">
            <div class="stock-status">
              <el-progress :percentage="Number((row.available_quantity / row.total_quantity * 100).toFixed(0))"
                :status="row.available_quantity == 0 ? 'exception' : ''" :stroke-width="6" />
              <span class="stock-text">{{ row.available_quantity }} / {{ row.total_quantity }} 本</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <div v-if="canManage">
              <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
              <el-button link type="danger" @click="handleDelete(row)">下架</el-button>
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
        <el-pagination background layout="prev, pager, next" :total="total" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { Search, Plus, Download, Filter } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const canManage = computed(() => ['admin', 'librarian'].includes(userStore.user?.role || ''))

const bookList = ref([])
const total = ref(0)
const searchQuery = ref('')
const category = ref<number | null>(null)
const loading = ref(false)
const borrowing = ref<Set<number>>(new Set()) // 正在借阅的图书ID集合

// 高级搜索
const advancedSearchVisible = ref(false)
const searchType = ref('regex') // regex, sql, vector
const advancedForm = reactive({
  category_id: null as number | null,
  pattern: '',
  fields: ['title', 'author'],
  sql: '',
  vectorQuery: ''
})

// 编辑图书
const editVisible = ref(false)
const currentBook = ref<any>({})

// 新增图书
const addVisible = ref(false)
const addForm = reactive({
  title: '',
  author: '',
  publisher: '',
  isbn: 'AUTO', // 默认自动生成
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
  advancedForm.sql = ''
  advancedForm.vectorQuery = ''
  advancedSearchVisible.value = false
  fetchData()
}

const fetchData = async () => {
  loading.value = true
  try {
    const result = await window.api.book.getAll({
      keyword: searchQuery.value,
      // category_id: category.value // 需要映射
    })
    if (result.success) {
      // 适配后端返回的数据结构 (title -> book_title)
      bookList.value = result.data.map((book: any) => ({
        ...book,
        book_title: book.title,
        category: book.category_name || '通用',
        // Highlight source text logic usually done here, but simpler in template via method
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
  advancedSearchVisible.value = false
  try {
    let result
    if (searchType.value === 'regex') {
      // 确保fields是字符串数组，避免IPC序列化问题
      const fields = Array.isArray(advancedForm.fields)
        ? [...advancedForm.fields] // 创建数组副本
        : ['title', 'author']
      result = await window.api.book.regexSearch(advancedForm.pattern, fields, advancedForm.category_id)
    } else if (searchType.value === 'sql') {
      result = await window.api.search.executeSql(advancedForm.sql)
    } else if (searchType.value === 'vector') {
      result = await window.api.ai.semanticSearch(advancedForm.vectorQuery, 20)
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
    } else {
      ElMessage.error(result?.error?.message || '搜索失败')
    }
  } catch (error) {
    console.error(error)
    ElMessage.error('高级搜索出错')
  } finally {
    loading.value = false
  }
}

// 高亮显示
const highlightText = (text: string) => {
  if (!text) return ''
  // 优先匹配正则
  if (searchType.value === 'regex' && advancedForm.pattern) {
    try {
      // 简单处理：如果是简单字符串，转义；如果是正则，尝试直接用
      // 这里只处理普通keyword搜索高亮和Regex高亮
      const regex = new RegExp(`(${advancedForm.pattern})`, 'gi')
      return text.replace(regex, '<span style="background-color: #fef08a; color: #854d0e">$1</span>')
    } catch (e) {
      return text
    }
  }
  
  // 普通搜索高亮
  if (searchQuery.value) {
    try {
      const regex = new RegExp(`(${searchQuery.value})`, 'gi')
      return text.replace(regex, '<span style="background-color: #fef08a; color: #854d0e">$1</span>')
    } catch (e) {
      return text
    }
  }
  
  return text
}

const handleAdd = () => {
  addVisible.value = true
}

// 获取图书类别
const fetchCategories = async () => {
  try {
    const result = await window.api.bookCategory.getAll()
    if (result.success) {
      categories.value = result.data
    }
  } catch (error) {
    console.error('获取图书类别失败:', error)
  }
}

// 新增图书提交
const handleAddSubmit = async () => {
  // 表单验证
  if (!addForm.title || !addForm.author || !addForm.publisher || !addForm.category_id || !addForm.total_quantity) {
    ElMessage.error('请填写所有必填字段')
    return
  }

  addLoading.value = true
  try {
    const result = await window.api.book.create({
      title: addForm.title,
      author: addForm.author,
      publisher: addForm.publisher,
      isbn: addForm.isbn,
      category_id: addForm.category_id,
      price: addForm.price,
      total_quantity: addForm.total_quantity,
      available_quantity: addForm.total_quantity, // 初始可借数量等于总库存
      status: 'normal',
      registration_date: new Date().toISOString().split('T')[0]
    })

    if (result.success) {
      ElMessage.success('图书添加成功')
      addVisible.value = false
      // 重置表单
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

// 导出数据
const handleExportClick = () => {
  exportVisible.value = true
}

const handleExport = async () => {
  exportLoading.value = true
  try {
    let result
    if (exportFormat.value === 'csv') {
      result = await window.api.export.booksToCSV()
    } else {
      result = await window.api.export.booksToJSON()
    }

    if (result.success) {
      ElMessage.success(`导出成功！文件已保存到: ${result.data}`)
      exportVisible.value = false
    } else {
      ElMessage.error(result.error?.message || '导出失败')
    }
  } catch (error) {
    ElMessage.error('导出失败')
  } finally {
    exportLoading.value = false
  }
}

const handleEdit = (book: any) => {
  currentBook.value = { ...book, title: book.book_title } // 适配字段
  editVisible.value = true
}

const saveEdit = async () => {
  try {
    // 转换回后端字段
    const updates = {
      title: currentBook.value.title,
      author: currentBook.value.author,
      publisher: currentBook.value.publisher,
      price: currentBook.value.price,
      total_quantity: currentBook.value.total_quantity
    }
    const result = await window.api.book.update(currentBook.value.id, updates)
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
    const result = await window.api.book.delete(book.id)
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

  // 检查用户角色：只有教师和学生可以自助借阅
  if (!userStore.user.reader_id) {
    ElMessage.info('管理员和图书管理员请使用专门的借阅管理页面进行借阅操作')
    return
  }

  // 检查是否已经在借阅过程中
  if (borrowing.value.has(book.id)) {
    ElMessage.warning('正在借阅中，请稍候...')
    return
  }

  try {
    console.log('========== [图书页面] 用户借阅开始 ==========')
    console.log('[图书页面] 借阅图书:', book.book_title, 'ISBN:', book.isbn)
    console.log('[图书页面] 用户角色:', userStore.user.role)
    console.log('[图书页面] 用户读者ID:', userStore.user.reader_id)
    
    // 标记为正在借阅
    borrowing.value.add(book.id)
    
    // 1. 直接使用用户的reader_id查找读者记录
    console.log('[图书页面] 查找读者记录...')
    const readerResult = await window.api.reader.getById(userStore.user.reader_id)
    
    if (!readerResult.success) {
      console.error('[图书页面] 读者记录查找失败:', readerResult.error)
      ElMessage.error('无法找到您的读者记录，请联系管理员')
      return
    }

    const reader = readerResult.data
    console.log('[图书页面] 找到读者记录:', reader.name, '编号:', reader.reader_no)

    // 2. 调用借阅API
    console.log('[图书页面] 调用借阅API...')
    const result = await window.api.borrowing.borrow(reader.id, book.id)
    console.log('[图书页面] 借阅API结果:', result)

    if (result.success) {
      console.log('[图书页面] 借阅成功!')
      ElMessage.success(`借阅成功：《${book.book_title}》`)
      
      // 刷新图书列表以更新库存
      console.log('[图书页面] 刷新图书列表...')
      await fetchData()
      console.log('[图书页面] 图书列表刷新完成')
    } else {
      console.error('[图书页面] 借阅失败:', result.error)
      
      // 根据错误类型提供更友好的提示
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
    console.error('[图书页面] 借阅操作异常:', error)
    
    // 根据错误类型提供更友好的提示
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
    // 确保无论成功或失败都移除借阅标记
    borrowing.value.delete(book.id)
    console.log('========== [图书页面] 用户借阅结束 ==========\n')
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
  height: 64px;
  border-radius: 6px;
  object-fit: contain;
  padding: 8px;
  background: linear-gradient(135deg, rgba(230, 0, 18, 0.05), rgba(0, 86, 179, 0.05));
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
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
