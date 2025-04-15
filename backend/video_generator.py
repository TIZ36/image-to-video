import os
import requests
import time
import json
import uuid
import jwt
import tempfile
import base64
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
        super().__init__(redis_client)
        self.access_key = os.getenv('KLING_ACCESS_KEY', '')
        self.secret_key = os.getenv('KLING_SECRET_KEY', '')
        self.endpoint = os.getenv('KLING_API_ENDPOINT', 'https://api.klingai.com')
        self.model = os.getenv('KLING_MODEL', 'kling-v1')
        self.max_duration = int(os.getenv('KLING_MAX_DURATION', '5'))  # Default 5 seconds
        
        if not self.access_key or not self.secret_key:
            print("Warning: KLING API credentials not set properly")
    
    def _generate_jwt_token(self):
        """
        Generate JWT Token for Kling API authentication
        
        Returns:
            JWT Token string
        """
        headers = {
            "alg": "HS256",
            "typ": "JWT"
        }
        
        payload = {
            "iss": self.access_key,
            "exp": int(time.time()) + 1800,  # Valid for 30 minutes
            "nbf": int(time.time()) - 5  # Valid from 5 seconds ago
        }
        
        try:
            token = jwt.encode(payload, self.secret_key, headers=headers)
            return token
        except Exception as e:
            print(f"Error generating JWT token: {str(e)}")
            raise
    
    def generate_video(self, image_path, script, output_dir=None, image_data=None):
        """
        Generate a sales video using Kling AI
        
        Args:
            image_path: Path to the product image or image identifier
            script: Marketing script to use for the video
            output_dir: Directory to save the video (if needed)
            image_data: Base64 encoded image data (if provided directly)
            
        Returns:
            Dict with status and video URL
        """
        try:
            # Generate JWT token for authentication
            jwt_token = self._generate_jwt_token()
            
            # Set request headers
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {jwt_token}"
            }
            
            # Get image data if not provided directly
            if not image_data and image_path.startswith('/api/images/'):
                image_data = self._get_image_from_redis(image_path)
                
            # Save image to temp file for API access
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
                if image_data:
                    temp_file.write(image_data)
                else:
                    # Fallback to reading local file if needed
                    with open(image_path, 'rb') as f:
                        temp_file.write(f.read())
                temp_image_path = temp_file.name
            
            try:
                # Prepare request data
                data = {
                    "model_name": self.model,
                    "prompt": script,
                    "negative_prompt": "",
                    "cfg_scale": 0.5,
                    "mode": "std",
                    "aspect_ratio": "16:9",
                    "duration": str(self.max_duration)
                }
                
                # Prepare multipart form data
                files = {
                    'image': (os.path.basename(temp_image_path), open(temp_image_path, 'rb'), 'image/jpeg')
                }
                
                # Send request to Kling API
                url = f"{self.endpoint}/v1/videos/text2video"
                print(f"Sending video generation request to Kling API: {url}")
                
                # For Kling API, we use JSON, not form data
                response = requests.post(url, headers=headers, json=data)
                response.raise_for_status()
                
                result = response.json()
                
                # Check API response
                if result.get('code') != 0:
                    error_message = result.get('message', 'Unknown error')
                    raise RuntimeError(f"Video generation request failed: {error_message}")
                
                task_id = result.get('data', {}).get('task_id')
                
                if not task_id:
                    raise ValueError("Failed to get video generation task ID")
                
                print(f"Video generation task submitted, ID: {task_id}")
                
                # Poll for task status
                video_result = self._poll_task_status(task_id)
                
                # If we need to save the video locally, download it
                if output_dir and video_result.get('url'):
                    video_url = video_result['url']
                    video_file = os.path.join(output_dir, f"{uuid.uuid4()}.mp4")
                    
                    # Ensure output directory exists
                    os.makedirs(output_dir, exist_ok=True)
                    
                    # Download video
                    print(f"Downloading video from {video_url}")
                    video_response = requests.get(video_url, stream=True)
                    video_response.raise_for_status()
                    
                    with open(video_file, 'wb') as f:
                        for chunk in video_response.iter_content(chunk_size=8192):
                            f.write(chunk)
                    
                    # Add local file path to result
                    video_result['local_path'] = video_file
                
                return video_result
            finally:
                # Clean up temp file
                if os.path.exists(temp_image_path):
                    os.unlink(temp_image_path)
                
        except Exception as e:
            print(f"Error generating video with Kling: {str(e)}")
            # Return error status
            return {
                "status": "failed",
                "error": str(e)
            }
    
    def _poll_task_status(self, task_id):
        """
        Poll for task status until completion
        
        Args:
            task_id: Task ID from the initial request
            
        Returns:
            Dict with video URL and status
        """
        # Path for status check
        status_path = f"/v1/videos/text2video/{task_id}"
        max_attempts = 30  # Maximum polling attempts
        attempt = 0
        
        while attempt < max_attempts:
            try:
                # Generate fresh JWT token for each check
                jwt_token = self._generate_jwt_token()
                
                # Update headers
                headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {jwt_token}"
                }
                
                # Query task status
                status_url = f"{self.endpoint}{status_path}"
                status_response = requests.get(status_url, headers=headers)
                status_response.raise_for_status()
                
                status_data = status_response.json()
                
                # Check response
                if status_data.get('code') != 0:
                    error_message = status_data.get('message', 'Unknown error')
                    raise RuntimeError(f"Task status check failed: {error_message}")
                
                task_info = status_data.get('data', {})
                status = task_info.get('task_status')
                
                print(f"Video generation in progress, status: {status}")
                
                if status == 'succeed':
                    # Task successful, get video URL
                    task_result = task_info.get('task_result', {})
                    videos = task_result.get('videos', [])
                    
                    if videos and len(videos) > 0:
                        video_url = videos[0].get('url')
                        video_duration = videos[0].get('duration')
                        print(f"Video generation successful, duration: {video_duration}s, URL: {video_url}")
                        return {
                            "status": "completed",
                            "url": video_url,
                            "duration": video_duration
                        }
                    else:
                        raise ValueError("Task successful but no video URL found")
                elif status == 'failed':
                    # Task failed
                    error_message = task_info.get('task_status_msg', 'Unknown error')
                    raise RuntimeError(f"Video generation failed: {error_message}")
                elif status in ['submitted', 'processing']:
                    # Task still processing, wait and check again
                    time.sleep(10)  # Wait 10 seconds before checking again
                    attempt += 1
                else:
                    # Unknown status
                    raise RuntimeError(f"Unknown task status: {status}")
                
            except Exception as e:
                print(f"Error checking task status: {str(e)}")
                # Wait and retry
                time.sleep(10)
                attempt += 1
        
        # If we reach here, exceeded max attempts
        return {
            "status": "failed",
            "error": "Timeout checking video generation status"
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
            "duration": 15,
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