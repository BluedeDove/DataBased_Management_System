<template>
  <div class="dashboard">
    <!-- ===== Hero Greeting Bar ===== -->
    <section class="hero-bar">
      <div class="hero-bg-pattern" />
      <div class="hero-content">
        <div class="hero-text">
          <h1 class="hero-greeting">
            Hi, {{ userName }}!
            <span class="hero-brand">书脉——基于传承笔记的图书知识链路平台</span>
          </h1>
          <p class="hero-date">{{ currentDate }}</p>
        </div>
        <div class="hero-decor">
          <div class="decor-ring r1" />
          <div class="decor-ring r2" />
          <div class="decor-ring r3" />
        </div>
      </div>
    </section>

    <!-- ===== KPI Stat Cards ===== -->
    <section class="kpi-grid">
      <div
        v-for="(card, i) in kpiCards"
        :key="i"
        class="kpi-card glass-card anim-float animate-fade-in"
        :class="'anim-float-delay-' + (i % 4)"
        :style="{ animationDelay: i * 0.08 + 's' }"
      >
        <div class="kpi-icon" :style="{ background: card.iconBg }">
          <el-icon :size="22"><component :is="card.icon" /></el-icon>
        </div>
        <div class="kpi-body">
          <span class="kpi-value">{{ card.value }}</span>
          <span class="kpi-label">{{ card.label }}</span>
        </div>
        <div class="kpi-trend" :class="card.trendType">
          <el-icon :size="12"><component :is="card.trendIcon" /></el-icon>
          <span>{{ card.trendText }}</span>
        </div>
        <div class="kpi-line" :style="{ background: card.lineColor }" />
      </div>
    </section>

    <!-- ===== Charts Section ===== -->
    <section class="charts-row">
      <!-- Left: Trend Chart (Dark Card) -->
      <div class="chart-panel glass-card-dark anim-sheen">
        <div class="panel-header">
          <div class="panel-title-group">
            <div class="panel-dot" />
            <h3>借阅趋势</h3>
          </div>
          <div class="pill-badge">近 30 天</div>
        </div>
        <div ref="trendChartRef" class="chart-canvas" />
      </div>

      <!-- Right: Popular Books TOP5 -->
      <div class="chart-panel glass-card anim-sheen">
        <div class="panel-header">
          <div class="panel-title-group">
            <div class="panel-dot purple" />
            <h3>热门图书 TOP 5</h3>
          </div>
        </div>
        <div class="rank-list">
          <div
            v-for="(book, idx) in hotBooks"
            :key="idx"
            class="rank-item animate-fade-in"
            :style="{ animationDelay: idx * 0.06 + 's' }"
          >
            <div class="rank-badge" :class="{ 'rank-badge--top': idx < 3 }">
              {{ idx + 1 }}
            </div>
            <div class="rank-meta">
              <span class="rank-title">{{ book.book_title }}</span>
              <span class="rank-author">{{ book.author }}</span>
            </div>
            <div class="rank-bar-group">
              <div class="rank-bar-track">
                <div
                  class="rank-bar-fill"
                  :style="{
                    width: barWidth(book.borrow_count) + '%',
                    animationDelay: idx * 0.1 + 's'
                  }"
                />
              </div>
              <span class="rank-count">{{ book.borrow_count }} 次</span>
            </div>
          </div>
          <div v-if="!hotBooks.length" class="rank-empty">
            <el-icon :size="32" color="#CBD5E1"><Reading /></el-icon>
            <span>暂无借阅数据</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== Quick Links ===== -->
    <section class="quick-links">
      <div
        v-for="(link, i) in quickLinks"
        :key="i"
        class="ql-card glass-card animate-fade-in anim-sheen"
        :style="{ animationDelay: i * 0.06 + 's' }"
        @click="$router.push(link.path)"
      >
        <div class="ql-icon" :style="{ background: link.bg }">
          <el-icon :size="20"><component :is="link.icon" /></el-icon>
        </div>
        <div class="ql-text">
          <span class="ql-title">{{ link.title }}</span>
          <span class="ql-desc">{{ link.desc }}</span>
        </div>
        <el-icon class="ql-arrow" :size="16"><ArrowRight /></el-icon>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import {
  Collection, Timer, Warning, DataLine,
  Reading, ArrowRight, TrendCharts, TopRight,
  MagicStick, PieChart, Setting, User,
  ArrowUp, ArrowDown
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { borrowingApi } from '../api/borrowing.api'
import { bookApi } from '../api/book.api'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const isStaff = computed(() => ['admin', 'librarian'].includes(userStore.user?.role || ''))

// ── Computed helpers ──
const userName = computed(() => userStore.user?.name || '同学')
const currentDate = computed(() => {
  const d = new Date()
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日 星期${weekdays[d.getDay()]}`
})

// ── KPI Data ──
const kpiBookCount   = ref('--')
const kpiTotalBorrow = ref('--')
const kpiCurrent     = ref('--')
const kpiOverdue     = ref('--')

const kpiCards = computed(() => {
  const base = [
    {
      label: '馆藏总量',
      value: kpiBookCount.value,
      icon: Collection,
      iconBg: 'rgba(29, 78, 216, 0.10)',
      lineColor: 'linear-gradient(90deg, #3B82F6, #60A5FA)',
      trendType: 'up', trendIcon: ArrowUp, trendText: '实时'
    },
    {
      label: '借阅总次',
      value: kpiTotalBorrow.value,
      icon: DataLine,
      iconBg: 'rgba(5, 150, 105, 0.10)',
      lineColor: 'linear-gradient(90deg, #059669, #34D399)',
      trendType: 'up', trendIcon: ArrowUp, trendText: '累计'
    },
    {
      label: '当前借出',
      value: kpiCurrent.value,
      icon: Timer,
      iconBg: 'rgba(217, 119, 6, 0.10)',
      lineColor: 'linear-gradient(90deg, #D97706, #FBBF24)',
      trendType: 'neutral', trendIcon: ArrowRight, trendText: '进行中'
    }
  ]
  if (isStaff.value) {
    base.push({
      label: '逾期未还',
      value: kpiOverdue.value,
      icon: Warning,
      iconBg: 'rgba(200, 16, 46, 0.10)',
      lineColor: 'linear-gradient(90deg, #C8102E, #F87171)',
      trendType: 'down', trendIcon: ArrowDown, trendText: '需关注'
    })
  }
  return base
})

// ── Hot Books ──
const hotBooks = ref<any[]>([])
const maxBorrow = computed(() =>
  hotBooks.value.reduce((m, b) => Math.max(m, b.borrow_count || 0), 1)
)
const barWidth = (count: number) => Math.round((count / maxBorrow.value) * 100)

// ── Trend Chart ──
const trendChartRef = ref<HTMLElement | null>(null)
let trendChart: echarts.ECharts | null = null

const initTrendChart = (data: any[]) => {
  if (!trendChartRef.value) return
  if (trendChart) trendChart.dispose()

  trendChart = echarts.init(trendChartRef.value, undefined, { renderer: 'svg' })

  const display = data.length > 15 ? data.slice(-15) : data
  const xLabels = display.map((d: any) => {
    const s = String(d.date || d.day || '')
    return s.slice(5) // MM-DD
  })
  const values = display.map((d: any) => d.count || d.total || 0)

  trendChart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(28, 16, 51, 0.92)',
      borderColor: 'transparent',
      padding: [8, 14],
      textStyle: { color: '#fff', fontSize: 12, fontFamily: 'var(--font-sans)' },
      formatter: (params: any) => {
        const p = params[0]
        return `<div style="font-weight:600;margin-bottom:2px">${p.name}</div><div style="color:#FF6B8A">借阅 ${p.value} 次</div>`
      }
    },
    grid: {
      top: '10%', left: '3%', right: '3%', bottom: '6%', containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: xLabels,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)', type: 'dashed' } },
      axisLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 11 }
    },
    series: [{
      name: '借阅量',
      type: 'line',
      smooth: true,
      showSymbol: true,
      symbolSize: 6,
      data: values,
      itemStyle: { color: '#FF6B8A', borderWidth: 2, borderColor: '#FF6B8A' },
      lineStyle: { width: 3, color: '#FF6B8A', shadowColor: 'rgba(255,107,138,0.3)', shadowBlur: 10 },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(200, 16, 46, 0.35)' },
          { offset: 0.5, color: 'rgba(200, 16, 46, 0.12)' },
          { offset: 1, color: 'rgba(200, 16, 46, 0.02)' }
        ])
      }
    }]
  })
}

// ── Quick Links ──
const quickLinks = computed(() => {
  const links: any[] = [
    { title: '图书管理', desc: '浏览与管理馆藏图书', icon: Reading,     bg: 'linear-gradient(135deg, #C8102E20, #C8102E08)', path: '/books' },
    { title: '借还管理', desc: '办理借书与还书手续', icon: TrendCharts,  bg: 'linear-gradient(135deg, #7C3AED20, #7C3AED08)', path: '/borrowing' },
    { title: 'AI 助手',  desc: '智能图书推荐与问答', icon: MagicStick,   bg: 'linear-gradient(135deg, #D9770620, #D9770608)', path: '/ai-assistant' },
  ]
  if (isStaff.value) {
    links.splice(2, 0, { title: '统计分析', desc: '查看借阅数据报表', icon: PieChart, bg: 'linear-gradient(135deg, #05966920, #05966908)', path: '/statistics' })
  }
  return links
})

// ── Data Fetching ──
const fetchData = async () => {
  try {
    const [bookRes, statsRes, hotRes, trendRes] = await Promise.allSettled([
      borrowingApi.getBookCount(),
      borrowingApi.getStatistics(),
      borrowingApi.getPopular(5),
      borrowingApi.getTrend(30)
    ])

    // Book count
    if (bookRes.status === 'fulfilled' && bookRes.value?.success) {
      kpiBookCount.value = String(bookRes.value.data ?? 0)
    } else {
      kpiBookCount.value = '0'
    }

    // Statistics
    if (statsRes.status === 'fulfilled' && statsRes.value?.success) {
      const s = statsRes.value.data
      kpiTotalBorrow.value = String(s?.total_borrows ?? s?.total_borrowed ?? 0)
      kpiCurrent.value     = String(s?.current_borrows ?? s?.currently_borrowed ?? 0)
      kpiOverdue.value     = String(s?.overdue_count ?? 0)
    }

    // Popular books
    if (hotRes.status === 'fulfilled' && hotRes.value?.success) {
      hotBooks.value = hotRes.value.data || []
    }

    // Trend chart
    if (trendRes.status === 'fulfilled' && trendRes.value?.success) {
      await nextTick()
      initTrendChart(trendRes.value.data || [])
    }
  } catch (e) {
    console.error('Dashboard fetch error:', e)
  }
}

// ── Resize handler ──
const handleResize = () => trendChart?.resize()

onMounted(() => {
  fetchData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  trendChart?.dispose()
})
</script>

<style scoped>
/* ════════════════════════════════════════════
   Dashboard — Glassmorphism Redesign
   ════════════════════════════════════════════ */
.dashboard {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-bottom: 32px;
}

/* ===== Hero Greeting Bar ===== */
.hero-bar {
  position: relative;
  background: var(--gradient-brand);
  border-radius: var(--radius-card);
  padding: 32px 36px;
  overflow: hidden;
  animation: heroSheen 8s ease-in-out infinite;
}
@keyframes heroSheen {
  0%, 100% { box-shadow: 0 8px 32px rgba(200, 16, 46, 0.20); }
  50%      { box-shadow: 0 8px 40px rgba(200, 16, 46, 0.30), 0 0 0 1px rgba(255,255,255,0.08); }
}
.hero-bg-pattern {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 90% 20%, rgba(255,255,255,0.10) 0%, transparent 50%),
    radial-gradient(circle at 10% 80%, rgba(0,0,0,0.08) 0%, transparent 40%);
  pointer-events: none;
}
.hero-content {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.hero-greeting {
  font-size: 24px;
  font-weight: 800;
  color: var(--text-inverse);
  margin: 0 0 6px;
  letter-spacing: -0.3px;
}
.hero-brand {
  display: inline-flex;
  margin: 10px 0 0;
  padding: 3px 14px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  font-size: 13px;
  font-weight: 600;
  max-width: min(100%, 520px);
  line-height: 1.45;
  white-space: normal;
  backdrop-filter: blur(4px);
}
.hero-date {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.65);
  margin: 0;
}

/* Decorative rings */
.hero-decor {
  position: relative;
  width: 130px;
  height: 80px;
  flex-shrink: 0;
}
.decor-ring {
  position: absolute;
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 50%;
}
.r1 { width: 80px; height: 80px; right: 0; top: -10px; animation: ringBreath 5s ease-in-out infinite; }
.r2 { width: 50px; height: 50px; right: 50px; top: 10px; background: rgba(255,255,255,0.06); animation: ringBreath 7s ease-in-out infinite 1s; }
.r3 { width: 24px; height: 24px; right: 20px; top: 50px; background: rgba(255,255,255,0.10); animation: ringBreath 6s ease-in-out infinite 2s; }
@keyframes ringBreath {
  0%, 100% { transform: scale(1); opacity: 1; }
  50%      { transform: scale(1.08); opacity: 0.8; }
}

/* ===== Glass Card Utility ===== */
.glass-card {
  background: var(--bg-card);
  backdrop-filter: blur(18px) saturate(180%);
  -webkit-backdrop-filter: blur(18px) saturate(180%);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-glass);
}
.glass-card-dark {
  background: rgba(28, 16, 51, 0.62);
  backdrop-filter: blur(18px) saturate(180%);
  -webkit-backdrop-filter: blur(18px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-md);
  color: var(--text-inverse);
}
.glass-card {
  background: var(--bg-card);
  backdrop-filter: blur(18px) saturate(180%);
  -webkit-backdrop-filter: blur(18px) saturate(180%);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-glass);
}

/* Sheen sweep animation */
.anim-sheen { position: relative; overflow: hidden; }
.anim-sheen::after {
  content: '';
  position: absolute;
  top: 0; left: -100%;
  width: 50%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
  animation: sheenSweep 8s ease-in-out infinite;
  pointer-events: none;
  z-index: 1;
}
@keyframes sheenSweep {
  0%, 100% { left: -100%; }
  50%      { left: 150%; }
}

/* Float breathing animation */
.anim-float { animation: floatBreath 6s ease-in-out infinite; }
@keyframes floatBreath {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-3px); }
}

/* ===== KPI Stat Cards ===== */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.kpi-card {
  position: relative;
  background: var(--bg-card);
  backdrop-filter: blur(18px) saturate(180%);
  -webkit-backdrop-filter: blur(18px) saturate(180%);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-glass);
  padding: 22px 24px 20px;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 14px;
  overflow: hidden;
  cursor: default;
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s ease;
}
.kpi-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}
.kpi-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.kpi-icon .el-icon {
  color: var(--text-primary);
}
.kpi-body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.kpi-value {
  font-size: 32px;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1;
  letter-spacing: -1.5px;
}
.kpi-label {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 4px;
  font-weight: 500;
}
.kpi-trend {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  margin-left: auto;
}
.kpi-trend.up {
  background: rgba(5, 150, 105, 0.10);
  color: #059669;
}
.kpi-trend.neutral {
  background: rgba(217, 119, 6, 0.10);
  color: #D97706;
}
.kpi-trend.down {
  background: rgba(200, 16, 46, 0.10);
  color: #C8102E;
}
.kpi-line {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  border-radius: 0 0 var(--radius-card) var(--radius-card);
}

/* ===== Floating animation for KPI cards ===== */
.anim-float { animation: floatBreath 6s ease-in-out infinite; }
.anim-float-delay-0 { animation-delay: 0s; }
.anim-float-delay-1 { animation-delay: 1.5s; }
.anim-float-delay-2 { animation-delay: 3s; }
.anim-float-delay-3 { animation-delay: 4.5s; }
@keyframes floatBreath {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-4px); }
}

/* ===== Sheen animation ===== */
.anim-sheen { position: relative; overflow: hidden; }
.anim-sheen::after {
  content: '';
  position: absolute;
  top: 0; left: -100%;
  width: 50%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent);
  animation: sheenSweep 8s ease-in-out infinite;
  pointer-events: none;
  z-index: 1;
}
@keyframes sheenSweep {
  0%, 100% { left: -100%; }
  50%      { left: 150%; }
}

/* ===== Charts Row ===== */
.charts-row {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 16px;
  min-height: 340px;
}
.chart-panel {
  border-radius: var(--radius-card);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Panel header */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 14px;
  flex-shrink: 0;
}
.panel-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}
.panel-dot {
  width: 4px;
  height: 18px;
  border-radius: 2px;
  background: var(--gdut-red);
}
.panel-dot.purple {
  background: var(--gdut-purple);
}
.panel-header h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
}

/* Pill badge */
.pill-badge {
  padding: 4px 14px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(4px);
}

/* Chart canvas */
.chart-canvas {
  flex: 1;
  min-height: 240px;
  padding: 4px 8px 8px;
}

/* ===== Rank List (Popular Books) ===== */
.rank-list {
  flex: 1;
  padding: 8px 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
}
.rank-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 10px;
  border-radius: 12px;
  transition: background 0.2s ease;
}
.rank-item:hover {
  background: rgba(240, 238, 230, 0.5);
}
.rank-badge {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 800;
  flex-shrink: 0;
  background: rgba(240, 238, 230, 0.5);
  color: var(--text-muted);
  border: 1px solid var(--border-light);
}
.rank-badge--top {
  background: var(--gradient-brand);
  color: #fff;
  border: none;
}
.rank-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.rank-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rank-author {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}
.rank-bar-group {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  width: 100px;
}
.rank-bar-track {
  flex: 1;
  height: 6px;
  background: rgba(240, 238, 230, 0.5);
  border-radius: 3px;
  overflow: hidden;
}
.rank-bar-fill {
  height: 100%;
  border-radius: 3px;
  background: var(--gradient-brand);
  width: 0;
  animation: barGrow 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}
.rank-count {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
  white-space: nowrap;
  min-width: 32px;
  text-align: right;
}
.rank-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-muted);
  font-size: 13px;
  padding: 40px 0;
}

@keyframes barGrow {
  from { width: 0; }
  to { width: var(--w); }
}

/* ===== Quick Links ===== */
.quick-links {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}
.ql-card {
  padding: 20px 22px;
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.ql-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
}
.ql-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ql-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.ql-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}
.ql-desc {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}
.ql-arrow {
  color: var(--text-muted);
  transition: transform 0.2s ease, color 0.2s ease;
  flex-shrink: 0;
}
.ql-card:hover .ql-arrow {
  transform: translateX(3px);
  color: var(--gdut-red);
}

/* ===== Animations ===== */
.animate-fade-in {
  animation: fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) backwards;
}
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
