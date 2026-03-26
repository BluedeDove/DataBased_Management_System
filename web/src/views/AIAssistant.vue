<template>
  <div class="page-container ai-container">
    <!-- 左侧功能面板 -->
    <div class="side-panel glass-card">
      <div class="panel-header">
        <div class="ai-logo">
          <el-icon><MagicStick /></el-icon>
          <span>AI助手</span>
        </div>
      </div>

      <!-- AI服务状态 -->
      <div class="status-section">
        <div
          class="status-indicator"
          :class="{ online: isAIOnline }"
        >
          <span class="status-dot" />
          <span class="status-text">{{ isAIOnline ? '在线' : '离线' }}</span>
        </div>
        <div class="stats-info">
          <div class="stat-item">
            <span class="stat-label">向量覆盖</span>
            <span class="stat-value">{{ vectorCoverage }}%</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">图书总数</span>
            <span class="stat-value">{{ totalVectors }}</span>
          </div>
        </div>
      </div>

      <!-- 快捷功能 -->
      <div class="quick-actions">
        <div class="section-title">
          快捷功能
        </div>
        <div class="action-grid">
          <button
            class="action-btn"
            @click="triggerTool('recommend')"
          >
            <el-icon><Reading /></el-icon>
            <span>图书推荐</span>
          </button>
          <button
            class="action-btn"
            @click="triggerTool('search')"
          >
            <el-icon><Search /></el-icon>
            <span>语义搜索</span>
          </button>
          <button
            class="action-btn"
            @click="startNewChat"
          >
            <el-icon><ChatDotRound /></el-icon>
            <span>新对话</span>
          </button>
          <button
            class="action-btn"
            :disabled="loading"
            @click="regenerateLastMessage"
          >
            <el-icon><RefreshRight /></el-icon>
            <span>重新生成</span>
          </button>
          <button
            class="action-btn"
            @click="exportConversation"
          >
            <el-icon><Download /></el-icon>
            <span>导出对话</span>
          </button>
        </div>
      </div>

      <!-- 历史对话 -->
      <div class="history-section">
        <div class="section-title">
          历史对话
        </div>
        <el-input
          v-model="searchQuery"
          placeholder="搜索对话..."
          prefix-icon="Search"
          clearable
          size="small"
          class="history-search"
        />
        <div class="history-list">
          <div
            v-for="item in filteredChatHistoryList"
            :key="item.id"
            class="history-item"
            @click="loadChatHistory(item)"
          >
            <el-icon><Clock /></el-icon>
            <span class="history-text">{{ item.title }}</span>
            <el-button
              text
              size="small"
              type="danger"
              class="delete-btn"
              @click.stop="deleteConversation(item)"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
          <div
            v-if="chatHistoryList.length === 0"
            class="empty-history"
          >
            暂无历史对话
          </div>
        </div>
      </div>
    </div>

    <!-- 中间主聊天区域 -->
    <div class="main-chat-area glass-card">
      <!-- 聊天头部 -->
      <div class="chat-header">
        <div class="header-info">
          <div class="header-title">
            智能图书助手
          </div>
          <div class="header-subtitle">
            我可以为您推荐图书、查询信息或解答疑问
          </div>
        </div>
        <el-tag
          type="info"
          effect="plain"
          round
        >
          Powered by AI
        </el-tag>
      </div>

      <!-- 消息列表 -->
      <div
        ref="messagesRef"
        class="chat-messages"
      >
        <div
          v-for="(msg, index) in chatHistory"
          :key="msg.id || index"
          class="message-row"
          :class="msg.role"
        >
          <div class="avatar">
            <el-icon v-if="msg.role === 'assistant'">
              <Service />
            </el-icon>
            <el-icon v-else>
              <User />
            </el-icon>
          </div>
          <div class="bubble">
            <div
              v-if="msg.loading"
              class="typing-indicator"
            >
              <span /><span /><span />
            </div>
            <div
              v-else
              v-html="formatContent(msg.content)"
            />
            <div
              v-if="msg.timestamp && !msg.loading"
              class="message-timestamp"
            >
              {{ formatTime(msg.timestamp) }}
            </div>
          </div>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="chat-input-area">
        <div class="quick-prompts">
          <el-button
            size="small"
            round
            @click="setInput('最近有什么新书？')"
          >
            📚 新书推荐
          </el-button>
          <el-button
            size="small"
            round
            @click="setInput('适合初学者的Python书')"
          >
            🐍 Python入门
          </el-button>
          <el-button
            size="small"
            round
            @click="setInput('推荐一些关于人工智能的书籍')"
          >
            🤖 AI相关
          </el-button>
        </div>
        <div class="input-wrapper">
          <el-input
            v-model="inputMessage"
            type="textarea"
            :rows="2"
            placeholder="输入您的问题，按 Enter 发送..."
            :disabled="loading"
            @keydown.enter.prevent="sendMessage"
          />
          <div class="button-group">
            <el-button
              v-if="loading"
              type="danger"
              class="stop-btn"
              @click="stopGeneration"
            >
              <el-icon><VideoPause /></el-icon>
              停止
            </el-button>
            <el-button
              v-else
              type="primary"
              :loading="loading"
              class="send-btn"
              @click="sendMessage"
            >
              <el-icon><Promotion /></el-icon>
              发送
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧推荐面板 -->
    <div
      v-show="showRecommendPanel"
      class="recommend-panel glass-card"
    >
      <div class="panel-header">
        <div class="header-title">
          <el-icon><Reading /></el-icon>
          推荐图书
        </div>
        <el-button
          text
          @click="showRecommendPanel = false"
        >
          <el-icon><Close /></el-icon>
        </el-button>
      </div>

      <div class="recommend-list">
        <div v-if="recommendedBooks.length > 0">
          <div
            v-for="(book, index) in recommendedBooks"
            :key="index"
            class="book-card"
          >
            <div class="book-icon">
              <el-icon><Document /></el-icon>
            </div>
            <div class="book-info">
              <div class="book-title">
                {{ book.title }}
              </div>
              <div class="book-author">
                {{ book.author }}
              </div>
              <div class="book-meta">
                <span class="similarity">相关度: {{ book.similarity }}%</span>
              </div>
            </div>
          </div>
        </div>
        <div
          v-else
          class="empty-recommend"
        >
          <el-icon><Reading /></el-icon>
          <p>发起对话后，推荐图书将显示在这里</p>
        </div>
      </div>
    </div>
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

interface Message {
  id?: string
  role: 'user' | 'assistant'
  content: string
  loading?: boolean
  timestamp?: number
}

interface RecommendedBook {
  title: string
  author: string
  description?: string
  similarity: number
  bookId?: number
}

interface Conversation {
  id: number
  title: string
  messages: Message[]
  created_at: string
}

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
const showRecommendPanel = ref(true)
const searchQuery = ref('')

// 过滤后的对话列表
const filteredChatHistoryList = computed(() => {
  if (!searchQuery.value) return chatHistoryList.value
  return chatHistoryList.value.filter(c =>
    c.title.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

// 格式化内容
const formatContent = (content: string) => {
  if (!content) return ''
  const html = marked(content) as string
  return DOMPurify.sanitize(html)
}

// 格式化时间
const formatTime = (timestamp?: number) => {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}

// 发送消息
const sendMessage = async () => {
  if (!inputMessage.value.trim() || loading.value) return

  const userMessage = inputMessage.value.trim()
  inputMessage.value = ''

  // 添加用户消息
  chatHistory.value.push({
    id: `user-${Date.now()}`,
    role: 'user',
    content: userMessage,
    timestamp: Date.now()
  })
  scrollToBottom()

  // 添加加载中的AI消息
  const aiMessageId = `ai-${Date.now()}`
  chatHistory.value.push({
    id: aiMessageId,
    role: 'assistant',
    content: '',
    loading: true
  })
  loading.value = true
  scrollToBottom()

  try {
    // 准备历史消息
    const history = chatHistory.value
      .filter(m => !m.loading && m.id !== 'init')
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content }))

    // 使用流式对话
    let fullContent = ''
    const cleanup = aiApi.chatStream(
      userMessage,
      history as any,
      undefined,
      (chunk) => {
        fullContent += chunk
        const msgIndex = chatHistory.value.findIndex(m => m.id === aiMessageId)
        if (msgIndex > -1) {
          chatHistory.value[msgIndex].content = fullContent
          chatHistory.value[msgIndex].loading = false
          scrollToBottom()
        }
      },
      (error) => {
        const msgIndex = chatHistory.value.findIndex(m => m.id === aiMessageId)
        if (msgIndex > -1) {
          chatHistory.value[msgIndex].content = `发生错误: ${error}`
          chatHistory.value[msgIndex].loading = false
        }
        loading.value = false
        ElMessage.error('AI响应失败')
      },
      () => {
        const msgIndex = chatHistory.value.findIndex(m => m.id === aiMessageId)
        if (msgIndex > -1) {
          chatHistory.value[msgIndex].timestamp = Date.now()
        }
        loading.value = false
        saveCurrentConversation()
      }
    )

    streamCleanup.value = cleanup
  } catch (error) {
    const msgIndex = chatHistory.value.findIndex(m => m.id === aiMessageId)
    if (msgIndex > -1) {
      chatHistory.value[msgIndex].content = 'AI服务暂时不可用，请稍后再试。'
      chatHistory.value[msgIndex].loading = false
    }
    loading.value = false
  }
}

// 停止生成
const stopGeneration = () => {
  if (streamCleanup.value) {
    streamCleanup.value()
    streamCleanup.value = null
  }
  loading.value = false
}

// 触发工具
const triggerTool = (tool: string) => {
  if (tool === 'recommend') {
    setInput('请为我推荐一些图书')
  } else if (tool === 'search') {
    setInput('请帮我搜索')
  }
}

// 设置输入
const setInput = (text: string) => {
  inputMessage.value = text
}

// 开始新对话
const startNewChat = () => {
  chatHistory.value = [
    { id: 'init', role: 'assistant', content: '你好！我是图书馆智能助手。你可以问我关于馆藏图书的问题，或者让我为你推荐书籍。', timestamp: Date.now() }
  ]
  currentConversationId.value = null
  recommendedBooks.value = []
}

// 重新生成最后一条消息
const regenerateLastMessage = () => {
  if (chatHistory.value.length < 2) return

  const lastUserMsg = [...chatHistory.value].reverse().find(m => m.role === 'user')
  if (lastUserMsg) {
    // 移除最后的AI消息
    const lastAiIndex = chatHistory.value.length - 1
    if (chatHistory.value[lastAiIndex].role === 'assistant') {
      chatHistory.value.splice(lastAiIndex, 1)
    }
    // 重新发送
    inputMessage.value = lastUserMsg.content
    sendMessage()
  }
}

// 导出对话
const exportConversation = () => {
  const content = chatHistory.value
    .map(m => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`)
    .join('\n\n')

  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `chat-${new Date().toISOString().slice(0, 10)}.txt`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('对话已导出')
}

// 加载聊天历史
const loadChatHistory = async (item: Conversation) => {
  currentConversationId.value = item.id
  chatHistory.value = item.messages
  scrollToBottom()
}

// 删除对话
const deleteConversation = async (item: Conversation) => {
  try {
    const result = await aiApi.deleteConversation(item.id)
    if (result.success) {
      chatHistoryList.value = chatHistoryList.value.filter(c => c.id !== item.id)
      if (currentConversationId.value === item.id) {
        startNewChat()
      }
      ElMessage.success('对话已删除')
    }
  } catch (error) {
    ElMessage.error('删除失败')
  }
}

// 保存当前对话
const saveCurrentConversation = async () => {
  if (!userStore.user?.id || chatHistory.value.length <= 1) return

  const title = chatHistory.value.find(m => m.role === 'user')?.content.slice(0, 30) || '新对话'
  const messages = chatHistory.value.map(m => ({
    role: m.role,
    content: m.content,
    timestamp: m.timestamp
  }))

  try {
    if (currentConversationId.value) {
      await aiApi.updateConversation(currentConversationId.value, title, messages as any)
    } else {
      const result = await aiApi.saveConversation(userStore.user.id, title, messages as any)
      if (result.success) {
        currentConversationId.value = result.data.id
        loadConversations()
      }
    }
  } catch (error) {
    console.error('Failed to save conversation:', error)
  }
}

// 加载对话列表
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
  } catch (error) {
    console.error('Failed to load conversations:', error)
  }
}

// 检查AI状态
const checkAIStatus = async () => {
  try {
    const result = await aiApi.isAvailable()
    isAIOnline.value = result.success && result.data
  } catch (error) {
    isAIOnline.value = false
  }
}

// 加载向量统计
const loadVectorStats = async () => {
  try {
    const result = await aiApi.getStatistics()
    if (result.success) {
      totalVectors.value = result.data.totalVectors || 0
      vectorCoverage.value = result.data.coverageRate || 0
    }
  } catch (error) {
    console.error('Failed to load vector stats:', error)
  }
}

// 窗口大小变化处理
const handleResize = () => {
  // Responsive logic if needed
}

onMounted(() => {
  checkAIStatus()
  loadVectorStats()
  loadConversations()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (streamCleanup.value) {
    streamCleanup.value()
  }
})
</script>

<style scoped>
.ai-container {
  display: flex;
  gap: 20px;
  height: calc(100vh - 120px);
}

.side-panel {
  width: 280px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  flex-shrink: 0;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ai-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: var(--primary-color);
}

.status-section {
  padding: 16px;
  background: rgba(99, 102, 241, 0.05);
  border-radius: 12px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ef4444;
}

.status-indicator.online .status-dot {
  background: #22c55e;
}

.status-text {
  font-size: 14px;
  color: var(--text-secondary);
}

.stats-info {
  display: flex;
  gap: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-main);
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.action-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px;
  background: rgba(99, 102, 241, 0.05);
  border: 1px solid rgba(99, 102, 241, 0.1);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 12px;
  color: var(--text-main);
}

.action-btn:hover {
  background: rgba(99, 102, 241, 0.1);
  transform: translateY(-2px);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.history-section {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.history-search {
  margin-bottom: 12px;
}

.history-list {
  flex: 1;
  overflow-y: auto;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 4px;
}

.history-item:hover {
  background: rgba(99, 102, 241, 0.05);
}

.history-text {
  flex: 1;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-history {
  text-align: center;
  color: var(--text-secondary);
  padding: 20px;
  font-size: 14px;
}

.main-chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 0;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-main);
}

.header-subtitle {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.message-row {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.message-row.user {
  flex-direction: row-reverse;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.message-row.user .avatar {
  background: linear-gradient(135deg, #10b981, #059669);
}

.bubble {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 16px;
  background: #f1f5f9;
  line-height: 1.6;
}

.message-row.user .bubble {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
  color: white;
}

.message-timestamp {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 8px;
  opacity: 0.7;
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 4px 0;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: var(--primary-color);
  border-radius: 50%;
  animation: typing 1s infinite;
}

.typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing {
  0%, 100% { opacity: 0.3; transform: translateY(0); }
  50% { opacity: 1; transform: translateY(-4px); }
}

.chat-input-area {
  padding: 20px;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.quick-prompts {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.input-wrapper {
  display: flex;
  gap: 12px;
}

.input-wrapper :deep(.el-textarea) {
  flex: 1;
}

.button-group {
  display: flex;
  align-items: flex-end;
}

.send-btn, .stop-btn {
  height: 54px;
  padding: 0 20px;
}

.recommend-panel {
  width: 300px;
  padding: 0;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.recommend-panel .panel-header {
  padding: 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.recommend-panel .header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.recommend-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.book-card {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: rgba(99, 102, 241, 0.03);
  border-radius: 12px;
  margin-bottom: 12px;
}

.book-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.book-info {
  flex: 1;
  min-width: 0;
}

.book-title {
  font-weight: 600;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.book-author {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.book-meta {
  margin-top: 8px;
}

.similarity {
  font-size: 12px;
  color: var(--primary-color);
}

.empty-recommend {
  text-align: center;
  color: var(--text-secondary);
  padding: 40px 20px;
}

.empty-recommend .el-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.3;
}

.delete-btn {
  opacity: 0;
  transition: opacity 0.2s;
}

.history-item:hover .delete-btn {
  opacity: 1;
}
</style>
