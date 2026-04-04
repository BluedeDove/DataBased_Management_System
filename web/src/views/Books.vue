<template>
  <div class="books-page">
    <!-- Header -->
    <div class="page-header animate-fade-in">
      <div class="page-header-left">
        <div class="page-title">图书管理</div>
        <div class="page-subtitle">共 {{ total }} 册图书 · {{ categories.length }} 个分类</div>
      </div>
      <div class="header-actions">
        <button v-if="canManage" class="action-btn secondary" @click="exportVisible = true">
          <el-icon><Download /></el-icon> 导出
        </button>
        <button v-if="canManage" class="gradient-btn" @click="openAddDialog">
          <el-icon><Plus /></el-icon> 新增图书
        </button>
      </div>
    </div>

    <!-- Filter -->
    <div class="filter-card animate-fade-in-delay-1">
      <div class="filter-row">
        <div class="search-bar" style="flex: 1; max-width: 400px">
          <el-icon class="search-icon"><Search /></el-icon>
          <input v-model="searchQuery" placeholder="搜索书名、作者、ISBN…" @keydown.enter="fetchData" @input="debounceFetch" />
        </div>
        <button class="action-btn secondary" @click="advancedSearchVisible = true">
          <el-icon><Operation /></el-icon> 高级搜索
        </button>
        <button class="action-btn secondary" @click="resetFilters">
          <el-icon><Refresh /></el-icon> 重置
        </button>
      </div>
      <div class="cat-chips">
        <button v-for="cat in [{ id: '', name: '全部' }, ...categories]" :key="cat.id ?? 'all'"
          class="cat-chip" :class="{ active: selectedCategory === cat.id }"
          @click="selectedCategory = cat.id; fetchData()">
          {{ cat.name }}
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="table-card animate-fade-in-delay-2">
      <el-table v-loading="loading" :data="bookList" style="width: 100%">
        <el-table-column label="图书" min-width="260">
          <template #default="{ row }">
            <div class="book-cell">
              <div class="book-spine" :style="getSpineStyle(row)">{{ (row.book_title || row.title || '?')[0] }}</div>
              <div class="book-meta">
                <div class="book-title" v-html="highlightText(row.book_title || row.title)" />
                <div class="book-isbn">ISBN: {{ row.isbn || '—' }}</div>
                <div v-if="row.similarity != null && searchType === 'vector'" class="similarity-badge" :style="getSimilarityStyle(row.similarity)">
                  {{ getSimilarityLabel(row.similarity) }} {{ Math.round(row.similarity * 100) }}%
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="author" label="作者" width="140">
          <template #default="{ row }">
            <span v-html="highlightText(row.author)" />
          </template>
        </el-table-column>
        <el-table-column label="分类" width="120">
          <template #default="{ row }">
            <span class="pill-badge purple">{{ row.category || row.category_name || '未分类' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="publisher" label="出版社" width="150">
          <template #default="{ row }">
            <span class="text-secondary-small">{{ row.publisher || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="库存" width="140" align="center">
          <template #default="{ row }">
            <div class="stock-cell">
              <el-progress
                :percentage="stockPercent(row)"
                :stroke-width="5" :show-text="false"
                :status="stockStatus(row)"
              />
              <div class="stock-text">
                <span class="stock-avail" :class="{ empty: availOf(row) === 0 }">{{ availOf(row) }}</span>
                <span class="stock-total">/ {{ totalOf(row) }}</span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" align="right" fixed="right">
          <template #default="{ row }">
            <div class="action-cell">
              <template v-if="canManage">
                <button class="icon-btn" @click="openEditDialog(row)"><el-icon><Edit /></el-icon></button>
                <button class="icon-btn danger" @click="handleDelete(row)"><el-icon><Delete /></el-icon></button>
              </template>
              <template v-else>
                <button class="action-btn-sm primary" :disabled="availOf(row) <= 0 || borrowing.has(row.id)" @click="handleUserBorrow(row)">
                  <el-icon><Tickets /></el-icon> 借阅
                </button>
              </template>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrap">
        <span class="pagination-info">共 {{ total }} 条</span>
        <el-pagination background layout="prev, pager, next" :total="total" :page-size="20" v-model:current-page="page" @current-change="fetchData" />
      </div>
    </div>

    <!-- Advanced Search Dialog -->
    <el-dialog v-model="advancedSearchVisible" title="高级搜索" width="680px" align-center>
      <div class="pill-tabs" style="margin-bottom: 20px">
        <button v-for="t in advTabs" :key="t.key" class="pill-tab" :class="{ active: searchType === t.key }" @click="searchType = t.key">{{ t.label }}</button>
      </div>

      <div v-if="searchType === 'regex'">
        <el-form label-width="80px">
          <el-form-item label="搜索模式">
            <el-select v-model="advancedForm.searchMode" style="width: 200px">
              <el-option label="包含匹配" value="contains" /><el-option label="精确匹配" value="exact" />
              <el-option label="前缀匹配" value="startsWith" /><el-option label="后缀匹配" value="endsWith" />
              <el-option label="正则表达式" value="regex" />
            </el-select>
          </el-form-item>
          <el-form-item label="搜索内容">
            <el-input v-model="advancedForm.pattern" :placeholder="getSearchPlaceholder()" @input="validateRegex" />
            <div v-if="regexError" style="color: var(--danger); font-size: 12px; margin-top: 4px">{{ regexError }}</div>
          </el-form-item>
          <el-form-item label="匹配字段">
            <el-checkbox-group v-model="advancedForm.fields">
              <el-checkbox label="title">书名</el-checkbox>
              <el-checkbox label="author">作者</el-checkbox>
              <el-checkbox label="isbn">ISBN</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
        </el-form>
      </div>

      <div v-if="searchType === 'vector'">
        <el-form label-width="80px">
          <el-form-item label="描述">
            <el-input v-model="advancedForm.vectorQuery" type="textarea" :rows="3" placeholder="用自然语言描述你想找的书" />
          </el-form-item>
        </el-form>
      </div>

      <div v-if="searchType === 'sql'">
        <el-form label-width="80px">
          <el-form-item label="SQL 条件">
            <el-input v-model="advancedForm.sql" type="textarea" :rows="4" placeholder="如：category = '计算机' AND available_quantity > 0" style="font-family: 'Courier New', monospace" />
          </el-form-item>
        </el-form>
        <div style="display:flex;align-items:center;gap:6px;padding:10px 14px;background:var(--warning-tint);border-radius:10px;font-size:13px;color:var(--warning)">
          <el-icon><Warning /></el-icon> 仅支持 SELECT 查询，禁止写入/删除操作
        </div>
      </div>

      <template #footer>
        <el-button @click="advancedSearchVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAdvancedSearch"><el-icon><Search /></el-icon> 执行搜索</el-button>
      </template>
    </el-dialog>

    <!-- Add Dialog -->
    <el-dialog v-model="addVisible" title="新增图书" width="560px" align-center>
      <el-form :model="addForm" label-width="80px">
        <el-form-item label="书名" required><el-input v-model="addForm.title" placeholder="图书标题" /></el-form-item>
        <el-form-item label="作者" required><el-input v-model="addForm.author" placeholder="作者姓名" /></el-form-item>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 16px">
          <el-form-item label="出版社" required><el-input v-model="addForm.publisher" /></el-form-item>
          <el-form-item label="ISBN"><el-input v-model="addForm.isbn" placeholder="留空自动生成" /></el-form-item>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 16px">
          <el-form-item label="分类" required>
            <el-select v-model="addForm.category_id" style="width:100%">
              <el-option v-for="cat in categories" :key="cat.id" :label="cat.name" :value="cat.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="定价"><el-input-number v-model="addForm.price" :precision="2" :min="0" style="width:100%" /></el-form-item>
        </div>
        <el-form-item label="库存" required><el-input-number v-model="addForm.total_quantity" :min="1" style="width:100%" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addVisible = false">取消</el-button>
        <el-button type="primary" :loading="addLoading" @click="handleAddSubmit">添加</el-button>
      </template>
    </el-dialog>

    <!-- Edit Dialog -->
    <el-dialog v-model="editVisible" title="编辑图书" width="500px" align-center>
      <el-form :model="currentBook" label-width="80px">
        <el-form-item label="书名"><el-input v-model="currentBook.title" /></el-form-item>
        <el-form-item label="作者"><el-input v-model="currentBook.author" /></el-form-item>
        <el-form-item label="出版社"><el-input v-model="currentBook.publisher" /></el-form-item>
        <el-form-item label="定价"><el-input-number v-model="currentBook.price" :precision="2" :step="0.1" /></el-form-item>
        <el-form-item label="总库存"><el-input-number v-model="currentBook.total_quantity" :min="1" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="saveEdit">保存</el-button>
      </template>
    </el-dialog>

    <!-- Export Dialog -->
    <el-dialog v-model="exportVisible" title="导出图书数据" width="400px" align-center>
      <el-form label-position="top">
        <el-form-item label="选择导出格式">
          <el-radio-group v-model="exportFormat">
            <el-radio value="csv">CSV 格式</el-radio>
            <el-radio value="json">JSON 格式</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="exportVisible = false">取消</el-button>
        <el-button type="primary" :loading="exportLoading" @click="handleExport">导出</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Search, Plus, Download, Operation, Refresh, Edit, Delete, Tickets, Warning } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/store/user'
import { bookApi, bookCategoryApi } from '../api/book.api'
import { borrowingApi } from '../api/borrowing.api'
import { aiApi } from '../api/ai.api'
import { searchApi, exportApi } from '../api/other.api'

const route = useRoute()
const userStore = useUserStore()
const canManage = computed(() => ['admin', 'librarian'].includes(userStore.user?.role || ''))

const bookList = ref<any[]>([])
const total = ref(0)
const loading = ref(false)
const borrowing = ref<Set<number>>(new Set())
const page = ref(1)

// Search
const searchQuery = ref('')
const selectedCategory = ref<number | ''>('')
let debounceTimer: any
const debounceFetch = () => { clearTimeout(debounceTimer); debounceTimer = setTimeout(fetchData, 500) }
const resetFilters = () => { searchQuery.value = ''; selectedCategory.value = ''; page.value = 1; fetchData() }

// Categories
const categories = ref<any[]>([])

// Advanced Search
const advancedSearchVisible = ref(false)
const searchType = ref('regex')
const advTabs = [{ key: 'regex', label: '正则匹配' }, { key: 'vector', label: '语义检索' }, { key: 'sql', label: 'SQL 查询' }]
const regexError = ref('')
const advancedForm = reactive({
  category_id: null as number | null,
  pattern: '',
  searchMode: 'contains' as string,
  fields: ['title', 'author'],
  sql: '',
  vectorQuery: ''
})

const getSearchPlaceholder = () => {
  const map: Record<string, string> = { contains: '输入要包含的文本', exact: '精确匹配文本', startsWith: '输入开头文本', endsWith: '输入结尾文本', regex: '输入正则表达式' }
  return map[advancedForm.searchMode] || '输入搜索内容'
}

const validateRegex = () => {
  if (advancedForm.searchMode === 'regex' && advancedForm.pattern) {
    try { new RegExp(advancedForm.pattern); regexError.value = '' }
    catch (e: any) { regexError.value = `无效的正则: ${e.message}` }
  } else regexError.value = ''
}

const escapeRegex = (p: string) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Spine colors
const SPINE_COLORS = ['#C8102E','#7C3AED','#0EA5E9','#059669','#D97706','#EC4899','#6366F1','#14B8A6']
const getSpineStyle = (row: any) => {
  const base = SPINE_COLORS[((row.category_id || 0) + (row.book_title || row.title || '').charCodeAt(0)) % SPINE_COLORS.length]
  if (row.similarity != null && searchType.value === 'vector') {
    const opacity = 0.35 + row.similarity * 0.65  // 0.35 → 1.0 based on similarity
    return { background: base, opacity: opacity.toFixed(2) }
  }
  return { background: base }
}

// Similarity badge helpers
const getSimilarityLabel = (s: number) => {
  if (s >= 0.90) return '极高'
  if (s >= 0.75) return '高'
  if (s >= 0.55) return '中'
  if (s >= 0.35) return '低'
  return '很低'
}
const getSimilarityStyle = (s: number) => {
  if (s >= 0.90) return { background: 'rgba(5,150,105,0.15)', color: '#059669', borderColor: 'rgba(5,150,105,0.30)' }
  if (s >= 0.75) return { background: 'rgba(14,165,233,0.12)', color: '#0284C7', borderColor: 'rgba(14,165,233,0.25)' }
  if (s >= 0.55) return { background: 'rgba(124,58,237,0.10)', color: '#7C3AED', borderColor: 'rgba(124,58,237,0.20)' }
  if (s >= 0.35) return { background: 'rgba(217,119,6,0.10)',  color: '#D97706', borderColor: 'rgba(217,119,6,0.20)' }
  return { background: 'rgba(148,163,184,0.12)', color: '#94A3B8', borderColor: 'rgba(148,163,184,0.20)' }
}

// Stock helpers
const availOf = (row: any) => row.available_quantity ?? row.available_copies ?? 0
const totalOf = (row: any) => row.total_quantity ?? row.total_copies ?? row.copies ?? 0
const stockPercent = (row: any) => { const t = totalOf(row); return t > 0 ? Math.round(availOf(row) / t * 100) : 0 }
const stockStatus = (row: any) => availOf(row) === 0 ? 'exception' : ''

// Highlight
const highlightText = (text: string) => {
  if (!text) return ''
  if (searchType.value === 'regex' && advancedForm.pattern) {
    try {
      let p = advancedForm.pattern
      if (advancedForm.searchMode === 'exact') p = `^${escapeRegex(p)}$`
      else if (advancedForm.searchMode === 'startsWith') p = `^${escapeRegex(p)}`
      else if (advancedForm.searchMode === 'endsWith') p = `${escapeRegex(p)}$`
      else if (advancedForm.searchMode === 'contains') p = escapeRegex(p)
      return text.replace(new RegExp(`(${p})`, 'gi'), '<span style="background:#FEF08A;color:#854D0E">$1</span>')
    } catch { return text }
  }
  if (searchQuery.value) {
    try { return text.replace(new RegExp(`(${escapeRegex(searchQuery.value)})`, 'gi'), '<span style="background:#FEF08A;color:#854D0E">$1</span>') } catch { return text }
  }
  return text
}

// CRUD
const addVisible = ref(false)
const addForm = reactive({ title: '', author: '', publisher: '', isbn: 'AUTO', category_id: null as number | null, price: null as number | null, total_quantity: 1 })
const addLoading = ref(false)

const editVisible = ref(false)
const currentBook = ref<any>({})

const exportVisible = ref(false)
const exportFormat = ref('csv')
const exportLoading = ref(false)

// Fetch
const fetchData = async () => {
  loading.value = true
  try {
    const result = await bookApi.getAll({ keyword: searchQuery.value, category_id: selectedCategory.value || undefined })
    if (result.success) {
      bookList.value = result.data.map((book: any) => ({ ...book, book_title: book.title, category: book.category_name || '通用' }))
      total.value = result.data.length
    } else ElMessage.error(result.error?.message || '获取图书失败')
  } catch { ElMessage.error('加载失败') }
  finally { loading.value = false }
}

const fetchCategories = async () => {
  try { const r = await bookCategoryApi.getAll(); if (r.success) categories.value = r.data } catch {}
}

// Advanced search
const handleAdvancedSearch = async () => {
  loading.value = true; advancedSearchVisible.value = false
  try {
    let result: any
    if (searchType.value === 'regex') {
      if (advancedForm.searchMode === 'regex' && advancedForm.pattern) {
        try { new RegExp(advancedForm.pattern) } catch (e: any) { ElMessage.error(e.message); loading.value = false; return }
      }
      const fields = Array.isArray(advancedForm.fields) ? [...advancedForm.fields] : ['title', 'author']
      result = await bookApi.regexSearch(advancedForm.pattern, fields, advancedForm.category_id ?? undefined, advancedForm.searchMode)
    } else if (searchType.value === 'sql') {
      result = await searchApi.executeSql(advancedForm.sql)
    } else if (searchType.value === 'vector') {
      result = await aiApi.semanticSearch(advancedForm.vectorQuery, 20)
    }
    if (result?.success) {
      bookList.value = (result.data || []).map((b: any) => ({ ...b, book_title: b.title || b.book_title, category: b.category_name || '未知' }))
      total.value = bookList.value.length
      ElMessage.success(`搜索到 ${total.value} 条结果`)
    } else ElMessage.error(result?.error?.message || '搜索失败')
  } catch (e: any) { ElMessage.error('搜索失败: ' + (e.message || '未知错误')) }
  finally { loading.value = false }
}

const openAddDialog = () => { addVisible.value = true }

const handleAddSubmit = async () => {
  if (!addForm.title || !addForm.author || !addForm.publisher || !addForm.category_id) { ElMessage.error('请填写所有必填字段'); return }
  addLoading.value = true
  try {
    const result = await bookApi.create({ ...addForm, available_quantity: addForm.total_quantity, status: 'normal', registration_date: new Date().toISOString().split('T')[0] })
    if (result.success) { ElMessage.success('图书添加成功'); addVisible.value = false; Object.assign(addForm, { title:'', author:'', publisher:'', isbn:'AUTO', category_id:null, price:null, total_quantity:1 }); fetchData() }
    else ElMessage.error(result.error?.message || '添加失败')
  } catch { ElMessage.error('操作失败') }
  finally { addLoading.value = false }
}

const openEditDialog = (row: any) => { currentBook.value = { ...row, title: row.book_title || row.title }; editVisible.value = true }

const saveEdit = async () => {
  try {
    const result = await bookApi.update(currentBook.value.id, { title: currentBook.value.title, author: currentBook.value.author, publisher: currentBook.value.publisher, price: currentBook.value.price, total_quantity: currentBook.value.total_quantity })
    if (result.success) { ElMessage.success('更新成功'); editVisible.value = false; fetchData() }
    else ElMessage.error('更新失败')
  } catch { ElMessage.error('操作失败') }
}

const handleDelete = async (book: any) => {
  try {
    await ElMessageBox.confirm('确定要下架这本图书吗？', '提示', { type: 'warning' })
    const result = await bookApi.delete(book.id)
    if (result.success) { ElMessage.success('删除成功'); fetchData() }
    else ElMessage.error(result.error?.message || '删除失败')
  } catch {}
}

const triggerFileDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const handleExport = async () => {
  exportLoading.value = true
  try {
    const file = exportFormat.value === 'csv'
      ? await exportApi.booksToCSV()
      : await exportApi.booksToJSON()
    triggerFileDownload(file.blob, file.filename)
    ElMessage.success(`导出成功：${file.filename}`)
    exportVisible.value = false
  } catch {
    ElMessage.error('导出失败')
  } finally { exportLoading.value = false }
}

const handleUserBorrow = async (book: any) => {
  if (!userStore.user?.reader_id) { ElMessage.info('请使用借阅管理页面'); return }
  if (borrowing.value.has(book.id)) return
  try {
    borrowing.value.add(book.id)
    const result = await borrowingApi.borrow(userStore.user.reader_id, book.id)
    if (result.success) { ElMessage.success(`借阅成功：《${book.book_title || book.title}》`); await fetchData() }
    else {
      const msg = result.error?.message || '借阅失败'
      if (msg.includes('暂无可借')) ElMessage.error('该图书暂时无可借库存')
      else if (msg.includes('最大借阅')) ElMessage.error('已达到最大借阅数量')
      else if (msg.includes('逾期')) ElMessage.error('有图书逾期未还')
      else ElMessage.error(msg)
    }
  } catch (e: any) { ElMessage.error(e?.response?.data?.error?.message || e?.message || '借阅操作失败，请重试') }
  finally { borrowing.value.delete(book.id) }
}

onMounted(() => {
  if (route.query.search) searchQuery.value = String(route.query.search)
  fetchData()
  fetchCategories()
})

watch(() => route.query.search, (val) => {
  if (val !== undefined) { searchQuery.value = String(val); fetchData() }
})
</script>

<style scoped>
.books-page { display: flex; flex-direction: column; gap: 20px; width: 100%; max-width: 1400px; margin: 0 auto; }

.filter-card { background: rgba(255,255,255,0.42); backdrop-filter: blur(18px) saturate(180%); -webkit-backdrop-filter: blur(18px) saturate(180%); border-radius: var(--radius-card); padding: 16px 20px; border: 1px solid rgba(255,255,255,0.40); box-shadow: var(--shadow-glass); transition: all 0.3s ease; }
.filter-card:hover { box-shadow: 0 6px 24px rgba(28,16,51,0.08); }
.filter-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }

.cat-chips { display: flex; gap: 8px; margin-top: 12px; overflow-x: auto; padding-bottom: 4px; }
.cat-chip {
  padding: 6px 16px; border-radius: 99px; border: 1px solid var(--border-color);
  background: var(--bg-page); color: var(--text-secondary); cursor: pointer;
  font-size: 13px; font-weight: 500; font-family: var(--font-sans);
  white-space: nowrap; transition: all 0.15s;
}
.cat-chip.active { background: var(--gdut-red); color: #fff; border-color: var(--gdut-red); }
.cat-chip:hover:not(.active) { border-color: var(--gdut-red); color: var(--gdut-red); }

.table-card { background: rgba(255,255,255,0.42); backdrop-filter: blur(18px) saturate(180%); -webkit-backdrop-filter: blur(18px) saturate(180%); border-radius: var(--radius-card); box-shadow: var(--shadow-glass); border: 1px solid rgba(255,255,255,0.40); overflow: hidden; width: 100%; }

.book-cell { display: flex; align-items: center; gap: 12px; }
.book-spine {
  width: 40px; height: 52px; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; font-weight: 800; color: rgba(255,255,255,0.9);
  flex-shrink: 0; box-shadow: 2px 2px 8px rgba(0,0,0,0.12);
}
.book-meta { display: flex; flex-direction: column; min-width: 0; }
.book-title { font-weight: 600; color: var(--text-primary); font-size: 14px; line-height: 1.3; }
.book-isbn { font-size: 11px; color: var(--text-muted); margin-top: 3px; font-family: 'Courier New', monospace; }
.similarity-badge {
  display: inline-flex; align-items: center; gap: 3px;
  margin-top: 4px; padding: 2px 8px; border-radius: 99px;
  font-size: 11px; font-weight: 600; border: 1px solid;
  width: fit-content;
}

.text-secondary-small { font-size: 13px; color: var(--text-secondary); }

.stock-cell { display: flex; flex-direction: column; gap: 4px; }
.stock-text { font-size: 12px; display: flex; justify-content: center; gap: 2px; }
.stock-avail { font-weight: 700; color: var(--success); }
.stock-avail.empty { color: var(--danger); }
.stock-total { color: var(--text-muted); }

:deep(.el-progress-bar__inner) { background: var(--gradient-brand) !important; }
:deep(.el-progress.is-exception .el-progress-bar__inner) { background: var(--danger) !important; }

.action-cell { display: flex; align-items: center; gap: 4px; justify-content: flex-end; }
.action-btn-sm {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 6px 14px; border-radius: 8px; border: none;
  background: var(--gdut-red-tint); color: var(--gdut-red);
  cursor: pointer; font-size: 13px; font-weight: 600; font-family: var(--font-sans);
  transition: all 0.15s;
}
.action-btn-sm:hover { background: var(--gdut-red); color: #fff; }
.action-btn-sm:disabled { opacity: 0.5; cursor: not-allowed; }

.header-actions { display: flex; gap: 10px; }
.action-btn.secondary {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 18px; border-radius: var(--radius-btn);
  border: 1.5px solid var(--border-color); background: var(--bg-card);
  color: var(--text-secondary); cursor: pointer;
  font-size: 14px; font-weight: 500; font-family: var(--font-sans);
  transition: all 0.15s;
}
.action-btn.secondary:hover { border-color: var(--gdut-red); color: var(--gdut-red); background: var(--gdut-red-tint); }

.pagination-wrap {
  padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
  border-top: 1px solid var(--border-light);
}
.pagination-info { font-size: 13px; color: var(--text-muted); }
</style>
