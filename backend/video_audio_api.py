#!/usr/bin/env python3
"""
视频音频处理API

提供用于处理视频和音频文件的REST API，包括：
- 音频与视频同步并合并
"""

import os
import uuid
import shutil
from flask import Flask, request, jsonify
from audio_video_sync import merge_audio_video
from werkzeug.utils import secure_filename

app = Flask(__name__)

# 配置
UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', 'uploads')
OUTPUT_FOLDER = os.environ.get('OUTPUT_FOLDER', 'outputs')
MAX_CONTENT_LENGTH = 200 * 1024 * 1024  # 200MB上传限制

# 确保目录存在
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['OUTPUT_FOLDER'] = OUTPUT_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

# 允许的文件类型
ALLOWED_EXTENSIONS_VIDEO = {'mp4', 'webm', 'avi', 'mov'}
ALLOWED_EXTENSIONS_AUDIO = {'mp3', 'wav', 'aac', 'm4a'}

def allowed_file(filename, allowed_extensions):
    """检查文件扩展名是否允许"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in allowed_extensions

@app.route('/api/v1/merge-audio-video', methods=['POST'])
def api_merge_audio_video():
    """
    将音频文件与视频文件合并
    
    请求参数:
    - video_file: 视频文件（multipart/form-data）
    - audio_file: 音频文件（multipart/form-data）
    - output_format: 输出格式 (可选，默认为 'mp4')
    
    返回:
    JSON格式的处理结果，包括成功状态和输出文件URL
    """
    # 检查请求中是否包含文件
    if 'video_file' not in request.files or 'audio_file' not in request.files:
        return jsonify({
            "success": False,
            "error": "请求必须包含视频文件和音频文件"
        }), 400
    
    video_file = request.files['video_file']
    audio_file = request.files['audio_file']
    
    # 检查文件名是否有效
    if video_file.filename == '' or audio_file.filename == '':
        return jsonify({
            "success": False,
            "error": "未选择文件"
        }), 400
    
    # 检查文件类型
    if not (allowed_file(video_file.filename, ALLOWED_EXTENSIONS_VIDEO) and 
            allowed_file(audio_file.filename, ALLOWED_EXTENSIONS_AUDIO)):
        return jsonify({
            "success": False,
            "error": f"不支持的文件类型。允许的视频格式: {', '.join(ALLOWED_EXTENSIONS_VIDEO)}，"
                    f"允许的音频格式: {', '.join(ALLOWED_EXTENSIONS_AUDIO)}"
        }), 400
    
    # 获取输出格式
    output_format = request.form.get('output_format', 'mp4')
    if output_format not in ALLOWED_EXTENSIONS_VIDEO:
        return jsonify({
            "success": False,
            "error": f"不支持的输出格式: {output_format}。允许的格式: {', '.join(ALLOWED_EXTENSIONS_VIDEO)}"
        }), 400
    
    try:
        # 创建唯一的处理ID
        process_id = str(uuid.uuid4())
        process_dir = os.path.join(app.config['UPLOAD_FOLDER'], process_id)
        os.makedirs(process_dir, exist_ok=True)
        
        # 保存上传的文件
        video_path = os.path.join(process_dir, secure_filename(video_file.filename))
        audio_path = os.path.join(process_dir, secure_filename(audio_file.filename))
        
        video_file.save(video_path)
        audio_file.save(audio_path)
        
        # 准备输出路径
        output_filename = f"merged_{process_id}.{output_format}"
        output_path = os.path.join(app.config['OUTPUT_FOLDER'], output_filename)
        
        # 执行合并
        result = merge_audio_video(video_path, audio_path, output_path, True)
        
        # 如果成功，生成输出URL并返回
        if result["success"]:
            output_url = f"/api/media/{output_filename}"
            
            return jsonify({
                "success": True,
                "process_id": process_id,
                "output_url": output_url,
                "details": {
                    "input_video_duration": result["input_video"]["duration"],
                    "input_audio_duration": result["input_audio"]["duration"],
                    "output_duration": result["output"]["duration"],
                    "speed_ratio": result["speed_ratio"]
                }
            })
        else:
            # 处理失败，返回错误信息
            return jsonify({
                "success": False,
                "error": result["error"]
            }), 500
            
    except Exception as e:
        # 发生异常，返回错误信息
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
    finally:
        # 清理临时文件
        try:
            shutil.rmtree(process_dir)
        except:
            pass

@app.route('/api/media/<filename>', methods=['GET'])
def serve_media(filename):
    """提供媒体文件访问"""
    return app.send_from_directory(app.config['OUTPUT_FOLDER'], filename)

@app.route('/health', methods=['GET'])
def health_check():
    """健康检查端点"""
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    # 在开发环境中运行
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True) 