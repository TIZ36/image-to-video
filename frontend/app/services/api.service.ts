/**
 * API Service for image-to-sales-video application
 * This file contains all the API calls to the backend
 */

// Project interfaces
export interface Project {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  image_path: string | null;
  script: string | null;
  video: VideoStatus | null;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface CreateProjectResponse {
  success: boolean;
  project: Project;
}

export interface ListProjectsResponse {
  success: boolean;
  projects: Project[];
}

export interface DeleteProjectResponse {
  success: boolean;
  message: string;
}

// Image upload interfaces
export interface UploadResponse {
  success: boolean;
  message: string;
  image_path: string;
}

export interface ProjectImage {
  id: number;
  path: string;
}

export interface GetProjectImagesResponse {
  success: boolean;
  images: ProjectImage[];
}

// Script interfaces
export interface GenerateScriptResponse {
  success: boolean;
  script: string;
}

export interface UpdateScriptRequest {
  script: string;
}

export interface UpdateScriptResponse {
  success: boolean;
  message: string;
  script: string;
}

// Video interfaces
export interface GenerateVideoResponse {
  success: boolean;
  video: VideoStatus;
}

export interface VideoStatus {
  status: 'processing' | 'completed' | 'failed';
  url?: string;
  duration?: number;
  error?: string;
}

// Add new interface for script generation request with prompts
export interface GenerateScriptRequest {
  systemPrompt?: string;
  userPrompt?: string;
}

// Add new interfaces for prompt templates with editable fields
export interface PromptTemplate {
  id: string;
  name: string;
  systemPrompt: string;
  userPrompt: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaveTemplateRequest {
  name: string;
  systemPrompt: string;
  userPrompt: string;
}

export interface UpdateTemplateRequest {
  name?: string;
  systemPrompt?: string;
  userPrompt?: string;
}

export interface TemplateResponse {
  success: boolean;
  template: PromptTemplate;
}

export interface TemplatesListResponse {
  success: boolean;
  templates: PromptTemplate[];
}

// Define API base URL
const API_BASE_URL = 'http://50.19.10.82:8888/api';

/**
 * Create a new project
 * @param data Project data
 * @returns A promise with the create project response
 */
export async function createProject(data: CreateProjectRequest): Promise<CreateProjectResponse> {
  const response = await fetch(`${API_BASE_URL}/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Project creation failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get a list of all projects
 * @returns A promise with the list projects response
 */
export async function listProjects(): Promise<ListProjectsResponse> {
  const response = await fetch(`${API_BASE_URL}/projects`);

  if (!response.ok) {
    throw new Error(`Failed to fetch projects: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get a project by ID
 * @param projectId The ID of the project to get
 * @returns A promise with the project details
 */
export async function getProject(projectId: string): Promise<{success: boolean; project: Project}> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch project: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Upload an image to the server for a specific project
 * @param projectId The ID of the project
 * @param file The image file to upload
 * @returns A promise with the upload response
 */
export async function uploadImage(projectId: string, file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/image`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Generate a marketing script for a project using LLM
 * @param projectId The ID of the project
 * @returns A promise with the generated script
 */
export async function generateScript(projectId: string, promptData?: GenerateScriptRequest): Promise<GenerateScriptResponse> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/script/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: promptData ? JSON.stringify(promptData) : undefined,
  });

  if (!response.ok) {
    throw new Error(`Script generation failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Update the marketing script for a project
 * @param projectId The ID of the project
 * @param data The updated script
 * @returns A promise with the update script response
 */
export async function updateScript(projectId: string, data: UpdateScriptRequest): Promise<UpdateScriptResponse> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/script`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Script update failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Generate a video from an uploaded image with a script
 * @param projectId The ID of the project
 * @returns A promise with the generate video response
 */
export async function generateVideo(projectId: string): Promise<GenerateVideoResponse> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/video/generate`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Video generation failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get the full image URL for a project's image
 * @param imagePath The image path from the project
 * @returns The full URL to the image
 */
export function getImageUrl(imagePath: string): string {
  // Extract project ID and filename from path
  const pathParts = imagePath.split('/');
  const projectId = pathParts[pathParts.length - 2];
  const filename = pathParts[pathParts.length - 1];
  
  return `${API_BASE_URL}/images/${projectId}/${filename}`;
}

/**
 * Get the full video URL
 * @param videoUrl The video URL from the video status
 * @returns The full URL to the video
 */
export function getVideoUrl(videoUrl: string): string {
  // If it's already a full URL (starts with http), return as is
  if (videoUrl.startsWith('http')) {
    return videoUrl;
  }
  
  // Otherwise, it's a relative path, so prefix with API_BASE_URL
  return `${API_BASE_URL}${videoUrl.startsWith('/') ? '' : '/'}${videoUrl}`;
}

/**
 * Delete a project
 * @param projectId The ID of the project to delete
 * @returns A promise with the delete project response
 */
export async function deleteProject(projectId: string): Promise<DeleteProjectResponse> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Project deletion failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get all images for a project
 * @param projectId The ID of the project
 * @returns A promise with all project images
 */
export async function getProjectImages(projectId: string): Promise<GetProjectImagesResponse> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/images`);

  if (!response.ok) {
    throw new Error(`Failed to fetch project images: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Generate a marketing script for a project using LLM with a specific image
 * @param projectId The ID of the project
 * @param imageId The ID of the image to use, or array of image IDs
 * @returns A promise with the generated script
 */
export async function generateScriptWithImage(
  projectId: string, 
  imageId: number | number[], 
  promptData?: GenerateScriptRequest
): Promise<GenerateScriptResponse> {
  // 处理单个图片ID或图片ID数组
  const imageParam = Array.isArray(imageId) 
    ? imageId.map(id => `image_id=${id}`).join('&') 
    : `image_id=${imageId}`;
  
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/script/generate?${imageParam}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: promptData ? JSON.stringify(promptData) : undefined,
  });

  if (!response.ok) {
    throw new Error(`Script generation failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get all prompt templates
 * @returns A promise with all templates
 */
export async function getPromptTemplates(): Promise<TemplatesListResponse> {
  const response = await fetch(`${API_BASE_URL}/templates`);

  if (!response.ok) {
    throw new Error(`Failed to fetch templates: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Save a new prompt template
 * @param data Template data
 * @returns A promise with the created template
 */
export async function savePromptTemplate(data: SaveTemplateRequest): Promise<TemplateResponse> {
  const response = await fetch(`${API_BASE_URL}/templates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Template creation failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Update an existing prompt template
 * @param templateId The ID of the template
 * @param data The updated template data
 * @returns A promise with the updated template
 */
export async function updatePromptTemplate(templateId: string, data: UpdateTemplateRequest): Promise<TemplateResponse> {
  const response = await fetch(`${API_BASE_URL}/templates/${templateId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Template update failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Delete a prompt template
 * @param templateId The ID of the template to delete
 * @returns A promise with the delete response
 */
export async function deletePromptTemplate(templateId: string): Promise<{success: boolean; message: string}> {
  const response = await fetch(`${API_BASE_URL}/templates/${templateId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Template deletion failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Generate speech for a project
 * @param projectId The ID of the project
 * @param text Optional text to use for speech generation
 * @param language Optional language code
 * @returns A promise with the speech generation response
 */
export async function generateSpeech(
  projectId: string, 
  text?: string,
  language: string = 'zh-CN'
): Promise<{success: boolean; speech: {path: string, language: string}}> {
  const url = `${API_BASE_URL}/projects/${projectId}/speech/generate${language ? `?language=${language}` : ''}`;
  
  // 处理文本，确保不包含"旁白文本:"前缀
  let processedText = text;
  if (processedText) {
    if (processedText.startsWith('旁白文本:')) {
      processedText = processedText.replace('旁白文本:', '').trim();
    } else if (processedText.startsWith('旁白文本：')) {
      processedText = processedText.replace('旁白文本：', '').trim();
    }
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: processedText ? JSON.stringify({ text: processedText }) : undefined,
  });

  if (!response.ok) {
    throw new Error(`Speech generation failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get all speeches for a project
 * @param projectId The ID of the project
 * @returns A promise with the list of speeches
 */
export async function getProjectSpeeches(projectId: string): Promise<{success: boolean; speeches: Array<{path: string, created_at: string, language: string}>}> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/speech`);

  if (!response.ok) {
    throw new Error(`Failed to fetch project speeches: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Delete all speeches for a project
 * @param projectId The ID of the project
 * @returns A promise with the delete response
 */
export async function deleteProjectSpeeches(projectId: string): Promise<{success: boolean; message: string}> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/speech`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete project speeches: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get the full speech URL
 * @param speechPath The speech path from the project
 * @returns The full URL to the speech file
 */
export function getSpeechUrl(speechPath: string): string {
  // If it's already a full URL (starts with http), return as is
  if (speechPath.startsWith('http')) {
    return speechPath;
  }
  
  // Otherwise, it's a relative path, so prefix with API_BASE_URL
  return `${API_BASE_URL}${speechPath.startsWith('/') ? '' : '/'}${speechPath}`;
}

/**
 * Delete a specific image from a project
 * @param projectId The ID of the project
 * @param imageId The ID of the image to delete
 * @returns A promise with the delete response
 */
export async function deleteProjectImage(projectId: string, imageId: number): Promise<{success: boolean; message: string; images: ProjectImage[]}> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/images/${imageId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete image: ${response.statusText}`);
  }

  return response.json();
} 