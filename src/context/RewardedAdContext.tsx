import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Platform } from 'react-native';
import mobileAds, {
  MaxAdContentRating,
  useRewardedAd,
  AdsConsent,
  AdsConsentStatus,
  TestIds,
  NativeAd
} from 'react-native-google-mobile-ads';
import analytics from '@react-native-firebase/analytics';
import MyInterstitialAd from '../components/MyInterstitialAd';
import {
  getTrackingStatus,
  requestTrackingPermission,
} from 'react-native-tracking-transparency';
import { usePurchases } from './SubscriptionContext';

const CREDENTIALS = {
  REWARDED_AD_UNIT_ID_ANDROID: 'ca-app-pub-1643025320304360/6858239467',
  REWARDED_AD_UNIT_ID_IOS: 'your_ios_rewarded_ad_unit_id',  
  NATIVE_AD_UNIT_ID_ANDROID: 'ca-app-pub-1643025320304360/2787186416',
  NATIVE_AD_UNIT_ID_IOS: 'your_ios_native_ad_unit_id',  
};

const REWARDED_AD_UNIT =
  Platform.select({
    android: CREDENTIALS.REWARDED_AD_UNIT_ID_ANDROID,
  }) || null;

const ADS_REQUEST_CONFIGURATION = {
  maxAdContentRating: MaxAdContentRating.G,
  tagForChildDirectedTreatment: false,
  tagForUnderAgeOfConsent: false,
};

interface RewardedContextProps {
  showRewardedAd: (jobToPass?: (success: boolean) => void) => void;
  nativeAd: NativeAd | undefined;
}

const RewardedContext = createContext<RewardedContextProps | undefined>(
  undefined,
);

export const useRewardedContext = (): RewardedContextProps => {
  const context = useContext(RewardedContext);
  if (!context) {
    throw new Error(
      'useRewardedContext must be used within a RewardedAdProvider',
    );
  }
  return context;
};

export const RewardedAdProvider = ({ children }: any) => {
  const { isSubscribed } = usePurchases();

  // If user is subscribed, return a simplified context that doesn't show ads
  if (isSubscribed) {
    const value: RewardedContextProps = {
      showRewardedAd: (jobToPass?: (success: boolean) => void) => {
        // If subscribed, just execute the job directly without showing an ad
        if (jobToPass) {
          jobToPass(true);
        }
      },
      nativeAd: undefined
    };

    return (
      <RewardedContext.Provider value={value}>
        {children}
      </RewardedContext.Provider>
    );
  }

  const adUnitId = __DEV__ ? TestIds.REWARDED : REWARDED_AD_UNIT;
  const { isLoaded, isClosed, load, show, isEarnedReward, error } = useRewardedAd(adUnitId);
  const [nativeAd, setNativeAd] = useState<NativeAd | undefined>();
  const [jobFunction, setJobFunction] = useState<((success: boolean) => void) | null>(null);
  const [showFallbackAd, setShowFallbackAd] = useState(false);

  const initializeAdmob = async () => {
    try {
      console.log('Initializing AdMob...');
      await requestEEAConsent();
      await mobileAds().setRequestConfiguration(ADS_REQUEST_CONFIGURATION);
      await analytics().setAnalyticsCollectionEnabled(true);
      await mobileAds().initialize();
      load();
      const ad = await NativeAd.createForAdRequest(__DEV__ ? TestIds.NATIVE : CREDENTIALS.NATIVE_AD_UNIT_ID_ANDROID);
      setNativeAd(ad);
      console.log('AdMob initialized.');
    } catch (error) {
      console.error('Error during AdMob initialization:', error);
    }
  };

  const requestEEAConsent = async () => {
    try {
      console.log('Requesting user consent...');
      let trackingAllowed = false;

      if (Platform.OS === 'ios') {
        const trackingStatus = await getTrackingStatus();

        if (trackingStatus === 'not-determined') {
          const permission = await requestTrackingPermission();
          trackingAllowed = permission === 'authorized';
          console.log(`ATT Permission Result: ${permission}`);
        } else {
          trackingAllowed = trackingStatus === 'authorized';
        }
      } else {
        trackingAllowed = true;
      }

      // If ATT is denied, DO NOT show GDPR consent
      if (!trackingAllowed) {
        console.log('User denied tracking. Skipping GDPR consent.');
        return false;
      }

      const consentInfo = await AdsConsent.requestInfoUpdate();
      let personalizedAds = false;

      if (
        consentInfo.isConsentFormAvailable &&
        consentInfo.status === AdsConsentStatus.REQUIRED
      ) {
        const { status } = await AdsConsent.showForm();
        consentInfo.status = status;
        personalizedAds = status === AdsConsentStatus.OBTAINED;
      } else {
        personalizedAds = trackingAllowed;
      }

      console.log(
        `User consent received. Personalized Ads: ${personalizedAds}`,
      );
      return personalizedAds;
    } catch (error) {
      console.error('Error requesting user consent:', error);
      return false;
    }
  };

  useEffect(() => {
    initializeAdmob();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      console.log('Rewarded Ad successfully loaded.');
    }
  }, [isLoaded]);

  useEffect(() => {
    if (error) {
      console.log('Rewarded ad failed to load:', error);
      setTimeout(() => load(), 3000);
    }
  }, [error, load]);

  useEffect(() => {
    if (isClosed) {
      console.log('Ad closed.');

      if (isEarnedReward && jobFunction) {
        console.log('Reward earned. Executing job...');
        jobFunction(true);
      } else {
        console.warn('Reward not earned or no job function.');
      }

      load(); // Reload ad for next use
    }
  }, [isClosed, isEarnedReward, jobFunction, load]);


  const showRewardedAd = (jobToPass?: (success: boolean) => void) => {
    console.log('Job function received:', jobToPass); // Debug log
    setJobFunction(() => jobToPass); // Save the job function

    if (isLoaded) {
      console.log('Showing rewarded ad...');
      show();
    } else {
      console.warn('Rewarded ad is not loaded. Showing fallback ad...');
      setShowFallbackAd(true); // Show fallback ad
    }
  };

  const onCloseFallbackAd = () => {
    console.log('Fallback ad was closed.');
    setShowFallbackAd(false);

    if (jobFunction) {
      console.log('Executing job function after fallback ad.');
      jobFunction(true); // Execute the function after ad is closed
    } else {
      console.warn('No job function provided for fallback ad.');
    }
  };

  const value = {
    showRewardedAd,
    nativeAd
  };

  return (
    <RewardedContext.Provider value={value}>
      {children}
      {showFallbackAd && (
        <MyInterstitialAd
          modalVisible={showFallbackAd}
          onClose={onCloseFallbackAd}
        />
      )}
    </RewardedContext.Provider>
  );
};