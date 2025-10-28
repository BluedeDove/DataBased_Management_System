<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">统计分析</h1>
      <p class="page-description">查看图书馆运营数据和分析报告</p>
    </div>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="图书统计" name="books">
        <div class="card">
          <h3>图书类别统计</h3>
          <el-table :data="categoryStats" style="margin-top: 16px">
            <el-table-column prop="category_name" label="类别" />
            <el-table-column prop="book_count" label="图书数量" align="right" />
            <el-table-column prop="available_count" label="可借数量" align="right" />
          </el-table>
        </div>

        <div class="card" style="margin-top: 20px">
          <h3>热门图书</h3>
          <el-table :data="popularBooks" style="margin-top: 16px">
            <el-table-column type="index" label="#" width="60" />
            <el-table-column prop="book_title" label="书名" />
            <el-table-column prop="book_author" label="作者" />
            <el-table-column prop="borrow_count" label="借阅次数" align="right" />
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="读者统计" name="readers">
        <div class="card">
          <h3>活跃读者</h3>
          <el-table :data="activeReaders" style="margin-top: 16px">
            <el-table-column type="index" label="#" width="60" />
            <el-table-column prop="reader_name" label="姓名" />
            <el-table-column prop="reader_no" label="读者编号" />
            <el-table-column prop="borrow_count" label="借阅次数" align="right" />
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="借阅统计" name="borrowing">
        <div class="stat-cards">
          <div class="stat-card">
            <div class="stat-title">总借阅量</div>
            <div class="stat-value">{{ borrowStats.total_borrowed || 0 }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-title">当前在借</div>
            <div class="stat-value">{{ borrowStats.currently_borrowed || 0 }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-title">逾期未还</div>
            <div class="stat-value" style="color: #f56c6c">
              {{ borrowStats.overdue_count || 0 }}
            </div>
          </div>
        </div>

        <div class="card" style="margin-top: 20px">
          <h3>逾期记录</h3>
          <el-table :data="overdueRecords" style="margin-top: 16px">
            <el-table-column prop="reader_name" label="读者" />
            <el-table-column prop="book_title" label="图书" />
            <el-table-column prop="due_date" label="应还日期" />
            <el-table-column label="逾期天数" align="right">
              <template #default="{ row }">
                <el-tag type="danger">{{ calculateOverdueDays(row.due_date) }}天</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const activeTab = ref('books')
const categoryStats = ref<any[]>([])
const popularBooks = ref<any[]>([])
const activeReaders = ref<any[]>([])
const borrowStats = ref<any>({})
const overdueRecords = ref<any[]>([])

const loadStatistics = async () => {
  // 加载图书类别统计
  const categoryResult = await window.api.book.getCategoryStatistics()
  if (categoryResult.success) {
    categoryStats.value = categoryResult.data
  }

  // 加载热门图书
  const popularResult = await window.api.borrowing.getPopular(20)
  if (popularResult.success) {
    popularBooks.value = popularResult.data
  }

  // 加载活跃读者
  const activeResult = await window.api.borrowing.getActiveReaders(20)
  if (activeResult.success) {
    activeReaders.value = activeResult.data
  }

  // 加载借阅统计
  const statsResult = await window.api.borrowing.getStatistics()
  if (statsResult.success) {
    borrowStats.value = statsResult.data
  }

  // 加载逾期记录
  const overdueResult = await window.api.borrowing.getOverdue()
  if (overdueResult.success) {
    overdueRecords.value = overdueResult.data
  }
}

const calculateOverdueDays = (dueDate: string) => {
  const due = new Date(dueDate)
  const today = new Date()
  const diff = today.getTime() - due.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

onMounted(() => {
  loadStatistics()
})
</script>
