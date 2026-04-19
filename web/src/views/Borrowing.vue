<template>
  <div class="borrowing-page">
    <section class="hero-card">
      <div>
        <h1>{{ isStaff ? '借还管理' : '我的借阅' }}</h1>
        <p>
          {{
            isStaff
              ? '馆员可在后台做人工兜底；实体书主流程仍以机器终端扫码借还为准。'
              : '线上查看借阅、预约与续借申请；实体书归还必须到馆在机器终端完成。'
          }}
        </p>
      </div>
      <div v-if="!isStaff" class="summary-group">
        <div class="summary-card">
          <span class="summary-value">{{ currentBorrowings.length }}</span>
          <span class="summary-label">当前在借</span>
        </div>
        <div class="summary-card warning">
          <span class="summary-value">{{ overdueCount }}</span>
          <span class="summary-label">逾期数量</span>
        </div>
        <div class="summary-card">
          <span class="summary-value">{{ reservations.length }}</span>
          <span class="summary-label">待取预约</span>
        </div>
      </div>
    </section>

    <template v-if="isStaff">
      <section class="panel">
        <div class="panel-header">
          <h2>人工借书兜底</h2>
          <span>优先引导读者到机器终端扫码办理，后台仅作补充处理。</span>
        </div>

        <div class="grid-two">
          <div class="search-panel">
            <div class="search-title">选择读者</div>
            <div class="search-row">
              <el-autocomplete
                v-model="readerKeyword"
                :fetch-suggestions="queryReaderSuggestions"
                :debounce="120"
                clearable
                placeholder="输入读者姓名或证号"
                @select="handleReaderSelect"
                @keydown.enter="searchReaders"
              >
                <template #default="{ item }">
                  <div class="suggestion-item">
                    <div class="suggestion-title">{{ item.name }} · {{ item.readerNo }}</div>
                    <div class="suggestion-meta">{{ item.categoryName }} · {{ statusLabel(item.status) }}</div>
                  </div>
                </template>
              </el-autocomplete>
              <button class="ghost-btn" @click="searchReaders">搜索</button>
            </div>
            <div class="candidate-list">
              <button
                v-for="reader in readerCandidates"
                :key="reader.id"
                class="candidate-item"
                :class="{ active: selectedReader?.id === reader.id }"
                @click="selectedReader = reader"
              >
                <span>{{ reader.name }}</span>
                <span>{{ reader.reader_no }}</span>
              </button>
              <div v-if="readerCandidates.length === 0" class="empty-inline">先搜索并选择读者。</div>
            </div>
          </div>

          <div class="search-panel">
            <div class="search-title">选择图书</div>
            <div class="search-row">
              <el-autocomplete
                v-model="bookKeyword"
                :fetch-suggestions="queryBookSuggestions"
                :debounce="120"
                clearable
                placeholder="输入书名、作者或 ISBN"
                @select="handleBookSelect"
                @keydown.enter="searchBooks"
              >
                <template #default="{ item }">
                  <div class="suggestion-item">
                    <div class="suggestion-title">{{ item.title }}</div>
                    <div class="suggestion-meta">{{ item.author }} · 可用 {{ item.availableQuantity }}</div>
                  </div>
                </template>
              </el-autocomplete>
              <button class="ghost-btn" @click="searchBooks">搜索</button>
            </div>
            <div class="candidate-list">
              <button
                v-for="book in bookCandidates"
                :key="book.id"
                class="candidate-item"
                :class="{ active: selectedBook?.id === book.id }"
                @click="selectedBook = book"
              >
                <span>{{ book.title }}</span>
                <span>{{ book.available_quantity }} / {{ book.total_quantity }} · {{ staffBookMeta(book).label }}</span>
              </button>
              <div v-if="bookCandidates.length === 0" class="empty-inline">先搜索并选择图书。</div>
            </div>
          </div>
        </div>

        <div class="selected-summary">
          <div v-if="selectedReader" class="selected-item">读者：{{ selectedReader.name }}（{{ selectedReader.reader_no }}）</div>
          <div v-if="selectedBook" class="selected-item">图书：{{ selectedBook.title }}（可借 {{ selectedBook.available_quantity }} 本）</div>
          <div class="selected-tip">{{ staffBorrowHint }}</div>
        </div>

        <button class="primary-btn wide" :title="staffBorrowHint" :disabled="!canStaffBorrow || staffSubmitting" @click="handleBorrow">
          {{ staffSubmitting ? '借书中…' : '后台兜底借书' }}
        </button>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>在借记录</h2>
          <span>支持人工兜底还书</span>
        </div>

        <div class="search-row">
          <input v-model="staffKeyword" type="text" placeholder="搜索读者、书名或 ISBN" @keydown.enter="loadStaffRecords">
          <button class="ghost-btn" @click="loadStaffRecords">刷新</button>
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>读者</th>
                <th>图书</th>
                <th>借书日期</th>
                <th>应还日期</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in activeRecords" :key="record.id">
                <td>{{ record.reader_name }}</td>
                <td>{{ record.book_title }}</td>
                <td>{{ record.borrow_date }}</td>
                <td>{{ record.due_date }}</td>
                <td>{{ borrowingStatusLabel(record.status) }}</td>
                <td>
                  <button class="small-btn primary" :disabled="returningIds.has(record.id)" @click="handleReturn(record)">
                    {{ returningIds.has(record.id) ? '处理中…' : '还书' }}
                  </button>
                </td>
              </tr>
              <tr v-if="activeRecords.length === 0">
                <td colspan="6" class="empty-cell">暂无在借记录。</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>借阅历史</h2>
          <span>查看归还、遗失等历史记录</span>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>读者</th>
                <th>图书</th>
                <th>借书日期</th>
                <th>归还日期</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in historyRecords" :key="record.id">
                <td>{{ record.reader_name }}</td>
                <td>{{ record.book_title }}</td>
                <td>{{ record.borrow_date }}</td>
                <td>{{ record.return_date || '—' }}</td>
                <td>{{ borrowingStatusLabel(record.status) }}</td>
              </tr>
              <tr v-if="historyRecords.length === 0">
                <td colspan="5" class="empty-cell">暂无历史记录。</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <template v-else>
      <section class="panel">
        <div class="panel-header">
          <h2>我的预约</h2>
          <span>预约成功后请到馆，在自助终端扫码取书。</span>
        </div>

        <div class="card-list">
          <div v-for="reservation in reservations" :key="reservation.id" class="info-card">
            <div>
              <div class="info-title">{{ reservation.book_title }}</div>
              <div class="info-meta">
                取书码：{{ reservation.pickup_code || '—' }} · 状态：{{ reservationStatusLabel(reservation.status) }}
              </div>
              <div class="info-meta">预约时间：{{ reservation.reserved_at }}</div>
              <div class="info-meta">截止时间：{{ reservation.expires_at || '—' }}</div>
            </div>
            <button
              class="small-btn"
              :disabled="reservation.status !== 'pending' || cancellingIds.has(reservation.id)"
              @click="handleCancelReservation(reservation)"
            >
              {{ cancellingIds.has(reservation.id) ? '取消中…' : '取消预约' }}
            </button>
          </div>
          <div v-if="reservations.length === 0" class="empty-inline">暂无预约记录。</div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>当前借阅</h2>
          <span>线上仅支持续借申请，归还必须到馆办理。</span>
        </div>

        <div v-if="overdueCount > 0" class="warning-banner">
          你当前有 {{ overdueCount }} 本图书逾期，请尽快到馆归还。
        </div>

        <div class="card-list">
          <div v-for="record in currentBorrowings" :key="record.id" class="info-card">
            <div>
              <div class="info-title">{{ record.book_title }}</div>
              <div class="info-meta">借书日期：{{ record.borrow_date }}</div>
              <div class="info-meta">应还日期：{{ record.due_date }}</div>
              <div class="info-meta">状态：{{ borrowingStatusLabel(record.status) }}</div>
            </div>
            <div class="card-actions">
              <button
                class="small-btn primary"
                :disabled="record.status !== 'borrowed' || renewingIds.has(record.id) || record.renewal_request_status === 'pending'"
                @click="handleRenew(record)"
              >
                {{
                  record.renewal_request_status === 'pending'
                    ? '待审批'
                    : renewingIds.has(record.id)
                      ? '申请中…'
                      : '申请续借'
                }}
              </button>
              <span class="offline-tip">实体书请到馆在自助终端归还</span>
            </div>
          </div>
          <div v-if="currentBorrowings.length === 0" class="empty-inline">当前没有在借图书。</div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>借阅历史</h2>
          <span>用于回看借阅轨迹与传承笔记沉淀</span>
        </div>

        <div class="card-list">
          <div v-for="record in historyRecords" :key="record.id" class="info-card">
            <div class="info-title">{{ record.book_title }}</div>
            <div class="info-meta">借书日期：{{ record.borrow_date }}</div>
            <div class="info-meta">归还日期：{{ record.return_date || '—' }}</div>
            <div class="info-meta">状态：{{ borrowingStatusLabel(record.status) }}</div>
          </div>
          <div v-if="historyRecords.length === 0" class="empty-inline">暂无历史借阅记录。</div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/user'
import { borrowingApi, type BorrowingRecord } from '@/api/borrowing.api'
import { reservationApi, type ReservationRecord } from '@/api/reservation.api'
import { readerApi } from '@/api/reader.api'
import { bookApi } from '@/api/book.api'
import {
  fetchBookSuggestions,
  fetchReaderSuggestions,
  type BookSuggestionItem,
  type ReaderSuggestionItem
} from '@/utils/searchSuggestions'
import { getBookStatusMeta } from '@/utils/libraryStatus'

const userStore = useUserStore()
const isStaff = computed(() => ['admin', 'librarian'].includes(userStore.user?.role || ''))

const readerKeyword = ref('')
const bookKeyword = ref('')
const staffKeyword = ref('')
const readerCandidates = ref<any[]>([])
const bookCandidates = ref<any[]>([])
const selectedReader = ref<any | null>(null)
const selectedBook = ref<any | null>(null)
const staffSubmitting = ref(false)

const activeRecords = ref<BorrowingRecord[]>([])
const historyRecords = ref<BorrowingRecord[]>([])
const reservations = ref<ReservationRecord[]>([])
const currentBorrowings = ref<BorrowingRecord[]>([])
const returningIds = ref<Set<number>>(new Set())
const renewingIds = ref<Set<number>>(new Set())
const cancellingIds = ref<Set<number>>(new Set())

const overdueCount = computed(() =>
  currentBorrowings.value.filter(record => record.status === 'overdue').length
)

const staffBookMeta = (book: any) => getBookStatusMeta(book?.status, book?.available_quantity)

const canStaffBorrow = computed(() => {
  if (!selectedReader.value || !selectedBook.value) return false
  if (selectedReader.value.status !== 'active') return false
  return staffBookMeta(selectedBook.value).canReserve
})

const staffBorrowHint = computed(() => {
  if (!selectedReader.value || !selectedBook.value) {
    return '请先同时选择读者与图书'
  }

  if (selectedReader.value.status !== 'active') {
    return '当前读者状态异常，请先处理读者状态后再办理'
  }

  return `后台仅作兜底处理：${staffBookMeta(selectedBook.value).hint}`
})

const borrowingStatusLabel = (status: string) => {
  const labelMap: Record<string, string> = {
    borrowed: '在借',
    overdue: '逾期',
    returned: '已归还',
    lost: '遗失'
  }

  return labelMap[status] || status
}

const reservationStatusLabel = (status: string) => {
  const labelMap: Record<string, string> = {
    pending: '待取书',
    fulfilled: '已完成',
    cancelled: '已取消',
    expired: '已过期'
  }

  return labelMap[status] || status
}

const statusLabel = (status: string) => {
  const labelMap: Record<string, string> = {
    active: '正常',
    suspended: '已停用',
    expired: '已过期'
  }

  return labelMap[status] || status
}

const queryReaderSuggestions = async (
  queryString: string,
  callback: (items: ReaderSuggestionItem[]) => void
) => {
  callback(await fetchReaderSuggestions(queryString))
}

const queryBookSuggestions = async (
  queryString: string,
  callback: (items: BookSuggestionItem[]) => void
) => {
  callback(await fetchBookSuggestions(queryString))
}

const handleReaderSelect = async (item: ReaderSuggestionItem) => {
  readerKeyword.value = item.readerNo
  await searchReaders()
  selectedReader.value = readerCandidates.value.find(reader => reader.id === item.id) || null
}

const handleBookSelect = async (item: BookSuggestionItem) => {
  bookKeyword.value = item.title
  await searchBooks()
  selectedBook.value = bookCandidates.value.find(book => book.id === item.id) || null
}

const searchReaders = async () => {
  if (!readerKeyword.value.trim()) {
    ElMessage.warning('请输入读者姓名或证号')
    return
  }

  try {
    const result = await readerApi.search(readerKeyword.value.trim())
    if (result.success && result.data) {
      readerCandidates.value = result.data
      if (result.data.length === 1) {
        selectedReader.value = result.data[0]
      }
    }
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error?.message || error?.message || '搜索读者失败')
  }
}

const searchBooks = async () => {
  if (!bookKeyword.value.trim()) {
    ElMessage.warning('请输入书名、作者或 ISBN')
    return
  }

  try {
    const result = await bookApi.getAll({ keyword: bookKeyword.value.trim() })
    if (result.success && result.data) {
      bookCandidates.value = result.data
      if (result.data.length === 1) {
        selectedBook.value = result.data[0]
      }
    }
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error?.message || error?.message || '搜索图书失败')
  }
}

const loadStaffRecords = async () => {
  try {
    const result = await borrowingApi.getAll({
      keyword: staffKeyword.value.trim() || undefined
    })

    if (result.success && result.data) {
      activeRecords.value = result.data.filter(record => ['borrowed', 'overdue'].includes(record.status))
      historyRecords.value = result.data.filter(record => ['returned', 'lost'].includes(record.status))
    }
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error?.message || error?.message || '加载借阅记录失败')
  }
}

const loadMyData = async () => {
  try {
    const [borrowingResult, reservationResult] = await Promise.all([
      borrowingApi.getMy(),
      reservationApi.getMy()
    ])

    if (borrowingResult.success && borrowingResult.data) {
      const items = borrowingResult.data.items || []
      currentBorrowings.value = items.filter(record => ['borrowed', 'overdue'].includes(record.status))
      historyRecords.value = items.filter(record => ['returned', 'lost'].includes(record.status))
    }

    if (reservationResult.success && reservationResult.data) {
      reservations.value = reservationResult.data
    }
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error?.message || error?.message || '加载个人借阅数据失败')
  }
}

const handleBorrow = async () => {
  if (!selectedReader.value || !selectedBook.value) {
    ElMessage.warning('请先选择读者和图书')
    return
  }

  if (selectedReader.value.status !== 'active') {
    ElMessage.warning('当前读者状态异常，请先处理读者状态后再办理借书')
    return
  }

  const meta = staffBookMeta(selectedBook.value)
  if (!meta.canReserve) {
    ElMessage.warning(meta.hint)
    return
  }

  staffSubmitting.value = true
  try {
    const result = await borrowingApi.borrow(selectedReader.value.id, selectedBook.value.id)
    if (result.success) {
      ElMessage.success('借书成功')
      selectedReader.value = null
      selectedBook.value = null
      readerCandidates.value = []
      bookCandidates.value = []
      readerKeyword.value = ''
      bookKeyword.value = ''
      await loadStaffRecords()
    }
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error?.message || error?.message || '借书失败')
  } finally {
    staffSubmitting.value = false
  }
}

const handleReturn = async (record: BorrowingRecord) => {
  const nextIds = new Set(returningIds.value)
  nextIds.add(record.id)
  returningIds.value = nextIds

  try {
    const result = await borrowingApi.return(record.id)
    if (result.success) {
      ElMessage.success('还书成功')
      await loadStaffRecords()
    }
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error?.message || error?.message || '还书失败')
  } finally {
    const updatedIds = new Set(returningIds.value)
    updatedIds.delete(record.id)
    returningIds.value = updatedIds
  }
}

const handleRenew = async (record: BorrowingRecord) => {
  const nextIds = new Set(renewingIds.value)
  nextIds.add(record.id)
  renewingIds.value = nextIds

  try {
    const result = await borrowingApi.requestRenewal(record.id)
    if (result.success) {
      ElMessage.success('续借申请已提交')
      await loadMyData()
    }
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error?.message || error?.message || '续借申请失败')
  } finally {
    const updatedIds = new Set(renewingIds.value)
    updatedIds.delete(record.id)
    renewingIds.value = updatedIds
  }
}

const handleCancelReservation = async (reservation: ReservationRecord) => {
  const nextIds = new Set(cancellingIds.value)
  nextIds.add(reservation.id)
  cancellingIds.value = nextIds

  try {
    const result = await reservationApi.cancel(reservation.id)
    if (result.success) {
      ElMessage.success('预约已取消')
      await loadMyData()
    }
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error?.message || error?.message || '取消预约失败')
  } finally {
    const updatedIds = new Set(cancellingIds.value)
    updatedIds.delete(reservation.id)
    cancellingIds.value = updatedIds
  }
}

onMounted(async () => {
  if (isStaff.value) {
    await loadStaffRecords()
  } else {
    await loadMyData()
  }
})
</script>

<style scoped>
.borrowing-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
}

.hero-card,
.panel {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.85);
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.06);
}

.hero-card {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: center;
}

.hero-card h1,
.panel-header h2 {
  margin: 0 0 10px;
  color: #0f172a;
}

.hero-card p,
.panel-header span,
.info-meta,
.empty-inline,
.offline-tip {
  color: #64748b;
}

.summary-group {
  display: flex;
  gap: 12px;
}

.summary-card {
  min-width: 120px;
  padding: 14px 18px;
  border-radius: 18px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.summary-card.warning {
  background: #fff7ed;
}

.summary-value {
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}

.grid-two {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.search-panel {
  padding: 18px;
  border-radius: 20px;
  background: #f8fafc;
}

.search-title {
  margin-bottom: 12px;
  font-weight: 700;
  color: #0f172a;
}

.search-row {
  display: flex;
  gap: 12px;
}

.search-row input {
  flex: 1;
  height: 44px;
  border: 1px solid #cbd5e1;
  border-radius: 14px;
  padding: 0 14px;
}

.search-row :deep(.el-autocomplete) {
  flex: 1;
}

.search-row :deep(.el-input__wrapper) {
  min-height: 44px;
  border-radius: 14px;
}

.ghost-btn,
.primary-btn,
.small-btn,
.candidate-item {
  border: none;
  border-radius: 14px;
  cursor: pointer;
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

.primary-btn.wide {
  margin-top: 18px;
  width: 100%;
}

.candidate-list,
.card-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 14px;
}

.candidate-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  background: #fff;
  transition: all 0.2s ease;
}

.candidate-item.active {
  color: #c8102e;
  background: rgba(200, 16, 46, 0.08);
}

.selected-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 18px;
}

.selected-item,
.warning-banner {
  padding: 12px 14px;
  border-radius: 14px;
  background: #f8fafc;
  color: #334155;
}

.selected-tip {
  flex-basis: 100%;
  font-size: 13px;
  color: #64748b;
}

.warning-banner {
  margin-bottom: 14px;
  background: #fff7ed;
  color: #9a3412;
}

.table-wrap {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 14px 12px;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
}

.empty-cell {
  text-align: center;
  color: #64748b;
}

.info-card {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  padding: 16px 18px;
  border-radius: 18px;
  background: #f8fafc;
}

.info-title {
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 8px;
}

.card-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
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
  .panel-header,
  .search-row,
  .info-card {
    flex-direction: column;
    align-items: stretch;
  }

  .summary-group,
  .selected-summary {
    flex-direction: column;
  }

  .grid-two {
    grid-template-columns: 1fr;
  }

  .card-actions {
    align-items: stretch;
  }
}

@media (max-width: 768px) {
  .hero-card,
  .panel {
    padding: 16px;
  }

  .data-table {
    min-width: 720px;
  }
}
</style>
