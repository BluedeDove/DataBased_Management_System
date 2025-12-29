<template>
  <div class="page-container">
    <div class="page-header">
      <div class="title-container">
        <h1 class="page-title">{{ pageTitle }}</h1>
        <div class="gdut-bar"></div>
      </div>
      <p class="page-description">{{ pageDescription }}</p>
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

    <el-tabs v-model="activeTab" @tab-change="handleTabChange" class="custom-tabs">
      <!-- 借书标签页：仅管理员和图书管理员可见 -->
      <el-tab-pane v-if="canViewAllRecords" name="borrow">
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
          <el-form :inline="true" :model="borrowForm" label-width="100px" class="borrow-form">
            <el-form-item label="读者">
              <el-input
                v-model="borrowForm.readerNo"
                placeholder="输入编号或姓名搜索"
                style="width: 240px"
                size="large"
                @keyup.enter="searchReader"
              >
                <template #prefix><el-icon><User /></el-icon></template>
                <template #append>
                  <el-button :icon="Search" @click="searchReader">搜索</el-button>
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
                <template #prefix><el-icon><Reading /></el-icon></template>
                <template #append>
                  <el-button :icon="Search" @click="searchBook">搜索</el-button>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item>
              <el-button
                type="primary"
                @click="handleBorrow"
                :loading="isBorrowing"
                :disabled="isBorrowing"
                size="large"
                class="borrow-btn"
              >
                <template v-if="isBorrowing">
                  <el-icon class="is-loading"><Loading /></el-icon>
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
          <div v-if="selectedReader || selectedBook" class="selected-info">
            <div v-if="selectedReader" class="info-item">
              <span class="label">读者：</span>
              <span class="value">{{ selectedReader.name }} ({{ selectedReader.reader_no }})</span>
            </div>
            <div v-if="selectedBook" class="info-item">
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
              @keyup.enter="searchBorrowedBooks"
              size="large"
              clearable
            >
              <template #prefix><el-icon><Search /></el-icon></template>
              <template #append>
                <el-button :icon="Search" @click="searchBorrowedBooks">搜索</el-button>
              </template>
            </el-input>
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="借书起始日期"
              end-placeholder="借书结束日期"
              size="large"
              @change="searchBorrowedBooks"
              clearable
            />
          </div>

          <el-table
            :data="borrowedBooks"
            style="width: 100%"
            :row-class-name="getRowClassName"
            class="custom-table"
          >
            <el-table-column v-if="canViewAllRecords" prop="reader_name" label="读者" width="120" />
            <el-table-column prop="book_title" label="图书" />
            <el-table-column prop="borrow_date" label="借书日期" width="110" />
            <el-table-column prop="due_date" label="应还日期" width="110">
              <template #default="{ row }">
                <div style="display: flex; align-items: center; gap: 6px">
                  <el-icon v-if="isOverdue(row.due_date)" color="#f56c6c" :size="16">
                    <WarningFilled />
                  </el-icon>
                  <span :style="{
                    color: isOverdue(row.due_date) ? '#f56c6c' : '#303133',
                    fontWeight: isOverdue(row.due_date) ? '600' : '400'
                  }">
                    {{ row.due_date }}
                  </span>
                </div>
              </template>
            </el-table-column>
            <el-table-column v-if="!canViewAllRecords" label="状态" width="100">
              <template #default="{ row }">
                <el-tag v-if="isOverdue(row.due_date)" type="danger" effect="dark">
                  已逾期
                </el-tag>
                <el-tag v-else type="success">
                  借阅中
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200">
              <template #default="{ row }">
                <el-button 
                  type="success" 
                  link 
                  @click="handleReturn(row)"
                  :loading="returningBooks.has(row.id)"
                  :disabled="returningBooks.has(row.id)"
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
                  @click="handleRenew(row)"
                  :disabled="isOverdue(row.due_date) || renewingBooks.has(row.id)"
                  :loading="renewingBooks.has(row.id)"
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
          <el-table :data="allRecords" style="width: 100%" class="custom-table">
            <el-table-column type="index" label="#" width="60" />
            <el-table-column prop="reader_name" label="读者" width="120" />
            <el-table-column prop="book_title" label="图书" />
            <el-table-column prop="borrow_date" label="借书日期" width="110" />
            <el-table-column prop="return_date" label="还书日期" width="110" />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag v-if="row.status === 'borrowed'" type="warning">借阅中</el-tag>
                <el-tag v-else-if="row.status === 'returned'" type="success">已归还</el-tag>
                <el-tag v-else-if="row.status === 'overdue'" type="danger">逾期</el-tag>
                <el-tag v-else type="info">丢失</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120">
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
      <el-table :data="searchReaderResults" style="width: 100%" max-height="400px">
        <el-table-column prop="reader_no" label="编号" width="120" />
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="category_name" label="类型" width="100" />
        <el-table-column prop="phone" label="电话" />
        <el-table-column label="操作" width="80">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleSelectReader(row)">选择</el-button>
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
      <el-table :data="searchBookResults" style="width: 100%" max-height="400px">
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
            <el-button type="primary" link @click="handleSelectBook(row)">选择</el-button>
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
import { DebounceSubmitManager, DebounceConfigs } from '@/utils/debounceSubmit'

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
  // 非管理员/图书管理员：根据姓名匹配过滤
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

  const result = await window.api.reader.search(borrowForm.readerNo)
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

  const result = await window.api.book.getAll({ keyword: borrowForm.bookIsbn })
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

// 增强的借书操作（带防重复提交和重试）
const handleBorrow = async () => {
  if (!selectedReader.value) {
    ElMessage.warning('请先选择读者（输入编号或姓名后点击搜索图标）')
    return
  }

  if (!selectedBook.value) {
    ElMessage.warning('请先选择图书（输入ISBN或书名后点击搜索图标）')
    return
  }

  isBorrowing.value = true

  try {
    console.log('========== [前端] 开始借书流程 ==========')
    console.log('[前端] 读者和图书:', {
      readerId: selectedReader.value.id,
      readerName: selectedReader.value.name,
      bookId: selectedBook.value.id,
      bookTitle: selectedBook.value.title,
      bookAvailableQuantity: selectedBook.value.available_quantity
    })

    // 使用防重复提交和重试机制
    const result = await DebounceSubmitManager.submitWithRetry(
      `borrow_${selectedReader.value.id}_${selectedBook.value.id}`,
      async () => {
        // 调用借书API
        console.log('[前端] 调用借书API...')
        const borrowResult = await window.api.borrowing.borrow(selectedReader.value.id, selectedBook.value.id)
        console.log('[前端] 借书API结果:', borrowResult)

        if (!borrowResult.success) {
          throw new Error(borrowResult.error?.message || '借书失败')
        }

        return borrowResult.data
      },
      3, // 最大重试3次
      {
        ...DebounceConfigs.BORROW,
        showMessage: true
      }
    )

    if (result.success) {
      console.log('[前端] 借书成功，记录ID:', result.data?.id)
      ElMessage.success('借阅成功！')
      borrowForm.readerNo = ''
      borrowForm.bookIsbn = ''
      selectedReader.value = null
      selectedBook.value = null
      // 刷新借阅列表
      console.log('[前端] 刷新借阅列表...')
      await searchBorrowedBooks()
      console.log('[前端] 借阅列表刷新完成')
    } else {
      console.error('[前端] 借书失败:', result.error)
      // 错误消息已在DebounceSubmitManager中处理
    }
  } catch (error) {
    console.error('[前端] 借书操作异常:', error)
    if (error instanceof Error) {
      console.error('[前端] 错误堆栈:', error.stack)
    }
  } finally {
    isBorrowing.value = false
    console.log('========== [前端] 借书流程结束 ==========\n')
  }
}

// 增强的还书操作（带防重复提交和重试）
const handleReturn = async (row: any) => {
  const bookId = row.id
  returningBooks.value.add(bookId)

  try {
    const result = await DebounceSubmitManager.submitWithRetry(
      `return_${bookId}`,
      async () => {
        const returnResult = await window.api.borrowing.return(bookId)
        if (!returnResult.success) {
          throw new Error(returnResult.error?.message || '还书失败')
        }
        return returnResult.data
      },
      2, // 最大重试2次
      DebounceConfigs.RETURN
    )

    if (result.success) {
      ElMessage.success('还书成功！')
      searchBorrowedBooks()
    }
    // 错误消息已在DebounceSubmitManager中处理
  } catch (error) {
    console.error('还书操作失败:', error)
  } finally {
    returningBooks.value.delete(bookId)
  }
}

// 增强的续借操作（带防重复提交和重试）
const handleRenew = async (row: any) => {
  const bookId = row.id
  renewingBooks.value.add(bookId)

  try {
    const result = await DebounceSubmitManager.submitWithRetry(
      `renew_${bookId}`,
      async () => {
        const renewResult = await window.api.borrowing.renew(bookId)
        if (!renewResult.success) {
          throw new Error(renewResult.error?.message || '续借失败')
        }
        return renewResult.data
      },
      2, // 最大重试2次
      DebounceConfigs.RENEW
    )

    if (result.success) {
      ElMessage.success('续借成功！')
      searchBorrowedBooks()
    }
    // 错误消息已在DebounceSubmitManager中处理
  } catch (error) {
    console.error('续借操作失败:', error)
  } finally {
    renewingBooks.value.delete(bookId)
  }
}

const searchBorrowedBooks = async () => {
  // 构建搜索参数
  const searchParams: any = {
    status: 'borrowed'
  }

  // 添加关键词搜索
  if (returnSearchKeyword.value) {
    searchParams.keyword = returnSearchKeyword.value
  }

  // 添加日期范围搜索
  if (dateRange.value && dateRange.value.length === 2) {
    searchParams.borrow_date_from = dateRange.value[0].toISOString().split('T')[0]
    searchParams.borrow_date_to = dateRange.value[1].toISOString().split('T')[0]
  }

  const result = await window.api.borrowing.getAll(searchParams)
  if (result.success) {
    // 根据角色过滤记录
    borrowedBooks.value = filterRecordsByUser(result.data)

    // 计算逾期数量（仅教师/学生）
    if (!canViewAllRecords.value) {
      overdueCount.value = borrowedBooks.value.filter((r: any) => isOverdue(r.due_date)).length
    }
  }
}

const isOverdue = (dueDate: string) => {
  return new Date(dueDate) < new Date()
}

// 为逾期行添加样式类
const getRowClassName = ({ row }: { row: any }) => {
  if (isOverdue(row.due_date)) {
    return 'overdue-row'
  }
  return ''
}

const loadAllRecords = async () => {
  // 构建搜索参数
  const searchParams: any = {}

  // 添加关键词搜索
  if (returnSearchKeyword.value) {
    searchParams.keyword = returnSearchKeyword.value
  }

  // 添加日期范围搜索
  if (dateRange.value && dateRange.value.length === 2) {
    searchParams.borrow_date_from = dateRange.value[0].toISOString().split('T')[0]
    searchParams.borrow_date_to = dateRange.value[1].toISOString().split('T')[0]
  }

  const result = await window.api.borrowing.getAll(searchParams)
  if (result.success) {
    // 根据角色过滤记录
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
  console.log('========== [前端] 开始删除借阅记录 ==========')
  console.log('[前端] 记录信息:', {
    id: row.id,
    reader_name: row.reader_name,
    book_title: row.book_title,
    status: row.status,
    borrow_date: row.borrow_date,
    return_date: row.return_date
  })

  // 检查记录状态
  if (row.status !== 'returned') {
    console.warn('[前端] 该记录状态不是已归还，无法删除，当前状态:', row.status)
    ElMessage.warning('只能删除已归还的借阅记录')
    console.log('========== [前端] 删除借阅记录结束（状态不符） ==========\n')
    return
  }

  try {
    console.log('[前端] 弹出确认对话框...')
    await ElMessageBox.confirm(
      `确定要删除这条借阅记录吗？\n读者：${row.reader_name}\n图书：${row.book_title}\n借书日期：${row.borrow_date}\n还书日期：${row.return_date}`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    console.log('[前端] 用户确认删除')

    console.log('[前端] 调用delete API...')
    console.log('[前端] API参数:', { id: row.id })
    const result = await window.api.borrowing.delete(row.id)
    console.log('[前端] API返回结果:', result)

    if (result.success) {
      console.log('[前端] 删除成功')
      ElMessage.success('删除成功')

      console.log('[前端] 刷新借阅记录列表...')
      loadAllRecords()
    } else {
      console.error('[前端] 删除失败:', result.error)
      ElMessage.error(result.error?.message || '删除失败')
    }
  } catch (error: any) {
    console.error('[前端] 删除出错:', error)
    if (error === 'cancel' || error === 'close') {
      console.log('[前端] 用户取消删除')
    } else {
      console.error('[前端] 错误详情:', error)
      if (error instanceof Error) {
        console.error('[前端] 错误堆栈:', error.stack)
      }
      ElMessage.error(error.message || '删除失败')
    }
  } finally {
    console.log('========== [前端] 删除借阅记录结束 ==========\n')
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

/* 警告横幅 */
.alert-banner {
  margin-bottom: 20px;
  border-radius: 12px;
}

.alert-content {
  margin-top: 8px;
  font-size: 14px;
  color: #7f1d1d;
}

/* 标签页样式 */
.custom-tabs {
  background: transparent;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
}

/* 借书区域 */
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

/* 还书区域 */
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

/* 历史记录区域 */
.history-section {
  padding: 24px;
  animation: fadeInUp 0.4s ease-out;
}

/* 逾期行高亮样式 */
:deep(.overdue-row) {
  background: linear-gradient(90deg, rgba(239, 68, 68, 0.05), rgba(239, 68, 68, 0.02)) !important;
}

:deep(.overdue-row:hover) {
  background: linear-gradient(90deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05)) !important;
}

/* 表格操作按钮 */
:deep(.el-button--text) {
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.2s ease;
}

:deep(.el-button--text:hover) {
  background: rgba(99, 102, 241, 0.1);
}

/* 状态标签增强 */
:deep(.el-tag) {
  font-weight: 600;
  letter-spacing: 0.5px;
}

/* 加载动画 */
:deep(.is-loading) {
  animation: rotate 1s linear infinite;
}
</style>
