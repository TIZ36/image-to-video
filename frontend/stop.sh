#!/bin/bash

# 检查PID文件是否存在
if [ ! -f "frontend.pid" ]; then
  echo "错误: 未找到frontend.pid文件，服务可能未启动或已被手动停止"
  exit 1
fi

# 读取PID
PID=$(cat frontend.pid)

# 检查进程是否存在
if ! ps -p $PID > /dev/null; then
  echo "警告: 进程ID $PID 不存在，服务可能已停止"
  echo "删除过时的PID文件..."
  rm frontend.pid
  exit 0
fi

# 停止进程
echo "正在停止前端服务 (PID: $PID)..."
kill $PID

# 等待进程终止
MAX_WAIT=10
WAIT_COUNT=0
while ps -p $PID > /dev/null && [ $WAIT_COUNT -lt $MAX_WAIT ]; do
  echo "等待服务终止..."
  sleep 1
  WAIT_COUNT=$((WAIT_COUNT + 1))
done

# 检查进程是否仍然存在
if ps -p $PID > /dev/null; then
  echo "警告: 服务没有正常终止，强制终止..."
  kill -9 $PID
  sleep 1
fi

# 删除PID文件
rm frontend.pid

echo "前端服务已停止" 