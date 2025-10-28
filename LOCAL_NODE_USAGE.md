# 本地 Node 20 使用说明

## 📦 项目包含本地 Node 20

由于您的全局 Node.js 24 不兼容 better-sqlite3，项目已下载了本地 Node 20.18.1 到 `.node/node20/` 目录。

## 🚀 使用方法

### 方式1：临时 PATH（推荐用于开发）

在项目目录打开终端，执行：

```bash
# Git Bash / WSL / Linux / macOS
export PATH="$(pwd)/.node/node20:$PATH"

# PowerShell
$env:PATH = "$(Get-Location)\.node\node20;$env:PATH"

# CMD
set PATH=%CD%\.node\node20;%PATH%
```

然后正常使用 `node` 和 `npm` 命令：

```bash
node --version  # 应显示 v20.18.1
npm install
npm run dev
```

### 方式2：直接调用（用于脚本）

```bash
# 直接使用完整路径
./.node/node20/node.exe --version
./.node/node20/npm install
./.node/node20/npm run dev
```

### 方式3：npm scripts 配置（最方便）

在 `package.json` 中添加 helper scripts：

```json
{
  "scripts": {
    "node": ".node/node20/node.exe",
    "npm": ".node/node20/npm",
    "dev:local": ".node/node20/npm run dev",
    "build:local": ".node/node20/npm run build"
  }
}
```

使用：
```bash
npm run dev:local
npm run build:local
```

## 🌏 使用国内镜像加速

如果遇到网络问题或SSL证书错误，配置镜像：

```bash
# 使用淘宝镜像
./.node/node20/npm config set registry https://registry.npmmirror.com
./.node/node20/npm config set electron_mirror https://cdn.npmmirror.com/binaries/electron/
./.node/node20/npm config set electron-builder-binaries_mirror https://cdn.npmmirror.com/binaries/electron-builder-binaries/

# 或者临时使用（单次命令）
./.node/node20/npm install --registry=https://registry.npmmirror.com
```

## 📝 完整安装流程

```bash
# 1. 设置 PATH（选择对应系统的命令）
export PATH="$(pwd)/.node/node20:$PATH"  # Git Bash

# 2. 配置镜像（可选但推荐）
npm config set registry https://registry.npmmirror.com
npm config set electron_mirror https://cdn.npmmirror.com/binaries/electron/

# 3. 安装依赖
npm install

# 4. 运行项目
npm run dev
```

## ⚙️ 其他配置

### 忽略SSL错误（仅开发环境）

如果镜像配置后仍有SSL问题：

```bash
npm config set strict-ssl false
```

**⚠️ 生产环境不要禁用SSL！**

### 清理缓存

如果安装出现问题：

```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

## 🔄 恢复全局 Node

离开项目目录后，自动恢复为全局 Node 24（PATH 变量仅在当前终端会话有效）。

## 📌 注意事项

1. `.node/` 目录已添加到 `.gitignore`，不会提交到 Git
2. 每次打开新终端都需要重新设置 PATH
3. 建议在 IDE 中配置项目专用的 Node 路径
4. 文件占用约 50MB，不影响项目运行

## 🎯 IDE 配置

### VS Code

在项目根目录创建 `.vscode/settings.json`：

```json
{
  "terminal.integrated.env.windows": {
    "PATH": "${workspaceFolder}\\.node\\node20;${env:PATH}"
  },
  "terminal.integrated.env.linux": {
    "PATH": "${workspaceFolder}/.node/node20:${env:PATH}"
  },
  "terminal.integrated.env.osx": {
    "PATH": "${workspaceFolder}/.node/node20:${env:PATH}"
  }
}
```

### WebStorm

Settings → Languages & Frameworks → Node.js → Node interpreter
选择：`项目目录/.node/node20/node.exe`

## 🆘 故障排除

### 问题：`'node' 不是内部或外部命令`

解决：PATH 没设置或设置错误，重新执行 PATH 设置命令。

### 问题：better-sqlite3 编译失败

解决：
1. 确认使用的是 Node 20（`node --version`）
2. 确认有 Visual Studio Build Tools
3. 清理后重新安装：`npm cache clean --force && npm install`

### 问题：electron 下载失败

解决：使用淘宝镜像（见上方"使用国内镜像加速"）

---

**✨ 配置一次，终身受用！以后遇到类似问题都可以用这个方法。**
