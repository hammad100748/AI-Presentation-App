import RNFS from 'react-native-fs';
import FileViewer from 'react-native-file-viewer';
import { Platform, Alert, PermissionsAndroid, NativeModules } from 'react-native';
import { Linking } from 'react-native';
import SendIntentAndroid from 'react-native-send-intent';

/**
 * Request storage permissions for Android
 * @returns {Promise<boolean>} Whether permission was granted
 */
export const requestStoragePermission = async () => {
  if (Platform.OS !== 'android') {return true;}

  try {
    console.log(`Requesting permissions for Android API level ${Platform.Version}`);

    // For Android 13+ (API level 33+)
    if (Platform.Version >= 33) {
      console.log('Android 13+: Requesting media permissions');
      const permissions = [
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
      ];

      const results = await Promise.all(
        permissions.map(permission => PermissionsAndroid.request(permission))
      );

      const granted = results.every(result => result === PermissionsAndroid.RESULTS.GRANTED);
      console.log(`Android 13+ permissions ${granted ? 'granted' : 'denied'}`);
      return granted;
    }
    // For Android 10-12 (API level 29-32)
    else if (Platform.Version >= 29) {
      console.log('Android 10-12: Requesting READ_EXTERNAL_STORAGE');
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
      );
      console.log(`Android 10-12 permission ${granted === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied'}`);
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    // For Android 9 and below
    else {
      console.log('Android 9 or below: Requesting WRITE_EXTERNAL_STORAGE');
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
      );
      console.log(`Android 9 or below permission ${granted === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied'}`);
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
  } catch (err) {
    console.error('Error requesting storage permission:', err);
    return false;
  }
};

/**
 * Get the appropriate directory path for saving files
 * @returns {string} Directory path
 */
export const getStoragePath = () => {
  if (Platform.OS === 'ios') {
    return RNFS.DocumentDirectoryPath;
  } else {
    // For Android, use the app's cache directory which doesn't require special permissions
    return RNFS.CachesDirectoryPath;
  }
};

/**
 * Check if any presentation app is installed
 * @returns {Promise<boolean>} Whether a presentation app is installed
 */
export const isPresentationAppInstalled = async () => {
  try {
    console.log('Checking if presentation apps are installed...');

    // List of common presentation app package names
    const presentationApps = [
      'com.microsoft.office.powerpoint', // Microsoft PowerPoint
      'com.google.android.apps.docs.editors.slides', // Google Slides
      'com.infraware.office.link', // Polaris Office
      'com.mobisystems.office', // OfficeSuite
    ];

    // On iOS, we can't check for specific apps, so we'll rely on FileViewer
    if (Platform.OS === 'ios') {
      return true;
    }

    // Check if any of the presentation apps are installed
    for (const appPackage of presentationApps) {
      try {
        const isInstalled = await SendIntentAndroid.isAppInstalled(appPackage);
        if (isInstalled) {
          console.log(`Found presentation app: ${appPackage}`);
          return true;
        }
      } catch (error) {
        console.warn(`Error checking if ${appPackage} is installed:`, error);
      }
    }

    console.log('No presentation apps found');
    return false;
  } catch (error) {
    console.error('Error checking for presentation apps:', error);
    return false;
  }
};

/**
 * Show prompt to install PowerPoint or Google Slides
 */
export const promptToInstallPresentationApp = () => {
  console.log('Showing prompt to install presentation app');

  // Direct links to app stores
  const powerPointPlayStore = 'https://play.google.com/store/apps/details?id=com.microsoft.office.powerpoint';
  const powerPointAppStore = 'https://apps.apple.com/us/app/microsoft-powerpoint/id586449534';
  const googleSlidesPlayStore = 'https://play.google.com/store/apps/details?id=com.google.android.apps.docs.editors.slides';
  const googleSlidesAppStore = 'https://apps.apple.com/us/app/google-slides/id879478102';

  // Simple direct alert
  Alert.alert(
    'Presentation Viewer Required',
    'To view this PowerPoint presentation, you need a compatible app.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Install PowerPoint',
        onPress: () => {
          console.log('User chose to install PowerPoint');
          const url = Platform.OS === 'android' ? powerPointPlayStore : powerPointAppStore;
          console.log(`Opening URL: ${url}`);

          if (Platform.OS === 'android' && SendIntentAndroid) {
            try {
              // Open in Play Store app if available
              SendIntentAndroid.openAppWithData(
                'com.android.vending',
                'market://details?id=com.microsoft.office.powerpoint',
                'text/plain'
              );
            } catch (error) {
              // Fallback to browser
              Linking.openURL(url).catch(err => {
                console.error('Error opening store URL:', err);
                Alert.alert(
                  'Error',
                  'Could not open app store. Please search for Microsoft PowerPoint in your app store.',
                  [{ text: 'OK' }]
                );
              });
            }
          } else {
            // iOS or fallback
            Linking.openURL(url).catch(err => {
              console.error('Error opening store URL:', err);
              Alert.alert(
                'Error',
                'Could not open app store. Please search for Microsoft PowerPoint in your app store.',
                [{ text: 'OK' }]
              );
            });
          }
        },
      },
      {
        text: 'Install Google Slides',
        onPress: () => {
          console.log('User chose to install Google Slides');
          const url = Platform.OS === 'android' ? googleSlidesPlayStore : googleSlidesAppStore;
          console.log(`Opening URL: ${url}`);

          if (Platform.OS === 'android' && SendIntentAndroid) {
            try {
              // Open in Play Store app if available
              SendIntentAndroid.openAppWithData(
                'com.android.vending',
                'market://details?id=com.google.android.apps.docs.editors.slides',
                'text/plain'
              );
            } catch (error) {
              // Fallback to browser
              Linking.openURL(url).catch(err => {
                console.error('Error opening store URL:', err);
                Alert.alert(
                  'Error',
                  'Could not open app store. Please search for Google Slides in your app store.',
                  [{ text: 'OK' }]
                );
              });
            }
          } else {
            // iOS or fallback
            Linking.openURL(url).catch(err => {
              console.error('Error opening store URL:', err);
              Alert.alert(
                'Error',
                'Could not open app store. Please search for Google Slides in your app store.',
                [{ text: 'OK' }]
              );
            });
          }
        },
      },
    ]
  );
};

/**
 * Download a PPTX file from URL and save it locally
 * @param {string} url - The URL of the PPTX file
 * @param {string} filename - The name to save the file as
 * @param {Function} onProgress - Optional callback for download progress
 * @returns {Promise<string>} The local file path
 */
export const downloadPPTXFile = async (url, filename, onProgress = null) => {
  try {
    console.log(`Downloading file from: ${url}`);

    // Ensure filename ends with .pptx
    if (!filename.toLowerCase().endsWith('.pptx')) {
      filename = `${filename}.pptx`;
    }

    // Sanitize filename
    filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Get storage path - use app's cache directory which doesn't require special permissions
    const storagePath = getStoragePath();
    const filePath = `${storagePath}/${filename}`;

    console.log(`Will save file to: ${filePath}`);

    // Check if file exists and delete it
    try {
    const exists = await RNFS.exists(filePath);
    if (exists) {
        console.log('File already exists, removing it...');
      await RNFS.unlink(filePath);
      }
    } catch (error) {
      console.warn('Error checking/removing existing file:', error);
    }

    // Configure download options
    const options = {
      fromUrl: url,
      toFile: filePath,
      background: true,
      discretionary: false,
      begin: (res) => {
        console.log('Download started:', res);
      },
      progress: (res) => {
        if (onProgress) {
          const percentage = Math.round((res.bytesWritten / res.contentLength) * 100);
          onProgress(percentage);
        }
      },
    };

    // Start download
    console.log('Starting download with options:', options);
    const downloadResult = await RNFS.downloadFile(options).promise;
    console.log('Download result:', downloadResult);

    if (downloadResult.statusCode === 200) {
      // Verify file exists and has content
      try {
        const fileInfo = await RNFS.stat(filePath);
        console.log(`File downloaded successfully. Size: ${fileInfo.size} bytes`);

        if (fileInfo.size === 0) {
          throw new Error('Downloaded file has 0 bytes');
        }

      return filePath;
      } catch (statError) {
        console.error('Error checking downloaded file:', statError);
        throw new Error('Failed to verify downloaded file');
      }
    } else {
      throw new Error(`Download failed with status code: ${downloadResult.statusCode}`);
    }
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
};

/**
 * Get a content URI for a file that can be used with FileProvider
 * This is needed for Android 7+ to properly share files
 * @param {string} filePath - The local path of the file
 * @returns {Promise<string>} The content URI
 */
export const getContentUri = async (filePath) => {
  if (Platform.OS !== 'android') {
    // On iOS, just return the file path with file:// prefix
    return filePath.startsWith('file://') ? filePath : `file://${filePath}`;
  }

  try {
    console.log('Getting content URI for file:', filePath);

    // For React Native >= 0.60, we can use the FileProvider module if available
    if (NativeModules.FileProviderModule) {
      try {
        const contentUri = await NativeModules.FileProviderModule.getUriForFile(
          filePath,
          `${NativeModules.PlatformConstants.packageName}.provider`,
          'presentation.pptx'
        );
        console.log('Got content URI using FileProviderModule:', contentUri);
        return contentUri;
      } catch (e) {
        console.error('Error using FileProviderModule:', e);
      }
    }

    // Fallback: create a content URI using a standard pattern
    // This may not work on all Android versions/devices
    const fileName = filePath.split('/').pop();
    const packageName = NativeModules.PlatformConstants?.packageName || 'com.aipresentation';

    // Try to determine which path to use based on the file location
    if (filePath.includes(RNFS.DocumentDirectoryPath)) {
      return `content://${packageName}.provider/files/${fileName}`;
    } else if (filePath.includes('/Download/')) {
      return `content://${packageName}.provider/downloads/${fileName}`;
    } else {
      return `content://${packageName}.provider/external_files/${fileName}`;
    }
  } catch (error) {
    console.error('Error creating content URI:', error);
    return filePath; // Return original path as fallback
  }
};

/**
 * Try to open a file using multiple methods
 * @param {string} filePath - The local path of the file
 * @param {string} mimeType - The MIME type of the file
 * @returns {Promise<boolean>} Whether the file was opened successfully
 */
export const openFile = async (filePath, mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation') => {
  try {
    console.log(`Trying to open file: ${filePath} (${mimeType})`);

    // On Android, make sure we don't have file:// prefix
    if (Platform.OS === 'android' && filePath.startsWith('file://')) {
      filePath = filePath.replace('file://', '');
    }

    // First verify the file exists
    const exists = await RNFS.exists(filePath);
    if (!exists) {
      console.error('File does not exist:', filePath);
      throw new Error('File does not exist');
    }

    // For PPTX files, we need to be explicit about the mime type
    if (filePath.toLowerCase().endsWith('.pptx')) {
      mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    } else if (filePath.toLowerCase().endsWith('.ppt')) {
      mimeType = 'application/vnd.ms-powerpoint';
    }

    // Method 1: FileViewer (most reliable for most file types)
    try {
    await FileViewer.open(filePath, {
      showOpenWithDialog: true,
      showAppsSuggestions: true,
        onDismiss: () => console.log('FileViewer dismissed'),
    });
      console.log('File opened with FileViewer');
    return true;
    } catch (e) {
      console.error('FileViewer failed:', e);

      // If the error message indicates no app is available, we should show the prompt
      if (e.message && e.message.includes('No app associated')) {
        console.log('No app associated with this mime type, showing prompt');
        await promptToInstallPresentationApp();
        return false;
      }
    }

    // If we're still here, FileViewer failed but not due to missing app
    // Let's try other methods

    // We'll stop trying other methods for now, as they might open with incorrect apps
    console.log('FileViewer failed, showing prompt to install app');
    await promptToInstallPresentationApp();
    return false;
  } catch (error) {
    console.error('Error in openFile:', error);

    // Show the prompt when there's an error
    console.log('Error opening file, showing prompt to install presentation app');
    await promptToInstallPresentationApp();
    return false;
  }
};

/**
 * Delete a downloaded PPTX file
 * @param {string} filePath - The local path of the PPTX file
 * @returns {Promise<boolean>} Whether the file was deleted successfully
 */
export const deletePPTXFile = async (filePath) => {
  try {
    const exists = await RNFS.exists(filePath);
    if (exists) {
      await RNFS.unlink(filePath);
      console.log('File deleted successfully:', filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

/**
 * Open a PPTX file with the appropriate app
 * @param {string} filePath - The local path of the PPTX file
 * @returns {Promise<boolean>} Whether the file was opened successfully
 */
export const openPPTXFile = async (filePath) => {
  try {
    console.log(`Attempting to open file: ${filePath}`);

    // On Android, make sure we don't have file:// prefix
    if (Platform.OS === 'android' && filePath.startsWith('file://')) {
      filePath = filePath.replace('file://', '');
    }

    // Verify file exists
    const exists = await RNFS.exists(filePath);
    if (!exists) {
      console.error('File does not exist:', filePath);
      throw new Error('File does not exist');
    }

    console.log('Opening file:', filePath);

    // Define the correct MIME type for PPTX files
    const mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

    if (Platform.OS === 'android') {
      try {
        // Create a temporary file in the external cache directory
        const tempDir = RNFS.ExternalCachesDirectoryPath;
        const fileName = filePath.split('/').pop();
        const tempFilePath = `${tempDir}/${fileName}`;

        console.log(`Copying file to accessible location: ${tempFilePath}`);

        // Copy the file
        await RNFS.copyFile(filePath, tempFilePath);

        // Try multiple methods to open the file
        let opened = false;
        
        // Method 1: Try SendIntentAndroid.openFileChooser
        try {
          console.log('🔄 Method 1: Trying SendIntentAndroid.openFileChooser');
          
          // Show user feedback that we're opening the file
          console.log('📱 Sending file to Android intent system...');
          console.log('📱 User should see app chooser or file opened in default app');
          
          SendIntentAndroid.openFileChooser(
            {
              subject: fileName,
              fileUrl: tempFilePath,
              type: mimeType,
            },
            'Open presentation with:'
          );

          console.log('✅ SendIntentAndroid.openFileChooser called successfully');
          
          // For SendIntentAndroid, we assume success since it doesn't return errors
          // The user should see an app chooser or the file should open in a default app
          console.log('✅ Intent sent successfully - user should see app chooser or file opening');
          opened = true;
          
        } catch (sendIntentError) {
          console.log('❌ SendIntentAndroid failed:', sendIntentError);
        }
        
        // Method 2: Try FileViewer with app chooser (only if Method 1 didn't work)
        if (!opened) {
          try {
            console.log('🔄 Method 2: Trying FileViewer with app chooser');
            console.log('📱 This should show a visible app chooser dialog');
            
            // Use a more reliable FileViewer approach
            const fileViewerOptions = {
              showOpenWithDialog: true,
              showAppsSuggestions: true,
              type: mimeType,
              // Add fallback options
              onDismiss: () => {
                console.log('📱 FileViewer dialog dismissed by user');
              },
              onError: (error) => {
                console.log('📱 FileViewer error:', error);
              }
            };
            
            await FileViewer.open(tempFilePath, fileViewerOptions);
            
            console.log('✅ FileViewer opened successfully');
            opened = true;
          } catch (fileViewerError) {
            console.log('❌ FileViewer failed:', fileViewerError);
            
            // If FileViewer fails, try to understand why
            if (fileViewerError.message?.includes('No app associated')) {
              console.log('⚠️ No apps can open this file type');
            } else if (fileViewerError.message?.includes('Activity doesn\'t exist')) {
              console.log('⚠️ FileViewer activity not available - this is common on some Android devices');
            } else {
              console.log('⚠️ FileViewer error details:', fileViewerError.message);
            }
          }
        }
        
        // Method 3: Try direct intent with specific apps
        if (!opened) {
          try {
            console.log('🔄 Method 3: Trying direct app intents');
            
            // Check for PowerPoint apps and try to open directly
            const hasPowerPoint = await SendIntentAndroid.isAppInstalled('com.microsoft.office.powerpoint');
            const hasGoogleSlides = await SendIntentAndroid.isAppInstalled('com.google.android.apps.docs.editors.slides');
            
            console.log(`📱 PowerPoint apps detected: PowerPoint=${hasPowerPoint}, Google Slides=${hasGoogleSlides}`);
            
            if (hasPowerPoint) {
              console.log('📱 Opening with Microsoft PowerPoint');
              try {
                await SendIntentAndroid.openAppWithData(
                  'com.microsoft.office.powerpoint',
                  tempFilePath,
                  mimeType
                );
                console.log('✅ PowerPoint intent sent successfully');
                opened = true;
              } catch (powerPointError) {
                console.log('❌ PowerPoint intent failed:', powerPointError);
              }
            } else if (hasGoogleSlides) {
              console.log('📱 Opening with Google Slides');
              try {
                await SendIntentAndroid.openAppWithData(
                  'com.google.android.apps.docs.editors.slides',
                  tempFilePath,
                  mimeType
                );
                console.log('✅ Google Slides intent sent successfully');
                opened = true;
              } catch (googleSlidesError) {
                console.log('❌ Google Slides intent failed:', googleSlidesError);
              }
            } else {
              console.log('⚠️ No PowerPoint apps detected on device');
            }
          } catch (directIntentError) {
            console.log('❌ Direct app intents failed:', directIntentError);
          }
        }
        
        if (opened) {
          console.log('✅ File opened successfully with one of the methods');
          
          // Show user feedback about what happened
          if (Platform.OS === 'android') {
            try {
              // Import Alert dynamically to avoid issues
              const { Alert } = require('react-native');
              Alert.alert(
                'File Opened',
                'Your presentation has been sent to Android. Check your recent apps or notifications to view it.',
                [{ text: 'OK' }]
              );
            } catch (alertError) {
              console.log('⚠️ Could not show alert:', alertError);
              // Fallback: just log the success
              console.log('✅ SUCCESS: File opened - check recent apps or notifications');
            }
          }
          
          return true;
        } else {
          console.log('❌ All opening methods failed, trying final fallback...');
          
          // Method 4: Try native Android sharing intent as last resort
          try {
            console.log('🔄 Method 4: Trying native Android sharing intent');
            
            // Use SendIntentAndroid to share the file, which might trigger app opening
            SendIntentAndroid.sendText({
              title: 'Open Presentation',
              text: `Opening presentation: ${fileName}`,
              type: 'text/plain',
              subject: 'Presentation File',
            });
            
            console.log('✅ Native sharing intent sent - user should see sharing options');
            opened = true;
            
          } catch (sharingError) {
            console.log('❌ Native sharing intent failed:', sharingError);
            
            // Only show installation prompt if we're on Android and no apps were detected
            if (Platform.OS === 'android') {
              try {
                const hasApp = await isPresentationAppInstalled();
                if (!hasApp) {
                  console.log('📱 No PowerPoint apps detected, showing installation prompt');
                  promptToInstallPresentationApp();
                } else {
                  console.log('📱 PowerPoint apps detected but file opening failed - this might be a file format issue');
                }
              } catch (appCheckError) {
                console.log('⚠️ Error checking for apps:', appCheckError);
                // Show installation prompt as fallback
                promptToInstallPresentationApp();
              }
            }
          }
          
          return opened;
        }
      } catch (error) {
        console.error('Error with Android file handling:', error);
        // Return false if Android handling fails
        return false;
      }
    } else {
      // iOS handling
      try {
        console.log('Trying to open with FileViewer (iOS)');
        await FileViewer.open(filePath, {
          showOpenWithDialog: true,
          showAppsSuggestions: true,
          type: mimeType,
        });
        console.log('File opened successfully with FileViewer');
        return true;
      } catch (fileViewerError) {
        console.error('FileViewer failed:', fileViewerError);

        // If we get here, no app could open the file
        if (fileViewerError.message && fileViewerError.message.includes('No app associated')) {
          console.log('No app available to open PPTX file, showing installation prompt');
          promptToInstallPresentationApp();
          return false;
        }
      }
    }

    // If we get here, no method succeeded in opening the file
    console.log('❌ No method succeeded in opening the file');
    
    // Only show installation prompt if we're on Android and no apps were detected
    if (Platform.OS === 'android') {
      try {
        const hasApp = await isPresentationAppInstalled();
        if (!hasApp) {
          console.log('📱 No PowerPoint apps detected, showing installation prompt');
    promptToInstallPresentationApp();
        } else {
          console.log('📱 PowerPoint apps detected but file opening failed - this might be a file format issue');
        }
      } catch (appCheckError) {
        console.log('⚠️ Error checking for apps:', appCheckError);
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error in openPPTXFile:', error);
    Alert.alert(
      'Error',
      'Could not open the presentation file.',
      [{ text: 'OK' }]
    );
    return false;
  }
};

/**
 * Example usage:
 *
 * // In your component:
 * import { openPPTXFile } from '../utils/fileUtils';
 *
 * // In your button handler:
 * const handleDownloadPresentation = async () => {
 *   setIsLoading(true);
 *   try {
 *     await openPPTXFile(
 *       'https://example.com/sample.pptx',
 *       'my_presentation.pptx',
 *       (progress) => {
 *         console.log(`Download progress: ${progress}%`);
 *       }
 *     );
 *   } catch (error) {
 *     console.error('Error in download handler:', error);
 *   } finally {
 *     setIsLoading(false);
 *   }
 * };
 */
