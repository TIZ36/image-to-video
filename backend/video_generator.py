import os
import requests
import time
import json
import uuid
import hmac
import hashlib
import base64
import tempfile
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class VideoGenerator:
    """Base class for video generation API clients"""
    
    def __init__(self, redis_client=None):
        """Initialize the video generator"""
        self.redis_client = redis_client
    
    def generate_video(self, image_path, script, output_dir=None, image_data=None):
        """
        Generate a sales video from image and script
        
        Args:
            image_path: Path to the product image or image identifier
            script: Marketing script to use for the video
            output_dir: Directory to save the video (if applicable)
            image_data: Base64 encoded image data (if provided directly)
            
        Returns:
            Dict with video generation result
        """
        raise NotImplementedError("Subclasses must implement generate_video method")
        
    def _get_image_from_redis(self, image_path):
        """
        Extract image data from Redis using the image path
        
        Args:
            image_path: Image path in formats:
                - Old format: '/api/images/project_id/filename'
                - New format: '/api/serve_image/project_id/filename'
            
        Returns:
            Base64 decoded image data
        """
        if not self.redis_client:
            raise ValueError("Redis client not configured")
            
        # Extract project_id and filename from path
        # Parse the path - support both old and new formats
        parts = image_path.strip('/').split('/')
        
        if len(parts) < 3:
            raise ValueError(f"Invalid image path format: {image_path}")
        
        # Handle both old format '/api/images/project_id/filename'
        # and new format '/api/serve_image/project_id/filename'
        if parts[0] == 'api' and (parts[1] == 'images' or parts[1] == 'serve_image'):
            project_id = parts[2]
            filename = parts[3] if len(parts) > 3 else None
            
            if not filename:
                raise ValueError(f"Missing filename in image path: {image_path}")
        else:
            raise ValueError(f"Invalid image path format: {image_path}")
        
        # Get image from Redis
        image_key = f"image:{project_id}:{filename}"
        data_url = self.redis_client.get(image_key)
        
        if not data_url:
            raise ValueError(f"Image not found in Redis: {image_key}")
            
        # Handle data URL format if present
        if data_url.startswith('data:'):
            # Extract the MIME type and base64 data
            parts = data_url.split(',', 1)
            if len(parts) < 2:
                raise ValueError(f"Invalid data URL format: {data_url[:20]}...")
            
            base64_data = parts[1]
        else:
            # Assume it's just base64 data
            base64_data = data_url
            
        # Return decoded image data
        try:
            return base64.b64decode(base64_data)
        except Exception as e:
            raise ValueError(f"Failed to decode base64 data: {str(e)}")

class KlingGenerator(VideoGenerator):
    """Kling AI Video Generator Client"""
    
    def __init__(self, redis_client=None):
        """Initialize the Kling video generator"""

        print(f"Initializing KlingGenerator with access key: {os.getenv('KLING_ACCESS_KEY')}")
        super().__init__(redis_client)
        self.access_key = os.getenv('KLING_ACCESS_KEY', '')
        self.secret_key = os.getenv('KLING_SECRET_KEY', '')
        self.endpoint = os.getenv('KLING_API_ENDPOINT', 'https://api.klingai.com')
        self.model = os.getenv('KLING_MODEL', 'kling-v1')
        self.max_duration = os.getenv('KLING_MAX_DURATION', '10')  # Default 5 seconds
        self.mode = os.getenv('KLING_MODE', 'std')  # Default to professional mode
        self.cfg_scale = float(os.getenv('KLING_CFG_SCALE', '0.5'))  # Default cfg scale value
        
        if not self.access_key or not self.secret_key:
            print("Warning: KLING API credentials not set properly")
    
    def _generate_jwt_token(self):
        """
        Generate JWT Token for Kling API authentication
        
        Returns:
            JWT Token string
        """
        # 手动实现JWT令牌生成
        try:
            print(f"Generating JWT token for Kling API with access key: {self.access_key}"
                  f"and secret key: {self.secret_key}")
            # 创建header部分
            header = {
                "alg": "HS256",
                "typ": "JWT"
            }
            
            # 创建payload部分
            payload = {
                "iss": self.access_key,
                "exp": int(time.time()) + 1800,  # Valid for 30 minutes
                "nbf": int(time.time()) - 5  # Valid from 5 seconds ago
            }
            
            # Base64 URL编码header
            header_json = json.dumps(header, separators=(',', ':')).encode('utf-8')
            header_b64 = base64.urlsafe_b64encode(header_json).decode('utf-8').rstrip('=')
            
            # Base64 URL编码payload
            payload_json = json.dumps(payload, separators=(',', ':')).encode('utf-8')
            payload_b64 = base64.urlsafe_b64encode(payload_json).decode('utf-8').rstrip('=')
            
            # 拼接header和payload
            message = f"{header_b64}.{payload_b64}"
            
            # 使用HMAC-SHA256签名
            signature = hmac.new(
                self.secret_key.encode('utf-8'),
                message.encode('utf-8'),
                hashlib.sha256
            ).digest()
            
            # Base64 URL编码签名
            signature_b64 = base64.urlsafe_b64encode(signature).decode('utf-8').rstrip('=')
            
            # 组合成完整的JWT令牌
            token = f"{message}.{signature_b64}"
            return token
        except Exception as e:
            print(f"Error generating JWT token: {str(e)}")
            raise
    
    def _extract_image_from_redis_new_format(self, image_path):
        """
        Extract image data from Redis using the new format image path
        
        Args:
            image_path: Image path in format '/api/images/{project_id}-image-{image_id}'
            
        Returns:
            Base64 encoded string without prefix
        """
        if not self.redis_client:
            raise ValueError("Redis client not configured")
        
        # Handle new format paths like '/api/images/project-image-1'
        parts = image_path.strip('/').split('/')
        if len(parts) >= 3 and parts[0] == 'api' and parts[1] == 'images':
            img_path = parts[2]
            # 检查是否是新格式的图片路径
            if '-image-' in img_path:
                img_parts = img_path.split('-image-')
                if len(img_parts) == 2:
                    project_id = img_parts[0]
                    img_id = img_parts[1]
                    image_key = f"image:{project_id}-image-{img_id}"
                    data_url = self.redis_client.get(image_key)
                    
                    if not data_url:
                        raise ValueError(f"Image not found in Redis: {image_key}")
                    
                    # 处理data URL格式
                    if data_url.startswith('data:'):
                        # Extract the base64 data without the prefix
                        parts = data_url.split(',', 1)
                        if len(parts) < 2:
                            raise ValueError(f"Invalid data URL format: {data_url[:20]}...")
                        
                        return parts[1]  # Return only the base64 part without the prefix
                    else:
                        # Assume it's just base64 data
                        return data_url
        
        raise ValueError(f"Invalid image path format: {image_path}")
    
    def _get_image_as_url_or_base64(self, image_path):
        """
        Process image path to either return a URL or convert to base64
        
        Args:
            image_path: Path to image or API path
            
        Returns:
            URL string or base64 encoded string
        """
        # If already a URL, return as is
        if image_path.startswith('http://') or image_path.startswith('https://'):
            return image_path
            
        # If it's an API path, try to get from Redis
        if image_path.startswith('/api/images/'):
            try:
                # Get base64 data from Redis
                base64_data = self._extract_image_from_redis_new_format(image_path)
                return base64_data
            except Exception as e:
                print(f"Failed to get image from Redis: {str(e)}")
                raise
        
        # If it's a local file path, read and convert to base64
        if os.path.isfile(image_path):
            try:
                with open(image_path, 'rb') as f:
                    file_data = f.read()
                    return base64.b64encode(file_data).decode('utf-8')
            except Exception as e:
                print(f"Failed to read local file: {str(e)}")
                raise
                
        raise ValueError(f"Unsupported image path format: {image_path}")
    
    def generate_video(self, image_path, script, output_dir=None, image_data=None, static_mask=None, dynamic_masks=None):
        """
        Generate a sales video using Kling AI
        
        Args:
            image_path: Path to the product image or image identifier or URL
            script: Marketing script to use for the video
            output_dir: Directory to save the video (if needed)
            image_data: Base64 encoded image data (if provided directly)
            static_mask: Path to static mask image (optional)
            dynamic_masks: List of dynamic mask configurations (optional)
            
        Returns:
            Dict with status and video URL
        """
        try:
            # 生成JWT令牌进行认证
            jwt_token = self._generate_jwt_token()
            
            # 设置请求头部信息
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {jwt_token}"
            }

            print(f"JWT token: {jwt_token}")
            print(f"Prompt: {script}")
            print(f"Image path: {image_path}")
            print(f"Image data: {image_data}")
            # 准备请求数据
            data = {
                "model_name": self.model,
                "mode": self.mode,
                "duration": self.max_duration,
                "prompt": script,
                "cfg_scale": self.cfg_scale
            }
            
            # 处理图片数据
            if image_data:
                # 假设已经是base64编码的字符串
                # 去除data:image/jpeg;base64,前缀
                data["image"] = image_data.split(',', 1)[1]
            else:
                # 通过路径获取图片数据
                data["image"] = self._get_image_as_url_or_base64(image_path)
            
            # 处理可选的静态遮罩
            if static_mask:
                if static_mask.startswith('http://') or static_mask.startswith('https://'):
                    data["static_mask"] = static_mask
                else:
                    # 读取本地文件或Redis中的数据
                    data["static_mask"] = self._get_image_as_url_or_base64(static_mask)
            
            # 处理可选的动态遮罩
            if dynamic_masks and isinstance(dynamic_masks, list):
                data["dynamic_masks"] = []
                for mask_config in dynamic_masks:
                    if not isinstance(mask_config, dict):
                        continue
                        
                    mask_item = {}
                    
                    # 处理遮罩图片
                    if "mask_path" in mask_config:
                        mask_path = mask_config["mask_path"]
                        mask_item["mask"] = self._get_image_as_url_or_base64(mask_path)
                    
                    # 处理轨迹
                    if "trajectories" in mask_config and isinstance(mask_config["trajectories"], list):
                        mask_item["trajectories"] = mask_config["trajectories"]
                    
                    if mask_item:
                        data["dynamic_masks"].append(mask_item)
            

            print(f"Request headers: {headers}")
            print(f"Request data: {data}")

            # 发送请求到Kling API
            url = f"{self.endpoint}/v1/videos/image2video"
            print(f"Sending video generation request to Kling API: {url}")
            print(f"Request data (excluding image content): {json.dumps({k: v for k, v in data.items() if k not in ['static_mask','image']}, indent=2)}")
            response = requests.post(url, headers=headers, json=data)
            
            # 检查响应状态
            if response.status_code != 200:
                print(f"API error: {response.status_code} - {response.text}")
                raise RuntimeError(f"Video generation request failed with status code {response.status_code}")
            
            result = response.json()
            
            # 检查API响应
            if result.get('code') != 0:
                error_message = result.get('message', 'Unknown error')
                raise RuntimeError(f"Video generation request failed: {error_message}")
            
            task_id = result.get('data', {}).get('task_id')
            
            if not task_id:
                raise ValueError("Failed to get video generation task ID")
            
            print(f"Video generation task submitted, ID: {task_id}")
            
            # 等待任务完成
            video_result = self._poll_task_status(task_id)
            
            # 如果需要保存视频到本地，下载它
            if output_dir and video_result.get('url'):
                video_url = video_result['url']
                video_file = os.path.join(output_dir, f"{uuid.uuid4()}.mp4")
                
                # 确保输出目录存在
                os.makedirs(output_dir, exist_ok=True)
                
                # 下载视频
                print(f"Downloading video from {video_url}")
                video_response = requests.get(video_url, stream=True)
                video_response.raise_for_status()
                
                with open(video_file, 'wb') as f:
                    for chunk in video_response.iter_content(chunk_size=8192):
                        f.write(chunk)
                
                # 添加本地文件路径到结果
                video_result['local_path'] = video_file
                # 添加相对路径，供前端使用
                relative_path = video_file.replace(os.path.dirname(output_dir), '')
                if relative_path.startswith('/'):
                    relative_path = relative_path[1:]
                video_result['path'] = f"/api/videos/{os.path.basename(video_file)}"
            
            return video_result
        except Exception as e:
            error_message = str(e)
            print(f"Error generating video with Kling: {error_message}")
            # 返回错误状态
            return {
                "status": "failed",
                "error": error_message
            }
    
    def _poll_task_status(self, task_id):
        """
        Poll for task status until completion
        
        Args:
            task_id: Kling API task ID
            
        Returns:
            Dict with task result info
        """
        max_attempts = 100  # 尝试次数限制
        poll_interval = 5  # 轮询间隔(秒)
        
        # 生成JWT令牌进行认证
        jwt_token = self._generate_jwt_token()
        
        # 设置请求头部信息
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {jwt_token}"
        }
        
        # 查询API端点
        url = f"{self.endpoint}/v1/videos/image2video/{task_id}"
        
        for attempt in range(max_attempts):
            try:
                # 发送查询请求
                response = requests.get(url, headers=headers)
                response.raise_for_status()
                
                result = response.json()
                
                # 检查API响应
                if result.get('code') != 0:
                    error_message = result.get('message', 'Unknown error')
                    print(f"Query task status failed: {error_message}")
                    
                    # 如果是认证过期，重新生成JWT令牌
                    if "token" in error_message.lower() or "auth" in error_message.lower():
                        jwt_token = self._generate_jwt_token()
                        headers["Authorization"] = f"Bearer {jwt_token}"
                    
                    # 继续下一次尝试
                    time.sleep(poll_interval)
                    continue
                
                task_status = result.get('data', {}).get('task_status')
                task_result = result.get('data', {}).get('task_result', {})
                
                print(f"Task status: {task_status}")
                
                if task_status == "failed":
                    # 任务失败
                    error_message = result.get('data', {}).get('task_status_msg', 'Unknown error')
                    print(f"Task failed Reason: {result}")
                    return {
                        "status": "failed",
                        "error": error_message
                    }
                    
                elif task_status == "succeed":
                    # 任务成功
                    videos = task_result.get('videos', [])
                    if not videos:
                        return {
                            "status": "failed",
                            "error": "No video in result"
                        }
                    
                    video_info = videos[0]
                    return {
                        "status": "completed",
                        "url": video_info.get('url'),
                        "duration": video_info.get('duration')
                    }
                    
                # 任务仍在处理中，继续等待
                time.sleep(poll_interval)
                
            except Exception as e:
                print(f"Error polling task status: {str(e)}")
                # 继续尝试
                time.sleep(poll_interval)
        
        # 达到最大尝试次数
        return {
            "status": "failed",
            "error": "Maximum polling attempts reached"
        }

# Mock implementation for testing without API credentials
class MockVideoGenerator(VideoGenerator):
    """Mock video generator for testing without credentials"""
    
    def generate_video(self, image_path, script, output_dir=None, image_data=None):
        """
        Mock video generation
        
        Args:
            image_path: Path to the product image or image identifier
            script: Marketing script to use for the video
            output_dir: Directory to save the video (if needed)
            image_data: Base64 encoded image data (if provided directly)
            
        Returns:
            Dict with mock video details
        """
        print("Using mock video generator")
        # Simulate processing time
        time.sleep(3)
        
        # Create a mock video URL
        mock_video_id = str(uuid.uuid4())
        mock_url = f"/api/videos/{mock_video_id}"
        
        return {
            "status": "completed",
            "url": mock_url,
            "duration": 10,
            "mock": True
        }

def get_video_generator():
    """Factory function to get video generator based on environment"""
    from app import redis_client
    
    use_mock = os.getenv('USE_MOCK_VIDEO_GEN', 'false').lower() == 'true'
    
    if use_mock:
        return MockVideoGenerator(redis_client)
    else:
        return KlingGenerator(redis_client) 