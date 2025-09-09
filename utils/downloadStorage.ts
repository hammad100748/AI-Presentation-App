import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { DownloadDetails } from './types';

const DOWNLOADS_STORAGE_KEY = '@presentation_downloads';

async function downloadPresentation(url: string): Promise<string | null> {
  if (!url) {
    console.error('Error downloading presentation: No URL provided');
    return null;
  }

  try {
    // No permission check needed - we use app-specific directories

    const timestamp = new Date().getTime();
    const filename = `presentation_${timestamp}.pptx`;

    // Define the file path in the document directory
    const fileUri = `${RNFS.DocumentDirectoryPath}/${filename}`;

    console.log(`Downloading presentation from ${url} to ${fileUri}`);

    // Download using react-native-fs
    const downloadResult = await RNFS.downloadFile({
      fromUrl: url,
      toFile: fileUri,
      background: true,
      discretionary: true,
    }).promise;

    if (downloadResult.statusCode === 200) {
      // Verify file exists after download
      const fileExists = await RNFS.exists(fileUri);
      if (!fileExists) {
        throw new Error('File download succeeded but file does not exist');
      }

      console.log(`Download completed successfully: ${fileUri}`);
      return fileUri;
    }

    console.error(`Download failed with status: ${downloadResult.statusCode}`);
    return null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error downloading presentation: ${errorMessage}`, error);

    // Try to clean up any partial downloads
    try {
      const partialPath = `${RNFS.DocumentDirectoryPath}/presentation_${new Date().getTime()}.pptx`;
      const fileExists = await RNFS.exists(partialPath);
      if (fileExists) {
        await RNFS.unlink(partialPath);
      }
    } catch (cleanupError) {
      console.warn('Failed to clean up partial download:', cleanupError);
    }

    return null;
  }
}

export const downloadStorage = {
  // Save a new download
  async saveDownload(details: DownloadDetails): Promise<void> {
    if (!details || !details.id) {
      throw new Error('Invalid download details: missing required fields');
    }

    try {
      // Get existing downloads
      const existingDownloads = await this.getDownloads();

      // Check for duplicates
      const isDuplicate = existingDownloads.some(download => download.id === details.id);
      if (isDuplicate) {
        console.warn(`Download with ID ${details.id} already exists, updating instead`);
        return await this.updateDownloadStatus(details.id, details.status);
      }

      // Add new download
      const updatedDownloads = [...existingDownloads, details];

      // Save to storage
      await AsyncStorage.setItem(DOWNLOADS_STORAGE_KEY, JSON.stringify(updatedDownloads));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error saving download: ${errorMessage}`, error);
      throw new Error(`Failed to save download: ${errorMessage}`);
    }
  },

  // Get all downloads
  async getDownloads(): Promise<DownloadDetails[]> {
    try {
      const downloads = await AsyncStorage.getItem(DOWNLOADS_STORAGE_KEY);

      if (!downloads) {
        return [];
      }

      try {
        const parsedDownloads = JSON.parse(downloads);
        if (!Array.isArray(parsedDownloads)) {
          console.warn('Downloads data is not an array, returning empty array');
          return [];
        }
        return parsedDownloads;
      } catch (parseError) {
        console.error('Error parsing downloads data:', parseError);
        // If data is corrupted, return empty array and reset storage
        await AsyncStorage.setItem(DOWNLOADS_STORAGE_KEY, JSON.stringify([]));
        return [];
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error getting downloads: ${errorMessage}`, error);
      return [];
    }
  },

  // Get a specific download by ID
  async getDownloadById(id: string): Promise<DownloadDetails | null> {
    if (!id) {
      console.warn('getDownloadById called with empty ID');
      return null;
    }

    try {
      const downloads = await this.getDownloads();
      return downloads.find(download => download.id === id) || null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error getting download by ID ${id}: ${errorMessage}`, error);
      return null;
    }
  },

  // Update a download's status
  async updateDownloadStatus(id: string, status: DownloadDetails['status']): Promise<void> {
    if (!id) {
      throw new Error('Download ID is required to update status');
    }

    try {
      const downloads = await this.getDownloads();
      const downloadIndex = downloads.findIndex(download => download.id === id);

      if (downloadIndex === -1) {
        throw new Error(`Download with ID ${id} not found`);
      }

      const updatedDownloads = [...downloads];
      updatedDownloads[downloadIndex] = {
        ...updatedDownloads[downloadIndex],
        status,
      };

      await AsyncStorage.setItem(DOWNLOADS_STORAGE_KEY, JSON.stringify(updatedDownloads));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error updating download status: ${errorMessage}`, error);
      throw new Error(`Failed to update download status: ${errorMessage}`);
    }
  },

  // Delete a download
  async deleteDownload(id: string): Promise<void> {
    if (!id) {
      throw new Error('Download ID is required to delete');
    }

    try {
      const downloads = await this.getDownloads();
      const downloadToDelete = downloads.find(download => download.id === id);

      if (!downloadToDelete) {
        console.warn(`Download with ID ${id} not found, nothing to delete`);
        return;
      }

      // Try to delete the local file if it exists
      if (downloadToDelete.localPath) {
        try {
          const fileInfo = await RNFS.exists(downloadToDelete.localPath);
          if (fileInfo) {
            await RNFS.unlink(downloadToDelete.localPath);
          }
        } catch (fileError) {
          console.warn(`Could not delete file at ${downloadToDelete.localPath}:`, fileError);
        }
      }

      const updatedDownloads = downloads.filter(download => download.id !== id);
      await AsyncStorage.setItem(DOWNLOADS_STORAGE_KEY, JSON.stringify(updatedDownloads));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error deleting download: ${errorMessage}`, error);
      throw new Error(`Failed to delete download: ${errorMessage}`);
    }
  },

  // Clear all downloads
  async clearDownloads(): Promise<void> {
    try {
      // Get all downloads to delete files
      const downloads = await this.getDownloads();

      // Try to delete all local files
      for (const download of downloads) {
        if (download.localPath) {
          try {
            const fileInfo = await RNFS.exists(download.localPath);
            if (fileInfo) {
              await RNFS.unlink(download.localPath);
            }
          } catch (fileError) {
            console.warn(`Could not delete file at ${download.localPath}:`, fileError);
          }
        }
      }

      await AsyncStorage.removeItem(DOWNLOADS_STORAGE_KEY);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error clearing downloads: ${errorMessage}`, error);
      throw new Error(`Failed to clear downloads: ${errorMessage}`);
    }
  },

  downloadPresentation,
};
