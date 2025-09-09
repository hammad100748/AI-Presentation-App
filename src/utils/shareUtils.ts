import { Platform, Alert, NativeModules } from 'react-native';
import Share from 'react-native-share';
import * as RNFS from 'react-native-fs';
import { AdsConsent } from 'react-native-google-mobile-ads';
import { requestStoragePermission } from './fileUtils';

// Import FileProvider if available
const { FileProvider } = NativeModules;

// Define the result type based on react-native-share documentation
interface ShareResult {
  success: boolean;
  message: string;
  dismissedAction?: boolean;
}

/**
 * Copy file to public storage for sharing
 * @param filePath The internal file path
 * @param title The presentation title
 * @returns Promise with the public file path
 */
const copyToPublicStorage = async (filePath: string, title: string): Promise<string> => {
  try {
    // Request storage permission first
    if (Platform.OS === 'android') {
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        throw new Error('Storage permission denied');
      }
    }

    // Create a unique filename
    const timestamp = Date.now();
    const sanitizedTitle = title.replace(/[^a-zA-Z0-9._-\s]/g, '_');
    const fileName = `${sanitizedTitle}_${timestamp}.pptx`;
    
    // Copy to Downloads folder (public storage)
    const downloadsPath = RNFS.DownloadDirectoryPath;
    const publicFilePath = `${downloadsPath}/${fileName}`;
    
    console.log(`📁 Copying file to public storage:`);
    console.log(`   - From: ${filePath}`);
    console.log(`   - To: ${publicFilePath}`);
    
    // Remove file:// prefix if present
    const cleanSourcePath = filePath.replace('file://', '');
    
    // Copy the file
    await RNFS.copyFile(cleanSourcePath, publicFilePath);
    
    // Verify the copy was successful
    const publicFileExists = await RNFS.exists(publicFilePath);
    if (!publicFileExists) {
      throw new Error('Failed to copy file to public storage');
    }
    
    const publicFileInfo = await RNFS.stat(publicFilePath);
    console.log(`✅ File copied successfully: ${publicFileInfo.size} bytes`);
    
    return publicFilePath;
  } catch (error) {
    console.error('❌ Error copying to public storage:', error);
    throw error;
  }
};

/**
 * Shares a PPTX file using the native share dialog
 * @param filePath The path to the file to share
 * @param title The title of the presentation
 * @returns Promise that resolves when sharing is complete
 */
export const sharePptxFile = async (filePath: string, title: string): Promise<ShareResult | void> => {
  try {
    // First check if the file exists
    const fileExists = await RNFS.exists(filePath);
    if (!fileExists) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Get file size to confirm it's a valid file
    const fileInfo = await RNFS.stat(filePath);
    console.log(`Sharing file: ${filePath}, Size: ${fileInfo.size} bytes`);

    // For Android, copy file to public storage for sharing
    let shareablePath: string;
    let fileName: string;
    
    if (Platform.OS === 'android') {
      try {
        console.log('📱 Android detected - copying to public storage for sharing');
        const publicFilePath = await copyToPublicStorage(filePath, title);
        shareablePath = publicFilePath;
        fileName = publicFilePath.split('/').pop() || `${title.replace(/\s+/g, '_')}.pptx`;
        
        console.log(`✅ Using public file path: ${shareablePath}`);
      } catch (copyError) {
        console.error('❌ Failed to copy to public storage:', copyError);
        throw new Error(`Cannot share file: ${copyError.message}`);
      }
    } else {
      // iOS can use the original path
      shareablePath = filePath;
      fileName = filePath.split('/').pop() || `${title.replace(/\s+/g, '_')}.pptx`;
    }

    // Share options
    const options = {
      title: `Share "${title}" Presentation`,
      subject: `${title} - Created with Slide AI`,
      message: `Check out my presentation "${title}" created with Slide AI!`,
      url: Platform.OS === 'android' ? `file://${shareablePath}` : shareablePath,
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      filename: fileName, // Explicitly set the filename
      saveToFiles: true, // Save to device files when possible
      failOnCancel: false, // Don't throw if user cancels
    };

    // Use react-native-share to open the share dialog
    console.log('🚀 Attempting to share with options:', options);
    const result = await Share.open(options);
    console.log('✅ Share result:', result);
    
    // Clean up temporary public file on Android after successful sharing
    if (Platform.OS === 'android' && shareablePath !== filePath) {
      try {
        console.log('🧹 Cleaning up temporary public file');
        await RNFS.unlink(shareablePath);
        console.log('✅ Temporary file cleaned up');
      } catch (cleanupError) {
        console.warn('⚠️ Failed to clean up temporary file:', cleanupError);
      }
    }
    
    return result;
  } catch (error: any) {
    console.error('❌ Error sharing file:', error);
    
    // Provide more specific error information
    if (error.message?.includes('Something went wrong')) {
      console.log('🔍 "Something went wrong" error detected - trying alternative sharing method');
      
      // Try alternative sharing method for Android
      if (Platform.OS === 'android') {
        try {
          console.log('🔄 Trying alternative sharing method...');
          
          // Use a simpler sharing approach with public path
          const alternativeOptions = {
            title: `Share "${title}" Presentation`,
            message: `Check out my presentation "${title}" created with Slide AI!`,
            url: `file://${shareablePath}`,
            type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          };
          
          console.log('🔄 Alternative options:', alternativeOptions);
          const altResult = await Share.open(alternativeOptions);
          console.log('✅ Alternative share successful:', altResult);
          return altResult;
        } catch (altError) {
          console.error('❌ Alternative sharing also failed:', altError);
        }
      }
    }
    
    // If we get here, both methods failed
    console.log('❌ All sharing methods failed, trying Downloads folder fallback...');
    
    // Final fallback: try to copy file to Downloads folder and share from there
    if (Platform.OS === 'android') {
      try {
        const downloadsPath = RNFS.DownloadDirectoryPath;
        const downloadsFileName = `${title.replace(/\s+/g, '_')}_${Date.now()}.pptx`;
        const downloadsFilePath = `${downloadsPath}/${downloadsFileName}`;
        
        console.log(`🔄 Trying Downloads folder fallback: ${downloadsFilePath}`);
        
        // Copy file to Downloads folder
        await RNFS.copyFile(filePath.replace('file://', ''), downloadsFilePath);
        
        // Try sharing from Downloads
        const downloadsOptions = {
          title: `Share "${title}" Presentation`,
          message: `Check out my presentation "${title}" created with Slide AI!`,
          url: `file://${downloadsFilePath}`,
          type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        };
        
        console.log('🔄 Downloads sharing options:', downloadsOptions);
        const downloadsResult = await Share.open(downloadsOptions);
        console.log('✅ Downloads sharing successful:', downloadsResult);
        
        // Clean up the Downloads file after sharing
        try {
          await RNFS.unlink(downloadsFilePath);
          console.log('🧹 Downloads fallback file cleaned up');
        } catch (cleanupError) {
          console.warn('⚠️ Failed to clean up Downloads fallback file:', cleanupError);
        }
        
        return downloadsResult;
      } catch (downloadsError) {
        console.error('❌ Downloads folder fallback also failed:', downloadsError);
      }
    }
    
    // If we get here, all methods failed
    throw new Error(`Sharing failed: ${error.message || 'Unknown error'}`);
  }
};

/**
 * Shares a URL or text when no file is available
 * @param title The title of the presentation
 * @param message The message to share
 * @param url Optional URL to share
 * @returns Promise that resolves when sharing is complete
 */
export const shareText = async (title: string, message: string, url?: string): Promise<ShareResult | void> => {
  try {
    const options = {
      title: `Share "${title}" Presentation`,
      subject: `${title} - Created with Slide AI`,
      message: `${message} Created with Slide AI!`,
      url: url, // Optional URL
    };

    const result = await Share.open(options);
    console.log('Share result:', result);
    return result;
  } catch (error) {
    console.error('Error sharing text:', error);
    throw error;
  }
};
