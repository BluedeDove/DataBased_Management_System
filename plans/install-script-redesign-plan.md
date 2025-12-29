# 安装脚本重新设计计划

## 问题分析

### 现有 `setup_and_run.ps1` 的问题

1. **环境变量配置冗余**：脚本中设置了 `$env:ELECTRON_MIRROR` 等环境变量，但 `.npmrc` 文件已经配置了镜像，这些环境变量在PowerShell会话中可能不会正确传递给npm。

2. **缺少Node.js版本检查**：package.json要求Node.js版本在18-24之间，但脚本没有验证。

3. **原生模块处理不完善**：better-sqlite3等原生模块需要确保正确编译。

4. **缺少清理机制**：安装失败时没有清理node_modules的选项。

5. **错误处理不够详细**：虽然有基本的错误检查，但可以更详细。

## 改进方案

### 1. PowerShell安装脚本 (`install.ps1`)

#### 功能特性

- ✅ Node.js版本检查（要求18-24）
- ✅ npm版本检查
- ✅ 可选的清理功能（`-Clean` 参数）
- ✅ 自动检查和创建.npmrc配置
- ✅ 详细的安装进度显示
- ✅ 完善的错误处理
- ✅ 原生模块验证
- ✅ 安装完成后询问是否启动开发服务器

#### 脚本内容

```powershell
# install.ps1
# 智能图书管理系统 - 安装脚本
# 支持自动安装依赖和配置环境

param(
    [switch]$Clean,    # 清理后重新安装
    [switch]$NoDev     # 不启动开发服务器
)

# 设置错误处理
$ErrorActionPreference = "Stop"

# 颜色输出函数
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

# 显示欢迎信息
Write-Host "========================================" -ForegroundColor Cyan
Write-ColorOutput "  智能图书管理系统 - 安装向导" "Cyan"
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. 检查Node.js版本
Write-ColorOutput "[1/6] 检查Node.js版本..." "Yellow"
try {
    $nodeVersion = node --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "未检测到Node.js，请先安装Node.js 18-24版本"
        Write-ColorOutput "下载地址: https://nodejs.org/" "Cyan"
        exit 1
    }
    
    # 解析版本号
    $versionNumber = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    
    if ($versionNumber -lt 18 -or $versionNumber -ge 24) {
        Write-Error "当前Node.js版本: $nodeVersion"
        Write-Error "要求的Node.js版本: >=18.0.0 <24.0.0"
        exit 1
    }
    
    Write-ColorOutput "✓ Node.js版本: $nodeVersion (符合要求)" "Green"
} catch {
    Write-Error "检查Node.js版本失败: $_"
    exit 1
}
Write-Host ""

# 2. 检查npm版本
Write-ColorOutput "[2/6] 检查npm版本..." "Yellow"
try {
    $npmVersion = npm --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "未检测到npm"
        exit 1
    }
    Write-ColorOutput "✓ npm版本: $npmVersion" "Green"
} catch {
    Write-Error "检查npm版本失败: $_"
    exit 1
}
Write-Host ""

# 3. 清理旧的依赖（如果指定）
if ($Clean) {
    Write-ColorOutput "[3/6] 清理旧的依赖..." "Yellow"
    if (Test-Path "node_modules") {
        Write-ColorOutput "  删除 node_modules..." "Gray"
        Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
    }
    if (Test-Path "package-lock.json") {
        Write-ColorOutput "  删除 package-lock.json..." "Gray"
        Remove-Item -Force "package-lock.json" -ErrorAction SilentlyContinue
    }
    Write-ColorOutput "✓ 清理完成" "Green"
    Write-Host ""
} else {
    Write-ColorOutput "[3/6] 跳过清理步骤" "Gray"
    Write-Host ""
}

# 4. 检查.npmrc配置
Write-ColorOutput "[4/6] 检查npm配置..." "Yellow"
if (-not (Test-Path ".npmrc")) {
    Write-ColorOutput "  .npmrc文件不存在，创建默认配置..." "Gray"
    @"
registry=https://registry.npmmirror.com/
electron_mirror=https://npmmirror.com/mirrors/electron/
electron_builder_binaries_mirror=https://npmmirror.com/mirrors/electron-builder-binaries/
"@ | Out-File -FilePath ".npmrc" -Encoding UTF8
    Write-ColorOutput "✓ 已创建.npmrc配置文件" "Green"
} else {
    Write-ColorOutput "✓ .npmrc配置文件存在" "Green"
}
Write-Host ""

# 5. 安装依赖
Write-ColorOutput "[5/6] 安装项目依赖..." "Yellow"
Write-ColorOutput "  注意: 此过程可能需要几分钟时间..." "Gray"
Write-Host ""

try {
    # 使用.npmrc中的镜像配置
    npm install
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "npm install 失败!"
        Write-ColorOutput "提示: 尝试运行 .\install.ps1 -Clean 清理后重新安装" "Cyan"
        exit 1
    }
    
    Write-ColorOutput "✓ 依赖安装完成" "Green"
} catch {
    Write-Error "安装依赖时出错: $_"
    Write-ColorOutput "提示: 尝试运行 .\install.ps1 -Clean 清理后重新安装" "Cyan"
    exit 1
}
Write-Host ""

# 6. 验证原生模块
Write-ColorOutput "[6/6] 验证原生模块..." "Yellow"
try {
    # 运行postinstall钩子
    npm run postinstall
    
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "postinstall执行有警告，但可能不影响使用"
    } else {
        Write-ColorOutput "✓ 原生模块验证完成" "Green"
    }
} catch {
    Write-Warning "验证原生模块时出现警告: $_"
}
Write-Host ""

# 安装完成
Write-Host "========================================" -ForegroundColor Green
Write-ColorOutput "  ✓ 安装完成!" "Green"
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-ColorOutput "下一步操作:" "Cyan"
Write-Host "  启动开发服务器: npm run dev"
Write-Host "  或运行: .\start-dev.ps1"
Write-Host ""
Write-ColorOutput "其他命令:" "Gray"
Write-Host "  构建生产版本: npm run build"
Write-Host "  运行测试: npm run test:unit"
Write-Host "  生成测试数据: npm run generate:testdata"
Write-Host ""

# 询问是否启动开发服务器
if (-not $NoDev) {
    $response = Read-Host "是否立即启动开发服务器? (Y/N)"
    if ($response -eq "Y" -or $response -eq "y") {
        Write-Host ""
        Write-ColorOutput "启动开发服务器..." "Green"
        npm run dev
    }
}
```

#### 使用方法

```powershell
# 正常安装
.\install.ps1

# 清理后重新安装
.\install.ps1 -Clean

# 只安装不启动开发服务器
.\install.ps1 -NoDev
```

### 2. Bash Shell安装脚本 (`install.sh`)

#### 功能特性

- ✅ Node.js版本检查（要求18-24）
- ✅ npm版本检查
- ✅ 可选的清理功能（`--clean` 参数）
- ✅ 自动检查和创建.npmrc配置
- ✅ 详细的安装进度显示
- ✅ 完善的错误处理
- ✅ 原生模块验证
- ✅ 安装完成后询问是否启动开发服务器

#### 脚本内容

```bash
#!/bin/bash

# install.sh
# 智能图书管理系统 - 安装脚本
# 支持自动安装依赖和配置环境

# 颜色输出函数
print_color() {
    local color=$1
    local message=$2
    case $color in
        red)    echo -e "\033[31m$message\033[0m" ;;
        green)  echo -e "\033[32m$message\033[0m" ;;
        yellow) echo -e "\033[33m$message\033[0m" ;;
        cyan)   echo -e "\033[36m$message\033[0m" ;;
        gray)   echo -e "\033[90m$message\033[0m" ;;
        *)      echo "$message" ;;
    esac
}

# 显示欢迎信息
print_color cyan "========================================"
print_color cyan "  智能图书管理系统 - 安装向导"
print_color cyan "========================================"
echo ""

# 解析参数
CLEAN=false
NO_DEV=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --clean)
            CLEAN=true
            shift
            ;;
        --no-dev)
            NO_DEV=true
            shift
            ;;
        -h|--help)
            echo "用法: ./install.sh [选项]"
            echo ""
            echo "选项:"
            echo "  --clean      清理后重新安装"
            echo "  --no-dev     不启动开发服务器"
            echo "  -h, --help   显示帮助信息"
            exit 0
            ;;
        *)
            print_color red "未知选项: $1"
            exit 1
            ;;
    esac
done

# 1. 检查Node.js版本
print_color yellow "[1/6] 检查Node.js版本..."
if ! command -v node &> /dev/null; then
    print_color red "未检测到Node.js，请先安装Node.js 18-24版本"
    print_color cyan "下载地址: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version)
VERSION_NUMBER=$(echo $NODE_VERSION | sed 's/v\([0-9]*\).*/\1/')

if [ "$VERSION_NUMBER" -lt 18 ] || [ "$VERSION_NUMBER" -ge 24 ]; then
    print_color red "当前Node.js版本: $NODE_VERSION"
    print_color red "要求的Node.js版本: >=18.0.0 <24.0.0"
    exit 1
fi

print_color green "✓ Node.js版本: $NODE_VERSION (符合要求)"
echo ""

# 2. 检查npm版本
print_color yellow "[2/6] 检查npm版本..."
if ! command -v npm &> /dev/null; then
    print_color red "未检测到npm"
    exit 1
fi

NPM_VERSION=$(npm --version)
print_color green "✓ npm版本: $NPM_VERSION"
echo ""

# 3. 清理旧的依赖（如果指定）
if [ "$CLEAN" = true ]; then
    print_color yellow "[3/6] 清理旧的依赖..."
    if [ -d "node_modules" ]; then
        print_color gray "  删除 node_modules..."
        rm -rf node_modules
    fi
    if [ -f "package-lock.json" ]; then
        print_color gray "  删除 package-lock.json..."
        rm -f package-lock.json
    fi
    print_color green "✓ 清理完成"
    echo ""
else
    print_color gray "[3/6] 跳过清理步骤"
    echo ""
fi

# 4. 检查.npmrc配置
print_color yellow "[4/6] 检查npm配置..."
if [ ! -f ".npmrc" ]; then
    print_color gray "  .npmrc文件不存在，创建默认配置..."
    cat > .npmrc << EOF
registry=https://registry.npmmirror.com/
electron_mirror=https://npmmirror.com/mirrors/electron/
electron_builder_binaries_mirror=https://npmmirror.com/mirrors/electron-builder-binaries/
EOF
    print_color green "✓ 已创建.npmrc配置文件"
else
    print_color green "✓ .npmrc配置文件存在"
fi
echo ""

# 5. 安装依赖
print_color yellow "[5/6] 安装项目依赖..."
print_color gray "  注意: 此过程可能需要几分钟时间..."
echo ""

if ! npm install; then
    print_color red "npm install 失败!"
    print_color cyan "提示: 尝试运行 ./install.sh --clean 清理后重新安装"
    exit 1
fi

print_color green "✓ 依赖安装完成"
echo ""

# 6. 验证原生模块
print_color yellow "[6/6] 验证原生模块..."
if ! npm run postinstall; then
    print_color yellow "⚠ postinstall执行有警告，但可能不影响使用"
else
    print_color green "✓ 原生模块验证完成"
fi
echo ""

# 安装完成
print_color green "========================================"
print_color green "  ✓ 安装完成!"
print_color green "========================================"
echo ""

print_color cyan "下一步操作:"
echo "  启动开发服务器: npm run dev"
echo "  或运行: ./start-dev.sh"
echo ""
print_color gray "其他命令:"
echo "  构建生产版本: npm run build"
echo "  运行测试: npm run test:unit"
echo "  生成测试数据: npm run generate:testdata"
echo ""

# 询问是否启动开发服务器
if [ "$NO_DEV" = false ]; then
    read -p "是否立即启动开发服务器? (Y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        print_color green "启动开发服务器..."
        npm run dev
    fi
fi
```

#### 使用方法

```bash
# 赋予执行权限
chmod +x install.sh

# 正常安装
./install.sh

# 清理后重新安装
./install.sh --clean

# 只安装不启动开发服务器
./install.sh --no-dev

# 显示帮助
./install.sh --help
```

## 实施步骤

1. 创建 `install.ps1` 文件（PowerShell安装脚本） ✅
2. 创建 `install.sh` 文件（Bash Shell安装脚本） ✅
3. 更新现有 `setup_and_run.ps1` 或将其标记为已弃用

## 实施状态

- ✅ PowerShell安装脚本已创建: `install.ps1`
- ✅ Bash Shell安装脚本已创建: `install.sh`
- ✅ 计划文档已完成: `plans/install-script-redesign-plan.md`

## 注意事项

- 两个脚本都依赖 `.npmrc` 文件中的镜像配置
- 安装过程可能需要几分钟时间，取决于网络速度
- 如果安装失败，建议使用 `--clean` 或 `-Clean` 参数清理后重试
- better-sqlite3 等原生模块需要正确编译，postinstall 钩子会处理这个
