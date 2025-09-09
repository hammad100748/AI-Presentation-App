import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { downloadStorage } from '../../utils/downloadStorage';
import { PresentationData } from '../../utils/types';
import { showToast } from '../utils/showTost';

interface DownloadButtonProps {
  url: string;
  title: string;
  topic: string;
  template: string;
  presentationData: PresentationData;
  onDownloadComplete?: (localPath: string) => void;
  onDownloadError?: (error: Error) => void;
}

const DownloadButton: React.FC<DownloadButtonProps> = ({
  url,
  title,
  topic,
  template,
  presentationData,
  onDownloadComplete,
  onDownloadError,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);

      // No permission check needed - we use app-specific directories

      // We have permission, proceed with download
      const downloadId = `download_${new Date().getTime()}`;

      // Save initial download entry
      await downloadStorage.saveDownload({
        id: downloadId,
        topic,
        downloadUrl: url,
        localPath: '', // Will be updated after download
        downloadDate: new Date().toISOString(),
        status: 'downloading',
        template,
        presentationData,
      });

      // Start download
      const localPath = await downloadStorage.downloadPresentation(url);

      if (localPath) {
        // Update download status
        await downloadStorage.updateDownloadStatus(downloadId, 'downloaded');

        // Call success callback
        onDownloadComplete?.(localPath);

        Alert.alert('Success', 'Download completed successfully');
      } else {
        // Update download status
        await downloadStorage.updateDownloadStatus(downloadId, 'failed');

        // Call error callback
        onDownloadError?.(new Error('Download failed'));

        Alert.alert('Error', 'Cannot download file');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Download error:', errorMessage);

      // Check for network-related errors and show toast
      if (error instanceof Error && (
        error.message?.includes('network') || 
        error.message?.includes('Network') ||
        error.message?.includes('connection') ||
        error.message?.includes('Connection') ||
        error.message?.includes('timeout') ||
        error.message?.includes('Timeout') ||
        error.message?.includes('fetch') ||
        error.message?.includes('FETCH_ERROR')
      )) {
        showToast('Network error. Please check your internet connection and try again.');
        return;
      }

      // Call error callback
      onDownloadError?.(error instanceof Error ? error : new Error(errorMessage));

      Alert.alert('Error', 'Cannot download file');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handleDownload}
      disabled={isDownloading}
    >
      {isDownloading ? (
        <ActivityIndicator color="#ffffff" />
      ) : (
        <Text style={styles.buttonText}>Download</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DownloadButton;
