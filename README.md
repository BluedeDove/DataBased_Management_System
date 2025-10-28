# 智能图书管理系统 📚

一个现代化的、企业级的图书馆管理系统，基于 Electron + Vue 3 + TypeScript 构建，采用领域驱动设计（DDD）和分层架构，支持AI智能搜索和推荐。

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Electron](https://img.shields.io/badge/Electron-28+-blue.svg)
![Vue](https://img.shields.io/badge/Vue-3.4+-green.svg)

## ✨ 核心特性

### 📖 完整的业务功能
- **图书管理**
  - 图书信息录入、编辑、查询
  - 图书分类管理
  - 馆藏数量管理
  - 图书状态追踪（正常、损坏、丢失、销毁）
  - 高级搜索（多条件组合查询）
  - 数据导出（CSV/JSON格式）

- **读者管理**
  - 读者信息管理
  - 读者种类定义（学生、教师、职工等）
  - 读者证管理（激活、挂失、续期）
  - 借阅权限控制
  - 读者统计分析

- **借还管理**
  - 图书借阅处理
  - 图书归还处理
  - 图书续借
  - 逾期管理
  - 罚款计算
  - 借阅记录查询

- **统计分析**
  - 图书类别分布统计
  - 借阅趋势分析
  - 热门图书排行
  - 活跃读者统计
  - 逾期报表
  - HTML报告导出

### 🤖 AI智能功能（可选）
- **AI语义搜索**
  - 基于向量数据库的智能图书搜索
  - 自然语言查询支持
  - 相似度排序

- **AI智能推荐**
  - RAG技术实现个性化图书推荐
  - 基于用户需求的精准推荐
  - Markdown格式推荐理由

- **AI对话助手**
  - 实时交互式图书馆助手
  - 上下文理解
  - 专业图书咨询

- **向量管理**
  - 批量向量生成
  - 向量覆盖率统计
  - 自动向量化

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

浏览器会自动打开，默认地址：http://localhost:3000

### 构建应用

```bash
npm run build
```

构建后的应用将在 `release` 目录中。

## 📝 使用说明

### 默认账号

- 用户名：`admin`
- 密码：`admin123`

### 初始数据

系统首次启动时会自动初始化：
- 默认管理员账户
- 三种读者类别（学生、教师、职工）
- 五个图书分类（计算机、文学、历史、数理、艺术）

### 基本操作流程

1. **登录系统**
   - 使用默认账号登录

2. **添加读者**
   - 进入"读者管理"页面
   - 点击"新增读者"
   - 填写读者信息并选择类别

3. **添加图书**
   - 进入"图书管理"页面
   - 点击"新增图书"
   - 填写图书信息并选择分类

4. **借书流程**
   - 进入"借还管理"页面
   - 在"借书"标签页
   - 输入读者编号和图书ISBN
   - 点击"确认借书"

5. **还书流程**
   - 进入"借还管理"页面
   - 在"还书"标签页
   - 搜索读者找到借阅记录
   - 点击"还书"按钮

## 🛠️ 技术栈

### 核心框架
- **Electron** 28+ - 跨平台桌面应用框架
- **Vue 3** - 渐进式JavaScript框架
- **TypeScript** - JavaScript的超集
- **Vite** - 新一代前端构建工具

### UI组件
- **Element Plus** - Vue 3组件库
- **Chart.js** - 数据可视化

### 数据库
- **SQLite** (better-sqlite3) - 本地数据库

### 状态管理
- **Pinia** - Vue状态管理
- **Vue Router** - 路由管理

## 📁 项目结构

```
src/
├── main/              # 主进程（后端）
│   ├── domains/       # 业务领域
│   │   ├── auth/      # 认证
│   │   ├── book/      # 图书
│   │   ├── borrowing/ # 借阅
│   │   └── reader/    # 读者
│   ├── lib/           # 基础设施
│   ├── database/      # 数据库
│   └── config/        # 配置
├── preload/           # 预加载脚本
└── renderer/          # 渲染进程（前端）
    └── src/
        ├── views/     # 页面
        ├── components/# 组件
        ├── store/     # 状态
        └── router/    # 路由
```

## 🗄️ 数据库设计

### 核心数据表

- **users** - 系统用户
- **reader_categories** - 读者种类
- **readers** - 读者信息
- **book_categories** - 图书分类
- **books** - 图书信息
- **borrowing_records** - 借阅记录

## 🎯 业务规则

### 借阅规则
- 学生：最多5本，借期30天
- 教师：最多10本，借期60天
- 职工：最多8本，借期45天

### 续借规则
- 最多续借2次
- 不能在逾期状态下续借

### 逾期规则
- 逾期罚款：0.1元/天
- 有逾期图书时不能借新书

## 🔧 高级功能

### 数据导出
- 支持CSV格式导出
- 支持JSON格式导出
- HTML报告生成
- UTF-8编码支持中文

### AI功能配置
1. 获取OpenAI API密钥
2. 配置.env文件
3. 首次使用需生成向量
4. 支持自定义API端点

### 开发调试
- 主进程日志：控制台输出
- 渲染进程调试：F12开发者工具
- 数据库位置：`{userData}/library.db`
- 日志文件：`{userData}/logs/`

## 📚 文档

- **README.md** - 项目概述（本文件）
- **USAGE.md** - 详细使用指南
- **DEVELOPMENT.md** - 开发文档
- **ARCHITECTURE.md** - 架构设计文档

## 🧪 测试

### 运行测试

\`\`\`bash
npm run test:unit
\`\`\`

### 测试覆盖率

项目包含：
- 单元测试（Vitest）
- 业务逻辑测试
- Mock测试支持

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

### 开发规范
- 遵循TypeScript类型安全
- 使用ESLint代码规范
- 编写单元测试
- 提交前进行代码检查

### 提交规范
- `feat:` 新功能
- `fix:` 修复bug
- `docs:` 文档更新
- `style:` 代码格式
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建/工具

## 📄 许可证

MIT License

## 👥 作者

Your Name

## 🙏 致谢

感谢以下开源项目：Electron, Vue.js, Element Plus, TypeScript, OpenAI

---

**⭐ 如果这个项目对你有帮助，欢迎给个Star！**

## 📞 技术支持

如遇问题请提交Issue，并提供：
1. 问题描述
2. 操作步骤
3. 错误信息
4. 系统版本

---

**祝使用愉快！** 🎉