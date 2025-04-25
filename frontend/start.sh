#!/bin/bash

# 显示使用帮助
if [ "$1" == "-h" ] || [ "$1" == "--help" ]; then
  echo "使用方法: ./start.sh [外部IP] [内部IP]"
  echo "例如: ./start.sh 50.19.10.82 172.31.28.157"
  echo ""
  echo "参数:"
  echo "  外部IP: 外部可访问的服务器IP地址 (默认: 50.19.10.82)"
  echo "  内部IP: 内部网络的服务器IP地址 (默认: 172.31.28.157)"
  exit 0
fi

# 安装依赖
echo "正在安装依赖..."
npm install

# 如果未设置SERVER_IP和INTERNAL_SERVER_IP，使用默认值
export SERVER_IP=${1:-50.19.10.82}
export INTERNAL_SERVER_IP=${2:-172.31.28.157}

# 显示配置信息
echo "使用以下配置启动前端服务:"
echo "- 外部IP (SERVER_IP): $SERVER_IP"
echo "- 内部IP (INTERNAL_SERVER_IP): $INTERNAL_SERVER_IP"

# 将环境变量传递给Next.js并启动开发服务器
echo "正在启动Next.js开发服务器..."
NEXT_PUBLIC_SERVER_IP=$SERVER_IP NEXT_PUBLIC_INTERNAL_SERVER_IP=$INTERNAL_SERVER_IP npx next dev -H 0.0.0.0 -p 3000

# 以下代码不会执行，因为npx next dev会阻塞进程
echo "前端服务已启动"