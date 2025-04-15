# Image to Sales Video - Backend

This is the Flask backend for the Image to Sales Video project. It provides APIs for creating projects, uploading images, generating marketing scripts using LLM, and creating sales videos.

## Features

1. Project management with Redis storage
2. Image upload and storage
3. LLM-powered marketing script generation
4. AI video generation from images + scripts
5. Mock implementations for testing without API credentials

## Prerequisites

- Python 3.8+
- Redis server
- OpenAI API key (for script generation)
- Kling AI API credentials (for video generation)

## Setup Instructions

1. Clone the repository
2. Install the dependencies:
   ```
   pip install -r ../requirements-backend.txt
   ```
3. Create a `.env` file:
   ```
   cp .env.example .env
   ```
4. Edit the `.env` file with your API credentials and configuration
5. Start the Redis server:
   ```
   # Install Redis if needed
   # On macOS: brew install redis
   # On Ubuntu: sudo apt install redis-server
   
   # Start Redis
   redis-server
   ```
6. Start the Flask application:
   ```
   python app.py
   ```

## API Endpoints

### Projects

- `POST /api/projects` - Create a new project
  - Request body: `{ "name": "Project Name", "description": "Optional description" }`

- `GET /api/projects` - List all projects

- `GET /api/projects/{project_id}` - Get project details

### Images

- `POST /api/projects/{project_id}/image` - Upload an image for a project
  - Request body: Form data with `image` file

- `GET /api/images/{project_id}/{filename}` - Get image file

### Scripts

- `POST /api/projects/{project_id}/script/generate` - Generate marketing script using LLM

- `PUT /api/projects/{project_id}/script` - Update script
  - Request body: `{ "script": "New script content" }`

### Videos

- `POST /api/projects/{project_id}/video/generate` - Generate sales video

- `GET /api/videos/{filename}` - Get video file

## Development

For development or testing without actual API calls:

1. Set `USE_MOCK_VIDEO=true` in the `.env` file
2. For LLM, you can either use the OpenAI API or set up a mock implementation

### Using with Frontend

The frontend expects the API to be available at `/api/*`. You can:

1. Configure your web server (Nginx, Apache) to proxy requests
2. Use a tool like [proxyman](https://proxyman.io/) for local development
3. Modify the API service in the frontend to point to the correct URL

## Deployment

For production deployment, consider:

1. Using a production WSGI server like Gunicorn:
   ```
   gunicorn -w 4 -b 0.0.0.0:5000 app:app
   ```
2. Setting up a production Redis instance
3. Using environment variables for all sensitive credentials
4. Implementing proper error handling and logging
5. Setting up proper storage for images and videos (e.g., S3) 