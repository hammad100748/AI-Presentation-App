import { API } from './endpoints';
import { isApiKeyConfigured, getApiKey } from './config';

// SlidesGPT API base URL for reference
const SLIDESGPT_API_BASE = 'https://api.slidesgpt.com/v1';

// Types for SlidesGPT API
export interface SlidesGPTGenerateRequest {
  prompt: string;
  // Add any other optional parameters that SlidesGPT supports
  // such as theme, language, etc.
}

export interface SlidesGPTGenerateResponse {
  id: string;
  embed: string;
  download: string;
}

export interface SlidesGPTStatusResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  error?: string;
  // Add slide count when available
  slideCount?: number;
  title?: string;
  description?: string;
}

// Extended response for completed presentations
export interface SlidesGPTCompletedResponse extends SlidesGPTStatusResponse {
  status: 'completed';
  slideCount: number;
  title: string;
  description?: string;
  fileSize?: number;
  createdAt?: string;
}

/**
 * Generate a presentation using SlidesGPT API
 * @param data The presentation generation request data
 * @returns Promise with the generation response
 */
export const generatePresentation = async (data: SlidesGPTGenerateRequest): Promise<SlidesGPTGenerateResponse> => {
  try {
    // Check if API key is configured
    if (!isApiKeyConfigured()) {
      console.log('🧪 MOCK MODE: Generating mock presentation response');
      console.log('📝 Mock data:', data);
      
      // Return mock response for testing
      return new Promise((resolve) => {
        setTimeout(() => {
          const mockResponse = {
            id: 'mock-presentation-' + Date.now(),
            embed: 'https://api.slidesgpt.com/mock/embed',
            download: 'https://api.slidesgpt.com/mock/download'
          };
          console.log('✅ Mock response generated:', mockResponse);
          resolve(mockResponse);
        }, 2000); // Simulate API delay
      });
    }
    
    console.log('🚀 Calling SlidesGPT API with data:', data);
    
    const response = await fetch(API.presentationGenerate, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getApiKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ SlidesGPT API error:', response.status, errorText);
      throw new Error(`SlidesGPT API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ SlidesGPT API response:', result);
    
    return result;
  } catch (error) {
    console.error('❌ Error calling SlidesGPT API:', error);
    throw error;
  }
};

/**
 * Check the status of a presentation generation
 * @param presentationId The ID of the presentation to check
 * @returns Promise with the status response
 */
export const checkPresentationStatus = async (presentationId: string, topic?: string): Promise<SlidesGPTStatusResponse> => {
  try {
    // Check if API key is configured
    if (!isApiKeyConfigured()) {
      console.log('🧪 MOCK MODE: Checking mock presentation status');
      console.log('🆔 Mock presentation ID:', presentationId);
      
      // Return mock status for testing
      return new Promise((resolve) => {
        setTimeout(() => {
          const mockStatus = {
            id: presentationId,
            status: 'completed' as const,
            progress: 100,
            slideCount: 5, // Mock slide count
            title: 'Mock Presentation',
            description: 'This is a mock presentation for testing'
          };
          console.log('✅ Mock status response:', mockStatus);
          resolve(mockStatus);
        }, 1000); // Simulate API delay
      });
    }
    
    console.log('🔍 Checking presentation status for ID:', presentationId);
    
    // Construct the correct status URL
    // Format: https://api.slidesgpt.com/v1/presentations/{id}
    const statusUrl = `${API.presentationStatus}/${presentationId}`;
    console.log('🔗 Status URL being called:', statusUrl);
    console.log('🔑 Using API key:', getApiKey().substring(0, 10) + '...');
    
    const response = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getApiKey()}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ SlidesGPT status API error:', response.status, errorText);
      throw new Error(`SlidesGPT status API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ SlidesGPT status response:', result);
    
    // SlidesGPT API returns presentation data directly when ready
    // Check if the presentation is completed by looking for embed/download URLs
    console.log('🔍 Analyzing SlidesGPT response for completion status...');
    console.log('🔍 Has embed URL:', !!result.embed);
    console.log('🔍 Has download URL:', !!result.download);
    console.log('🔍 Response keys:', Object.keys(result));
    
    if (result.embed && result.download) {
      // Presentation is ready! Add completion status
      result.status = 'completed';
      result.progress = 100;
      
      // Try to extract slide count from the response
      // SlidesGPT might return this in different fields
      if (!result.slideCount) {
        result.slideCount = result.slides?.length || 
                           result.numberOfSlides || 
                           result.slide_count || 
                           result.totalSlides ||
                           result.slidesCount ||
                           5; // Default fallback
      }
      
      // Try to get title from different possible fields
      if (!result.title) {
        result.title = result.name || 
                      result.presentationTitle ||
                      topic || 'Presentation';
      }
      
      console.log('🎉 Presentation is READY!');
      console.log('🔧 Extracted slide count:', result.slideCount);
      console.log('🔧 Extracted title:', result.title);
      console.log('🔗 Embed URL:', result.embed);
      console.log('📥 Download URL:', result.download);
    } else if (result.error) {
      // API returned an error
      console.log('❌ SlidesGPT API error:', result.error);
      result.status = 'failed';
      result.progress = 0;
    } else {
      // Presentation is still processing
      result.status = 'processing';
      result.progress = 50; // Estimate progress
      console.log('⏳ Presentation is still processing...');
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error checking presentation status:', error);
    throw error;
  }
};

/**
 * Download a completed presentation using the SlidesGPT API
 * @param presentationId The ID of the presentation to download
 * @returns Promise with the presentation file response
 */
export const downloadPresentation = async (presentationId: string): Promise<Response> => {
  try {
    // Check if API key is configured
    if (!isApiKeyConfigured()) {
      console.log('🧪 MOCK MODE: Downloading mock presentation');
      console.log('🆔 Mock presentation ID:', presentationId);
      
      // Return mock response for testing
      return new Promise((resolve) => {
        setTimeout(() => {
          // Create a mock response with a simple text file for testing
          // This avoids complex PPTX structure issues during development
          const mockContent = new Uint8Array([
            // Simple text content that can be opened by most apps
            0x50, 0x72, 0x65, 0x73, 0x65, 0x6E, 0x74, 0x61, 0x74, 0x69, 0x6F, 0x6E, 0x20, 0x46, 0x69, 0x6C, 0x65, 0x0A, 0x0A,
            0x54, 0x68, 0x69, 0x73, 0x20, 0x69, 0x73, 0x20, 0x61, 0x20, 0x6D, 0x6F, 0x63, 0x6B, 0x20, 0x70, 0x72, 0x65, 0x73, 0x65, 0x6E, 0x74, 0x61, 0x74, 0x69, 0x6F, 0x6E, 0x20, 0x66, 0x69, 0x6C, 0x65, 0x20, 0x66, 0x6F, 0x72, 0x20, 0x74, 0x65, 0x73, 0x74, 0x69, 0x6E, 0x67, 0x2E, 0x0A, 0x0A,
            0x49, 0x6E, 0x20, 0x70, 0x72, 0x6F, 0x64, 0x75, 0x63, 0x74, 0x69, 0x6F, 0x6E, 0x2C, 0x20, 0x74, 0x68, 0x69, 0x73, 0x20, 0x77, 0x69, 0x6C, 0x6C, 0x20, 0x62, 0x65, 0x20, 0x61, 0x20, 0x72, 0x65, 0x61, 0x6C, 0x20, 0x50, 0x50, 0x54, 0x58, 0x20, 0x66, 0x69, 0x6C, 0x65, 0x2E
          ]);
          
          const mockResponse = new Response(mockContent, {
            status: 200,
            statusText: 'OK',
            headers: {
              'Content-Type': 'text/plain', // Use text/plain for testing
              'Content-Length': mockContent.length.toString()
            }
          });
          console.log('✅ Mock download response generated');
          console.log(`📊 Mock file size: ${mockContent.length} bytes`);
          console.log('📄 Mock file contains readable text content for testing');
          console.log('🔧 Mock file will be saved with .txt extension in mock mode');
          resolve(mockResponse);
        }, 1000); // Simulate API delay
      });
    }
    
    console.log('📥 Downloading presentation from SlidesGPT API');
    console.log('🆔 Presentation ID:', presentationId);
    
    // Construct the download URL using the presentation ID
    // Format: https://api.slidesgpt.com/v1/presentations/{id}/download
    const downloadUrl = `${SLIDESGPT_API_BASE}/presentations/${presentationId}/download`;
    console.log('🔗 Download URL:', downloadUrl);
    console.log('🔑 API Key (first 10 chars):', getApiKey().substring(0, 10) + '...');
    console.log('📋 Request Headers:', {
      'Authorization': `Bearer ${getApiKey().substring(0, 10)}...`,
      'Accept': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'User-Agent': 'SlidesAI-Presentation-App/1.0'
    });
    
    const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
        'Authorization': `Bearer ${getApiKey()}`,
        'Accept': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'User-Agent': 'SlidesAI-Presentation-App/1.0',
      },
    });

      if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ SlidesGPT download error:', response.status, errorText);
      throw new Error(`SlidesGPT download error: ${response.status} - ${errorText}`);
    }

    console.log('✅ Presentation download successful');
    console.log('📊 Response size:', response.headers.get('Content-Length') || 'Unknown');
    console.log('📄 Content type:', response.headers.get('Content-Type') || 'Unknown');
    
    return response;
  } catch (error) {
    console.error('❌ Error downloading presentation:', error);
    throw error;
  }
};

/**
 * Get the embed URL for a presentation
 * @param presentationId The ID of the presentation to embed
 * @returns The embed URL that requires authentication
 * 
 * ⚠️ Note: This URL requires authentication headers and cannot be opened directly in a browser.
 * Use it for server-side requests or refer users to the SlidesGPT dashboard.
 */
export const getPresentationEmbedUrl = (presentationId: string): string => {
  return `${SLIDESGPT_API_BASE}/presentations/${presentationId}/embed`;
};

/**
 * Get the download URL for a presentation (for reference only)
 * ⚠️ WARNING: This URL requires authentication and will NOT work in a browser!
 * @param presentationId The ID of the presentation to download
 * @returns The download URL (requires API key in headers)
 */
export const getPresentationDownloadUrl = (presentationId: string): string => {
  return `${SLIDESGPT_API_BASE}/presentations/${presentationId}/download`;
};

/**
 * Get instructions for accessing presentation in PowerPoint Online
 * @param presentationId The ID of the presentation to access
 * @returns Instructions for manual access
 */
export const getPowerPointOnlineInstructions = (presentationId: string): string => {
  return `To view your presentation in PowerPoint Online:

1. Go to https://slidesgpt.com
2. Sign in to your account
3. Find presentation ID: ${presentationId}
4. Click "View" or "Open in PowerPoint"

The embed URL requires authentication and cannot be opened directly in a browser.`;
};
