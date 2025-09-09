import { Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

/**
 * Image optimization utility to prevent large bitmap crashes
 */

/**
 * Get optimized dimensions for an image to prevent memory issues
 */
export const getOptimizedDimensions = (
  originalWidth: number,
  originalHeight: number,
  maxWidth: number = screenWidth,
  maxHeight: number = screenHeight * 0.5
) => {
  let { width, height } = { width: originalWidth, height: originalHeight };

  // Calculate aspect ratio
  const aspectRatio = originalWidth / originalHeight;

  // Scale down if too wide
  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  }

  // Scale down if too tall
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  return { width: Math.round(width), height: Math.round(height) };
};

/**
 * Safe image dimensions for different use cases
 */
export const SAFE_IMAGE_DIMENSIONS = {
  // Profile images
  PROFILE: { width: 56, height: 56 },
  
  // Banner ads
  BANNER: { width: 320, height: 50 },
  
  // Interstitial ads
  INTERSTITIAL: { width: 300, height: 400 },
  
  // App icons
  APP_ICON: { width: 33, height: 33 },
  
  // Background images (use cover mode)
  BACKGROUND: { width: screenWidth, height: screenHeight },
  
  // Thumbnail images
  THUMBNAIL: { width: 100, height: 100 },
  
  // Large content images
  CONTENT: { width: screenWidth, height: screenHeight * 0.4 },
} as const;

/**
 * Get safe dimensions for a specific image type
 */
export const getSafeDimensions = (type: keyof typeof SAFE_IMAGE_DIMENSIONS) => {
  return SAFE_IMAGE_DIMENSIONS[type];
};