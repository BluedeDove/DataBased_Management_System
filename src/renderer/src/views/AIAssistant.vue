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
        <div class="status-indicator" :class="{ online: isAIOnline }">
          <span class="status-dot"></span>
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
        <div class="section-title">快捷功能</div>
        <div class="action-grid">
          <button class="action-btn" @click="triggerTool('recommend')">
            <el-icon><Reading /></el-icon>
            <span>图书推荐</span>
          </button>
          <button class="action-btn" @click="triggerTool('search')">
            <el-icon><Search /></el-icon>
            <span>语义搜索</span>
          </button>
          <button class="action-btn" @click="startNewChat">
            <el-icon><ChatDotRound /></el-icon>
            <span>新对话</span>
          </button>
        </div>
      </div>

      <!-- 历史对话 -->
      <div class="history-section">
        <div class="section-title">历史对话</div>
        <div class="history-list">
          <div
            v-for="(item, index) in chatHistoryList"
            :key="index"
            class="history-item"
            @click="loadChatHistory(item)"
          >
            <el-icon><Clock /></el-icon>
            <span class="history-text">{{ item.title }}</span>
          </div>
          <div v-if="chatHistoryList.length === 0" class="empty-history">
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
          <div class="header-title">智能图书助手</div>
          <div class="header-subtitle">我可以为您推荐图书、查询信息或解答疑问</div>
        </div>
        <el-tag type="info" effect="plain" round>Powered by AI</el-tag>
      </div>

      <!-- 消息列表 -->
      <div class="chat-messages" ref="messagesRef">
        <div v-for="(msg, index) in chatHistory" :key="index"
             class="message-row" :class="msg.role">
          <div class="avatar">
            <el-icon v-if="msg.role === 'assistant'"><Service /></el-icon>
            <el-icon v-else><User /></el-icon>
          </div>
          <div class="bubble">
            <div v-if="msg.loading" class="typing-indicator">
              <span></span><span></span><span></span>
            </div>
            <div v-else v-html="formatContent(msg.content)"></div>
          </div>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="chat-input-area">
        <div class="quick-prompts">
          <el-button size="small" round @click="setInput('最近有什么新书？')">📚 新书推荐</el-button>
          <el-button size="small" round @click="setInput('适合初学者的Python书')">🐍 Python入门</el-button>
          <el-button size="small" round @click="setInput('推荐一些关于人工智能的书籍')">🤖 AI相关</el-button>
          <el-button size="small" round @click="setInput('如何查找图书馆的图书？')">🔍 使用帮助</el-button>
        </div>
        <div class="input-wrapper">
          <el-input
            v-model="inputMessage"
            type="textarea"
            :rows="2"
            placeholder="输入您的问题，按 Enter 发送..."
            @keydown.enter.prevent="sendMessage"
            :disabled="loading"
          />
          <el-button type="primary" :loading="loading" @click="sendMessage" class="send-btn">
            <el-icon><Promotion /></el-icon>
            发送
          </el-button>
        </div>
      </div>
    </div>

    <!-- 右侧推荐面板 -->
    <div class="recommend-panel glass-card" v-show="showRecommendPanel">
      <div class="panel-header">
        <div class="header-title">
          <el-icon><Reading /></el-icon>
          推荐图书
        </div>
        <el-button text @click="showRecommendPanel = false" v-if="windowWidth > 1400">
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
              <div class="book-title">{{ book.title }}</div>
              <div class="book-author">{{ book.author }}</div>
              <div class="book-meta">
                <span class="similarity">相关度: {{ book.similarity }}%</span>
              </div>
            </div>
            <el-button size="small" text type="primary" @click="viewBookDetail(book)">
              查看详情
            </el-button>
          </div>
        </div>
        <div v-else class="empty-recommend">
          <el-icon><Reading /></el-icon>
          <p>发起对话后，推荐图书将显示在这里</p>
        </div>
      </div>
    </div>

    <!-- 移动端推荐面板切换按钮 -->
    <el-button
      v-if="windowWidth <= 1400 && recommendedBooks.length > 0"
      class="toggle-recommend-btn"
      circle
      @click="showRecommendPanel = !showRecommendPanel"
    >
      <el-icon><Reading /></el-icon>
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  MagicStick, User, Service, Reading, Search, ChatDotRound,
  Clock, Promotion, Document, Close
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useUserStore } from '@/store/user'

interface Message {
  role: 'user' | 'assistant'
  content: string
  loading?: boolean
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

const router = useRouter()
const userStore = useUserStore()
const inputMessage = ref('')
const loading = ref(false)
const messagesRef = ref<HTMLElement | null>(null)
const chatHistory = ref<Message[]>([
  { role: 'assistant', content: '你好！我是图书馆智能助手。你可以问我关于馆藏图书的问题，或者让我为你推荐书籍。' }
])
const isAIOnline = ref(false)
const vectorCoverage = ref(0)
const totalVectors = ref(0)
const recommendedBooks = ref<RecommendedBook[]>([])
const chatHistoryList = ref<Conversation[]>([])
const currentConversationId = ref<number | null>(null)
const showRecommendPanel = ref(true)
const windowWidth = ref(window.innerWidth)

const setInput = (text: string) => {
  inputMessage.value = text
}

const triggerTool = (tool: string) => {
  if (tool === 'recommend') {
    inputMessage.value = '请为我推荐几本关于...的书'
  } else if (tool === 'search') {
    inputMessage.value = '搜索关于...的图书'
  }
}

const startNewChat = async () => {
  // 如果有当前对话且有内容，先保存到数据库
  if (currentConversationId.value && chatHistory.value.length > 1) {
    const lastUserMsg = chatHistory.value.findLast(m => m.role === 'user')
    if (lastUserMsg) {
      const title = lastUserMsg.content.substring(0, 50) + (lastUserMsg.content.length > 50 ? '...' : '')
      try {
        await window.api.ai.updateConversation(
          currentConversationId.value,
          title,
          chatHistory.value
        )
      } catch (error) {
        console.error('保存对话历史失败:', error)
      }
    }
  }

  // 创建新对话
  chatHistory.value = [
    { role: 'assistant', content: '你好！我是图书馆智能助手。你可以问我关于馆藏图书的问题，或者让我为你推荐书籍。' }
  ]
  currentConversationId.value = null
  recommendedBooks.value = []
  
  // 重新加载对话历史列表
  await loadConversations()
}

const loadChatHistory = (item: Conversation) => {
  chatHistory.value = [...item.messages]
  currentConversationId.value = item.id
  recommendedBooks.value = []
  scrollToBottom()
}

const loadConversations = async () => {
  if (!userStore.user?.id) return

  try {
    const result = await window.api.ai.getConversations(userStore.user.id, 20)
    if (result.success) {
      chatHistoryList.value = result.data
    }
  } catch (error) {
    console.error('加载对话历史失败:', error)
  }
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}

const formatContent = (content: string) => {
  const html = marked(content)
  return DOMPurify.sanitize(html as string)
}

const parseRecommendedBooks = (content: string): RecommendedBook[] => {
  const books: RecommendedBook[] = []
  // 尝试解析AI回复中的图书信息
  const lines = content.split('\n')
  for (const line of lines) {
    // 匹配类似 "1. 《书名》 - 作者" 或 "• 《书名》 作者" 的格式
    const match = line.match(/(?:\d+\.|•)\s*《([^》]+)》\s*[-—]\s*([^\n]+)/)
    if (match) {
      books.push({
        title: match[1].trim(),
        author: match[2].trim(),
        similarity: Math.floor(Math.random() * 15) + 85 // 模拟相关度
      })
    }
  }
  return books
}

const viewBookDetail = (book: RecommendedBook) => {
  ElMessage.info(`查看图书详情: ${book.title}`)
  // 可以跳转到图书详情页
  // router.push(`/books/${book.bookId}`)
}

const checkAIStatus = async () => {
  try {
    const result = await window.api.ai.isAvailable()
    isAIOnline.value = result.success
  } catch (error) {
    isAIOnline.value = false
  }

  try {
    const stats = await window.api.ai.getStatistics()
    if (stats.success) {
      totalVectors.value = stats.data.totalVectors
      vectorCoverage.value = Math.round(stats.data.coverageRate)
    }
  } catch (error) {
    console.error('获取AI统计信息失败:', error)
  }
}

const handleResize = () => {
  windowWidth.value = window.innerWidth
  if (windowWidth.value <= 1400) {
    showRecommendPanel.value = false
  } else {
    showRecommendPanel.value = true
  }
}

const sendMessage = async () => {
  const text = inputMessage.value.trim()
  if (!text || loading.value) return

  // Add user message
  chatHistory.value.push({ role: 'user', content: text })
  inputMessage.value = ''
  loading.value = true
  scrollToBottom()

  // 如果是新对话，创建对话记录
  if (!currentConversationId.value && userStore.user?.id) {
    try {
      const result = await window.api.ai.saveConversation(
        userStore.user.id,
        text.substring(0, 50) + (text.length > 50 ? '...' : ''),
        [{ role: 'user', content: text }]
      )
      if (result.success) {
        currentConversationId.value = result.data.id
        // 重新加载对话历史列表
        await loadConversations()
      }
    } catch (error) {
      console.error('保存对话失败:', error)
    }
  }

  // Add placeholder for AI response
  const aiMsgIndex = chatHistory.value.push({ role: 'assistant', content: '', loading: true }) - 1
  scrollToBottom()

  try {
    // 简化处理：如果由推荐需求，调用推荐接口；否则调用普通对话
    const isRecommendation = text.includes('推荐') || text.includes('书') || text.includes('找')

    if (isRecommendation) {
      // 调用流式推荐
      await new Promise<void>((resolve, reject) => {
        let fullContent = ''
        const cleanup = window.api.ai.recommendBooksStream(
          text,
          3, // limit
          (chunk) => {
            chatHistory.value[aiMsgIndex].loading = false
            fullContent += chunk
            chatHistory.value[aiMsgIndex].content = fullContent
            scrollToBottom()
          },
          (error) => {
            console.error(error)
            reject(new Error(error))
          },
          () => {
            // 解析推荐图书
            recommendedBooks.value = parseRecommendedBooks(fullContent)
            resolve()
          }
        )
      })
    } else {
      // 普通闲聊
      await new Promise<void>((resolve, reject) => {
        let fullContent = ''
        const cleanup = window.api.ai.chatStream(
          text,
          [], // history
          undefined, // context
          (chunk) => {
            chatHistory.value[aiMsgIndex].loading = false
            fullContent += chunk
            chatHistory.value[aiMsgIndex].content = fullContent
            scrollToBottom()
          },
          (error) => reject(new Error(error)),
          () => resolve()
        )
      })
    }
  } catch (error: any) {
    chatHistory.value[aiMsgIndex].content = `抱歉，遇到了一些问题：${error.message || '网络请求超时'}`
    chatHistory.value[aiMsgIndex].loading = false
  } finally {
    loading.value = false
    scrollToBottom()
  }
}

onMounted(() => {
  checkAIStatus()
  loadConversations()
  window.addEventListener('resize', handleResize)
  handleResize()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.ai-container {
  height: calc(100vh - 48px);
  padding: 0;
  display: grid;
  grid-template-columns: 260px 1fr 300px;
  gap: 20px;
  overflow: hidden;
}

/* 左侧功能面板 */
.side-panel {
  display: flex;
  flex-direction: column;
  padding: 20px;
  overflow: hidden;
}

.panel-header {
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  margin-bottom: 20px;
}

.ai-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-main);
}

.ai-logo .el-icon {
  font-size: 24px;
  background: linear-gradient(135deg, #6366f1, #ec4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* AI服务状态 */
.status-section {
  background: rgba(99, 102, 241, 0.08);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #94a3b8;
}

.status-indicator.online .status-dot {
  background: #10b981;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
}

.status-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
}

.stats-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: var(--text-muted);
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-main);
}

/* 快捷功能 */
.quick-actions {
  margin-bottom: 24px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
}

.action-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-main);
  width: 100%;
}

.action-btn:hover {
  background: rgba(99, 102, 241, 0.08);
  border-color: rgba(99, 102, 241, 0.2);
  transform: translateX(4px);
}

.action-btn .el-icon {
  font-size: 18px;
  color: var(--primary-color);
}

/* 历史对话 */
.history-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.history-item:hover {
  background: rgba(0, 0, 0, 0.03);
}

.history-item .el-icon {
  font-size: 14px;
  color: var(--text-muted);
}

.history-text {
  flex: 1;
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-history {
  text-align: center;
  padding: 30px 20px;
  color: var(--text-muted);
  font-size: 13px;
}

/* 中间主聊天区域 */
.main-chat-area {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-header {
  padding: 20px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-main);
}

.header-subtitle {
  font-size: 13px;
  color: var(--text-secondary);
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  scroll-behavior: smooth;
}

.message-row {
  display: flex;
  gap: 16px;
  max-width: 85%;
}

.message-row.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.assistant .avatar {
  background: #e0e7ff;
  color: #4f46e5;
}

.user .avatar {
  background: #fce7f3;
  color: #db2777;
}

.bubble {
  padding: 12px 16px;
  border-radius: 12px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  font-size: 15px;
  line-height: 1.6;
}

.user .bubble {
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: white;
  border-bottom-right-radius: 4px;
}

.assistant .bubble {
  background: white;
  border-top-left-radius: 4px;
}

.chat-input-area {
  padding: 20px 24px;
  background: white;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.quick-prompts {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.quick-prompts::-webkit-scrollbar {
  height: 4px;
}

.quick-prompts::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 2px;
}

.input-wrapper {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.input-wrapper :deep(.el-textarea__inner) {
  resize: none;
  border-radius: 12px;
  font-size: 14px;
}

.send-btn {
  height: 52px;
  padding: 0 24px;
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 打字指示器 */
.typing-indicator span {
  display: inline-block;
  width: 6px;
  height: 6px;
  background-color: #94a3b8;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
  margin: 0 2px;
}

.typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
.typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

/* Markdown样式 */
:deep(.bubble p) { margin: 0 0 8px 0; }
:deep(.bubble p:last-child) { margin: 0; }
:deep(.bubble ul), :deep(.bubble ol) { padding-left: 20px; margin: 8px 0; }
:deep(.bubble code) {
  background: rgba(0, 0, 0, 0.05);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
}
:deep(.bubble pre) {
  background: rgba(0, 0, 0, 0.05);
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 8px 0;
}
:deep(.bubble pre code) {
  background: none;
  padding: 0;
}
:deep(.bubble strong) {
  font-weight: 600;
  color: var(--text-main);
}

/* 右侧推荐面板 */
.recommend-panel {
  display: flex;
  flex-direction: column;
  padding: 20px;
  overflow: hidden;
}

.recommend-panel .panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  margin-bottom: 20px;
}

.recommend-panel .header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-main);
}

.recommend-panel .header-title .el-icon {
  color: var(--primary-color);
}

.recommend-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.book-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: white;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.2s;
}

.book-card:hover {
  border-color: rgba(99, 102, 241, 0.3);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);
  transform: translateY(-2px);
}

.book-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #e0e7ff, #c7d2fe);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-color);
  flex-shrink: 0;
}

.book-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.book-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.book-author {
  font-size: 12px;
  color: var(--text-secondary);
}

.book-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.similarity {
  font-size: 11px;
  color: var(--text-muted);
  background: rgba(16, 185, 129, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
  color: #10b981;
}

.empty-recommend {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-muted);
}

.empty-recommend .el-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-recommend p {
  font-size: 13px;
  margin: 0;
}

/* 移动端推荐面板切换按钮 */
.toggle-recommend-btn {
  position: fixed;
  bottom: 100px;
  right: 24px;
  width: 48px;
  height: 48px;
  z-index: 100;
  background: linear-gradient(135deg, #6366f1, #ec4899) !important;
  border: none !important;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);
}

.toggle-recommend-btn:hover {
  transform: scale(1.1);
}

/* 响应式设计 */
@media (max-width: 1400px) {
  .ai-container {
    grid-template-columns: 260px 1fr;
  }

  .recommend-panel {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 350px;
    max-height: 70vh;
    z-index: 1000;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  }
}

@media (max-width: 1000px) {
  .ai-container {
    grid-template-columns: 1fr;
    padding: 16px;
  }

  .side-panel {
    display: none;
  }

  .chat-messages {
    padding: 16px;
  }

  .chat-input-area {
    padding: 16px;
  }

  .quick-prompts {
    flex-wrap: nowrap;
  }
}
</style>
