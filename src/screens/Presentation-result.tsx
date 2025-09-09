import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Platform,
  ImageBackground,
  Image,
  Alert,
  Linking,
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../navigations';
import * as FileSystem from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useTokens} from '../context/TokenContext';
import {openPPTXFile} from '../utils/fileUtils';
import {
  saveRecentPresentation,
  getRandomColor,
} from '../utils/presentationStorage';
import {sharePptxFile, shareText} from '../utils/shareUtils';
import {showToast} from '../utils/showTost';
import {ImagesPath} from '../constants/ImagesPath';
import {downloadPresentation} from '../../utils/api/presentationService';
import { NativeAdView, NativeAsset, NativeAssetType } from 'react-native-google-mobile-ads';
import PresentationViewer from '../components/PresentationViewer';
import {usePurchases} from '../context/SubscriptionContext';
import TokenUsageBottomSheet from '../components/TokenUsageBottomSheet';
import {useRewardedContext} from '../context/RewardedAdContext';
import DownloadAdBottomSheet from '../components/DownloadAdBottomSheet';
import ShareAdBottomSheet from '../components/ShareAdBottomSheet';
import MyBannerAd from '../components/MyBannerAd';
import { useIsFocused } from '@react-navigation/native';
import adjust from '../utils/adjust';

// Import gradient background
const gradientBg = require('../assets/images/gradient_bg.jpeg');

// Download file from URL (kept for backward compatibility)
const downloadFile = async (url: string, fileName: string): Promise<string> => {
  // Make sure the filename has the right extension
  if (
    !fileName.toLowerCase().endsWith('.pptx') &&
    !fileName.toLowerCase().endsWith('.ppt')
  ) {
    fileName = `${fileName}.pptx`;
  }

  // Sanitize filename - replace spaces with underscores and remove special characters
  fileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Generate a unique ID to prevent overwriting but keep it short
  const uniqueId = Math.random().toString(36).substring(2, 6);
  // Format as "Title - Slide AI.pptx" with a short unique ID to prevent overwrites
  const uniqueFileName = `${fileName.replace(
    '.pptx',
    '',
  )} - Slide AI_${uniqueId}.pptx`;

  // Always use the app's document directory for reliable access
  let dirPath;
  if (Platform.OS === 'ios') {
    dirPath = FileSystem.DocumentDirectoryPath;
  } else {
    dirPath = FileSystem.DocumentDirectoryPath;
  }

  // Full path for the file
  const filePath = `${dirPath}/${uniqueFileName}`;
  // Check if file already exists and delete it
  try {
    const exists = await FileSystem.exists(filePath);
    if (exists) {
      await FileSystem.unlink(filePath);
    }
  } catch (error) {
    console.warn('Error checking/removing existing file:', error);
  }

  // Download the file
  try {
    const {jobId, promise} = FileSystem.downloadFile({
      fromUrl: url,
      toFile: filePath,
      background: true,
      discretionary: false,
      begin: res => {
        console.log(`Download started with job ID: ${res.jobId}`);
      },
      progress: res => {
        const progress = (res.bytesWritten / res.contentLength) * 100;
        console.log(`Downloaded: ${progress.toFixed(0)}%`);
      },
    });

    // Wait for the download to complete
    const result = await promise;

    if (result.statusCode === 200) {
      // Verify file exists and has content
      const fileInfo = await FileSystem.stat(filePath);

      if (fileInfo.size === 0) {
        throw new Error('Downloaded file has 0 bytes');
      }

      return filePath;
    } else {
      throw new Error(
        `Server responded with status code: ${result.statusCode}`,
      );
    }
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
};

// Helper function to convert ArrayBuffer to base64 (optimized)
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  try {
    // Use the more efficient approach with Uint8Array and btoa
      const bytes = new Uint8Array(buffer);
    
    // For large files, process in chunks to avoid memory issues
    const chunkSize = 1024 * 1024; // 1MB chunks
    if (bytes.length <= chunkSize) {
      // Small files: use direct conversion
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    } else {
      // Large files: process in chunks and concatenate
    let result = '';
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.slice(i, i + chunkSize);
        let binary = '';
        for (let j = 0; j < chunk.byteLength; j++) {
          binary += String.fromCharCode(chunk[j]);
        }
        result += btoa(binary);
      }
    return result;
    }
  } catch (error) {
    console.error('Error converting ArrayBuffer to base64:', error);
    throw new Error('Failed to convert file data to base64');
  }
};

// Download file from buffer (for SlidesGPT API downloads)
const downloadFileFromBuffer = async (arrayBuffer: ArrayBuffer, fileName: string): Promise<string> => {
  console.log(`🔧 downloadFileFromBuffer called with filename: ${fileName}`);
  
  // Don't override the extension - use what was passed in
  // This allows mock mode to use .txt and production to use .pptx
  console.log(`🔧 Using original filename: ${fileName}`);

  // Sanitize filename - replace spaces with underscores and remove special characters
  fileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Generate a unique ID to prevent overwriting but keep it short
  const uniqueId = Math.random().toString(36).substring(2, 6);
  
  // Get the file extension from the original filename
  const fileExtension = fileName.includes('.') ? fileName.split('.').pop() : 'pptx';
  
  console.log(`🔧 Unique filename generation:`);
  console.log(`   - Original filename: ${fileName}`);
  console.log(`   - Detected extension: ${fileExtension}`);
  console.log(`   - Base filename: ${fileName.includes('.') ? fileName.substring(0, fileName.lastIndexOf('.')) : fileName}`);
  
  // Format as "Title_ID - Slide AI.ext" with a short unique ID to prevent overwrites
  const baseFileName = fileName.includes('.') ? fileName.substring(0, fileName.lastIndexOf('.')) : fileName;
  const uniqueFileName = `${baseFileName} - Slide AI_${uniqueId}.${fileExtension}`;
  
  console.log(`🔧 Final unique filename: ${uniqueFileName}`);

  // Always use the app's document directory for reliable access
  let dirPath;
  if (Platform.OS === 'ios') {
    dirPath = FileSystem.DocumentDirectoryPath;
  } else {
    dirPath = FileSystem.DocumentDirectoryPath;
  }

  // Full path for the file
  const filePath = `${dirPath}/${uniqueFileName}`;
  
  // Skip file existence check - FileSystem.writeFile will overwrite automatically
  // This eliminates an unnecessary file system operation

  // Write the array buffer to file (optimized)
  try {
    console.log(`💾 Writing ${arrayBuffer.byteLength} bytes to file: ${filePath}`);
    
    // For large files, use chunked writing to avoid memory issues
    const chunkSize = 1024 * 1024; // 1MB chunks
    const bytes = new Uint8Array(arrayBuffer);
    
    if (bytes.length <= chunkSize) {
      // Small files: direct conversion and write
    const base64Data = arrayBufferToBase64(arrayBuffer);
    await FileSystem.writeFile(filePath, base64Data, 'base64');
    } else {
      // Large files: write in chunks
      console.log(`📦 Large file detected (${bytes.length} bytes), writing in chunks...`);
      
      // Create empty file first
      await FileSystem.writeFile(filePath, '', 'utf8');
      
      // Write chunks sequentially
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.slice(i, i + chunkSize);
        const chunkBase64 = arrayBufferToBase64(chunk.buffer);
        
        if (i === 0) {
          // First chunk: overwrite the empty file
          await FileSystem.writeFile(filePath, chunkBase64, 'base64');
        } else {
          // Subsequent chunks: append
          await FileSystem.appendFile(filePath, chunkBase64, 'base64');
        }
        
        // Log progress for large files
        const progress = Math.round((i + chunk.length) / bytes.length * 100);
        console.log(`📊 Write progress: ${progress}% (${i + chunk.length}/${bytes.length} bytes)`);
      }
    }
    
    // Verify file exists and has content
    const fileInfo = await FileSystem.stat(filePath);
    if (fileInfo.size === 0) {
      throw new Error('Written file has 0 bytes');
    }
    
    console.log(`✅ File written successfully: ${filePath} (${fileInfo.size} bytes)`);
    return filePath;
  } catch (error) {
    console.error('Error writing file from array buffer:', error);
    throw error;
  }
};

type PresentationResultNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'PresentationResult'
>;

type PresentationResultRouteProp = RouteProp<
  RootStackParamList,
  'PresentationResult'
>;

// Define interfaces for our presentation data
interface Slide {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
}

interface Presentation {
  id: string;
  title: string;
  slides: Slide[];
  createdAt: string;
  downloadUrl: string;
}

const PresentationResult = () => {
  const {showRewardedAd, interstitialAdGenerator, AdEventType, nativeAd} = useRewardedContext();
  const {isSubscribed} = usePurchases();

  const navigation = useNavigation<PresentationResultNavigationProp>();
  const route = useRoute<PresentationResultRouteProp>();
  const {presentationUrl, presentationId, templateName, fromGenerationScreen, actualTitle, numberOfSlides} = route.params;
  const {tokens, totalTokens, isFreeUser} = useTokens();

  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadedFilePath, setDownloadedFilePath] = useState<string | null>(
    null,
  );
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [showTokenSheet, setShowTokenSheet] = useState(false);
  const [showDownloadAdSheet, setShowDownloadAdSheet] = useState(false);
  const [showShareAdSheet, setShowShareAdSheet] = useState(false);
  const [pendingDownloadAfterSubscribe, setPendingDownloadAfterSubscribe] = useState(false);
  const [showPresentationViewer, setShowPresentationViewer] = useState(false);

  // Create animated value for progress animation
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const buttonWidthAnimation = useRef(new Animated.Value(0)).current;

  // Update progress animation when downloadProgress changes
  useEffect(() => {
    if (isDownloading) {
      Animated.timing(progressAnimation, {
        toValue: downloadProgress / 100,
        duration: 300,
        useNativeDriver: false,
        easing: Easing.out(Easing.ease),
      }).start();
    } else {
      progressAnimation.setValue(0);
    }
  }, [downloadProgress, isDownloading]);

  // Animation for button width change
  useEffect(() => {
    if (isDownloading) {
      // Start animation to expand button when download starts
      Animated.timing(buttonWidthAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
        easing: Easing.out(Easing.ease),
      }).start();
    } else {
      // Animate back to normal when download completes
      Animated.timing(buttonWidthAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
        easing: Easing.out(Easing.ease),
      }).start();
    }
  }, [isDownloading]);

  // Calculate interpolated values for animated styles
  const buttonWidth = buttonWidthAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['47%', '100%'],
  });

  const progressWidth = progressAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // Prevent automatic re-initialization on remount
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Log when component mounts
    console.log('=== PRESENTATION RESULT SCREEN ===');
    console.log('Screen mounted with params:', {
      presentationUrl,
      templateName,
      fromGenerationScreen,
    });

    // Only initialize if we have a valid URL and either it's from generation screen
    // or we haven't initialized yet
    if (presentationUrl && (fromGenerationScreen || !hasInitialized.current)) {
      initializePresentation().catch(err => {
        console.error('Error in initializePresentation:', err);
      });
      hasInitialized.current = true;
    } else if (!presentationUrl) {
      // If no URL is provided, show error and navigate back to home
      console.error('❌ No presentation URL provided, redirecting to Home');
      setError('No presentation URL provided.');
      setLoading(false);

      // Delayed navigation to Home to prevent immediate loop
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{name: 'Home'}],
        });
      }, 300);
    }
  }, []);

  // Check if downloaded file still exists
  useEffect(() => {
    const checkFileExists = async () => {
      if (downloadedFilePath) {
        try {
          console.log(
            `Checking if downloaded file still exists: ${downloadedFilePath}`,
          );
          const exists = await FileSystem.exists(downloadedFilePath);

          if (!exists) {
            console.log('Downloaded file no longer exists, resetting state');
            setDownloadedFilePath(null);
            // Also clear from storage
            if (presentation?.id) {
              await AsyncStorage.removeItem(
                `@presentation_download_${presentation.id}`,
              );
            }
          } else {
            console.log('Downloaded file exists');
            // Store in AsyncStorage
            if (presentation?.id) {
              await AsyncStorage.setItem(
                `@presentation_download_${presentation.id}`,
                downloadedFilePath,
              );
            }
          }
        } catch (error) {
          console.error('Error checking if file exists:', error);
          // Reset path on error to be safe
          setDownloadedFilePath(null);
        }
      }
    };

    checkFileExists();
  }, [downloadedFilePath]);

  // Load previously downloaded file path from AsyncStorage
  useEffect(() => {
    const loadSavedFilePath = async () => {
      if (presentation?.id && !downloadedFilePath) {
        try {
          const savedPath = await AsyncStorage.getItem(
            `@presentation_download_${presentation.id}`,
          );
          if (savedPath) {
            console.log(
              `Found saved file path for presentation ${presentation.id}: ${savedPath}`,
            );
            // Verify file still exists
            const exists = await FileSystem.exists(savedPath);
            if (exists) {
              console.log('Saved file exists, restoring path');
              setDownloadedFilePath(savedPath);
            } else {
              console.log('Saved file no longer exists, clearing stored path');
              await AsyncStorage.removeItem(
                `@presentation_download_${presentation.id}`,
              );
            }
          }
        } catch (error) {
          console.error('Error loading saved file path:', error);
        }
      }
    };

    loadSavedFilePath();
  }, [presentation]);

  const initializePresentation = async () => {
    try {
      console.log('Initializing presentation from URL...');
      setLoading(true);

      // Note: Tokens will be consumed after successful download completion
      // This ensures users only pay for presentations they can actually use
      console.log('✅ Presentation initialized, tokens will be consumed after download');

      if (!presentationUrl) {
        console.error('❌ No presentation URL provided');
        setError('Presentation URL is missing.');
        setLoading(false);
        return;
      }

      console.log(`Using presentation URL: ${presentationUrl}`);

      // Get the topic from route params or use a default title
      const presentationTitle = actualTitle || (route.params.topic
        ? `Presentation about ${route.params.topic}`
        : `Presentation based on ${templateName} template`);

      // Create a presentation object with the URL we already have
      const presentationObject = {
        id: Math.random().toString(36).substring(7), // Generate a random ID
        title: presentationTitle,
        slides: Array.from({ length: numberOfSlides || 3 }, (_, index) => ({
          id: (index + 1).toString(),
          title: `Slide ${index + 1}`,
          content: `Content for slide ${index + 1}`,
        })),
        createdAt: new Date().toISOString(),
        downloadUrl: presentationUrl,
      };

      console.log(
        'Created presentation object:',
        JSON.stringify(presentationObject, null, 2),
      );
      setPresentation(presentationObject);

      setLoading(false);
      console.log('✅ Presentation initialized successfully');
    } catch (err) {
      console.error('❌ Error initializing presentation:', err);
      setError('Failed to initialize presentation. Please try again.');
      setLoading(false);
    }
  };

  const handleViewPresentation = async () => {
    if (!presentation) {
      console.log('Cannot view presentation: no presentation data available');
      return;
    }

    try {
      if (downloadedFilePath) {
        // If we already have the file downloaded, verify it exists before opening
        console.log(
          `Attempting to open downloaded file: ${downloadedFilePath}`,
        );

        // Check if file still exists
        const fileExists = await FileSystem.exists(downloadedFilePath);

        if (fileExists) {
          // Make sure the path doesn't have a file:// prefix on Android
          const filePath =
            Platform.OS === 'android'
              ? downloadedFilePath.replace('file://', '')
              : downloadedFilePath;

          console.log(`Opening file with path: ${filePath}`);
          
          // Check file size before opening
          try {
            const fileInfo = await FileSystem.stat(filePath);
            if (fileInfo.size === 0) {
              throw new Error('File is empty (0 bytes)');
            }
            console.log(`📊 File size: ${fileInfo.size} bytes`);
            
            // Check if this is a mock file (text file)
            const isMockFile = filePath.toLowerCase().endsWith('.txt');
            if (isMockFile) {
              Alert.alert(
                'Mock File Detected',
                'This is a test file (.txt) created in mock mode.\n\n' +
                'In production, you will get real PowerPoint (.pptx) files that can be opened in PowerPoint apps.\n\n' +
                'For now, you can:\n' +
                '• View the content in any text app\n' +
                '• Use PowerPoint Online via the SlidesGPT dashboard\n' +
                '• Switch to production mode for real PPTX files',
                [
                  {
                    text: 'View in Text App',
                    onPress: () => {
                      // Try to open with a text viewer
                      console.log('User wants to view in text app');
                    }
                  },
                  {
                    text: 'PowerPoint Online',
                    onPress: () => handleViewPowerPointOnline()
                  },
                  {
                    text: 'OK',
                    style: 'default'
                  }
                ]
              );
              return;
            }
            
            // Check if we have PowerPoint apps installed first
            console.log('🔍 Checking for PowerPoint apps...');
            
            // Try to open the file
            console.log('🚀 Attempting to open file with openPPTXFile...');
            const success = await openPPTXFile(filePath);
            
            if (success) {
              console.log('✅ File opened successfully!');
              // Show success message
              Alert.alert(
                'File Opened',
                'The presentation file has been sent to your default app. Check your recent apps or notifications to view it.',
                [{ text: 'OK' }]
              );
            } else {
              console.log('❌ File opening failed');
              Alert.alert(
                'Cannot Open File',
                'The presentation file could not be opened. This might be because:\n\n' +
                '• No PowerPoint app is installed\n' +
                '• The file format is not supported\n' +
                '• The file is corrupted\n\n' +
                'Try installing a PowerPoint app or use PowerPoint Online via the SlidesGPT dashboard.',
                [
                  {
                    text: 'Install PowerPoint App',
                    onPress: () => {
                      console.log('User wants to install PowerPoint app');
                      // This will trigger the promptToInstallPresentationApp function
                    }
                  },
                  {
                    text: 'PowerPoint Online',
                    onPress: () => handleViewPowerPointOnline()
                  },
                  {
                    text: 'OK',
                    style: 'default'
                  }
                ]
              );
            }
          } catch (fileError: any) {
            console.error('❌ Error with file:', fileError);
            Alert.alert(
              'File Error',
              `Cannot open the file: ${fileError.message || 'Unknown error'}\n\n` +
              'The file might be corrupted or in an unsupported format.',
              [{ text: 'OK' }]
            );
          }
        } else {
          console.log('File no longer exists, need to re-download');

          // Clear the stored path since file doesn't exist anymore
          setDownloadedFilePath(null);
          if (presentation?.id) {
            await AsyncStorage.removeItem(
              `@presentation_download_${presentation.id}`,
            );
          }

          // Prompt to download again
          Alert.alert(
            'File Not Found',
            'The presentation file cannot be found. Would you like to download it again?',
            [
              {text: 'Cancel', style: 'cancel'},
              {
                text: 'Download',
                onPress: () => handleDownload(),
              },
            ],
          );
        }
      } else {
        // If not downloaded yet, prompt to download first
        console.log('No downloaded file available, prompting for download');
        Alert.alert(
          'Download Required',
          'The presentation needs to be downloaded first. Do you want to download it now?',
          [
            {text: 'Cancel', style: 'cancel'},
            {
              text: 'Download',
              onPress: () => handleDownload(),
            },
          ],
        );
      }
    } catch (error) {
      console.error('Error in handleViewPresentation:', error);
      Alert.alert(
        'Error',
        'There was a problem with the presentation. Please try again.',
        [{text: 'OK'}],
      );
    }
  };

  const handleDownload = async () => {
    if (!presentation) {
      console.log('Cannot download: no presentation data available');
      return;
    }

    // Token deduction is now handled in Generating-presentation.tsx when generation completes
    // No need to check or deduct tokens here

    try {
      setIsDownloading(true);

      // No permission check needed - we use app-specific directories

      // Use presentationId from route params for SlidesGPT API download
      const presentationId = route.params?.presentationId;
      if (!presentationId) {
        throw new Error('No presentation ID available for download');
      }

      console.log(`📥 Starting download for presentation ID: ${presentationId}`);
      
      // Show initial download message
      setError('Downloading presentation... Please wait.');

      // Download using SlidesGPT API service
      const response = await downloadPresentation(presentationId);
      
      if (!response.ok) {
        throw new Error(`Download failed with status: ${response.status}`);
      }

      // Get the file as array buffer
      const arrayBuffer = await response.arrayBuffer();
      
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('Downloaded file has no content (0 bytes)');
      }
      
      console.log(`📊 Downloaded ${arrayBuffer.byteLength} bytes`);
      console.log(`📄 Content type: ${response.headers.get('Content-Type') || 'Unknown'}`);
      
      // Update user feedback
      setError('Processing file... Please wait.');

      // Generate a filename based on the presentation title and ID
      const sanitizedTitle = presentation.title.replace(
        /[^a-zA-Z0-9._-\s]/g,
        '_',
      );
      
      // Check if we're in mock mode by checking the config
      const isMockMode = process.env.NODE_ENV === 'development' && false; // Force production mode for now
      const fileExtension = '.pptx'; // Always use .pptx for SlidesGPT API
      const fileName = `${sanitizedTitle}_${presentationId}${fileExtension}`;
      
      console.log(`🔧 File extension logic:`);
      console.log(`   - Presentation ID: ${presentationId}`);
      console.log(`   - Environment: ${process.env.NODE_ENV}`);
      console.log(`   - Is Mock Mode: ${isMockMode}`);
      console.log(`   - File Extension: ${fileExtension}`);
      console.log(`   - Final Filename: ${fileName}`);
      console.log(`   - Content Type: ${response.headers.get('Content-Type') || 'Unknown'}`);

      // Update user feedback
      setError('Saving file... Please wait.');

      // Save the file using the existing downloadFile function
      const filePath = await downloadFileFromBuffer(arrayBuffer, fileName);
      console.log(`💾 File saved to: ${filePath}`);

      // Save the file path for later use
      setDownloadedFilePath(filePath);
      await AsyncStorage.setItem(
        `presentation_${presentation.id}_path`,
        filePath,
      );

      // Save to recent presentations with the presentation ID
      const recentPresentation = {
        id: presentationId, // Use the actual SlidesGPT presentation ID
        title: presentation.title,
        slides: presentation.slides.length,
        createdAt: presentation.createdAt,
        filePath: filePath,
        downloadUrl: `https://api.slidesgpt.com/v1/presentations/${presentationId}/download`,
        color: getRandomColor(),
        topic: route.params?.topic || '',
        templateName: route.params?.templateName || '',
      };

      await saveRecentPresentation(recentPresentation);

      // Token is now deducted on generation completion in Generating-presentation screen

      // Show success message
      console.log('✅ Download completed successfully');
      setDownloadSuccess(true);

      // Hide success message after a delay
      setTimeout(() => {
        setDownloadSuccess(false);
      }, 3000);

      // Return the file path
      return filePath;
    } catch (error: any) {
      console.error('❌ Error downloading presentation:', error);
      Alert.alert(
        'Download Failed',
        `There was an error downloading your presentation: ${error.message || 'Unknown error'}`,
        [{text: 'OK'}],
      );
      return null;
    } finally {
      setIsDownloading(false);
    }
  };

  // Show rewarded ad, then download after ad is completed
  const handleDownloadWithAd = () => {
    if (isSubscribed) {
      handleDownload();
      return;
    }
    setShowDownloadAdSheet(true);
  };

  const handleWatchAdAndDownload = () => {
    setShowDownloadAdSheet(false);
    setTimeout(() => {
      showRewardedAd(() => {
        handleDownload();
      });
    }, 300);
  };

  const handleCancelDownloadSheet = () => {
    setShowDownloadAdSheet(false);
  };

  const handleWatchAdAndShare = () => {
    setShowShareAdSheet(false);
    setTimeout(() => {
      showRewardedAd(() => {
        handleSharePresentation();
      });
    }, 300);
  };

  const handleCancelShareSheet = () => {
    setShowShareAdSheet(false);
  };

  const handleSharePresentation = async () => {
    try {
      console.log('Sharing presentation...');

      // If we have a local file, share it
      if (downloadedFilePath && (await FileSystem.exists(downloadedFilePath))) {
        console.log(`Sharing local file: ${downloadedFilePath}`);
        await sharePptxFile(
          downloadedFilePath,
          presentation?.title || 'Presentation',
        );
      }
      // Otherwise, share the download URL
      else if (presentation?.downloadUrl) {
        console.log(`Sharing download URL: ${presentation.downloadUrl}`);
        await shareText(
          presentation.title || 'Presentation',
          `Check out my presentation: ${presentation.title || 'Presentation'}`,
          presentation.downloadUrl,
        );
      } else {
        // If we don't have a URL either, just share the title
        console.log('No file or URL available, sharing text only');
        await shareText(
          presentation?.title || 'Presentation',
          `Check out my presentation: ${presentation?.title || 'Presentation'}`,
        );
      }
    } catch (error: any) {
      console.error('Error sharing presentation:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to share presentation';
      
      if (error.message?.includes('Something went wrong')) {
        errorMessage = 'Sharing failed due to a system error. This is common on Android with large files. Try sharing the download link instead.';
      } else if (error.message?.includes('File not found')) {
        errorMessage = 'The presentation file could not be found. Please download it again.';
      } else if (error.message?.includes('Sharing failed')) {
        errorMessage = 'Sharing failed. This might be due to file size or format issues.';
      }
      
      Alert.alert(
        'Sharing Error', 
        errorMessage,
        [
          { text: 'Try Download Link', onPress: () => {
            // Try sharing the download URL instead
            if (presentation?.downloadUrl) {
              shareText(
                presentation.title || 'Presentation',
                `Check out my presentation: ${presentation.title || 'Presentation'}\n\nDownload here: ${presentation.downloadUrl}`,
                presentation.downloadUrl,
              ).catch(shareError => {
                console.error('Error sharing download link:', shareError);
                Alert.alert('Error', 'Failed to share download link');
              });
            }
          }},
          { text: 'OK', style: 'default' }
        ]
      );
    }
  };

  // Show bottom sheet for free users, then rewarded ad, then share
  const handleShareWithAd = () => {
    if (isSubscribed) {
      handleSharePresentation();
      return;
    }
    // Free user - show bottom sheet first
    setShowShareAdSheet(true);
  };

  const handleCloseBottomSheet = () => {
    setShowTokenSheet(false);
  };

  const onContinueLimited = () => {
    setShowTokenSheet(false);
    setTimeout(() => {
      showRewardedAd(() => {
        handleReturnHome();
      });
    }, 500);
  };
  const onContinueDownlaodLimited = () => {
    setShowTokenSheet(false);
    setTimeout(() => {
      showRewardedAd(() => {
        handleReturnHome();
      });
    }, 500);
  };

  const handleReturnHome = () => {
    navigation.reset({
      index: 0,
      routes: [{name: 'Home'}],
    });
  };

  const handleViewPowerPointOnline = () => {
    if (!presentationId) {
      Alert.alert('Error', 'No presentation ID available');
      return;
    }

    Alert.alert(
      'PowerPoint Online Access',
      `To view your presentation in PowerPoint Online:

1. Go to https://slidesgpt.com
2. Sign in to your account  
3. Find presentation ID: ${presentationId}
4. Click "View" or "Open in PowerPoint"

The embed URL requires authentication and cannot be opened directly in a browser.`,
      [
        {
          text: 'Copy ID',
          onPress: () => {
            // You could implement clipboard functionality here
            console.log('Presentation ID copied:', presentationId);
            Alert.alert('Success', 'Presentation ID copied! Use it in SlidesGPT dashboard');
          }
        },
        {
          text: 'OK',
          style: 'default'
        }
      ]
    );
  };

  const handleViewInApp = () => {
    console.log('🔍 handleViewInApp called');
    console.log('📊 presentation:', presentation);
    console.log('📊 showPresentationViewer state:', showPresentationViewer);
    
    if (!presentation) {
      console.log('❌ No presentation data available');
      Alert.alert('Error', 'No presentation data available');
      return;
    }

    console.log('✅ Setting showPresentationViewer to true');
    setShowPresentationViewer(true);
    
    // Test with a simple alert first
    Alert.alert(
      'Debug Info',
      `Presentation: ${presentation.title}\nSlides: ${presentation.slides.length}\nModal should open now`,
      [{ text: 'OK' }]
    );
    
    // Log the state after setting
    setTimeout(() => {
      console.log('📊 showPresentationViewer state after setState:', showPresentationViewer);
    }, 100);
  };



  const isFocused = useIsFocused ? useIsFocused() : true;

  useEffect(() => {
    if (
      isFocused &&
      isSubscribed &&
      pendingDownloadAfterSubscribe
    ) {
      handleDownload();
      setPendingDownloadAfterSubscribe(false);
    }
  }, [isFocused, isSubscribed, pendingDownloadAfterSubscribe]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading presentation...</Text>
      </View>
    );
  }

  if (error && !presentation) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={initializePresentation}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.homeButton} onPress={handleReturnHome}>
          <Text style={styles.homeButtonText}>Return Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <ImageBackground
        source={gradientBg}
        style={styles.backgroundImage}
        resizeMode="cover">
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent={Platform.OS === 'android'}
        />

        {/* App Header */}
        <SafeAreaView style={styles.header}>
          <View style={styles.appTitleContainer}>
            <View style={styles.appIconContainer}>
              <Image
                source={ImagesPath.appIcon}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  backgroundColor: 'transparent',
                }}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.appTitle}>Slides Ai Presentation</Text>
          </View>

          {/* Token display */}
          <View style={styles.tokenContainer}>
            <Text style={styles.tokenIcon}>🪙</Text>
            <Text style={styles.tokenCount}>{totalTokens}</Text>
          </View>
        </SafeAreaView>

        {/* Main Content */}
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.container}>
            <View style={styles.whiteCard}>
              {/* Preview Rectangle */}
              <View style={styles.previewRectangle} />

              <Text style={styles.readyText}>
                {downloadedFilePath
                  ? 'Your presentation is ready to view!'
                  : 'Your presentation is ready to download!'}
              </Text>

              {presentation && (
                <Text style={styles.generatedDate}>
                  Generated on{' '}
                  {new Date(presentation.createdAt).toLocaleDateString(
                    'en-US',
                    {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    },
                  )}
                </Text>
              )}

              {/* (Removed top banner ad) */}

              {/* Action Buttons */}
              <View style={styles.buttonsContainer}>
                <Animated.View
                  style={{width: isDownloading ? buttonWidth : '47%'}}>
                  <TouchableOpacity
                    style={[
                      styles.downloadButton,
                      downloadedFilePath ? styles.viewButton : {},
                    ]}
                    onPress={
                      downloadedFilePath
                        ? handleViewPresentation
                        : handleDownloadWithAd
                    }
                    disabled={isDownloading}
                    activeOpacity={0.7}>
                    {isDownloading ? (
                      <View style={styles.downloadingContainer}>
                        <ActivityIndicator
                          size="small"
                          color="#FFFFFF"
                          style={styles.downloadingIndicator}
                        />
                        <Text style={styles.downloadingText}>
                          {downloadProgress < 5
                            ? 'Starting...'
                            : `${downloadProgress.toFixed(0)}%`}
                        </Text>
                        {/* Progress bar overlay */}
                        <Animated.View
                          style={[
                            styles.progressBarContainer,
                            {width: progressWidth},
                          ]}
                        />
                      </View>
                    ) : (
                      <View style={styles.buttonContentContainer}>
                        {!downloadedFilePath && (
                          <Text style={styles.downloadButtonText}>
                            {downloadedFilePath
                              ? 'View Presentation'
                              : 'Download'}
                          </Text>
                        )}
                        {downloadedFilePath && (
                          <Text style={styles.downloadButtonText}>
                            View Presentation
                          </Text>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                </Animated.View>

                {!isDownloading && (
                  <TouchableOpacity
                    style={[
                      styles.shareButton,
                      !downloadedFilePath && {opacity: 0.5},
                    ]}
                    onPress={handleShareWithAd}
                    disabled={!downloadedFilePath}
                    activeOpacity={0.7}>
                    <View style={styles.buttonContentContainer}>
                      <Text style={styles.shareButtonText}>Share</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>

              {/* Native Ad - Show only for free users */}
              <View style={styles.adContainer}>
                {nativeAd && isFreeUser && (
                  <View style={styles.nativeAdContainer}>
                    <NativeAdView nativeAd={nativeAd} style={styles.nativeAdView}>
                      <View style={styles.adHeader}>
                        <View style={styles.adHeaderText}>
                          <NativeAsset assetType={NativeAssetType.HEADLINE}>
                            <Text style={styles.adHeadline} numberOfLines={1}>
                              {nativeAd.headline || 'Sponsored Content'}
                            </Text>
                          </NativeAsset>
                          <NativeAsset assetType={NativeAssetType.ADVERTISER}>
                            <Text style={styles.adAdvertiser} numberOfLines={1}>
                              {nativeAd.advertiser || 'Advertiser'}
                            </Text>
                          </NativeAsset>
                        </View>
                        <View style={styles.adBadge}>
                          <Text style={styles.adBadgeText}>Ad</Text>
                        </View>
                      </View>
                      <NativeAsset assetType={NativeAssetType.BODY}>
                        <Text style={styles.adBody} numberOfLines={2}>
                          {nativeAd.body || 'Advertisement content'}
                        </Text>
                      </NativeAsset>
                      <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
                        <TouchableOpacity style={styles.adCallToAction}>
                          <Text style={styles.adCallToActionText}>
                            {nativeAd.callToAction || 'Learn More'}
                          </Text>
                        </TouchableOpacity>
                      </NativeAsset>
                    </NativeAdView>
                  </View>
                )}
              </View>

              {/* Footer Content */}
              <View style={styles.footerContent}>
                <Text style={styles.poweredByText}>
                  Powered by Slides AI{' '}
                  <Text style={styles.checkmark}>✓</Text>
                </Text>
                


                {/* Create New Presentation Button */}
                <TouchableOpacity
                  style={styles.createNewButton}
                  onPress={() => {
                    if (!downloadedFilePath) {
                      showToast('First download the presentation, then create a new one.');
                      return;
                    }
                    handleReturnHome();
                  }}
                  disabled={isDownloading || !downloadedFilePath}>
                  <Text style={styles.createNewButtonText}>
                    Create New Presentation
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </ImageBackground>
      <TokenUsageBottomSheet
        visible={showTokenSheet}
        onClose={handleCloseBottomSheet}
        onContinueLimited={onContinueLimited}
        zeroTokens={totalTokens === 0}
        onSubscribe={() => {
          setShowTokenSheet(false);
          navigation.navigate('SubscriptionManagement');
        }}
      />
      <DownloadAdBottomSheet
        visible={showDownloadAdSheet}
        onClose={handleCancelDownloadSheet}
        onWatchAd={handleWatchAdAndDownload}
        onSubscribe={() => {
          setShowDownloadAdSheet(false);
          setPendingDownloadAfterSubscribe(true);
          navigation.navigate('SubscriptionManagement');
        }}
      />
      <ShareAdBottomSheet
        visible={showShareAdSheet}
        onClose={handleCancelShareSheet}
        onWatchAd={handleWatchAdAndShare}
        onCancel={handleCancelShareSheet}
        onSubscribe={() => {
          setShowShareAdSheet(false);
          navigation.navigate('SubscriptionManagement');
        }}
      />

      {/* In-App Presentation Viewer */}
      {(() => {
        console.log('🔍 Rendering PresentationViewer section');
        console.log('📊 showPresentationViewer:', showPresentationViewer);
        console.log('📊 presentation:', presentation);
        return null;
      })()}
      
      {/* Test Simple Modal */}
      {showPresentationViewer && (
        <Modal
          visible={showPresentationViewer}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => {
            console.log('🔒 Test modal onRequestClose');
            setShowPresentationViewer(false);
          }}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
            <View style={{ padding: 20 }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
                Test Modal - Should Work!
              </Text>
              <Text style={{ fontSize: 16, marginBottom: 20 }}>
                If you can see this, Modal is working!
              </Text>
              <Text style={{ fontSize: 14, marginBottom: 20 }}>
                Presentation: {presentation?.title || 'No title'}
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: '#4F67ED',
                  padding: 15,
                  borderRadius: 10,
                  alignItems: 'center'
                }}
                onPress={() => {
                  console.log('🔒 Test modal close button pressed');
                  setShowPresentationViewer(false);
                }}
              >
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                  Close Test Modal
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>
      )}
      
      {/* Full PresentationViewer Component */}
      {showPresentationViewer && presentation && (
        (() => {
          console.log('✅ Rendering PresentationViewer component');
          return (
            <PresentationViewer
              visible={showPresentationViewer}
              onClose={() => {
                console.log('🔒 Closing PresentationViewer');
                setShowPresentationViewer(false);
              }}
              presentation={{
                id: route.params?.presentationId || presentation.id,
                title: presentation.title,
                slides: presentation.slides.length,
                filePath: downloadedFilePath || undefined,
                downloadUrl: presentation.downloadUrl,
                topic: route.params?.topic,
                templateName: route.params?.templateName,
              }}
            />
          );
        })()
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#EEF1FA',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: adjust(16),
    paddingVertical: adjust(10),
  },
  appTitleContainer: {
    marginTop: adjust(12),
    marginLeft: adjust(6),
    flexDirection: 'row',
    alignItems: 'center',
  },
  appIconContainer: {
    width: adjust(28),
    height: adjust(28),
    borderRadius: adjust(8),
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: adjust(10),
  },
  appIcon: {
    fontSize: adjust(16),
    color: 'white',
  },
  appTitle: {
    fontSize: adjust(20),
    fontWeight: 'bold',
    color: '#333',
  },
  placeholderRight: {
    width: adjust(32),
  },
  container: {
    flex: 1,
    paddingHorizontal: adjust(16),
    justifyContent:'center',
  },
  whiteCard: {
    flex: 0.9, // further reduced for a smaller card
    backgroundColor: '#FFFFFF',
    borderRadius: adjust(24),
    paddingHorizontal: adjust(20),
    paddingVertical: adjust(10),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: adjust(8),
    elevation: 5,
    position: 'relative',
    display: 'flex',
    gap: adjust(8), // reduced gap for more compact spacing
  },
  previewRectangle: {
    width: '100%',
    height: adjust(120),
    backgroundColor: '#4F67ED',
    borderRadius: adjust(16),
  },
  readyText: {
    fontSize: adjust(17),
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: adjust(8),
    marginTop: adjust(8),
  },
  generatedDate: {
    fontSize: adjust(14),
    color: '#666',
    marginBottom: adjust(12),
  },
  buttonsContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    display: 'flex',
    gap: adjust(6), // reduced gap between download and share buttons
  },
  buttonContentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: adjust(4), // reduced gap between icon and text
  },
  downloadButton: {
    height: adjust(44),
    backgroundColor: '#4F67ED',
    borderRadius: adjust(10),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: adjust(10),
    overflow: 'hidden', // Important for the progress bar overlay
    position: 'relative', // For positioning the progress overlay
  },
  viewButton: {
    backgroundColor: '#4CAF50',
    borderRadius: adjust(10),
  },
  shareButton: {
    width: '47%',
    height: adjust(44),
    backgroundColor: '#F0F0F0',
    borderRadius: adjust(10),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: adjust(10),
    marginLeft: adjust(8), // add space between buttons
  },
  downloadIcon: {
    fontSize: adjust(18),
    marginRight: adjust(6),
  },
  downloadButtonText: {
    fontSize: adjust(14),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  downloadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    zIndex: 10,
  },
  downloadingText: {
    fontSize: adjust(15),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  downloadingIndicator: {
    marginRight: adjust(8),
  },
  progressBarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    zIndex: 1,
  },
  shareButtonText: {
    fontSize: adjust(15),
    fontWeight: '600',
    color: '#333',
  },
  footerContent: {
    width: '100%',
    alignItems: 'center',
    display: 'flex',
    gap: adjust(6), // reduced vertical gap between footer items
  },
  poweredByText: {
    fontSize: adjust(14),
    color: '#666',
  },
  checkmark: {
    color: '#4CAF50',
  },

  createNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    paddingVertical: adjust(14),
    paddingHorizontal: adjust(24),
    borderRadius: adjust(10),
    marginTop: adjust(10),
    borderWidth: 1,
    borderColor: '#E5E9F0',
    gap: adjust(6),
  },
  createNewButtonIcon: {
    fontSize: adjust(18),
    color: '#4F67ED',
  },
  createNewButtonText: {
    fontSize: adjust(15),
    fontWeight: '600',
    color: '#4F67ED',
  },
  termsContainer: {
    marginTop: 0,
    marginBottom: adjust(2),
  },
  termsText: {
    fontSize: adjust(12),
    color: '#4F67ED',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  loadingText: {
    fontSize: adjust(18),
    color: '#555',
    marginTop: adjust(16),
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: adjust(24),
    backgroundColor: 'white',
  },
  errorText: {
    fontSize: adjust(18),
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: adjust(24),
  },
  retryButton: {
    backgroundColor: '#F5F5F5',
    padding: adjust(16),
    borderRadius: adjust(12),
    alignItems: 'center',
    justifyContent: 'center',
    width: '80%',
    marginBottom: adjust(16),
  },
  retryButtonText: {
    fontSize: adjust(16),
    fontWeight: '600',
    color: '#333',
  },
  homeButton: {
    backgroundColor: '#F5F5F5',
    padding: adjust(16),
    borderRadius: adjust(12),
    alignItems: 'center',
    justifyContent: 'center',
    width: '80%',
    marginTop: adjust(16),
  },
  homeButtonText: {
    fontSize: adjust(16),
    fontWeight: '600',
    color: '#333',
  },
  backButton: {
    width: adjust(32),
    height: adjust(32),
    borderRadius: adjust(16),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: adjust(18),
    color: 'white',
  },
  headerTitle: {
    fontSize: adjust(20),
    fontWeight: 'bold',
    color: 'white',
  },
  tokenContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: adjust(12),
    paddingVertical: adjust(6),
    borderRadius: adjust(16),
    marginTop: adjust(15),
  },
  tokenIcon: {
    width: adjust(20),
    fontSize: adjust(16),
    marginRight: adjust(4),
  },
  tokenCount: {
    color: 'black',
    fontWeight: '600',
    fontSize: adjust(14),
  },
  // Add a new style for ad separation
  adContainer: {
    alignItems: 'center',
    width: '100%',
  },
  nativeAdContainer: {
    width: '100%',
    padding: adjust(10),
    marginTop: adjust(10),
    backgroundColor: '#F0F0F0',
    borderRadius: adjust(12),
    marginBottom: adjust(10),
  },
  nativeAdView: {
    padding: adjust(10),
  },
  adHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: adjust(5),
  },
  adHeaderText: {
    flex: 1,
    marginRight: adjust(10),
  },
  adHeadline: {
    fontSize: adjust(16),
    fontWeight: 'bold',
    color: '#333',
  },
  adAdvertiser: {
    fontSize: adjust(14),
    color: '#666',
    marginTop: adjust(2),
  },
  adBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: adjust(8),
    paddingVertical: adjust(4),
    borderRadius: adjust(5),
  },
  adBadgeText: {
    fontSize: adjust(12),
    fontWeight: 'bold',
    color: '#333',
  },
  adBody: {
    fontSize: adjust(14),
    color: '#555',
    marginBottom: adjust(10),
  },
  adCallToAction: {
    backgroundColor: '#4F67ED',
    paddingVertical: adjust(10),
    paddingHorizontal: adjust(20),
    borderRadius: adjust(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  adCallToActionText: {
    fontSize: adjust(14),
    fontWeight: '600',
    color: '#FFFFFF',
  },

});

export default PresentationResult;
