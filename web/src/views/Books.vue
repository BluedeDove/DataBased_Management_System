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
            placeholder="搜索书名、作者、ISBN"
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

        <el-select v-model="selectedCategory" clearable placeholder="选择分类" style="width: 220px" @change="fetchBooks">
          <el-option v-for="category in categories" :key="category.id" :label="category.name" :value="category.id" />
        </el-select>

        <button class="ghost-btn" @click="fetchBooks">
          <el-icon><Search /></el-icon>
          <span>搜索</span>
        </button>
      </div>
    </section>

    <section class="table-card">
      <el-table v-loading="loading" :data="books" style="width: 100%">
        <el-table-column prop="title" label="书名" min-width="240" />
        <el-table-column prop="author" label="作者" min-width="140" />
        <el-table-column prop="category_name" label="分类" width="150" />
        <el-table-column prop="publisher" label="出版社" min-width="160" />
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
        <el-table-column prop="isbn" label="ISBN" min-width="180" />
        <el-table-column label="操作" width="220" fixed="right">
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
import { bookApi, bookCategoryApi } from '@/api/book.api'
import { reservationApi, type ReservationRecord } from '@/api/reservation.api'
import { getBookStatusMeta } from '@/utils/libraryStatus'
import { fetchBookSuggestions, type BookSuggestionItem } from '@/utils/searchSuggestions'

const route = useRoute()
const userStore = useUserStore()

const canManage = computed(() => ['admin', 'librarian'].includes(userStore.user?.role || ''))
const loading = ref(false)
const saving = ref(false)
const books = ref<any[]>([])
const categories = ref<any[]>([])
const myReservations = ref<ReservationRecord[]>([])
const reservingIds = ref<Set<number>>(new Set())

const searchKeyword = ref('')
const selectedCategory = ref<number | undefined>()

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

const fetchBooks = async () => {
  loading.value = true
  try {
    const result = await bookApi.getAll({
      keyword: searchKeyword.value.trim() || undefined,
      category_id: selectedCategory.value
    })

    if (result.success && result.data) {
      books.value = result.data
    }
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
  await Promise.all([fetchCategories(), fetchBooks(), fetchReservations()])
})
</script>

<style scoped>
.books-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
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

@media (max-width: 960px) {
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

  .reservation-item {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
