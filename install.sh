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
