#!/bin/bash

# 进入后端目录（如果从其他目录调用）
cd "$(dirname "$0")"

# 激活虚拟环境
source backendenv/bin/activate

# 设置环境变量
export UPLOAD_FOLDER="uploads"
export OUTPUT_FOLDER="outputs"
export PORT=5001

# 确保目录存在
mkdir -p $UPLOAD_FOLDER
mkdir -p $OUTPUT_FOLDER

# 安装必要的依赖
pip install flask ffmpeg-python --break-system-packages

# 检查ffmpeg是否安装
if ! command -v ffmpeg &> /dev/null; then
    echo "错误: ffmpeg 未安装，请先安装ffmpeg"
    echo "Ubuntu/Debian: sudo apt-get install ffmpeg"
    echo "CentOS/RHEL: sudo yum install ffmpeg"
    echo "macOS: brew install ffmpeg"
    exit 1
fi

echo "启动视频音频处理服务..."
# 在后台运行服务
nohup python video_audio_api.py > video_audio_service.log 2>&1 &

# 保存PID用于停止服务
echo $! > video_audio_service.pid

echo "服务已启动，PID: $(cat video_audio_service.pid)"
echo "日志文件: video_audio_service.log" 