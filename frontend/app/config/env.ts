/**
 * Environment configuration
 * This file centralizes access to environment variables and provides defaults
 */

export const ENV = {
  // Server configuration
  SERVER_IP: process.env.NEXT_PUBLIC_SERVER_IP || process.env.SERVER_IP || '50.19.10.82',
  INTERNAL_SERVER_IP: process.env.NEXT_PUBLIC_INTERNAL_SERVER_IP || process.env.INTERNAL_SERVER_IP || '172.31.28.157',
  SERVER_PORT: process.env.SERVER_PORT || '8888',
  
  // API configuration
  API_BASE_URL: () => {
    // Use the appropriate server IP based on environment
    const serverIP = ENV.SERVER_IP;
    return `http://${serverIP}:${ENV.SERVER_PORT}`;
  },

  // Feature flags
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
};

// Helper function to get API endpoints
export const getApiUrl = (path: string): string => {
  // Make sure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${ENV.API_BASE_URL()}${normalizedPath}`;
};

// Helper function to get image URLs
export const getImageUrl = (imagePath: string): string => {
  // Handle different image path formats
  if (imagePath.startsWith('data:') || imagePath.startsWith('http')) {
    return imagePath;
  }
  
  // Make sure path starts with /
  const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${ENV.API_BASE_URL()}${normalizedPath}`;
};

export default ENV; 