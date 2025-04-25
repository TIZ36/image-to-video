#!/usr/bin/env python3
"""
音频视频同步工具

这个工具可以将音频文件同步到视频文件的时长，然后将它们合并成一个新的视频文件。
它可以作为库使用，也可以从命令行直接调用。
"""

import os
import sys
import argparse
from typing import Optional, Dict, Any

# 导入ffmpeg同步函数
from python_ffmpeg import sync_audio_to_video, get_duration

def merge_audio_video(
    video_path: str,
    audio_path: str,
    output_path: str,
    overwrite: bool = False
) -> Dict[str, Any]:
    """
    将音频文件同步到视频文件并合并
    
    参数:
        video_path: 输入视频文件路径
        audio_path: 输入音频文件路径
        output_path: 输出视频文件路径
        overwrite: 是否覆盖现有的输出文件
        
    返回:
        包含处理结果信息的字典
    """
    # 检查文件是否存在
    if not os.path.exists(video_path):
        return {"success": False, "error": f"视频文件不存在: {video_path}"}
    
    if not os.path.exists(audio_path):
        return {"success": False, "error": f"音频文件不存在: {audio_path}"}
    
    # 检查输出文件是否已存在
    if os.path.exists(output_path) and not overwrite:
        return {"success": False, "error": f"输出文件已存在: {output_path}。使用overwrite=True覆盖现有文件。"}
    
    try:
        # 获取处理前的视频和音频时长
        video_duration = get_duration(video_path)
        audio_duration = get_duration(audio_path)
        
        # 确保输出目录存在
        output_dir = os.path.dirname(output_path)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir)
        
        # 调用同步函数
        sync_audio_to_video(video_path, audio_path, output_path)
        
        # 获取处理后的输出文件时长
        output_duration = get_duration(output_path)
        
        return {
            "success": True,
            "input_video": {
                "path": video_path,
                "duration": video_duration
            },
            "input_audio": {
                "path": audio_path,
                "duration": audio_duration
            },
            "output": {
                "path": output_path,
                "duration": output_duration
            },
            "speed_ratio": audio_duration / video_duration
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

def main():
    """命令行入口函数"""
    parser = argparse.ArgumentParser(description="音频视频同步工具")
    parser.add_argument("video", help="输入视频文件路径")
    parser.add_argument("audio", help="输入音频文件路径")
    parser.add_argument("output", help="输出视频文件路径")
    parser.add_argument("-f", "--force", action="store_true", help="覆盖现有的输出文件")
    parser.add_argument("-v", "--verbose", action="store_true", help="显示详细信息")
    
    args = parser.parse_args()
    
    # 调用合并函数
    result = merge_audio_video(args.video, args.audio, args.output, args.force)
    
    if result["success"]:
        print(f"处理成功! 输出文件: {result['output']['path']}")
        
        if args.verbose:
            print(f"\n详细信息:")
            print(f"- 输入视频: {result['input_video']['path']}")
            print(f"- 视频时长: {result['input_video']['duration']:.2f}秒")
            print(f"- 输入音频: {result['input_audio']['path']}")
            print(f"- 音频时长: {result['input_audio']['duration']:.2f}秒")
            print(f"- 音频/视频速度比: {result['speed_ratio']:.2f}")
            print(f"- 输出文件: {result['output']['path']}")
            print(f"- 输出时长: {result['output']['duration']:.2f}秒")
    else:
        print(f"处理失败: {result['error']}")
        sys.exit(1)

if __name__ == "__main__":
    main() 