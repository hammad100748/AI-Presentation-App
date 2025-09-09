import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { openPPTXFile } from '../utils/fileUtils';
import { ImagesPath } from '../constants/ImagesPath';
import adjust from '../utils/adjust';
import { sharePptxFile, shareText } from '../utils/shareUtils';
import crashlytics from '@react-native-firebase/crashlytics';
import { showToast } from '../utils/showTost';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface PresentationViewerProps {
  visible: boolean;
  onClose: () => void;
  presentation: {
    id: string;
    title: string;
    slides: number;
    filePath?: string;
    downloadUrl: string;
    topic?: string;
    templateName?: string;
  };
}

const PresentationViewer: React.FC<PresentationViewerProps> = ({
  visible,
  onClose,
  presentation,
}) => {
  const [currentSlide, setCurrentSlide] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();



  const handleOpenInExternalApp = async () => {
    if (!presentation.filePath) {
      Alert.alert(
        'File Not Available',
        'Please download the presentation first to view it in an external app.',
        [
          { text: 'Download', onPress: () => onClose() },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }

    try {
      setIsLoading(true);

      
      const success = await openPPTXFile(presentation.filePath);
      
      if (success) {

      } else {
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
                // You could add logic to open app store

              }
            },
            {
              text: 'OK',
              style: 'default'
            }
          ]
        );
      }
    } catch (error: any) {
      console.error('❌ Error opening presentation in external app:', error);
      Alert.alert(
        'Error Opening File',
        `Could not open the presentation: ${error.message || 'Unknown error'}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePowerPointOnline = () => {
    Alert.alert(
      'PowerPoint Online Access',
      `To view your presentation in PowerPoint Online:

1. Go to https://slidesgpt.com
2. Sign in to your account  
3. Find presentation ID: ${presentation.id}
4. Click "View" or "Open in PowerPoint"

The embed URL requires authentication and cannot be opened directly in a browser.`,
      [
        {
          text: 'Copy ID',
          onPress: () => {

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

  const handleShare = async () => {
    try {
      console.log('Sharing presentation from PresentationViewer...');

      // If we have a local file, share it
      if (presentation.filePath) {
        console.log(`Sharing local file: ${presentation.filePath}`);
        await sharePptxFile(
          presentation.filePath,
          presentation.title,
        );
      }
      // Otherwise, share the download URL
      else if (presentation.downloadUrl) {
        console.log(`Sharing download URL: ${presentation.downloadUrl}`);
        await shareText(
          presentation.title,
          `Check out my presentation: ${presentation.title}`,
          presentation.downloadUrl,
        );
      } else {
        // If we don't have a URL either, just share the title
        console.log('No file or URL available, sharing text only');
        await shareText(
          presentation.title,
          `Check out my presentation: ${presentation.title}`,
        );
      }
    } catch (error: any) {
      console.error('Error sharing presentation:', error);
      crashlytics().recordError(error);
      
      // Check for network-related errors and show toast
      if (error.message?.includes('network') || 
          error.message?.includes('Network') ||
          error.message?.includes('connection') ||
          error.message?.includes('Connection') ||
          error.message?.includes('timeout') ||
          error.message?.includes('Timeout') ||
          error.message?.includes('fetch') ||
          error.message?.includes('FETCH_ERROR')) {
        showToast('Network error. Please check your internet connection and try again.');
        return;
      }
      
      Alert.alert('Error', 'Cannot share presentation');
    }
  };

  const renderSlidePreview = (slideNumber: number) => (
    <View key={slideNumber} style={styles.slidePreview}>
      <View style={styles.slideNumber}>
        <Text style={styles.slideNumberText}>{slideNumber}</Text>
      </View>
      <View style={styles.slideContent}>
        <Text style={styles.slideTitle}>Slide {slideNumber}</Text>
        <Text style={styles.slideDescription}>
          {slideNumber === 1 ? 'Title Slide' : 
           slideNumber === 2 ? 'Content Slide' : 
           slideNumber === 3 ? 'Summary Slide' : 'Content Slide'}
        </Text>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {presentation.title}
          </Text>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
              <Text style={styles.shareButtonText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Presentation Info */}
        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Topic:</Text>
            <Text style={styles.infoValue}>{presentation.topic || 'Not specified'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Template:</Text>
            <Text style={styles.infoValue}>{presentation.templateName || 'Default'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Slides:</Text>
            <Text style={styles.infoValue}>{presentation.slides}</Text>
          </View>
        </View>

        {/* Slides Overview */}
        <View style={styles.slidesContainer}>
          <Text style={styles.slidesTitle}>Slides Overview</Text>
          <ScrollView 
            style={styles.slidesScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.slidesContent}
          >
            {Array.from({ length: presentation.slides }, (_, i) => 
              renderSlidePreview(i + 1)
            )}
          </ScrollView>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {/* Open in External App */}
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={handleOpenInExternalApp}
            disabled={isLoading || !presentation.filePath}
          >
            <Text style={styles.primaryButtonText}>
              {isLoading ? 'Opening...' : 'Open in PowerPoint'}
            </Text>
          </TouchableOpacity>

          {/* PowerPoint Online */}
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={handlePowerPointOnline}
          >
            <Text style={styles.secondaryButtonText}>
              PowerPoint Online
            </Text>
          </TouchableOpacity>

          {/* Download Status */}
          {!presentation.filePath && (
            <Text style={styles.downloadNote}>
              💡 Download the presentation first to open it in external apps
            </Text>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: adjust(16),
    paddingVertical: adjust(12),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E9F0',
  },
  closeButton: {
    width: adjust(32),
    height: adjust(32),
    borderRadius: adjust(16),
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: adjust(18),
    color: '#666',
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    fontSize: adjust(18),
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginHorizontal: adjust(16),
  },
  headerRight: {
    width: adjust(60),
    alignItems: 'flex-end',
  },
  shareButton: {
    paddingHorizontal: adjust(12),
    paddingVertical: adjust(6),
    borderRadius: adjust(6),
    backgroundColor: '#4F67ED',
  },
  shareButtonText: {
    color: 'white',
    fontSize: adjust(12),
    fontWeight: '600',
  },
  infoContainer: {
    padding: adjust(16),
    backgroundColor: '#F8F9FA',
    margin: adjust(16),
    borderRadius: adjust(12),
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: adjust(8),
  },
  infoLabel: {
    fontSize: adjust(14),
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: adjust(14),
    color: '#333',
    fontWeight: '600',
  },
  slidesContainer: {
    flex: 1,
    paddingHorizontal: adjust(16),
  },
  slidesTitle: {
    fontSize: adjust(16),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: adjust(12),
  },
  slidesScroll: {
    flex: 1,
  },
  slidesContent: {
    paddingBottom: adjust(20),
  },
  slidePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: adjust(12),
    borderRadius: adjust(8),
    marginBottom: adjust(8),
    borderWidth: 1,
    borderColor: '#E5E9F0',
  },
  slideNumber: {
    width: adjust(32),
    height: adjust(32),
    borderRadius: adjust(16),
    backgroundColor: '#4F67ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: adjust(12),
  },
  slideNumberText: {
    color: 'white',
    fontSize: adjust(14),
    fontWeight: 'bold',
  },
  slideContent: {
    flex: 1,
  },
  slideTitle: {
    fontSize: adjust(14),
    fontWeight: '600',
    color: '#333',
    marginBottom: adjust(4),
  },
  slideDescription: {
    fontSize: adjust(12),
    color: '#666',
  },
  actionsContainer: {
    padding: adjust(16),
    borderTopWidth: 1,
    borderTopColor: '#E5E9F0',
    backgroundColor: '#fff',
  },
  actionButton: {
    paddingVertical: adjust(14),
    paddingHorizontal: adjust(24),
    borderRadius: adjust(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: adjust(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: adjust(4),
    elevation: 3,
  },
  primaryButton: {
    backgroundColor: '#4F67ED',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: adjust(16),
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#10B981',
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: adjust(16),
    fontWeight: '600',
  },
  downloadNote: {
    fontSize: adjust(12),
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: adjust(8),
  },
});

export default PresentationViewer;
