<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">数据概览</h1>
      <p class="page-description">欢迎回来，{{ userStore.user?.name }}</p>
    </div>

    <!-- 统计卡片 -->
    <div class="stat-cards">
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

    <!-- 图表和列表 -->
    <el-row :gutter="20">
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
    <el-row :gutter="20" style="margin-top: 20px">
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

const statistics = reactive({
  totalBooks: 0,
  availableBooks: 0,
  totalReaders: 0,
  activeReaders: 0,
  borrowedBooks: 0,
  overdueBooks: 0
})

const popularBooks = ref<any[]>([])
const activeReaders = ref<any[]>([])
const categoryData = ref<any[]>([])

const borrowRate = computed(() => {
  if (statistics.totalBooks === 0) return 0
  return ((statistics.borrowedBooks / statistics.totalBooks) * 100).toFixed(1)
})

// 加载统计数据
const loadStatistics = async () => {
  try {
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

    // 获取热门图书
    const popularResult = await window.api.borrowing.getPopular(10)
    if (popularResult.success) {
      popularBooks.value = popularResult.data
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
  } catch (error: any) {
    ElMessage.error('加载统计数据失败')
    console.error(error)
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
</style>
