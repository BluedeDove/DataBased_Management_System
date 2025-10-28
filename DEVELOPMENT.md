# 开发指南

## 🛠️ 开发环境搭建

### 1. 安装依赖

```bash
npm install
```

### 2. 配置AI服务（可选）

如果需要使用AI功能，创建 `.env` 文件：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的OpenAI API密钥：

```
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_BASE_URL=https://api.openai.com/v1
```

### 3. 启动开发服务器

```bash
npm run dev
```

应用会自动打开，默认账号：`admin` / `admin123`

## 📝 开发规范

### 代码结构

遵循DDD分层架构：

```
Handler (IPC) → Service (业务逻辑) → Repository (数据访问) → Database
```

### 添加新功能的步骤

#### 1. 后端实现

##### Step 1: 创建Repository

在 `src/main/domains/[domain]/[name].repository.ts` 中创建数据访问层：

```typescript
export class ExampleRepository {
  findAll(): Example[] {
    const stmt = db.prepare('SELECT * FROM examples')
    return stmt.all() as Example[]
  }

  create(data: CreateExample): Example {
    const stmt = db.prepare('INSERT INTO examples (...) VALUES (...)')
    const result = stmt.run(...)
    return this.findById(result.lastInsertRowid as number)
  }
}
```

##### Step 2: 创建Service

在 `src/main/domains/[domain]/[name].service.ts` 中实现业务逻辑：

```typescript
export class ExampleService {
  private exampleRepository = new ExampleRepository()

  getAllExamples(): Example[] {
    return this.exampleRepository.findAll()
  }

  createExample(data: CreateExample): Example {
    // 业务验证
    if (!data.name) {
      throw new ValidationError('名称不能为空')
    }

    // 业务逻辑
    return this.exampleRepository.create(data)
  }
}
```

##### Step 3: 添加IPC Handler

在 `src/main/lib/ipcHandlers.ts` 中注册处理器：

```typescript
const exampleService = new ExampleService()

export function registerIpcHandlers() {
  // ...其他handlers

  ipcMain.handle('example:getAll', async () => {
    try {
      const data = exampleService.getAllExamples()
      return { success: true, data }
    } catch (error) {
      return errorHandler.handle(error)
    }
  })

  ipcMain.handle('example:create', async (_, data) => {
    try {
      const result = exampleService.createExample(data)
      return { success: true, data: result }
    } catch (error) {
      return errorHandler.handle(error)
    }
  })
}
```

#### 2. 前端实现

##### Step 1: 在Preload中暴露API

在 `src/preload/index.ts` 中：

```typescript
export interface ElectronAPI {
  // ...其他API

  example: {
    getAll: () => Promise<any>
    create: (data: any) => Promise<any>
  }
}

const api: ElectronAPI = {
  // ...

  example: {
    getAll: () => ipcRenderer.invoke('example:getAll'),
    create: (data) => ipcRenderer.invoke('example:create', data)
  }
}
```

##### Step 2: 创建Vue页面

在 `src/renderer/src/views/Example.vue` 中：

```vue
<template>
  <div class="page-container">
    <h1>示例页面</h1>
    <!-- 你的UI -->
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const examples = ref<any[]>([])

const loadData = async () => {
  const result = await window.api.example.getAll()
  if (result.success) {
    examples.value = result.data
  }
}

const handleCreate = async (data: any) => {
  const result = await window.api.example.create(data)
  if (result.success) {
    ElMessage.success('创建成功')
    loadData()
  } else {
    ElMessage.error(result.error?.message || '创建失败')
  }
}

onMounted(() => {
  loadData()
})
</script>
```

##### Step 3: 添加路由

在 `src/renderer/src/router/index.ts` 中：

```typescript
{
  path: 'example',
  name: 'Example',
  component: () => import('@/views/Example.vue'),
  meta: { title: '示例', icon: 'Document' }
}
```

## 🧪 测试

### 运行单元测试

```bash
npm run test:unit
```

### 编写测试

在 `tests/services/` 目录下创建测试文件：

```typescript
import { describe, it, expect, vi } from 'vitest'
import { ExampleService } from '../../../src/main/domains/example/example.service'

describe('ExampleService', () => {
  it('should create an example', () => {
    const service = new ExampleService()
    const result = service.createExample({ name: 'Test' })
    expect(result).toBeDefined()
  })
})
```

## 📦 构建应用

### 开发构建

```bash
npm run build
```

### 生产构建

构建所有平台：

```bash
npm run build
```

## 🐛 调试技巧

### 1. 主进程调试

在 `src/main/index.ts` 中添加：

```typescript
if (isDev) {
  mainWindow.webContents.openDevTools()
}
```

### 2. 查看日志

日志会输出到控制台和日志文件（用户数据目录）

### 3. 数据库调试

数据库文件位置：`{userData}/library.db`

可以使用SQLite客户端工具查看：
- DB Browser for SQLite
- SQLiteStudio

### 4. 清除数据重新开始

删除用户数据目录的数据库文件：

- Windows: `%APPDATA%/electron-smart-library/library.db`
- macOS: `~/Library/Application Support/electron-smart-library/library.db`
- Linux: `~/.config/electron-smart-library/library.db`

## 🎨 UI开发

### Element Plus组件

项目使用Element Plus UI库，参考：https://element-plus.org/

### 样式规范

- 使用 scoped CSS
- 遵循BEM命名规范
- 使用CSS变量定义主题色

### 响应式设计

使用Element Plus的响应式工具：

```vue
<el-row :gutter="20">
  <el-col :xs="24" :sm="12" :md="8" :lg="6">
    <!-- 内容 -->
  </el-col>
</el-row>
```

## 🔧 常见问题

### Q: npm install 失败

A: 尝试：
```bash
npm cache clean --force
npm install
```

### Q: Electron窗口无法打开

A: 检查端口3000是否被占用，修改 `vite.config.ts` 中的端口

### Q: 数据库操作报错

A: 确保数据库文件有读写权限

### Q: AI功能不可用

A:
1. 检查 `.env` 文件是否正确配置
2. 确认API密钥有效
3. 检查网络连接

## 📚 学习资源

- Electron官方文档: https://www.electronjs.org/
- Vue 3文档: https://vuejs.org/
- TypeScript文档: https://www.typescriptlang.org/
- Element Plus: https://element-plus.org/

## 🤝 贡献指南

1. Fork项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启Pull Request

---

**祝开发愉快！** 🚀
