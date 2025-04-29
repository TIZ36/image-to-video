import os
import requests
import json
import time
import shutil
from dotenv import load_dotenv
import glob
from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs
from elevenlabs import play

# 加载环境变量
load_dotenv()

class TTSClient:
    """Base Text-to-Speech client"""
    
    def __init__(self):
        """Initialize the TTS client"""
        self.api_key = os.getenv('TTS_API_KEY', '')
        if not self.api_key:
            print("Warning: TTS_API_KEY environment variable not set")
        
        # 创建语音输出目录
        self.speech_folder = os.getenv('SPEECH_FOLDER', os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'speeches'))
        if not os.path.exists(self.speech_folder):
            os.makedirs(self.speech_folder)
    
    def generate_speech(self, text, project_id, language="zh-CN"):
        """
        Generate speech from text
        
        Args:
            text: The text to convert to speech
            project_id: The project ID to associate with the speech
            language: The language of the text
            
        Returns:
            Path to the generated speech file
        """
        raise NotImplementedError("Subclasses must implement generate_speech method")
        
    def clean_old_speeches(self, project_id):
        """
        Remove all existing speech files for a project
        
        Args:
            project_id: The project ID
        """
        # 获取项目特定的语音目录
        project_speech_folder = os.path.join(self.speech_folder, project_id)
        
        # 如果目录存在，删除里面的所有内容
        if os.path.exists(project_speech_folder):
            for file in glob.glob(os.path.join(project_speech_folder, "*.mp3")):
                try:
                    os.remove(file)
                    print(f"Removed old speech file: {file}")
                except Exception as e:
                    print(f"Error removing file {file}: {str(e)}")

class ElevenLabsClient(TTSClient):
    """Eleven Labs TTS Client"""
    
    def __init__(self):
        """Initialize the Eleven Labs client"""
        super().__init__()
        self.api_key = os.getenv('ELEVEN_LABS_API_KEY', self.api_key)
        self.api_endpoint = os.getenv('ELEVEN_LABS_API_ENDPOINT', 'https://api.elevenlabs.io/v1/text-to-speech')
        
        # 默认语音ID - 可以从环境变量读取
        self.default_voice_id = os.getenv('ELEVEN_LABS_DEFAULT_VOICE_ID', 'XB0fDUnXU5powFXDhCwa')
        # 移除不必要的自选语音ID变量
        self.voice_id_list = []
        # 默认模型ID - 可以从环境变量读取
        self.default_model_id = os.getenv('ELEVEN_LABS_DEFAULT_MODEL_ID', 'eleven_multilingual_v2')
        self.client = ElevenLabs(
            api_key=os.getenv("ELEVEN_LABS_API_KEY"),
        )
            
    def generate_speech(self, text, project_id, language="zh-CN"):
        """
        Generate speech using Eleven Labs API
        
        Args:
            text: The text to convert to speech
            project_id: The project ID to associate with the speech
            language: The language of the text (used for determining voice)
            
        Returns:
            Path to the generated speech file
        """
        try:
            # 首先清理旧的语音文件
            self.clean_old_speeches(project_id)
            
            # 根据语言选择适当的声音ID
            voice_id = self.default_voice_id
            
            # 创建项目特定的语音目录
            project_speech_folder = os.path.join(self.speech_folder, project_id)
            os.makedirs(project_speech_folder, exist_ok=True)
            
            # 创建输出文件路径
            timestamp = int(time.time())
            output_filename = f"speech_{timestamp}.mp3"
            output_path = os.path.join(project_speech_folder, output_filename)
            
            # 构建API请求URL
            url = f"{self.api_endpoint}/{voice_id}?output_format=mp3_44100_128"
            
            # 构建请求头和数据
            headers = {
                "xi-api-key": self.api_key,
                "Content-Type": "application/json"
            }
            
            data = {
                "text": text,
                "model_id": self.default_model_id
            }
            
            print(f"Generating speech for project {project_id} using Eleven Labs API")
            print(f"Text: {text[:100]}{'...' if len(text) > 100 else ''}")
            
            # 发送请求并保存结果
            response = requests.post(url, headers=headers, json=data)
            
            if response.status_code == 200:
                # 保存音频文件
                with open(output_path, 'wb') as f:
                    f.write(response.content)
                
                print(f"Speech generated successfully: {output_path}")
                
                # 返回相对于speeches目录的路径，用于API响应
                relative_path = f"/speeches/{project_id}/{output_filename}"
                return {
                    "status": "success",
                    "path": relative_path,
                    "full_path": output_path
                }
            else:
                error_msg = f"Error generating speech: {response.status_code} - {response.text}"
                print(error_msg)
                return {
                    "status": "error",
                    "error": error_msg
                }
                
        except Exception as e:
            error_msg = f"Exception generating speech: {str(e)}"
            print(error_msg)
            return {
                "status": "error",
                "error": error_msg
            }

class OpenAITTSClient(TTSClient):
    """OpenAI TTS Client"""
    
    def __init__(self):
        """Initialize the OpenAI TTS client"""
        super().__init__()
        self.api_key = os.getenv('OPENAI_API_KEY', self.api_key)
        self.api_endpoint = "https://api.openai.com/v1/audio/speech"
        self.model = os.getenv('OPENAI_TTS_MODEL', 'gpt-4o-mini-tts')
        self.voice = os.getenv('OPENAI_TTS_VOICE', 'sage')  # alloy, echo, fable, onyx, nova, shimmer
        
        if not self.api_key:
            print("Warning: OPENAI_API_KEY environment variable not set")
    
    def generate_speech(self, text, project_id, language="zh-CN"):
        """
        Generate speech using OpenAI TTS API
        
        Args:
            text: The text to convert to speech
            project_id: The project ID to associate with the speech
            language: The language of the text (not used for OpenAI TTS)
            
        Returns:
            Path to the generated speech file
        """
        try:
            # 首先清理旧的语音文件
            self.clean_old_speeches(project_id)
            
            # 创建项目特定的语音目录
            project_speech_folder = os.path.join(self.speech_folder, project_id)
            os.makedirs(project_speech_folder, exist_ok=True)
            
            # 创建输出文件路径
            timestamp = int(time.time())
            output_filename = f"speech_{timestamp}.mp3"
            output_path = os.path.join(project_speech_folder, output_filename)
            
            # 构建请求头和数据
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            data = {
                "model": self.model,
                "input": text,
                "voice": self.voice
            }
            
            print(f"Generating speech for project {project_id} using OpenAI TTS API")
            print(f"Text: {text[:100]}{'...' if len(text) > 100 else ''}")
            
            # 发送请求并保存结果
            response = requests.post(self.api_endpoint, headers=headers, json=data)
            response.raise_for_status()
            
            # 保存音频文件
            with open(output_path, 'wb') as f:
                f.write(response.content)
            
            # 返回相对路径（用于API响应）
            relative_path = f"/speeches/{project_id}/{output_filename}"
            
            return {
                "status": "success",
                "path": relative_path,
                "duration": None  # OpenAI API doesn't provide duration info
            }
            
        except Exception as e:
            print(f"Error generating speech with OpenAI TTS: {str(e)}")
            return {
                "status": "error",
                "error": str(e)
            }

def get_tts_client():
    """
    Factory function to get the appropriate TTS client
    based on environment configuration
    
    Returns:
        TTS client instance
    """
    # 获取TTS提供商配置
    provider = os.getenv('TTS_PROVIDER', 'elevenlabs').lower()
    
    if provider == 'openai':
        print("Using OpenAI TTS client")
        return OpenAITTSClient()
    elif provider == 'elevenlabs':
        print("Using Eleven Labs TTS client")
        return ElevenLabsClient()
    else:
        # Default to Eleven Labs if provider not recognized
        print(f"Warning: Unrecognized TTS provider '{provider}', using Eleven Labs")
        return ElevenLabsClient() 