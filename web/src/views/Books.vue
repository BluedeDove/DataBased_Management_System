<template>
  <div class="books-page">
    <section class="hero-card">
      <div>
        <h1>{{ canManage ? '图书管理' : '找书预约' }}</h1>
        <p>
          {{
            canManage
              ? '馆员维护馆藏信息与库存副本。'
              : '线上只做检索与预约；实体书请到馆在自助终端扫码取书。'
          }}
        </p>
      </div>
      <div class="hero-actions">
        <button class="ghost-btn" @click="resetFilters">
          <el-icon><Refresh /></el-icon>
          <span>重置筛选</span>
        </button>
        <button v-if="canManage" class="primary-btn" @click="openCreateDialog">
          <el-icon><Plus /></el-icon>
          <span>新增图书</span>
        </button>
      </div>
    </section>

    <section v-if="!canManage" class="reservation-card">
      <div class="section-title">我的预约提醒</div>
      <div v-if="myReservations.length === 0" class="empty-inline">你还没有预约记录。</div>
      <div v-else class="reservation-list">
        <div v-for="reservation in myReservations.slice(0, 3)" :key="reservation.id" class="reservation-item">
          <div>
            <div class="reservation-title">{{ reservation.book_title }}</div>
            <div class="reservation-meta">
              {{ reservation.status === 'pending' ? '待到馆取书' : reservation.status }} · 取书码：{{ reservation.pickup_code || '—' }}
            </div>
          </div>
          <div class="reservation-expire">{{ reservation.expires_at || '长期有效' }}</div>
        </div>
      </div>
    </section>

    <section class="filter-card">
      <div class="filter-row">
        <div class="search-box">
          <el-icon><Search /></el-icon>
          <el-autocomplete
            v-model="searchKeyword"
            :fetch-suggestions="queryBookSuggestions"
            :debounce="140"
            clearable
            :placeholder="searchPlaceholder"
            @select="handleSuggestionSelect"
            @keydown.enter="fetchBooks"
          >
            <template #default="{ item }">
              <div class="suggestion-item">
                <div class="suggestion-title">{{ item.title }}</div>
                <div class="suggestion-meta">{{ item.author }} · {{ item.isbn }} · 可用 {{ item.availableQuantity }}</div>
              </div>
            </template>
          </el-autocomplete>
        </div>

        <el-select v-model="searchMode" placeholder="搜索模式" style="width: 150px" @change="fetchBooks">
          <el-option
            v-for="option in searchModeOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>

        <el-select v-model="selectedCategory" clearable placeholder="选择分类" style="width: 220px" @change="fetchBooks">
          <el-option v-for="category in categories" :key="category.id" :label="category.name" :value="category.id" />
        </el-select>

        <button class="ghost-btn" @click="fetchBooks">
          <el-icon><Search /></el-icon>
          <span>搜索</span>
        </button>
      </div>
      <div class="filter-hint">
        向量模糊优先走图书语义向量检索；关键词包含只是普通字段匹配，默认使用向量模糊。
      </div>
      <div class="semantic-status-card" :class="`is-${semanticStatusTone}`">
        <div class="semantic-status-head">
          <span class="semantic-status-badge" :class="`is-${semanticStatusTone}`">{{ semanticStatusLabel }}</span>
          <span class="semantic-status-message">{{ semanticStatusMessage }}</span>
        </div>
        <div class="semantic-status-meta">
          <span>向量 {{ semanticVectorCount }} / {{ semanticTotalBooks }}</span>
          <span>覆盖率 {{ semanticCoverageRate }}%</span>
          <span v-if="semanticCurrentModel">模型 {{ semanticCurrentModel }}</span>
          <button class="status-link-btn" type="button" @click="loadSemanticStatus">刷新语义状态</button>
        </div>
      </div>
    </section>

    <section class="table-card">
      <div class="responsive-table-shell">
      <el-table
        v-loading="loading"
        :data="books"
        :style="{ width: '100%', minWidth: isCompactViewport ? '860px' : '100%' }"
      >
        <el-table-column prop="title" label="书名" min-width="240" />
        <el-table-column prop="author" label="作者" min-width="140" />
        <el-table-column prop="category_name" label="分类" width="150" />
        <el-table-column v-if="!isCompactViewport" prop="publisher" label="出版社" min-width="160" />
        <el-table-column label="馆藏状态" width="130">
          <template #default="{ row }">
            <span class="pill-badge" :class="bookMeta(row).badgeClass">{{ bookMeta(row).label }}</span>
          </template>
        </el-table-column>
        <el-table-column label="库存" width="130">
          <template #default="{ row }">
            <span :class="{ empty: row.available_quantity === 0 }">{{ row.available_quantity }} / {{ row.total_quantity }}</span>
          </template>
        </el-table-column>
        <el-table-column v-if="!isMobileViewport" prop="isbn" label="ISBN" min-width="180" />
        <el-table-column label="操作" width="220" :fixed="isCompactViewport ? false : 'right'">
          <template #default="{ row }">
            <div class="action-group">
              <template v-if="canManage">
                <button class="small-btn" @click="openEditDialog(row)">
                  <el-icon><Edit /></el-icon>
                  <span>编辑</span>
                </button>
                <button class="small-btn danger" @click="handleDelete(row)">
                  <el-icon><Delete /></el-icon>
                  <span>删除</span>
                </button>
              </template>
              <template v-else>
                <button
                  class="small-btn primary"
                  :title="reservationButtonHint(row)"
                  :disabled="!canReserveBook(row)"
                  @click="handleReserve(row)"
                >
                  <el-icon><Tickets /></el-icon>
                  <span>{{ reservationButtonLabel(row) }}</span>
                </button>
              </template>
            </div>
          </template>
        </el-table-column>
      </el-table>
      </div>
    </section>

    <el-dialog v-model="editorVisible" :title="editingId ? '编辑图书' : '新增图书'" width="640px">
      <el-form :model="editorForm" label-width="90px">
        <el-form-item label="书名">
          <el-input v-model="editorForm.title" />
        </el-form-item>
        <el-form-item label="作者">
          <el-input v-model="editorForm.author" />
        </el-form-item>
        <div class="grid-two">
          <el-form-item label="出版社">
            <el-input v-model="editorForm.publisher" />
          </el-form-item>
          <el-form-item label="ISBN">
            <el-input v-model="editorForm.isbn" placeholder="留空可由后端生成" />
          </el-form-item>
        </div>
        <div class="grid-two">
          <el-form-item label="分类">
            <el-select v-model="editorForm.category_id" style="width: 100%">
              <el-option v-for="category in categories" :key="category.id" :label="category.name" :value="category.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="库存">
            <el-input-number v-model="editorForm.total_quantity" :min="1" style="width: 100%" />
          </el-form-item>
        </div>
        <div class="grid-two">
          <el-form-item label="价格">
            <el-input-number v-model="editorForm.price" :min="0" :precision="2" style="width: 100%" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="editorForm.status" style="width: 100%">
              <el-option label="正常" value="normal" />
              <el-option label="损坏" value="damaged" />
              <el-option label="遗失" value="lost" />
              <el-option label="注销" value="destroyed" />
            </el-select>
          </el-form-item>
        </div>
        <el-form-item label="简介">
          <el-input v-model="editorForm.description" type="textarea" :rows="4" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="editorVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitEditor">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Refresh, Edit, Delete, Tickets } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/user'
import { aiApi } from '@/api/ai.api'
import { bookApi, bookCategoryApi } from '@/api/book.api'
import { reservationApi, type ReservationRecord } from '@/api/reservation.api'
import { getBookStatusMeta } from '@/utils/libraryStatus'
import { fetchBookSuggestions, type BookSuggestionItem } from '@/utils/searchSuggestions'
import { useViewport } from '@/composables/useViewport'

const route = useRoute()
const userStore = useUserStore()
const { isCompactViewport, isMobileViewport } = useViewport()

const canManage = computed(() => ['admin', 'librarian'].includes(userStore.user?.role || ''))
const loading = ref(false)
const saving = ref(false)
const books = ref<any[]>([])
const categories = ref<any[]>([])
const myReservations = ref<ReservationRecord[]>([])
const reservingIds = ref<Set<number>>(new Set())

const searchKeyword = ref('')
type SearchMode = 'semantic' | 'contains' | 'exact' | 'startsWith' | 'endsWith'
const searchMode = ref<SearchMode>('semantic')
const selectedCategory = ref<number | undefined>()
const semanticStatus = ref<'loading' | 'ready' | 'apiMissing' | 'indexMissing' | 'error'>('loading')
const semanticVectorCount = ref(0)
const semanticTotalBooks = ref(0)
const semanticCoverageRate = ref(0)
const semanticCurrentModel = ref('')
const semanticSearchReady = computed(() => semanticStatus.value === 'ready')
const semanticStatusTone = computed(() => {
  if (semanticStatus.value === 'ready') return 'ready'
  if (semanticStatus.value === 'loading') return 'loading'
  return 'warning'
})
const semanticStatusLabel = computed(() => {
  if (semanticStatus.value === 'ready') return '语义检索已就绪'
  if (semanticStatus.value === 'loading') return '语义状态检查中'
  return '语义检索未就绪'
})
const semanticStatusMessage = computed(() => {
  if (semanticStatus.value === 'ready') {
    return `当前已为 ${semanticVectorCount.value} / ${semanticTotalBooks.value} 本图书建立向量索引，可直接使用自然语言找书。`
  }

  if (semanticStatus.value === 'apiMissing') {
    return canManage.value
      ? '系统尚未配置向量模型 API Key，请先到系统设置完成配置。'
      : '馆员尚未完成向量模型配置，请先使用“关键词包含”检索。'
  }

  if (semanticStatus.value === 'indexMissing') {
    return canManage.value
      ? `当前仅有 ${semanticVectorCount.value} / ${semanticTotalBooks.value} 本图书完成向量索引，请先生成图书向量。`
      : '馆藏语义索引尚未准备完成，请先使用“关键词包含”检索。'
  }

  if (semanticStatus.value === 'error') {
    return '暂时无法获取语义索引状态，请先使用“关键词包含”检索。'
  }

  return '正在检查向量模型配置与图书索引状态…'
})
const searchModeOptions = computed<Array<{ label: string; value: SearchMode }>>(() => [
  { label: semanticSearchReady.value ? '向量模糊' : '向量模糊（未就绪）', value: 'semantic' },
  { label: '关键词包含', value: 'contains' },
  { label: '精确', value: 'exact' },
  { label: '前缀', value: 'startsWith' },
  { label: '后缀', value: 'endsWith' }
])
const searchPlaceholder = computed(() => {
  const placeholderMap: Record<SearchMode, string> = {
    semantic: semanticSearchReady.value ? '用自然语言描述你想找的书' : '语义检索未就绪，请先切换到关键词包含',
    contains: '关键词包含匹配书名、作者、出版社、ISBN',
    exact: '精确匹配书名、作者、出版社、ISBN',
    startsWith: '搜索以该文本开头的图书',
    endsWith: '搜索以该文本结尾的图书'
  }
  return placeholderMap[searchMode.value]
})
const regexSearchFields = ['title', 'author', 'publisher', 'isbn', 'keywords', 'description']

const editorVisible = ref(false)
const editingId = ref<number | null>(null)
const editorForm = reactive({
  title: '',
  author: '',
  publisher: '',
  isbn: '',
  category_id: undefined as number | undefined,
  total_quantity: 1,
  price: 0,
  status: 'normal',
  description: ''
})

const reservedBookIds = computed(() => {
  const pending = myReservations.value
    .filter(item => item.status === 'pending')
    .map(item => item.book_id)
  return new Set(pending)
})

const bookMeta = (book: any) => getBookStatusMeta(book.status, book.available_quantity)

const canReserveBook = (book: any) =>
  !!userStore.user?.reader_id &&
  bookMeta(book).canReserve &&
  !reservingIds.value.has(book.id) &&
  !reservedBookIds.value.has(book.id)

const reservationButtonLabel = (book: any) => {
  if (reservedBookIds.value.has(book.id)) return '已预约'
  if (reservingIds.value.has(book.id)) return '预约中…'
  if (!userStore.user?.reader_id) return '未绑定读者'
  return bookMeta(book).reserveLabel
}

const reservationButtonHint = (book: any) => {
  if (reservedBookIds.value.has(book.id)) return '已加入到馆取书列表'
  if (!userStore.user?.reader_id) return '当前账号未绑定读者信息'
  return bookMeta(book).hint
}

const queryBookSuggestions = async (
  queryString: string,
  callback: (items: BookSuggestionItem[]) => void
) => {
  callback(await fetchBookSuggestions(queryString))
}

const handleSuggestionSelect = async (item: BookSuggestionItem) => {
  searchKeyword.value = item.title
  await fetchBooks()
}

const resetEditor = () => {
  editingId.value = null
  editorForm.title = ''
  editorForm.author = ''
  editorForm.publisher = ''
  editorForm.isbn = ''
  editorForm.category_id = categories.value[0]?.id
  editorForm.total_quantity = 1
  editorForm.price = 0
  editorForm.status = 'normal'
  editorForm.description = ''
}

const fetchCategories = async () => {
  const result = await bookCategoryApi.getAll()
  if (result.success && result.data) {
    categories.value = result.data
    if (!editorForm.category_id && categories.value.length > 0) {
      editorForm.category_id = categories.value[0].id
    }
  }
}

const loadSemanticStatus = async () => {
  semanticStatus.value = 'loading'

  try {
    const [availableResult, statisticsResult] = await Promise.all([
      aiApi.isAvailable(),
      aiApi.getStatistics()
    ])

    const apiConfigured = availableResult.success && !!availableResult.data
    const statistics = statisticsResult.success && statisticsResult.data ? statisticsResult.data : undefined

    semanticVectorCount.value = statistics?.totalVectors || 0
    semanticTotalBooks.value = statistics?.totalBooks || 0
    semanticCoverageRate.value = Math.round(statistics?.coverageRate || 0)
    semanticCurrentModel.value = statistics?.currentModel || ''

    if (!apiConfigured) {
      semanticStatus.value = 'apiMissing'
      return
    }

    if ((statistics?.totalVectors || 0) <= 0) {
      semanticStatus.value = 'indexMissing'
      return
    }

    semanticStatus.value = 'ready'
  } catch {
    semanticVectorCount.value = 0
    semanticCoverageRate.value = 0
    semanticCurrentModel.value = ''
    semanticStatus.value = 'error'
  }
}

const fetchBooks = async () => {
  loading.value = true
  try {
    const keyword = searchKeyword.value.trim()
    if (!keyword) {
      const result = await bookApi.getAll({
        category_id: selectedCategory.value
      })
      if (result.success && result.data) {
        books.value = result.data
      }
      return
    }

    if (searchMode.value === 'semantic') {
      if (semanticStatus.value === 'loading') {
        await loadSemanticStatus()
      }

      if (!semanticSearchReady.value) {
        books.value = []
        ElMessage.warning(semanticStatusMessage.value)
        return
      }

      const result = await aiApi.semanticSearch(keyword, 50)
      if (result.success && result.data) {
        books.value = selectedCategory.value === undefined
          ? result.data
          : result.data.filter(book => book.category_id === selectedCategory.value)
      }
      return
    }

    if (searchMode.value === 'contains') {
      const result = await bookApi.getAll({
        keyword,
        category_id: selectedCategory.value
      })
      if (result.success && result.data) {
        books.value = result.data
      }
      return
    }

    const result = await bookApi.regexSearch(
      keyword,
      regexSearchFields,
      selectedCategory.value,
      searchMode.value
    )

    if (result.success && result.data) {
      books.value = result.data
    }
  } catch (error: any) {
    books.value = []
    ElMessage.error(error?.response?.data?.error?.message || error?.message || '搜索失败')
  } finally {
    loading.value = false
  }
}

const fetchReservations = async () => {
  if (canManage.value || !userStore.user?.reader_id) {
    myReservations.value = []
    return
  }

  const result = await reservationApi.getMy()
  if (result.success && result.data) {
    myReservations.value = result.data
  }
}

const resetFilters = async () => {
  searchKeyword.value = ''
  searchMode.value = 'semantic'
  selectedCategory.value = undefined
  await fetchBooks()
}

const openCreateDialog = () => {
  resetEditor()
  editorVisible.value = true
}

const openEditDialog = (book: any) => {
  editingId.value = book.id
  editorForm.title = book.title
  editorForm.author = book.author
  editorForm.publisher = book.publisher
  editorForm.isbn = book.isbn
  editorForm.category_id = book.category_id
  editorForm.total_quantity = book.total_quantity
  editorForm.price = book.price || 0
  editorForm.status = book.status || 'normal'
  editorForm.description = book.description || ''
  editorVisible.value = true
}

const submitEditor = async () => {
  if (!editorForm.title.trim() || !editorForm.author.trim() || !editorForm.publisher.trim() || !editorForm.category_id) {
    ElMessage.warning('请补全书名、作者、出版社和分类')
    return
  }

  saving.value = true
  try {
    const payload = {
      title: editorForm.title.trim(),
      author: editorForm.author.trim(),
      publisher: editorForm.publisher.trim(),
      isbn: editorForm.isbn.trim() || undefined,
      category_id: editorForm.category_id,
      total_quantity: editorForm.total_quantity,
      available_quantity: editorForm.total_quantity,
      price: editorForm.price,
      status: editorForm.status,
      description: editorForm.description.trim() || undefined,
      registration_date: new Date().toISOString().split('T')[0]
    }

    const result = editingId.value
      ? await bookApi.update(editingId.value, payload)
      : await bookApi.create(payload)

    if (result.success) {
      ElMessage.success(editingId.value ? '图书已更新' : '图书已新增')
      editorVisible.value = false
      await fetchBooks()
    }
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error?.message || error?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const handleDelete = async (book: any) => {
  try {
    await ElMessageBox.confirm(`确认删除《${book.title}》吗？`, '删除图书', {
      type: 'warning'
    })

    const result = await bookApi.delete(book.id)
    if (result.success) {
      ElMessage.success('图书已删除')
      await fetchBooks()
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error?.response?.data?.error?.message || error?.message || '删除失败')
    }
  }
}

const handleReserve = async (book: any) => {
  if (!userStore.user?.reader_id) {
    ElMessage.warning('当前账号未绑定读者信息，暂时无法预约')
    return
  }

  const meta = bookMeta(book)
  if (!meta.canReserve) {
    ElMessage.warning(meta.hint)
    return
  }

  const nextIds = new Set(reservingIds.value)
  nextIds.add(book.id)
  reservingIds.value = nextIds

  try {
    const result = await reservationApi.create(book.id)
    if (result.success) {
      ElMessage.success(`预约成功，请到馆在自助终端扫码取书。取书码：${result.data?.pickup_code || '已生成'}`)
      await fetchReservations()
    }
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error?.message || error?.message || '预约失败')
  } finally {
    const updatedIds = new Set(reservingIds.value)
    updatedIds.delete(book.id)
    reservingIds.value = updatedIds
  }
}

watch(
  () => route.query.search,
  value => {
    if (typeof value === 'string') {
      searchKeyword.value = value
      fetchBooks()
    }
  },
  { immediate: true }
)

onMounted(async () => {
  await Promise.all([fetchCategories(), loadSemanticStatus(), fetchBooks(), fetchReservations()])
})
</script>

<style scoped>
.books-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
}

.hero-card,
.reservation-card,
.filter-card,
.table-card {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.85);
  border-radius: 24px;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.06);
}

.hero-card {
  padding: 24px 28px;
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: center;
}

.hero-card h1,
.section-title {
  margin: 0 0 10px;
  color: #0f172a;
}

.hero-card p {
  margin: 0;
  color: #64748b;
}

.hero-actions,
.filter-row,
.action-group {
  display: flex;
  gap: 12px;
  align-items: center;
}

.reservation-card,
.filter-card,
.table-card {
  padding: 20px 24px;
}

.table-card {
  overflow: hidden;
}

.reservation-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reservation-item {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  padding: 14px 16px;
  border-radius: 18px;
  background: #f8fafc;
}

.reservation-title {
  font-weight: 600;
  color: #0f172a;
}

.reservation-meta,
.reservation-expire,
.empty-inline {
  color: #64748b;
  font-size: 14px;
}

.filter-hint {
  margin-top: 12px;
  font-size: 13px;
  color: #64748b;
}

.semantic-status-card {
  margin-top: 12px;
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}

.semantic-status-card.is-ready {
  background: #ecfdf5;
  border-color: #a7f3d0;
}

.semantic-status-card.is-loading {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.semantic-status-card.is-warning {
  background: #fff7ed;
  border-color: #fed7aa;
}

.semantic-status-head,
.semantic-status-meta {
  display: flex;
  gap: 10px 14px;
  flex-wrap: wrap;
  align-items: center;
}

.semantic-status-message {
  color: #334155;
  font-size: 14px;
}

.semantic-status-meta {
  margin-top: 10px;
  font-size: 13px;
  color: #64748b;
}

.semantic-status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.semantic-status-badge.is-ready {
  color: #047857;
  background: rgba(16, 185, 129, 0.14);
}

.semantic-status-badge.is-loading {
  color: #1d4ed8;
  background: rgba(59, 130, 246, 0.14);
}

.semantic-status-badge.is-warning {
  color: #c2410c;
  background: rgba(249, 115, 22, 0.14);
}

.status-link-btn {
  padding: 0;
  border: none;
  background: transparent;
  color: #7c3aed;
  font-weight: 600;
  cursor: pointer;
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 44px;
  padding: 0 14px;
  border-radius: 14px;
  background: #f8fafc;
}

.search-box :deep(.el-autocomplete) {
  flex: 1;
}

.search-box :deep(.el-input__wrapper) {
  box-shadow: none !important;
  background: transparent !important;
}

.ghost-btn,
.primary-btn,
.small-btn {
  border: none;
  border-radius: 14px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 600;
}

.ghost-btn,
.small-btn {
  height: 42px;
  padding: 0 14px;
  color: #334155;
  background: #eef2ff;
}

.primary-btn,
.small-btn.primary {
  height: 44px;
  padding: 0 16px;
  color: #fff;
  background: linear-gradient(135deg, #c8102e 0%, #7c3aed 100%);
}

.small-btn.danger {
  background: #fee2e2;
  color: #991b1b;
}

.small-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.empty {
  color: #dc2626;
  font-weight: 600;
}

.grid-two {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}

.suggestion-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 2px 0;
}

.suggestion-title {
  font-weight: 600;
  color: #0f172a;
}

.suggestion-meta {
  font-size: 12px;
  color: #64748b;
}

@media (max-width: 1180px) {
  .hero-card,
  .filter-row {
    flex-direction: column;
    align-items: stretch;
  }

  .hero-actions,
  .action-group {
    width: 100%;
    flex-wrap: wrap;
  }

  .grid-two {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .hero-card,
  .reservation-card,
  .filter-card,
  .table-card {
    padding: 16px;
  }

  .reservation-item {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
