# 音频视频同步合并工具

这个工具包可以将音频文件（如语音旁白）同步到视频文件的时长，并将它们合并成一个新的视频文件。

## 前置条件

1. **FFmpeg**: 必须安装 FFmpeg 命令行工具
   ```bash
   # macOS:
   brew install ffmpeg

   # Ubuntu/Debian:
   sudo apt-get install ffmpeg

   # CentOS/RHEL:
   sudo yum install ffmpeg
   ```

2. **Python 依赖**:
   ```bash
   # 激活虚拟环境
   source backendenv/bin/activate

   # 安装依赖
   pip install ffmpeg-python flask --break-system-packages
   ```

   > **注意**: 使用 `--break-system-packages` 选项是因为某些 Python 环境配置为"externally managed"，
   > 这是一种防止意外修改系统 Python 环境的保护措施。

## 使用方法

### 作为 Python 库使用

```python
from audio_video_sync import merge_audio_video

result = merge_audio_video(
    video_path='path/to/video.mp4',
    audio_path='path/to/audio.wav',
    output_path='path/to/output.mp4'
)

if result["success"]:
    print(f"处理成功! 输出文件: {result['output']['path']}")
else:
    print(f"处理失败: {result['error']}")
```

### 从命令行使用

```bash
# 激活虚拟环境
source backendenv/bin/activate

# 运行命令
python audio_video_sync.py video.mp4 audio.wav output.mp4 --verbose
```

### 使用 REST API 服务

1. **启动服务**:
   ```bash
   ./start_video_audio_service.sh
   ```

2. **调用 API**:
   ```bash
   curl -X POST \
     -F "video_file=@video.mp4" \
     -F "audio_file=@audio.wav" \
     -F "output_format=mp4" \
     http://localhost:5001/api/v1/merge-audio-video
   ```

3. **停止服务**:
   ```bash
   ./stop_video_audio_service.sh
   ```

### 使用主应用 API

向项目的视频添加音频端点发送 POST 请求:

```bash
curl -X POST http://localhost:8888/api/projects/{project_id}/video/add-audio
```

## 文件说明

- `python_ffmpeg.py`: 核心音视频处理逻辑
- `audio_video_sync.py`: 提供友好的接口和命令行工具
- `video_audio_api.py`: 独立的 REST API 服务
- `start_video_audio_service.sh`: 启动 REST API 服务的脚本
- `stop_video_audio_service.sh`: 停止 REST API 服务的脚本

## 常见问题

### 1. "ffmpeg 未安装"错误

确保您已经正确安装了 FFmpeg，可以通过以下命令检查:

```bash
ffmpeg -version
```

### 2. 无法访问 API

确保 API 服务正在运行，并且端口 5001 未被占用。可以通过以下命令检查服务状态:

```bash
ps -p $(cat video_audio_service.pid)
```

### 3. 虚拟环境中找不到安装的 Python 包

确保您已经激活了虚拟环境，并在该环境中安装了所需的包:

```bash
source backendenv/bin/activate
pip list | grep ffmpeg
```

### 4. "externally-managed-environment" 错误

如果在尝试安装包时遇到以下错误:

```
error: externally-managed-environment
```

使用 `--break-system-packages` 选项:

```bash
pip install ffmpeg-python flask --break-system-packages
``` 