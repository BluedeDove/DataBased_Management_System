<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">AI 智能助手</h1>
      <p class="page-description">智能图书推荐和语义搜索</p>
    </div>

    <!-- AI状态提示 -->
    <el-alert
      v-if="!aiAvailable"
      type="warning"
      title="AI服务未配置"
      description="请在.env文件中配置OPENAI_API_KEY以启用AI功能"
      :closable="false"
      style="margin-bottom: 20px"
    />

    <el-tabs v-model="activeTab" v-if="aiAvailable">
      <!-- 语义搜索 -->
      <el-tab-pane label="语义搜索" name="search">
        <div class="ai-section">
          <el-input
            v-model="searchQuery"
            placeholder="描述你想找的书，例如：关于人工智能和机器学习的入门书籍"
            type="textarea"
            :rows="3"
            @keyup.ctrl.enter="handleSemanticSearch"
          />
          <el-button
            type="primary"
            :loading="searchLoading"
            style="margin-top: 12px"
            @click="handleSemanticSearch"
          >
            <el-icon><Search /></el-icon>
            智能搜索
          </el-button>

          <div v-if="searchResults.length > 0" class="search-results">
            <h3>搜索结果</h3>
            <el-card
              v-for="(result, index) in searchResults"
              :key="result.bookId"
              class="result-card"
              shadow="hover"
            >
              <div class="result-header">
                <span class="result-rank">#{{ index + 1 }}</span>
                <span class="result-similarity">
                  相关度: {{ (result.similarity * 100).toFixed(1) }}%
                </span>
              </div>
              <h4 class="result-title">{{ result.title }}</h4>
              <p class="result-author">作者: {{ result.author }}</p>
              <p class="result-desc">{{ result.description || '暂无简介' }}</p>
              <el-button type="primary" link @click="viewBookDetail(result.bookId)">
                查看详情
              </el-button>
            </el-card>
          </div>
        </div>
      </el-tab-pane>

      <!-- 智能推荐 -->
      <el-tab-pane label="智能推荐" name="recommend">
        <div class="ai-section">
          <el-input
            v-model="recommendQuery"
            placeholder="告诉我你的阅读需求，例如：我想提升编程能力，有哪些推荐？"
            type="textarea"
            :rows="3"
            @keyup.ctrl.enter="handleRecommend"
          />
          <el-button
            type="primary"
            :loading="recommendLoading"
            style="margin-top: 12px"
            @click="handleRecommend"
          >
            <el-icon><MagicStick /></el-icon>
            获取推荐
          </el-button>

          <div v-if="recommendation" class="recommendation">
            <h3>AI 推荐</h3>
            <div class="markdown-content" v-html="renderMarkdown(recommendation)"></div>
          </div>
        </div>
      </el-tab-pane>

      <!-- AI 对话 -->
      <el-tab-pane label="AI 对话" name="chat">
        <div class="chat-container">
          <div class="chat-messages" ref="messagesRef">
            <div
              v-for="(msg, index) in chatMessages"
              :key="index"
              :class="['chat-message', msg.role]"
            >
              <div class="message-avatar">
                <el-icon v-if="msg.role === 'user'" :size="24"><User /></el-icon>
                <el-icon v-else :size="24"><Robot /></el-icon>
              </div>
              <div class="message-content">
                <div class="message-text" v-html="renderMarkdown(msg.content)"></div>
              </div>
            </div>
          </div>

          <div class="chat-input">
            <el-input
              v-model="chatInput"
              placeholder="输入消息... (Ctrl+Enter发送)"
              type="textarea"
              :rows="3"
              :disabled="chatLoading"
              @keyup.ctrl.enter="handleSendChat"
            />
            <el-button
              type="primary"
              :loading="chatLoading"
              @click="handleSendChat"
            >
              发送
            </el-button>
          </div>
        </div>
      </el-tab-pane>

      <!-- 向量管理 -->
      <el-tab-pane label="向量管理" name="vectors">
        <div class="ai-section">
          <el-descriptions title="向量数据库状态" :column="2" border>
            <el-descriptions-item label="已向量化图书">
              {{ vectorStats.totalVectors }}
            </el-descriptions-item>
            <el-descriptions-item label="覆盖率">
              {{ vectorStats.coverageRate.toFixed(1) }}%
            </el-descriptions-item>
          </el-descriptions>

          <div style="margin-top: 20px">
            <el-button
              type="primary"
              :loading="vectorLoading"
              @click="handleBatchCreateVectors"
            >
              <el-icon><Upload /></el-icon>
              批量生成向量
            </el-button>
            <el-text type="info" style="margin-left: 12px">
              将为所有未向量化的图书生成向量（需要API密钥）
            </el-text>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const activeTab = ref('search')
const aiAvailable = ref(false)

// 语义搜索
const searchQuery = ref('')
const searchLoading = ref(false)
const searchResults = ref<any[]>([])

// 智能推荐
const recommendQuery = ref('')
const recommendLoading = ref(false)
const recommendation = ref('')

// AI对话
const chatMessages = ref<Array<{ role: 'user' | 'assistant'; content: string }>>([])
const chatInput = ref('')
const chatLoading = ref(false)
const messagesRef = ref<HTMLElement>()

// 向量管理
const vectorStats = reactive({
  totalVectors: 0,
  coverageRate: 0
})
const vectorLoading = ref(false)

// 检查AI可用性
const checkAIAvailability = async () => {
  const result = await window.api.ai.isAvailable()
  if (result.success) {
    aiAvailable.value = result.data
  }
}

// 渲染Markdown
const renderMarkdown = (text: string): string => {
  const html = marked(text) as string
  return DOMPurify.sanitize(html)
}

// 语义搜索
const handleSemanticSearch = async () => {
  if (!searchQuery.value.trim()) {
    ElMessage.warning('请输入搜索内容')
    return
  }

  searchLoading.value = true
  try {
    const result = await window.api.ai.semanticSearch(searchQuery.value, 10)
    if (result.success) {
      searchResults.value = result.data
      if (result.data.length === 0) {
        ElMessage.info('未找到相关图书，请尝试其他关键词')
      }
    } else {
      ElMessage.error(result.error?.message || '搜索失败')
    }
  } catch (error) {
    ElMessage.error('搜索失败')
  } finally {
    searchLoading.value = false
  }
}

// 智能推荐
const handleRecommend = async () => {
  if (!recommendQuery.value.trim()) {
    ElMessage.warning('请描述您的需求')
    return
  }

  recommendLoading.value = true
  try {
    const result = await window.api.ai.recommendBooks(recommendQuery.value, 5)
    if (result.success) {
      recommendation.value = result.data
    } else {
      ElMessage.error(result.error?.message || '推荐失败')
    }
  } catch (error) {
    ElMessage.error('推荐失败')
  } finally {
    recommendLoading.value = false
  }
}

// 发送聊天消息
const handleSendChat = async () => {
  if (!chatInput.value.trim()) return

  const userMessage = chatInput.value.trim()
  chatMessages.value.push({ role: 'user', content: userMessage })
  chatInput.value = ''

  chatLoading.value = true
  await nextTick()
  scrollToBottom()

  try {
    const history = chatMessages.value.slice(0, -1)
    const result = await window.api.ai.chat(userMessage, history)

    if (result.success) {
      chatMessages.value.push({ role: 'assistant', content: result.data })
      await nextTick()
      scrollToBottom()
    } else {
      ElMessage.error(result.error?.message || '对话失败')
    }
  } catch (error) {
    ElMessage.error('对话失败')
  } finally {
    chatLoading.value = false
  }
}

// 滚动到底部
const scrollToBottom = () => {
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

// 查看图书详情
const viewBookDetail = (bookId: number) => {
  ElMessage.info(`查看图书 ID: ${bookId}`)
}

// 批量生成向量
const handleBatchCreateVectors = async () => {
  try {
    await ElMessage.confirm(
      '批量生成向量需要调用AI API，可能需要较长时间并产生费用，确定继续吗？',
      '提示'
    )

    vectorLoading.value = true

    // 获取所有图书
    const booksResult = await window.api.book.getAll()
    if (!booksResult.success) {
      ElMessage.error('获取图书列表失败')
      return
    }

    const bookIds = booksResult.data.map((book: any) => book.id)
    const result = await window.api.ai.batchCreateEmbeddings(bookIds)

    if (result.success) {
      ElMessage.success('向量生成完成')
      loadVectorStats()
    } else {
      ElMessage.error(result.error?.message || '生成失败')
    }
  } catch (error) {
    // 用户取消
  } finally {
    vectorLoading.value = false
  }
}

// 加载向量统计
const loadVectorStats = async () => {
  const result = await window.api.ai.getStatistics()
  if (result.success) {
    Object.assign(vectorStats, result.data)
  }
}

onMounted(() => {
  checkAIAvailability()
  loadVectorStats()
})
</script>

<style scoped>
.ai-section {
  padding: 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.search-results {
  margin-top: 24px;
}

.result-card {
  margin-top: 16px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.result-rank {
  font-size: 20px;
  font-weight: 600;
  color: #409eff;
}

.result-similarity {
  font-size: 12px;
  color: #67c23a;
  padding: 4px 12px;
  background: #f0f9ff;
  border-radius: 12px;
}

.result-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.result-author {
  color: #606266;
  margin-bottom: 8px;
}

.result-desc {
  color: #909399;
  margin-bottom: 12px;
}

.recommendation {
  margin-top: 24px;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
}

.markdown-content {
  line-height: 1.8;
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3) {
  margin-top: 16px;
  margin-bottom: 12px;
}

.markdown-content :deep(p) {
  margin-bottom: 12px;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  padding-left: 24px;
  margin-bottom: 12px;
}

.chat-container {
  height: calc(100vh - 300px);
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 12px;
  overflow: hidden;
}

.chat-messages {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.chat-message {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.chat-message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #409eff;
  color: white;
  flex-shrink: 0;
}

.chat-message.assistant .message-avatar {
  background: #67c23a;
}

.message-content {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 12px;
  background: #f5f7fa;
}

.chat-message.user .message-content {
  background: #409eff;
  color: white;
}

.chat-input {
  padding: 20px;
  border-top: 1px solid #dcdfe6;
  display: flex;
  gap: 12px;
}
</style>
