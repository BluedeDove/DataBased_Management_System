<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">
        系统设置
      </h1>
      <p class="page-description">
        管理系统参数和配置
      </p>
    </div>

    <div class="glass-card settings-card">
      <el-tabs
        v-model="activeTab"
        class="custom-tabs"
      >
        <el-tab-pane name="basic">
          <template #label>
            <span class="tab-label">
              <el-icon><InfoFilled /></el-icon>
              基本信息
            </span>
          </template>
          <div class="settings-content">
            <el-descriptions
              title="系统信息"
              :column="2"
              border
              class="custom-descriptions"
            >
              <el-descriptions-item label="系统名称">
                智能图书管理系统
              </el-descriptions-item>
              <el-descriptions-item label="版本">
                1.0.0
              </el-descriptions-item>
              <el-descriptions-item label="当前用户">
                {{ userStore.user?.name }}
              </el-descriptions-item>
              <el-descriptions-item label="角色">
                {{ getRoleLabel(userStore.user?.role) }}
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </el-tab-pane>

        <el-tab-pane name="categories">
          <template #label>
            <span class="tab-label">
              <el-icon><User /></el-icon>
              读者种类
            </span>
          </template>
          <div class="settings-content">
            <el-button
              type="primary"
              :icon="Plus"
              size="large"
              class="add-btn"
              @click="showCategoryDialog = true"
            >
              新增种类
            </el-button>
            <el-table
              :data="readerCategories"
              class="custom-table"
              style="margin-top: 20px"
            >
              <el-table-column
                prop="code"
                label="编码"
                width="100"
              />
              <el-table-column
                prop="name"
                label="名称"
                width="120"
              />
              <el-table-column
                prop="max_borrow_count"
                label="最大借阅数"
                width="110"
              />
              <el-table-column
                prop="max_borrow_days"
                label="借阅期限(天)"
                width="120"
              />
              <el-table-column
                prop="validity_days"
                label="有效期(天)"
                width="110"
              />
              <el-table-column
                prop="notes"
                label="备注"
              />
            </el-table>
          </div>
        </el-tab-pane>

        <el-tab-pane
          v-if="isAdmin"
          name="ai"
        >
          <template #label>
            <span class="tab-label">
              <el-icon><MagicStick /></el-icon>
              AI配置
            </span>
          </template>
          <div class="settings-content">
            <div class="ai-config-header">
              <div class="icon-box pink">
                <el-icon><MagicStick /></el-icon>
              </div>
              <div class="header-text">
                <h3>AI服务配置</h3>
                <p>配置OpenAI API以启用智能推荐和语义搜索功能</p>
              </div>
            </div>
            <el-form
              :model="aiConfigForm"
              label-width="140px"
              class="ai-form"
            >
              <el-form-item label="API URL">
                <el-input
                  v-model="aiConfigForm.apiUrl"
                  placeholder="https://api.openai.com/v1"
                  size="large"
                >
                  <template #prefix>
                    <el-icon><Link /></el-icon>
                  </template>
                </el-input>
              </el-form-item>
              <el-form-item label="API Key">
                <el-input
                  v-model="aiConfigForm.apiKey"
                  type="password"
                  placeholder="请输入OpenAI API密钥"
                  show-password
                  size="large"
                >
                  <template #prefix>
                    <el-icon><Lock /></el-icon>
                  </template>
                </el-input>
              </el-form-item>
              <el-form-item label="Embedding模型">
                <el-input
                  v-model="aiConfigForm.embeddingModel"
                  placeholder="text-embedding-3-small"
                  size="large"
                >
                  <template #prefix>
                    <el-icon><Document /></el-icon>
                  </template>
                </el-input>
              </el-form-item>
              <el-form-item label="Chat模型">
                <el-input
                  v-model="aiConfigForm.chatModel"
                  placeholder="gpt-4-turbo-preview"
                  size="large"
                >
                  <template #prefix>
                    <el-icon><ChatDotRound /></el-icon>
                  </template>
                </el-input>
              </el-form-item>
              <el-form-item>
                <el-button
                  type="primary"
                  :loading="testingConnection"
                  size="large"
                  class="test-btn"
                  @click="handleTestConnection"
                >
                  <el-icon><Connection /></el-icon>
                  测试连接
                </el-button>
                <el-button
                  type="success"
                  :loading="savingConfig"
                  size="large"
                  class="save-btn"
                  @click="handleSaveAIConfig"
                >
                  <el-icon><Check /></el-icon>
                  保存配置
                </el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>

        <el-tab-pane
          v-if="isAdmin"
          name="vector"
        >
          <template #label>
            <span class="tab-label">
              <el-icon><Operation /></el-icon>
              向量管理
            </span>
          </template>
          <div class="settings-content">
            <el-descriptions
              title="向量数据库状态"
              :column="2"
              border
              class="custom-descriptions"
            >
              <el-descriptions-item label="已向量化图书">
                {{ vectorStats.totalVectors }}
              </el-descriptions-item>
              <el-descriptions-item label="覆盖率">
                {{ vectorStats.coverageRate.toFixed(1) }}%
              </el-descriptions-item>
            </el-descriptions>

            <div class="vector-actions">
              <el-button
                type="primary"
                :loading="vectorLoading"
                size="large"
                class="vector-btn"
                @click="handleBatchCreateVectors"
              >
                <el-icon><Upload /></el-icon>
                批量生成向量
              </el-button>
              <el-text
                type="info"
                class="hint-text"
              >
                将为所有未向量化的图书生成向量（需要API密钥）
              </el-text>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane name="about">
          <template #label>
            <span class="tab-label">
              <el-icon><InfoFilled /></el-icon>
              关于
            </span>
          </template>
          <div class="settings-content about-section">
            <div class="about-logo">
              <div class="logo-circle">
                <el-icon :size="48">
                  <Reading />
                </el-icon>
              </div>
            </div>
            <h2 class="about-title">
              智能图书管理系统
            </h2>
            <p class="about-desc">
              基于 Vue 3 + TypeScript + Express 开发<br>
              采用领域驱动设计和分层架构<br>
              提供完整的图书馆管理解决方案
            </p>
            <div class="about-tags">
              <el-tag
                size="large"
                type="primary"
              >
                v1.0.0
              </el-tag>
              <el-tag
                size="large"
                type="success"
              >
                企业级
              </el-tag>
              <el-tag
                size="large"
                type="info"
              >
                B/S架构
              </el-tag>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <el-dialog
      v-model="showCategoryDialog"
      title="新增读者种类"
      width="500px"
      class="category-dialog"
    >
      <el-form
        :model="categoryForm"
        label-width="120px"
      >
        <el-form-item label="编码">
          <el-input v-model="categoryForm.code" />
        </el-form-item>
        <el-form-item label="名称">
          <el-input v-model="categoryForm.name" />
        </el-form-item>
        <el-form-item label="最大借阅数">
          <el-input-number
            v-model="categoryForm.max_borrow_count"
            :min="1"
          />
        </el-form-item>
        <el-form-item label="借阅期限(天)">
          <el-input-number
            v-model="categoryForm.max_borrow_days"
            :min="1"
          />
        </el-form-item>
        <el-form-item label="有效期(天)">
          <el-input-number
            v-model="categoryForm.validity_days"
            :min="1"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="categoryForm.notes"
            type="textarea"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCategoryDialog = false">
          取消
        </el-button>
        <el-button
          type="primary"
          @click="handleCreateCategory"
        >
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useUserStore } from '@/store/user'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Upload, Reading, MagicStick, InfoFilled, User, Link, Lock, Document, ChatDotRound, Connection, Check, Operation } from '@element-plus/icons-vue'
import { readerCategoryApi } from '../api/reader.api'
import { bookApi } from '../api/book.api'
import { aiApi } from '../api/ai.api'
import { configApi } from '../api/other.api'

const activeTab = ref('basic')

const userStore = useUserStore()
const showCategoryDialog = ref(false)
const readerCategories = ref<any[]>([])
const testingConnection = ref(false)
const savingConfig = ref(false)

const isAdmin = computed(() => userStore.user?.role === 'admin')

const getRoleLabel = (role?: string) => {
  const roleMap: Record<string, string> = {
    'admin': '管理员',
    'librarian': '图书管理员',
    'teacher': '教师',
    'student': '学生'
  }
  return roleMap[role || ''] || '未知'
}

const categoryForm = reactive({
  code: '',
  name: '',
  max_borrow_count: 5,
  max_borrow_days: 30,
  validity_days: 365,
  notes: ''
})

const aiConfigForm = reactive({
  apiUrl: 'https://api.openai.com/v1',
  apiKey: '',
  embeddingModel: 'text-embedding-3-small',
  chatModel: 'gpt-4-turbo-preview'
})

const vectorStats = reactive({
  totalVectors: 0,
  coverageRate: 0
})
const vectorLoading = ref(false)

const loadCategories = async () => {
  const result = await readerCategoryApi.getAll()
  if (result.success) {
    readerCategories.value = result.data
  }
}

const loadAISettings = async () => {
  try {
    const result = await configApi.getAISettings()
    if (result.success && result.data) {
      if (result.data.baseURL) {
        aiConfigForm.apiUrl = result.data.baseURL
      }
      if (result.data.apiKey) {
        aiConfigForm.apiKey = result.data.apiKey
      }
      if (result.data.embeddingModel) {
        aiConfigForm.embeddingModel = result.data.embeddingModel
      }
      if (result.data.chatModel) {
        aiConfigForm.chatModel = result.data.chatModel
      }
    }
  } catch (error) {
    console.error('Failed to load AI settings:', error)
  }
}

const handleTestConnection = async () => {
  if (!aiConfigForm.apiKey) {
    ElMessage.warning('请先输入API Key')
    return
  }

  testingConnection.value = true

  try {
    const result = await configApi.testAIConnection()
    if (result.success) {
      ElMessage.success(result.data?.message || '连接测试成功')
    } else {
      ElMessage.error(result.data?.message || result.error?.message || '连接测试失败')
    }
  } catch (error: any) {
    ElMessage.error(error.message || '连接测试失败')
  } finally {
    testingConnection.value = false
  }
}

const handleSaveAIConfig = async () => {
  if (!aiConfigForm.apiKey) {
    ElMessage.warning('请先输入API Key')
    return
  }

  savingConfig.value = true
  try {
    const result = await configApi.updateAISettings({
      baseURL: aiConfigForm.apiUrl,
      apiKey: aiConfigForm.apiKey,
      embeddingModel: aiConfigForm.embeddingModel,
      chatModel: aiConfigForm.chatModel
    })

    if (result.success) {
      ElMessage.success('保存成功')
    } else {
      ElMessage.error(result.error?.message || '保存失败')
    }
  } catch (error) {
    ElMessage.error('保存失败')
  } finally {
    savingConfig.value = false
  }
}

const handleCreateCategory = async () => {
  if (!categoryForm.code || !categoryForm.name) {
    ElMessage.warning('请填写完整信息')
    return
  }

  try {
    const plainData = JSON.parse(JSON.stringify(categoryForm))
    const result = await readerCategoryApi.create(plainData)

    if (result.success) {
      ElMessage.success('创建成功')
      showCategoryDialog.value = false
      loadCategories()
      Object.assign(categoryForm, {
        code: '',
        name: '',
        max_borrow_count: 5,
        max_borrow_days: 30,
        validity_days: 365,
        notes: ''
      })
    } else {
      ElMessage.error(result.error?.message || '创建失败')
    }
  } catch (error) {
    ElMessage.error('创建失败')
  }
}

const handleBatchCreateVectors = async () => {
  try {
    await ElMessageBox.confirm(
      '批量生成向量需要调用AI API，可能需要较长时间并产生费用，确定继续吗？',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    vectorLoading.value = true

    const booksResult = await bookApi.getAll()
    if (!booksResult.success) {
      ElMessage.error('获取图书列表失败')
      return
    }

    const bookIds = booksResult.data.map((book: any) => book.id)

    if (bookIds.length === 0) {
      ElMessage.warning('没有图书可以生成向量')
      return
    }

    const result = await aiApi.batchCreateEmbeddings(bookIds)

    if (result.success) {
      ElMessage.success(`成功为${bookIds.length}本图书生成向量`)
      loadVectorStats()
    } else {
      ElMessage.error(result.error?.message || '生成失败')
    }
  } catch (error: any) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error.message || '生成向量失败')
    }
  } finally {
    vectorLoading.value = false
  }
}

const loadVectorStats = async () => {
  const result = await aiApi.getStatistics()
  if (result.success) {
    Object.assign(vectorStats, result.data)
  }
}

onMounted(() => {
  loadCategories()
  loadAISettings()
  loadVectorStats()
})
</script>

<style scoped>
.settings-card {
  padding: 0;
  overflow: hidden;
  min-height: 600px;
}

.custom-tabs {
  height: 100%;
}

:deep(.custom-tabs .el-tabs__content) {
  height: calc(100% - 50px);
}

:deep(.custom-tabs .el-tab-pane) {
  height: 100%;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
}

.settings-content {
  padding: 24px;
  height: 100%;
  overflow-y: auto;
}

.ai-config-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.ai-config-header .header-text h3 {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-main);
}

.ai-config-header .header-text p {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.ai-form {
  max-width: 600px;
}

.test-btn,
.save-btn {
  min-width: 120px;
  font-weight: 600;
}

.vector-actions {
  margin-top: 24px;
  padding: 20px;
  background: rgba(99, 102, 241, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(99, 102, 241, 0.1);
}

.vector-btn {
  margin-bottom: 12px;
}

.hint-text {
  font-size: 13px;
  color: var(--text-secondary);
}

.about-section {
  text-align: center;
  padding: 40px 20px;
}

.about-logo {
  margin-bottom: 24px;
}

.logo-circle {
  width: 100px;
  height: 100px;
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  color: white;
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.3);
}

.about-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 16px 0;
  color: var(--text-main);
}

.about-desc {
  color: var(--text-secondary);
  line-height: 1.8;
  margin: 0 0 32px 0;
  font-size: 15px;
}

.about-tags {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

:deep(.custom-descriptions .el-descriptions__label) {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(99, 102, 241, 0.02));
  font-weight: 600;
}

:deep(.custom-table) {
  border-radius: 8px;
  overflow: hidden;
}

:deep(.custom-table .el-table__body tr:hover) {
  background: rgba(99, 102, 241, 0.04) !important;
}

.add-btn {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-hover)) !important;
  border: none !important;
  font-weight: 600;
  padding: 0 24px;
}

:deep(.category-dialog .el-dialog__body) {
  padding: 24px 32px;
}
</style>
