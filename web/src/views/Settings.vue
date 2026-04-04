<template>
  <div class="settings-page">
    <!-- Header -->
    <div class="page-header animate-fade-in">
      <div class="page-header-left">
        <div class="page-title">系统设置</div>
        <div class="page-subtitle">管理系统参数和配置</div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="pill-tabs animate-fade-in-delay-1" style="margin-bottom: 24px">
      <button
        v-for="tab in visibleTabs"
        :key="tab.key"
        class="pill-tab"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >{{ tab.label }}</button>
    </div>

    <!-- Basic Info -->
    <div v-if="activeTab === 'basic'" class="light-card animate-fade-in-delay-2">
      <div class="section-title">系统信息</div>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">系统名称</div>
          <div class="info-value">智能图书管理系统</div>
        </div>
        <div class="info-item">
          <div class="info-label">版本</div>
          <div class="info-value">1.0.0</div>
        </div>
        <div class="info-item">
          <div class="info-label">当前用户</div>
          <div class="info-value">{{ userStore.user?.name }}</div>
        </div>
        <div class="info-item">
          <div class="info-label">角色</div>
          <div class="info-value"><span class="pill-badge red">{{ getRoleLabel(userStore.user?.role) }}</span></div>
        </div>
      </div>
    </div>

    <!-- Categories -->
    <div v-if="activeTab === 'categories'" class="light-card animate-fade-in-delay-2">
      <div class="section-header">
        <div class="section-title" style="margin-bottom: 0">读者种类</div>
        <button class="gradient-btn" @click="showCategoryDialog = true">
          <el-icon><Plus /></el-icon> 新增种类
        </button>
      </div>
      <el-table :data="readerCategories" style="margin-top: 20px">
        <el-table-column prop="code" label="编码" width="100" />
        <el-table-column prop="name" label="名称" width="140" />
        <el-table-column prop="max_borrow_count" label="最大借阅数" width="120" align="center" />
        <el-table-column prop="max_borrow_days" label="借阅期限(天)" width="130" align="center" />
        <el-table-column prop="validity_days" label="有效期(天)" width="120" align="center" />
        <el-table-column prop="notes" label="备注" />
        <el-table-column label="操作" width="120" align="right">
          <template #default="{ row }">
            <button class="icon-btn danger" @click="handleDeleteCategory(row)">
              <el-icon><Delete /></el-icon>
            </button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- AI Config -->
    <div v-if="activeTab === 'ai' && isAdmin" class="light-card animate-fade-in-delay-2">
      <div class="section-header" style="margin-bottom: 24px">
        <div class="ai-header-icon">
          <el-icon><MagicStick /></el-icon>
        </div>
        <div>
          <div class="section-title" style="margin-bottom: 2px">AI 服务配置</div>
          <div class="section-desc">配置 OpenAI API 以启用智能推荐和语义搜索功能</div>
        </div>
      </div>
      <el-form :model="aiConfigForm" label-width="140px" style="max-width: 600px">
        <el-form-item label="API URL">
          <el-input v-model="aiConfigForm.apiUrl" placeholder="https://api.siliconflow.cn/v1" />
        </el-form-item>
        <el-form-item label="API Key">
          <el-input v-model="aiConfigForm.apiKey" type="password" placeholder="请输入 API 密钥" show-password />
        </el-form-item>
        <el-form-item label="Embedding 模型">
          <el-input v-model="aiConfigForm.embeddingModel" placeholder="Qwen/Qwen3-Embedding-8B" />
        </el-form-item>
        <el-form-item label="Chat 模型">
          <el-input v-model="aiConfigForm.chatModel" placeholder="Pro/MiniMaxAI/MiniMax-M2.5" />
        </el-form-item>
        <el-form-item>
          <el-button :loading="testingConnection" :disabled="testingConnection || savingConfig" @click="handleTestConnection">
            <el-icon><Connection /></el-icon> 测试连接
          </el-button>
          <el-button type="primary" :loading="savingConfig" :disabled="savingConfig || testingConnection" @click="handleSaveAIConfig">
            <el-icon><Check /></el-icon> 保存配置
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- Vector Management -->
    <div v-if="activeTab === 'vector' && isAdmin" class="light-card animate-fade-in-delay-2">
      <div class="section-title">向量数据库状态</div>
      <div class="info-grid" style="margin-top: 16px; margin-bottom: 24px">
        <div class="info-item">
          <div class="info-label">已向量化图书</div>
          <div class="info-value">{{ vectorStats.totalVectors }}</div>
        </div>
        <div class="info-item">
          <div class="info-label">覆盖率</div>
          <div class="info-value">{{ vectorStats.coverageRate.toFixed(1) }}%</div>
        </div>
      </div>
      <div class="vector-action-box">
        <button class="gradient-btn" :disabled="vectorLoading" @click="handleBatchCreateVectors">
          <el-icon><Upload /></el-icon> 批量生成向量
        </button>
        <span class="vector-hint">将为所有未向量化的图书生成向量（需要 API 密钥）</span>
      </div>
    </div>

    <!-- About -->
    <div v-if="activeTab === 'about'" class="light-card animate-fade-in-delay-2 about-card">
      <div class="about-logo-wrap">
        <div class="about-logo-circle">
          <el-icon :size="48"><Reading /></el-icon>
        </div>
      </div>
      <h2 class="about-title">智能图书管理系统</h2>
      <p class="about-desc">
        基于 Vue 3 + TypeScript + Express 开发<br>
        采用领域驱动设计和分层架构<br>
        提供完整的图书馆管理解决方案
      </p>
      <div class="about-tags">
        <span class="pill-badge red">v1.0.0</span>
        <span class="pill-badge success">企业级</span>
        <span class="pill-badge info">B/S架构</span>
      </div>
    </div>

    <!-- Category Dialog -->
    <el-dialog v-model="showCategoryDialog" title="新增读者种类" width="500px" align-center>
      <el-form :model="categoryForm" label-width="120px">
        <el-form-item label="编码"><el-input v-model="categoryForm.code" /></el-form-item>
        <el-form-item label="名称"><el-input v-model="categoryForm.name" /></el-form-item>
        <el-form-item label="最大借阅数"><el-input-number v-model="categoryForm.max_borrow_count" :min="1" /></el-form-item>
        <el-form-item label="借阅期限(天)"><el-input-number v-model="categoryForm.max_borrow_days" :min="1" /></el-form-item>
        <el-form-item label="有效期(天)"><el-input-number v-model="categoryForm.validity_days" :min="1" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="categoryForm.notes" type="textarea" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCategoryDialog = false">取消</el-button>
        <el-button type="primary" @click="handleCreateCategory">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Upload, Reading, MagicStick, Delete, Connection, Check } from '@element-plus/icons-vue'
import { readerCategoryApi } from '../api/reader.api'
import { bookApi } from '../api/book.api'
import { aiApi } from '../api/ai.api'
import { configApi } from '../api/other.api'

const userStore = useUserStore()
const activeTab = ref('basic')
const isAdmin = computed(() => userStore.user?.role === 'admin')

const visibleTabs = computed(() => {
  const tabs = [{ key: 'basic', label: '基本信息' }, { key: 'categories', label: '读者种类' }]
  if (isAdmin.value) tabs.push({ key: 'ai', label: 'AI 配置' }, { key: 'vector', label: '向量管理' })
  tabs.push({ key: 'about', label: '关于' })
  return tabs
})

const getRoleLabel = (role?: string) => {
  const map: Record<string, string> = { admin: '管理员', librarian: '图书管理员', teacher: '教师', student: '学生' }
  return map[role || ''] || '未知'
}

// Categories
const showCategoryDialog = ref(false)
const readerCategories = ref<any[]>([])
const categoryForm = reactive({ code: '', name: '', max_borrow_count: 5, max_borrow_days: 30, validity_days: 365, notes: '' })

const loadCategories = async () => {
  const result = await readerCategoryApi.getAll()
  if (result.success) readerCategories.value = result.data
}

const handleCreateCategory = async () => {
  if (!categoryForm.code || !categoryForm.name) { ElMessage.warning('请填写完整信息'); return }
  try {
    const result = await readerCategoryApi.create(JSON.parse(JSON.stringify(categoryForm)))
    if (result.success) { ElMessage.success('创建成功'); showCategoryDialog.value = false; loadCategories() }
    else ElMessage.error(result.error?.message || '创建失败')
  } catch { ElMessage.error('创建失败') }
}

const handleDeleteCategory = async (row: any) => {
  try {
    await ElMessageBox.confirm(`确定要删除分类 "${row.name}" 吗？`, '确认', { type: 'warning' })
    const result = await readerCategoryApi.delete(row.id)
    if (result.success) { ElMessage.success('删除成功'); loadCategories() }
  } catch {}
}

// AI Config
const testingConnection = ref(false)
const savingConfig = ref(false)
const aiConfigForm = reactive({ apiUrl: 'https://api.siliconflow.cn/v1', apiKey: '', embeddingModel: 'Qwen/Qwen3-Embedding-8B', chatModel: 'Pro/MiniMaxAI/MiniMax-M2.5' })

const loadAISettings = async () => {
  try {
    const result = await configApi.getAISettings()
    if (result.success && result.data) {
      if (result.data.baseURL) aiConfigForm.apiUrl = result.data.baseURL
      if (result.data.apiKey) aiConfigForm.apiKey = result.data.apiKey
      if (result.data.embeddingModel) aiConfigForm.embeddingModel = result.data.embeddingModel
      if (result.data.chatModel) aiConfigForm.chatModel = result.data.chatModel
    }
  } catch {}
}

const handleTestConnection = async () => {
  if (!aiConfigForm.apiKey) { ElMessage.warning('请先输入 API Key'); return }
  testingConnection.value = true
  try {
    const result = await configApi.testAIConnection()
    if (result.success) ElMessage.success(result.data?.message || '连接测试成功')
    else ElMessage.error(result.data?.message || result.error?.message || '连接测试失败')
  } catch (e: any) { ElMessage.error(e.message || '连接测试失败') }
  finally { testingConnection.value = false }
}

const handleSaveAIConfig = async () => {
  if (!aiConfigForm.apiKey) { ElMessage.warning('请先输入 API Key'); return }
  savingConfig.value = true
  try {
    const result = await configApi.updateAISettings({ baseURL: aiConfigForm.apiUrl, apiKey: aiConfigForm.apiKey, embeddingModel: aiConfigForm.embeddingModel, chatModel: aiConfigForm.chatModel })
    if (result.success) ElMessage.success('保存成功')
    else ElMessage.error(result.error?.message || '保存失败')
  } catch { ElMessage.error('保存失败') }
  finally { savingConfig.value = false }
}

// Vector
const vectorStats = reactive({ totalVectors: 0, coverageRate: 0 })
const vectorLoading = ref(false)

const loadVectorStats = async () => {
  const result = await aiApi.getStatistics()
  if (result.success) Object.assign(vectorStats, result.data)
}

const handleBatchCreateVectors = async () => {
  try {
    await ElMessageBox.confirm('批量生成向量需要调用 AI API，可能需要较长时间并产生费用，确定继续吗？', '提示', { type: 'warning' })
    vectorLoading.value = true
    const booksResult = await bookApi.getAll()
    if (!booksResult.success) { ElMessage.error('获取图书列表失败'); return }
    const bookIds = booksResult.data.map((b: any) => b.id)
    if (!bookIds.length) { ElMessage.warning('没有图书可以生成向量'); return }
    const result = await aiApi.batchCreateEmbeddings(bookIds)
    if (result.success) { ElMessage.success(`成功为 ${bookIds.length} 本图书生成向量`); loadVectorStats() }
    else ElMessage.error(result.error?.message || '生成失败')
  } catch (e: any) {
    if (e !== 'cancel' && e !== 'close') ElMessage.error(e.message || '生成向量失败')
  } finally { vectorLoading.value = false }
}

onMounted(() => { loadCategories(); loadAISettings(); loadVectorStats() })
</script>

<style scoped>
.settings-page { max-width: 960px; }

.section-header { display: flex; align-items: center; justify-content: space-between; }
.section-title { font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: 16px; }
.section-desc { font-size: 13px; color: var(--text-muted); }

/* Glassmorphism cards in settings */
:deep(.light-card) {
  background: rgba(255,255,255,0.40) !important;
  backdrop-filter: blur(18px) saturate(180%);
  -webkit-backdrop-filter: blur(18px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.40);
  box-shadow: var(--shadow-glass);
}

.ai-header-icon {
  width: 48px; height: 48px; border-radius: 14px;
  background: var(--gdut-purple-tint); color: var(--gdut-purple);
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; flex-shrink: 0; margin-right: 16px;
}

.info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.info-item { display: flex; flex-direction: column; gap: 4px; }
.info-label { font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
.info-value { font-size: 15px; font-weight: 500; color: var(--text-primary); }

.vector-action-box {
  padding: 20px; background: var(--gdut-purple-tint);
  border-radius: 14px; border: 1px solid rgba(124, 58, 237, 0.15);
  display: flex; align-items: center; gap: 16px;
}
.vector-hint { font-size: 13px; color: var(--text-secondary); }

.about-card { text-align: center; padding: 48px 32px; }
.about-logo-wrap { margin-bottom: 24px; }
.about-logo-circle {
  width: 96px; height: 96px; background: var(--gradient-brand);
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
  margin: 0 auto; color: #fff; box-shadow: 0 8px 32px rgba(200, 16, 46, 0.30);
}
.about-title { font-size: 24px; font-weight: 700; color: var(--text-primary); margin-bottom: 16px; }
.about-desc { color: var(--text-secondary); line-height: 1.8; margin-bottom: 24px; font-size: 15px; }
.about-tags { display: flex; justify-content: center; gap: 10px; }
</style>
