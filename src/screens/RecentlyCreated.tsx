import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigations';
import { getRecentPresentations, deleteRecentPresentation, RecentPresentation } from '../utils/presentationStorage';
import { openPPTXFile } from '../utils/fileUtils';
import * as FileSystem from 'react-native-fs';
import { sharePptxFile, shareText } from '../utils/shareUtils';
import { showToast } from '../utils/showTost';
import Ionicons from '@react-native-vector-icons/ionicons';
import crashlytics from '@react-native-firebase/crashlytics';
import { usePurchases } from '../context/SubscriptionContext';
import { useRewardedContext } from '../context/RewardedAdContext';
import ShareAdBottomSheet from '../components/ShareAdBottomSheet';
import { NativeAdView, NativeAsset, NativeAssetType } from 'react-native-google-mobile-ads';

type RecentlyCreatedNavigationProp = NativeStackNavigationProp<RootStackParamList, 'RecentlyCreated'>;

const RecentlyCreated = () => {
  const navigation = useNavigation<RecentlyCreatedNavigationProp>();
  const { isSubscribed } = usePurchases();
  const { showRewardedAd, nativeAd }: any = useRewardedContext();
  const [presentations, setPresentations] = useState<RecentPresentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showShareAdSheet, setShowShareAdSheet] = useState(false);
  const [presentationToShare, setPresentationToShare] = useState<RecentPresentation | null>(null);
  const [pendingShareAfterSubscribe, setPendingShareAfterSubscribe] = useState(false);
  const isFocused = useIsFocused();

  // Hide ShareAdBottomSheet if user subscribes
  useEffect(() => {
    if (isSubscribed && showShareAdSheet) {
      setShowShareAdSheet(false);
    }
  }, [isSubscribed, showShareAdSheet]);

  // Load presentations when the screen is focused
  useFocusEffect(
    React.useCallback(() => {
      console.log('RecentlyCreated screen focused, loading presentations...');
      loadPresentations();
      return () => {
        // Cleanup if needed
      };
    }, [])
  );

  useEffect(() => {
    if (
      isFocused &&
      isSubscribed &&
      pendingShareAfterSubscribe &&
      presentationToShare
    ) {
      handleSharePresentation(presentationToShare);
      setPendingShareAfterSubscribe(false);
      setPresentationToShare(null);
    }
  }, [isFocused, isSubscribed, pendingShareAfterSubscribe, presentationToShare]);

  const loadPresentations = async () => {
    try {
      setLoading(true);
      const recentPresentations = await getRecentPresentations();
      console.log(`Loaded ${recentPresentations.length} recent presentations`);
      setPresentations(recentPresentations);
    } catch (error:any) {
      console.error('Error loading recent presentations:', error);
      crashlytics().recordError(error);
      Alert.alert('Error', 'Cannot load presentations');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    console.log('Going back to Home screen');
    navigation.goBack();
  };

  const handleOpenPresentation = async (presentation: RecentPresentation) => {
    try {
      console.log(`Opening presentation: ${presentation.title}`);

      if (presentation.filePath) {
        // Check if the file exists
        const exists = await FileSystem.exists(presentation.filePath);

        if (exists) {
          // Open the file
          const filePath = Platform.OS === 'android'
            ? presentation.filePath.replace('file://', '')
            : presentation.filePath;

          console.log(`Opening file: ${filePath}`);
          openPPTXFile(filePath);
        } else {
          // File doesn't exist, navigate to presentation result to download again
          console.log('File not found, navigating to presentation result screen');
          navigation.navigate('PresentationResult', {
            presentationUrl: presentation.downloadUrl,
            templateName: presentation.templateName,
          });
        }
      } else {
        // No file path, navigate to presentation result
        navigation.navigate('PresentationResult', {
          presentationUrl: presentation.downloadUrl,
          templateName: presentation.templateName,
        });
      }
    } catch (error:any) {
      console.error('Error opening presentation:', error);
      crashlytics().recordError(error);
      Alert.alert('Error', 'Cannot open presentation');
    }
  };

  const handleShare = (presentation: RecentPresentation) => {
    if (isSubscribed) {
      // Paid user - share directly without ad
      handleSharePresentation(presentation);
    } else {
      // Free user - show ad prompt
      setPresentationToShare(presentation);
      setShowShareAdSheet(true);
    }
  };

  const handleSharePresentation = async (presentation: RecentPresentation) => {
    try {
      console.log(`Sharing presentation: ${presentation.title}`);

      if (presentation.filePath && await FileSystem.exists(presentation.filePath)) {
        // Share the local file using our utility function
        await sharePptxFile(presentation.filePath, presentation.title);
      } else {
        // Share just the text/URL if file doesn't exist
        await shareText(
          presentation.title,
          `Check out my presentation: ${presentation.title}`,
          presentation.downloadUrl
        );
      }
    } catch (error:any) {
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

  const handleWatchAdAndShare = () => {
    setShowShareAdSheet(false);
    if (presentationToShare) {
      setTimeout(() => {
        showRewardedAd(() => {
          handleSharePresentation(presentationToShare);
          setPresentationToShare(null);
        });
      }, 300);
    }
  };

  const handleCancelShare = () => {
    setShowShareAdSheet(false);
    setPresentationToShare(null);
  };

  const handleDelete = (id: string, title: string) => {
    console.log(`Delete presentation ${id}: ${title}`);
    Alert.alert(
      'Delete Presentation',
      `Delete "${title}"?`,
      [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
          onPress: async () => {
            try {
              await deleteRecentPresentation(id);
              // Refresh the list
              loadPresentations();
              console.log(`Deleted presentation ${id}`);
            } catch (error:any) {
              console.error('Error deleting presentation:', error);
              crashlytics().recordError(error);
              Alert.alert('Error', 'Cannot delete presentation');
            }
          },
        style: 'destructive',
      },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
        >
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Recently Created</Text>
        <View style={styles.placeholderRight} />
      </View>

      {/* List of presentations */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F67ED" />
          <Text style={styles.loadingText}>Loading presentations...</Text>
        </View>
      ) : presentations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No presentations yet</Text>
          <Text style={styles.emptySubtext}>Your recently created presentations will appear here</Text>
          
          {/* Native Ad in empty state - Show only for free users */}
          {nativeAd && !isSubscribed && (
            <View style={[styles.nativeAdContainer, { marginTop: 20 }]}>
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

          <TouchableOpacity
            style={styles.createButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.createButtonText}>Create Presentation</Text>
          </TouchableOpacity>

        </View>
      ) : (
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {presentations.map((item, idx) => (
          <React.Fragment key={item.id}>
            <TouchableOpacity
              style={styles.presentationCard}
              onPress={() => handleOpenPresentation(item)}
            >
              {/* Card Content */}
              <View style={styles.cardContent}>
                <View style={styles.cardInner}>
                  {/* Thumbnail */}
                  <View style={[styles.thumbnailContainer, { backgroundColor: item.color || '#4F67ED' }]} />
                  {/* Presentation Info */}
                  <View style={styles.infoContainer}>
                    <Text style={styles.presentationTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.presentationMeta}>Slides: {item.slides} • {new Date(item.createdAt).toLocaleDateString()}</Text>
                    {item.topic && (
                      <Text style={styles.presentationTopic} numberOfLines={1}>Topic: {item.topic}</Text>
                    )}
                  </View>
                  {/* Action Icons */}
                  <View style={styles.actionsContainer}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleShare(item)}
                    >
                      <Ionicons name="share-outline" size={22} color="#333333" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDelete(item.id, item.title)}
                    >
                      <Ionicons name="trash-outline" size={22} color="#333333" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
            {/* Show native ad only after the first presentation */}
            {nativeAd && !isSubscribed && idx === 0 && (
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
          </React.Fragment>
        ))}
      </ScrollView>
      )}
      <ShareAdBottomSheet
        visible={showShareAdSheet}
        onClose={handleCancelShare}
        onWatchAd={handleWatchAdAndShare}
        onCancel={handleCancelShare}
        onSubscribe={() => {
          setPendingShareAfterSubscribe(true);
          navigation.navigate('SubscriptionManagement');
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    backgroundColor: 'white',
  },
  backButton: {
    padding: 8,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholderRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  presentationCard: {
    marginBottom: 16,
  },
  cardContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardInner: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  thumbnailContainer: {
    width: 56,
    height: 40,
    borderRadius: 4,
    marginRight: 16,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  presentationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  presentationMeta: {
    fontSize: 13,
    color: '#9E9E9E',
  },
  presentationTopic: {
    fontSize: 13,
    color: '#9E9E9E',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
    borderRadius: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9E9E9E',
    marginBottom: 24,
  },
  createButton: {
    padding: 16,
    backgroundColor: '#4F67ED',
    borderRadius: 10,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  nativeAdContainer: {
    marginBottom: 16,
    marginHorizontal: 8, // Reduced horizontal margins for wider ad
    padding: 16,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    width: '95%', // Increased width to 95% of screen
    alignSelf: 'center', // Center the ad
  },
  nativeAdView: {
    padding: 16,
  },
  adHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  adHeaderText: {
    flex: 1,
  },
  adHeadline: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  adAdvertiser: {
    fontSize: 14,
    color: '#666',
  },
  adBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  adBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  adBody: {
    fontSize: 14,
    color: '#555',
    marginBottom: 12,
  },
  adCallToAction: {
    backgroundColor: '#4F67ED',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  adCallToActionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default RecentlyCreated;
