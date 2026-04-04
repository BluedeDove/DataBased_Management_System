<template>
  <div class="ai-page">
    <!-- ── Left: History Panel ── -->
    <aside class="history-panel">
      <div class="hp-header">
        <div class="hp-logo">
          <el-icon style="color: var(--gdut-red); font-size: 20px"><MagicStick /></el-icon>
          <span>AI 助手</span>
        </div>
        <div class="status-indicator" :class="{ online: isAIOnline }">
          <span class="pulse-dot" /><span>{{ isAIOnline ? '在线' : '离线' }}</span>
        </div>
      </div>

      <div class="search-bar" style="margin-bottom: 12px">
        <el-icon class="search-icon"><Search /></el-icon>
        <input v-model="historySearch" placeholder="搜索对话…" />
      </div>

      <div class="hp-actions">
        <button class="action-chip" @click="startNewChat"><el-icon><ChatDotRound /></el-icon> 新对话</button>
        <button class="action-chip" @click="exportConversation"><el-icon><Download /></el-icon> 导出</button>
      </div>

      <div class="hp-list">
        <div
          v-for="item in filteredHistory"
          :key="item.id"
          class="hp-item"
          :class="{ active: currentConversationId === item.id }"
          @click="loadChatHistory(item)"
        >
          <el-icon style="font-size: 14px; color: var(--text-muted)"><Clock /></el-icon>
          <span class="hp-item-text">{{ item.title }}</span>
          <button class="hp-del" @click.stop="deleteConversation(item)">
            <el-icon><Delete /></el-icon>
          </button>
        </div>
        <div v-if="chatHistoryList.length === 0" class="hp-empty">暂无历史对话</div>
      </div>

      <div class="hp-stats">
        <div class="hp-stat">
          <span class="hp-stat-val">{{ totalVectors }}</span>
          <span class="hp-stat-lbl">向量数</span>
        </div>
        <div class="hp-stat">
          <span class="hp-stat-val">{{ vectorCoverage }}%</span>
          <span class="hp-stat-lbl">覆盖率</span>
        </div>
      </div>
    </aside>

    <!-- ── Center: Chat ── -->
    <main class="chat-main">
      <div class="chat-header">
        <div>
          <div class="ch-title">智能图书助手</div>
          <div class="ch-sub">我可以为您推荐图书、查询信息或解答疑问</div>
        </div>
        <button class="icon-btn" @click="showRecommend = !showRecommend" title="推荐面板">
          <el-icon><Reading /></el-icon>
        </button>
      </div>

      <div ref="messagesRef" class="chat-messages">
        <div v-for="(msg, idx) in chatHistory" :key="msg.id || idx" class="msg-row" :class="msg.role">
          <div class="msg-avatar" :class="msg.role">
            <el-icon v-if="msg.role === 'assistant'"><Service /></el-icon>
            <el-icon v-else><User /></el-icon>
          </div>
          <div class="msg-bubble" :class="msg.role">
            <!-- Tool calls cards -->
            <div v-if="msg.toolCalls && msg.toolCalls.length > 0" class="tool-calls-container">
              <div v-for="tc in msg.toolCalls" :key="tc.id" class="tool-call-card" :class="tc.status">
                <span class="tc-icon">
                  <span v-if="tc.status === 'started'" class="tc-spinner" />
                  <span v-else-if="tc.status === 'completed'">&#10003;</span>
                  <span v-else>&#10007;</span>
                </span>
                <span class="tc-label">{{ tc.displayName }}</span>
                <span class="tc-status">{{ tc.status === 'started' ? '执行中...' : '完成' }}</span>
              </div>
            </div>
            <div v-if="msg.loading" class="typing-dots"><span /><span /><span /></div>
            <div v-else-if="msg.content" v-html="formatContent(msg.content)" />
            <div v-if="msg.timestamp && !msg.loading" class="msg-time">{{ formatTime(msg.timestamp) }}</div>
          </div>
        </div>
      </div>

      <div class="chat-input-area">
        <div class="quick-prompts">
          <button class="qp-chip" @click="setInput('最近有什么新书？')">📚 新书推荐</button>
          <button class="qp-chip" @click="setInput('适合初学者的Python书')">🐍 Python入门</button>
          <button class="qp-chip" @click="setInput('推荐一些关于人工智能的书籍')">🤖 AI相关</button>
          <button class="qp-chip" @click="setInput('有哪些经典的数据结构与算法书？')">📐 算法</button>
        </div>
        <div class="input-row">
          <el-input
            v-model="inputMessage"
            type="textarea"
            :rows="2"
            placeholder="输入您的问题，按 Enter 发送…"
            :disabled="loading"
            @keydown.enter.prevent="sendMessage"
          />
          <button v-if="loading" class="stop-btn" @click="stopGeneration">
            <el-icon><VideoPause /></el-icon> 停止
          </button>
          <button v-else class="send-btn" @click="sendMessage">
            <el-icon><Promotion /></el-icon>
          </button>
        </div>
      </div>
    </main>

    <!-- ── Right: Recommendations ── -->
    <aside v-show="showRecommend" class="recommend-panel">
      <div class="rp-header">
        <div class="rp-title">
          <el-icon><Reading /></el-icon> 推荐图书
          <span v-if="recAiPowered" class="ai-badge">✨ AI</span>
        </div>
        <button class="icon-btn" @click="showRecommend = false"><el-icon><Close /></el-icon></button>
      </div>

      <!-- Loading state -->
      <div v-if="recLoading" class="rp-loading">
        <div class="rp-loading-dots"><span /><span /><span /></div>
        <p>AI 正在分析推荐…</p>
      </div>

      <!-- Book list -->
      <div v-else class="rp-list">
        <template v-if="recommendedBooks.length > 0">
          <div
            v-for="book in recommendedBooks"
            :key="book.id"
            class="rp-book"
            :class="{ unavailable: availOf(book) === 0 }"
          >
            <!-- Book icon / cover -->
            <div class="rp-book-icon" :class="availOf(book) > 0 ? 'has-stock' : 'no-stock'">
              <el-icon><Document /></el-icon>
            </div>

            <!-- Book info -->
            <div class="rp-book-body">
              <div class="rp-book-title" :title="book.title">{{ book.title }}</div>
              <div class="rp-book-author">{{ book.author }}</div>
              <div class="rp-book-meta">
                <span class="rp-category">{{ book.category_name }}</span>
                <span class="rp-avail" :class="availClass(book)">
                  {{ availOf(book) }}/{{ book.total_quantity }} 可借
                </span>
              </div>

              <!-- Action buttons -->
              <div class="rp-actions">
                <!-- Borrow button: for readers with reader_id -->
                <button
                  v-if="canBorrow"
                  class="rp-btn borrow-btn"
                  :disabled="availOf(book) === 0 || borrowingSet.has(book.id)"
                  @click="handleBorrow(book)"
                >
                  <el-icon><Plus /></el-icon>
                  {{ borrowingSet.has(book.id) ? '借阅中…' : availOf(book) === 0 ? '暂无库存' : '借 阅' }}
                </button>

                <!-- View in search page -->
                <button class="rp-btn view-btn" @click="viewInBooks(book)">
                  <el-icon><Search /></el-icon>
                  查看
                </button>
              </div>
            </div>
          </div>
        </template>

        <!-- Empty state -->
        <div v-else class="rp-empty">
          <el-icon style="font-size: 40px; opacity: 0.25"><Reading /></el-icon>
          <p>发起对话后，AI 将推荐相关图书</p>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  MagicStick, User, Service, Reading, Search, ChatDotRound,
  Clock, Promotion, Document, Close, Delete, Plus,
  VideoPause, Download
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useUserStore } from '@/store/user'
import { aiApi, ToolCallEvent } from '../api/ai.api'
import { borrowingApi } from '../api/borrowing.api'

interface ToolCallInfo {
  id: string
  name: string
  status: 'started' | 'completed' | 'error'
  result?: any
  displayName: string
}

interface Message {
  id?: string
  role: 'user' | 'assistant'
  content: string
  loading?: boolean
  timestamp?: number
  toolCalls?: ToolCallInfo[]
}

interface Conversation { id: number; title: string; messages: Message[]; created_at: string }

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  search_books: '搜索图书',
  recommend_books: '推荐图书',
  get_book_details: '查看图书详情',
  get_borrowing_status: '查询借阅状态',
  borrow_book: '借阅图书'
}

const userStore = useUserStore()
const router = useRouter()
const inputMessage = ref('')
const loading = ref(false)
const messagesRef = ref<HTMLElement | null>(null)
const streamCleanup = ref<(() => void) | null>(null)

const chatHistory = ref<Message[]>([
  { id: 'init', role: 'assistant', content: '你好！我是图书馆智能助手。你可以问我关于馆藏图书的问题，或者让我为你推荐书籍。', timestamp: Date.now() }
])
const isAIOnline = ref(false)
const vectorCoverage = ref(0)
const totalVectors = ref(0)
const chatHistoryList = ref<Conversation[]>([])
const currentConversationId = ref<number | null>(null)
const showRecommend = ref(true)
const historySearch = ref('')

// ── Recommendation state ──
const recommendedBooks = ref<any[]>([])
const recLoading = ref(false)
const recAiPowered = ref(false)
const borrowingSet = ref<Set<number>>(new Set())

// ── Computed ──
const filteredHistory = computed(() => {
  if (!historySearch.value) return chatHistoryList.value
  return chatHistoryList.value.filter(c => c.title.toLowerCase().includes(historySearch.value.toLowerCase()))
})

const canBorrow = computed(() => {
  const u = userStore.user
  if (!u) return false
  return !!(u.reader_id)
})

// ── Helpers ──
const availOf = (book: any) => book.available_quantity ?? 0

const availClass = (book: any) => {
  const a = availOf(book)
  if (a === 0) return 'avail-none'
  if (a <= 1) return 'avail-low'
  return 'avail-ok'
}

const formatContent = (content: string) => {
  if (!content) return ''
  return DOMPurify.sanitize(marked(content) as string)
}

const formatTime = (timestamp?: number) => {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

const scrollToBottom = () => {
  nextTick(() => { if (messagesRef.value) messagesRef.value.scrollTop = messagesRef.value.scrollHeight })
}

// ── Borrow action ──
const handleBorrow = async (book: any) => {
  const readerId = userStore.user?.reader_id
  if (!readerId) { ElMessage.info('您的账号未关联读者信息，请联系管理员'); return }
  if (borrowingSet.value.has(book.id)) return
  try {
    borrowingSet.value.add(book.id)
    const result = await borrowingApi.borrow(readerId, book.id)
    if (result.success) {
      ElMessage.success(`《${book.title}》借阅成功！`)
      const idx = recommendedBooks.value.findIndex(b => b.id === book.id)
      if (idx > -1) recommendedBooks.value[idx].available_quantity = Math.max(0, availOf(book) - 1)
    }
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.error?.message || '借阅失败，请稍后重试')
  } finally {
    borrowingSet.value.delete(book.id)
  }
}

const viewInBooks = (book: any) => {
  router.push({ path: '/books', query: { keyword: book.title } })
}

// ── AI Recommendation (fallback) ──
const fetchRecommendations = async (lastUserMessage: string) => {
  recLoading.value = true
  try {
    const messages = chatHistory.value
      .filter(m => !m.loading && m.id !== 'init')
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content }))
    const result = await aiApi.chatRecommend(messages, lastUserMessage)
    if (result.success) {
      recommendedBooks.value = result.data.books || []
      recAiPowered.value = result.data.ai_powered
    }
  } catch (e) {
    console.warn('Recommendation fetch failed:', e)
  } finally {
    recLoading.value = false
  }
}

// ── Send message ──
const sendMessage = async () => {
  if (!inputMessage.value.trim() || loading.value) return
  const userMessage = inputMessage.value.trim()
  inputMessage.value = ''

  chatHistory.value.push({ id: `user-${Date.now()}`, role: 'user', content: userMessage, timestamp: Date.now() })
  scrollToBottom()

  const aiMessageId = `ai-${Date.now()}`
  chatHistory.value.push({ id: aiMessageId, role: 'assistant', content: '', loading: true, toolCalls: [] })
  loading.value = true
  recLoading.value = true
  scrollToBottom()

  let receivedToolRecommendation = false

  try {
    const history = chatHistory.value
      .filter(m => !m.loading && m.id !== 'init')
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content }))

    let fullContent = ''
    const cleanup = aiApi.chatStream(
      userMessage, history as any, undefined,
      // onChunk
      (chunk) => {
        fullContent += chunk
        const mi = chatHistory.value.findIndex(m => m.id === aiMessageId)
        if (mi > -1) { chatHistory.value[mi].content = fullContent; chatHistory.value[mi].loading = false; scrollToBottom() }
      },
      // onError
      (error) => {
        const mi = chatHistory.value.findIndex(m => m.id === aiMessageId)
        if (mi > -1) { chatHistory.value[mi].content = `发生错误: ${error}`; chatHistory.value[mi].loading = false }
        loading.value = false; recLoading.value = false; ElMessage.error('AI响应失败')
      },
      // onComplete
      () => {
        const mi = chatHistory.value.findIndex(m => m.id === aiMessageId)
        if (mi > -1) chatHistory.value[mi].timestamp = Date.now()
        loading.value = false
        saveCurrentConversation()
        // Fallback: only fetch recommendations if no tool-based recommendation was received
        if (!receivedToolRecommendation) {
          fetchRecommendations(userMessage)
        } else {
          recLoading.value = false
        }
      },
      // onToolCall
      (tc: ToolCallEvent) => {
        const mi = chatHistory.value.findIndex(m => m.id === aiMessageId)
        if (mi === -1) return
        const msg = chatHistory.value[mi]
        if (!msg.toolCalls) msg.toolCalls = []

        const existing = msg.toolCalls.find(t => t.id === tc.id)
        if (existing) {
          existing.status = tc.status as any
          if (tc.result !== undefined) existing.result = tc.result
        } else {
          msg.toolCalls.push({
            id: tc.id,
            name: tc.name,
            status: tc.status as any,
            result: tc.result,
            displayName: TOOL_DISPLAY_NAMES[tc.name] || tc.name
          })
        }
        msg.loading = false
        scrollToBottom()
      },
      // onRecommend
      (data: { books: any[]; ai_powered: boolean }) => {
        receivedToolRecommendation = true
        recommendedBooks.value = data.books || []
        recAiPowered.value = data.ai_powered
        recLoading.value = false
        if (!showRecommend.value) showRecommend.value = true
      }
    )
    streamCleanup.value = cleanup
  } catch {
    const mi = chatHistory.value.findIndex(m => m.id === aiMessageId)
    if (mi > -1) { chatHistory.value[mi].content = 'AI服务暂时不可用，请稍后再试。'; chatHistory.value[mi].loading = false }
    loading.value = false; recLoading.value = false
  }
}

const stopGeneration = () => {
  if (streamCleanup.value) { streamCleanup.value(); streamCleanup.value = null }
  loading.value = false; recLoading.value = false
}

const setInput = (text: string) => { inputMessage.value = text }

const startNewChat = () => {
  chatHistory.value = [{ id: 'init', role: 'assistant', content: '你好！我是图书馆智能助手。你可以问我关于馆藏图书的问题，或者让我为你推荐书籍。', timestamp: Date.now() }]
  currentConversationId.value = null
  recommendedBooks.value = []
  recAiPowered.value = false
}

const exportConversation = () => {
  const content = chatHistory.value.map(m => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`).join('\n\n')
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: `chat-${new Date().toISOString().slice(0, 10)}.txt` })
  a.click(); URL.revokeObjectURL(url); ElMessage.success('对话已导出')
}

const loadChatHistory = (item: Conversation) => {
  currentConversationId.value = item.id
  chatHistory.value = item.messages
  scrollToBottom()
  const lastUser = [...item.messages].reverse().find(m => m.role === 'user')
  if (lastUser) fetchRecommendations(lastUser.content)
}

const deleteConversation = async (item: Conversation) => {
  try {
    const result = await aiApi.deleteConversation(item.id)
    if (result.success) {
      chatHistoryList.value = chatHistoryList.value.filter(c => c.id !== item.id)
      if (currentConversationId.value === item.id) startNewChat()
      ElMessage.success('对话已删除')
    }
  } catch { ElMessage.error('删除失败') }
}

const isSaving = ref(false)
const saveCurrentConversation = async () => {
  if (!userStore.user?.id || chatHistory.value.length <= 1 || isSaving.value) return
  isSaving.value = true
  const title = chatHistory.value.find(m => m.role === 'user')?.content.slice(0, 30) || '新对话'
  const messages = chatHistory.value.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp }))
  try {
    if (currentConversationId.value) {
      await aiApi.updateConversation(currentConversationId.value, title, messages as any)
    } else {
      const result = await aiApi.saveConversation(userStore.user.id, title, messages as any)
      if (result.success) { currentConversationId.value = result.data.id; loadConversations() }
    }
  } catch (e) { console.warn('Save conversation error:', e) }
  finally { isSaving.value = false }
}

const loadConversations = async () => {
  if (!userStore.user?.id) return
  try {
    const result = await aiApi.getConversations(userStore.user.id, 20)
    if (result.success) {
      chatHistoryList.value = result.data.map((c: any) => ({
        ...c,
        messages: typeof c.messages === 'string' ? JSON.parse(c.messages) : c.messages
      }))
    }
  } catch {}
}

const checkAIStatus = async () => {
  try { const r = await aiApi.isAvailable(); isAIOnline.value = r.success && r.data } catch { isAIOnline.value = false }
}

const loadVectorStats = async () => {
  try {
    const r = await aiApi.getStatistics()
    if (r.success) {
      totalVectors.value = r.data.vectorCount || r.data.totalVectors || 0
      vectorCoverage.value = r.data.coverageRate || 0
    }
  } catch {}
}

onMounted(() => { checkAIStatus(); loadVectorStats(); loadConversations() })
onUnmounted(() => { if (streamCleanup.value) streamCleanup.value() })
</script>

<style scoped>
.ai-page {
  display: flex; gap: 0;
  height: calc(100vh - 128px);
  margin: -28px -32px;
}

/* ── Left Panel ── */
.history-panel {
  width: 260px; flex-shrink: 0;
  background: rgba(255,255,255,0.38);
  backdrop-filter: blur(18px) saturate(180%);
  -webkit-backdrop-filter: blur(18px) saturate(180%);
  border-right: 1px solid rgba(255,255,255,0.35);
  display: flex; flex-direction: column; padding: 20px;
}
.hp-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.hp-logo { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 700; color: var(--text-primary); }
.status-indicator { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); }
.pulse-dot {
  width: 8px; height: 8px; border-radius: 50%; background: #94A3B8; flex-shrink: 0;
  transition: background 0.3s;
}
.status-indicator.online .pulse-dot { background: #22C55E; animation: pulse 1.5s infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

.hp-actions { display: flex; gap: 8px; margin-bottom: 16px; }
.action-chip {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 8px; border: 1px solid rgba(255,255,255,0.35); border-radius: 10px;
  background: rgba(255,255,255,0.35); color: var(--text-secondary); cursor: pointer;
  font-size: 12px; font-weight: 500; font-family: var(--font-sans);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); transition: all 0.15s;
}
.action-chip:hover { border-color: var(--gdut-red); color: var(--gdut-red); background: var(--gdut-red-tint); }

.hp-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
.hp-item {
  display: flex; align-items: center; gap: 8px; padding: 10px;
  border-radius: 10px; cursor: pointer; transition: background 0.15s;
}
.hp-item:hover { background: var(--gdut-purple-tint); }
.hp-item.active { background: var(--gdut-purple-tint); }
.hp-item-text { flex: 1; font-size: 13px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp-del {
  opacity: 0; width: 24px; height: 24px; border-radius: 6px;
  border: none; background: transparent; cursor: pointer; color: var(--text-muted);
  display: flex; align-items: center; justify-content: center; transition: all 0.15s;
}
.hp-item:hover .hp-del { opacity: 1; }
.hp-del:hover { background: var(--danger-tint); color: var(--danger); }
.hp-empty { text-align: center; padding: 32px 16px; color: var(--text-muted); font-size: 13px; }

.hp-stats { display: flex; gap: 16px; padding-top: 16px; border-top: 1px solid var(--border-light); margin-top: 12px; }
.hp-stat { display: flex; flex-direction: column; }
.hp-stat-val { font-size: 16px; font-weight: 700; color: var(--text-primary); }
.hp-stat-lbl { font-size: 11px; color: var(--text-muted); }

.search-bar { flex: none; position: relative; display: flex; align-items: center; }
.search-icon { position: absolute; left: 8px; color: var(--text-muted); font-size: 13px; pointer-events: none; }
.search-bar input {
  width: 100%; height: 32px; padding: 0 8px 0 28px;
  border: 1.5px solid var(--border-color); border-radius: var(--radius-input);
  background: rgba(255,255,255,0.5); font-size: 12px; font-family: var(--font-sans);
  color: var(--text-primary); outline: none; transition: border-color 0.2s;
}
.search-bar input:focus { border-color: var(--gdut-red); }

/* ── Center Chat ── */
.chat-main { flex: 1; display: flex; flex-direction: column; min-width: 0; background: transparent; }
.chat-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 24px;
  background: rgba(255,255,255,0.40); backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%); border-bottom: 1px solid rgba(255,255,255,0.35);
}
.ch-title { font-size: 16px; font-weight: 700; color: var(--text-primary); }
.ch-sub { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.icon-btn {
  width: 36px; height: 36px; border-radius: 10px; border: 1.5px solid var(--border-color);
  background: rgba(255,255,255,0.5); cursor: pointer; display: flex; align-items: center;
  justify-content: center; color: var(--text-secondary); font-size: 16px; transition: all 0.15s;
}
.icon-btn:hover { border-color: var(--gdut-red); color: var(--gdut-red); }

.chat-messages { flex: 1; overflow-y: auto; padding: 24px; }
.msg-row { display: flex; gap: 12px; margin-bottom: 20px; }
.msg-row.user { flex-direction: row-reverse; }
.msg-avatar {
  width: 36px; height: 36px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  color: #fff; flex-shrink: 0; font-size: 16px;
}
.msg-avatar.assistant { background: var(--gradient-dark); }
.msg-avatar.user { background: var(--gradient-brand); }
.msg-bubble {
  max-width: 70%; padding: 12px 16px; border-radius: 16px;
  line-height: 1.6; font-size: 14px;
}
.msg-bubble.assistant { background: rgba(255,255,255,0.48); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); color: var(--text-primary); border: 1px solid rgba(255,255,255,0.35); }
.msg-bubble.user { background: var(--gradient-brand); color: #fff; }
.msg-time { font-size: 11px; opacity: 0.6; margin-top: 8px; }
.typing-dots { display: flex; gap: 4px; padding: 4px 0; }
.typing-dots span {
  width: 8px; height: 8px; background: var(--gdut-red); border-radius: 50%;
  animation: typing 1s infinite;
}
.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes typing { 0%, 100% { opacity: 0.3; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-4px); } }

/* ── Tool Call Cards ── */
.tool-calls-container {
  display: flex; flex-direction: column; gap: 6px;
  margin-bottom: 10px;
}
.tool-call-card {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; border-radius: 10px;
  background: rgba(124, 58, 237, 0.06);
  border: 1px solid rgba(124, 58, 237, 0.15);
  font-size: 13px; transition: all 0.3s;
}
.tool-call-card.completed {
  background: rgba(5, 150, 105, 0.06);
  border-color: rgba(5, 150, 105, 0.20);
}
.tool-call-card.error {
  background: rgba(239, 68, 68, 0.06);
  border-color: rgba(239, 68, 68, 0.20);
}
.tc-icon { font-size: 14px; display: flex; align-items: center; justify-content: center; width: 18px; }
.tc-spinner {
  width: 14px; height: 14px; border: 2px solid rgba(124, 58, 237, 0.25);
  border-top-color: var(--gdut-purple); border-radius: 50%;
  animation: tc-spin 0.7s linear infinite;
}
@keyframes tc-spin { to { transform: rotate(360deg); } }
.tool-call-card.completed .tc-icon { color: #059669; }
.tool-call-card.error .tc-icon { color: #EF4444; }
.tc-label { font-weight: 600; color: var(--text-primary); }
.tc-status { color: var(--text-muted); font-size: 12px; }

.chat-input-area {
  padding: 16px 24px;
  background: rgba(255,255,255,0.40); backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%); border-top: 1px solid rgba(255,255,255,0.35);
}
.quick-prompts { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.qp-chip {
  padding: 6px 14px; border-radius: 99px; border: 1px solid rgba(255,255,255,0.35);
  background: rgba(255,255,255,0.35); color: var(--text-secondary); cursor: pointer;
  font-size: 12px; font-family: var(--font-sans); backdrop-filter: blur(8px); transition: all 0.15s;
}
.qp-chip:hover { border-color: var(--gdut-red); color: var(--gdut-red); background: var(--gdut-red-tint); }
.input-row { display: flex; gap: 12px; align-items: flex-end; }
.input-row :deep(.el-textarea) { flex: 1; }
.send-btn {
  height: 56px; padding: 0 20px; border: none; border-radius: 12px;
  background: var(--gradient-brand); color: #fff; cursor: pointer;
  display: flex; align-items: center; justify-content: center; font-size: 20px;
  box-shadow: 0 4px 16px rgba(200,16,46,0.30); transition: all 0.2s;
}
.send-btn:hover { opacity: 0.9; transform: translateY(-1px); }
.stop-btn {
  height: 56px; padding: 0 20px; border: none; border-radius: 12px;
  background: var(--danger); color: #fff; cursor: pointer;
  display: flex; align-items: center; gap: 8px; font-size: 14px;
  font-weight: 600; font-family: var(--font-sans); transition: all 0.2s;
}
.stop-btn:hover { opacity: 0.9; }

/* ── Right Panel ── */
.recommend-panel {
  width: 300px; flex-shrink: 0;
  background: rgba(255,255,255,0.38); backdrop-filter: blur(18px) saturate(180%);
  -webkit-backdrop-filter: blur(18px) saturate(180%);
  border-left: 1px solid rgba(255,255,255,0.35);
  display: flex; flex-direction: column;
}
.rp-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; border-bottom: 1px solid var(--border-light);
  flex-shrink: 0;
}
.rp-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: var(--text-primary); }
.ai-badge {
  font-size: 10px; padding: 2px 7px; border-radius: 99px;
  background: linear-gradient(135deg, rgba(200,16,46,0.12), rgba(124,58,237,0.12));
  color: var(--gdut-red); font-weight: 600; border: 1px solid rgba(200,16,46,0.2);
}

/* Loading state */
.rp-loading {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 12px; color: var(--text-muted); font-size: 13px;
}
.rp-loading-dots { display: flex; gap: 5px; }
.rp-loading-dots span {
  width: 8px; height: 8px; background: var(--gdut-red); border-radius: 50%;
  animation: typing 1s infinite;
}
.rp-loading-dots span:nth-child(2) { animation-delay: 0.2s; }
.rp-loading-dots span:nth-child(3) { animation-delay: 0.4s; }

.rp-list { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 10px; }

/* ── Book card ── */
.rp-book {
  display: flex; gap: 10px; padding: 12px;
  background: rgba(255,255,255,0.50); border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.40);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  transition: all 0.15s;
}
.rp-book:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(28,16,51,0.08); }
.rp-book.unavailable { opacity: 0.7; }

.rp-book-icon {
  width: 40px; height: 40px; flex-shrink: 0;
  border-radius: 10px; display: flex; align-items: center;
  justify-content: center; color: #fff; font-size: 18px;
}
.rp-book-icon.has-stock { background: var(--gradient-brand); }
.rp-book-icon.no-stock { background: linear-gradient(135deg, #94A3B8, #CBD5E1); }

.rp-book-body { flex: 1; min-width: 0; }
.rp-book-title {
  font-weight: 700; font-size: 13px; color: var(--text-primary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  margin-bottom: 2px;
}
.rp-book-author { font-size: 12px; color: var(--text-secondary); margin-bottom: 5px; }

.rp-book-meta { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; flex-wrap: wrap; }
.rp-category {
  font-size: 10px; padding: 2px 6px; border-radius: 99px;
  background: var(--gdut-purple-tint); color: var(--gdut-purple); font-weight: 500;
}
.rp-avail { font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 99px; }
.avail-ok   { background: rgba(5,150,105,0.12); color: #059669; }
.avail-low  { background: rgba(234,179,8,0.12);  color: #D97706; }
.avail-none { background: rgba(239,68,68,0.10);  color: #EF4444; }

.rp-actions { display: flex; gap: 6px; }
.rp-btn {
  flex: 1; height: 28px; border-radius: 8px; border: none;
  display: flex; align-items: center; justify-content: center;
  gap: 4px; font-size: 12px; font-weight: 600; font-family: var(--font-sans);
  cursor: pointer; transition: all 0.15s; white-space: nowrap;
}
.borrow-btn {
  background: var(--gradient-brand); color: #fff;
  box-shadow: 0 2px 8px rgba(200,16,46,0.20);
}
.borrow-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
.borrow-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.view-btn {
  background: rgba(255,255,255,0.6); color: var(--text-secondary);
  border: 1.5px solid var(--border-color);
  flex: 0 0 auto; padding: 0 10px;
}
.view-btn:hover { border-color: var(--gdut-red); color: var(--gdut-red); }

.rp-empty { text-align: center; color: var(--text-muted); padding: 40px 16px; font-size: 13px; }
.rp-empty p { margin-top: 12px; line-height: 1.6; }

@media (max-width: 1100px) { .recommend-panel { display: none !important; } }
@media (max-width: 768px) { .history-panel { display: none !important; } }
</style>
