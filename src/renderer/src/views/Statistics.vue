<template>
  <div class="page-container">
    <div class="page-header">
      <div class="title-wrapper">
        <h1 class="page-title">
          统计分析
        </h1>
        <div class="gdut-line" />
      </div>
      <p class="page-description">
        查看图书馆运营数据和分析报告
      </p>
    </div>

    <el-tabs
      v-model="activeTab"
      class="custom-tabs"
    >
      <el-tab-pane name="books">
        <template #label>
          <span class="tab-label">
            <el-icon><Collection /></el-icon>
            图书统计
          </span>
        </template>
        <div class="glass-card stats-card">
          <div class="card-header">
            <div class="icon-box primary">
              <el-icon><Collection /></el-icon>
            </div>
            <div class="header-text">
              <h3>图书类别统计</h3>
              <p>各类别图书数量分布</p>
            </div>
          </div>
          <el-table
            :data="categoryStats"
            class="custom-table"
          >
            <el-table-column
              prop="category_name"
              label="类别"
            />
            <el-table-column
              prop="book_count"
              label="图书数量"
              align="right"
            >
              <template #default="{ row }">
                <span class="stat-number">{{ row.book_count }}</span>
              </template>
            </el-table-column>
            <el-table-column
              prop="available_count"
              label="可借数量"
              align="right"
            >
              <template #default="{ row }">
                <span class="stat-number success">{{ row.available_count }}</span>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div
          class="glass-card stats-card"
          style="margin-top: 24px"
        >
          <div class="card-header">
            <div class="icon-box pink">
              <el-icon><Trophy /></el-icon>
            </div>
            <div class="header-text">
              <h3>热门图书 TOP 20</h3>
              <p>借阅次数最多的图书</p>
            </div>
          </div>
          <el-table
            :data="popularBooks"
            class="custom-table"
          >
            <el-table-column
              type="index"
              label="#"
              width="60"
            >
              <template #default="{ $index }">
                <span
                  class="rank-badge"
                  :class="{ 'top-3': $index < 3 }"
                >{{ $index + 1 }}</span>
              </template>
            </el-table-column>
            <el-table-column
              prop="book_title"
              label="书名"
            />
            <el-table-column
              prop="book_author"
              label="作者"
            />
            <el-table-column
              prop="borrow_count"
              label="借阅次数"
              align="right"
            >
              <template #default="{ row }">
                <span class="stat-number primary">{{ row.borrow_count }}</span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane name="readers">
        <template #label>
          <span class="tab-label">
            <el-icon><User /></el-icon>
            读者统计
          </span>
        </template>
        <div class="glass-card stats-card">
          <div class="card-header">
            <div class="icon-box success">
              <el-icon><User /></el-icon>
            </div>
            <div class="header-text">
              <h3>活跃读者 TOP 20</h3>
              <p>借阅次数最多的读者</p>
            </div>
          </div>
          <el-table
            :data="activeReaders"
            class="custom-table"
          >
            <el-table-column
              type="index"
              label="#"
              width="60"
            >
              <template #default="{ $index }">
                <span
                  class="rank-badge"
                  :class="{ 'top-3': $index < 3 }"
                >{{ $index + 1 }}</span>
              </template>
            </el-table-column>
            <el-table-column
              prop="reader_name"
              label="姓名"
            />
            <el-table-column
              prop="reader_no"
              label="读者编号"
            />
            <el-table-column
              prop="borrow_count"
              label="借阅次数"
              align="right"
            >
              <template #default="{ row }">
                <span class="stat-number primary">{{ row.borrow_count }}</span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane name="borrowing">
        <template #label>
          <span class="tab-label">
            <el-icon><TrendCharts /></el-icon>
            借阅统计
          </span>
        </template>
        <div class="stat-cards">
          <div class="glass-card stat-card primary">
            <div class="stat-icon">
              <el-icon><Collection /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-title">
                总借阅量
              </div>
              <div class="stat-value">
                {{ borrowStats.total_borrowed || 0 }}
              </div>
            </div>
          </div>
          <div class="glass-card stat-card success">
            <div class="stat-icon">
              <el-icon><Timer /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-title">
                当前在借
              </div>
              <div class="stat-value">
                {{ borrowStats.currently_borrowed || 0 }}
              </div>
            </div>
          </div>
          <div class="glass-card stat-card danger">
            <div class="stat-icon">
              <el-icon><WarningFilled /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-title">
                逾期未还
              </div>
              <div class="stat-value">
                {{ borrowStats.overdue_count || 0 }}
              </div>
            </div>
          </div>
        </div>

        <div
          class="glass-card stats-card"
          style="margin-top: 24px"
        >
          <div class="card-header">
            <div class="icon-box danger">
              <el-icon><WarningFilled /></el-icon>
            </div>
            <div class="header-text">
              <h3>逾期记录</h3>
              <p>需要及时归还的图书</p>
            </div>
          </div>
          <el-table
            :data="overdueRecords"
            class="custom-table"
          >
            <el-table-column
              prop="reader_name"
              label="读者"
            />
            <el-table-column
              prop="book_title"
              label="图书"
            />
            <el-table-column
              prop="due_date"
              label="应还日期"
            />
            <el-table-column
              label="逾期天数"
              align="right"
            >
              <template #default="{ row }">
                <el-tag
                  type="danger"
                  effect="dark"
                >
                  {{ calculateOverdueDays(row.due_date) }}天
                </el-tag>
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
import { Collection, User, Trophy, Timer, TrendCharts, WarningFilled } from '@element-plus/icons-vue'

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

<style scoped>
.title-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.gdut-line {
  width: 30px;
  height: 3px;
  background: var(--gdut-red);
  border-radius: 2px;
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

/* 统计卡片 */
.stats-card {
padding: 24px;
animation: fadeInUp 0.4s ease-out;
}

.card-header {
display: flex;
align-items: center;
gap: 16px;
margin-bottom: 20px;
padding-bottom: 16px;
border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.header-text h3 {
margin: 0 0 4px 0;
font-size: 18px;
font-weight: 600;
color: var(--text-main);
}

.header-text p {
margin: 0;
font-size: 13px;
color: var(--text-secondary);
}

/* 统计数字卡片 */
.stat-cards {
display: grid;
grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
gap: 20px;
margin-bottom: 24px;
}

.stat-card {
display: flex;
align-items: center;
gap: 20px;
padding: 24px;
transition: all 0.3s ease;
}

.stat-card:hover {
transform: translateY(-4px);
box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
}

.stat-card.primary .stat-icon {
background: linear-gradient(135deg, #e0e7ff, #c7d2fe);
color: var(--primary-color);
}

.stat-card.success .stat-icon {
background: linear-gradient(135deg, #d1fae5, #a7f3d0);
color: var(--success-color);
}

.stat-card.danger .stat-icon {
background: linear-gradient(135deg, #fee2e2, #fecaca);
color: var(--danger-color);
}

.stat-icon {
width: 56px;
height: 56px;
border-radius: 16px;
display: flex;
align-items: center;
justify-content: center;
font-size: 24px;
flex-shrink: 0;
}

.stat-content {
flex: 1;
}

.stat-title {
font-size: 13px;
color: var(--text-secondary);
margin-bottom: 8px;
font-weight: 500;
}

.stat-value {
font-size: 28px;
font-weight: 700;
color: var(--text-main);
line-height: 1;
}

/* 排名徽章 */
.rank-badge {
display: inline-flex;
align-items: center;
justify-content: center;
width: 28px;
height: 28px;
border-radius: 8px;
background: #f1f5f9;
color: var(--text-secondary);
font-weight: 700;
font-size: 13px;
}

.rank-badge.top-3 {
background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
color: white;
box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
}

/* 统计数字 */
.stat-number {
font-weight: 600;
font-size: 15px;
}

.stat-number.primary {
color: var(--primary-color);
}

.stat-number.success {
color: var(--success-color);
}

/* 表格样式 */
:deep(.custom-table) {
border-radius: 8px;
overflow: hidden;
}

:deep(.custom-table .el-table__header-wrapper) {
background: rgba(248, 250, 252, 0.8);
}

:deep(.custom-table .el-table__body tr) {
transition: all 0.2s ease;
}

:deep(.custom-table .el-table__body tr:hover) {
background: rgba(99, 102, 241, 0.04) !important;
transform: scale(1.005);
}
</style>
