import os
import subprocess
import ffmpeg

def get_duration(path: str) -> float:
    """
    使用 ffprobe 获取文件总时长（秒）。
    """
    if not os.path.isfile(path):
        raise FileNotFoundError(f"File not found: {path}")
    cmd = [
        'ffprobe', '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        path
    ]
    proc = subprocess.run(cmd, stdout=subprocess.PIPE,
                          stderr=subprocess.PIPE, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"ffprobe error for {path}:\n{proc.stderr.strip()}")
    return float(proc.stdout.strip())

def make_atempo_chain(ratio: float) -> list[tuple[str, float]]:
    """
    构建一系列 ('atempo', factor) 滤镜，使得最终比例为 ratio，
    且每个 factor 都在 [0.5, 2.0] 范围内。
    """
    parts: list[tuple[str, float]] = []
    while ratio > 2.0:
        parts.append(('atempo', 2.0))
        ratio /= 2.0
    while ratio < 0.5:
        parts.append(('atempo', 0.5))
        ratio /= 0.5
    parts.append(('atempo', ratio))
    return parts

def sync_audio_to_video(
    video_path: str,
    audio_path: str,
    output_path: str
) -> None:
    """
    将 audio_path 对齐到 video_path 的时长，并将处理后的音频与视频无损合并到 output_path。
    """
    # 1. 获取时长
    dv = get_duration(video_path)
    da = get_duration(audio_path)
    # 2. 计算速度比
    ratio = da / dv
    # 3. 拆分 atempo 滤镜
    filters = make_atempo_chain(ratio)
    # 4. 构建 ffmpeg-python 流图
    video_in = ffmpeg.input(video_path)
    audio_in = ffmpeg.input(audio_path).audio
    # 5. 链式应用 atempo 滤镜
    for name, factor in filters:
        audio_in = audio_in.filter(name, factor)
    # 6. 合并并输出
    (
        ffmpeg
        .output(video_in.video, audio_in, output_path,
                vcodec='copy',    # 无损复制视频
                acodec='aac',     # 编码音频为 AAC
                shortest=None)    # 以最短流结束
        .run(overwrite_output=True)
    )

video_path = 'input_video.mp4'
audio_path = 'input_audio.wav'
output_path = 'synced_output2.mp4'

sync_audio_to_video(video_path, audio_path, output_path)

'''
pip install ffmpeg-python==0.2.0
'''