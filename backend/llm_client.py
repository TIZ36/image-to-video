import os
import requests
import base64
from PIL import Image
import io
from dotenv import load_dotenv
import json
from openai import OpenAI

# Load environment variables
load_dotenv()

class LLMClient:
    """Base class for LLM API clients"""
    
    def __init__(self):
        """Initialize the LLM client"""
        self.api_key = os.getenv('LLM_API_KEY', '')
        if not self.api_key:
            print("Warning: LLM_API_KEY environment variable not set")
    
    def generate_script(self, project_id, image_id, project_name, project_description="", system_prompt="", user_prompt=""):
        """
        Generate marketing script based on the image
        
        Args:
            image_path: Path to the product image
            project_name: Name of the project
            project_description: Optional project description
            system_prompt: Optional custom system prompt
            user_prompt: Optional custom user prompt
            
        Returns:
            Generated marketing script text
        """
        raise NotImplementedError("Subclasses must implement generate_script method")

class OpenAIClient(LLMClient):
    """OpenAI API client for GPT-4 Vision"""
    
    def __init__(self, redis_client):
        """Initialize the OpenAI client"""
        super().__init__()
        self.api_key = os.getenv('OPENAI_API_KEY', self.api_key)
        self.model = os.getenv('OPENAI_MODEL', 'gpt-4-vision-preview')
        self.client = OpenAI(api_key=self.api_key)
        self.redis_client = redis_client
        
    def get_base64_image_from_redis(self, project_id, image_id):
        """
        Get base64 encoded image from Redis
        """
        
        image_key = f"image:{project_id}-image-{image_id}"
        data_url = self.redis_client.get(image_key)
        
        if not data_url:
            raise ValueError(f"Image not found in Redis: {image_key}")
        
        # 处理data URL格式
        if data_url.startswith('data:'):
            # 提取base64数据
            parts = data_url.split(',', 1)
            if len(parts) < 2:
                raise ValueError(f"Invalid data URL format: {data_url[:20]}...")
            base64_data = parts[1]
        else:
            # 假设它已经是base64数据
            base64_data = data_url
        
        # 确保图片格式是有效的（尝试解码并再次编码为jpeg）
        try:
            # 解码base64数据
            image_bytes = base64.b64decode(base64_data)
            
            # 使用PIL打开并转换为jpeg
            image = Image.open(io.BytesIO(image_bytes))
            
            # 转换为RGB模式（处理可能的RGBA或其他模式）
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # 将图像保存为jpeg格式的字节流
            output_buffer = io.BytesIO()
            image.save(output_buffer, format='JPEG')
            
            # 获取字节并编码为base64
            jpeg_bytes = output_buffer.getvalue()
            return base64.b64encode(jpeg_bytes).decode('utf-8')
        except Exception as e:
            print(f"Error converting image: {str(e)}")
            # 如果转换失败，返回原始base64数据
            return base64_data
    
    def generate_script(self, project_id, image_id, project_name, project_description="", system_prompt="", user_prompt=""):
        """
        Generate marketing script using GPT-4 Vision
        
        Args:
            image_path: Path to the product image
            project_name: Name of the project
            project_description: Optional project description
            system_prompt: Optional custom system prompt
            user_prompt: Optional custom user prompt
            
        Returns:
            Generated marketing script text
        """
        try:

            print(f"Generating script for project: {project_name}")
            print(f"Image path: {image_id}")
            print(f"System prompt: {system_prompt}")
            print(f"User prompt: {user_prompt}")

            # 编码图片
            base64_image = self.get_base64_image_from_redis(project_id, image_id)
            
            # 构建系统提示词（如果提供）
            if not system_prompt:
                system_prompt = """
                你是一位专业的市场营销文案撰写人员，擅长创建引人注目的产品销售脚本。
                你的任务是根据提供的产品图片创建一个简短、引人入胜的销售脚本。脚本应：
                
                1. 突出关键特点和优势
                2. 使用有说服力和专业的语言
                3. 长度在150-200字之间
                4. 具有明确的结构：引人注目的开头、吸引人的中间部分和有力的行动号召
                5. 关注情感吸引力和价值主张
                
                脚本将用作短视频的配音。请将脚本分为两部分：
                1. 视频描述：简短介绍视频内容
                2. 旁白文本：详细的语音旁白内容
                """
            
            # 构建用户消息（如果提供）
            if not user_prompt:
                user_prompt = f"为名为'{project_name}'的产品创建一个营销脚本"
                if project_description:
                    user_prompt += f"。产品描述：{project_description}"
                user_prompt += "。请根据图片中可见的特点和优势来编写脚本。"
            elif "{product_name}" in user_prompt:
                # 如果用户提示中包含产品名占位符，替换它
                user_prompt = user_prompt.replace("{product_name}", project_name)
                
                # 如果存在产品描述且用户提示中有描述占位符，替换它
                if project_description and "{product_description}" in user_prompt:
                    user_prompt = user_prompt.replace("{product_description}", project_description)
            
            # 打印使用的模型和提示词（调试用）
            print(f"Using model: {self.model}")
            print(f"System prompt: {system_prompt}")
            print(f"User prompt: {user_prompt}")
            
            # 使用新的OpenAI API调用方式
            try:
                # 先尝试使用新的API格式
                messages = [
                    {"role": "system", "content": system_prompt},
                    {
                        "role": "user", 
                        "content": [
                            {"type": "text", "text": user_prompt},
                            # {
                            #     "type": "image_url",
                            #     "image_url": {
                            #         "url": f"data:image/jpeg;base64,{base64_image}"
                            #     }
                            # }
                        ]
                    }
                ]
                
                # 打印请求内容（调试用）
                print(f"Sending request to OpenAI API with model: {self.model}")
                
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    max_tokens=500,
                    temperature=0.7
                )
                
                # 打印响应（调试用）
                print(f"OpenAI API response: {response}")
                
                # 提取生成的脚本
                return response.choices[0].message.content
                
            except Exception as e:
                print(f"Error with new API format: {str(e)}")
                print("Falling back to manual API request...")
                
                # 如果新API格式失败，回退到手动API请求
                headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.api_key}"
                }
                
                payload = {
                    "model": self.model,
                    "messages": [
                        {
                            "role": "system",
                            "content": system_prompt
                        },
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": user_prompt
                                },
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/jpeg;base64,{base64_image}"
                                    }
                                }
                            ]
                        }
                    ],
                    "max_tokens": 500,
                    "temperature": 0.7
                }
                
                # 发送API请求
                response = requests.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers=headers,
                    json=payload
                )
                response.raise_for_status()
                
                # 打印原始响应以进行调试
                print(f"OpenAI API response: {response.json()}")
                
                # 处理响应
                result = response.json()
                
                # 处理API响应格式
                try:
                    if 'choices' in result and len(result['choices']) > 0:
                        if 'message' in result['choices'][0]:
                            return result['choices'][0]['message']['content']
                        elif 'text' in result['choices'][0]:
                            return result['choices'][0]['text']
                    
                    print(f"Unexpected API response structure: {result}")
                    return f"Error parsing API response: {result}"
                except Exception as parse_err:
                    print(f"Error parsing API response: {str(parse_err)}")
                    print(f"Original response: {result}")
                    raise
            
        except Exception as e:
            print(f"Error generating script with OpenAI: {str(e)}")
            raise

class MockLLMClient(LLMClient):
    """Mock LLM client for testing without API access"""
    
    def generate_script(self, project_id, image_id, project_name, project_description="", system_prompt="", user_prompt=""):
        """
        Generate a mock marketing script
        
        Args:
            image_path: Path to the product image (not used)
            project_name: Name of the project
            project_description: Optional project description
            system_prompt: Optional custom system prompt (not used)
            user_prompt: Optional custom user prompt (not used)
            
        Returns:
            A predefined mock script
        """
        print(f"Generating mock script for project: {project_name}")
        
        # 创建一个示例脚本
        mock_script = f"""视频描述:
这是一个简短的{project_name}销售视频，展示产品的主要特点和优势。

旁白文本:
【引言】
介绍{project_name}，一款革命性的产品，专为现代消费者设计。

【主体】
{project_name}拥有令人惊叹的功能和卓越的品质。
{'它的'+project_description if project_description else '它的设计'}让您的生活更加便捷和高效。
无论是家庭使用还是专业场合，{project_name}都能满足您的所有需求。

【结语】
立即购买{project_name}，体验卓越品质带来的便利。
限时优惠，行动要快！
"""
        return mock_script

def get_llm_client(redis_client):
    """
    Factory function to get the appropriate LLM client
    based on environment configuration
    
    Returns:
        LLM client instance
    """
    # 检查是否使用模拟客户端
    use_mock = os.getenv('USE_MOCK_LLM', 'false').lower() == 'true'
    if use_mock:
        print("Using mock LLM client")
        return MockLLMClient()
    
    provider = os.getenv('LLM_PROVIDER', 'openai').lower()
    
    if provider == 'openai':
        return OpenAIClient(redis_client)
    else:
        # Default to OpenAI if provider not recognized
        print(f"Warning: Unrecognized LLM provider '{provider}', using OpenAI")
        return OpenAIClient(redis_client) 