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

# Import the modules we created
from llm_client import get_llm_client
from video_generator import get_video_generator

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})

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

# Allowed file extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

# Initialize LLM and video generator clients
llm_client = None
video_generator = None

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
    global llm_client
    if llm_client is None:
        llm_client = get_llm_client()
    
    project = get_project(project_id)
    
    if not project:
        return jsonify({"error": "Project not found"}), 404
    
    # 获取要使用的图片路径
    image_path = None
    
    # 检查是否指定了特定图片
    image_id = request.args.get('image_id')
    if image_id:
        try:
            image_id = int(image_id)
            image_path = f"/api/images/{project_id}-image-{image_id}"
        except ValueError:
            return jsonify({"error": "Invalid image ID"}), 400
    elif 'images' in project and project['images']:
        # 使用第一张图片
        image_path = project['images'][0]['path']
    elif project['image_path']:
        # 兼容旧版本
        image_path = project['image_path']
    else:
        return jsonify({"error": "No image has been uploaded for this project"}), 400
    
    try:
        # 获取图片数据
        image_data = None
        
        # 处理新格式的图片路径
        if '-image-' in image_path:
            parts = image_path.strip('/').split('/')
            if len(parts) >= 3 and parts[0] == 'api' and parts[1] == 'images':
                img_path = parts[2]
                img_parts = img_path.split('-image-')
                if len(img_parts) == 2:
                    img_project_id = img_parts[0]
                    img_id = img_parts[1]
                    image_key = f"image:{img_project_id}-image-{img_id}"
                    data_url = redis_client.get(image_key)
                    
                    if not data_url:
                        return jsonify({"error": "Image not found in database"}), 404
                    
                    # 处理data URL格式
                    if data_url.startswith('data:'):
                        parts = data_url.split(',', 1)
                        if len(parts) < 2:
                            return jsonify({"error": "Invalid image format"}), 500
                        base64_data = parts[1]
                    else:
                        base64_data = data_url
                    
                    # 创建临时文件
                    import tempfile
                    
                    with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
                        try:
                            temp_file.write(base64.b64decode(base64_data))
                        except Exception as e:
                            return jsonify({"error": f"Failed to decode image: {str(e)}"}), 500
                        temp_image_path = temp_file.name
                    
                    try:
                        # 调用LLM生成脚本
                        script = llm_client.generate_script(
                            temp_image_path,
                            project['name'],
                            project.get('description', '')
                        )
                    finally:
                        # 清理临时文件
                        import os
                        if os.path.exists(temp_image_path):
                            os.unlink(temp_image_path)
                else:
                    return jsonify({"error": "Invalid image path format"}), 400
            else:
                return jsonify({"error": "Invalid image path format"}), 400
        
        # 处理旧格式的图片路径
        elif image_path.startswith('/api/'):
            parts = image_path.strip('/').split('/')
            if len(parts) >= 4 and parts[0] == 'api' and parts[1] == 'images':
                img_project_id = parts[2]
                filename = parts[3]
                image_key = f"image:{img_project_id}:{filename}"
                data_url = redis_client.get(image_key)
                
                if not data_url:
                    return jsonify({"error": "Image not found in database"}), 404
                
                # 处理data URL格式
                if data_url.startswith('data:'):
                    parts = data_url.split(',', 1)
                    if len(parts) < 2:
                        return jsonify({"error": "Invalid image format"}), 500
                    base64_data = parts[1]
                else:
                    base64_data = data_url
                
                # 创建临时文件
                import tempfile
                
                with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
                    try:
                        temp_file.write(base64.b64decode(base64_data))
                    except Exception as e:
                        return jsonify({"error": f"Failed to decode image: {str(e)}"}), 500
                    temp_image_path = temp_file.name
                
                try:
                    # 调用LLM生成脚本
                    script = llm_client.generate_script(
                        temp_image_path,
                        project['name'],
                        project.get('description', '')
                    )
                finally:
                    # 清理临时文件
                    import os
                    if os.path.exists(temp_image_path):
                        os.unlink(temp_image_path)
            else:
                return jsonify({"error": "Invalid image path format"}), 400
        else:
            # 使用本地文件路径(兼容旧版本)
            script = llm_client.generate_script(
                image_path,
                project['name'],
                project.get('description', '')
            )
        
        # 更新项目的脚本
        project['script'] = script
        project['updated_at'] = datetime.now().isoformat()
        save_project(project)
        
        return jsonify({
            "success": True,
            "script": script
        })
    except Exception as e:
        return jsonify({"error": f"Failed to generate script: {str(e)}"}), 500

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
    
    if not project['image_path']:
        return jsonify({"error": "No image has been uploaded for this project"}), 400
    
    if not project['script']:
        return jsonify({"error": "No script has been created for this project"}), 400
    
    try:
        # Get project-specific video folder
        project_video_folder = os.path.join(VIDEO_FOLDER, project_id)
        os.makedirs(project_video_folder, exist_ok=True)
        
        # Call video generator to create video
        # The updated video_generator will handle Redis image retrieval
        video_result = video_generator.generate_video(
            project['image_path'], 
            project['script'],
            output_dir=project_video_folder
        )
        
        # Update project with video info
        project['video'] = video_result
        project['updated_at'] = datetime.now().isoformat()
        save_project(project)
        
        return jsonify({
            "success": True,
            "video": video_result
        })
    except Exception as e:
        return jsonify({"error": f"Failed to generate video: {str(e)}"}), 500

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

if __name__ == '__main__':
    port = int(os.getenv('PORT', 8888))
    app.run(host='0.0.0.0', port=port, debug=True) 