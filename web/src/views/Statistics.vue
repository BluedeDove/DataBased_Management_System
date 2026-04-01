<template>
  <div class="stats-page">
    <!-- Header -->
    <div class="page-header animate-fade-in">
      <div class="page-header-left">
        <div class="page-title">统计分析</div>
        <div class="page-subtitle">图书馆运营数据 · 可视化报告</div>
      </div>
    </div>

    <!-- Pill Tabs -->
    <div class="pill-tabs animate-fade-in-delay-1" style="margin-bottom: 24px">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="pill-tab"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >{{ tab.label }}</button>
    </div>

    <!-- 图书统计 -->
    <template v-if="activeTab === 'books'">
      <div class="two-col-grid animate-fade-in-delay-2">
        <div class="light-card">
          <div class="card-header-row">
            <div class="card-dot" style="background: var(--gdut-red)" />
            <div class="card-title" style="flex:1">类别分布</div>
            <span class="card-subtitle">按藏书数量</span>
          </div>
          <div ref="pieChartRef" class="chart-area" />
        </div>
        <div class="light-card">
          <div class="card-header-row">
            <div class="card-dot" style="background: var(--info)" />
            <div class="card-title" style="flex:1">类别明细</div>
            <span class="pill-badge red">{{ categoryStats.length }} 类</span>
          </div>
          <el-table :data="categoryStats" size="small" style="margin-top: 12px">
            <el-table-column prop="category_name" label="类别" />
            <el-table-column prop="book_count" label="总册数" align="right" width="80">
              <template #default="{ row }">
                <span style="font-weight: 700; color: var(--gdut-red)">{{ row.book_count }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="available_count" label="可借" align="right" width="80">
              <template #default="{ row }">
                <span style="font-weight: 700; color: var(--success)">{{ row.available_count }}</span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
      <div class="light-card animate-fade-in-delay-3" style="margin-top: 20px">
        <div class="card-header-row">
          <div class="card-dot" style="background: var(--gdut-purple)" />
          <div class="card-title" style="flex:1">热门借阅 TOP 10</div>
          <span class="card-subtitle">按借阅次数排序</span>
        </div>
        <div ref="barChartRef" class="chart-area" style="height: 320px" />
      </div>
    </template>

    <!-- 读者统计 -->
    <template v-if="activeTab === 'readers'">
      <div class="two-col-grid animate-fade-in-delay-2">
        <div class="light-card">
          <div class="card-header-row">
            <div class="card-dot" style="background: var(--gdut-purple)" />
            <div class="card-title" style="flex:1">活跃读者 TOP 10</div>
          </div>
          <div ref="readerChartRef" class="chart-area" />
        </div>
        <div class="light-card">
          <div class="card-header-row">
            <div class="card-dot" style="background: var(--info)" />
            <div class="card-title" style="flex:1">读者排行</div>
            <span class="pill-badge purple">TOP 20</span>
          </div>
          <el-table :data="activeReaders" size="small" style="margin-top: 12px">
            <el-table-column type="index" label="#" width="44">
              <template #default="{ $index }">
                <span class="rank-num" :class="{ top: $index < 3 }">{{ $index + 1 }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="reader_name" label="姓名" />
            <el-table-column prop="reader_no" label="编号" width="100" />
            <el-table-column prop="borrow_count" label="借阅" align="right" width="70">
              <template #default="{ row }">
                <span style="font-weight: 700; color: var(--gdut-red)">{{ row.borrow_count }}</span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </template>

    <!-- 借阅统计 -->
    <template v-if="activeTab === 'borrowing'">
      <div class="kpi-grid animate-fade-in-delay-2">
        <div v-for="kpi in borrowKpis" :key="kpi.label" class="stat-card kpi-card">
          <div class="kpi-icon-wrap" :style="{ background: kpi.tint }">
            <el-icon :style="{ color: kpi.color, fontSize: '20px' }"><component :is="kpi.icon" /></el-icon>
          </div>
          <div>
            <div class="kpi-val">{{ kpi.value }}</div>
            <div class="kpi-lbl">{{ kpi.label }}</div>
          </div>
          <div class="stat-decor" :style="{ background: kpi.color }" />
        </div>
      </div>
      <div class="light-card animate-fade-in-delay-3" style="margin-top: 20px">
        <div class="card-header-row">
          <div class="card-dot" style="background: var(--danger)" />
          <div class="card-title" style="flex:1">逾期记录</div>
          <span v-if="overdueRecords.length" class="pill-badge danger">{{ overdueRecords.length }} 条</span>
        </div>
        <el-table :data="overdueRecords" size="small" style="margin-top: 12px">
          <el-table-column prop="reader_name" label="读者" width="120" />
          <el-table-column prop="book_title" label="图书" />
          <el-table-column prop="due_date" label="应还日期" width="120" />
          <el-table-column label="逾期天数" align="center" width="100">
            <template #default="{ row }">
              <span class="pill-badge danger">{{ calcOverdueDays(row.due_date) }} 天</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { Collection, User, Timer, WarningFilled, TrendCharts } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { bookApi } from '../api/book.api'
import { borrowingApi } from '../api/borrowing.api'

const activeTab = ref('books')
const tabs = [
  { key: 'books', label: '图书统计' },
  { key: 'readers', label: '读者统计' },
  { key: 'borrowing', label: '借阅统计' },
]

const categoryStats = ref<any[]>([])
const popularBooks = ref<any[]>([])
const activeReaders = ref<any[]>([])
const borrowStats = ref<any>({})
const overdueRecords = ref<any[]>([])

const pieChartRef = ref<HTMLElement>()
const barChartRef = ref<HTMLElement>()
const readerChartRef = ref<HTMLElement>()

const COLORS = ['#C8102E','#7C3AED','#0EA5E9','#059669','#D97706','#EC4899','#6366F1','#14B8A6','#D97706','#DC2626']

const borrowKpis = computed(() => [
  { label: '总借阅量', value: borrowStats.value.total_borrowed || 0, icon: Collection, color: '#C8102E', tint: '#FEF2F2' },
  { label: '当前在借', value: borrowStats.value.currently_borrowed || 0, icon: Timer, color: '#059669', tint: '#ECFDF5' },
  { label: '逾期未还', value: borrowStats.value.overdue_count || 0, icon: WarningFilled, color: '#DC2626', tint: '#FEF2F2' },
  { label: '逾期记录', value: overdueRecords.value.length, icon: User, color: '#7C3AED', tint: '#F3EFFE' },
])

const calcOverdueDays = (dueDate: string) => {
  const diff = new Date().getTime() - new Date(dueDate).getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

const initPieChart = () => {
  if (!pieChartRef.value || !categoryStats.value.length) return
  const chart = echarts.init(pieChartRef.value)
  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', formatter: '{b}: {c} 册 ({d}%)' },
    legend: { bottom: '2%', left: 'center', textStyle: { color: '#64748B', fontSize: 11 }, itemWidth: 10, itemHeight: 10 },
    series: [{
      type: 'pie', radius: ['42%', '68%'], center: ['50%', '45%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 13, fontWeight: 'bold' } },
      data: categoryStats.value.slice(0, 10).map((c: any, i: number) => ({
        name: c.category_name, value: c.book_count,
        itemStyle: { color: COLORS[i % COLORS.length] }
      }))
    }]
  })
  window.addEventListener('resize', () => chart.resize())
}

const initBarChart = () => {
  if (!barChartRef.value || !popularBooks.value.length) return
  const chart = echarts.init(barChartRef.value)
  const top10 = popularBooks.value.slice(0, 10).reverse()
  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { top: '4%', left: '2%', right: '6%', bottom: '4%', containLabel: true },
    xAxis: { type: 'value', axisLabel: { color: '#94A3B8', fontSize: 11 }, splitLine: { lineStyle: { color: '#F1EFF0', type: 'dashed' } } },
    yAxis: {
      type: 'category',
      data: top10.map((b: any) => b.book_title?.length > 12 ? b.book_title.slice(0, 12) + '…' : b.book_title),
      axisLabel: { color: '#64748B', fontSize: 12 }, axisLine: { show: false }, axisTick: { show: false }
    },
    series: [{
      type: 'bar', barMaxWidth: 20,
      data: top10.map((b: any, i: number) => ({
        value: b.borrow_count,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: COLORS[i % COLORS.length] },
            { offset: 1, color: COLORS[(i + 2) % COLORS.length] }
          ]),
          borderRadius: [0, 6, 6, 0]
        }
      })),
      label: { show: true, position: 'right', color: '#64748B', fontSize: 11, formatter: '{c}' }
    }]
  })
  window.addEventListener('resize', () => chart.resize())
}

const initReaderChart = () => {
  if (!readerChartRef.value || !activeReaders.value.length) return
  const chart = echarts.init(readerChartRef.value)
  const top10 = activeReaders.value.slice(0, 10).reverse()
  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { top: '4%', left: '2%', right: '8%', bottom: '4%', containLabel: true },
    xAxis: { type: 'value', axisLabel: { color: '#94A3B8', fontSize: 11 }, splitLine: { lineStyle: { color: '#F1EFF0', type: 'dashed' } } },
    yAxis: {
      type: 'category', data: top10.map((r: any) => r.reader_name || ''),
      axisLabel: { color: '#64748B', fontSize: 12 }, axisLine: { show: false }, axisTick: { show: false }
    },
    series: [{
      type: 'bar', barMaxWidth: 20,
      data: top10.map((r: any) => ({
        value: r.borrow_count,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#7C3AED' }, { offset: 1, color: '#C8102E' }
          ]),
          borderRadius: [0, 6, 6, 0]
        }
      })),
      label: { show: true, position: 'right', color: '#64748B', fontSize: 11, formatter: '{c}' }
    }]
  })
  window.addEventListener('resize', () => chart.resize())
}

const loadStatistics = async () => {
  const [catRes, popRes, readRes, statsRes, overdueRes] = await Promise.allSettled([
    bookApi.getCategoryStatistics(),
    borrowingApi.getPopular(20),
    borrowingApi.getActiveReaders(20),
    borrowingApi.getStatistics(),
    borrowingApi.getOverdue()
  ])

  if (catRes.status === 'fulfilled' && catRes.value?.success) categoryStats.value = catRes.value.data
  if (popRes.status === 'fulfilled' && popRes.value?.success) popularBooks.value = popRes.value.data
  if (readRes.status === 'fulfilled' && readRes.value?.success) activeReaders.value = readRes.value.data
  if (statsRes.status === 'fulfilled' && statsRes.value?.success) borrowStats.value = statsRes.value.data
  if (overdueRes.status === 'fulfilled' && overdueRes.value?.success) overdueRecords.value = overdueRes.value.data

  await nextTick()
  initPieChart(); initBarChart(); initReaderChart()
}

watch(activeTab, async () => {
  await nextTick()
  initPieChart(); initBarChart(); initReaderChart()
})

onMounted(() => loadStatistics())
</script>

<style scoped>
.stats-page { display: flex; flex-direction: column; gap: 0; max-width: 1400px; }

/* Glass cards for stats */
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

.two-col-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

.card-header-row {
  display: flex; align-items: center; gap: 10px; margin-bottom: 16px;
}
.card-dot { width: 4px; height: 16px; border-radius: 2px; flex-shrink: 0; }

.chart-area { height: 260px; width: 100%; }

.rank-num {
  display: inline-flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; border-radius: 6px;
  font-size: 12px; font-weight: 700;
  background: var(--border-light); color: var(--text-muted);
}
.rank-num.top { background: var(--gdut-red-tint); color: var(--gdut-red); }

.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
.kpi-card { display: flex; align-items: center; gap: 16px; }
.kpi-icon-wrap {
  width: 48px; height: 48px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.kpi-val { font-size: 28px; font-weight: 700; color: var(--text-primary); letter-spacing: -0.5px; line-height: 1; }
.kpi-lbl { font-size: 13px; color: var(--text-muted); margin-top: 4px; }

@media (max-width: 1200px) {
  .two-col-grid { grid-template-columns: 1fr; }
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
