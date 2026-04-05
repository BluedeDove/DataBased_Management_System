# 智能图书管理系统

基于数据库原理课程设计开发的 B/S 架构图书管理系统，集成 AI 智能检索、语义搜索、Agent 对话等能力。

## 技术栈

| 层次 | 技术 |
|------|------|
| 前端 | Vue 3 + TypeScript + Element Plus + Pinia + ECharts |
| 后端 | Express.js + TypeScript |
| 数据库 | SQLite (better-sqlite3) |
| AI | OpenAI 兼容 API（支持硅基流动等国内服务商） |
| 构建 | Vite (前端) + tsx (后端热重载) |

## 项目结构

```
├── server/                  # Express.js 后端 (端口 3001)
│   └── src/
│       ├── domains/         # 业务领域 (auth, book, borrowing, reader, ai, search, note, notification)
│       ├── database/        # SQLite 初始化、健康检查
│       ├── routes/          # REST API 路由
│       ├── middleware/       # JWT 认证、参数校验、限流、审计日志
│       ├── config/          # 环境配置
│       └── lib/             # JWT 工具、错误处理
│
├── web/                     # Vue 3 前端 (端口 3000)
│   └── src/
│       ├── api/             # Axios HTTP 客户端 + 各业务 API 模块
│       ├── components/      # 公共组件 (Layout 侧边栏)
│       ├── router/          # Vue Router (hash 模式、路由守卫)
│       ├── store/           # Pinia 状态管理
│       ├── styles/          # 全局样式 (Glassmorphism 设计体系)
│       └── views/           # 页面组件
│
├── scripts/                 # 数据库工具脚本
│   ├── generate-data-v2.ts  # 生成测试数据
│   ├── clear-database.ts    # 清空数据库
│   └── generators/          # 数据生成器
│
└── data/                    # SQLite 数据库文件
```

## 功能页面

| 页面 | 功能 | 权限 |
|------|------|------|
| Login / Register | 分屏登录、注册（粒子动画） | 公开 |
| Dashboard | KPI 卡片、30 天借阅趋势、热门图书 TOP 5 | 所有角色 |
| Books | 图书 CRUD、类别筛选、高级搜索（正则/SQL/语义）、导出 | 所有角色 |
| Readers | 读者 CRUD、搜索、续卡 | admin, librarian |
| Borrowing | 借阅/归还/续借标签页、逾期提醒 | 所有角色 |
| Statistics | 图书/读者/借阅统计分析图表 | admin, librarian |
| AI Assistant | 流式对话、对话历史、图书推荐、工具调用 | 所有角色 |
| Notes | 读书笔记广场、笔记发布与管理 | 所有角色 |
| Settings | 类别管理、AI 配置、向量管理 | admin, librarian |

## 快速开始

### 环境要求

- Node.js 20.x（项目通过 Volta 锁定版本 20.20.2）
- npm 10.x

### 安装与启动

```bash
# 安装依赖
npm install
cd web && npm install && cd ..

# 启动（Windows 双击 start.bat，或手动执行）
npm run dev:server    # 后端 (端口 3001)
npm run dev:web       # 前端 (端口 3000，自动代理 /api → 3001)
```

访问 http://localhost:3000

### 默认账号

| 账号 | 密码 | 角色 |
|------|------|------|
| admin | admin123 | 管理员 |
| librarian | lib123 | 图书管理员 |

也可通过注册页面创建 teacher / student 角色账号。

### 生成测试数据

```bash
npm run db:generate                              # 默认 300 本书、100 个读者
npm run db:generate -- --books 500 --readers 200 # 自定义数量
npm run db:generate -- --dry-run                 # 预览，不写入数据库
npm run db:generate -- --seed 12345              # 固定随机种子，可复现
```

### 清空数据库

```bash
npm run db:clear          # 清空业务数据，保留 admin/librarian、系统设置和基础分类
npm run db:clear:all      # 原地清空全部表数据，不删除数据库文件
```

脚本执行完成后直接刷新页面即可，无需重启应用。

## 数据库设计

### 核心表

| 表 | 用途 |
|----|------|
| `users` | 用户认证（角色：admin / librarian / teacher / student） |
| `readers` / `reader_categories` | 读者档案与类别 |
| `books` / `book_categories` | 图书库存与类别 |
| `borrowing_records` | 借阅事务记录 |
| `book_vectors` | 图书向量嵌入（语义搜索用） |
| `ai_conversations` | AI 对话历史 |
| `notes` | 读书笔记 |
| `operation_logs` / `audit_logs` | 操作审计日志 |

### 数据库原理应用

| 原理 | 实现 |
|------|------|
| **事务 (ACID)** | 借阅/归还使用 `db.transaction()` 保证原子性 |
| **乐观锁** | `version` 字段 + CAS 更新 + 指数退避重试 |
| **软删除** | `is_deleted` 字段，唯一字段添加删除后缀释放原值 |
| **索引优化** | 12 个索引覆盖高频查询场景 |
| **外键约束** | 保证参照完整性 |
| **SQL 注入防护** | 参数化查询 + 白名单机制 |

## AI 智能功能

AI 配置存储在数据库中（`system_settings` 表），通过 Settings 页面配置，即时生效无需重启。

### AI Agent 工具

AI 对话支持 Agent 模式，可自动调用以下工具：

| 工具 | 功能 |
|------|------|
| `search_books` | 关键词/正则/语义三种模式搜索图书 |
| `recommend_books` | 按主题推荐图书 |
| `get_book_details` | 查看图书详情与借阅状态 |
| `get_borrowing_status` | 查询图书在借情况 |
| `borrow_book` | 帮用户借书 |
| `search_notes` | 搜索公开读书笔记 |
| `publish_note` | 发布读书笔记 |
| `get_my_borrowings` | 查看当前借阅记录 |
| `get_popular_books` | 热门图书排行 |
| `get_reader_info` | 查看读者个人信息 |

### 语义搜索

基于向量嵌入的语义搜索，流程：图书文本 → Embedding API → 向量存入 `book_vectors` 表 → 查询时计算余弦相似度排序。

## 外网分享 (ngrok)

项目内置 ngrok 支持，可一键将本地应用分享到公网：

```bash
# 1. 正常启动应用
start.bat

# 2. 新开终端运行分享脚本
.\share.bat
```

Vite 开发服务器会代理 `/api/*` 到后端，ngrok 只需暴露端口 3000。

## 权限控制

- JWT 认证 + Token 自动刷新
- 四级角色：admin、librarian、teacher、student
- 前端路由守卫 + 后端中间件双重校验
- 侧边栏按角色过滤导航项

## UI 设计

采用 Glassmorphism（毛玻璃）设计风格：
- 主色 `#C8102E`（GDUT 红），强调色 `#7C3AED`
- 毛玻璃卡片：`backdrop-filter: blur(18px)`
- 浮动光球背景动画
- 72px 浮动侧边栏 + 图标导航 + 悬浮提示
