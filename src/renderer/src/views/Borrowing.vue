<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">借还管理</h1>
      <p class="page-description">处理图书借阅和归还</p>
    </div>

    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <el-tab-pane label="借书" name="borrow">
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

          <el-table :data="borrowedBooks" style="width: 100%">
            <el-table-column prop="reader_name" label="读者" width="120" />
            <el-table-column prop="book_title" label="图书" />
            <el-table-column prop="borrow_date" label="借书日期" width="110" />
            <el-table-column prop="due_date" label="应还日期" width="110">
              <template #default="{ row }">
                <span :style="{ color: isOverdue(row.due_date) ? '#f56c6c' : '#303133' }">
                  {{ row.due_date }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200">
              <template #default="{ row }">
                <el-button type="success" link @click="handleReturn(row)">还书</el-button>
                <el-button type="primary" link @click="handleRenew(row)">续借</el-button>
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
        </el-table>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const activeTab = ref('borrow')
const borrowedBooks = ref<any[]>([])
const allRecords = ref<any[]>([])
const returnSearchKeyword = ref('')

// 角色权限相关
const userRole = computed(() => userStore.user?.role || '')
const isAdmin = computed(() => userRole.value === 'admin')
const isLibrarian = computed(() => userRole.value === 'librarian')
const canViewAllRecords = computed(() => isAdmin.value || isLibrarian.value)
const currentUserName = computed(() => userStore.user?.name || '')

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
</style>
