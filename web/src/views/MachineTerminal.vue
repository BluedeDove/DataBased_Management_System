<template>
  <div class="machine-page">
    <div class="machine-header">
      <div>
        <h1>自助借还终端</h1>
        <p>借书必须完成读者本人借阅 PIN 核验；还书只需扫描实体书条码。</p>
      </div>
      <div class="header-actions">
        <button class="ghost-btn" @click="handleResetTerminal">清屏重置</button>
        <button class="ghost-btn" @click="handleLogout">退出终端</button>
      </div>
    </div>

    <div class="machine-grid">
      <section class="panel">
        <h2>识别读者</h2>
        <div class="inline-form">
          <el-input
            v-model="readerNo"
            clearable
            placeholder="请输入或扫描读者证号"
            @keyup.enter="loadReader()"
          />

          <button class="primary-btn" :disabled="loadingReader" @click="loadReader()">
            {{ loadingReader ? '识别中...' : '识别读者' }}
          </button>
        </div>

        <div v-if="readerInfo" class="info-card">
          <div class="info-title">{{ readerInfo.display_name }}</div>
          <div class="info-item">证号：{{ readerInfo.reader_no }}</div>
          <div class="info-item">类别：{{ readerInfo.category_name }}</div>
          <div class="info-item">当前在借：{{ readerInfo.current_borrowing_count }} / {{ readerInfo.max_borrow_count }}</div>
          <div class="info-item">身份状态：{{ readerInfo.is_verified ? '已核验' : '待核验' }}</div>
          <div class="info-item">PIN 状态：{{ readerInfo.borrow_pin_configured ? '已设置' : '未设置' }}</div>
          <div class="info-item" :class="{ danger: readerInfo.has_overdue_books }">
            {{ readerInfo.has_overdue_books ? '该读者存在逾期图书，当前不可继续借新书。' : '读者借阅资格正常。' }}
          </div>
          <div v-if="readerInfo.is_verified && readerInfo.verification_expires_at" class="info-item success">
            本次核验有效至：{{ formatDateTime(readerInfo.verification_expires_at) }}
          </div>
        </div>

        <div v-if="readerInfo" class="verification-box">
          <div class="verification-title">借阅 PIN 核验</div>
          <div v-if="!readerInfo.borrow_pin_configured" class="verification-tip danger">
            该读者尚未设置借阅 PIN，请先在线上账号设置或联系馆员初始化。
          </div>
          <template v-else>
            <div class="inline-form">
              <el-input
                v-model="borrowPin"
                type="password"
                maxlength="6"
                show-password
                placeholder="请输入 4-6 位借阅 PIN"
                @keyup.enter="verifyReader()"
              />
              <button class="primary-btn" :disabled="verifyingReader" @click="verifyReader()">
                {{ verifyingReader ? '核验中...' : '核验身份' }}
              </button>
            </div>
            <p class="panel-tip">核验通过后才会展示完整读者姓名，并允许机器终端执行借书。</p>
          </template>
        </div>
      </section>

      <section class="panel">
        <h2>扫描副本条码</h2>
        <div class="inline-form">
          <el-autocomplete
            v-model="barcode"
            :fetch-suggestions="queryCopySuggestions"
            :debounce="120"
            clearable
            placeholder="请输入或扫描图书条码"
            @select="handleCopySelect"
            @keydown.enter="loadCopy()"
          >
            <template #default="{ item }">
              <div class="suggestion-item">
                <div class="suggestion-title">{{ item.title }} · {{ item.barcode }}</div>
                <div class="suggestion-meta">{{ item.author }} · {{ copyStatusLabel(item.status) }}</div>
              </div>
            </template>
          </el-autocomplete>

          <button class="primary-btn" :disabled="loadingCopy" @click="loadCopy()">
            {{ loadingCopy ? '识别中...' : '识别条码' }}
          </button>
        </div>

        <div v-if="copyInfo" class="info-card">
          <div class="info-title">{{ copyInfo.copy.title }}</div>
          <div class="info-item">作者：{{ copyInfo.copy.author }}</div>
          <div class="info-item">ISBN：{{ copyInfo.copy.isbn }}</div>
          <div class="info-item">条码：{{ copyInfo.copy.barcode }}</div>
          <div class="info-item">副本状态：{{ copyStatusLabel(copyInfo.copy.status) }}</div>
          <div class="info-item">馆藏状态：{{ bookStatusLabel(copyInfo.copy.book_status) }}</div>
          <div v-if="copyInfo.active_borrowing" class="info-item">应还日期：{{ copyInfo.active_borrowing.due_date }}</div>
          <div class="info-item action-hint" :class="{ danger: copyInfo.suggested_action === 'unavailable' }">
            {{ copyInfo.action_hint }}
          </div>
        </div>
      </section>
    </div>

    <section class="panel">
      <h2>终端操作</h2>
      <div class="action-row">
        <button class="primary-btn large" :disabled="!canBorrow || submitting" @click="borrowBook">
          {{ submitting && submitMode === 'borrow' ? '借出中...' : '扫码借出实体书' }}
        </button>
        <button class="secondary-btn large" :disabled="!canReturn || submitting" @click="returnBook">
          {{ submitting && submitMode === 'return' ? '归还中...' : '扫码归还实体书' }}
        </button>
      </div>
      <p class="panel-tip">{{ operationHint }}</p>
    </section>

    <section v-if="lastResult" class="panel">
      <h2>最近结果</h2>
      <div class="result-card" :class="lastResult.success ? 'success' : 'danger'">
        <div class="result-title">{{ lastResult.title }}</div>
        <p>{{ lastResult.message }}</p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/user'
import {
  machineApi,
  type MachineCopySuggestion,
  type MachineCopySummary,
  type MachineReaderSummary
} from '@/api/machine.api'

const router = useRouter()
const userStore = useUserStore()

const AUTO_CLEAR_MS = 90_000

const readerNo = ref('')
const borrowPin = ref('')
const barcode = ref('')
const readerInfo = ref<MachineReaderSummary | null>(null)
const copyInfo = ref<MachineCopySummary | null>(null)
const verificationToken = ref('')
const loadingReader = ref(false)
const verifyingReader = ref(false)
const loadingCopy = ref(false)
const submitting = ref(false)
const submitMode = ref<'borrow' | 'return' | ''>('')
const lastResult = ref<{ success: boolean; title: string; message: string } | null>(null)

let autoClearTimer: ReturnType<typeof setTimeout> | null = null

const verificationExpired = computed(() => {
  if (!readerInfo.value?.verification_expires_at) return false
  return new Date(readerInfo.value.verification_expires_at).getTime() <= Date.now()
})

const canBorrow = computed(() => {
  if (!readerInfo.value || !copyInfo.value) return false
  if (!verificationToken.value || !readerInfo.value.is_verified || verificationExpired.value) return false
  if (copyInfo.value.suggested_action !== 'borrow') return false
  if (readerInfo.value.status !== 'active') return false
  if (readerInfo.value.has_overdue_books) return false
  return readerInfo.value.current_borrowing_count < readerInfo.value.max_borrow_count
})

const canReturn = computed(() => !!copyInfo.value && copyInfo.value.suggested_action === 'return')

const operationHint = computed(() => {
  if (!copyInfo.value) {
    return '借书前需要先识别读者并扫描条码；还书只需扫描条码。'
  }

  if (copyInfo.value.suggested_action === 'return') {
    return '该副本当前处于在借状态，可直接扫描归还，无需输入借阅 PIN。'
  }

  if (copyInfo.value.suggested_action === 'unavailable') {
    return copyInfo.value.action_hint
  }

  if (!readerInfo.value) {
    return '此副本可借出，请先识别读者证。'
  }

  if (!readerInfo.value.borrow_pin_configured) {
    return '该读者尚未设置借阅 PIN，请先在线上账号中设置。'
  }

  if (!readerInfo.value.is_verified || !verificationToken.value) {
    return '请输入借阅 PIN 完成读者本人核验后，再借出实体书。'
  }

  if (verificationExpired.value) {
    return '本次读者核验已过期，请重新输入借阅 PIN。'
  }

  if (readerInfo.value.has_overdue_books) {
    return '该读者存在逾期图书，当前不可继续借新书。'
  }

  if (readerInfo.value.current_borrowing_count >= readerInfo.value.max_borrow_count) {
    return '该读者已达到借阅上限，终端不会继续借出。'
  }

  return '已完成读者核验，可以继续扫码借出实体书。'
})

const resetAutoClearTimer = () => {
  if (autoClearTimer) clearTimeout(autoClearTimer)
  autoClearTimer = setTimeout(() => {
    clearTerminalState()
    ElMessage.info('终端长时间无操作，已自动清屏。')
  }, AUTO_CLEAR_MS)
}

const clearTerminalState = () => {
  readerNo.value = ''
  borrowPin.value = ''
  barcode.value = ''
  readerInfo.value = null
  copyInfo.value = null
  verificationToken.value = ''
  lastResult.value = null
}

const handleResetTerminal = () => {
  clearTerminalState()
  resetAutoClearTimer()
  ElMessage.success('终端已重置。')
}

const formatDateTime = (value?: string) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { hour12: false })
}

const bookStatusLabel = (status: string) => {
  const labelMap: Record<string, string> = {
    normal: '正常',
    damaged: '待修复',
    lost: '已遗失',
    destroyed: '已注销'
  }

  return labelMap[status] || status
}

const copyStatusLabel = (status: string) => {
  const labelMap: Record<string, string> = {
    available: '可借出',
    borrowed: '借出中',
    reserved: '已预约',
    lost: '已遗失',
    damaged: '已损坏',
    maintenance: '维护中'
  }

  return labelMap[status] || status
}

const queryCopySuggestions = async (
  queryString: string,
  callback: (items: MachineCopySuggestion[]) => void
) => {
  const query = queryString.trim()
  if (query.length < 3) {
    callback([])
    return
  }

  try {
    const result = await machineApi.getCopySuggestions(query)
    callback((result.data || []).map(item => ({ ...item, value: item.barcode })))
  } catch {
    callback([])
  }
}

const loadReader = async (targetReaderNo = readerNo.value) => {
  const nextReaderNo = targetReaderNo.trim()
  if (!nextReaderNo) {
    ElMessage.warning('请先输入读者证号')
    return
  }

  loadingReader.value = true
  try {
    const result = await machineApi.getReaderSummary(nextReaderNo)
    if (result.success && result.data) {
      readerNo.value = result.data.reader_no
      readerInfo.value = result.data
      borrowPin.value = ''
      verificationToken.value = ''
      ElMessage.success('已识别读者证')
    }
  } catch (error: any) {
    readerInfo.value = null
    verificationToken.value = ''
    ElMessage.error(error?.response?.data?.error?.message || error?.message || '识别读者失败')
  } finally {
    loadingReader.value = false
    resetAutoClearTimer()
  }
}

const verifyReader = async () => {
  if (!readerInfo.value) {
    ElMessage.warning('请先识别读者')
    return
  }

  if (!readerInfo.value.borrow_pin_configured) {
    ElMessage.warning('该读者尚未设置借阅 PIN')
    return
  }

  if (!/^\d{4,6}$/.test(borrowPin.value.trim())) {
    ElMessage.warning('请输入 4-6 位数字借阅 PIN')
    return
  }

  verifyingReader.value = true
  try {
    const result = await machineApi.verifyReader(readerInfo.value.reader_no, borrowPin.value.trim())
    if (result.success && result.data) {
      readerInfo.value = result.data.reader
      verificationToken.value = result.data.verification_token
      borrowPin.value = ''
      ElMessage.success('读者身份核验成功')
    }
  } catch (error: any) {
    verificationToken.value = ''
    const message = error?.response?.data?.error?.message || error?.message || '读者核验失败'
    ElMessage.error(message)
  } finally {
    verifyingReader.value = false
    resetAutoClearTimer()
  }
}

const loadCopy = async (targetBarcode = barcode.value) => {
  const nextBarcode = targetBarcode.trim()
  if (!nextBarcode) {
    ElMessage.warning('请先输入图书条码')
    return
  }

  loadingCopy.value = true
  try {
    const result = await machineApi.getCopySummary(nextBarcode)
    if (result.success && result.data) {
      barcode.value = result.data.copy.barcode
      copyInfo.value = result.data
      ElMessage.success(`已识别副本：${result.data.copy.title}`)
    }
  } catch (error: any) {
    copyInfo.value = null
    ElMessage.error(error?.response?.data?.error?.message || error?.message || '识别条码失败')
  } finally {
    loadingCopy.value = false
    resetAutoClearTimer()
  }
}

const handleCopySelect = async (item: MachineCopySuggestion) => {
  await loadCopy(item.barcode)
}

const borrowBook = async () => {
  if (!readerInfo.value || !barcode.value.trim() || !verificationToken.value) return

  submitting.value = true
  submitMode.value = 'borrow'
  try {
    const result = await machineApi.borrow(readerInfo.value.reader_no, barcode.value.trim(), verificationToken.value)
    if (result.success && result.data) {
      lastResult.value = {
        success: true,
        title: '借出成功',
        message: `《${result.data.copy.title}》已借给 ${result.data.reader.name || result.data.reader.reader_no}`
      }
      ElMessage.success('借出成功')
      if (readerInfo.value) {
        readerInfo.value = {
          ...readerInfo.value,
          display_name: result.data.reader.name || readerInfo.value.display_name,
          current_borrowing_count: readerInfo.value.current_borrowing_count + 1,
          is_verified: true
        }
      }
      barcode.value = ''
      copyInfo.value = null
    }
  } catch (error: any) {
    const message = error?.response?.data?.error?.message || error?.message || '借出失败'
    lastResult.value = { success: false, title: '借出失败', message }
    ElMessage.error(message)
  } finally {
    submitting.value = false
    submitMode.value = ''
    resetAutoClearTimer()
  }
}

const returnBook = async () => {
  if (!barcode.value.trim()) return

  submitting.value = true
  submitMode.value = 'return'
  try {
    const result = await machineApi.returnByBarcode(barcode.value.trim())
    if (result.success && result.data) {
      lastResult.value = {
        success: true,
        title: '归还成功',
        message: `《${result.data.copy.title}》已成功归还`
      }
      ElMessage.success('归还成功')
      barcode.value = ''
      copyInfo.value = null
    }
  } catch (error: any) {
    const message = error?.response?.data?.error?.message || error?.message || '归还失败'
    lastResult.value = { success: false, title: '归还失败', message }
    ElMessage.error(message)
  } finally {
    submitting.value = false
    submitMode.value = ''
    resetAutoClearTimer()
  }
}

const handleLogout = async () => {
  userStore.logout()
  await router.replace('/login')
}

watch([readerNo, borrowPin, barcode], () => {
  resetAutoClearTimer()
})

watch(readerNo, value => {
  if (readerInfo.value && value.trim() !== readerInfo.value.reader_no) {
    readerInfo.value = null
    verificationToken.value = ''
    borrowPin.value = ''
  }
})

watch(barcode, value => {
  if (copyInfo.value && value.trim() !== copyInfo.value.copy.barcode) {
    copyInfo.value = null
  }
})

resetAutoClearTimer()

onBeforeUnmount(() => {
  if (autoClearTimer) clearTimeout(autoClearTimer)
})
</script>

<style scoped>
.machine-page {
  min-height: 100vh;
  padding: 28px;
  background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 45%, #fff7ed 100%);
}

.machine-header,
.panel {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.82);
  border-radius: 24px;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08);
}

.machine-header {
  padding: 24px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22px;
  gap: 16px;
}

.machine-header h1 {
  margin: 0 0 8px;
  font-size: 32px;
  color: #0f172a;
}

.machine-header p {
  margin: 0;
  color: #64748b;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.machine-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px;
  margin-bottom: 22px;
}

.panel {
  padding: 24px;
  margin-bottom: 22px;
}

.panel h2 {
  margin: 0 0 16px;
  color: #0f172a;
}

.inline-form,
.action-row {
  display: flex;
  gap: 12px;
  align-items: stretch;
}

.inline-form :deep(.el-autocomplete),
.inline-form :deep(.el-input) {
  flex: 1;
}

.inline-form :deep(.el-input__wrapper) {
  min-height: 48px;
  border-radius: 16px;
}

.verification-box {
  margin-top: 18px;
  padding: 18px;
  border-radius: 18px;
  background: rgba(124, 58, 237, 0.06);
  border: 1px solid rgba(124, 58, 237, 0.12);
}

.verification-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 12px;
}

.verification-tip {
  margin: 0;
  color: #475569;
}

.ghost-btn,
.primary-btn,
.secondary-btn {
  border: none;
  border-radius: 16px;
  cursor: pointer;
  font-weight: 600;
}

.ghost-btn {
  height: 46px;
  padding: 0 18px;
  background: #eef2ff;
  color: #334155;
}

.primary-btn,
.secondary-btn {
  min-width: 148px;
  height: 48px;
}

.primary-btn {
  color: #fff;
  background: linear-gradient(135deg, #c8102e 0%, #7c3aed 100%);
}

.secondary-btn {
  color: #334155;
  background: #e2e8f0;
}

.primary-btn:disabled,
.secondary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.large {
  min-width: 190px;
}

.info-card,
.result-card {
  margin-top: 16px;
  padding: 18px;
  border-radius: 18px;
  background: #f8fafc;
}

.info-title,
.result-title {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 10px;
}

.info-item {
  margin-top: 8px;
  color: #475569;
}

.info-item.danger,
.action-hint.danger,
.verification-tip.danger {
  color: #dc2626;
}

.info-item.success {
  color: #166534;
}

.action-hint {
  font-weight: 600;
}

.panel-tip {
  margin: 14px 0 0;
  color: #64748b;
}

.result-card.success {
  background: #ecfdf5;
  color: #166534;
}

.result-card.danger {
  background: #fef2f2;
  color: #991b1b;
}

.suggestion-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 2px 0;
}

.suggestion-title {
  font-weight: 600;
  color: #0f172a;
}

.suggestion-meta {
  font-size: 12px;
  color: #64748b;
}

@media (max-width: 960px) {
  .machine-grid {
    grid-template-columns: 1fr;
  }

  .machine-header,
  .header-actions,
  .inline-form,
  .action-row {
    flex-direction: column;
  }

  .primary-btn,
  .secondary-btn,
  .ghost-btn {
    width: 100%;
  }
}
</style>
