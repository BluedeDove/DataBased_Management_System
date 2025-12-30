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
          <button class="action-btn" @click="regenerateLastMessage" :disabled="loading">
            <el-icon><RefreshRight /></el-icon>
            <span>重新生成</span>
          </button>
          <button class="action-btn" @click="exportConversation">
            <el-icon><Download /></el-icon>
            <span>导出对话</span>
          </button>
        </div>
      </div>

      <!-- 历史对话 -->
      <div class="history-section">
        <div class="section-title">历史对话</div>
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
            <span v-if="editingConversationId !== item.id" class="history-text" @dblclick="startRename(item)">{{ item.title }}</span>
            <el-input
              v-else
              v-model="editingTitleText"
              size="small"
              @blur="saveTitle(item)"
              @keyup.enter="saveTitle(item)"
              @keyup.esc="cancelRename"
              class="rename-input"
              ref="renameInputRef"
              @click.stop
            />
            <el-button
              v-if="editingConversationId !== item.id"
              text
              size="small"
              @click="startRename(item)"
              class="rename-btn"
            >
              <el-icon><Edit /></el-icon>
            </el-button>
            <el-button
              text
              size="small"
              type="danger"
              @click="deleteConversation(item, $event)"
              class="delete-btn"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
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
        <div v-for="(msg, index) in chatHistory" :key="msg.id || index"
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
            <!-- 消息时间戳 -->
            <div v-if="msg.timestamp && !msg.loading" class="message-timestamp">
              {{ formatTime(msg.timestamp) }}
            </div>
            <!-- 消息操作按钮 -->
            <div class="message-actions">
              <!-- 复制按钮 -->
              <el-tooltip content="复制" placement="top">
                <el-button text size="small" @click="copyMessage(msg.content)">
                  <el-icon><DocumentCopy /></el-icon>
                </el-button>
              </el-tooltip>
              <!-- 编辑按钮（仅用户消息） -->
              <el-tooltip v-if="msg.role === 'user' && !loading" content="编辑" placement="top">
                <el-button text size="small" @click="editMessage(index)">
                  <el-icon><Edit /></el-icon>
                </el-button>
              </el-tooltip>
              <!-- 删除按钮 -->
              <el-tooltip content="删除" placement="top">
                <el-button text size="small" type="danger" @click="deleteMessage(index)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </el-tooltip>
              <!-- 点赞/点踩按钮（仅AI消息） -->
              <template v-if="msg.role === 'assistant'">
                <el-tooltip content="点赞" placement="top">
                  <el-button
                    text
                    size="small"
                    :type="msg.feedback === 'like' ? 'primary' : 'default'"
                    @click="feedbackMessage(msg.id, 'like')"
                  >
                    <el-icon><Service /></el-icon>
                  </el-button>
                </el-tooltip>
                <el-tooltip content="点踩" placement="top">
                  <el-button
                    text
                    size="small"
                    :type="msg.feedback === 'dislike' ? 'danger' : 'default'"
                    @click="feedbackMessage(msg.id, 'dislike')"
                  >
                    <el-icon><Close /></el-icon>
                  </el-button>
                </el-tooltip>
              </template>
              <!-- 重新发送按钮（仅用户消息） -->
              <el-tooltip v-if="msg.role === 'user' && !loading" content="重新发送" placement="top">
                <el-button
                  text
                  size="small"
                  type="info"
                  @click="resendMessage(index)"
                  class="resend-btn"
                >
                  <el-icon><RefreshRight /></el-icon>
                </el-button>
              </el-tooltip>
            </div>
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
          <div class="button-group">
            <el-button v-if="loading" type="danger" @click="stopGeneration" class="stop-btn">
              <el-icon><VideoPause /></el-icon>
              停止
            </el-button>
            <el-button v-else type="primary" :loading="loading" @click="sendMessage" class="send-btn">
              <el-icon><Promotion /></el-icon>
              发送
            </el-button>
          </div>
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
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  MagicStick, User, Service, Reading, Search, ChatDotRound,
  Clock, Promotion, Document, Close, RefreshRight, Delete,
  VideoPause, DocumentCopy, Edit, Download
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useUserStore } from '@/store/user'

interface Message {
  id?: string
  role: 'user' | 'assistant'
  content: string
  loading?: boolean
  timestamp?: number
  feedback?: 'like' | 'dislike' | null
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
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
const streamCleanup = ref<(() => void) | null>(null)
const currentRequestId = ref<string | null>(null)
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
const windowWidth = ref(window.innerWidth)
const searchQuery = ref('')
const editingConversationId = ref<number | null>(null)
const editingTitleText = ref('')
const renameInputRef = ref<HTMLInputElement | null>(null)

// 过滤后的对话列表
const filteredChatHistoryList = computed(() => {
  if (!searchQuery.value) return chatHistoryList.value
  return chatHistoryList.value.filter(item =>
    item.title.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

const setInput = (text: string) => {
  inputMessage.value = text
}

// 复制文本到剪贴板
const copyMessage = async (content: string) => {
  try {
    await navigator.clipboard.writeText(content)
    ElMessage.success('复制成功')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

// 停止生成
const stopGeneration = () => {
  console.log('[stopGeneration] ========== 停止生成 ==========')
  console.log('[stopGeneration] 当前请求ID:', currentRequestId.value)

  if (currentRequestId.value) {
    // 发送取消请求到主进程
    const isRecommendation = chatHistory.value.some(m => m.content.includes('推荐') || m.content.includes('书'))
    if (isRecommendation) {
      console.log('[stopGeneration] 取消流式推荐')
      window.api.ai.cancelRecommendBooksStream(currentRequestId.value)
    } else {
      console.log('[stopGeneration] 取消流式聊天')
      window.api.ai.cancelChatStream(currentRequestId.value)
    }
    currentRequestId.value = null
  }

  // 清理前端监听器
  if (streamCleanup.value) {
    streamCleanup.value()
    streamCleanup.value = null
  }

  loading.value = false
  ElMessage.info('已停止生成')
  console.log('[stopGeneration] ========== 停止生成完成 ==========')
}

// 格式化时间戳
const formatTime = (timestamp: number | undefined) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

// 消息反馈
const feedbackMessage = (msgId: string | undefined, type: 'like' | 'dislike') => {
  const msg = chatHistory.value.find(m => m.id === msgId)
  if (msg) {
    msg.feedback = msg.feedback === type ? null : type
    ElMessage.success(type === 'like' ? '已点赞' : '已点踩')
  }
}

const triggerTool = (tool: string) => {
  if (tool === 'recommend') {
    inputMessage.value = '请为我推荐几本关于...的书'
  } else if (tool === 'search') {
    inputMessage.value = '搜索关于...的图书'
  }
}

// 保存当前对话到数据库
const saveCurrentConversation = async () => {
  console.log('[saveCurrentConversation] 开始保存对话')
  console.log('[saveCurrentConversation] 用户ID:', userStore.user?.id)
  console.log('[saveCurrentConversation] 用户角色:', userStore.user?.role)
  console.log('[saveCurrentConversation] 当前对话ID:', currentConversationId.value)
  console.log('[saveCurrentConversation] 加载状态:', loading.value)
  console.log('[saveCurrentConversation] 聊天历史长度:', chatHistory.value.length)
  
  if (!userStore.user?.id) {
    console.warn('[saveCurrentConversation] 用户未登录，无法保存对话')
    return
  }
  
  // 管理员用户跳过对话保存（管理员不需要保存AI对话历史）
  if (userStore.user.role === 'admin') {
    console.log('[saveCurrentConversation] 管理员用户，跳过对话保存')
    return
  }
  
  // 如果正在加载中，不保存（避免保存未完成的AI回答）
  if (loading.value) {
    console.log('[saveCurrentConversation] AI正在生成中，跳过对话保存')
    return
  }
  
  if (currentConversationId.value && chatHistory.value.length > 0) {
    try {
      console.log('[saveCurrentConversation] 准备保存对话...')
      // 过滤掉loading状态的消息
      const messagesToSave = chatHistory.value.filter(m => !m.loading)
      console.log('[saveCurrentConversation] 过滤后的消息数量:', messagesToSave.length)
      
      // 如果没有有效的消息，不保存
      if (messagesToSave.length === 0) {
        console.log('[saveCurrentConversation] 没有有效的消息，跳过对话保存')
        return
      }
      
      // 使用深拷贝确保数据可序列化
      const messagesToSaveSerialized = JSON.parse(JSON.stringify(messagesToSave))
      console.log('[saveCurrentConversation] 序列化后的消息数量:', messagesToSaveSerialized.length)
      
      // 查找最后一条用户消息作为标题
      const lastUserMsg = messagesToSaveSerialized.slice().reverse().find((m: any) => m.role === 'user')
      console.log('[saveCurrentConversation] 最后一条用户消息:', lastUserMsg?.content?.substring(0, 30))
      
      const title = lastUserMsg
        ? lastUserMsg.content.substring(0, 50) + (lastUserMsg.content.length > 50 ? '...' : '')
        : '新对话'
      console.log('[saveCurrentConversation] 对话标题:', title)
      
      console.log('[saveCurrentConversation] 调用 IPC updateConversation...')
      const result = await window.api.ai.updateConversation(
        currentConversationId.value,
        title,
        messagesToSaveSerialized
      )
      console.log('[saveCurrentConversation] IPC 调用结果:', result)
      
      // 重新加载对话历史列表以更新标题
      console.log('[saveCurrentConversation] 重新加载对话历史列表...')
      await loadConversations()
      console.log('[saveCurrentConversation] 对话保存成功')
    } catch (error) {
      console.error('[saveCurrentConversation] 保存对话历史失败:', error)
      console.error('[saveCurrentConversation] 错误详情:', JSON.stringify(error))
      ElMessage.error('保存对话失败')
    }
  } else {
    console.log('[saveCurrentConversation] 没有对话ID或聊天历史为空，跳过保存')
  }
}

const startNewChat = async () => {
  console.log('[startNewChat] ========== 开始新对话 ==========')
  console.log('[startNewChat] 当前对话ID:', currentConversationId.value)
  console.log('[startNewChat] 当前聊天历史长度:', chatHistory.value.length)

  // 如果有当前对话且有内容，先保存到数据库
  await saveCurrentConversation()

  // 创建新对话
  chatHistory.value = [
    { id: 'init', role: 'assistant', content: '你好！我是图书馆智能助手。你可以问我关于馆藏图书的问题，或者让我为你推荐书籍。' }
  ]
  currentConversationId.value = null
  recommendedBooks.value = []

  console.log('[startNewChat] 新对话已创建')

  // 重新加载对话历史列表
  await loadConversations()
  console.log('[startNewChat] 对话历史列表已更新')
  console.log('[startNewChat] ========== 新对话创建完成 ==========')
}

const loadChatHistory = async (item: Conversation) => {
  console.log('[loadChatHistory] ========== 开始加载对话历史 ==========')
  console.log('[loadChatHistory] 目标对话ID:', item.id)
  console.log('[loadChatHistory] 目标对话标题:', item.title)
  console.log('[loadChatHistory] 当前对话ID:', currentConversationId.value)
  console.log('[loadChatHistory] 当前聊天历史长度:', chatHistory.value.length)
  console.log('[loadChatHistory] 加载状态:', loading.value)

  // 如果正在加载中，先停止
  if (loading.value) {
    console.log('[loadChatHistory] AI正在生成中，先停止')
    stopGeneration()
  }

  // 先保存当前对话（如果有内容且不是初始状态）
  if (currentConversationId.value && chatHistory.value.length > 1) {
    console.log('[loadChatHistory] 切换对话前，先保存当前对话')
    await saveCurrentConversation()
  } else {
    console.log('[loadChatHistory] 无需保存当前对话（新对话或无内容）')
  }

  // 加载新对话
  chatHistory.value = [...item.messages]
  currentConversationId.value = item.id
  recommendedBooks.value = []
  scrollToBottom()

  console.log('[loadChatHistory] 对话加载完成')
  console.log('[loadChatHistory] ========== 加载对话历史结束 ==========')
}

// 重新生成对话（重新发送最后一条用户消息）
const regenerateLastMessage = async () => {
  console.log('[regenerateLastMessage] 开始重新生成最后一条消息')
  console.log('[regenerateLastMessage] 当前聊天历史长度:', chatHistory.value.length)
  
  // 使用兼容的方式查找最后一条用户消息索引
  const lastUserMsgIndex = [...chatHistory.value].reverse().findIndex((m: any) => m.role === 'user')
  const actualIndex = lastUserMsgIndex >= 0 ? chatHistory.value.length - 1 - lastUserMsgIndex : -1
  console.log('[regenerateLastMessage] 最后一条用户消息索引:', actualIndex)
  
  if (actualIndex === -1) {
    console.warn('[regenerateLastMessage] 没有可重新生成的消息')
    ElMessage.warning('没有可重新生成的消息')
    return
  }
  
  const lastUserMsg = chatHistory.value[actualIndex]
  if (!lastUserMsg) {
    console.warn('[regenerateLastMessage] 没有可重新生成的消息')
    ElMessage.warning('没有可重新生成的消息')
    return
  }
  
  console.log('[regenerateLastMessage] 最后一条用户消息内容:', lastUserMsg.content?.substring(0, 30))
  
  // 删除该消息及其后的所有消息
  chatHistory.value = chatHistory.value.slice(0, actualIndex)
  console.log('[regenerateLastMessage] 删除后的聊天历史长度:', chatHistory.value.length)
  
  // 保存删除后的消息
  console.log('[regenerateLastMessage] 保存删除后的消息...')
  await saveCurrentConversation()
  
  // 重新发送该消息
  inputMessage.value = lastUserMsg.content
  console.log('[regenerateLastMessage] 准备重新发送消息...')
  await sendMessage()
  console.log('[regenerateLastMessage] 重新生成完成')
}

// 删除历史对话
const deleteConversation = async (item: Conversation, event: Event) => {
  // 阻止冒泡，避免触发加载对话
  event.stopPropagation()
  
  // 确认操作
  const confirmed = await ElMessageBox.confirm(
    `确定要删除对话"${item.title}"吗？`,
    '确认删除',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).catch(() => false)
  
  if (!confirmed) return
  
  try {
    await window.api.ai.deleteConversation(item.id)
    ElMessage.success('删除成功')
    
    // 如果删除的是当前对话，重置对话
    if (currentConversationId.value === item.id) {
      chatHistory.value = [
        { id: 'init', role: 'assistant', content: '你好！我是图书馆智能助手。你可以问我关于馆藏图书的问题，或者让我为你推荐书籍。' }
      ]
      currentConversationId.value = null
      recommendedBooks.value = []
    }
    
    // 重新加载对话历史列表
    await loadConversations()
  } catch (error) {
    console.error('删除对话失败:', error)
    ElMessage.error('删除失败')
  }
}

const loadConversations = async () => {
  if (!userStore.user?.id) return
  
  // 管理员用户不加载对话历史
  if (userStore.user.role === 'admin') {
    console.log('管理员用户，跳过加载对话历史')
    chatHistoryList.value = []
    return
  }

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

// 将前端消息转换为后端格式（用于上下文传递）
const convertToChatMessages = (messages: Message[]): ChatMessage[] => {
  const filtered = messages.filter(m => !m.loading && m.id !== 'init')
  console.log('[convertToChatMessages] 转换历史消息，原始数量:', messages.length, '过滤后:', filtered.length)
  return filtered.map(m => ({
    role: m.role,
    content: m.content
  }))
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

// 重新发送消息
const resendMessage = async (messageIndex: number) => {
  console.log('[resendMessage] 开始重新发送消息')
  console.log('[resendMessage] 消息索引:', messageIndex)
  
  // 确认操作
  const confirmed = await ElMessageBox.confirm(
    '确定要重新发送这条消息吗？后续的消息将被删除。',
    '确认重新发送',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).catch(() => false)
  
  if (!confirmed) {
    console.log('[resendMessage] 用户取消操作')
    return
  }
  
  const messageToResend = chatHistory.value[messageIndex]
  if (!messageToResend || messageToResend.role !== 'user') {
    console.warn('[resendMessage] 只能重新发送用户消息')
    ElMessage.warning('只能重新发送用户消息')
    return
  }
  
  console.log('[resendMessage] 要重新发送的消息:', messageToResend.content?.substring(0, 30))
  
  // 删除该消息及其后的所有消息
  chatHistory.value = chatHistory.value.slice(0, messageIndex)
  console.log('[resendMessage] 删除后的聊天历史长度:', chatHistory.value.length)
  
  // 保存删除后的消息
  console.log('[resendMessage] 保存删除后的消息...')
  await saveCurrentConversation()
  
  // 重新发送该消息
  inputMessage.value = messageToResend.content
  console.log('[resendMessage] 准备重新发送消息...')
  await sendMessage()
  console.log('[resendMessage] 重新发送完成')
}

// 编辑消息
const editMessage = (index: number) => {
  const msg = chatHistory.value[index]
  if (msg && msg.role === 'user') {
    inputMessage.value = msg.content
    // 删除该消息及后续消息
    chatHistory.value = chatHistory.value.slice(0, index)
    scrollToBottom()
  }
}

// 删除消息
const deleteMessage = async (index: number) => {
  const confirmed = await ElMessageBox.confirm(
    '确定要删除这条消息吗？',
    '确认删除',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).catch(() => false)
  
  if (!confirmed) return
  
  // 删除该消息
  chatHistory.value.splice(index, 1)
  await saveCurrentConversation()
}

// 导出对话
const exportConversation = () => {
  let content = `# ${currentConversationId.value ? chatHistoryList.value.find(c => c.id === currentConversationId.value)?.title || '对话' : '新对话'}\n\n`
  
  chatHistory.value.forEach(msg => {
    const role = msg.role === 'user' ? '用户' : 'AI'
    const time = msg.timestamp ? new Date(msg.timestamp).toLocaleString('zh-CN') : ''
    content += `## ${role} ${time}\n\n${msg.content}\n\n`
  })
  
  const blob = new Blob([content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `对话_${Date.now()}.md`
  a.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('导出成功')
}

// 开始重命名对话
const startRename = (item: Conversation) => {
  editingConversationId.value = item.id
  editingTitleText.value = item.title
  nextTick(() => {
    if (renameInputRef.value) {
      renameInputRef.value.focus()
      renameInputRef.value.select()
    }
  })
}

// 保存对话标题
const saveTitle = async (item: Conversation) => {
  if (!editingTitleText.value.trim()) {
    cancelRename()
    return
  }
  
  try {
    // 使用深拷贝确保数据可序列化
    const messagesToSave = JSON.parse(JSON.stringify(chatHistory.value))
    await window.api.ai.updateConversation(item.id, editingTitleText.value, messagesToSave)
    ElMessage.success('重命名成功')
    await loadConversations()
  } catch (error) {
    console.error('重命名失败:', error)
    ElMessage.error('重命名失败')
  }
  
  cancelRename()
}

// 取消重命名
const cancelRename = () => {
  editingConversationId.value = null
  editingTitleText.value = ''
}

const sendMessage = async () => {
  const text = inputMessage.value.trim()
  if (!text || loading.value) return

  console.log('[sendMessage] ========== 开始发送消息 ==========')
  console.log('[sendMessage] 消息内容:', text)
  console.log('[sendMessage] 当前对话ID:', currentConversationId.value)
  console.log('[sendMessage] 当前聊天历史长度:', chatHistory.value.length)

  // Add user message
  chatHistory.value.push({
    id: Date.now().toString(),
    role: 'user',
    content: text,
    timestamp: Date.now()
  })
  inputMessage.value = ''
  loading.value = true
  scrollToBottom()

  // 如果是新对话，创建对话记录
  if (!currentConversationId.value) {
    if (!userStore.user?.id) {
      console.warn('[sendMessage] 用户未登录，无法保存对话')
      ElMessage.warning('请先登录以保存对话历史')
    } else {
      try {
        // 保存完整的对话历史（包括初始的assistant消息和用户消息）
        // 使用深拷贝确保数据可序列化
        const messagesToSave = JSON.parse(JSON.stringify(chatHistory.value))
        const result = await window.api.ai.saveConversation(
          userStore.user.id,
          text.substring(0, 50) + (text.length > 50 ? '...' : ''),
          messagesToSave
        )
        if (result.success) {
          currentConversationId.value = result.data.id
          console.log('[sendMessage] 新对话已创建，ID:', currentConversationId.value)
          // 重新加载对话历史列表
          await loadConversations()
        } else {
          console.error('[sendMessage] 保存对话失败: result.success = false')
        }
      } catch (error) {
        console.error('[sendMessage] 保存对话失败:', error)
        ElMessage.error('保存对话失败')
      }
    }
  }

  // Add placeholder for AI response
  const aiMsgIndex = chatHistory.value.push({
    id: Date.now().toString() + '-ai',
    role: 'assistant',
    content: '',
    loading: true,
    timestamp: Date.now()
  }) - 1
  scrollToBottom()

  try {
    // 转换历史消息（传递给AI的上下文）
    const historyMessages = convertToChatMessages(chatHistory.value.slice(0, -1))
    console.log('[sendMessage] 历史消息数量:', historyMessages.length)
    console.log('[sendMessage] 历史消息内容:', historyMessages.map(m => `${m.role}: ${m.content.substring(0, 30)}...`))

    // 简化处理：如果由推荐需求，调用推荐接口；否则调用普通对话
    const isRecommendation = text.includes('推荐') || text.includes('书') || text.includes('找')
    console.log('[sendMessage] 是否为推荐请求:', isRecommendation)

    if (isRecommendation) {
      // 调用流式推荐
      console.log('[sendMessage] 调用流式推荐接口')
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
            console.error('[sendMessage] 推荐错误:', error)
            reject(new Error(error))
          },
          async () => {
            console.log('[sendMessage] 推荐完成，准备保存对话')
            // 解析推荐图书
            recommendedBooks.value = parseRecommendedBooks(fullContent)
            // 保存完整对话到数据库
            await saveCurrentConversation()
            resolve()
          }
        )
        // 保存 cleanup 函数
        streamCleanup.value = cleanup
      })
    } else {
      // 普通闲聊 - 传递历史消息以保持上下文
      console.log('[sendMessage] 调用流式聊天接口')
      await new Promise<void>((resolve, reject) => {
        let fullContent = ''
        const cleanup = window.api.ai.chatStream(
          text,
          historyMessages, // 传递历史消息
          undefined, // context
          (chunk) => {
            chatHistory.value[aiMsgIndex].loading = false
            fullContent += chunk
            chatHistory.value[aiMsgIndex].content = fullContent
            scrollToBottom()
          },
          (error) => {
            console.error('[sendMessage] 聊天错误:', error)
            reject(new Error(error))
          },
          async () => {
            console.log('[sendMessage] 聊天完成，准备保存对话')
            // 保存完整对话到数据库
            await saveCurrentConversation()
            resolve()
          }
        )
        // 保存 cleanup 函数
        streamCleanup.value = cleanup
      })
    }
  } catch (error: any) {
    console.error('[sendMessage] 发送消息失败:', error)
    chatHistory.value[aiMsgIndex].content = `抱歉，遇到了一些问题：${error.message || '网络请求超时'}`
    chatHistory.value[aiMsgIndex].loading = false
    // 即使出错也保存对话
    await saveCurrentConversation()
  } finally {
    loading.value = false
    streamCleanup.value = null
    scrollToBottom()
    console.log('[sendMessage] ========== 消息发送完成 ==========')
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
  // 页面卸载时保存当前对话
  saveCurrentConversation()
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

.delete-btn {
  opacity: 0;
  transition: opacity 0.2s;
  padding: 4px;
}

.history-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn .el-icon {
  font-size: 14px;
}

.rename-btn {
  opacity: 0;
  transition: opacity 0.2s;
  padding: 4px;
}

.history-item:hover .rename-btn {
  opacity: 1;
}

.rename-btn .el-icon {
  font-size: 14px;
}

.rename-input {
  flex: 1;
}

.rename-input :deep(.el-input__inner) {
  padding: 4px 8px;
  font-size: 13px;
}

.empty-history {
  text-align: center;
  padding: 30px 20px;
  color: var(--text-muted);
  font-size: 13px;
}

.history-search {
  margin-bottom: 12px;
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
  position: relative;
}

.message-actions {
  margin-top: 8px;
  display: flex;
  gap: 4px;
  justify-content: flex-end;
}

.message-actions .el-button {
  color: var(--text-muted);
  font-size: 12px;
  padding: 4px;
}

.message-actions .el-button:hover {
  color: var(--primary-color);
}

.message-actions .el-button.el-button--primary {
  color: var(--primary-color);
}

.message-actions .el-button.el-button--danger {
  color: #f56c6c;
}

.message-actions .el-button.el-button--danger:hover {
  color: #f89898;
}

.resend-btn {
  font-size: 12px;
  padding: 4px 8px;
  opacity: 0;
  transition: opacity 0.2s;
}

.bubble:hover .message-actions {
  opacity: 1;
}

.user .bubble .resend-btn {
  color: rgba(255, 255, 255, 0.8);
}

.user .bubble .resend-btn:hover {
  color: white;
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

.button-group {
  display: flex;
  gap: 8px;
}

.send-btn {
  height: 52px;
  padding: 0 24px;
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.stop-btn {
  height: 52px;
  padding: 0 24px;
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.message-timestamp {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 4px;
  text-align: right;
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
