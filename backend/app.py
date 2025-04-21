from flask import Flask, request, jsonify, send_from_directory, send_file, make_response
from flask_cors import CORS
import redis
import json
import os
import uuid
import base64
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
import time
from datetime import datetime
import traceback
import tempfile

# Import the modules we created
from llm_client import get_llm_client
from video_generator import get_video_generator
from tts_client import get_tts_client

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
# Configure CORS to allow requests from all necessary origins
CORS(app, resources={r"/api/*": {"origins": [
    "http://localhost:3000",
    "http://0.0.0.0:3000",
    "http://50.19.10.82:3000",
    "http://172.31.28.157:3000",
    "http://127.0.0.1:3000",
    "http://50.19.10.82:8888",
    "http://localhost:8888",
    "http://127.0.0.1:8888",
    "http://172.31.28.157:8888",
    "http://50.19.10.82:8888/api",
    "http://172.31.28.157:8888/api",
    "http://50.19.10.82:8888",
    "http://172.31.28.157:8888",
    "http://localhost:8888/api",
    "http://127.0.0.1:8888/api",
    "http://172.31.28.157:8888/api",
    "http://50.19.10.82:8888/api",

], "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"], "allow_headers": "*"}})

# Configure Redis
redis_client = redis.Redis(
    host=os.getenv('REDIS_HOST', 'localhost'),
    port=int(os.getenv('REDIS_PORT', 6379)),
    password=os.getenv('REDIS_PASSWORD', "123456"),
    db=int(os.getenv('REDIS_DB', 0)),
    decode_responses=True  # Automatically decode response to strings
)

# Configure upload folder
UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads'))
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload

# Configure video output folder
VIDEO_FOLDER = os.getenv('VIDEO_FOLDER', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'videos'))
if not os.path.exists(VIDEO_FOLDER):
    os.makedirs(VIDEO_FOLDER)

# Configure speech output folder
SPEECH_FOLDER = os.getenv('SPEECH_FOLDER', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'speeches'))
if not os.path.exists(SPEECH_FOLDER):
    os.makedirs(SPEECH_FOLDER)

# Allowed file extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

# Initialize LLM, video generator and TTS clients
llm_client = None
video_generator = None
tts_client = None

# Video output path
VIDEO_OUTPUT_PATH = os.getenv("VIDEO_OUTPUT_PATH", os.path.join(os.path.dirname(__file__), "..", "videos"))
# Ensure video output directory exists
os.makedirs(VIDEO_OUTPUT_PATH, exist_ok=True)

# Test files directory for temporary test uploads
TEST_FILES_DIR = os.path.join(tempfile.gettempdir(), "image_to_video_test")
os.makedirs(TEST_FILES_DIR, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_project_key(project_id):
    return f"project:{project_id}"

def get_project(project_id):
    """Retrieve project data from Redis"""
    project_key = get_project_key(project_id)
    project_data = redis_client.get(project_key)
    
    if not project_data:
        return None
    
    return json.loads(project_data)

def save_project(project_data):
    """Save project data to Redis"""
    project_key = get_project_key(project_data['id'])
    redis_client.set(project_key, json.dumps(project_data))

def get_project_image_ids(project_id):
    """获取项目所有图片的ID列表，按顺序排列"""
    # 查找所有与此项目相关的图片key
    pattern = f"image:{project_id}-image-*"
    image_keys = redis_client.keys(pattern)
    
    # 从key中提取ID
    image_ids = []
    for key in image_keys:
        # 从key中提取image ID部分
        parts = key.split('-image-')
        if len(parts) == 2:
            try:
                image_id = int(parts[1])
                image_ids.append(image_id)
            except ValueError:
                continue
    
    # 按ID排序
    image_ids.sort()
    return image_ids

def get_next_image_id(project_id):
    """获取下一个可用的图片ID"""
    # 获取当前所有图片ID
    image_ids = get_project_image_ids(project_id)
    
    # 如果没有图片，从1开始
    if not image_ids:
        return 1
    
    # 否则取最大值+1
    return max(image_ids) + 1

def update_project_images_metadata(project_id):
    """更新项目中的图片信息"""
    project = get_project(project_id)
    if not project:
        return
    
    # 获取所有图片ID
    image_ids = get_project_image_ids(project_id)
    
    # 创建图片路径列表
    images = []
    for img_id in image_ids:
        image_path = f"/api/images/{project_id}-image-{img_id}"
        images.append({
            "id": img_id,
            "path": image_path
        })
    
    # 更新项目图片信息
    project['images'] = images
    
    # 为了向后兼容，如果有图片，则第一张作为主图片
    if images:
        project['image_path'] = images[0]['path']
    else:
        project['image_path'] = None
    
    project['updated_at'] = datetime.now().isoformat()
    save_project(project)
    
    return project

def delete_project_image(project_id, image_id=None, image_path=None):
    """删除项目图片
    
    Args:
        project_id: 项目ID
        image_id: 可选，图片ID
        image_path: 可选，图片路径
    """
    if image_id is not None:
        # 直接使用图片ID
        image_key = f"image:{project_id}-image-{image_id}"
        redis_client.delete(image_key)
        print(f"Deleted image {image_key} from Redis")
        return True
        
    if not image_path:
        return False
        
    # 从路径中提取图片ID
    if image_path.startswith('/api/images/'):
        parts = image_path.strip('/').split('/')
        if len(parts) >= 3 and parts[0] == 'api' and parts[1] == 'images':
            path_parts = parts[2].split('-image-')
            if len(path_parts) == 2:
                try:
                    img_id = int(path_parts[1])
                    image_key = f"image:{project_id}-image-{img_id}"
                    redis_client.delete(image_key)
                    print(f"Deleted image {image_key} from Redis")
                    return True
                except ValueError:
                    pass
    
    # 旧格式的图片处理 (向后兼容)
    if image_path.startswith('/api/images/'):
        parts = image_path.strip('/').split('/')
        if len(parts) >= 4 and parts[0] == 'api' and parts[1] == 'images':
            if parts[2] != project_id:
                print(f"Warning: Project ID mismatch in image path: {image_path} vs {project_id}")
                return False
                
            filename = parts[3]
            image_key = f"image:{project_id}:{filename}"
            
            # 删除图片
            redis_client.delete(image_key)
            print(f"Deleted image {image_key} from Redis (old format)")
            return True
            
    return False

@app.route('/')
def index():
    """Serve a simple welcome page with API documentation link"""
    return """
    <html>
        <head>
            <title>Image to Sales Video API</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                    line-height: 1.6;
                }
                h1 {
                    color: #3f51b5;
                }
                a {
                    display: inline-block;
                    margin-top: 20px;
                    padding: 10px 20px;
                    background-color: #3f51b5;
                    color: white;
                    text-decoration: none;
                    border-radius: 4px;
                }
                a:hover {
                    background-color: #303f9f;
                }
            </style>
        </head>
        <body>
            <h1>Image to Sales Video API</h1>
            <p>Welcome to the Image to Sales Video API server!</p>
            <p>This API allows you to create projects, upload images, generate marketing scripts using LLM, and create sales videos.</p>
            <a href="/docs">View API Documentation</a>
        </body>
    </html>
    """

@app.route('/docs')
def swagger_ui():
    """Serve Swagger UI for API documentation"""
    return """
    <html>
        <head>
            <title>API Documentation - Image to Sales Video</title>
            <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.4.2/swagger-ui.css">
            <style>
                body {
                    margin: 0;
                }
                .topbar {
                    display: none;
                }
            </style>
        </head>
        <body>
            <div id="swagger-ui"></div>
            <script src="https://unpkg.com/swagger-ui-dist@5.4.2/swagger-ui-bundle.js"></script>
            <script>
                window.onload = function() {
                    const ui = SwaggerUIBundle({
                        url: "/swagger.json",
                        dom_id: '#swagger-ui',
                        deepLinking: true,
                        presets: [
                            SwaggerUIBundle.presets.apis,
                            SwaggerUIBundle.SwaggerUIStandalonePreset
                        ],
                        layout: "BaseLayout",
                        defaultModelsExpandDepth: -1
                    });
                    window.ui = ui;
                };
            </script>
        </body>
    </html>
    """

@app.route('/swagger.json')
def serve_swagger_json():
    """Serve the Swagger JSON file"""
    swagger_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'swagger.json')
    return send_file(swagger_path, mimetype='application/json')

@app.route('/api/projects', methods=['POST'])
def create_project():
    """Create a new project"""
    data = request.json
    
    if not data or 'name' not in data:
        return jsonify({"error": "Project name is required"}), 400
    
    project_id = str(uuid.uuid4())
    project_data = {
        "id": project_id,
        "name": data['name'],
        "description": data.get('description', ''),
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "image_path": None,
        "images": [],  # 新增字段，存储所有图片信息
        "script": None,
        "video": None
    }
    
    save_project(project_data)
    
    return jsonify({"success": True, "project": project_data}), 201

@app.route('/api/projects/<project_id>/image', methods=['PUT', 'POST'])
def upload_image(project_id):
    """Upload an image for a specific project (legacy API)"""
    project = get_project(project_id)
    
    if not project:
        return jsonify({"error": "Project not found"}), 404
    
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400
    
    file = request.files['image']
    
    if file.filename == '':
        return jsonify({"error": "No image selected"}), 400
    
    if file and allowed_file(file.filename):
        # 如果有现有图片，先删除旧图片
        if request.method == 'PUT' and project.get('image_path'):
            delete_project_image(project_id, image_path=project['image_path'])
        
        # 使用新的图片上传功能
        response = upload_project_image(project_id)
        
        # 确保响应是成功的
        if isinstance(response, tuple) and response[1] != 200:
            return response
        
        # 由于upload_project_image已经更新了项目信息，所以这里不需要额外处理
        
        return jsonify({
            "success": True,
            "message": "Image uploaded successfully",
            "image_path": project['image_path']
        })
    
    return jsonify({"error": "Invalid file type"}), 400

@app.route('/api/projects/<project_id>/script/generate', methods=['POST'])
def generate_script(project_id):
    """Generate a marketing script based on the project's image using LLM"""
    try:
        global llm_client
        if llm_client is None:
            llm_client = get_llm_client(redis_client)
        
        project = get_project(project_id)
        
        if not project:
            return jsonify({"error": "Project not found"}), 404
        
        # Get image IDs from query parameters
        image_ids = request.args.getlist('image_id')
        if not image_ids:
            return jsonify({"error": "No image_id provided"}), 400
        
        # Get image paths
        image_paths = []
        for img_id in image_ids:
            try:
                img_id = int(img_id)
                image_path = f"/api/images/{project_id}-image-{img_id}"
                image_paths.append(image_path)
            except ValueError:
                return jsonify({"error": f"Invalid image ID: {img_id}"}), 400
        
        # Get prompt data
        prompt_data = request.json or {}
        system_prompt = prompt_data.get('systemPrompt', '')
        user_prompt = prompt_data.get('userPrompt', '')
        
        # Process images and generate script
        try:
            # Get image data from Redis
            image_key = f"image:{project_id}-image-{image_ids[0]}"
            data_url = redis_client.get(image_key)
            
            if not data_url:
                return jsonify({"error": "Image not found in database"}), 404
            
            # Process data URL
            if data_url.startswith('data:'):
                parts = data_url.split(',', 1)
                if len(parts) < 2:
                    return jsonify({"error": "Invalid image format"}), 500
                base64_data = parts[1]
            else:
                base64_data = data_url
            
            # Create temporary file
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
                try:
                    temp_file.write(base64.b64decode(base64_data))
                    temp_image_path = temp_file.name
                    
                    # Generate script
                    script = llm_client.generate_script(
                        project_id,
                        image_ids[0],
                        project['name'],
                        project.get('description', ''),
                        system_prompt=system_prompt,
                        user_prompt=user_prompt
                    )
                    
                    # Update project with new script
                    project['script'] = script
                    project['updated_at'] = datetime.now().isoformat()
                    save_project(project)
                    
                    return jsonify({
                        "success": True,
                        "script": script
                    })
                finally:
                    # Clean up temporary file
                    if os.path.exists(temp_image_path):
                        os.unlink(temp_image_path)
        except Exception as e:
            app.logger.error(f"Error generating script: {str(e)}")
            app.logger.error(traceback.format_exc())
            return jsonify({"error": f"Failed to generate script: {str(e)}"}), 500
            
    except Exception as e:
        app.logger.error(f"Unexpected error in generate_script: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500

@app.route('/api/projects/<project_id>/script', methods=['PUT'])
def update_script(project_id):
    """Update the marketing script for a project"""
    data = request.json
    project = get_project(project_id)
    
    if not project:
        return jsonify({"error": "Project not found"}), 404
    
    if not data or 'script' not in data:
        return jsonify({"error": "Script content is required"}), 400
    
    # Update project with the new script
    project['script'] = data['script']
    project['updated_at'] = datetime.now().isoformat()
    save_project(project)
    
    return jsonify({
        "success": True,
        "message": "Script updated successfully",
        "script": project['script']
    })

@app.route('/api/projects/<project_id>/video/generate', methods=['POST'])
def generate_video(project_id):

    """Generate a sales video based on the project's image and script"""
    global video_generator
    if video_generator is None:
        video_generator = get_video_generator()
    
    project = get_project(project_id)
    
    if not project:
        return jsonify({"error": "Project not found"}), 404
    
    # 检查是否有图片
    if not project.get('images') and not project.get('image_path'):
        return jsonify({"error": "No image has been uploaded for this project"}), 400
    
    # 检查是否有脚本
    if not project.get('script'):
        return jsonify({"error": "No script has been created for this project"}), 400
    

    print(f"Generating video for project: {project_id}")
    print(f"Project script: {project['script']}")
    print(f"Project images: {project['images']}")
    print(f"Project image_path: {project['image_path']}")

    script = project['script']

    
    # 提取脚本文本 - 视频描述部分用于生成视频
    description = ""
    narration = ""

    if script:
        parts = script.split("视频描述:", 1)
        print(f"Parts: {parts}")
        if len(parts) > 1:
            allscripts = parts[1].strip()
        parts2 = allscripts.split("旁白文本:", 1)
        if len(parts2) > 1:
            description = parts2[0].strip()
            narration = parts2[1].strip()

    print(f"Extracted description: {description}")
    print(f"Extracted narration: {narration}")

    try:
        # 获取项目特定的视频文件夹
        project_video_folder = os.path.join(VIDEO_FOLDER, project_id)
        os.makedirs(project_video_folder, exist_ok=True)
        
        print(f"Project video folder: {project_video_folder}")
        # 从请求中获取参数

        
        # print(f"Data: {data}")
        # # 从请求中提取配置参数或使用默认值
        # static_mask = data.get('static_mask', None)
        # dynamic_masks = data.get('dynamic_masks', None)
        

        # 选择要使用的图片
        # 从redis中获取图片， 模糊匹配
        image_key = f"image:{project_id}-image-*"
        imagesss = redis_client.keys(image_key)

        # 从imagesss中选择第一张图片
        image_path = imagesss[0]
        print(f"Using image path: {image_path}")

        image_data = redis_client.get(image_path)

        # 调用视频生成器
        video_result = video_generator.generate_video(
            image_path=image_path,
            image_data=image_data,
            script=description,  # 使用提取的旁白文本
            output_dir=project_video_folder,
        )
        
        # 更新项目的视频信息
        project['video'] = video_result
        project['updated_at'] = datetime.now().isoformat()
        save_project(project)
        
        return jsonify({
            "success": True,
            "video": video_result
        })
    except Exception as e:
        return jsonify({"error": f"Failed to generate video: {str(e)}"}), 500

@app.route('/api/projects/<project_id>/video/status', methods=['GET'])
def check_video_status(project_id):
    """检查项目视频生成的状态"""
    try:
        # 检查项目是否存在
        project = get_project(project_id)
        if not project:
            return jsonify({"error": "Project not found"}), 404
        
        # 检查是否有视频信息
        if 'video' not in project or not project['video']:
            return jsonify({
                "status": "not_generated",
                "message": "Video has not been generated yet"
            })
        
        video_info = project['video']
        
        # 检查视频文件是否存在
        if 'file_path' in video_info:
            video_path = video_info['file_path']
            if os.path.exists(video_path):
                return jsonify({
                    "status": "completed",
                    "video": video_info
                })
            else:
                return jsonify({
                    "status": "file_missing",
                    "message": "Video file is missing, may need to regenerate"
                })
        
        # 检查是否正在处理中
        if 'status' in video_info and video_info['status'] == 'processing':
            return jsonify({
                "status": "processing",
                "message": "Video generation is in progress",
                "started_at": video_info.get('started_at')
            })
        
        return jsonify({
            "status": "unknown",
            "video_info": video_info
        })
    
    except Exception as e:
        app.logger.error(f"Error checking video status: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({"error": f"Failed to check video status: {str(e)}"}), 500

@app.route('/api/projects/<project_id>', methods=['GET'])
def get_project_details(project_id):
    """Get project details"""
    project = get_project(project_id)
    
    if not project:
        return jsonify({"error": "Project not found"}), 404
    
    return jsonify({"success": True, "project": project})

@app.route('/api/projects', methods=['GET'])
def list_projects():
    """List all projects"""
    # Get all project keys
    project_keys = redis_client.keys('project:*')
    projects = []
    
    for key in project_keys:
        project_data = redis_client.get(key)
        if project_data:
            projects.append(json.loads(project_data))
    
    return jsonify({"success": True, "projects": projects})

@app.route('/api/videos/<path:filename>', methods=['GET'])
def serve_video(filename):
    """Serve video files"""
    return send_from_directory(VIDEO_FOLDER, filename)

@app.route('/api/images/<path:image_path>', methods=['GET'])
def serve_project_image(image_path):
    """为新格式的项目图片提供服务
    
    格式: {project_id}-image-{image_id}
    """
    # 解析路径获取project_id和image_id
    parts = image_path.split('-image-')
    if len(parts) != 2:
        return jsonify({"error": "Invalid image path format"}), 400
    
    try:
        project_id = parts[0]
        image_id = int(parts[1])
    except ValueError:
        return jsonify({"error": "Invalid image ID"}), 400
    
    # 获取图片数据
    image_key = f"image:{project_id}-image-{image_id}"
    data_url = redis_client.get(image_key)
    
    if not data_url:
        return jsonify({"error": "Image not found"}), 404
    
    # 检查是否已经是data URL格式
    if data_url.startswith('data:'):
        # 提取MIME类型和base64数据
        parts = data_url.split(',', 1)
        if len(parts) < 2:
            return jsonify({"error": "Invalid image format"}), 500
            
        mime_type = parts[0].split(';')[0].split(':')[1]
        base64_data = parts[1]
    else:
        # 兼容旧格式
        mime_type = 'image/jpeg'  # 默认MIME类型
        base64_data = data_url
    
    try:
        # 解码base64数据
        image_data = base64.b64decode(base64_data)
        
        # 返回正确的Content-Type
        response = make_response(image_data)
        response.headers.set('Content-Type', mime_type)
        return response
    except Exception as e:
        return jsonify({"error": f"Failed to process image: {str(e)}"}), 500

@app.route('/api/projects/<project_id>/images', methods=['POST'])
def upload_project_image(project_id):
    """上传项目的新图片"""
    project = get_project(project_id)
    
    if not project:
        return jsonify({"error": "Project not found"}), 404
    
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400
    
    file = request.files['image']
    
    if file.filename == '':
        return jsonify({"error": "No image selected"}), 400
    
    if file and allowed_file(file.filename):
        # 读取文件数据
        file_data = file.read()
        
        # 确定MIME类型
        file_ext = file.filename.split('.')[-1].lower() if '.' in file.filename else 'jpg'
        mime_type = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif'
        }.get(file_ext, 'image/jpeg')
        
        # 转换为base64
        base64_encoded = base64.b64encode(file_data).decode('utf-8')
        
        # 获取下一个图片ID
        image_id = get_next_image_id(project_id)
        
        # 创建Redis键
        image_key = f"image:{project_id}-image-{image_id}"
        
        # 存储完整的data URL
        redis_client.set(image_key, f"data:{mime_type};base64,{base64_encoded}")
        
        # 更新项目图片元数据
        update_project_images_metadata(project_id)
        
        # 返回结果
        return jsonify({
            "success": True,
            "message": "Image uploaded successfully",
            "image_id": image_id,
            "image_path": f"/api/images/{project_id}-image-{image_id}"
        })
    
    return jsonify({"error": "Invalid file type"}), 400

@app.route('/api/projects/<project_id>/images/<int:image_id>', methods=['DELETE'])
def delete_project_image_api(project_id, image_id):
    """删除项目的指定图片"""
    project = get_project(project_id)
    
    if not project:
        return jsonify({"error": "Project not found"}), 404
    
    # 检查图片是否存在
    image_key = f"image:{project_id}-image-{image_id}"
    if not redis_client.exists(image_key):
        return jsonify({"error": "Image not found"}), 404
    
    # 删除图片
    redis_client.delete(image_key)
    
    # 更新项目图片元数据
    updated_project = update_project_images_metadata(project_id)
    
    return jsonify({
        "success": True,
        "message": "Image deleted successfully",
        "images": updated_project['images'] if 'images' in updated_project else []
    })

@app.route('/api/projects/<project_id>/images', methods=['GET'])
def get_project_images(project_id):
    """获取项目的所有图片"""
    project = get_project(project_id)
    
    if not project:
        return jsonify({"error": "Project not found"}), 404
    
    # 如果项目已有images字段，直接返回
    if 'images' in project:
        return jsonify({
            "success": True,
            "images": project['images']
        })
    
    # 否则，重新获取图片信息并更新项目
    image_ids = get_project_image_ids(project_id)
    images = []
    
    for img_id in image_ids:
        image_path = f"/api/images/{project_id}-image-{img_id}"
        images.append({
            "id": img_id,
            "path": image_path
        })
    
    # 更新项目并保存
    project['images'] = images
    save_project(project)
    
    return jsonify({
        "success": True,
        "images": images
    })

@app.route('/api/projects/<project_id>', methods=['DELETE'])
def delete_project(project_id):
    """Delete a project and its associated resources"""
    project = get_project(project_id)
    
    if not project:
        return jsonify({"error": "Project not found"}), 404
    
    try:
        # 删除项目的所有图片
        image_ids = get_project_image_ids(project_id)
        for image_id in image_ids:
            delete_project_image(project_id, image_id=image_id)
            
        # 兼容旧版本，删除单张图片
        if project.get('image_path'):
            delete_project_image(project_id, image_path=project['image_path'])
        
        # 删除项目数据
        project_key = get_project_key(project_id)
        redis_client.delete(project_key)
        
        # 删除任何本地视频文件
        project_video_folder = os.path.join(VIDEO_FOLDER, project_id)
        if os.path.exists(project_video_folder):
            import shutil
            shutil.rmtree(project_video_folder)
        
        return jsonify({
            "success": True,
            "message": "Project deleted successfully"
        })
        
    except Exception as e:
        return jsonify({"error": f"Failed to delete project: {str(e)}"}), 500

@app.route('/api/images/<project_id>/<path:filename>', methods=['GET'])
def serve_image(project_id, filename):
    """Serve image files from Redis (old format)"""
    image_key = f"image:{project_id}:{filename}"
    data_url = redis_client.get(image_key)
    
    if not data_url:
        return jsonify({"error": "Image not found"}), 404
    
    # 检查是否已经是data URL格式
    if data_url.startswith('data:'):
        # 提取MIME类型和base64数据
        parts = data_url.split(',', 1)
        if len(parts) < 2:
            return jsonify({"error": "Invalid image format"}), 500
            
        mime_type = parts[0].split(';')[0].split(':')[1]
        base64_data = parts[1]
    else:
        # 兼容旧格式
        file_ext = filename.split('.')[-1].lower() if '.' in filename else 'jpg'
        mime_type = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif'
        }.get(file_ext, 'image/jpeg')
        base64_data = data_url
    
    try:
        # 解码base64数据
        image_data = base64.b64decode(base64_data)
        
        # 返回正确的Content-Type
        response = make_response(image_data)
        response.headers.set('Content-Type', mime_type)
        return response
    except Exception as e:
        return jsonify({"error": f"Failed to process image: {str(e)}"}), 500

# Template management endpoints

@app.route('/api/templates', methods=['GET'])
def get_templates():
    """Get all prompt templates"""
    try:
        # Get all template keys from Redis
        template_keys = redis_client.keys("template:*")
        templates = []
        
        for key in template_keys:
            template_data = redis_client.get(key)
            if template_data:
                template = json.loads(template_data)
                templates.append(template)
        
        # Sort templates by creation date (newest first)
        templates.sort(key=lambda x: x.get('createdAt', ''), reverse=True)
        
        return jsonify({
            "success": True,
            "templates": templates
        })
    except Exception as e:
        return jsonify({"error": f"Failed to get templates: {str(e)}"}), 500

@app.route('/api/templates', methods=['POST'])
def create_template():
    """Create a new prompt template"""
    data = request.json
    
    if not data or 'name' not in data or 'systemPrompt' not in data or 'userPrompt' not in data:
        return jsonify({"error": "Missing required template data"}), 400
    
    try:
        # Generate a unique ID for the template
        template_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        
        template = {
            "id": template_id,
            "name": data['name'],
            "systemPrompt": data['systemPrompt'],
            "userPrompt": data['userPrompt'],
            "createdAt": now,
            "updatedAt": now
        }
        
        # Save template to Redis
        redis_client.set(f"template:{template_id}", json.dumps(template))
        
        return jsonify({
            "success": True,
            "template": template
        })
    except Exception as e:
        return jsonify({"error": f"Failed to create template: {str(e)}"}), 500

@app.route('/api/templates/<template_id>', methods=['PUT'])
def update_template(template_id):
    """Update an existing prompt template"""
    data = request.json
    
    if not data:
        return jsonify({"error": "Missing template data"}), 400
    
    try:
        # Get existing template
        template_key = f"template:{template_id}"
        template_data = redis_client.get(template_key)
        
        if not template_data:
            return jsonify({"error": "Template not found"}), 404
        
        template = json.loads(template_data)
        
        # Update template fields
        if 'name' in data:
            template['name'] = data['name']
        if 'systemPrompt' in data:
            template['systemPrompt'] = data['systemPrompt']
        if 'userPrompt' in data:
            template['userPrompt'] = data['userPrompt']
        
        template['updatedAt'] = datetime.now().isoformat()
        
        # Save updated template
        redis_client.set(template_key, json.dumps(template))
        
        return jsonify({
            "success": True,
            "template": template
        })
    except Exception as e:
        return jsonify({"error": f"Failed to update template: {str(e)}"}), 500

@app.route('/api/templates/<template_id>', methods=['DELETE'])
def delete_template(template_id):
    """Delete a prompt template"""
    try:
        # Delete template from Redis
        template_key = f"template:{template_id}"
        exists = redis_client.exists(template_key)
        
        if not exists:
            return jsonify({"error": "Template not found"}), 404
        
        redis_client.delete(template_key)
        
        return jsonify({
            "success": True,
            "message": "Template deleted successfully"
        })
    except Exception as e:
        return jsonify({"error": f"Failed to delete template: {str(e)}"}), 500

# Text-to-Speech endpoints

@app.route('/api/projects/<project_id>/speech/generate', methods=['POST'])
def generate_speech(project_id):
    """Generate speech audio from project script"""
    global tts_client
    if tts_client is None:
        tts_client = get_tts_client()
    
    project = get_project(project_id)
    
    if not project:
        return jsonify({"error": "Project not found"}), 404
    
    if not project.get('script'):
        return jsonify({"error": "No script has been created for this project"}), 400
    
    # 从请求中获取语言参数（可选）
    language = request.args.get('language', 'zh-CN')
    
    # 从请求中获取文本参数（可选），如果不存在则从项目脚本中提取旁白文本
    data = request.json or {}
    text = data.get('text')
    
    if not text:
        # 从项目脚本中提取旁白文本
        script = project['script']
        
        # 尝试识别脚本格式并提取旁白部分
        if "旁白文本:" in script:
            # 提取"旁白文本:"之后的内容
            parts = script.split("旁白文本:", 1)
            if len(parts) > 1:
                text = parts[1].strip()
        elif "旁白文本：" in script:  # 处理中文冒号的情况
            parts = script.split("旁白文本：", 1)
            if len(parts) > 1:
                text = parts[1].strip()
        
        if not text:
            # 如果无法提取旁白文本，使用整个脚本
            text = script
        else:
            # 删除提取的文本中可能存在的"旁白文本:"前缀
            if text.startswith("旁白文本:"):
                text = text.replace("旁白文本:", "", 1).strip()
            elif text.startswith("旁白文本："):
                text = text.replace("旁白文本：", "", 1).strip()
    
    try:
        print(f"Generating speech for project {project_id}")
        
        # 调用TTS客户端生成语音
        result = tts_client.generate_speech(text, project_id, language)
        
        if result['status'] == 'success':
            # 更新项目与语音文件关联
            if 'speech' not in project or not isinstance(project['speech'], list):
                project['speech'] = []
            
            project['speech'].append({
                'path': result['path'],
                'created_at': datetime.now().isoformat(),
                'language': language
            })
            
            project['updated_at'] = datetime.now().isoformat()
            save_project(project)
            
            return jsonify({
                "success": True,
                "message": "Speech generated successfully",
                "speech": {
                    "path": result['path'],
                    "language": language
                }
            })
        else:
            return jsonify({"error": result['error']}), 500
            
    except Exception as e:
        return jsonify({"error": f"Failed to generate speech: {str(e)}"}), 500

@app.route('/api/projects/<project_id>/speech', methods=['GET'])
def get_project_speeches(project_id):
    """Get all speeches for a project"""
    project = get_project(project_id)
    
    if not project:
        return jsonify({"error": "Project not found"}), 404
    
    speeches = project.get('speech', [])
    
    return jsonify({
        "success": True,
        "speeches": speeches
    })

@app.route('/api/speeches/<path:filename>', methods=['GET'])
def serve_speech_file(filename):
    """Serve speech audio files"""
    return send_from_directory(SPEECH_FOLDER, filename)

@app.route('/api/projects/<project_id>/speech', methods=['DELETE'])
def delete_project_speech(project_id):
    """Delete all speeches for a project"""
    project = get_project(project_id)
    
    if not project:
        return jsonify({"error": "Project not found"}), 404
    
    try:
        # 获取TTS客户端
        global tts_client
        if tts_client is None:
            tts_client = get_tts_client()
        
        # 清理所有语音文件
        tts_client.clean_old_speeches(project_id)
        
        # 更新项目
        project['speech'] = []
        project['updated_at'] = datetime.now().isoformat()
        save_project(project)
        
        return jsonify({
            "success": True,
            "message": "All speeches deleted successfully"
        })
    except Exception as e:
        return jsonify({"error": f"Failed to delete speeches: {str(e)}"}), 500

@app.route('/api/test/video/generate', methods=['POST'])
def test_generate_video():

    """Test endpoint to generate a video without a project"""
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400

        # Get image data (either base64 or path)
        image_data = data.get('image_data')
        image_path = data.get('image_path')
        script_content = data.get('script_content')

        if not script_content:
            return jsonify({"error": "Script content is required"}), 400
        
        if not image_data and not image_path:
            return jsonify({"error": "Either image_data or image_path must be provided"}), 400

        # Create a test directory for this request
        test_dir = os.path.join(TEST_FILES_DIR, f"test_{int(time.time())}")
        os.makedirs(test_dir, exist_ok=True)

        # Handle image data if provided as base64
        if image_data:
            # If data URL format, extract the base64 part
            if image_data.startswith('data:'):
                image_data = image_data.split(',', 1)[1]
            
            # Convert base64 to bytes
            image_bytes = base64.b64decode(image_data)
            
            # Save image to test directory
            image_path = os.path.join(test_dir, f"test_image_{uuid.uuid4()}.jpg")
            with open(image_path, 'wb') as f:
                f.write(image_bytes)
        
        # Save script content to a file
        script_path = os.path.join(test_dir, f"test_script_{uuid.uuid4()}.txt")
        with open(script_path, 'w') as f:
            f.write(script_content)
        
        # Generate video
        video_generator = get_video_generator()
        result = video_generator.generate_video(
        
            image_path=image_path,
            script=script_content,
            output_dir=VIDEO_OUTPUT_PATH
        )
        
        # Add timestamp to result
        result['timestamp'] = datetime.now().isoformat()
        
        return jsonify(result)
    
    except Exception as e:
        app.logger.error(f"Error generating test video: {str(e)}")
        return jsonify({"error": str(e), "status": "failed"}), 500

@app.route('/api/test/video/status', methods=['POST'])
def test_video_status():
    """测试检查视频生成状态的功能"""
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # 接收视频任务ID或视频文件路径
        video_path = data.get('video_path')
        video_id = data.get('video_id')
        
        if not video_path and not video_id:
            return jsonify({"error": "Either video_path or video_id is required"}), 400
        
        # 如果提供了文件路径，检查文件是否存在
        if video_path:
            if os.path.exists(video_path):
                return jsonify({
                    "status": "completed",
                    "message": "Video file exists",
                    "video_path": video_path
                })
            else:
                return jsonify({
                    "status": "file_missing",
                    "message": "Video file does not exist",
                    "video_path": video_path
                })
        
        # 如果提供了视频ID，模拟检查任务状态
        if video_id:
            # 这里可以添加实际检查KlingAI任务状态的逻辑
            # 目前仅返回模拟数据
            import random
            statuses = ["processing", "completed", "failed"]
            status = random.choice(statuses)
            
            return jsonify({
                "status": status,
                "video_id": video_id,
                "message": f"Video task is {status} (simulated response)"
            })
    
    except Exception as e:
        app.logger.error(f"Error in test video status: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({"error": f"Failed to check video status: {str(e)}"}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 8888))
    app.run(host='0.0.0.0', port=port, debug=True)