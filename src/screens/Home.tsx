import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Platform,
  ImageBackground,
  Alert,
  ActivityIndicator,
  Image,
  Linking,
  Dimensions,
} from 'react-native';
import { useNavigation, useFocusEffect, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigations';
import GradientButton from '../components/GradientButton';
import { useAuth } from '../context/AuthContext';
import { useAppUsage } from '../context/AppUsageContext';
import { useTokens } from '../context/TokenContext';
import { showToast } from '../utils/showTost';
import PaywallModal from '../components/PaywallModal';
import TokenUsageBottomSheet from '../components/TokenUsageBottomSheet';
import ShareAdBottomSheet from '../components/ShareAdBottomSheet';
import Ionicons from '@react-native-vector-icons/ionicons';
import {
  getRecentPresentations,
  RecentPresentation,
  deleteRecentPresentation,
} from '../utils/presentationStorage';
import * as FileSystem from 'react-native-fs';
import { openPPTXFile } from '../utils/fileUtils';
import { sharePptxFile, shareText } from '../utils/shareUtils';
import { ImagesPath } from '../constants/ImagesPath';
import crashlytics from '@react-native-firebase/crashlytics';
import { useRewardedContext } from '../context/RewardedAdContext';
import { usePurchases } from '../context/SubscriptionContext';
import {
  NativeAdView,
  NativeAsset,
  NativeAssetType,
  AdEventType, AppOpenAd, TestIds
} from 'react-native-google-mobile-ads';
import adjust from '../utils/adjust';

// Import gradient background
const gradientBg = require('../assets/images/gradient_bg.jpeg');

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Home'
>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const Home = () => {
  const { isSubscribed, initialized: subscriptionInitialized } = usePurchases();
  const { showRewardedAd, nativeAd }: any = useRewardedContext();
  const { totalTokens, isFreeUser, loading: tokensLoading, tokens } = useTokens();

  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [inputText, setInputText] = useState('');
  const [validationError, setValidationError] = useState('');
  const { signInWithGoogle, currentUser, loading, logout } = useAuth();
  const { shouldShowPaywall, initialized: appUsageInitialized } = useAppUsage();
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [recentPresentations, setRecentPresentations] = useState<
    RecentPresentation[]
  >([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [showShareAdSheet, setShowShareAdSheet] = useState(false);
  const [presentationToShare, setPresentationToShare] =
    useState<RecentPresentation | null>(null);
  const [pendingShareAfterSubscribe, setPendingShareAfterSubscribe] = useState(false);
  const [showTokenSheet, setShowTokenSheet] = useState(false);
  const [appOpenAdInstance, setAppOpenAdInstance] = useState<any>(null);



  const isFocused = useIsFocused();

  // Determine if it's safe to show paywall - wait for all states to be properly loaded
  const canShowPaywall = React.useMemo(() => {
    const allStatesLoaded = subscriptionInitialized && 
                           appUsageInitialized && 
                           !tokensLoading && 
                           !!currentUser;
    
    console.log('🔍 [PAYWALL_LOGIC] Can show paywall check:', {
      subscriptionInitialized,
      appUsageInitialized,
      tokensLoading,
      currentUser: !!currentUser,
      isSubscribed,
      shouldShowPaywall,
      allStatesLoaded,
      finalDecision: allStatesLoaded && !isSubscribed && shouldShowPaywall
    });
    
    return allStatesLoaded && !isSubscribed && shouldShowPaywall;
  }, [subscriptionInitialized, appUsageInitialized, tokensLoading, currentUser, isSubscribed, shouldShowPaywall]);

  // Add debugging logs for paywall visibility
  useEffect(() => {
    console.log('🏠 Home Screen Debug:', {
      isSubscribed,
      shouldShowPaywall,
      totalTokens,
      subscriptionInitialized,
      appUsageInitialized,
      tokensLoading,
      isFreeUser,
      currentUser: !!currentUser,
      canShowPaywall
    });
  }, [isSubscribed, shouldShowPaywall, totalTokens, subscriptionInitialized, appUsageInitialized, tokensLoading, isFreeUser, currentUser, canShowPaywall]);

  // Hide ShareAdBottomSheet if user subscribes
  useEffect(() => {
    if (isSubscribed && showShareAdSheet) {
      setShowShareAdSheet(false);
    }
  }, [isSubscribed, showShareAdSheet]);

  // Load presentations when home screen is focused
  useFocusEffect(
    React.useCallback(() => {
      // Load presentations regardless of login status
      loadRecentPresentations();

      // Visit/closure tracking is now handled by AppUsageContext
      return () => {
        // Cleanup if needed
      };
    }, []),
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

  useEffect(() => {
    // Cleanup function to remove any existing ad instance
    const cleanup = () => {
      if (appOpenAdInstance) {
        console.log('🧹 [APP_OPEN] Cleaning up existing ad instance');
        try {
          // Try to destroy the existing instance if possible
          setAppOpenAdInstance(null);
        } catch (e) {
          console.warn('⚠️ [APP_OPEN] Error cleaning up ad instance:', e);
        }
      }
    };

    try {      
      console.log('🔍 [APP_OPEN] useEffect triggered with:', {
        tokensLoading,
        isFreeUser,
        totalTokens,
        currentUser: !!currentUser,
        isFocused,
        tokens: JSON.stringify(tokens),
        hasExistingAdInstance: !!appOpenAdInstance
      });

      // Always cleanup first
      cleanup();

      // Don't run if tokens are still loading
      if (tokensLoading) {
        console.log('⏳ [APP_OPEN] Tokens still loading, skipping ad');
        return cleanup;
      }

      // Don't run if user is not free (has premium tokens)
      if (!isFreeUser) {
        console.log('💎 [APP_OPEN] User is premium (has premium tokens), skipping ad. Current tokens:', tokens);
        return cleanup;
      }

      // Don't run if screen is not focused
      if (!isFocused) {
        console.log('👁️ [APP_OPEN] Screen not focused, skipping ad');
        return cleanup;
      }

      // Don't run if no user is logged in
      if (!currentUser) {
        console.log('👤 [APP_OPEN] No user logged in, skipping ad');
        return cleanup;
      }

      console.log('⚠️ [APP_OPEN] WARNING: All conditions met - showing App Open Ad for free user');
      console.log('🚨 [APP_OPEN] DETAILED STATUS:', {
        tokensLoading,
        isFreeUser,
        tokens,
        totalTokens,
        currentUser: currentUser?.uid,
        isFocused
      });

      const adUnitId = __DEV__ ? TestIds.APP_OPEN : 'ca-app-pub-1643025320304360/6913018358';

      const newAppOpenAdInstance = AppOpenAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: false,
      });

      setAppOpenAdInstance(newAppOpenAdInstance);

      const removeLoadedListener = newAppOpenAdInstance.addAdEventListener(
        AdEventType.LOADED,
        () => {
          try {
            // Double-check user status before showing
            if (!isFreeUser) {
              console.log('🛑 [APP_OPEN] User is now premium, NOT showing loaded ad');
              return;
            }
            console.log('📱 [APP_OPEN] Ad loaded successfully, showing...');
            newAppOpenAdInstance.show();
          } catch (e) {
            console.warn('❌ [APP_OPEN] Show error:', e);
          }
        }
      );

      const removeClosedListener = newAppOpenAdInstance.addAdEventListener(
        AdEventType.CLOSED,
        async () => {
          console.log('✅ [APP_OPEN] Ad closed by user');

          // Cleanup listeners and instance
          removeLoadedListener?.();
          removeErrorListener?.();
          removeClosedListener?.();
          setAppOpenAdInstance(null);
        }
      );

      const removeErrorListener = newAppOpenAdInstance.addAdEventListener(
        AdEventType.ERROR,
        (e: any) => {
          const msg = e?.message || JSON.stringify(e);
          console.warn('❌ [APP_OPEN] Load error:', msg);

          // Cleanup listeners and instance on error
          removeLoadedListener?.();
          removeErrorListener?.();
          removeClosedListener?.();
          setAppOpenAdInstance(null);
        }
      );

      try {
        console.log('🔄 [APP_OPEN] Starting ad load...');
        newAppOpenAdInstance.load();
      } catch (e) {
        console.warn('❌ [APP_OPEN] Load call failed:', e);
        setAppOpenAdInstance(null);
      }

      // Return cleanup function
      return () => {
        console.log('🧹 [APP_OPEN] useEffect cleanup called');
        removeLoadedListener?.();
        removeErrorListener?.();
        removeClosedListener?.();
        setAppOpenAdInstance(null);
      };

    } catch (error) {
      console.error('💥 [APP_OPEN] Error in App Open Ad logic:', error);
      return cleanup;
    }
  }, [tokensLoading, isFreeUser, isFocused, currentUser, tokens])


  const loadRecentPresentations = async () => {
    try {
      setLoadingRecent(true);
      const presentations = await getRecentPresentations();
      // Get only the first 3 presentations for the home screen
      setRecentPresentations(presentations.slice(0, 3));
      console.log(`Loaded ${presentations.length} recent presentations`);
    } catch (error) {
      console.error('Error loading recent presentations:', error);
      crashlytics().recordError(error as Error);
    } finally {
      setLoadingRecent(false);
    }
  };

  const handleTopicPress = (topic: string) => {
    setInputText(topic);
  };

  const navigateToRecentlyCreated = () => {
    console.log('Navigating to RecentlyCreated screen');
    navigation.navigate('RecentlyCreated');
  };

  const handleGoogleSignIn = async () => {
    try {
      // signInWithGoogle already sets loading state internally
      const result = await signInWithGoogle();
      console.log('Google Sign-In Successful', result?.user?.displayName);
    } catch (error: any) {
      console.error('Failed to sign in with Google:', error);
      crashlytics().recordError(error as Error);

      // Show more specific error message when possible
      Alert.alert('Sign In Failed', 'Please try again');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setProfileMenuVisible(false);
      console.log('Logged out successfully');
      // Navigate to Login screen
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Error logging out:', error);
      crashlytics().recordError(error as Error);
      Alert.alert('Logout Failed', 'Please try again');
    }
  };

  const handleAccountSettings = () => {
    setProfileMenuVisible(false);
    // Navigate to account settings page
    Alert.alert('Coming Soon', 'Account settings will be available soon');
  };

  const toggleProfileMenu = () => {
    // Navigate to Settings screen instead of showing dropdown
    navigation.navigate('Settings');
  };

  const handleOpenPresentation = async (presentation: RecentPresentation) => {
    try {
      if (presentation.filePath) {
        // Check if the file exists
        const exists = await FileSystem.exists(presentation.filePath);

        if (exists) {
          // Open the file
          const filePath =
            Platform.OS === 'android'
              ? presentation.filePath.replace('file://', '')
              : presentation.filePath;

          console.log(`Opening file: ${filePath}`);
          openPPTXFile(filePath);
        } else {
          // File doesn't exist, navigate to presentation result to download again

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
    } catch (error) {
      console.error('Error opening presentation:', error);
      crashlytics().recordError(error as Error);
      Alert.alert('Error', 'Cannot open presentation');
    }
  };

  const handleSharePresentation = async (presentation: RecentPresentation) => {
    try {
      if (
        presentation.filePath &&
        (await FileSystem.exists(presentation.filePath))
      ) {
        // Share the local file using our utility function
        await sharePptxFile(presentation.filePath, presentation.title);
      } else {
        // Share just the text/URL if file doesn't exist
        await shareText(
          presentation.title,
          `Check out my presentation: ${presentation.title}`,
          presentation.downloadUrl,
        );
      }
    } catch (error) {
      console.error('Error sharing presentation:', error);
      crashlytics().recordError(error as Error);

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

      Alert.alert('Error', 'Cannot share presentation');
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

  const handleDeletePresentation = (id: string, title: string) => {
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
              loadRecentPresentations();
              console.log(`Deleted presentation ${id}`);
            } catch (error) {
              console.error('Error deleting presentation:', error);
              crashlytics().recordError(error as Error);
              Alert.alert('Error', 'Cannot delete presentation');
            }
          },
          style: 'destructive',
        },
      ],
    );
  };

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

        {/* Paywall Modal - Only show when all states are confirmed loaded and user needs paywall */}
        <PaywallModal visible={canShowPaywall} />

        {/* SafeAreaView for top only, with Android status bar height padding */}
        <SafeAreaView
          style={styles.safeArea}>
          <View style={styles.header}>
            <View style={styles.appIconContainer}>
              <Image
                source={ImagesPath.appIcon}
                style={{
                  width: 33,
                  height: 33,
                  borderRadius: 8,
                  backgroundColor: 'transparent',
                }}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.appTitle}>Slides AI Presentation</Text>
            <View style={styles.headerRightContainer}>
              {currentUser ? (
                <View style={styles.userInfoContainer}>
                  <TouchableOpacity
                    style={styles.tokenContainer}
                    onPress={() =>
                      navigation.navigate('SubscriptionManagement')
                    }
                    activeOpacity={0.7}>

                    <Text style={styles.tokenIcon}>🪙</Text>
                    <Text style={styles.tokenCount}>{totalTokens}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={toggleProfileMenu}
                    style={styles.profileButton}>
                    <Ionicons name="settings-outline" size={22} color="#333" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.signInButton}
                  onPress={handleGoogleSignIn}
                  disabled={loading}>
                  {loading ? (
                    <ActivityIndicator size="small" color="#4F67ED" />
                  ) : (
                    <Text style={styles.signInButtonText}>Sign In</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Profile Dropdown Menu */}
          {profileMenuVisible && (
            <View style={styles.profileMenuContainer}>
              <Text style={styles.profileMenuTitle}>
                {currentUser?.displayName || 'User'}
              </Text>

              <View style={styles.menuDivider} />

              <TouchableOpacity
                style={styles.profileMenuItem}
                onPress={handleAccountSettings}>
                <Text style={styles.profileMenuItemIcon}>👤</Text>
                <Text style={styles.profileMenuItemText}>Account</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.profileMenuItem}
                onPress={handleLogout}>
                <Text style={styles.profileMenuItemIcon}>🚪</Text>
                <Text style={styles.profileMenuItemText}>Logout</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Backdrop for profile menu */}
          {profileMenuVisible && (
            <TouchableOpacity
              style={styles.profileMenuBackdrop}
              onPress={() => setProfileMenuVisible(false)}
              activeOpacity={1}
            />
          )}

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollViewContent}>
            <View style={styles.container}>
              <View>
                <TextInput
                  style={[styles.input, { position: 'relative' }]}
                  placeholder="Enter your presentation topic or outline here..."
                  multiline
                  numberOfLines={10}
                  placeholderTextColor="#A0A0A0"
                  value={inputText}
                  onChangeText={text => {
                    setInputText(text);
                    // Clear validation error when user starts typing
                    if (validationError) {
                      setValidationError('');
                    }
                  }}
                />
                {inputText.length > 0 && (
                  <TouchableOpacity
                    style={{
                      position: 'absolute',
                      right: 5,
                      bottom: 10,
                      backgroundColor: '#eee',
                      borderRadius: 12,
                    }}
                    onPress={() => setInputText('')}>
                    <Ionicons name="close-circle" size={22} color="#888" />
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.charCount}>
                {inputText.length}/300 characters
              </Text>
              {/* Validation Error Message */}
              {validationError ? (
                <Text style={styles.errorText}>{validationError}</Text>
              ) : null}
              {/* Popular Topics */}
              <View style={styles.topicsSection}>
                <Text style={styles.topicsTitle}>Popular Topics:</Text>

                <TouchableOpacity
                  style={styles.topicButton}
                  onPress={() =>
                    handleTopicPress(
                      'Data Visualization and presentation techniques',
                    )
                  }>
                  <Text style={styles.topicText}>
                    Data Visualization and presentation techniques
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.topicButton}
                  onPress={() =>
                    handleTopicPress('Public Speaking and Presentation Skills')
                  }>
                  <Text style={styles.topicText}>
                    Public Speaking and Presentation Skills
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.topicButton}
                  onPress={() =>
                    handleTopicPress(
                      'Effective Communication in Professional Settings',
                    )
                  }>
                  <Text style={styles.topicText}>
                    Effective Communication in Professional Settings
                  </Text>
                </TouchableOpacity>
              </View>
              {/* Create Button */}
              <GradientButton
                title="Create Presentation"
                onPress={() => {
                  // First validate input
                  const trimmedInput = inputText.trim();
                  if (!trimmedInput || trimmedInput.length < 3) {
                    setValidationError(
                      'Please enter at least 3 characters for your presentation topic or outline',
                    );
                    return;
                  }
                  setValidationError('');

                  if (isFreeUser) {
                    setShowTokenSheet(true);
                  } else {
                    navigation.navigate('GeneratingPresentation', {
                      topic: trimmedInput,
                      length: 'short',
                      slides: 3,
                      language: 'en-US',
                      tone: 'default',
                      textAmount: 'standard',
                      includeImages: false,
                      template: 'default'
                    });
                  }
                }}
                containerStyle={styles.createButtonContainer}
                gradientColors={['#2371EA', '#6E64FC']}
              />


              {/* Native Ad - Show only for free users */}
              <View style={{ alignItems: 'center' }}>
                {nativeAd && isFreeUser && (
                  <View style={styles.nativeAdContainer}>
                    <NativeAdView
                      nativeAd={nativeAd}
                      style={styles.nativeAdView}>
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

              {/* Removed banner ad */}

              {/* <View style={styles.adContainer}>{renderNativeAd()}</View> */}

              {/* Recently Created Section */}
              <View style={styles.recentSection}>
                <View style={styles.recentHeader}>
                  <Text style={styles.recentTitle}>Recently Created</Text>
                  <TouchableOpacity onPress={navigateToRecentlyCreated}>
                    <Text style={styles.seeAllText}>See All</Text>
                  </TouchableOpacity>
                </View>

                {loadingRecent ? (
                  <View style={styles.recentLoadingContainer}>
                    <ActivityIndicator size="small" color="#4F67ED" />
                    <Text style={styles.recentLoadingText}>Loading...</Text>
                  </View>
                ) : recentPresentations.length === 0 ? (
                  <View style={styles.noRecentContainer}>
                    <Text style={styles.noRecentText}>
                      No recent presentations
                    </Text>
                    <Text style={styles.noRecentSubtext}>
                      Create your first presentation!
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.recentScroll}>
                    {recentPresentations.map(presentation => (
                      <TouchableOpacity
                        key={presentation.id}
                        style={styles.recentCard}
                        onPress={() => handleOpenPresentation(presentation)}>
                        <View
                          style={[
                            styles.cardImageContainer,
                            { backgroundColor: presentation.color || '#4F67ED' },
                          ]}>
                          <Text style={styles.cardTitle}>
                            {presentation.title}
                          </Text>
                        </View>
                        <View style={styles.cardInfoContainer}>
                          <Text style={styles.cardInfoText} numberOfLines={1}>
                            {presentation.title}
                          </Text>
                          <Text style={styles.cardMetaText}>
                            Slides: {presentation.slides} •{' '}
                            {new Date(
                              presentation.createdAt,
                            ).toLocaleDateString()}
                          </Text>
                        </View>
                        <View style={styles.cardActions}>
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={e => {
                              e.stopPropagation();
                              handleShare(presentation);
                            }}>
                            <Ionicons name="share-outline" size={20} color="#333333" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={e => {
                              e.stopPropagation();
                              handleDeletePresentation(
                                presentation.id,
                                presentation.title,
                              );
                            }}>
                            <Ionicons
                              name="trash-outline"
                              size={20}
                              color="#333333"
                            />
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
              {/* Footer */}
              <View style={styles.footer}>
                <View style={styles.footerItem}>
                  <Text style={styles.footerText}>
                    ✓ Powered by AI-Driven Presentations
                  </Text>
                </View>
                <View style={styles.footerItem}>
                  <Text style={styles.footerText}>
                    🔒 100% Private & Secure
                  </Text>
                </View>
                <View style={styles.footerLinks}>
                  <TouchableOpacity
                    onPress={() =>
                      Linking.openURL(
                        'https://fordnine.com/apps/ai-presentation-maker-slides/privacy-policy.html',
                      )
                    }>
                    <Text style={styles.footerLinkText}>Privacy Policy</Text>
                  </TouchableOpacity>
                  <Text style={styles.footerDot}>•</Text>
                  <TouchableOpacity
                    onPress={() =>
                      Linking.openURL(
                        'https://fordnine.com/apps/ai-presentation-maker-slides/terms-of-use.html',
                      )
                    }>
                    <Text style={styles.footerLinkText}>Terms of Service</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </ImageBackground>

      {/* Share Ad Bottom Sheet */}
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

      {/* Token Usage Bottom Sheet for free users */}
      <TokenUsageBottomSheet
        visible={showTokenSheet}
        onClose={() => setShowTokenSheet(false)}
        onContinueLimited={() => {
          setShowTokenSheet(false);
          setTimeout(() => {
            const trimmedInput = inputText.trim();

            // After rewarded, show interstitial then navigate to loader
            showRewardedAd(() => {

              navigation.navigate('GeneratingPresentation', {
                 topic: trimmedInput,
                length: 'short',
                slides: 3,
                language: 'en-US',
                tone: 'default',
                textAmount: 'standard',
                includeImages: false,
                template: 'default'
              });              
            });

          }, 300);
        }}
        source="custom"
        showTokenWarning
        requiredTokens={1}
        zeroTokens={totalTokens === 0}
        onSubscribe={() => {
          setShowTokenSheet(false);
          navigation.navigate('SubscriptionManagement');
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: adjust(18),
    paddingVertical: adjust(10),
    marginTop: Platform.OS === 'ios' ? adjust(44) : adjust(8),
    justifyContent: 'space-between',
  },
  appIconContainer: {
    width: adjust(26),
    height: adjust(26),
    borderRadius: adjust(7),
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: adjust(5),
  },
  appIcon: {
    fontSize: adjust(13),
    color: 'white',
  },
  appTitle: {
    fontSize: adjust(16),
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    minWidth: adjust(80),
    justifyContent: 'flex-end',
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  tokenContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: adjust(10),
    paddingVertical: adjust(5),
    borderRadius: adjust(15),
    marginRight: adjust(8),
    minWidth: adjust(50),
    minHeight: adjust(32),
    justifyContent: 'center',
  },
  tokenIcon: {
    width: adjust(18),
    fontSize: adjust(12),
    marginRight: adjust(4),
  },
  tokenCount: {
    fontSize: adjust(13),
    fontWeight: '800',
    color: '#333',
    minWidth: adjust(18),
    textAlign: 'center',
  },
  userDisplayName: {
    fontSize: adjust(12),
    color: '#333',
    fontWeight: '500',
  },
  signInButton: {
    backgroundColor: '#4F67ED',
    borderRadius: adjust(8),
    paddingVertical: adjust(6),
    paddingHorizontal: adjust(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: adjust(1.5),
    elevation: 2,
  },
  signInButtonText: {
    fontSize: adjust(12),
    color: '#FFFFFF',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: adjust(16),
    paddingTop: adjust(10),
    paddingBottom: adjust(16),
  },
  input: {
    backgroundColor: 'white',
    borderRadius: adjust(12),
    padding: adjust(16),
    minHeight: adjust(150),
    textAlignVertical: 'top',
    fontSize: adjust(14),
    color: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: adjust(2),
    elevation: 2,
    marginBottom: adjust(4),
  },
  charCount: {
    alignSelf: 'flex-end',
    color: '#888',
    fontSize: adjust(12),
    marginBottom: adjust(12),
  },
  topicsSection: {
    marginBottom: adjust(16),
  },
  topicsTitle: {
    fontSize: adjust(16),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: adjust(8),
  },
  topicButton: {
    backgroundColor: 'white',
    borderRadius: adjust(10),
    padding: adjust(12),
    marginBottom: adjust(8),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: adjust(2),
    elevation: 2,
  },
  topicText: {
    fontSize: adjust(14),
    color: '#333',
  },
  createButtonContainer: {
    height: adjust(50),
    marginBottom: adjust(25),
    textAlign: 'center',
    width: '100%',
    borderRadius: adjust(10),
  },
  recentSection: {
    width: '100%',
    marginTop: adjust(20),
    marginBottom: adjust(10),
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: adjust(16),
    paddingHorizontal: adjust(4),
  },
  recentTitle: {
    fontSize: adjust(18),
    fontWeight: '600',
    color: '#333',
  },
  seeAllText: {
    color: '#6E64FC',
    fontSize: adjust(14),
  },
  recentScroll: {
    width: '100%',
  },
  recentCard: {
    width: adjust(240),
    height: adjust(180),
    backgroundColor: '#FFFFFF',
    borderRadius: adjust(16),
    marginRight: adjust(12),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: adjust(4),
    elevation: 2,
  },
  cardImageContainer: {
    backgroundColor: '#8B5CF6',
    height: adjust(100),
    padding: adjust(16),
    justifyContent: 'flex-end',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: adjust(16),
    fontWeight: '600',
  },
  cardInfoContainer: {
    padding: adjust(12),
    flex: 1,
  },
  cardInfoText: {
    fontSize: adjust(14),
    fontWeight: '500',
    color: '#333',
    marginBottom: adjust(4),
  },
  cardMetaText: {
    fontSize: adjust(12),
    color: '#666',
    marginBottom: adjust(8),
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: adjust(8),
    paddingRight: adjust(4),
    position: 'absolute',
    bottom: adjust(8),
    right: adjust(4),
  },
  actionButton: {
    padding: adjust(6),
    marginLeft: adjust(6),
    backgroundColor: 'white',
    borderRadius: adjust(10),
    width: adjust(32),
    height: adjust(32),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: adjust(1),
    elevation: 1,
  },
  footer: {
    alignItems: 'center',
  },
  footerItem: {
    marginBottom: adjust(4),
  },
  footerText: {
    fontSize: adjust(12),
    color: '#666',
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: adjust(2),
  },
  footerLinkText: {
    fontSize: adjust(12),
    color: '#2371EA', // Blue color
    textDecorationLine: 'underline', // Underline
  },
  footerDot: {
    fontSize: adjust(12),
    color: '#666',
    marginHorizontal: adjust(4),
  },
  profileButton: {
    padding: adjust(2),
    marginLeft: adjust(9),
  },
  profilePhotoContainer: {
    width: adjust(36),
    height: adjust(36),
    borderRadius: adjust(18),
    backgroundColor: '#4F67ED',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: adjust(2),
    borderColor: 'white',
  },
  profileInitial: {
    fontSize: adjust(16),
    color: 'white',
    fontWeight: 'bold',
  },
  profileMenuContainer: {
    position: 'absolute',
    top: adjust(70),
    right: adjust(26),
    backgroundColor: 'white',
    borderRadius: adjust(12),
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: adjust(4) },
    shadowOpacity: 0.2,
    shadowRadius: adjust(6),
    elevation: 8,
    zIndex: 10,
    minWidth: adjust(180),
    overflow: 'hidden',
  },
  profileMenuTitle: {
    fontSize: adjust(14),
    fontWeight: '600',
    color: '#333',
    padding: adjust(16),
    paddingBottom: adjust(8),
  },
  menuDivider: {
    height: adjust(1),
    backgroundColor: '#EBEBEB',
    marginVertical: adjust(8),
    width: '100%',
  },
  profileMenuItem: {
    padding: adjust(12),
    paddingHorizontal: adjust(16),
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileMenuItemIcon: {
    fontSize: adjust(18),
    color: '#333',
    marginRight: adjust(12),
    width: adjust(20),
    textAlign: 'center',
  },
  profileMenuItemText: {
    fontSize: adjust(14),
    color: '#333',
    fontWeight: '500',
  },
  profileMenuBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    zIndex: 5,
  },
  recentLoadingContainer: {
    height: adjust(120),
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FC',
    borderRadius: adjust(12),
    marginVertical: adjust(8),
  },
  recentLoadingText: {
    color: '#4F67ED',
    fontSize: adjust(14),
    marginLeft: adjust(8),
  },
  noRecentContainer: {
    height: adjust(120),
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FC',
    borderRadius: adjust(12),
    marginVertical: adjust(8),
    padding: adjust(16),
  },
  noRecentText: {
    color: '#333',
    fontSize: adjust(16),
    fontWeight: 'bold',
    marginBottom: adjust(8),
  },
  noRecentSubtext: {
    color: '#666',
    fontSize: adjust(14),
  },
  errorText: {
    color: 'red',
    fontSize: adjust(12),
    marginBottom: adjust(16),
  },
  adContainer: {
    marginHorizontal: -SCREEN_WIDTH * 0.04, // Negative margin to counteract container padding
  },
  // Native Ad Styles
  nativeAdContainer: {
    width: '100%',
    marginBottom: adjust(24),
  },
  nativeAdView: {
    backgroundColor: '#FFFFFF',
    borderRadius: adjust(14),
    padding: adjust(12),
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  adHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: adjust(8),
  },
  adHeaderText: {
    flex: 1,
    marginRight: adjust(8),
  },
  adHeadline: {
    fontSize: adjust(16),
    fontWeight: '600',
    color: '#333',
    marginBottom: adjust(2),
  },
  adAdvertiser: {
    fontSize: adjust(12),
    color: '#666',
    fontWeight: '400',
  },
  adBadge: {
    backgroundColor: '#4F67ED',
    paddingHorizontal: adjust(6),
    paddingVertical: adjust(2),
    borderRadius: adjust(4),
  },
  adBadgeText: {
    fontSize: adjust(10),
    color: '#FFFFFF',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  adBody: {
    fontSize: adjust(14),
    color: '#333',
    lineHeight: adjust(20),
    marginBottom: adjust(12),
  },
  adCallToAction: {
    backgroundColor: '#4F67ED',
    paddingHorizontal: adjust(16),
    paddingVertical: adjust(8),
    borderRadius: adjust(8),
    alignSelf: 'flex-start',
  },
  adCallToActionText: {
    fontSize: adjust(14),
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default Home;
