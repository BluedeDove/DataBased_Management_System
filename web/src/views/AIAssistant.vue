<template>
  <div class="ai-page">
    <!-- Left: History Panel -->
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

      <!-- Search -->
      <div class="search-bar" style="margin-bottom: 12px">
        <el-icon class="search-icon"><Search /></el-icon>
        <input v-model="historySearch" placeholder="搜索对话…" />
      </div>

      <!-- Actions -->
      <div class="hp-actions">
        <button class="action-chip" @click="startNewChat"><el-icon><ChatDotRound /></el-icon> 新对话</button>
        <button class="action-chip" @click="exportConversation"><el-icon><Download /></el-icon> 导出</button>
      </div>

      <!-- List -->
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

      <!-- Stats -->
      <div class="hp-stats">
        <div class="hp-stat"><span class="hp-stat-val">{{ totalVectors }}</span><span class="hp-stat-lbl">向量数</span></div>
        <div class="hp-stat"><span class="hp-stat-val">{{ vectorCoverage }}%</span><span class="hp-stat-lbl">覆盖率</span></div>
      </div>
    </aside>

    <!-- Center: Chat -->
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

      <!-- Messages -->
      <div ref="messagesRef" class="chat-messages">
        <div v-for="(msg, idx) in chatHistory" :key="msg.id || idx" class="msg-row" :class="msg.role">
          <div class="msg-avatar" :class="msg.role">
            <el-icon v-if="msg.role === 'assistant'"><Service /></el-icon>
            <el-icon v-else><User /></el-icon>
          </div>
          <div class="msg-bubble" :class="msg.role">
            <div v-if="msg.loading" class="typing-dots"><span /><span /><span /></div>
            <div v-else v-html="formatContent(msg.content)" />
            <div v-if="msg.timestamp && !msg.loading" class="msg-time">{{ formatTime(msg.timestamp) }}</div>
          </div>
        </div>
      </div>

      <!-- Input -->
      <div class="chat-input-area">
        <div class="quick-prompts">
          <button class="qp-chip" @click="setInput('最近有什么新书？')">📚 新书推荐</button>
          <button class="qp-chip" @click="setInput('适合初学者的Python书')">🐍 Python入门</button>
          <button class="qp-chip" @click="setInput('推荐一些关于人工智能的书籍')">🤖 AI相关</button>
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

    <!-- Right: Recommendations -->
    <aside v-show="showRecommend" class="recommend-panel">
      <div class="rp-header">
        <div class="rp-title"><el-icon><Reading /></el-icon> 推荐图书</div>
        <button class="icon-btn" @click="showRecommend = false"><el-icon><Close /></el-icon></button>
      </div>
      <div class="rp-list">
        <div v-for="(book, i) in recommendedBooks" :key="i" class="rp-book">
          <div class="rp-book-icon">
            <el-icon><Document /></el-icon>
          </div>
          <div class="rp-book-info">
            <div class="rp-book-title">{{ book.title }}</div>
            <div class="rp-book-author">{{ book.author }}</div>
            <div class="rp-book-similarity">相关度: {{ book.similarity }}%</div>
          </div>
        </div>
        <div v-if="!recommendedBooks.length" class="rp-empty">
          <el-icon style="font-size: 40px; opacity: 0.3"><Reading /></el-icon>
          <p>发起对话后，推荐图书将显示在这里</p>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import {
  MagicStick, User, Service, Reading, Search, ChatDotRound,
  Clock, Promotion, Document, Close, RefreshRight, Delete,
  VideoPause, Download
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useUserStore } from '@/store/user'
import { aiApi } from '../api/ai.api'

interface Message { id?: string; role: 'user' | 'assistant'; content: string; loading?: boolean; timestamp?: number }
interface RecommendedBook { title: string; author: string; description?: string; similarity: number; bookId?: number }
interface Conversation { id: number; title: string; messages: Message[]; created_at: string }

const userStore = useUserStore()
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
const recommendedBooks = ref<RecommendedBook[]>([])
const chatHistoryList = ref<Conversation[]>([])
const currentConversationId = ref<number | null>(null)
const showRecommend = ref(true)
const historySearch = ref('')

const filteredHistory = computed(() => {
  if (!historySearch.value) return chatHistoryList.value
  return chatHistoryList.value.filter(c => c.title.toLowerCase().includes(historySearch.value.toLowerCase()))
})

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

const sendMessage = async () => {
  if (!inputMessage.value.trim() || loading.value) return
  const userMessage = inputMessage.value.trim()
  inputMessage.value = ''

  chatHistory.value.push({ id: `user-${Date.now()}`, role: 'user', content: userMessage, timestamp: Date.now() })
  scrollToBottom()

  const aiMessageId = `ai-${Date.now()}`
  chatHistory.value.push({ id: aiMessageId, role: 'assistant', content: '', loading: true })
  loading.value = true
  scrollToBottom()

  try {
    const history = chatHistory.value.filter(m => !m.loading && m.id !== 'init').slice(-10).map(m => ({ role: m.role, content: m.content }))
    let fullContent = ''
    const cleanup = aiApi.chatStream(
      userMessage, history as any, undefined,
      (chunk) => {
        fullContent += chunk
        const mi = chatHistory.value.findIndex(m => m.id === aiMessageId)
        if (mi > -1) { chatHistory.value[mi].content = fullContent; chatHistory.value[mi].loading = false; scrollToBottom() }
      },
      (error) => {
        const mi = chatHistory.value.findIndex(m => m.id === aiMessageId)
        if (mi > -1) { chatHistory.value[mi].content = `发生错误: ${error}`; chatHistory.value[mi].loading = false }
        loading.value = false; ElMessage.error('AI响应失败')
      },
      () => {
        const mi = chatHistory.value.findIndex(m => m.id === aiMessageId)
        if (mi > -1) chatHistory.value[mi].timestamp = Date.now()
        loading.value = false; saveCurrentConversation()
      }
    )
    streamCleanup.value = cleanup
  } catch {
    const mi = chatHistory.value.findIndex(m => m.id === aiMessageId)
    if (mi > -1) { chatHistory.value[mi].content = 'AI服务暂时不可用，请稍后再试。'; chatHistory.value[mi].loading = false }
    loading.value = false
  }
}

const stopGeneration = () => {
  if (streamCleanup.value) { streamCleanup.value(); streamCleanup.value = null }
  loading.value = false
}

const setInput = (text: string) => { inputMessage.value = text }

const startNewChat = () => {
  chatHistory.value = [{ id: 'init', role: 'assistant', content: '你好！我是图书馆智能助手。你可以问我关于馆藏图书的问题，或者让我为你推荐书籍。', timestamp: Date.now() }]
  currentConversationId.value = null; recommendedBooks.value = []
}

const exportConversation = () => {
  const content = chatHistory.value.map(m => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`).join('\n\n')
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: `chat-${new Date().toISOString().slice(0, 10)}.txt` })
  a.click(); URL.revokeObjectURL(url); ElMessage.success('对话已导出')
}

const loadChatHistory = (item: Conversation) => { currentConversationId.value = item.id; chatHistory.value = item.messages; scrollToBottom() }

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
  } catch (e) { console.error('Save conversation error:', e) }
  finally { isSaving.value = false }
}

const loadConversations = async () => {
  if (!userStore.user?.id) return
  try {
    const result = await aiApi.getConversations(userStore.user.id, 20)
    if (result.success) {
      chatHistoryList.value = result.data.map((c: any) => ({ ...c, messages: typeof c.messages === 'string' ? JSON.parse(c.messages) : c.messages }))
    }
  } catch {}
}

const checkAIStatus = async () => { try { const r = await aiApi.isAvailable(); isAIOnline.value = r.success && r.data } catch { isAIOnline.value = false } }
const loadVectorStats = async () => { try { const r = await aiApi.getStatistics(); if (r.success) { totalVectors.value = r.data.totalVectors || 0; vectorCoverage.value = r.data.coverageRate || 0 } } catch {} }

onMounted(() => { checkAIStatus(); loadVectorStats(); loadConversations() })
onUnmounted(() => { if (streamCleanup.value) streamCleanup.value() })
</script>

<style scoped>
.ai-page {
  display: flex; gap: 0; height: calc(100vh - 128px);
  margin: -28px -32px; /* fill main-content padding */
}

/* Left Panel — Glass */
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
.hp-actions { display: flex; gap: 8px; margin-bottom: 16px; }
.action-chip {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 8px; border: 1px solid rgba(255,255,255,0.35); border-radius: 10px;
  background: rgba(255,255,255,0.35); color: var(--text-secondary); cursor: pointer;
  font-size: 12px; font-weight: 500; font-family: var(--font-sans);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  transition: all 0.15s;
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

.hp-stats {
  display: flex; gap: 16px; padding-top: 16px;
  border-top: 1px solid var(--border-light); margin-top: 12px;
}
.hp-stat { display: flex; flex-direction: column; }
.hp-stat-val { font-size: 16px; font-weight: 700; color: var(--text-primary); }
.hp-stat-lbl { font-size: 11px; color: var(--text-muted); }

/* Center Chat */
.chat-main {
  flex: 1; display: flex; flex-direction: column; min-width: 0;
  background: transparent;
}
.chat-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 24px;
  background: rgba(255,255,255,0.40);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border-bottom: 1px solid rgba(255,255,255,0.35);
}
.ch-title { font-size: 16px; font-weight: 700; color: var(--text-primary); }
.ch-sub { font-size: 12px; color: var(--text-muted); margin-top: 2px; }

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

.chat-input-area {
  padding: 16px 24px;
  background: rgba(255,255,255,0.40);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border-top: 1px solid rgba(255,255,255,0.35);
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
  box-shadow: 0 4px 16px rgba(200, 16, 46, 0.30); transition: all 0.2s;
}
.send-btn:hover { opacity: 0.9; transform: translateY(-1px); }

.stop-btn {
  height: 56px; padding: 0 20px; border: none; border-radius: 12px;
  background: var(--danger); color: #fff; cursor: pointer;
  display: flex; align-items: center; gap: 8px; font-size: 14px;
  font-weight: 600; font-family: var(--font-sans); transition: all 0.2s;
}
.stop-btn:hover { opacity: 0.9; }

/* Right Panel — Glass */
.recommend-panel {
  width: 280px; flex-shrink: 0;
  background: rgba(255,255,255,0.38);
  backdrop-filter: blur(18px) saturate(180%);
  -webkit-backdrop-filter: blur(18px) saturate(180%);
  border-left: 1px solid rgba(255,255,255,0.35);
  display: flex; flex-direction: column;
}
.rp-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; border-bottom: 1px solid var(--border-light);
}
.rp-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: var(--text-primary); }

.rp-list { flex: 1; overflow-y: auto; padding: 16px; }
.rp-book {
  display: flex; gap: 12px; padding: 12px;
  background: rgba(255,255,255,0.42); border-radius: 12px; margin-bottom: 10px;
  border: 1px solid rgba(255,255,255,0.35);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.rp-book:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(28,16,51,0.06);
}
.rp-book-icon {
  width: 40px; height: 40px; background: var(--gradient-brand);
  border-radius: 10px; display: flex; align-items: center; justify-content: center;
  color: #fff; flex-shrink: 0;
}
.rp-book-info { flex: 1; min-width: 0; }
.rp-book-title { font-weight: 600; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-primary); }
.rp-book-author { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
.rp-book-similarity { font-size: 11px; color: var(--gdut-purple); margin-top: 4px; }
.rp-empty { text-align: center; color: var(--text-muted); padding: 40px 16px; font-size: 13px; }
.rp-empty p { margin-top: 12px; }

@media (max-width: 1000px) { .recommend-panel { display: none !important; } }
@media (max-width: 768px) { .history-panel { display: none !important; } }
</style>
