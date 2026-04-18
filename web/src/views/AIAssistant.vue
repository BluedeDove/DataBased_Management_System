<template>
  <div class="ai-page">
    <aside class="history-panel">
      <div class="panel-header">
        <div>
          <div class="panel-title">AI 智能图书馆</div>
          <div class="panel-subtitle">{{ isAIOnline ? '服务在线' : '服务未连接' }}</div>
        </div>
        <button class="ghost-icon-btn" @click="startNewChat">
          <el-icon><Plus /></el-icon>
        </button>
      </div>

      <div class="sidebar-search">
        <el-icon><Search /></el-icon>
        <input v-model="historySearch" type="text" placeholder="搜索历史对话">
      </div>

      <div class="stats-box">
        <div class="stats-item">
          <span class="stats-value">{{ totalVectors }}</span>
          <span class="stats-label">向量数量</span>
        </div>
        <div class="stats-item">
          <span class="stats-value">{{ vectorCoverage }}%</span>
          <span class="stats-label">覆盖率</span>
        </div>
      </div>

      <div class="history-list">
        <button
          v-for="conversation in filteredConversations"
          :key="conversation.id"
          class="history-item"
          :class="{ active: currentConversationId === conversation.id }"
          @click="loadConversation(conversation)"
        >
          <div class="history-text">
            <div class="history-title">{{ conversation.title }}</div>
            <div class="history-time">{{ formatDate(conversation.updated_at || conversation.created_at) }}</div>
          </div>
          <span class="history-delete" @click.stop="deleteConversation(conversation)">×</span>
        </button>
        <div v-if="filteredConversations.length === 0" class="history-empty">暂无历史对话</div>
      </div>
    </aside>

    <main class="chat-panel">
      <header class="chat-header">
        <div>
          <h1>AI 智能图书馆</h1>
          <p>默认只帮你找书、推荐、预约与查询，不会在线上直接借走实体书。</p>
        </div>
        <button class="ghost-btn" @click="showRecommend = !showRecommend">
          <el-icon><Reading /></el-icon>
          <span>{{ showRecommend ? '收起推荐' : '展开推荐' }}</span>
        </button>
      </header>

      <div ref="messagesRef" class="messages">
        <div v-for="message in chatHistory" :key="message.id" class="message-row" :class="message.role">
          <div class="message-avatar">{{ message.role === 'assistant' ? 'AI' : '我' }}</div>
          <div class="message-bubble" :class="message.role">
            <div v-if="message.toolCalls?.length" class="tool-list">
              <div v-for="toolCall in message.toolCalls" :key="toolCall.id" class="tool-item">
                <span>{{ toolCall.displayName }}</span>
                <span>{{ toolCall.status === 'started' ? '执行中' : '已完成' }}</span>
              </div>
            </div>
            <div v-if="message.loading" class="typing">AI 正在思考…</div>
            <div v-else class="markdown-body" v-html="formatContent(message.content)" />
            <div class="message-time">{{ formatTime(message.timestamp) }}</div>
          </div>
        </div>
      </div>

      <div class="quick-prompts">
        <button class="prompt-chip" @click="setPrompt('请根据我的课程方向推荐 3 本值得借的书')">课程推荐</button>
        <button class="prompt-chip" @click="setPrompt('我想找适合入门机器学习的实体书')">机器学习入门</button>
        <button class="prompt-chip" @click="setPrompt('有没有适合复习数据结构的馆藏图书')">数据结构复习</button>
        <button class="prompt-chip" @click="setPrompt('帮我找一些冷门但高质量的算法书')">反热门推荐</button>
      </div>

      <div class="input-box">
        <el-input
          v-model="inputMessage"
          type="textarea"
          :rows="3"
          resize="none"
          placeholder="输入你的问题，例如：帮我推荐可预约的人工智能实体书"
          :disabled="loading"
          @keydown.enter.prevent="sendMessage"
        />
        <div class="input-actions">
          <button v-if="loading" class="ghost-btn" @click="stopGeneration">
            <el-icon><VideoPause /></el-icon>
            <span>停止</span>
          </button>
          <button class="primary-btn" :disabled="loading" @click="sendMessage">
            <el-icon><Promotion /></el-icon>
            <span>{{ loading ? '发送中…' : '发送' }}</span>
          </button>
        </div>
      </div>
    </main>

    <aside v-show="showRecommend" class="recommend-panel">
      <div class="panel-header">
        <div>
          <div class="panel-title">推荐书单</div>
          <div class="panel-subtitle">{{ recAiPowered ? '由 AI 对话驱动' : '等待对话触发' }}</div>
        </div>
      </div>

      <div v-if="recommendedBooks.length === 0" class="recommend-empty">
        发起对话后，AI 会把适合预约的实体书放到这里。
      </div>

      <div v-else class="recommend-list">
        <div v-for="book in recommendedBooks" :key="book.id" class="recommend-item">
          <div class="recommend-head">
            <div>
              <div class="recommend-title">{{ book.title }}</div>
              <div class="recommend-meta">{{ book.author }} · {{ book.category_name || '未分类' }}</div>
            </div>
            <span class="pill-badge" :class="bookMeta(book).badgeClass">{{ bookMeta(book).label }}</span>
          </div>
          <div class="recommend-meta">库存 {{ book.available_quantity }} / {{ book.total_quantity }}</div>
          <div class="recommend-hint">{{ reservationButtonHint(book) }}</div>
          <div class="recommend-actions">
            <button class="ghost-btn" @click="viewInBooks(book)">去图书页</button>
            <button
              class="primary-btn small"
              :title="reservationButtonHint(book)"
              :disabled="!canReserveBook(book)"
              @click="handleReserve(book)"
            >
              {{ reservationButtonLabel(book) }}
            </button>
          </div>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { ElMessage } from 'element-plus'
import { Search, Plus, Reading, Promotion, VideoPause } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/user'
import { aiApi, type Conversation, type ToolCallEvent } from '@/api/ai.api'
import { reservationApi } from '@/api/reservation.api'
import { getBookStatusMeta } from '@/utils/libraryStatus'

interface ToolCallInfo {
  id: string
  name: string
  status: 'started' | 'completed'
  displayName: string
  result?: any
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  loading?: boolean
  toolCalls?: ToolCallInfo[]
}

interface RecommendedBook {
  id: number
  title: string
  author: string
  category_name?: string
  available_quantity: number
  total_quantity: number
  status?: string
}

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  search_books: '搜索图书',
  recommend_books: '推荐图书',
  get_book_details: '查看图书详情',
  get_borrowing_status: '查询借阅状态',
  reserve_book: '预约实体图书',
  search_notes: '搜索读书笔记',
  publish_note: '发布笔记',
  get_my_borrowings: '查询我的借阅',
  get_popular_books: '热门图书',
  get_reader_info: '读者信息'
}

const createWelcomeMessage = (): Message => ({
  id: 'welcome',
  role: 'assistant',
  content: '你好，我是你的 **AI 智能图书馆助手**。你可以让我帮你找书、做预约、查借阅、做个性化推荐；实体书的真正借还需要到馆在机器终端扫码完成。',
  timestamp: Date.now()
})

const normalizeConversationMessages = (raw: any): Message[] => {
  let parsed = raw

  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed)
    } catch {
      return []
    }
  }

  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'messages' in parsed) {
    parsed = parsed.messages
  }

  if (!Array.isArray(parsed)) return []

  return parsed
    .map((item: any, index: number) => ({
      id: typeof item.id === 'string' ? item.id : `history-${index}`,
      role: item.role === 'user' ? 'user' : 'assistant',
      content: typeof item.content === 'string' ? item.content : '',
      timestamp: typeof item.timestamp === 'number'
        ? item.timestamp
        : typeof item.timestamp === 'string'
          ? Number(item.timestamp) || Date.parse(item.timestamp) || Date.now()
          : Date.now(),
      toolCalls: Array.isArray(item.toolCalls) ? item.toolCalls : []
    }))
    .filter(item => item.content || item.role === 'assistant')
}

const router = useRouter()
const userStore = useUserStore()

const inputMessage = ref('')
const loading = ref(false)
const messagesRef = ref<HTMLElement | null>(null)
const isAIOnline = ref(false)
const totalVectors = ref(0)
const vectorCoverage = ref(0)
const conversations = ref<Conversation[]>([])
const currentConversationId = ref<number | null>(null)
const historySearch = ref('')
const chatHistory = ref<Message[]>([createWelcomeMessage()])
const recommendedBooks = ref<RecommendedBook[]>([])
const recAiPowered = ref(false)
const showRecommend = ref(true)
const reservedBookIds = ref<Set<number>>(new Set())
const reservingIds = ref<Set<number>>(new Set())
const streamCleanup = ref<(() => void) | null>(null)
const activeAssistantId = ref<string | null>(null)

const canReserve = computed(() => !!userStore.user?.reader_id)
const bookMeta = (book: RecommendedBook) => getBookStatusMeta(book.status, book.available_quantity)

const canReserveBook = (book: RecommendedBook) =>
  !!userStore.user?.reader_id &&
  bookMeta(book).canReserve &&
  !reservedBookIds.value.has(book.id) &&
  !reservingIds.value.has(book.id)

const reservationButtonLabel = (book: RecommendedBook) => {
  if (reservedBookIds.value.has(book.id)) return '已预约'
  if (reservingIds.value.has(book.id)) return '预约中…'
  if (!userStore.user?.reader_id) return '未绑定读者'
  return bookMeta(book).reserveLabel
}

const reservationButtonHint = (book: RecommendedBook) => {
  if (reservedBookIds.value.has(book.id)) return '该书已加入你的到馆取书列表'
  if (!userStore.user?.reader_id) return '当前账号未绑定读者信息，暂时无法预约'
  return bookMeta(book).hint
}

const filteredConversations = computed(() => {
  if (!historySearch.value.trim()) return conversations.value
  const keyword = historySearch.value.trim().toLowerCase()
  return conversations.value.filter(item => (item.title || '').toLowerCase().includes(keyword))
})

const scrollToBottom = async () => {
  await nextTick()
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

const formatContent = (content: string) => DOMPurify.sanitize(marked(content || '') as string)

const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })

const setPrompt = (prompt: string) => {
  inputMessage.value = prompt
}

const loadAvailability = async () => {
  const result = await aiApi.isAvailable()
  if (result.success) {
    isAIOnline.value = !!result.data
  }
}

const loadStatistics = async () => {
  const result = await aiApi.getStatistics()
  if (result.success && result.data) {
    totalVectors.value = result.data.totalVectors || 0
    vectorCoverage.value = Math.round(result.data.coverageRate || 0)
  }
}

const loadReservations = async () => {
  if (!canReserve.value) {
    reservedBookIds.value = new Set()
    return
  }

  const result = await reservationApi.getMy()
  if (result.success && result.data) {
    reservedBookIds.value = new Set(
      result.data.filter(item => item.status === 'pending').map(item => item.book_id)
    )
  }
}

const loadConversationList = async () => {
  if (!userStore.user) return

  const result = await aiApi.getConversations(userStore.user.id, 30)
  if (result.success && result.data) {
    conversations.value = result.data
  }
}

const buildHistoryPayload = () =>
  chatHistory.value
    .filter(message => !message.loading && message.content.trim())
    .map(message => ({
      role: message.role,
      content: message.content
    }))

const persistConversation = async () => {
  if (!userStore.user) return

  const messages = chatHistory.value.filter(message => !message.loading)
  const firstUserMessage = messages.find(message => message.role === 'user')?.content || '新对话'
  const title = firstUserMessage.slice(0, 24)

  if (currentConversationId.value) {
    const result = await aiApi.updateConversation(currentConversationId.value, title, messages)
    if (result.success) {
      await loadConversationList()
    }
    return
  }

  const result = await aiApi.saveConversation(userStore.user.id, title, messages)
  if (result.success && result.data) {
    currentConversationId.value = result.data.id
    await loadConversationList()
  }
}

const getActiveAssistant = () => {
  const activeId = activeAssistantId.value
  if (!activeId) return null
  return chatHistory.value.find(message => message.id === activeId) || null
}

const handleToolCall = (event: ToolCallEvent) => {
  const assistant = getActiveAssistant()
  if (!assistant) return

  if (!assistant.toolCalls) {
    assistant.toolCalls = []
  }

  const existing = assistant.toolCalls.find(item => item.id === event.id)
  if (existing) {
    existing.status = event.status
    existing.result = event.result
    return
  }

  assistant.toolCalls.push({
    id: event.id,
    name: event.name,
    status: event.status,
    result: event.result,
    displayName: TOOL_DISPLAY_NAMES[event.name] || event.name
  })
}

const handleRecommend = (payload: { books: RecommendedBook[]; ai_powered: boolean }) => {
  recommendedBooks.value = payload.books || []
  recAiPowered.value = !!payload.ai_powered
  showRecommend.value = true
}

const stopGeneration = () => {
  streamCleanup.value?.()
  streamCleanup.value = null
  loading.value = false
  const assistant = getActiveAssistant()
  if (assistant) {
    assistant.loading = false
  }
}

const sendMessage = async () => {
  const prompt = inputMessage.value.trim()
  if (!prompt || loading.value) return

  const userMessage: Message = {
    id: `user-${Date.now()}`,
    role: 'user',
    content: prompt,
    timestamp: Date.now()
  }

  const assistantMessage: Message = {
    id: `assistant-${Date.now()}`,
    role: 'assistant',
    content: '',
    timestamp: Date.now(),
    loading: true,
    toolCalls: []
  }

  chatHistory.value.push(userMessage, assistantMessage)
  inputMessage.value = ''
  loading.value = true
  activeAssistantId.value = assistantMessage.id
  await scrollToBottom()

  streamCleanup.value = aiApi.chatStream(
    prompt,
    buildHistoryPayload(),
    undefined,
    async chunk => {
      assistantMessage.content += chunk
      await scrollToBottom()
    },
    async error => {
      assistantMessage.content = error || '请求失败。'
      assistantMessage.loading = false
      loading.value = false
      streamCleanup.value = null
      await persistConversation()
      await scrollToBottom()
    },
    async () => {
      assistantMessage.loading = false
      loading.value = false
      streamCleanup.value = null
      await persistConversation()
      await scrollToBottom()
    },
    handleToolCall,
    handleRecommend
  )
}

const startNewChat = () => {
  stopGeneration()
  currentConversationId.value = null
  activeAssistantId.value = null
  chatHistory.value = [createWelcomeMessage()]
  recommendedBooks.value = []
  recAiPowered.value = false
}

const loadConversation = async (conversation: Conversation) => {
  if (loading.value) return

  const result = await aiApi.getConversation(conversation.id)
  if (result.success && result.data) {
    currentConversationId.value = conversation.id
    const messages = normalizeConversationMessages(result.data.messages)
    chatHistory.value = messages.length > 0 ? messages : [createWelcomeMessage()]
    await scrollToBottom()
  }
}

const deleteConversation = async (conversation: Conversation) => {
  const result = await aiApi.deleteConversation(conversation.id)
  if (result.success) {
    ElMessage.success('历史对话已删除')
    if (currentConversationId.value === conversation.id) {
      startNewChat()
    }
    await loadConversationList()
  }
}

const handleReserve = async (book: RecommendedBook) => {
  if (!canReserve.value) {
    ElMessage.warning('当前账号未绑定读者信息，暂时无法预约。')
    return
  }

  const meta = bookMeta(book)
  if (!meta.canReserve) {
    ElMessage.warning(meta.hint)
    return
  }

  const nextIds = new Set(reservingIds.value)
  nextIds.add(book.id)
  reservingIds.value = nextIds

  try {
    const result = await reservationApi.create(book.id)
    if (result.success) {
      ElMessage.success(`预约成功，请到馆在自助终端扫码取书。取书码：${result.data?.pickup_code || '已生成'}`)
      await loadReservations()
    }
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error?.message || error?.message || '预约失败。')
  } finally {
    const updatedIds = new Set(reservingIds.value)
    updatedIds.delete(book.id)
    reservingIds.value = updatedIds
  }
}

const viewInBooks = (book: RecommendedBook) => {
  router.push({ path: '/books', query: { search: book.title } })
}

onMounted(async () => {
  await Promise.all([loadAvailability(), loadStatistics(), loadConversationList(), loadReservations()])
  await scrollToBottom()
})

onUnmounted(() => {
  stopGeneration()
})
</script>

<style scoped>
.ai-page {
  min-height: calc(100vh - 140px);
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr) 320px;
  gap: 18px;
}

.history-panel,
.chat-panel,
.recommend-panel {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.84);
  border-radius: 24px;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.06);
}

.history-panel,
.recommend-panel {
  padding: 20px;
}

.panel-header,
.chat-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.panel-title,
.chat-header h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
}

.panel-subtitle,
.chat-header p,
.history-time,
.message-time,
.stats-label,
.recommend-meta,
.history-empty,
.recommend-empty {
  color: #64748b;
}

.chat-header {
  padding: 24px 24px 0;
}

.chat-header p {
  margin: 8px 0 0;
}

.ghost-icon-btn,
.ghost-btn,
.primary-btn,
.prompt-chip {
  border: none;
  border-radius: 14px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.ghost-icon-btn:hover,
.ghost-btn:hover,
.primary-btn:hover,
.prompt-chip:hover {
  transform: translateY(-1px);
}

.ghost-icon-btn:disabled,
.ghost-btn:disabled,
.primary-btn:disabled,
.prompt-chip:disabled {
  cursor: not-allowed;
  opacity: 0.7;
  transform: none;
}

.ghost-icon-btn,
.ghost-btn,
.prompt-chip {
  background: #eef2ff;
  color: #334155;
}

.ghost-icon-btn {
  width: 40px;
  height: 40px;
}

.ghost-btn,
.primary-btn {
  height: 42px;
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.primary-btn {
  color: #fff;
  background: linear-gradient(135deg, #c8102e 0%, #7c3aed 100%);
  box-shadow: 0 12px 24px rgba(124, 58, 237, 0.18);
}

.primary-btn.small {
  height: 38px;
}

.sidebar-search {
  margin-top: 16px;
  height: 42px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border-radius: 14px;
  background: #f8fafc;
}

.sidebar-search input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
}

.stats-box {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.stats-item {
  padding: 14px;
  border-radius: 18px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stats-value {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
}

.history-list {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: calc(100vh - 360px);
  overflow-y: auto;
}

.history-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  width: 100%;
  padding: 12px 14px;
  border: none;
  border-radius: 16px;
  text-align: left;
  background: #f8fafc;
  cursor: pointer;
}

.history-item.active {
  background: rgba(200, 16, 46, 0.08);
}

.history-text {
  min-width: 0;
  flex: 1;
}

.history-title {
  font-weight: 600;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-delete {
  font-size: 18px;
  color: #94a3b8;
}

.chat-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.messages {
  flex: 1;
  padding: 20px 24px 12px;
  overflow-y: auto;
  min-height: 380px;
}

.message-row {
  display: flex;
  gap: 12px;
  margin-bottom: 18px;
}

.message-row.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #c8102e 0%, #7c3aed 100%);
}

.message-bubble {
  max-width: calc(100% - 60px);
  padding: 14px 16px;
  border-radius: 18px;
  background: #f8fafc;
}

.message-bubble.user {
  background: rgba(200, 16, 46, 0.08);
}

.markdown-body :deep(p) {
  margin: 0 0 10px;
  line-height: 1.75;
}

.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 0 0 10px 18px;
  padding: 0;
}

.markdown-body :deep(code) {
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.08);
}

.tool-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.tool-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(124, 58, 237, 0.08);
  font-size: 13px;
}

.typing {
  color: #64748b;
}

.quick-prompts {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 0 24px 18px;
}

.prompt-chip {
  padding: 8px 14px;
}

.input-box {
  padding: 0 24px 24px;
}

.input-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.recommend-list {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recommend-item {
  padding: 16px;
  border-radius: 18px;
  background: #f8fafc;
}

.recommend-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.recommend-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.recommend-hint {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.6;
  color: #475569;
}

.recommend-actions {
  margin-top: 12px;
  display: flex;
  gap: 10px;
}

@media (max-width: 1200px) {
  .ai-page {
    grid-template-columns: 1fr;
  }
}
</style>
