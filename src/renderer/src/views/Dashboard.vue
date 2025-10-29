<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">{{ dashboardTitle }}</h1>
      <p class="page-description">欢迎回来，{{ userStore.user?.name }} ({{ roleDisplay }})</p>
    </div>

    <!-- 管理员和图书管理员：完整统计 -->
    <div v-if="isAdminOrLibrarian" class="stat-cards">
      <div class="stat-card" style="border-left: 4px solid #409eff">
        <div class="stat-card-content">
          <div class="stat-info">
            <div class="stat-title">图书总数</div>
            <div class="stat-value">{{ statistics.totalBooks }}</div>
            <div class="stat-trend">
              <el-icon color="#67c23a"><TrendCharts /></el-icon>
              <span>可借: {{ statistics.availableBooks }}</span>
            </div>
          </div>
          <div class="stat-icon" style="background: #ecf5ff; color: #409eff">
            <el-icon :size="40"><Reading /></el-icon>
          </div>
        </div>
      </div>

      <div class="stat-card" style="border-left: 4px solid #67c23a">
        <div class="stat-card-content">
          <div class="stat-info">
            <div class="stat-title">读者总数</div>
            <div class="stat-value">{{ statistics.totalReaders }}</div>
            <div class="stat-trend">
              <el-icon color="#67c23a"><UserFilled /></el-icon>
              <span>活跃: {{ statistics.activeReaders }}</span>
            </div>
          </div>
          <div class="stat-icon" style="background: #f0f9ff; color: #67c23a">
            <el-icon :size="40"><User /></el-icon>
          </div>
        </div>
      </div>

      <div class="stat-card" style="border-left: 4px solid #e6a23c">
        <div class="stat-card-content">
          <div class="stat-info">
            <div class="stat-title">在借图书</div>
            <div class="stat-value">{{ statistics.borrowedBooks }}</div>
            <div class="stat-trend">
              <el-icon color="#e6a23c"><Clock /></el-icon>
              <span>借阅率: {{ borrowRate }}%</span>
            </div>
          </div>
          <div class="stat-icon" style="background: #fdf6ec; color: #e6a23c">
            <el-icon :size="40"><DocumentCopy /></el-icon>
          </div>
        </div>
      </div>

      <div class="stat-card" style="border-left: 4px solid #f56c6c">
        <div class="stat-card-content">
          <div class="stat-info">
            <div class="stat-title">逾期图书</div>
            <div class="stat-value">{{ statistics.overdueBooks }}</div>
            <div class="stat-trend">
              <el-icon color="#f56c6c"><WarningFilled /></el-icon>
              <span>需要处理</span>
            </div>
          </div>
          <div class="stat-icon" style="background: #fef0f0; color: #f56c6c">
            <el-icon :size="40"><Warning /></el-icon>
          </div>
        </div>
      </div>
    </div>

    <!-- 教师：精简统计 -->
    <div v-if="isTeacher" class="teacher-dashboard">
      <div class="welcome-banner">
        <div class="banner-content">
          <h2>{{ greetingMessage }}</h2>
          <p>今天是阅读的好日子</p>
        </div>
        <div class="banner-stats">
          <div class="mini-stat">
            <span class="mini-stat-value">{{ teacherStats.borrowedCount }}</span>
            <span class="mini-stat-label">已借图书</span>
          </div>
          <div class="mini-stat">
            <span class="mini-stat-value">{{ teacherStats.availableBooks }}</span>
            <span class="mini-stat-label">可借图书</span>
          </div>
        </div>
      </div>

      <!-- 热门图书卡片式展示 -->
      <div class="section-header">
        <h3><el-icon><Star /></el-icon> 热门推荐</h3>
        <el-button text type="primary" @click="$router.push('/books')">浏览更多</el-button>
      </div>
      <div class="book-cards">
        <div v-for="book in popularBooks.slice(0, 6)" :key="book.book_id" class="book-card">
          <div class="book-card-cover">
            <el-icon v-if="!book.cover_url" :size="48"><Reading /></el-icon>
            <img v-else :src="book.cover_url" alt="">
          </div>
          <div class="book-card-info">
            <div class="book-card-title">{{ book.book_title }}</div>
            <div class="book-card-author">{{ book.book_author }}</div>
            <el-tag size="small" type="warning">{{ book.borrow_count }}次借阅</el-tag>
          </div>
        </div>
      </div>
    </div>

    <!-- 学生：个性化卡片界面 -->
    <div v-if="isStudent" class="student-dashboard">
      <div class="welcome-banner student-banner">
        <div class="banner-content">
          <h2>{{ greetingMessage }}</h2>
          <p>知识改变命运，阅读点亮人生</p>
        </div>
        <div class="banner-stats">
          <div class="mini-stat">
            <span class="mini-stat-value">{{ studentStats.borrowedCount }}</span>
            <span class="mini-stat-label">我的借阅</span>
          </div>
          <div class="mini-stat">
            <span class="mini-stat-value">{{ studentStats.maxBorrow - studentStats.borrowedCount }}</span>
            <span class="mini-stat-label">可借数量</span>
          </div>
        </div>
      </div>

      <!-- 我的借阅 -->
      <div class="section-header">
        <h3><el-icon><DocumentCopy /></el-icon> 我的借阅</h3>
        <el-button text type="primary" @click="$router.push('/borrowing')">查看全部</el-button>
      </div>
      <div v-if="myBorrowings.length === 0" class="empty-state">
        <el-icon :size="64"><Reading /></el-icon>
        <p>暂无借阅记录</p>
        <el-button type="primary" @click="$router.push('/books')">去借书</el-button>
      </div>
      <div v-else class="borrowing-timeline">
        <div v-for="record in myBorrowings" :key="record.id" class="timeline-item">
          <div class="timeline-marker" :class="getStatusClass(record.status)"></div>
          <div class="timeline-content">
            <div class="timeline-header">
              <span class="timeline-title">{{ record.book_title }}</span>
              <el-tag :type="getStatusType(record.status)" size="small">
                {{ getStatusText(record.status) }}
              </el-tag>
            </div>
            <div class="timeline-meta">
              <span>借阅日期: {{ formatDate(record.borrow_date) }}</span>
              <span class="separator">•</span>
              <span>到期日期: {{ formatDate(record.due_date) }}</span>
            </div>
            <div v-if="record.status === 'overdue'" class="timeline-warning">
              <el-icon><WarningFilled /></el-icon>
              请及时归还，避免产生罚金
            </div>
          </div>
        </div>
      </div>

      <!-- 推荐图书 -->
      <div class="section-header" style="margin-top: 32px;">
        <h3><el-icon><Star /></el-icon> 为你推荐</h3>
        <el-button text type="primary" @click="$router.push('/books')">更多好书</el-button>
      </div>
      <div class="book-cards">
        <div v-for="book in popularBooks.slice(0, 4)" :key="book.book_id" class="book-card book-card-lg">
          <div class="book-card-cover">
            <el-icon v-if="!book.cover_url" :size="56"><Reading /></el-icon>
            <img v-else :src="book.cover_url" alt="">
          </div>
          <div class="book-card-info">
            <div class="book-card-title">{{ book.book_title }}</div>
            <div class="book-card-author">{{ book.book_author }}</div>
            <div class="book-card-footer">
              <el-tag size="small">{{ book.borrow_count }}人借阅</el-tag>
              <el-button size="small" type="primary" @click="$router.push('/books')">
                立即借阅
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 图表和列表 (管理员和图书管理员) -->
    <el-row v-if="isAdminOrLibrarian" :gutter="20">
      <el-col :span="12">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">
              <el-icon><PieChart /></el-icon>
              图书类别分布
            </h3>
          </div>
          <div class="chart-container" style="height: 320px">
            <canvas ref="categoryChartRef"></canvas>
          </div>
        </div>
      </el-col>

      <el-col :span="12">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">
              <el-icon><TrendCharts /></el-icon>
              借阅趋势
            </h3>
          </div>
          <div class="chart-container" style="height: 320px">
            <div class="coming-soon">
              <el-icon :size="48"><DataLine /></el-icon>
              <p>借阅趋势图表</p>
              <el-text type="info">数据统计中...</el-text>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 热门图书和活跃读者 -->
    <el-row v-if="isAdminOrLibrarian" :gutter="20" style="margin-top: 20px">
      <el-col :span="12">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">
              <el-icon><Star /></el-icon>
              热门图书 TOP 10
            </h3>
            <el-button text type="primary" @click="$router.push('/books')">
              查看更多
            </el-button>
          </div>
          <el-table :data="popularBooks" style="width: 100%" :show-header="false">
            <el-table-column type="index" width="50" />
            <el-table-column prop="book_title" label="书名">
              <template #default="{ row }">
                <div class="book-info">
                  <div class="book-title">{{ row.book_title }}</div>
                  <div class="book-author">{{ row.book_author }}</div>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="borrow_count" label="借阅次数" width="100" align="right">
              <template #default="{ row }">
                <el-tag type="warning">{{ row.borrow_count }}次</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-col>

      <el-col :span="12">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">
              <el-icon><Trophy /></el-icon>
              活跃读者 TOP 10
            </h3>
            <el-button text type="primary" @click="$router.push('/readers')">
              查看更多
            </el-button>
          </div>
          <el-table :data="activeReaders" style="width: 100%" :show-header="false">
            <el-table-column type="index" width="50" />
            <el-table-column prop="reader_name" label="姓名">
              <template #default="{ row }">
                <div class="reader-info">
                  <div class="reader-name">{{ row.reader_name }}</div>
                  <div class="reader-no">编号: {{ row.reader_no }}</div>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="borrow_count" label="借阅次数" width="100" align="right">
              <template #default="{ row }">
                <el-tag type="success">{{ row.borrow_count }}次</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import { ElMessage } from 'element-plus'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const userStore = useUserStore()
const categoryChartRef = ref<HTMLCanvasElement>()
let categoryChart: Chart | null = null

// 角色相关计算属性
const userRole = computed(() => userStore.user?.role || 'student')
const isAdmin = computed(() => userRole.value === 'admin')
const isLibrarian = computed(() => userRole.value === 'librarian')
const isTeacher = computed(() => userRole.value === 'teacher')
const isStudent = computed(() => userRole.value === 'student')
const isAdminOrLibrarian = computed(() => isAdmin.value || isLibrarian.value)

const roleDisplay = computed(() => {
  const roleMap: Record<string, string> = {
    admin: '系统管理员',
    librarian: '图书管理员',
    teacher: '教师',
    student: '学生'
  }
  return roleMap[userRole.value] || '用户'
})

const dashboardTitle = computed(() => {
  if (isAdminOrLibrarian.value) return '数据概览'
  if (isTeacher.value) return '图书馆'
  return '我的图书馆'
})

const greetingMessage = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了，早点休息'
  if (hour < 9) return '早上好'
  if (hour < 12) return '上午好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  if (hour < 22) return '晚上好'
  return '夜深了，早点休息'
})

const statistics = reactive({
  totalBooks: 0,
  availableBooks: 0,
  totalReaders: 0,
  activeReaders: 0,
  borrowedBooks: 0,
  overdueBooks: 0
})

const teacherStats = reactive({
  borrowedCount: 0,
  availableBooks: 0
})

const studentStats = reactive({
  borrowedCount: 0,
  maxBorrow: 5,
  overdueCount: 0
})

const popularBooks = ref<any[]>([])
const activeReaders = ref<any[]>([])
const categoryData = ref<any[]>([])
const myBorrowings = ref<any[]>([])

const borrowRate = computed(() => {
  if (statistics.totalBooks === 0) return 0
  return ((statistics.borrowedBooks / statistics.totalBooks) * 100).toFixed(1)
})

// 加载统计数据
const loadStatistics = async () => {
  try {
    // 获取热门图书 (所有角色都需要)
    const popularResult = await window.api.borrowing.getPopular(10)
    if (popularResult.success) {
      popularBooks.value = popularResult.data
    }

    // 管理员和图书管理员：加载完整统计
    if (isAdminOrLibrarian.value) {
      // 获取图书统计
      const booksResult = await window.api.book.getAll()
      if (booksResult.success) {
        const books = booksResult.data
        statistics.totalBooks = books.length
        statistics.availableBooks = books.reduce((sum: number, book: any) =>
          sum + (book.available_quantity || 0), 0)
      }

      // 获取读者统计
      const readersResult = await window.api.reader.getAll()
      if (readersResult.success) {
        const readers = readersResult.data
        statistics.totalReaders = readers.length
        statistics.activeReaders = readers.filter((r: any) => r.status === 'active').length
      }

      // 获取借阅统计
      const borrowingStatsResult = await window.api.borrowing.getStatistics()
      if (borrowingStatsResult.success) {
        statistics.borrowedBooks = borrowingStatsResult.data.currently_borrowed || 0
        statistics.overdueBooks = borrowingStatsResult.data.overdue_count || 0
      }

      // 获取活跃读者
      const activeResult = await window.api.borrowing.getActiveReaders(10)
      if (activeResult.success) {
        activeReaders.value = activeResult.data
      }

      // 获取类别统计
      const categoryStatsResult = await window.api.book.getCategoryStatistics()
      if (categoryStatsResult.success) {
        categoryData.value = categoryStatsResult.data
        renderCategoryChart()
      }
    }

    // 教师：加载简单统计
    if (isTeacher.value) {
      const booksResult = await window.api.book.getAll()
      if (booksResult.success) {
        teacherStats.availableBooks = booksResult.data.length
      }

      // 获取当前用户的借阅数量
      const myBorrowingsResult = await window.api.borrowing.getAll({ status: 'borrowed' })
      if (myBorrowingsResult.success) {
        teacherStats.borrowedCount = myBorrowingsResult.data.filter(
          (r: any) => r.reader_id === userStore.user?.id
        ).length
      }
    }

    // 学生：加载个人数据
    if (isStudent.value) {
      // 获取我的借阅记录
      const myBorrowingsResult = await window.api.borrowing.getAll()
      if (myBorrowingsResult.success) {
        const allBorrowings = myBorrowingsResult.data
        // 注意：这里需要根据当前登录用户过滤
        // 由于我们使用的是 reader_id 关联，需要先获取当前用户对应的 reader 记录
        myBorrowings.value = allBorrowings.filter((r: any) =>
          r.status === 'borrowed' || r.status === 'overdue'
        ).slice(0, 5) // 只显示最近5条

        studentStats.borrowedCount = allBorrowings.filter(
          (r: any) => r.status === 'borrowed' || r.status === 'overdue'
        ).length

        studentStats.overdueCount = allBorrowings.filter(
          (r: any) => r.status === 'overdue'
        ).length
      }
    }
  } catch (error: any) {
    ElMessage.error('加载数据失败')
    console.error(error)
  }
}

// 辅助函数
const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    borrowed: '借阅中',
    overdue: '已逾期',
    returned: '已归还',
    lost: '已丢失'
  }
  return statusMap[status] || status
}

const getStatusType = (status: string) => {
  const typeMap: Record<string, any> = {
    borrowed: 'success',
    overdue: 'danger',
    returned: 'info',
    lost: 'warning'
  }
  return typeMap[status] || 'info'
}

const getStatusClass = (status: string) => {
  return {
    'status-borrowed': status === 'borrowed',
    'status-overdue': status === 'overdue',
    'status-returned': status === 'returned',
    'status-lost': status === 'lost'
  }
}

// 渲染类别饼图
const renderCategoryChart = () => {
  if (!categoryChartRef.value || categoryData.value.length === 0) return

  if (categoryChart) {
    categoryChart.destroy()
  }

  const ctx = categoryChartRef.value.getContext('2d')
  if (!ctx) return

  const colors = [
    '#409eff',
    '#67c23a',
    '#e6a23c',
    '#f56c6c',
    '#909399',
    '#c45656',
    '#13ce66',
    '#ffba00'
  ]

  categoryChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: categoryData.value.map(item => item.category_name),
      datasets: [{
        data: categoryData.value.map(item => item.book_count || 0),
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            padding: 15,
            font: {
              size: 12
            }
          }
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.label || ''
              const value = context.parsed || 0
              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
              const percentage = ((value / total) * 100).toFixed(1)
              return `${label}: ${value}本 (${percentage}%)`
            }
          }
        }
      }
    }
  })
}

onMounted(() => {
  loadStatistics()
})
</script>

<style scoped>
.stat-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.stat-card-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-info {
  flex: 1;
}

.stat-title {
  font-size: 14px;
  color: #909399;
  margin-bottom: 12px;
}

.stat-value {
  font-size: 32px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #606266;
}

.stat-icon {
  width: 72px;
  height: 72px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
}

.chart-container {
  position: relative;
}

.coming-soon {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #909399;
  gap: 12px;
}

.book-info,
.reader-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.book-title,
.reader-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.book-author,
.reader-no {
  font-size: 12px;
  color: #909399;
}

:deep(.el-table) {
  font-size: 14px;
}

:deep(.el-table__row) {
  cursor: pointer;
  transition: background 0.2s;
}

:deep(.el-table__row:hover) {
  background: #f5f7fa;
}

/* 角色专属样式 */
.teacher-dashboard,
.student-dashboard {
  max-width: 1400px;
  margin: 0 auto;
}

.welcome-banner {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 16px;
  padding: 32px 40px;
  margin-bottom: 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
}

.student-banner {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  box-shadow: 0 8px 24px rgba(245, 87, 108, 0.3);
}

.banner-content h2 {
  font-size: 28px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.banner-content p {
  font-size: 16px;
  opacity: 0.9;
  margin: 0;
}

.banner-stats {
  display: flex;
  gap: 32px;
}

.mini-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.mini-stat-value {
  font-size: 32px;
  font-weight: 700;
}

.mini-stat-label {
  font-size: 14px;
  opacity: 0.9;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
}

.book-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.book-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s;
  cursor: pointer;
}

.book-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.book-card-lg {
  grid-column: span 1;
}

.book-card-cover {
  width: 100%;
  height: 180px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  margin-bottom: 12px;
  overflow: hidden;
}

.book-card-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.book-card-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.book-card-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  min-height: 40px;
}

.book-card-author {
  font-size: 12px;
  color: #909399;
}

.book-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #909399;
  gap: 16px;
}

.empty-state p {
  font-size: 16px;
  margin: 0;
}

.borrowing-timeline {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 24px;
}

.timeline-item {
  display: flex;
  gap: 16px;
  position: relative;
  padding-bottom: 24px;
}

.timeline-item:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 7px;
  top: 24px;
  bottom: 0;
  width: 2px;
  background: #dcdfe6;
}

.timeline-marker {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
  border: 3px solid #409eff;
  background: white;
  position: relative;
  z-index: 1;
}

.timeline-marker.status-borrowed {
  border-color: #67c23a;
}

.timeline-marker.status-overdue {
  border-color: #f56c6c;
}

.timeline-marker.status-returned {
  border-color: #909399;
}

.timeline-content {
  flex: 1;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.timeline-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.timeline-meta {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.separator {
  margin: 0 8px;
}

.timeline-warning {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #f56c6c;
  font-size: 13px;
  padding: 8px 12px;
  background: #fef0f0;
  border-radius: 6px;
  margin-top: 8px;
}

</style>
