# Node.js 版本问题解决方案

## 问题分析

### 错误信息
```
Error: The module '...\better-sqlite3\build\Release\better_sqlite3.node'
was compiled against a different Node.js version using
NODE_MODULE_VERSION 119. This version of Node.js requires
NODE_MODULE_VERSION 127.
```

### 根本原因

| 项目 | 当前值 | 期望值 |
|------|--------|--------|
| Node.js 版本 | v22.16.0 | v20.x |
| NODE_MODULE_VERSION | 127 | 119 |
| better-sqlite3 编译版本 | v20.x | v20.x |

- 项目 [`.nvmrc`](../.nvmrc:1) 文件指定了 Node.js 版本为 **20**
- 你当前使用的是 **Node.js v22.16.0**
- [`better-sqlite3`](../package.json:29) 是一个原生模块，需要针对特定 Node.js 版本编译
- 模块是用 Node.js v20 编译的（NODE_MODULE_VERSION 119），但你在 v22 上运行（需要 127）

---

## 解决方案

### 方案一：切换到 Node.js v20（推荐）

这是项目要求的版本，可以确保所有依赖正常工作。

#### WSL 上安装 nvm（Node Version Manager）

**nvm** 是最流行的 Node.js 版本管理工具，安装简单，使用方便。

```bash
# 1. 安装 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# 2. 重新加载 shell 配置
source ~/.bashrc

# 3. 安装 Node.js v20
nvm install 20

# 4. 使用 Node.js v20
nvm use 20

# 5. 设置为默认版本
nvm alias default 20

# 6. 验证版本
node -v
npm -v
```

#### Windows 上安装 nvm-windows

如果你在 Windows 上开发：

```powershell
# 1. 下载 nvm-windows
# 访问: https://github.com/coreybutler/nvm-windows/releases
# 下载 nvm-setup.exe 并安装

# 2. 安装 Node.js v20
nvm install 20

# 3. 使用 Node.js v20
nvm use 20

# 4. 验证版本
node -v
```

#### 切换版本后重新安装依赖

```bash
# 删除 node_modules 和 package-lock.json
rm -rf node_modules package-lock.json

# 重新安装依赖（better-sqlite3 会针对 Node.js v20 编译）
npm install

# 运行数据库生成脚本
npm run db:generate
```

---

### 方案二：重新编译 better-sqlite3（临时方案）

如果你不想切换 Node.js 版本，可以尝试重新编译模块。

```bash
# 方法 1：使用 npm rebuild
npm rebuild better-sqlite3

# 方法 2：使用 electron-rebuild（项目已安装）
npx electron-rebuild -f -w better-sqlite3

# 方法 3：删除并重新安装
npm uninstall better-sqlite3
npm install better-sqlite3
```

**注意**：这可能会遇到编译问题，因为 better-sqlite3 需要编译工具链（Python、C++ 编译器等）。

---

### 方案三：使用预编译的二进制文件

```bash
# 删除 node_modules 中的 better-sqlite3
rm -rf node_modules/better-sqlite3

# 重新安装（会自动下载对应 Node.js 版本的预编译二进制）
npm install better-sqlite3 --build-from-source
```

---

## WSL 上的 Node.js 版本管理工具对比

| 工具 | 安装难度 | 速度 | 特点 | 推荐度 |
|------|----------|------|------|--------|
| **nvm** | 简单 | 中等 | 最流行，文档完善，社区活跃 | ⭐⭐⭐⭐⭐ |
| **fnm** | 简单 | 快 | 用 Rust 编写，更轻量 | ⭐⭐⭐⭐ |
| **volta** | 简单 | 快 | 自动管理项目级 Node 版本 | ⭐⭐⭐⭐ |

### fnm 安装示例（更快的替代方案）

```bash
# 安装 fnm
curl -fsSL https://fnm.vercel.app/install | bash

# 重新加载 shell
source ~/.bashrc

# 安装 Node.js v20
fnm install 20

# 使用 Node.js v20
fnm use 20

# 设置默认版本
fnm default 20
```

---

## 推荐执行步骤

1. **安装 nvm**（WSL）或 **nvm-windows**（Windows）
2. **切换到 Node.js v20**
3. **删除 node_modules 和 package-lock.json**
4. **重新运行 npm install**
5. **运行 npm run db:generate**

---

## 常见问题

### Q: 为什么不直接升级项目到 Node.js v22？
A: Electron 28.1.0（项目当前版本）对 Node.js v22 的支持可能不完善，且 better-sqlite3 等原生模块可能需要时间适配。

### Q: nvm 和 nvm-windows 是同一个项目吗？
A: 不是。nvm 用于 Linux/macOS/WSL，nvm-windows 是独立的 Windows 版本。

### Q: 如何在 WSL 和 Windows 之间同步 Node.js 版本？
A: 建议在两个环境分别安装对应的版本管理工具，并保持版本一致。
