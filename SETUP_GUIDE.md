# 图书管理系统 - 安装与启动指南

## 问题诊断与解决

### 原始问题
用户报告：双击 `start-dev.bat` 打不开应用

### 问题根源
经过系统性排查发现，**问题不是 bat 文件本身**，而是 `better-sqlite3` 原生模块的编译问题：

1. **MODULE_VERSION 不匹配**：
   - Node.js 20 使用 MODULE_VERSION 115
   - Electron 28 使用 MODULE_VERSION 119
   - `better-sqlite3` 需要针对 Electron 重新编译

2. **Vite 打包配置**：
   - 需要将 `better-sqlite3` 标记为 external
   - 防止 Vite 尝试打包原生 .node 模块

### 解决方案

#### 第一次安装
```bash
# 1. 安装依赖（使用本地 Node 20）
export PATH="$(pwd)/.node/node20:$PATH"  # Git Bash/Linux/macOS
# 或
set PATH=%CD%\.node\node20;%PATH%        # Windows CMD

npm install

# 2. 重新编译 better-sqlite3 for Electron
npx electron-rebuild -f -w better-sqlite3

# 3. 启动应用
npm run dev
```

#### 快速启动（已完成首次设置后）

**Git Bash (推荐):**
```bash
./start-dev.sh
```

**Windows CMD:**
```cmd
start-dev.bat
```

**PowerShell:**
```powershell
.\start-dev.bat
```

**手动启动（任何终端）:**
```bash
# Git Bash / Linux / macOS
export PATH="$(pwd)/.node/node20:$PATH"
npm run dev

# Windows CMD
set PATH=%CD%\.node\node20;%PATH%
npm run dev

# PowerShell
$env:PATH = "$(Get-Location)\.node\node20;$env:PATH"
npm run dev
```

## 技术细节

### 1. 本地 Node 20 设置
- 位置：`.node/node20/`
- 版本：20.18.1
- 原因：Node.js 24 与 better-sqlite3@9.2.2 不兼容（需要 C++20）

### 2. better-sqlite3 编译
```bash
# 编译成功标志
✔ Rebuild Complete
All 4769 functions were compiled
```

### 3. 成功启动标志
```
✅ 向量表初始化完成
✅ 数据库表结构初始化完成
📚 数据库系统准备就绪
[INFO] 应用启动成功
```

## 常见问题

### Q1: 为什么不升级 Node.js 24？
**A:** better-sqlite3@9.2.2 需要 C++17 编译，而 Node.js 24 要求 C++20。升级会导致编译失败。

### Q2: 为什么不换数据库库？
**A:** 
- better-sqlite3 性能最优（同步 API，零延迟）
- 项目已有 1000+ 行代码基于此库
- 其他替代品（sql.js, node-sqlite3）性能较差或 API 不同

### Q3: electron-rebuild 做了什么？
**A:** 将 Node.js 原生模块（.node 文件）重新编译为 Electron 的 Node 版本（MODULE_VERSION 119）

### Q4: 为什么 start-dev.bat 之前不工作？
**A:** 之前的错误是运行时错误，不是脚本问题：
- 应用启动了，但 Electron 加载 better-sqlite3 时失败
- 错误信息被终端编码问题掩盖
- 真正问题是 MODULE_VERSION 不匹配

## 测试数据

已生成测试数据：
- 📚 100 本图书
- 👥 50 个读者  
- 📖 150 条借阅记录（包含正常/逾期/归还等各种状态）

默认登录：
- 用户名：`admin`
- 密码：`admin123`

## 项目结构

```
.
├── .node/node20/          # 本地 Node.js 20.18.1
├── src/
│   ├── main/              # Electron 主进程（后端）
│   ├── renderer/          # Vue 前端
│   └── preload/           # 预加载脚本
├── scripts/
│   └── generateTestData.ts  # 测试数据生成器
├── start-dev.sh           # Unix 启动脚本
├── start-dev.bat          # Windows 启动脚本
└── vite.config.ts         # Vite 配置（含 external 设置）
```

## 更多信息

- Node 版本说明：`NODE_VERSION.md`
- 本地 Node 详细用法：`LOCAL_NODE_USAGE.md`
- 项目文档：`README.md`
- 架构设计：`ARCHITECTURE.md`
- 使用指南：`USAGE.md`
