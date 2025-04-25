import os
import subprocess
import ffmpeg
from typing import List, Tuple, Optional

def get_duration(path: str) -> float:
    """
    使用 ffprobe 获取文件总时长（秒）。
    
    参数:
        path: 媒体文件路径
        
    返回:
        文件时长（秒）
        
    异常:
        FileNotFoundError: 文件不存在
        RuntimeError: ffprobe执行失败
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

def make_atempo_chain(ratio: float) -> List[Tuple[str, float]]:
    """
    构建一系列 ('atempo', factor) 滤镜，使得最终比例为 ratio，
    且每个 factor 都在 [0.5, 2.0] 范围内。
    
    参数:
        ratio: 目标速度比例
        
    返回:
        滤镜链列表，每个元素为 ('atempo', factor) 元组
    """
    parts: List[Tuple[str, float]] = []
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
    output_path: str,
    video_codec: str = 'copy',
    audio_codec: str = 'aac',
    audio_bitrate: Optional[str] = None
) -> None:
    """
    将 audio_path 对齐到 video_path 的时长，并将处理后的音频与视频合并到 output_path。
    
    参数:
        video_path: 输入视频文件路径
        audio_path: 输入音频文件路径
        output_path: 输出视频文件路径
        video_codec: 视频编码器，默认为'copy'（无损复制）
        audio_codec: 音频编码器，默认为'aac'
        audio_bitrate: 音频比特率，例如'192k'，默认为None（使用编码器默认值）
        
    返回:
        None
        
    异常:
        ffmpeg运行时可能引发的各种异常
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
    
    # 6. 准备输出选项
    output_options = {
        'vcodec': video_codec,
        'acodec': audio_codec,
        'shortest': None  # 以最短流结束
    }
    
    # 添加可选的音频比特率
    if audio_bitrate:
        output_options['b:a'] = audio_bitrate
    
    # 7. 合并并输出
    (
        ffmpeg
        .output(video_in.video, audio_in, output_path, **output_options)
        .run(overwrite_output=True)
    )

def main():
    """测试函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description="音频视频同步工具")
    parser.add_argument("--video", default="input_video.mp4", help="输入视频文件路径")
    parser.add_argument("--audio", default="input_audio.wav", help="输入音频文件路径")
    parser.add_argument("--output", default="synced_output.mp4", help="输出视频文件路径")
    parser.add_argument("--vcodec", default="copy", help="视频编码器")
    parser.add_argument("--acodec", default="aac", help="音频编码器")
    parser.add_argument("--abitrate", help="音频比特率，例如'192k'")
    
    args = parser.parse_args()
    
    print(f"正在处理...")
    print(f"视频文件: {args.video}")
    print(f"音频文件: {args.audio}")
    print(f"输出文件: {args.output}")
    
    sync_audio_to_video(
        args.video, 
        args.audio, 
        args.output,
        video_codec=args.vcodec,
        audio_codec=args.acodec,
        audio_bitrate=args.abitrate
    )
    
    print(f"处理完成! 输出文件: {args.output}")

if __name__ == '__main__':
    main()

'''
依赖安装:
pip install ffmpeg-python==0.2.0
'''