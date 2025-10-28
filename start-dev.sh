#!/bin/bash

echo "================================"
echo "  智能图书管理系统 - 启动中..."
echo "================================"
echo

# 设置本地 Node 20 路径
export PATH="$(pwd)/.node/node20:$PATH"

# 设置国内镜像
export ELECTRON_MIRROR=https://cdn.npmmirror.com/binaries/electron/

echo "✓ 使用本地 Node 20"
node --version

echo
echo "✓ 启动开发服务器..."
echo

npm run dev
