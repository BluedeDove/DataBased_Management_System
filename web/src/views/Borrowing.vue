<template>
  <div class="borrowing-page">
    <!-- ===== Page Header ===== -->
    <div class="page-header">
      <div class="header-left">
        <div class="header-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            <line x1="12" y1="6" x2="12" y2="13" />
            <line x1="9" y1="10" x2="15" y2="10" />
          </svg>
        </div>
        <div class="header-text">
          <h1 class="page-title">{{ pageTitle }}</h1>
          <div class="header-bar" />
          <p class="page-sub">{{ pageDescription }}</p>
        </div>
      </div>
    </div>

    <!-- ===== Overdue Warning Banner (teacher / student) ===== -->
    <div
      v-if="!canViewAllRecords && overdueCount > 0"
      class="overdue-banner"
    >
      <div class="banner-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>
      <div class="banner-body">
        <div class="banner-title">您有 {{ overdueCount }} 本图书已逾期，请尽快归还！</div>
        <div class="banner-desc">逾期图书可能会影响您的信用记录和借阅权限，请及时处理。</div>
      </div>
    </div>

    <!-- ===== Pill Tabs ===== -->
    <div class="pill-tabs">
      <button
        v-if="canViewAllRecords"
        class="pill-tab"
        :class="{ active: activeTab === 'borrow' }"
        @click="switchTab('borrow')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="tab-icon">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          <line x1="12" y1="6" x2="12" y2="13" />
          <line x1="9" y1="10" x2="15" y2="10" />
        </svg>
        借书
      </button>
      <button
        class="pill-tab"
        :class="{ active: activeTab === 'return' }"
        @click="switchTab('return')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="tab-icon">
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
        {{ canViewAllRecords ? '还书' : '当前借阅' }}
      </button>
      <button
        class="pill-tab"
        :class="{ active: activeTab === 'history' }"
        @click="switchTab('history')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="tab-icon">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
        {{ canViewAllRecords ? '借阅记录' : '历史记录' }}
      </button>
    </div>

    <!-- ===== Borrow Tab (admin / librarian only) ===== -->
    <div v-if="activeTab === 'borrow' && canViewAllRecords" class="tab-content borrow-tab">
      <div class="light-card borrow-card">
        <!-- Section Header -->
        <div class="section-header">
          <div class="section-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              <line x1="12" y1="6" x2="12" y2="13" />
              <line x1="9" y1="10" x2="15" y2="10" />
            </svg>
          </div>
          <div>
            <h3 class="section-title">图书借阅</h3>
            <p class="section-desc">搜索读者和图书，确认后完成借阅</p>
          </div>
        </div>

        <!-- Search Fields -->
        <div class="search-fields">
          <div class="field-group">
            <label class="field-label">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="field-label-icon">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              读者搜索
            </label>
            <div class="search-input-row">
              <el-input
                v-model="borrowForm.readerNo"
                placeholder="输入编号或姓名搜索"
                size="large"
                @keyup.enter="searchReader"
              >
                <template #prefix>
                  <el-icon><User /></el-icon>
                </template>
              </el-input>
              <button class="icon-btn" @click="searchReader">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>
            </div>
          </div>

          <div class="field-group">
            <label class="field-label">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="field-label-icon">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              图书搜索
            </label>
            <div class="search-input-row">
              <el-input
                v-model="borrowForm.bookIsbn"
                placeholder="输入ISBN或书名搜索"
                size="large"
                @keyup.enter="searchBook"
              >
                <template #prefix>
                  <el-icon><Reading /></el-icon>
                </template>
              </el-input>
              <button class="icon-btn" @click="searchBook">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Selected Info Display -->
        <div v-if="selectedReader || selectedBook" class="selected-panel">
          <div v-if="selectedReader" class="selected-item">
            <div class="selected-avatar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div class="selected-detail">
              <span class="selected-label">读者</span>
              <span class="selected-value">{{ selectedReader.name }}</span>
              <span class="pill-badge badge-blue">{{ selectedReader.reader_no }}</span>
            </div>
          </div>
          <div v-if="selectedBook" class="selected-item">
            <div class="selected-avatar book-avatar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <div class="selected-detail">
              <span class="selected-label">图书</span>
              <span class="selected-value">{{ selectedBook.title }}</span>
              <span class="pill-badge badge-purple">{{ selectedBook.isbn }}</span>
              <span class="pill-badge" :class="selectedBook.available_quantity > 0 ? 'badge-green' : 'badge-red'">
                库存: {{ selectedBook.available_quantity }} / {{ selectedBook.total_quantity }}
              </span>
            </div>
          </div>
        </div>

        <!-- Confirm Button -->
        <div class="borrow-action">
          <button
            class="gradient-btn"
            :class="{ loading: isBorrowing }"
            :disabled="isBorrowing"
            @click="handleBorrow"
          >
            <svg v-if="!isBorrowing" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span v-if="isBorrowing" class="spinner" />
            {{ isBorrowing ? '借书中...' : '确认借书' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ===== Return Tab ===== -->
    <div v-if="activeTab === 'return'" class="tab-content return-tab">
      <div class="light-card">
        <!-- Search Bar -->
        <div class="search-bar">
          <el-input
            v-model="returnSearchKeyword"
            placeholder="搜索读者编号/姓名、图书ISBN/书名..."
            size="large"
            clearable
            class="search-input"
            @keyup.enter="searchBorrowedBooks"
          >
            <template #prefix>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </template>
          </el-input>
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="-"
            start-placeholder="起始日期"
            end-placeholder="结束日期"
            size="large"
            clearable
            style="width: 280px"
            @change="searchBorrowedBooks"
          />
          <button class="icon-btn" @click="searchBorrowedBooks">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </div>

        <!-- Modern Table -->
        <div class="modern-table-wrap">
          <table class="modern-table">
            <thead>
              <tr>
                <th v-if="canViewAllRecords">读者</th>
                <th>图书</th>
                <th>借书日期</th>
                <th>应还日期</th>
                <th v-if="!canViewAllRecords">状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in borrowedBooks"
                :key="row.id"
                :class="{ 'overdue-row': isOverdue(row.due_date) }"
              >
                <td v-if="canViewAllRecords" class="td-reader">{{ row.reader_name }}</td>
                <td class="td-book">{{ row.book_title }}</td>
                <td class="td-date">{{ row.borrow_date }}</td>
                <td class="td-date">
                  <div class="due-cell">
                    <span v-if="isOverdue(row.due_date)" class="overdue-indicator">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    </span>
                    <span :class="isOverdue(row.due_date) ? 'text-danger' : ''">{{ row.due_date }}</span>
                  </div>
                </td>
                <td v-if="!canViewAllRecords">
                  <span v-if="isOverdue(row.due_date)" class="pill-badge badge-red">已逾期</span>
                  <span v-else class="pill-badge badge-green">借阅中</span>
                </td>
                <td class="td-actions">
                  <button
                    class="action-btn action-success"
                    :class="{ loading: returningBooks.has(row.id) }"
                    :disabled="returningBooks.has(row.id)"
                    @click="handleReturn(row)"
                  >
                    <span v-if="returningBooks.has(row.id)" class="spinner small" />
                    {{ returningBooks.has(row.id) ? '还书中' : '还书' }}
                  </button>
                  <button
                    v-if="!canViewAllRecords"
                    class="action-btn action-primary"
                    :disabled="isOverdue(row.due_date) || renewingBooks.has(row.id) || row.renewal_request_status === 'pending'"
                    :class="{ loading: renewingBooks.has(row.id) }"
                    @click="handleRenew(row)"
                  >
                    <span v-if="renewingBooks.has(row.id)" class="spinner small" />
                    {{ row.renewal_request_status === 'pending' ? '待审批' : (renewingBooks.has(row.id) ? '申请中' : '申请续借') }}
                  </button>
                </td>
              </tr>
              <tr v-if="borrowedBooks.length === 0">
                <td :colspan="canViewAllRecords ? 5 : 5" class="empty-row">
                  <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="empty-icon">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                    <span>暂无借阅记录</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ===== History Tab ===== -->
    <div v-if="activeTab === 'history'" class="tab-content history-tab">
      <div class="light-card">
        <div class="modern-table-wrap">
          <table class="modern-table">
            <thead>
              <tr>
                <th class="th-index">#</th>
                <th>读者</th>
                <th>图书</th>
                <th>借书日期</th>
                <th>还书日期</th>
                <th>状态</th>
                <th v-if="canViewAllRecords">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, idx) in allRecords"
                :key="row.id"
              >
                <td class="td-index">{{ idx + 1 }}</td>
                <td class="td-reader">{{ row.reader_name }}</td>
                <td class="td-book">{{ row.book_title }}</td>
                <td class="td-date">{{ row.borrow_date }}</td>
                <td class="td-date">{{ row.return_date || '-' }}</td>
                <td>
                  <span
                    class="pill-badge"
                    :class="{
                      'badge-warning': row.status === 'borrowed',
                      'badge-green': row.status === 'returned',
                      'badge-red': row.status === 'overdue',
                      'badge-blue': row.status === 'lost'
                    }"
                  >
                    {{ statusLabel(row.status) }}
                  </span>
                </td>
                <td v-if="canViewAllRecords" class="td-actions">
                  <button
                    class="action-btn action-danger"
                    :disabled="row.status !== 'returned'"
                    @click="handleDeleteRecord(row)"
                  >
                    删除
                  </button>
                </td>
              </tr>
              <tr v-if="allRecords.length === 0">
                <td :colspan="canViewAllRecords ? 7 : 6" class="empty-row">
                  <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="empty-icon">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <span>暂无历史记录</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ===== Reader Select Dialog ===== -->
    <el-dialog
      v-model="readerSelectDialogVisible"
      title="选择读者"
      width="600px"
      destroy-on-close
      class="modern-dialog"
    >
      <el-table
        :data="searchReaderResults"
        style="width: 100%"
        max-height="400px"
        class="custom-table"
      >
        <el-table-column prop="reader_no" label="编号" width="120" />
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="category_name" label="类型" width="100" />
        <el-table-column prop="phone" label="电话" />
        <el-table-column label="操作" width="80">
          <template #default="{ row }">
            <button class="action-btn action-primary" @click="handleSelectReader(row)">选择</button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- ===== Book Select Dialog ===== -->
    <el-dialog
      v-model="bookSelectDialogVisible"
      title="选择图书"
      width="800px"
      destroy-on-close
      class="modern-dialog"
    >
      <el-table
        :data="searchBookResults"
        style="width: 100%"
        max-height="400px"
        class="custom-table"
      >
        <el-table-column prop="isbn" label="ISBN" width="140" />
        <el-table-column prop="title" label="书名" />
        <el-table-column prop="author" label="作者" width="120" />
        <el-table-column label="库存" width="100">
          <template #default="{ row }">
            {{ row.available_quantity }} / {{ row.total_quantity }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80">
          <template #default="{ row }">
            <button class="action-btn action-primary" @click="handleSelectBook(row)">选择</button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { User, Reading } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/user'
import { readerApi } from '../api/reader.api'
import { bookApi } from '../api/book.api'
import { borrowingApi } from '../api/borrowing.api'

const userStore = useUserStore()
const borrowedBooks = ref<any[]>([])
const allRecords = ref<any[]>([])
const returnSearchKeyword = ref('')
const dateRange = ref<[Date, Date] | null>(null)
const overdueCount = ref(0)

// Loading states
const isBorrowing = ref(false)
const returningBooks = ref(new Set<number>())
const renewingBooks = ref(new Set<number>())

// Role permissions
const userRole = computed(() => userStore.user?.role || '')
const isAdmin = computed(() => userRole.value === 'admin')
const isLibrarian = computed(() => userRole.value === 'librarian')
const canViewAllRecords = computed(() => isAdmin.value || isLibrarian.value)
const currentUserName = computed(() => userStore.user?.name || '')

// Tabs
const activeTab = ref(canViewAllRecords.value ? 'borrow' : 'return')

const pageTitle = computed(() => {
  return canViewAllRecords.value ? '借还管理' : '我的借还'
})

const pageDescription = computed(() => {
  return canViewAllRecords.value ? '处理图书借阅和归还' : '管理我的借阅记录'
})

const borrowForm = reactive({
  readerNo: '',
  bookIsbn: ''
})

// Search result dialogs
const readerSelectDialogVisible = ref(false)
const bookSelectDialogVisible = ref(false)
const searchReaderResults = ref<any[]>([])
const searchBookResults = ref<any[]>([])
const selectedReader = ref<any>(null)
const selectedBook = ref<any>(null)

// Status label helper
const statusLabel = (status: string) => {
  switch (status) {
    case 'borrowed': return '借阅中'
    case 'returned': return '已归还'
    case 'overdue': return '逾期'
    case 'lost': return '丢失'
    default: return status
  }
}

// Filter records: teacher / student can only see their own
const filterRecordsByUser = (records: any[]) => {
  if (canViewAllRecords.value) {
    return records
  }
  return records.filter((record: any) =>
    record.reader_name && currentUserName.value &&
    (record.reader_name.includes(currentUserName.value) ||
     currentUserName.value.includes(record.reader_name))
  )
}

// Switch tab
const switchTab = (name: string) => {
  activeTab.value = name
  handleTabChange(name)
}

// Search reader
const searchReader = async () => {
  if (!borrowForm.readerNo) {
    ElMessage.warning('请输入读者编号或姓名')
    return
  }

  const result = await readerApi.search(borrowForm.readerNo)
  if (result.success && result.data.length > 0) {
    if (result.data.length === 1) {
      selectedReader.value = result.data[0]
      ElMessage.success(`找到读者：${result.data[0].name}`)
    } else {
      searchReaderResults.value = result.data
      readerSelectDialogVisible.value = true
    }
  } else {
    ElMessage.warning('未找到匹配的读者')
  }
}

// Select reader from dialog
const handleSelectReader = (reader: any) => {
  selectedReader.value = reader
  readerSelectDialogVisible.value = false
  ElMessage.success(`已选择读者：${reader.name}`)
}

// Search book
const searchBook = async () => {
  if (!borrowForm.bookIsbn) {
    ElMessage.warning('请输入图书ISBN或书名')
    return
  }

  const result = await bookApi.getAll({ keyword: borrowForm.bookIsbn })
  if (result.success && result.data.length > 0) {
    if (result.data.length === 1) {
      selectedBook.value = result.data[0]
      ElMessage.success(`找到图书：${result.data[0].title}`)
    } else {
      searchBookResults.value = result.data
      bookSelectDialogVisible.value = true
    }
  } else {
    ElMessage.warning('未找到匹配的图书')
  }
}

// Select book from dialog
const handleSelectBook = (book: any) => {
  selectedBook.value = book
  bookSelectDialogVisible.value = false
  ElMessage.success(`已选择图书：${book.title}`)
}

// Borrow operation
const handleBorrow = async () => {
  if (!selectedReader.value) {
    ElMessage.warning('请先选择读者（输入编号或姓名后点击搜索）')
    return
  }

  if (!selectedBook.value) {
    ElMessage.warning('请先选择图书（输入ISBN或书名后点击搜索）')
    return
  }

  if (selectedBook.value.available_quantity <= 0) {
    ElMessage.error('该图书暂时无可借库存，请选择其他图书')
    return
  }

  isBorrowing.value = true

  try {
    const borrowResult = await borrowingApi.borrow(selectedReader.value.id, selectedBook.value.id)

    if (borrowResult.success) {
      ElMessage.success('借阅成功！')
      borrowForm.readerNo = ''
      borrowForm.bookIsbn = ''
      selectedReader.value = null
      selectedBook.value = null
      await searchBorrowedBooks()
    } else {
      const errorMsg = borrowResult.error?.message || '借阅失败'
      if (errorMsg.includes('暂无可借图书')) {
        ElMessage.error('该图书暂时无可借库存，请稍后再试')
      } else if (errorMsg.includes('已达到最大借阅数量')) {
        ElMessage.error('该读者已达到最大借阅数量，请先归还部分图书')
      } else if (errorMsg.includes('逾期未还')) {
        ElMessage.error('该读者有图书逾期未还，请先归还逾期图书')
      } else {
        ElMessage.error(errorMsg)
      }
    }
  } catch (error: any) {
    const msg = error?.response?.data?.error?.message || error?.message || '借阅操作失败，请重试'
    ElMessage.error(msg)
  } finally {
    isBorrowing.value = false
  }
}

// Return operation
const handleReturn = async (row: any) => {
  const bookId = row.id
  returningBooks.value.add(bookId)

  try {
    const result = await borrowingApi.return(bookId)
    if (result.success) {
      ElMessage.success('还书成功！')
      searchBorrowedBooks()
    } else {
      ElMessage.error(result.error?.message || '还书失败')
    }
  } catch (error) {
    console.error('还书操作失败:', error)
  } finally {
    returningBooks.value.delete(bookId)
  }
}

// Renew operation
const handleRenew = async (row: any) => {
  const bookId = row.id
  renewingBooks.value.add(bookId)

  try {
    const result = await borrowingApi.requestRenewal(bookId)
    if (result.success) {
      window.dispatchEvent(new Event('notifications:refresh'))
      ElMessage.success('续借申请已提交，等待管理员审批')
      await searchBorrowedBooks()
    } else {
      ElMessage.error(result.error?.message || '续借申请失败')
    }
  } catch (error) {
    console.error('续借申请失败:', error)
  } finally {
    renewingBooks.value.delete(bookId)
  }
}

const buildSearchParams = (status?: string) => {
  const searchParams: Record<string, string> = {}

  if (status) {
    searchParams.status = status
  }
  if (returnSearchKeyword.value) {
    searchParams.keyword = returnSearchKeyword.value
  }
  if (dateRange.value && dateRange.value.length === 2) {
    searchParams.borrow_date_from = dateRange.value[0].toISOString().split('T')[0]
    searchParams.borrow_date_to = dateRange.value[1].toISOString().split('T')[0]
  }

  return searchParams
}

// Search borrowed books (return tab)
const searchBorrowedBooks = async () => {
  const searchParams = buildSearchParams('borrowed')
  const result = canViewAllRecords.value
    ? await borrowingApi.getAll(searchParams)
    : await borrowingApi.getMy(searchParams)

  if (result.success) {
    borrowedBooks.value = canViewAllRecords.value ? result.data : result.data.items
    if (!canViewAllRecords.value) {
      overdueCount.value = borrowedBooks.value.filter((r: any) => isOverdue(r.due_date)).length
    }
  }
}

// Check if overdue
const isOverdue = (dueDate: string) => {
  return new Date(dueDate) < new Date()
}

// Load all records (history tab)
const loadAllRecords = async () => {
  const searchParams = buildSearchParams()
  const result = canViewAllRecords.value
    ? await borrowingApi.getAll(searchParams)
    : await borrowingApi.getMy(searchParams)

  if (result.success) {
    allRecords.value = canViewAllRecords.value ? result.data : result.data.items
  }
}

// Tab change handler
const handleTabChange = (name: string) => {
  if (name === 'return') {
    searchBorrowedBooks()
  } else if (name === 'history') {
    loadAllRecords()
  }
}

// Delete record
const handleDeleteRecord = async (row: any) => {
  if (row.status !== 'returned') {
    ElMessage.warning('只能删除已归还的借阅记录')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除这条借阅记录吗？\n读者：${row.reader_name}\n图书：${row.book_title}`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const result = await borrowingApi.delete(row.id)
    if (result.success) {
      ElMessage.success('删除成功')
      loadAllRecords()
    } else {
      ElMessage.error(result.error?.message || '删除失败')
    }
  } catch (error: any) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

const handleNotificationRefresh = () => {
  searchBorrowedBooks()
  loadAllRecords()
}

onMounted(() => {
  searchBorrowedBooks()
  window.addEventListener('notifications:refresh', handleNotificationRefresh)
})

onUnmounted(() => {
  window.removeEventListener('notifications:refresh', handleNotificationRefresh)
})
</script>

<style scoped>
/* ===== Page Container ===== */
.borrowing-page {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* ===== Page Header ===== */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.header-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--gradient-brand);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.header-icon svg {
  width: 22px;
  height: 22px;
  color: #fff;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
  letter-spacing: -0.3px;
}

.header-bar {
  width: 32px;
  height: 3px;
  background: var(--gradient-brand);
  border-radius: 2px;
  margin-top: 3px;
}

.page-sub {
  font-size: 13px;
  color: var(--text-muted);
  margin: 4px 0 0;
}

/* ===== Overdue Warning Banner ===== */
.overdue-banner {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 20px;
  background: var(--danger-tint);
  border: 1px solid rgba(220, 38, 38, 0.18);
  border-radius: var(--radius-btn);
  animation: slideIn 0.35s ease-out;
}

.banner-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(220, 38, 38, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.banner-icon svg {
  width: 20px;
  height: 20px;
  color: var(--danger);
}

.banner-title {
  font-size: 14px;
  font-weight: 600;
  color: #991B1B;
}

.banner-desc {
  font-size: 12px;
  color: #B91C1C;
  margin-top: 2px;
}

/* ===== Pill Tabs ===== */
.pill-tabs {
  display: flex;
  gap: 6px;
  background: var(--bg-card);
  border: 1px solid var(--border-medium);
  border-radius: 14px;
  padding: 5px;
  box-shadow: var(--shadow-sm);
  width: fit-content;
}

.pill-tab {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 20px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s ease;
  font-family: var(--font-sans);
  white-space: nowrap;
}

.tab-icon {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}

.pill-tab:hover {
  color: var(--text-main);
  background: var(--bg-page);
}

.pill-tab.active {
  background: var(--gradient-brand);
  color: #fff;
  box-shadow: 0 3px 12px rgba(200, 16, 46, 0.25);
}

.pill-tab.active svg {
  color: #fff;
}

/* ===== Tab Content ===== */
.tab-content {
  animation: fadeInUp 0.35s ease-out;
}

/* ===== Light Card — Glassmorphism ===== */
.light-card {
  background: rgba(255,255,255,0.42);
  backdrop-filter: blur(18px) saturate(180%);
  -webkit-backdrop-filter: blur(18px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.40);
  border-radius: var(--radius-card);
  padding: 24px;
  box-shadow: var(--shadow-glass);
  transition: all 0.3s ease;
}
.light-card:hover {
  box-shadow: 0 8px 28px rgba(28,16,51,0.10);
  border-color: rgba(200,16,46,0.08);
}

/* ===== Borrow Tab ===== */
.section-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-light);
}

.section-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: var(--gradient-brand);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.section-icon svg {
  width: 22px;
  height: 22px;
  color: #fff;
}

.section-title {
  margin: 0 0 3px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-main);
}

.section-desc {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted);
}

/* Search Fields */
.search-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
}

.field-label-icon {
  width: 14px;
  height: 14px;
  color: var(--gdut-red);
}

.search-input-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.search-input-row .el-input {
  flex: 1;
}

/* Icon Button */
.icon-btn {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-input);
  border: 1px solid var(--border-medium);
  background: var(--bg-card);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.icon-btn svg {
  width: 16px;
  height: 16px;
  color: var(--text-secondary);
}

.icon-btn:hover {
  background: var(--gradient-brand);
  border-color: transparent;
  box-shadow: 0 3px 12px rgba(200, 16, 46, 0.2);
}

.icon-btn:hover svg {
  color: #fff;
}

/* Selected Info Panel */
.selected-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 20px;
  background: var(--bg-page);
  border: 1px dashed var(--border-medium);
  border-radius: 14px;
  margin-bottom: 20px;
}

.selected-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selected-avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(200, 16, 46, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.selected-avatar svg {
  width: 18px;
  height: 18px;
  color: var(--gdut-red);
}

.selected-avatar.book-avatar {
  background: rgba(124, 58, 237, 0.08);
}

.selected-avatar.book-avatar svg {
  color: var(--gdut-purple);
}

.selected-detail {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.selected-label {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 500;
}

.selected-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
}

/* Pill Badges */
.pill-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.2px;
}

.badge-green {
  background: var(--success-tint);
  color: var(--success);
}

.badge-red {
  background: var(--danger-tint);
  color: var(--danger);
}

.badge-blue {
  background: var(--info-tint);
  color: var(--info);
}

.badge-purple {
  background: var(--gdut-purple-tint);
  color: var(--gdut-purple);
}

.badge-warning {
  background: var(--warning-tint);
  color: var(--warning);
}

/* Borrow Action */
.borrow-action {
  display: flex;
  justify-content: flex-end;
}

/* Gradient Button */
.gradient-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 32px;
  border: none;
  border-radius: var(--radius-btn);
  background: var(--gradient-brand);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 4px 14px rgba(200, 16, 46, 0.25);
  font-family: var(--font-sans);
}

.gradient-btn svg {
  width: 16px;
  height: 16px;
}

.gradient-btn:hover:not(:disabled) {
  box-shadow: 0 6px 20px rgba(200, 16, 46, 0.35);
  transform: translateY(-1px);
}

.gradient-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.gradient-btn.loading {
  pointer-events: none;
}

/* ===== Search Bar (Return tab) ===== */
.search-bar {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 20px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--border-light);
}

.search-bar .search-input {
  flex: 1;
  min-width: 240px;
}

/* ===== Modern Table ===== */
.modern-table-wrap {
  overflow-x: auto;
}

.modern-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.modern-table thead th {
  text-align: left;
  padding: 12px 16px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--border-light);
  background: var(--bg-page);
  white-space: nowrap;
}

.modern-table thead th:first-child {
  border-radius: 10px 0 0 0;
}

.modern-table thead th:last-child {
  border-radius: 0 10px 0 0;
}

.modern-table tbody td {
  padding: 14px 16px;
  font-size: 13px;
  color: var(--text-main);
  border-bottom: 1px solid var(--border-light);
  vertical-align: middle;
  transition: background 0.15s;
}

.modern-table tbody tr:hover td {
  background: var(--bg-page);
}

.modern-table tbody tr:last-child td {
  border-bottom: none;
}

/* Overdue row highlight */
.modern-table tbody tr.overdue-row td {
  background: rgba(220, 38, 38, 0.03);
}

.modern-table tbody tr.overdue-row:hover td {
  background: rgba(220, 38, 38, 0.06);
}

/* Table cell styles */
.th-index { width: 50px; }
.td-index {
  width: 50px;
  color: var(--text-muted);
  font-size: 12px;
}

.td-reader { font-weight: 500; }
.td-book { font-weight: 500; }
.td-date {
  font-size: 12px;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

.due-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.overdue-indicator {
  display: flex;
  align-items: center;
}

.overdue-indicator svg {
  width: 14px;
  height: 14px;
  color: var(--danger);
}

.text-danger {
  color: var(--danger) !important;
  font-weight: 600;
}

.td-actions {
  display: flex;
  gap: 6px;
  align-items: center;
}

/* Action Buttons */
.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 14px;
  border: 1px solid transparent;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: var(--font-sans);
  white-space: nowrap;
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.action-success {
  background: var(--success-tint);
  color: var(--success);
  border-color: rgba(5, 150, 105, 0.15);
}

.action-success:hover:not(:disabled) {
  background: var(--success);
  color: #fff;
  box-shadow: 0 2px 8px rgba(5, 150, 105, 0.25);
}

.action-primary {
  background: var(--info-tint);
  color: var(--info);
  border-color: rgba(14, 165, 233, 0.15);
}

.action-primary:hover:not(:disabled) {
  background: var(--gdut-red);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 2px 8px rgba(200, 16, 46, 0.2);
}

.action-danger {
  background: var(--danger-tint);
  color: var(--danger);
  border-color: rgba(220, 38, 38, 0.12);
}

.action-danger:hover:not(:disabled) {
  background: var(--danger);
  color: #fff;
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.25);
}

/* Empty State */
.empty-row {
  padding: 40px 0 !important;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: var(--text-muted);
  font-size: 13px;
  padding: 20px 0;
}

.empty-icon {
  width: 40px;
  height: 40px;
  opacity: 0.3;
}

/* ===== Spinner ===== */
.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.spinner.small {
  width: 10px;
  height: 10px;
  border-width: 1.5px;
}

.gradient-btn .spinner {
  border-color: rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
}

.action-btn .spinner {
  border-color: rgba(0, 0, 0, 0.15);
  border-top-color: currentColor;
}

/* ===== Animations ===== */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(-10px); }
  to   { opacity: 1; transform: translateX(0); }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ===== Dialog Override ===== */
:deep(.modern-dialog .el-dialog) {
  border-radius: var(--radius-card);
  overflow: hidden;
}

:deep(.modern-dialog .el-dialog__header) {
  border-bottom: 1px solid var(--border-light);
  padding: 16px 20px;
}

:deep(.modern-dialog .el-dialog__title) {
  font-weight: 600;
  font-size: 15px;
  color: var(--text-main);
}

:deep(.modern-dialog .el-dialog__body) {
  padding: 16px 20px;
}

/* ===== Element Plus Input Override ===== */
:deep(.el-input__wrapper) {
  border-radius: var(--radius-input);
}

:deep(.el-date-editor) {
  --el-date-editor-datetimerange-width: 280px;
}

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .search-fields {
    grid-template-columns: 1fr;
  }

  .pill-tabs {
    width: 100%;
  }

  .pill-tab {
    flex: 1;
    justify-content: center;
    padding: 9px 12px;
    font-size: 12px;
  }

  .search-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .search-bar .search-input {
    min-width: unset;
  }
}
</style>
