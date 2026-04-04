<template>
  <el-popover
    v-model:visible="visible"
    placement="bottom-end"
    trigger="click"
    :width="430"
    :teleported="false"
    popper-class="notification-popover"
    @show="loadCenter"
  >
    <template #reference>
      <el-badge :value="badgeCount > 0 ? badgeCount : ''" :hidden="badgeCount === 0">
        <button class="icon-btn header-icon-btn notification-trigger" type="button">
          <el-icon><Bell /></el-icon>
        </button>
      </el-badge>
    </template>

    <div class="notification-panel">
      <div class="notification-header">
        <div>
          <div class="notification-title">通知中心</div>
          <div class="notification-subtitle">
            {{ unreadCount }} 条未读
            <template v-if="isStaff"> · {{ pendingRenewals.length }} 条待审批</template>
          </div>
        </div>
        <div class="notification-actions">
          <button class="tiny-btn" type="button" @click="loadCenter">刷新</button>
          <button class="tiny-btn" type="button" :disabled="unreadCount === 0" @click="markAllRead">已读</button>
        </div>
      </div>

      <el-tabs v-model="activeTab" class="notification-tabs">
        <el-tab-pane label="消息" name="messages">
          <div v-if="loading" class="notification-empty">加载中...</div>
          <div v-else-if="notifications.length === 0" class="notification-empty">暂无通知</div>
          <div v-else class="notification-list">
            <div
              v-for="item in notifications"
              :key="item.id"
              class="notification-item"
              :class="{ unread: !item.is_read }"
              @click="markRead(item)"
            >
              <div class="notification-item-head">
                <span class="notification-level" :class="item.level" />
                <span class="notification-item-title">{{ item.title }}</span>
                <span class="notification-item-time">{{ formatTime(item.created_at) }}</span>
              </div>
              <div class="notification-item-body">{{ item.content }}</div>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane v-if="isStaff" :label="`续借审批 (${pendingRenewals.length})`" name="renewals">
          <div v-if="loading" class="notification-empty">加载中...</div>
          <div v-else-if="pendingRenewals.length === 0" class="notification-empty">暂无待审批申请</div>
          <div v-else class="renewal-list">
            <div v-for="request in pendingRenewals" :key="request.id" class="renewal-card">
              <div class="renewal-title">{{ request.reader_name }} · {{ request.book_title }}</div>
              <div class="renewal-meta">
                <span>读者证：{{ request.reader_no }}</span>
                <span>当前应还：{{ request.due_date }}</span>
              </div>
              <div v-if="request.request_note" class="renewal-note">备注：{{ request.request_note }}</div>
              <div class="renewal-card-actions">
                <button
                  class="approve-btn"
                  type="button"
                  :disabled="reviewingIds.has(request.id)"
                  @click="approveRenewal(request)"
                >
                  {{ reviewingIds.has(request.id) ? '处理中...' : '通过' }}
                </button>
                <button
                  class="reject-btn"
                  type="button"
                  :disabled="reviewingIds.has(request.id)"
                  @click="rejectRenewal(request)"
                >
                  拒绝
                </button>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane v-if="isStaff" label="群发通知" name="broadcast">
          <div class="broadcast-form">
            <el-input v-model="broadcastForm.title" placeholder="通知标题" maxlength="40" show-word-limit />
            <el-input
              v-model="broadcastForm.content"
              type="textarea"
              :rows="5"
              maxlength="300"
              show-word-limit
              placeholder="请输入要发送给所有成员的通知内容"
            />
            <button class="broadcast-btn" type="button" :disabled="broadcastLoading" @click="sendBroadcast">
              {{ broadcastLoading ? '发送中...' : '发送通知' }}
            </button>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </el-popover>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Bell } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/user'
import { notificationApi, type NotificationItem } from '../api/notification.api'
import { borrowingApi, type RenewalRequest } from '../api/borrowing.api'

const userStore = useUserStore()
const isStaff = computed(() => ['admin', 'librarian'].includes(userStore.user?.role || ''))

const visible = ref(false)
const activeTab = ref('messages')
const loading = ref(false)
const broadcastLoading = ref(false)
const notifications = ref<NotificationItem[]>([])
const pendingRenewals = ref<RenewalRequest[]>([])
const unreadCount = ref(0)
const reviewingIds = ref(new Set<number>())
const broadcastForm = reactive({
  title: '',
  content: ''
})

const badgeCount = computed(() => unreadCount.value + (isStaff.value ? pendingRenewals.value.length : 0))

const emitRefresh = () => window.dispatchEvent(new Event('notifications:refresh'))

const loadCenter = async () => {
  loading.value = true
  try {
    const [notificationResult, renewalResult] = await Promise.all([
      notificationApi.getAll(24),
      isStaff.value ? borrowingApi.getPendingRenewalRequests() : Promise.resolve(null)
    ])

    if (notificationResult?.success) {
      notifications.value = notificationResult.data.items
      unreadCount.value = notificationResult.data.unreadCount
    }

    if (renewalResult?.success) {
      pendingRenewals.value = renewalResult.data
    } else {
      pendingRenewals.value = []
    }
  } finally {
    loading.value = false
  }
}

const markRead = async (item: NotificationItem) => {
  if (item.is_read) return
  const result = await notificationApi.markRead(item.id)
  if (result.success) {
    item.is_read = true
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  }
}

const markAllRead = async () => {
  const result = await notificationApi.markAllRead()
  if (!result.success) return
  notifications.value = notifications.value.map(item => ({ ...item, is_read: true }))
  unreadCount.value = 0
}

const approveRenewal = async (request: RenewalRequest) => {
  reviewingIds.value.add(request.id)
  try {
    const result = await borrowingApi.reviewRenewalRequest(request.id, 'approve')
    if (result.success) {
      ElMessage.success('续借申请已通过')
      emitRefresh()
      await loadCenter()
    } else {
      ElMessage.error(result.error?.message || '审批失败')
    }
  } finally {
    reviewingIds.value.delete(request.id)
  }
}

const rejectRenewal = async (request: RenewalRequest) => {
  let note = ''
  try {
    const promptResult = await ElMessageBox.prompt('可选填写拒绝原因，系统会自动通知读者。', '拒绝续借', {
      inputPlaceholder: '例如：该书已临近最大续借次数',
      confirmButtonText: '确认拒绝',
      cancelButtonText: '取消',
      distinguishCancelAndClose: true
    })
    note = promptResult.value || ''
  } catch {
    return
  }

  reviewingIds.value.add(request.id)
  try {
    const result = await borrowingApi.reviewRenewalRequest(request.id, 'reject', note)
    if (result.success) {
      ElMessage.success('续借申请已拒绝')
      emitRefresh()
      await loadCenter()
    } else {
      ElMessage.error(result.error?.message || '审批失败')
    }
  } finally {
    reviewingIds.value.delete(request.id)
  }
}

const sendBroadcast = async () => {
  if (!broadcastForm.title.trim() || !broadcastForm.content.trim()) {
    ElMessage.warning('请先填写通知标题和内容')
    return
  }

  broadcastLoading.value = true
  try {
    const result = await notificationApi.broadcast({
      title: broadcastForm.title.trim(),
      content: broadcastForm.content.trim()
    })

    if (result.success) {
      ElMessage.success('通知已发送给所有成员')
      broadcastForm.title = ''
      broadcastForm.content = ''
      activeTab.value = 'messages'
      emitRefresh()
      await loadCenter()
    } else {
      ElMessage.error(result.error?.message || '发送失败')
    }
  } finally {
    broadcastLoading.value = false
  }
}

const formatTime = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

let pollTimer: number | null = null

onMounted(() => {
  loadCenter()
  window.addEventListener('notifications:refresh', loadCenter)
  pollTimer = window.setInterval(loadCenter, 60000)
})

onUnmounted(() => {
  window.removeEventListener('notifications:refresh', loadCenter)
  if (pollTimer) window.clearInterval(pollTimer)
})
</script>

<style scoped>
.notification-trigger {
  position: relative;
}

.notification-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notification-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.notification-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

.notification-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-muted);
}

.notification-actions {
  display: flex;
  gap: 8px;
}

.tiny-btn {
  border: none;
  background: transparent;
  color: var(--gdut-red);
  cursor: pointer;
  font-size: 12px;
  padding: 0;
}

.tiny-btn:disabled {
  color: var(--text-muted);
  cursor: not-allowed;
}

.notification-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.notification-list,
.renewal-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 380px;
  overflow-y: auto;
  padding-right: 2px;
}

.notification-item,
.renewal-card {
  border: 1px solid rgba(255, 255, 255, 0.45);
  background: rgba(255, 255, 255, 0.54);
  border-radius: 14px;
  padding: 12px 14px;
}

.notification-item {
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.notification-item:hover {
  border-color: rgba(200, 16, 46, 0.18);
  transform: translateY(-1px);
}

.notification-item.unread {
  border-color: rgba(200, 16, 46, 0.28);
  box-shadow: 0 6px 18px rgba(200, 16, 46, 0.08);
}

.notification-item-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.notification-level {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.notification-level.info { background: var(--info); }
.notification-level.success { background: var(--success); }
.notification-level.warning { background: var(--warning); }
.notification-level.error { background: var(--danger); }

.notification-item-title,
.renewal-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
}

.notification-item-time {
  margin-left: auto;
  font-size: 11px;
  color: var(--text-muted);
}

.notification-item-body,
.renewal-meta,
.renewal-note {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.renewal-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
}

.renewal-card-actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.approve-btn,
.reject-btn,
.broadcast-btn {
  border: none;
  border-radius: 10px;
  padding: 9px 14px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}

.approve-btn {
  background: rgba(5, 150, 105, 0.12);
  color: var(--success);
}

.reject-btn {
  background: rgba(220, 38, 38, 0.10);
  color: var(--danger);
}

.approve-btn:disabled,
.reject-btn:disabled,
.broadcast-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.broadcast-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.broadcast-btn {
  background: var(--gradient-brand);
  color: #fff;
}

.notification-empty {
  padding: 28px 0;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}
</style>
