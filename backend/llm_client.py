import os
import requests
import base64
from PIL import Image
import io
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class LLMClient:
    """Base class for LLM API clients"""
    
    def __init__(self):
        """Initialize the LLM client"""
        self.api_key = os.getenv('LLM_API_KEY', '')
        if not self.api_key:
            print("Warning: LLM_API_KEY environment variable not set")
    
    def generate_script(self, image_path, project_name, project_description=""):
        """
        Generate marketing script based on the image
        
        Args:
            image_path: Path to the product image
            project_name: Name of the project
            project_description: Optional project description
            
        Returns:
            Generated marketing script text
        """
        raise NotImplementedError("Subclasses must implement generate_script method")

class OpenAIClient(LLMClient):
    """OpenAI API client for GPT-4 Vision"""
    
    def __init__(self):
        """Initialize the OpenAI client"""
        super().__init__()
        self.api_key = os.getenv('OPENAI_API_KEY', self.api_key)
        self.api_endpoint = os.getenv('OPENAI_API_ENDPOINT', 'https://api.openai.com/v1/chat/completions')
        self.model = os.getenv('OPENAI_MODEL', 'gpt-4-vision-preview')
        
    def _encode_image_to_base64(self, image_path):
        """
        Encode an image to base64
        
        Args:
            image_path: Path to the image file
            
        Returns:
            Base64 encoded image string
        """
        try:
            # Open the image and resize if necessary
            with Image.open(image_path) as img:
                # Max dimensions for the API (smaller reduces tokens)
                max_width = 2000
                max_height = 2000
                
                # Resize if the image is too large
                if img.width > max_width or img.height > max_height:
                    img.thumbnail((max_width, max_height))
                
                # Convert to RGB if needed (e.g., for PNG with transparency)
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # Save to a buffer and encode
                buffer = io.BytesIO()
                img.save(buffer, format="JPEG")
                return base64.b64encode(buffer.getvalue()).decode('utf-8')
                
        except Exception as e:
            print(f"Error encoding image: {str(e)}")
            raise
    
    def generate_script(self, image_path, project_name, project_description=""):
        """
        Generate marketing script using GPT-4 Vision
        
        Args:
            image_path: Path to the product image
            project_name: Name of the project
            project_description: Optional project description
            
        Returns:
            Generated marketing script text
        """
        try:
            # Encode the image
            base64_image = self._encode_image_to_base64(image_path)
            
            # Construct the system prompt
            system_prompt = """
            You are a professional marketing copywriter specializing in creating compelling sales scripts 
            for product videos. Your task is to create a brief, engaging sales script based on the product 
            image provided. The script should:
            
            1. Highlight the key features and benefits
            2. Use persuasive and professional language
            3. Be 150-200 words in length
            4. Have a clear structure with an attention-grabbing opening, compelling middle, and strong call to action
            5. Focus on emotional appeal and value proposition
            
            The script will be used as a voiceover for a short sales video.
            """
            
            # Create the user message with the project context
            user_message = f"Create a marketing script for the product named '{project_name}'"
            if project_description:
                user_message += f". Product description: {project_description}"
            user_message += ". Base your script on the features and benefits visible in the image."
            
            # Prepare the API request
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
                                "text": user_message
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
            
            # Make the API call
            response = requests.post(
                self.api_endpoint,
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            
            # Extract and return the generated script
            result = response.json()
            return result['choices'][0]['message']['content']
            
        except Exception as e:
            print(f"Error generating script with OpenAI: {str(e)}")
            raise

def get_llm_client():
    """
    Factory function to get the appropriate LLM client
    based on environment configuration
    
    Returns:
        LLM client instance
    """
    provider = os.getenv('LLM_PROVIDER', 'openai').lower()
    
    if provider == 'openai':
        return OpenAIClient()
    else:
        # Default to OpenAI if provider not recognized
        print(f"Warning: Unrecognized LLM provider '{provider}', using OpenAI")
        return OpenAIClient() 