<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">{{ dashboardTitle }}</h2>
      <p class="text-secondary">欢迎回来，每一天都是阅读的好日子。</p>
    </div>

    <!-- 统计卡片组 -->
    <div class="stat-grid">
      <div class="glass-card stat-card" v-for="(item, i) in statCards" :key="i"
        :style="{ animationDelay: i * 0.1 + 's' }">
        <div class="stat-icon" :class="item.color">
          <component :is="item.icon" />
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ item.value }}</div>
          <div class="stat-label">{{ item.label }}</div>
        </div>
        <div class="stat-decoration"></div>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="dashboard-content">
      <!-- 借阅趋势图 -->
      <div class="glass-card chart-section">
        <div class="card-header">
          <h3>借阅趋势</h3>
          <el-tag size="small" effect="dark">近30天</el-tag>
        </div>
        <div class="chart-container" ref="chartRef"></div>
      </div>

      <!-- 热门推荐 -->
      <div class="glass-card list-section">
        <div class="card-header">
          <h3>热门借阅 TOP 5</h3>
        </div>
        <div class="book-list">
          <div v-for="(book, index) in hotBooks" :key="index" class="book-item">
            <div class="rank-badge" :class="{ 'top-3': index < 3 }">{{ index + 1 }}</div>
            <div class="book-detail">
              <span class="name">{{ book.book_title }}</span>
              <span class="author">{{ book.book_author }}</span>
            </div>
            <span class="count">{{ book.borrow_count }} 次</span>
          </div>
          <div v-if="hotBooks.length === 0" class="empty-tip">暂无数据</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Collection, User, Timer, Trophy } from '@element-plus/icons-vue'
import * as echarts from 'echarts'

const dashboardTitle = '运营概览'
const statCards = ref([
  { label: '藏书总量', value: '-', icon: Collection, color: 'blue' },
  { label: '借阅总次', value: '-', icon: User, color: 'green' },
  { label: '当前借出', value: '-', icon: Timer, color: 'orange' },
  { label: '逾期图书', value: '-', icon: Trophy, color: 'pink' }
])

const hotBooks = ref<any[]>([])
const chartRef = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null

const initChart = (data: any[]) => {
  if (!chartRef.value) return
  
  chartInstance = echarts.init(chartRef.value)
  
  const option = {
    tooltip: {
      trigger: 'axis'
    },
    grid: {
      top: '10%',
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data.map(item => item.date),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#94a3b8' }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f1f5f9' } },
      axisLabel: { color: '#94a3b8' }
    },
    series: [
      {
        name: '借阅量',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: data.map(item => item.count),
        itemStyle: { color: '#6366f1' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(99, 102, 241, 0.2)' },
            { offset: 1, color: 'rgba(99, 102, 241, 0)' }
          ])
        },
        lineStyle: { width: 3 }
      }
    ]
  }
  
  chartInstance.setOption(option)
}

const fetchData = async () => {
  try {
    // 1. 获取统计数据
    const statsResult = await window.api.borrowing.getStatistics()
    if (statsResult.success) {
      const stats = statsResult.data
      statCards.value[0].value = '200'
      statCards.value[1].value = stats.total_borrowed.toString()
      statCards.value[2].value = stats.currently_borrowed.toString()
      statCards.value[3].value = stats.overdue_count.toString()
      statCards.value[3].label = '逾期未还'
    }

    // 2. 获取热门图书
    const hotResult = await window.api.borrowing.getPopular(5)
    if (hotResult.success) {
      hotBooks.value = hotResult.data
    }

    // 3. 获取趋势数据
    const trendResult = await window.api.borrowing.getTrend(30)
    if (trendResult.success) {
      initChart(trendResult.data)
    }
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error)
  }
}

const handleResize = () => {
  chartInstance?.resize()
}

onMounted(() => {
  fetchData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
})
</script>

<style scoped>
.text-secondary {
  color: #64748b;
  font-size: 14px;
  margin-top: 4px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;
  margin-bottom: 24px;
}

.stat-card {
  padding: 24px;
  display: flex;
  align-items: center;
  position: relative;
  overflow: hidden;
  animation: fadeInUp 0.5s ease-out backwards;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin-right: 16px;
}

.stat-icon.blue {
  background: #e0e7ff;
  color: #4f46e5;
}

.stat-icon.green {
  background: #dcfce7;
  color: #16a34a;
}

.stat-icon.orange {
  background: #fef3c7;
  color: #d97706;
}

.stat-icon.pink {
  background: #fce7f3;
  color: #db2777;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.2;
}

.stat-label {
  font-size: 13px;
  color: #64748b;
}

.dashboard-content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  height: calc(100vh - 280px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.card-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.chart-section,
.list-section {
  padding: 24px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chart-container {
  flex: 1;
  width: 100%;
  min-height: 300px;
}

.book-list {
  flex: 1;
  overflow-y: auto;
}

.book-item {
  display: flex;
  align-items: center;
  padding: 12px 8px;
  border-radius: 8px;
  transition: background 0.2s;
}

.book-item:hover {
  background: rgba(241, 245, 249, 0.5);
}

.rank-badge {
  width: 24px;
  height: 24px;
  background: #f1f5f9;
  color: #64748b;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 12px;
  margin-right: 12px;
  flex-shrink: 0;
}

.rank-badge.top-3 {
  background: #e0e7ff;
  color: #4f46e5;
}

.book-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.book-detail .name {
  font-weight: 500;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.book-detail .author {
  font-size: 12px;
  color: #94a3b8;
}

.count {
  font-weight: 600;
  color: #333;
  font-size: 14px;
  margin-left: 8px;
  flex-shrink: 0;
}

.empty-tip {
  text-align: center;
  color: #94a3b8;
  padding: 20px;
  font-size: 14px;
}
</style>
