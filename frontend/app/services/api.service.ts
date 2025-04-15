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

// Base API URL - Replace with your actual API endpoint
const API_BASE_URL = 'http://localhost:8888/api';

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
export async function generateScript(projectId: string): Promise<GenerateScriptResponse> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/script/generate`, {
    method: 'POST',
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
 * @param imageId The ID of the image to use
 * @returns A promise with the generated script
 */
export async function generateScriptWithImage(projectId: string, imageId: number): Promise<GenerateScriptResponse> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/script/generate?image_id=${imageId}`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Script generation failed: ${response.statusText}`);
  }

  return response.json();
} 