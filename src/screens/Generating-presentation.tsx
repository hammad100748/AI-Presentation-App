import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  ImageBackground,
  BackHandler,
  Animated,
  Easing,
  TouchableOpacity,
  Alert,
  AppState,
} from 'react-native';
import {
  useNavigation,
  useIsFocused,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigations';
import { generatePresentation, checkPresentationStatus, SlidesGPTGenerateRequest } from '../../utils/api';
import { useTokens } from '../context/TokenContext';
import crashlytics from '@react-native-firebase/crashlytics';
import { useRewardedContext } from '../context/RewardedAdContext';
import { NativeAdView, NativeAsset, NativeAssetType } from 'react-native-google-mobile-ads';
import adjust from '../utils/adjust';
import { showToast } from '../utils/showTost';

// Import gradient background
const gradientBg = require('../assets/images/gradient_bg.jpeg');

type GeneratingPresentationNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'GeneratingPresentation'
>;

type GeneratingPresentationRouteProp = RouteProp<
  RootStackParamList,
  'GeneratingPresentation'
>;

// Define types for the presentation generation
interface PresentationGenerationRequest {
  topic: string;
  length: 'short' | 'informative' | 'detailed' | 'custom';
  slides?: number;
  language: string;
  tone: string;
  textAmount: string;
  includeImages?: boolean;
  customInstructions?: string;
  template?: string;
}

interface PresentationGenerationResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  slides?: any[];
  downloadUrl?: string;
  error?: string;
}

// Define task info interface to fix type errors
interface TaskInfo {
  url?: string;
  progress?: number;
  stage?: string;
  error?: string;
}

interface TaskStatusResponse {
  task_id: string;
  task_status: 'PENDING' | 'STARTED' | 'SUCCESS' | 'FAILURE';
  task_result?: {
    url: string;
  };
  task_info?: TaskInfo;
}

const GeneratingPresentation = () => {
  const navigation = useNavigation<GeneratingPresentationNavigationProp>();
  const route = useRoute<GeneratingPresentationRouteProp>();
  const isFocused = useIsFocused();
  const { isFreeUser, consumeToken } = useTokens();
  const [progress, setProgress] = useState(1);
  const [generationStarted, setGenerationStarted] = useState(false);
  const [statusText, setStatusText] = useState('Analyzing your inputs...');
  const [presentationData, setPresentationData] =
    useState<PresentationGenerationResponse | null>(null);
  const [presentationId, setPresentationId] = useState<string | null>(null);
  const [error, setError] = useState<boolean>(false);
  const [isPolling, setIsPolling] = useState(false);
  const [taskCompleted, setTaskCompleted] = useState(false);
  const [tokenDeducted, setTokenDeducted] = useState(false);
  const { nativeAd } = useRewardedContext();

  // Refs to track component mount state and polling interval
  const isMounted = useRef(true);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasStartedPolling = useRef(false); // Track if we've already started polling

  // Animation values
  const spinValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;

  // Create spinning animation
  useEffect(() => {
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    spinAnimation.start();

    return () => {
      spinAnimation.stop();
    };
  }, [spinValue]);

  // Create pulse animation for the inner circle
  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1.05,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
    };
  }, [pulseValue]);

  // Interpolate spin value to rotation
  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Handle hardware back button press
  useEffect(() => {
    const backAction = () => {
      // Prevent going back without showing warning message
      return true; // Prevent going back
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );

    return () => backHandler.remove();
  }, []);

  // Handle app state changes (when user minimizes app or switches to another app)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App is going to background or becoming inactive
        // Warning message removed as requested
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, []);

  // Update status text based on progress
  useEffect(() => {
    if (progress < 30) {
      setStatusText('Analyzing your inputs...');
    } else if (progress < 60) {
      setStatusText('Designing slides...');
    } else if (progress < 90) {
      setStatusText('Adding finishing touches...');
    } else {
      setStatusText('Almost ready...');
    }
  }, [progress]);

  // Track component mount state
  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
      // Clear any polling interval when component unmounts
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  // Get params with type safety
  const { topic, length, slides, language, tone, textAmount, includeImages, customInstructions, template } = route.params;

  // Start presentation generation on component mount
  useEffect(() => {
    // Add a small delay to prevent immediate execution
    const timer = setTimeout(() => {
      checkTokenAndStartGeneration();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Progress animation (stable from 1 to 99 without restarting)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    // Clear any existing interval first
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    if (!error && !taskCompleted) {
      progressIntervalRef.current = setInterval(() => {
        if (!isMounted.current) return;
        setProgress(prev => {
          // Never decrease progress
          let next = prev;
          if (prev < 50) {
            next = prev + 1.5;
          } else if (prev < 80) {
            next = prev + 0.8;
          } else if (prev < 99) {
            next = prev + 0.3;
          }
          const clamped = Math.min(next, 99);
          if (clamped !== prev) {
            console.log(`Progress updated: ${prev.toFixed(1)}% → ${clamped.toFixed(1)}%`);
          }
          return clamped;
        });
      }, 400);
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [error, taskCompleted]);

  // Start polling when generation starts and we have a presentation ID
  useEffect(() => {
    // Only start polling if we have all required conditions and haven't started yet
    if (generationStarted && presentationId && !taskCompleted && !hasStartedPolling.current) {
      console.log('Starting polling with presentationId:', presentationId);
      hasStartedPolling.current = true;
      startPolling();
    } else if (!presentationId && generationStarted) {
      console.error('❌ Generation started but no presentationId available');
      setError(true);
      setStatusText('Error: No task ID received');
    }

    // Cleanup function to stop polling when dependencies change
    return () => {
      if (pollingIntervalRef.current) {
        console.log('Cleaning up polling interval from useEffect');
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setIsPolling(false);
      hasStartedPolling.current = false;
    };
  }, [generationStarted, presentationId, taskCompleted]); // Removed isPolling from dependencies

  const startPolling = () => {
    // Prevent multiple polling instances
    if (!presentationId || isPolling || taskCompleted || pollingIntervalRef.current) {
      console.log('Polling already active or conditions not met, skipping...');
      return;
    }

    console.log(`Starting polling for task ID: ${presentationId}`);
    setIsPolling(true);

    let pollingCount = 0;
    const MAX_POLLS = 20; // Limit total number of API calls

    pollingIntervalRef.current = setInterval(() => {
      // Don't make more API calls than necessary
      if (pollingCount >= MAX_POLLS || !isMounted.current || taskCompleted) {
        console.log(
          `Stopping polling: ${taskCompleted
            ? 'Task completed'
            : pollingCount >= MAX_POLLS
              ? 'Max polls reached'
              : 'Component unmounted'
          }`,
        );
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        setIsPolling(false);

        if (
          pollingCount >= MAX_POLLS &&
          isMounted.current &&
          !taskCompleted
        ) {
          setError(true);
        }
        return;
      }

      console.log(
        `Polling attempt ${pollingCount + 1
        }/${MAX_POLLS} for task ID: ${presentationId}`,
      );
      pollTaskStatus(presentationId);
      pollingCount++;
    }, 5000); // Check every 5 seconds instead of 3 to reduce API calls
  };

  const checkTokenAndStartGeneration = async () => {
    try {
      // Get the number of slides from params or use default
      const slidesToGenerate = route.params.slides || 3;

      // Start generation
      await startPresentationGeneration();
    } catch (error: any) {
      console.error('Error starting generation:', error);
      crashlytics().recordError(error);
      setError(true);
      setStatusText('Error starting generation');
    }
  };

  const startPresentationGeneration = async () => {
    try {
      setStatusText('Preparing your presentation...');

      // Prepare the request data for SlidesGPT API
      const requestData: SlidesGPTGenerateRequest = {
        prompt: topic,
        // You can add more parameters here based on SlidesGPT API documentation
        // such as theme, language, etc.
      };

      console.log('🚀 Starting presentation generation with SlidesGPT API:', requestData);

      // Call the SlidesGPT API
      const response = await generatePresentation(requestData);

      if (response.id) {
        setPresentationId(response.id);
        setStatusText('Creating your slides...');
        setProgress(p => Math.max(p, 20));
        setGenerationStarted(true);

        // Start polling for status
        startPolling();
      } else {
        Alert.alert(
          'Please Try Again Soon',
          'We’re currently experiencing high demand and are working to process all requests. Thanks for your patience!'
        );
        throw new Error('No presentation ID received from SlidesGPT API');
      }

    } catch (err: any) {
      console.error('❌ Error starting presentation generation:', err);
      crashlytics().recordError(err);
      setError(true);
      setStatusText('Error generating presentation');
      Alert.alert(
        'Please Try Again Soon',
        'We’re currently experiencing high demand and are working to process all requests. Thanks for your patience!'
      );
      
    }
  };

  const pollTaskStatus = async (id: string) => {
    if (!isMounted.current || taskCompleted) {
      return;
    }

    console.log('🔍 Polling task status for ID:', id);

    try {
      const statusResponse = await checkPresentationStatus(id, route.params.topic);

      if (!isMounted.current) {
        return;
      }

      console.log('📊 Task status response:', statusResponse);

      if (statusResponse.status === 'completed') {
        // Stop the interval and finalize progress to 100
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        setProgress(100);
        setStatusText('Your presentation is ready!');
        setTaskCompleted(true);

        // Clear polling interval and reset flags
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        setIsPolling(false);
        hasStartedPolling.current = false;

        // Deduct 1 token before navigating to result (only once)
        if (!tokenDeducted) {
          try {
            const ok = await consumeToken();
            if (!ok) {
              console.error('❌ Not enough tokens to deduct on completion');
              setStatusText('Not enough tokens to proceed.');
              return; // Stop here if deduction failed
            }
            setTokenDeducted(true);
            console.log('✅ 1 token deducted on generation completion');
          } catch (e) {
            console.error('❌ Error deducting token on completion:', e);
            setStatusText('Token deduction failed. Please try again.');
            return;
          }
        }

        // Navigate to result with the download URL and presentation ID
        // We need to construct the download URL based on the presentation ID
        const downloadUrl = `https://api.slidesgpt.com/${id}/download`;

        // Get the actual slide count from the API response
        const actualSlideCount = statusResponse.slideCount || route.params.slides || 3;
        const actualTitle = statusResponse.title || route.params.topic;

        console.log('📊 Actual slide count from API:', actualSlideCount);
        console.log('📊 Actual title from API:', actualTitle);

        setTimeout(() => {
          if (isMounted.current) {
            navigation.navigate('PresentationResult', {
              presentationUrl: downloadUrl,
              presentationId: id, // Pass the presentation ID for PowerPoint Online access
              templateName: template || 'default',
              fromGenerationScreen: true,
              topic: route.params.topic,
              numberOfSlides: actualSlideCount, // Use actual slide count from API
              actualTitle: actualTitle, // Pass actual title from API
            });
          }
        }, 1000);
      } else if (statusResponse.status === 'pending' || statusResponse.status === 'processing') {
        // Still processing
        console.log('⏳ Task still pending, continuing to poll...');
        setStatusText('Creating your custom presentation...');
        // Progress will continue to increase via the useEffect timer
      } else if (statusResponse.status === 'failed') {
        // Task failed
        console.error('❌ Task failed:', statusResponse.error);
        crashlytics().log(`❌ Task failed: ${statusResponse.error}`);

        // Clear polling interval and reset flags
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        setIsPolling(false);
        hasStartedPolling.current = false;

        setError(true);
        setStatusText('Error generating presentation');
      }
    } catch (error: any) {
      console.error('❌ Error polling task status:', error);
      crashlytics().recordError(error);

      // Provide more specific error messages based on the error type
      if (error.message.includes('Network connection error')) {
        setStatusText('Network connection issue. Please check your internet connection.');
        return;
      } else if (error.message.includes('Request timeout')) {
        setStatusText('Request timeout. Please try again.');
        return;
      } else if (error.message.includes('401') || error.message.includes('Missing Authorization header')) {
        setStatusText('Authentication error. Please restart the app and try again.');
        setError(true);
      } else {
        setStatusText('Error checking presentation status');
        setError(true);
      }
    }
  };

  // Handle embedding presentation in PowerPoint Online
  const handleEmbedPresentation = async () => {
    try {
      if (!presentationId) {
        console.error('❌ No presentation ID available for embedding');
        return;
      }

      console.log('🔗 Opening presentation embed for ID:', presentationId);

      // For SlidesGPT, the embed endpoint requires authentication
      // Instead, we'll construct a PowerPoint Online compatible URL
      // or show a message that the user needs to use the SlidesGPT dashboard

      setStatusText('Preparing PowerPoint Online view...');

      // Option 1: Try to construct a PowerPoint Online compatible URL
      // This might work if SlidesGPT provides a public embed
      const powerpointUrl = `https://api.slidesgpt.com/v1/presentations/${presentationId}/embed`;

      // Option 2: Show instructions for manual access
      const instructions = `To view your presentation in PowerPoint Online:
      
1. Go to https://slidesgpt.com
2. Sign in to your account
3. Find presentation ID: ${presentationId}
4. Click "View" or "Open in PowerPoint"

The embed URL requires authentication and cannot be opened directly in a browser.`;

      // Show an alert with instructions for the user
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
              setStatusText('Presentation ID copied! Use it in SlidesGPT dashboard');
            }
          },
          {
            text: 'OK',
            style: 'default'
          }
        ]
      );

      // Log the information for debugging
      console.log('📱 Presentation ID:', presentationId);
      console.log('🔗 Embed URL (requires auth):', powerpointUrl);
      console.log('📋 Instructions:', instructions);

    } catch (error) {
      console.error('❌ Error opening presentation embed:', error);
      setStatusText('Error opening presentation');
    }
  };

  

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>😕</Text>
        <Text style={styles.errorTitle}>Oops, something went wrong</Text>
        <TouchableOpacity
          style={styles.errorButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.errorButtonText}>Go Back</Text>
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
          barStyle="light-content"
          backgroundColor="transparent"
          translucent={true}
        />
        <SafeAreaView style={styles.safeArea}>
          {/* Back Button removed */}

          <View style={styles.container}>
            <View style={styles.whiteCard}>
              {/* Title Section */}
              <Text style={styles.title}>Generating Your Presentation</Text>
              <Text style={styles.subtitle}>
                Our AI is crafting a professional presentation based on your
                inputs.
              </Text>

              {/* Progress Circle - Improved version */}
              <View style={styles.progressContainer}>
                {/* Outer spinning circle */}
                <Animated.View
                  style={[styles.spinningRing, { transform: [{ rotate: spin }] }]}>
                  {/* Gradient spots */}
                  <View style={[styles.gradientSpot, styles.gradientSpot1]} />
                  <View style={[styles.gradientSpot, styles.gradientSpot2]} />
                </Animated.View>

                {/* Progress circle */}
                <View style={styles.progressCircleBackground}>
                  {/* Circle progress track */}
                  <View style={styles.progressTrack} />

                  {/* Inner circle with percentage */}
                  <Animated.View
                    style={[
                      styles.progressInnerCircle,
                      { transform: [{ scale: pulseValue }] },
                    ]}>
                    <Text style={styles.progressText}>
                      {Math.round(progress)}%
                    </Text>
                    <View style={styles.progressSteps}>
                      <View
                        style={[
                          styles.progressStep,
                          progress >= 33 && styles.progressStepActive,
                        ]}
                      />
                      <View
                        style={[
                          styles.progressStep,
                          progress >= 66 && styles.progressStepActive,
                        ]}
                      />
                      <View
                        style={[
                          styles.progressStep,
                          progress >= 99 && styles.progressStepActive,
                        ]}
                      />
                    </View>
                  </Animated.View>
                </View>
              </View>

              {/* Status Container with better spacing */}
              <View style={styles.statusContainer}>
                <Text style={styles.generatingText}>{statusText}</Text>
                <Text style={styles.waitText}>
                  Please wait while we prepare your presentation.
                </Text>
                <Text style={styles.tokenText}>
                  Each presentation consumes one token
                </Text>
              </View>


              {/* Native Ad inside the white card - Show only for free users */}
              {nativeAd && isFreeUser && (
                <View style={{ width: '100%', alignItems: 'center', marginTop: adjust(16) }}>
                  <NativeAdView
                    nativeAd={nativeAd}
                    style={{
                      width: '100%',
                      borderRadius: adjust(18),
                      backgroundColor: '#F7F8FA',
                      paddingVertical: adjust(4),
                      paddingHorizontal: adjust(8),
                      borderWidth: 1,
                      borderColor: '#E6EBF5',
                      elevation: 0,
                      shadowOpacity: 0,
                    }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: adjust(2) }}>
                      <View style={{ flex: 1, marginRight: adjust(6) }}>
                        <NativeAsset assetType={NativeAssetType.HEADLINE}>
                          <Text style={{ fontSize: adjust(14), fontWeight: 'bold', color: '#333' }} numberOfLines={1}>
                            {nativeAd.headline || 'Sponsored Content'}
                          </Text>
                        </NativeAsset>
                        <NativeAsset assetType={NativeAssetType.ADVERTISER}>
                          <Text style={{ fontSize: adjust(12), color: '#666', marginTop: adjust(1) }} numberOfLines={1}>
                            {nativeAd.advertiser || 'Advertiser'}
                          </Text>
                        </NativeAsset>
                      </View>
                      <View style={{ backgroundColor: '#FFD700', borderRadius: adjust(5), paddingHorizontal: adjust(6), paddingVertical: adjust(1) }}>
                        <Text style={{ fontWeight: 'bold', color: '#333', fontSize: adjust(12) }}>Ad</Text>
                      </View>
                    </View>
                    <NativeAsset assetType={NativeAssetType.BODY}>
                      <Text style={{ fontSize: adjust(12), color: '#444' }} numberOfLines={2}>
                        {nativeAd.body || 'Advertisement content'}
                      </Text>
                    </NativeAsset>
                    <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
                      <TouchableOpacity style={{ marginTop: adjust(6), backgroundColor: '#4F67ED', borderRadius: adjust(7), paddingVertical: adjust(6), paddingHorizontal: adjust(12), alignItems: 'center' }}>
                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: adjust(13) }}>
                          {nativeAd.callToAction || 'Learn More'}
                        </Text>
                      </TouchableOpacity>
                    </NativeAsset>
                  </NativeAdView>
                </View>
              )}

              {/* Removed banner ad during generation */}

              {/* Error message if exists */}
              {error && <Text style={styles.errorText}>{error}</Text>}

              {/* Spacer to prevent content from touching bottom */}
              <View style={styles.bottomSpacer} />
            </View>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#2371EA', // Fallback color in case image doesn't load
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    padding: adjust(16),
    paddingBottom: adjust(24),
  },
  whiteCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: adjust(25),
    padding: adjust(24),
    paddingTop: adjust(40),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: adjust(8),
    elevation: 5,
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: adjust(24),
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: adjust(10),
  },
  subtitle: {
    fontSize: adjust(15),
    color: '#64748B',
    textAlign: 'center',
    maxWidth: '90%',
    marginBottom: adjust(30),
    lineHeight: adjust(20),
  },
  progressContainer: {
    marginVertical: adjust(20),
    alignItems: 'center',
    justifyContent: 'center',
    height: adjust(200),
    width: adjust(200),
    position: 'relative',
  },
  spinningRing: {
    position: 'absolute',
    width: adjust(200),
    height: adjust(200),
    borderRadius: adjust(100),
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientSpot: {
    position: 'absolute',
    width: adjust(24),
    height: adjust(24),
    borderRadius: adjust(12),
  },
  gradientSpot1: {
    backgroundColor: '#2371EA',
    top: 0,
  },
  gradientSpot2: {
    backgroundColor: '#6E64FC',
    bottom: 0,
  },
  progressCircleBackground: {
    width: adjust(180),
    height: adjust(180),
    borderRadius: adjust(90),
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E6EBF5',
  },
  progressTrack: {
    position: 'absolute',
    top: adjust(15),
    left: adjust(15),
    right: adjust(15),
    bottom: adjust(15),
    borderRadius: adjust(75),
    borderWidth: adjust(8),
    borderColor: 'rgba(230, 235, 245, 0.5)',
  },
  progressArcContainer: {
    position: 'absolute',
    top: adjust(15),
    left: adjust(15),
    right: adjust(15),
    bottom: adjust(15),
    borderRadius: adjust(75),
    overflow: 'hidden',
  },
  progressArc: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: adjust(150),
    height: adjust(150),
    borderRadius: adjust(75),
    borderWidth: adjust(8),
    borderColor: 'transparent',
    borderTopColor: '#2371EA',
    borderRightColor: '#2371EA',
    transform: [{ rotate: '0deg' }],
  },
  progressInnerCircle: {
    width: adjust(120),
    height: adjust(120),
    borderRadius: adjust(60),
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: adjust(4),
    elevation: 3,
  },
  progressText: {
    fontSize: adjust(28),
    fontWeight: 'bold',
    color: '#1E293B',
  },
  progressSteps: {
    flexDirection: 'row',
    marginTop: adjust(6),
  },
  progressStep: {
    width: adjust(6),
    height: adjust(6),
    borderRadius: adjust(3),
    backgroundColor: '#E6EBF5',
    marginHorizontal: adjust(3),
  },
  progressStepActive: {
    backgroundColor: '#2371EA',
  },
  statusContainer: {
    marginTop: adjust(20),
    alignItems: 'center',
    paddingHorizontal: adjust(20),
  },
  generatingText: {
    fontSize: adjust(20),
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: adjust(8),
    textAlign: 'center',
  },
  waitText: {
    fontSize: adjust(15),
    color: '#64748B',
    textAlign: 'center',
    lineHeight: adjust(20),
    marginBottom: adjust(8),
  },
  tokenText: {
    fontSize: adjust(14),
    color: '#4F67ED',
    textAlign: 'center',
    fontWeight: '500',
  },
  errorText: {
    color: '#E53E3E',
    marginTop: adjust(16),
    textAlign: 'center',
    fontSize: adjust(14),
    maxWidth: '90%',
  },
  bottomSpacer: {
    height: adjust(30),
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: adjust(24),
  },
  errorIcon: {
    fontSize: adjust(54),
    marginBottom: adjust(12),
  },
  errorTitle: {
    fontSize: adjust(24),
    fontWeight: 'bold',
    color: '#4F67ED',
    marginBottom: adjust(8),
    textAlign: 'center',
  },
  errorButton: {
    backgroundColor: '#4F67ED',
    borderRadius: adjust(15),
    paddingVertical: adjust(15),
    paddingHorizontal: adjust(40),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: adjust(4),
    elevation: 3,
    width: '80%',
    maxWidth: adjust(260),
  },
  errorButtonText: {
    color: 'white',
    fontSize: adjust(18),
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});

export default GeneratingPresentation;
