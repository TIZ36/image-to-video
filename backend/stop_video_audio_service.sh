#!/bin/bash

# 进入后端目录（如果从其他目录调用）
cd "$(dirname "$0")"

# 检查PID文件是否存在
if [ ! -f "video_audio_service.pid" ]; then
    echo "错误: PID文件不存在，服务可能未启动或已手动停止"
    exit 1
fi

# 获取PID
PID=$(cat video_audio_service.pid)

# 检查进程是否存在
if ! ps -p $PID > /dev/null; then
    echo "警告: 进程ID $PID 不存在，服务可能已停止"
    rm video_audio_service.pid
    exit 0
fi

# 停止服务
echo "正在停止视频音频处理服务 (PID: $PID)..."
kill $PID

# 等待进程终止
MAX_WAIT=10
WAIT_COUNT=0
while ps -p $PID > /dev/null && [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    echo "等待服务终止..."
    sleep 1
    WAIT_COUNT=$((WAIT_COUNT + 1))
done

# 如果进程仍然存在，强制终止
if ps -p $PID > /dev/null; then
    echo "警告: 服务没有正常终止，正在强制终止..."
    kill -9 $PID
    sleep 1
fi

# 删除PID文件
rm video_audio_service.pid

echo "视频音频处理服务已停止" 