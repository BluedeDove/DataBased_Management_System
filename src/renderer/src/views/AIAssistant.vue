<template>
  <div class="page-container ai-container">
    <div class="chat-window glass-card">
      <div class="chat-header">
        <div class="header-content">
          <div class="icon-wrapper">
            <el-icon><MagicStick /></el-icon>
          </div>
          <div>
            <h3>智能图书助手</h3>
            <p>我可以为您推荐图书、查询信息或解答疑问</p>
          </div>
        </div>
        <el-tag type="info" effect="plain" round>Powered by AI</el-tag>
      </div>

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

      <div class="chat-input-area">
        <div class="tools-bar">
          <el-tooltip content="根据描述推荐图书" placement="top">
            <el-button size="small" circle :icon="Reading" @click="triggerTool('recommend')" />
          </el-tooltip>
          <el-button size="small" round @click="setInput('最近有什么新书？')">📚 新书推荐</el-button>
          <el-button size="small" round @click="setInput('适合初学者的Python书')">🐍 Python入门</el-button>
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
            发送
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'
import { MagicStick, User, Service, Reading } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

interface Message {
  role: 'user' | 'assistant'
  content: string
  loading?: boolean
}

const inputMessage = ref('')
const loading = ref(false)
const messagesRef = ref<HTMLElement | null>(null)
const chatHistory = ref<Message[]>([
  { role: 'assistant', content: '你好！我是图书馆智能助手。你可以问我关于馆藏图书的问题，或者让我为你推荐书籍。' }
])

const setInput = (text: string) => {
  inputMessage.value = text
}

const triggerTool = (tool: string) => {
  if (tool === 'recommend') {
    inputMessage.value = '请为我推荐几本关于...的书'
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

const sendMessage = async () => {
  const text = inputMessage.value.trim()
  if (!text || loading.value) return

  // Add user message
  chatHistory.value.push({ role: 'user', content: text })
  inputMessage.value = ''
  loading.value = true
  scrollToBottom()

  // Add placeholder for AI response
  const aiMsgIndex = chatHistory.value.push({ role: 'assistant', content: '', loading: true }) - 1
  scrollToBottom()

  try {
    // 简化处理：如果由推荐需求，调用推荐接口；否则调用普通对话
    // 这里为了演示Agent能力，可以做简单的意图识别（实际应由后端Agent完成）
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
            resolve()
          }
        )
      })
    } else {
      // 普通闲聊
      await new Promise<void>((resolve, reject) => {
        let fullContent = ''
        // 这里调用普通chatStream，需确保preload暴露了这个方法
        // 假设我们可以重用 recommendBooksStream 或者 backend 的 chatStream
        // 由于 ai.service.ts 暴露了 chatStream，我们需要确保 preload 也暴露了
        
        // 检查 preload 是否有 chatStream (我们在前面分析过，preload 确实有 chatStream)
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
</script>

<style scoped>
.ai-container {
  height: calc(100vh - 48px); /* Subtract padding */
  padding: 0;
  display: flex;
  justify-content: center;
  overflow: hidden; /* Prevent outer scroll */
}

.chat-window {
  width: 100%;
  max-width: 900px;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.85); /* Opaque for readability */
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.chat-header {
  padding: 20px;
  border-bottom: 1px solid rgba(0,0,0,0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255,255,255,0.5);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.icon-wrapper {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #6366f1, #ec4899);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
}

.chat-header h3 {
  margin: 0 0 4px 0;
  font-size: 18px;
}

.chat-header p {
  margin: 0;
  font-size: 13px;
  color: #64748b;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
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
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  font-size: 15px;
  line-height: 1.6;
}

.user .bubble {
  background: #4f46e5;
  color: white;
  border-bottom-right-radius: 4px;
}

.assistant .bubble {
  background: white;
  border-top-left-radius: 4px;
}

.chat-input-area {
  padding: 20px;
  background: white;
  border-top: 1px solid rgba(0,0,0,0.05);
}

.tools-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  overflow-x: auto;
}

.input-wrapper {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.input-wrapper :deep(.el-textarea__inner) {
  resize: none; /* Disable resize */
  border-radius: 12px;
}

.send-btn {
  height: 52px;
  padding: 0 24px;
  font-size: 16px;
}

/* Typing Indicator */
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

/* Markdown Styles */
 :deep(.bubble p) { margin: 0 0 8px 0; }
 :deep(.bubble p:last-child) { margin: 0; }
 :deep(.bubble ul), :deep(.bubble ol) { padding-left: 20px; margin: 8px 0; }
</style>
