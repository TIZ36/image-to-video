#!/bin/bash

# 显示使用帮助
if [ "$1" == "-h" ] || [ "$1" == "--help" ]; then
  echo "使用方法: ./start-daemon.sh [外部IP] [内部IP]"
  echo "例如: ./start-daemon.sh 50.19.10.82 172.31.28.157"
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

# 创建日志文件夹
mkdir -p logs

# 获取当前时间作为日志文件名
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="logs/frontend_${TIMESTAMP}.log"

# 将环境变量传递给Next.js并在后台启动开发服务器
echo "正在后台启动Next.js开发服务器..."
nohup NEXT_PUBLIC_SERVER_IP=$SERVER_IP NEXT_PUBLIC_INTERNAL_SERVER_IP=$INTERNAL_SERVER_IP npx next dev -H 0.0.0.0 -p 3000 > $LOG_FILE 2>&1 &

# 获取进程ID
PID=$!
echo $PID > frontend.pid

echo "前端服务已在后台启动，进程ID: $PID"
echo "日志文件: $LOG_FILE"
echo ""
echo "要查看日志，请运行: tail -f $LOG_FILE"
echo "要停止服务，请运行: kill \$(cat frontend.pid)" 