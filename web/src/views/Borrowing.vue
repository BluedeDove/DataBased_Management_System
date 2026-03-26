<template>
  <div class="page-container">
    <div class="page-header">
      <div class="title-container">
        <h1 class="page-title">
          {{ pageTitle }}
        </h1>
        <div class="gdut-bar" />
      </div>
      <p class="page-description">
        {{ pageDescription }}
      </p>
    </div>

    <!-- 逾期警告横幅（教师/学生） -->
    <el-alert
      v-if="!canViewAllRecords && overdueCount > 0"
      type="error"
      :title="`您有 ${overdueCount} 本图书已逾期，请尽快归还！`"
      :closable="false"
      show-icon
      class="alert-banner"
    >
      <template #default>
        <div class="alert-content">
          逾期图书可能会影响您的信用记录和借阅权限，请及时处理。
        </div>
      </template>
    </el-alert>

    <el-tabs
      v-model="activeTab"
      class="custom-tabs"
      @tab-change="handleTabChange"
    >
      <!-- 借书标签页：仅管理员和图书管理员可见 -->
      <el-tab-pane
        v-if="canViewAllRecords"
        name="borrow"
      >
        <template #label>
          <span class="tab-label">
            <el-icon><Notebook /></el-icon>
            借书
          </span>
        </template>
        <div class="glass-card borrow-section">
          <div class="section-header">
            <div class="icon-box primary">
              <el-icon><Notebook /></el-icon>
            </div>
            <div class="header-text">
              <h3>图书借阅</h3>
              <p>扫描或输入读者编号和图书ISBN进行借阅</p>
            </div>
          </div>
          <el-form
            :inline="true"
            :model="borrowForm"
            label-width="100px"
            class="borrow-form"
          >
            <el-form-item label="读者">
              <el-input
                v-model="borrowForm.readerNo"
                placeholder="输入编号或姓名搜索"
                style="width: 240px"
                size="large"
                @keyup.enter="searchReader"
              >
                <template #prefix>
                  <el-icon><User /></el-icon>
                </template>
                <template #append>
                  <el-button
                    :icon="Search"
                    @click="searchReader"
                  >
                    搜索
                  </el-button>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item label="图书">
              <el-input
                v-model="borrowForm.bookIsbn"
                placeholder="输入ISBN或书名搜索"
                style="width: 240px"
                size="large"
                @keyup.enter="searchBook"
              >
                <template #prefix>
                  <el-icon><Reading /></el-icon>
                </template>
                <template #append>
                  <el-button
                    :icon="Search"
                    @click="searchBook"
                  >
                    搜索
                  </el-button>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item>
              <el-button
                type="primary"
                :loading="isBorrowing"
                :disabled="isBorrowing"
                size="large"
                class="borrow-btn"
                @click="handleBorrow"
              >
                <template v-if="isBorrowing">
                  <el-icon class="is-loading">
                    <Loading />
                  </el-icon>
                  借书中...
                </template>
                <template v-else>
                  <el-icon><Check /></el-icon>
                  确认借书
                </template>
              </el-button>
            </el-form-item>
          </el-form>

          <!-- 已选择的读者和图书信息显示 -->
          <div
            v-if="selectedReader || selectedBook"
            class="selected-info"
          >
            <div
              v-if="selectedReader"
              class="info-item"
            >
              <span class="label">读者：</span>
              <span class="value">{{ selectedReader.name }} ({{ selectedReader.reader_no }})</span>
            </div>
            <div
              v-if="selectedBook"
              class="info-item"
            >
              <span class="label">图书：</span>
              <span class="value">{{ selectedBook.title }} ({{ selectedBook.isbn }})</span>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane name="return">
        <template #label>
          <span class="tab-label">
            <el-icon><RefreshRight /></el-icon>
            还书
          </span>
        </template>
        <div class="glass-card return-section">
          <div class="search-bar">
            <el-input
              v-model="returnSearchKeyword"
              placeholder="搜索读者编号/姓名、图书ISBN/书名..."
              style="width: 320px"
              size="large"
              clearable
              @keyup.enter="searchBorrowedBooks"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
              <template #append>
                <el-button
                  :icon="Search"
                  @click="searchBorrowedBooks"
                >
                  搜索
                </el-button>
              </template>
            </el-input>
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="借书起始日期"
              end-placeholder="借书结束日期"
              size="large"
              clearable
              @change="searchBorrowedBooks"
            />
          </div>

          <el-table
            :data="borrowedBooks"
            style="width: 100%"
            :row-class-name="getRowClassName"
            class="custom-table"
          >
            <el-table-column
              v-if="canViewAllRecords"
              prop="reader_name"
              label="读者"
              width="120"
            />
            <el-table-column
              prop="book_title"
              label="图书"
            />
            <el-table-column
              prop="borrow_date"
              label="借书日期"
              width="110"
            />
            <el-table-column
              prop="due_date"
              label="应还日期"
              width="110"
            >
              <template #default="{ row }">
                <div style="display: flex; align-items: center; gap: 6px">
                  <el-icon
                    v-if="isOverdue(row.due_date)"
                    color="#f56c6c"
                    :size="16"
                  >
                    <WarningFilled />
                  </el-icon>
                  <span
                    :style="{
                      color: isOverdue(row.due_date) ? '#f56c6c' : '#303133',
                      fontWeight: isOverdue(row.due_date) ? '600' : '400'
                    }"
                  >
                    {{ row.due_date }}
                  </span>
                </div>
              </template>
            </el-table-column>
            <el-table-column
              v-if="!canViewAllRecords"
              label="状态"
              width="100"
            >
              <template #default="{ row }">
                <el-tag
                  v-if="isOverdue(row.due_date)"
                  type="danger"
                  effect="dark"
                >
                  已逾期
                </el-tag>
                <el-tag
                  v-else
                  type="success"
                >
                  借阅中
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              label="操作"
              width="200"
            >
              <template #default="{ row }">
                <el-button
                  type="success"
                  link
                  :loading="returningBooks.has(row.id)"
                  :disabled="returningBooks.has(row.id)"
                  @click="handleReturn(row)"
                >
                  <template v-if="returningBooks.has(row.id)">
                    <el-icon><Loading /></el-icon>
                    还书中...
                  </template>
                  <template v-else>
                    还书
                  </template>
                </el-button>
                <el-button
                  type="primary"
                  link
                  :disabled="isOverdue(row.due_date) || renewingBooks.has(row.id)"
                  :loading="renewingBooks.has(row.id)"
                  @click="handleRenew(row)"
                >
                  <template v-if="renewingBooks.has(row.id)">
                    <el-icon><Loading /></el-icon>
                    续借中...
                  </template>
                  <template v-else>
                    续借
                  </template>
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane name="history">
        <template #label>
          <span class="tab-label">
            <el-icon><Document /></el-icon>
            借阅记录
          </span>
        </template>
        <div class="glass-card history-section">
          <el-table
            :data="allRecords"
            style="width: 100%"
            class="custom-table"
          >
            <el-table-column
              type="index"
              label="#"
              width="60"
            />
            <el-table-column
              prop="reader_name"
              label="读者"
              width="120"
            />
            <el-table-column
              prop="book_title"
              label="图书"
            />
            <el-table-column
              prop="borrow_date"
              label="借书日期"
              width="110"
            />
            <el-table-column
              prop="return_date"
              label="还书日期"
              width="110"
            />
            <el-table-column
              label="状态"
              width="100"
            >
              <template #default="{ row }">
                <el-tag
                  v-if="row.status === 'borrowed'"
                  type="warning"
                >
                  借阅中
                </el-tag>
                <el-tag
                  v-else-if="row.status === 'returned'"
                  type="success"
                >
                  已归还
                </el-tag>
                <el-tag
                  v-else-if="row.status === 'overdue'"
                  type="danger"
                >
                  逾期
                </el-tag>
                <el-tag
                  v-else
                  type="info"
                >
                  丢失
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              label="操作"
              width="120"
            >
              <template #default="{ row }">
                <el-button
                  type="danger"
                  link
                  size="small"
                  :disabled="row.status !== 'returned'"
                  @click="handleDeleteRecord(row)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 读者选择对话框 -->
    <el-dialog
      v-model="readerSelectDialogVisible"
      title="选择读者"
      width="600px"
      destroy-on-close
    >
      <el-table
        :data="searchReaderResults"
        style="width: 100%"
        max-height="400px"
      >
        <el-table-column
          prop="reader_no"
          label="编号"
          width="120"
        />
        <el-table-column
          prop="name"
          label="姓名"
          width="120"
        />
        <el-table-column
          prop="category_name"
          label="类型"
          width="100"
        />
        <el-table-column
          prop="phone"
          label="电话"
        />
        <el-table-column
          label="操作"
          width="80"
        >
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              @click="handleSelectReader(row)"
            >
              选择
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- 图书选择对话框 -->
    <el-dialog
      v-model="bookSelectDialogVisible"
      title="选择图书"
      width="800px"
      destroy-on-close
    >
      <el-table
        :data="searchBookResults"
        style="width: 100%"
        max-height="400px"
      >
        <el-table-column
          prop="isbn"
          label="ISBN"
          width="140"
        />
        <el-table-column
          prop="title"
          label="书名"
        />
        <el-table-column
          prop="author"
          label="作者"
          width="120"
        />
        <el-table-column
          label="库存"
          width="100"
        >
          <template #default="{ row }">
            {{ row.available_quantity }} / {{ row.total_quantity }}
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="80"
        >
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              @click="handleSelectBook(row)"
            >
              选择
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Loading, WarningFilled, Notebook, User, Reading, Check, RefreshRight, Document } from '@element-plus/icons-vue'
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

// 加载状态
const isBorrowing = ref(false)
const returningBooks = ref(new Set<number>())
const renewingBooks = ref(new Set<number>())

// 角色权限相关
const userRole = computed(() => userStore.user?.role || '')
const isAdmin = computed(() => userRole.value === 'admin')
const isLibrarian = computed(() => userRole.value === 'librarian')
const canViewAllRecords = computed(() => isAdmin.value || isLibrarian.value)
const currentUserName = computed(() => userStore.user?.name || '')

// 根据角色设置默认标签页和页面信息
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

// 搜索结果选择对话框
const readerSelectDialogVisible = ref(false)
const bookSelectDialogVisible = ref(false)
const searchReaderResults = ref<any[]>([])
const searchBookResults = ref<any[]>([])
const selectedReader = ref<any>(null)
const selectedBook = ref<any>(null)

// 过滤记录：教师和学生只能看到自己的记录
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

// 搜索读者
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

// 选择读者
const handleSelectReader = (reader: any) => {
  selectedReader.value = reader
  readerSelectDialogVisible.value = false
  ElMessage.success(`已选择读者：${reader.name}`)
}

// 搜索图书
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

// 选择图书
const handleSelectBook = (book: any) => {
  selectedBook.value = book
  bookSelectDialogVisible.value = false
  ElMessage.success(`已选择图书：${book.title}`)
}

// 借书操作
const handleBorrow = async () => {
  if (!selectedReader.value) {
    ElMessage.warning('请先选择读者（输入编号或姓名后点击搜索图标）')
    return
  }

  if (!selectedBook.value) {
    ElMessage.warning('请先选择图书（输入ISBN或书名后点击搜索图标）')
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
        ElMessage.error(`该读者已达到最大借阅数量，请先归还部分图书`)
      } else if (errorMsg.includes('逾期未还')) {
        ElMessage.error('该读者有图书逾期未还，请先归还逾期图书')
      } else {
        ElMessage.error(errorMsg)
      }
    }
  } catch (error) {
    ElMessage.error('借阅操作失败，请重试')
  } finally {
    isBorrowing.value = false
  }
}

// 还书操作
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

// 续借操作
const handleRenew = async (row: any) => {
  const bookId = row.id
  renewingBooks.value.add(bookId)

  try {
    const result = await borrowingApi.renew(bookId)
    if (result.success) {
      ElMessage.success('续借成功！')
      searchBorrowedBooks()
    } else {
      ElMessage.error(result.error?.message || '续借失败')
    }
  } catch (error) {
    console.error('续借操作失败:', error)
  } finally {
    renewingBooks.value.delete(bookId)
  }
}

const searchBorrowedBooks = async () => {
  const searchParams: any = {
    status: 'borrowed'
  }

  if (returnSearchKeyword.value) {
    searchParams.keyword = returnSearchKeyword.value
  }

  if (dateRange.value && dateRange.value.length === 2) {
    searchParams.borrow_date_from = dateRange.value[0].toISOString().split('T')[0]
    searchParams.borrow_date_to = dateRange.value[1].toISOString().split('T')[0]
  }

  const result = await borrowingApi.getAll(searchParams)
  if (result.success) {
    borrowedBooks.value = filterRecordsByUser(result.data)

    if (!canViewAllRecords.value) {
      overdueCount.value = borrowedBooks.value.filter((r: any) => isOverdue(r.due_date)).length
    }
  }
}

const isOverdue = (dueDate: string) => {
  return new Date(dueDate) < new Date()
}

const getRowClassName = ({ row }: { row: any }) => {
  if (isOverdue(row.due_date)) {
    return 'overdue-row'
  }
  return ''
}

const loadAllRecords = async () => {
  const searchParams: any = {}

  if (returnSearchKeyword.value) {
    searchParams.keyword = returnSearchKeyword.value
  }

  if (dateRange.value && dateRange.value.length === 2) {
    searchParams.borrow_date_from = dateRange.value[0].toISOString().split('T')[0]
    searchParams.borrow_date_to = dateRange.value[1].toISOString().split('T')[0]
  }

  const result = await borrowingApi.getAll(searchParams)
  if (result.success) {
    allRecords.value = filterRecordsByUser(result.data)
  }
}

const handleTabChange = (name: string) => {
  if (name === 'return') {
    searchBorrowedBooks()
  } else if (name === 'history') {
    loadAllRecords()
  }
}

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

onMounted(() => {
  searchBorrowedBooks()
})
</script>

<style scoped>
.title-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.gdut-bar {
  width: 3px;
  height: 24px;
  background: linear-gradient(180deg, var(--gdut-red), var(--gdut-blue));
  border-radius: 2px;
}

.alert-banner {
  margin-bottom: 20px;
  border-radius: 12px;
}

.alert-content {
  margin-top: 8px;
  font-size: 14px;
  color: #7f1d1d;
}

.custom-tabs {
  background: transparent;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
}

.borrow-section {
  padding: 32px;
  animation: fadeInUp 0.4s ease-out;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.header-text h3 {
  margin: 0 0 6px 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-main);
}

.header-text p {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.borrow-form {
  display: flex;
  align-items: flex-end;
  gap: 20px;
  flex-wrap: wrap;
}

.borrow-btn {
  min-width: 140px;
  height: 40px;
  font-size: 15px;
  font-weight: 600;
}

.selected-info {
  margin-top: 20px;
  padding: 16px;
  background: rgba(99, 102, 241, 0.05);
  border-radius: 8px;
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.info-item {
  display: flex;
  gap: 8px;
}

.info-item .label {
  font-weight: 600;
  color: #6366f1;
}

.info-item .value {
  color: #1f2937;
}

.return-section {
  padding: 24px;
  animation: fadeInUp 0.4s ease-out;
}

.search-bar {
  margin-bottom: 20px;
  display: flex;
  gap: 12px;
  align-items: center;
}

.history-section {
  padding: 24px;
  animation: fadeInUp 0.4s ease-out;
}

:deep(.overdue-row) {
  background: linear-gradient(90deg, rgba(239, 68, 68, 0.05), rgba(239, 68, 68, 0.02)) !important;
}

:deep(.overdue-row:hover) {
  background: linear-gradient(90deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05)) !important;
}

:deep(.el-button--text) {
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.2s ease;
}

:deep(.el-button--text:hover) {
  background: rgba(99, 102, 241, 0.1);
}

:deep(.el-tag) {
  font-weight: 600;
  letter-spacing: 0.5px;
}

:deep(.is-loading) {
  animation: rotate 1s linear infinite;
}
</style>
