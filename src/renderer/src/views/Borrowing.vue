<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">{{ pageTitle }}</h1>
      <p class="page-description">{{ pageDescription }}</p>
    </div>

    <!-- 逾期警告横幅（教师/学生） -->
    <el-alert
      v-if="!canViewAllRecords && overdueCount > 0"
      type="error"
      :title="`您有 ${overdueCount} 本图书已逾期，请尽快归还！`"
      :closable="false"
      show-icon
      style="margin-bottom: 20px"
    >
      <template #default>
        <div style="margin-top: 8px">
          逾期图书可能会影响您的信用记录和借阅权限，请及时处理。
        </div>
      </template>
    </el-alert>

    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <!-- 借书标签页：仅管理员和图书管理员可见 -->
      <el-tab-pane v-if="canViewAllRecords" label="借书" name="borrow">
        <div class="borrow-section">
          <el-form :inline="true" :model="borrowForm" label-width="100px">
            <el-form-item label="读者编号">
              <el-input v-model="borrowForm.readerNo" placeholder="扫描或输入" style="width: 200px" />
            </el-form-item>
            <el-form-item label="图书ISBN">
              <el-input v-model="borrowForm.bookIsbn" placeholder="扫描或输入" style="width: 200px" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleBorrow">确认借书</el-button>
            </el-form-item>
          </el-form>
        </div>
      </el-tab-pane>

      <el-tab-pane label="还书" name="return">
        <div class="return-section">
          <el-input
            v-model="returnSearchKeyword"
            placeholder="搜索读者姓名或编号"
            style="width: 300px; margin-bottom: 20px"
            @keyup.enter="searchBorrowedBooks"
          >
            <template #append>
              <el-button :icon="Search" @click="searchBorrowedBooks" />
            </template>
          </el-input>

          <el-table
            :data="borrowedBooks"
            style="width: 100%"
            :row-class-name="getRowClassName"
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
                <el-button type="success" link @click="handleReturn(row)">还书</el-button>
                <el-button
                  type="primary"
                  link
                  @click="handleRenew(row)"
                  :disabled="isOverdue(row.due_date)"
                >
                  续借
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="借阅记录" name="history">
        <el-table :data="allRecords" style="width: 100%">
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
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const borrowedBooks = ref<any[]>([])
const allRecords = ref<any[]>([])
const returnSearchKeyword = ref('')
const overdueCount = ref(0)

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

const handleBorrow = async () => {
  if (!borrowForm.readerNo || !borrowForm.bookIsbn) {
    ElMessage.warning('请填写完整信息')
    return
  }

  try {
    // 先查找读者和图书
    const readerResult = await window.api.reader.getByNo(borrowForm.readerNo)
    const bookResult = await window.api.book.getAll({ keyword: borrowForm.bookIsbn })

    if (!readerResult.success || !bookResult.success) {
      ElMessage.error('读者或图书不存在')
      return
    }

    const reader = readerResult.data
    const book = bookResult.data.find((b: any) => b.isbn === borrowForm.bookIsbn)

    if (!book) {
      ElMessage.error('图书不存在')
      return
    }

    const result = await window.api.borrowing.borrow(reader.id, book.id)

    if (result.success) {
      ElMessage.success('借书成功')
      borrowForm.readerNo = ''
      borrowForm.bookIsbn = ''
    } else {
      ElMessage.error(result.error?.message || '借书失败')
    }
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

const searchBorrowedBooks = async () => {
  const result = await window.api.borrowing.getAll({ status: 'borrowed' })
  if (result.success) {
    let filtered = result.data

    // 根据角色过滤记录
    filtered = filterRecordsByUser(filtered)

    // 根据搜索关键词过滤
    if (returnSearchKeyword.value) {
      filtered = filtered.filter((r: any) =>
        r.reader_name.includes(returnSearchKeyword.value) ||
        r.reader_no.includes(returnSearchKeyword.value)
      )
    }

    borrowedBooks.value = filtered

    // 计算逾期数量（仅教师/学生）
    if (!canViewAllRecords.value) {
      overdueCount.value = filtered.filter((r: any) => isOverdue(r.due_date)).length
    }
  }
}

const handleReturn = async (row: any) => {
  const result = await window.api.borrowing.return(row.id)
  if (result.success) {
    ElMessage.success('还书成功')
    searchBorrowedBooks()
  } else {
    ElMessage.error(result.error?.message || '还书失败')
  }
}

const handleRenew = async (row: any) => {
  const result = await window.api.borrowing.renew(row.id)
  if (result.success) {
    ElMessage.success('续借成功')
    searchBorrowedBooks()
  } else {
    ElMessage.error(result.error?.message || '续借失败')
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
  const result = await window.api.borrowing.getAll()
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
.borrow-section,
.return-section {
  padding: 20px;
  background: white;
  border-radius: 8px;
}

/* 逾期行高亮样式 */
:deep(.overdue-row) {
  background-color: #fef0f0 !important;
}

:deep(.overdue-row:hover) {
  background-color: #fde2e2 !important;
}
</style>
