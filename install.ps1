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
