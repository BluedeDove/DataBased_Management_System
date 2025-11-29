<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">系统设置</h1>
      <p class="page-description">管理系统参数和配置</p>
    </div>

    <div class="card">
      <el-tabs>
        <el-tab-pane label="基本信息">
          <el-descriptions title="系统信息" :column="2" border>
            <el-descriptions-item label="系统名称">智能图书管理系统</el-descriptions-item>
            <el-descriptions-item label="版本">1.0.0</el-descriptions-item>
            <el-descriptions-item label="当前用户">{{ userStore.user?.name }}</el-descriptions-item>
            <el-descriptions-item label="角色">
              {{ getRoleLabel(userStore.user?.role) }}
            </el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>

        <el-tab-pane label="读者种类">
          <el-button type="primary" :icon="Plus" @click="showCategoryDialog = true">
            新增种类
          </el-button>
          <el-table :data="readerCategories" style="margin-top: 16px">
            <el-table-column prop="code" label="编码" width="100" />
            <el-table-column prop="name" label="名称" width="120" />
            <el-table-column prop="max_borrow_count" label="最大借阅数" width="110" />
            <el-table-column prop="max_borrow_days" label="借阅期限(天)" width="120" />
            <el-table-column prop="validity_days" label="有效期(天)" width="110" />
            <el-table-column prop="notes" label="备注" />
          </el-table>
        </el-tab-pane>

        <el-tab-pane v-if="isAdmin" label="AI配置">
          <el-form :model="aiConfigForm" label-width="150px" style="max-width: 600px">
            <el-form-item label="API URL">
              <el-input v-model="aiConfigForm.apiUrl" placeholder="https://api.openai.com/v1" />
            </el-form-item>
            <el-form-item label="API Key">
              <el-input
                v-model="aiConfigForm.apiKey"
                type="password"
                placeholder="请输入OpenAI API密钥"
                show-password
              />
            </el-form-item>
            <el-form-item label="Embedding模型">
              <el-input
                v-model="aiConfigForm.embeddingModel"
                placeholder="text-embedding-3-small"
              />
            </el-form-item>
            <el-form-item label="Chat模型">
              <el-input v-model="aiConfigForm.chatModel" placeholder="gpt-4-turbo-preview" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleTestConnection" :loading="testingConnection">
                测试连接
              </el-button>
              <el-button type="success" @click="handleSaveAIConfig" :loading="savingConfig">
                保存配置
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane v-if="isAdmin" label="向量管理">
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
        </el-tab-pane>

        <el-tab-pane label="关于">
          <div style="text-align: center; padding: 40px">
            <el-icon :size="80" color="#409eff"><Reading /></el-icon>
            <h2 style="margin: 20px 0">智能图书管理系统</h2>
            <p style="color: #909399; line-height: 2">
              基于 Electron + Vue 3 + TypeScript 开发<br />
              采用领域驱动设计和分层架构<br />
              提供完整的图书馆管理解决方案
            </p>
            <div style="margin-top: 40px">
              <el-tag>v1.0.0</el-tag>
              <el-tag type="success" style="margin-left: 10px">企业级</el-tag>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <el-dialog v-model="showCategoryDialog" title="新增读者种类" width="500px">
      <el-form :model="categoryForm" label-width="120px">
        <el-form-item label="编码">
          <el-input v-model="categoryForm.code" />
        </el-form-item>
        <el-form-item label="名称">
          <el-input v-model="categoryForm.name" />
        </el-form-item>
        <el-form-item label="最大借阅数">
          <el-input-number v-model="categoryForm.max_borrow_count" :min="1" />
        </el-form-item>
        <el-form-item label="借阅期限(天)">
          <el-input-number v-model="categoryForm.max_borrow_days" :min="1" />
        </el-form-item>
        <el-form-item label="有效期(天)">
          <el-input-number v-model="categoryForm.validity_days" :min="1" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="categoryForm.notes" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCategoryDialog = false">取消</el-button>
        <el-button type="primary" @click="handleCreateCategory">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useUserStore } from '@/store/user'
import { ElMessage, ElMessageBox } from 'element-plus'

const userStore = useUserStore()
const showCategoryDialog = ref(false)
const readerCategories = ref<any[]>([])
const testingConnection = ref(false)
const savingConfig = ref(false)

// 角色权限相关
const isAdmin = computed(() => userStore.user?.role === 'admin')

// 角色标签映射
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

// 向量管理
const vectorStats = reactive({
  totalVectors: 0,
  coverageRate: 0
})
const vectorLoading = ref(false)

const loadCategories = async () => {
  const result = await window.api.readerCategory.getAll()
  if (result.success) {
    readerCategories.value = result.data
  }
}

const loadAISettings = async () => {
  try {
    const result = await window.api.config.getAISettings()
    console.log('[Settings] 加载AI配置返回:', result)
    if (result.success && result.data) {
      // 后端返回的是baseURL，前端用apiUrl
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
      console.log('[Settings] AI配置已加载:', {
        apiUrl: aiConfigForm.apiUrl,
        apiKey: aiConfigForm.apiKey ? '***' : '(空)',
        embeddingModel: aiConfigForm.embeddingModel,
        chatModel: aiConfigForm.chatModel
      })
    }
  } catch (error) {
    console.error('Failed to load AI settings:', error)
  }
}

const handleTestConnection = async () => {
  console.log('========== [前端] 开始测试AI连接 ==========')
  console.log('[前端] 当前AI配置:', {
    apiUrl: aiConfigForm.apiUrl,
    apiKey: aiConfigForm.apiKey ? `${aiConfigForm.apiKey.substring(0, 10)}...` : '(空)',
    embeddingModel: aiConfigForm.embeddingModel,
    chatModel: aiConfigForm.chatModel
  })

  if (!aiConfigForm.apiKey) {
    console.warn('[前端] API Key为空')
    ElMessage.warning('请先输入API Key')
    return
  }

  testingConnection.value = true
  console.log('[前端] 准备调用config.testAIConnection API...')

  try {
    const testParams = {
      baseURL: aiConfigForm.apiUrl,
      apiKey: aiConfigForm.apiKey,
      embeddingModel: aiConfigForm.embeddingModel,
      chatModel: aiConfigForm.chatModel
    }
    console.log('[前端] 调用参数:', {
      ...testParams,
      apiKey: testParams.apiKey ? `${testParams.apiKey.substring(0, 10)}...` : '(空)'
    })

    const result = await window.api.config.testAIConnection(testParams)

    console.log('[前端] API调用返回结果:', result)

    if (result.success) {
      console.log('[前端] 连接测试成功')
      ElMessage.success(result.data?.message || '连接测试成功')
    } else {
      console.error('[前端] 连接测试失败:', result.data || result.error)
      ElMessage.error(result.data?.message || result.error?.message || '连接测试失败')
    }
  } catch (error: any) {
    console.error('[前端] 捕获到错误:', error)
    if (error instanceof Error) {
      console.error('[前端] 错误堆栈:', error.stack)
    }
    ElMessage.error(error.message || '连接测试失败')
  } finally {
    testingConnection.value = false
    console.log('========== [前端] AI连接测试结束 ==========\n')
  }
}

const handleSaveAIConfig = async () => {
  if (!aiConfigForm.apiKey) {
    ElMessage.warning('请先输入API Key')
    return
  }

  savingConfig.value = true
  try {
    // 前端用apiUrl，后端需要baseURL
    const result = await window.api.config.updateAISettings({
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
  console.log('========== [前端] 开始创建读者种类 ==========')
  if (!categoryForm.code || !categoryForm.name) {
    console.warn('[前端] 验证失败: 编码或名称为空')
    ElMessage.warning('请填写完整信息')
    return
  }

  console.log('[前端] 表单数据:', JSON.parse(JSON.stringify(categoryForm)))

  // 将响应式对象转换为普通对象，否则IPC无法克隆
  const plainData = JSON.parse(JSON.stringify(categoryForm))
  console.log('[前端] 转换为普通对象:', plainData)

  try {
    const result = await window.api.readerCategory.create(plainData)
    console.log('[前端] API调用返回结果:', result)

    if (result.success) {
      console.log('[前端] 创建成功')
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
      console.error('[前端] 创建失败:', result.error)
      ElMessage.error(result.error?.message || '创建失败')
    }
  } catch (error) {
    console.error('[前端] 捕获到错误:', error)
    if (error instanceof Error) {
      console.error('[前端] 错误堆栈:', error.stack)
    }
    ElMessage.error('创建失败')
  }
  console.log('========== [前端] 读者种类创建结束 ==========\n')
}

// 批量生成向量
const handleBatchCreateVectors = async () => {
  console.log('========== [前端] 开始批量生成向量 ==========')
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
    console.log('[前端] 用户确认继续')

    vectorLoading.value = true

    // 获取所有图书
    console.log('[前端] 正在获取所有图书...')
    const booksResult = await window.api.book.getAll()
    console.log('[前端] 获取图书结果:', booksResult)

    if (!booksResult.success) {
      console.error('[前端] 获取图书列表失败:', booksResult.error)
      ElMessage.error('获取图书列表失败')
      return
    }

    const bookIds = booksResult.data.map((book: any) => book.id)
    console.log(`[前端] 共获取到${bookIds.length}本图书，ID列表:`, bookIds)

    if (bookIds.length === 0) {
      console.warn('[前端] 没有图书需要生成向量')
      ElMessage.warning('没有图书可以生成向量')
      return
    }

    console.log('[前端] 开始调用batchCreateEmbeddings API...')
    const result = await window.api.ai.batchCreateEmbeddings(bookIds)
    console.log('[前端] API调用返回结果:', result)

    if (result.success) {
      console.log('[前端] 向量生成成功')
      ElMessage.success(`成功为${bookIds.length}本图书生成向量`)
      loadVectorStats()
    } else {
      console.error('[前端] 向量生成失败:', result.error)
      ElMessage.error(result.error?.message || '生成失败')
    }
  } catch (error: any) {
    console.error('[前端] 批量生成向量出错:', error)
    if (error !== 'cancel' && error !== 'close') {
      // 不是用户取消
      ElMessage.error(error.message || '生成向量失败')
    } else {
      console.log('[前端] 用户取消了操作')
    }
  } finally {
    vectorLoading.value = false
    console.log('========== [前端] 批量生成向量结束 ==========\n')
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
  loadCategories()
  loadAISettings()
  loadVectorStats()
})
</script>
