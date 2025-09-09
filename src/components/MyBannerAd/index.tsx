import React, {useState} from 'react';
import {BannerAd, BannerAdSize, TestIds} from 'react-native-google-mobile-ads';
import {PRE_LOADED_BANNERS} from './AdsImages/PreLoadedBanners';
import { getSafeDimensions } from '../../utils/imageOptimization';
import {
  Image,
  ImageProps,
  Linking,
  TouchableOpacity,
  Platform,
  View,
  Dimensions,
  StyleSheet,
} from 'react-native';
import analytics from '@react-native-firebase/analytics';
import adjust from '../../utils/adjust';
import {useTokens} from '../../context/TokenContext';

const SCREEN_WIDTH = Dimensions.get('window').width;
const HORIZONTAL_PADDING = adjust(16);
const CONTAINER_WIDTH = SCREEN_WIDTH - HORIZONTAL_PADDING * 2;

const adUnitId = __DEV__
  ? TestIds.ADAPTIVE_BANNER
  : 'ca-app-pub-1643025320304360/1926933912';

interface AdStructure {
  imagePath: ImageProps;
  appLink: string;
  title: string;
}

const MyBannerAd = () => {
  const [didAdLoaded, setDidAdLoaded] = useState(true);
  const [bannerLoaded, setBannerLoaded] = useState<AdStructure | null>(null);
  const {isFreeUser} = useTokens();

  const onAdFailedToLoad = (error: any) => {
    const randomBanner = getRandomPreLoadedBanner(PRE_LOADED_BANNERS);
    setBannerLoaded(randomBanner);
    setDidAdLoaded(false);
    
    // Sanitize event name to follow Firebase rules
    const eventName = `${randomBanner?.title || 'unknown'}_banner_impression`
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/^[0-9]/, 'event_$&')
      .substring(0, 40);
    analytics().logEvent(eventName);
  };

  const onAdClicked = () => {
    // Sanitize event name to follow Firebase rules
    const eventName = `${bannerLoaded?.title || 'unknown'}_banner_clicked`
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/^[0-9]/, 'event_$&')
      .substring(0, 40);
    analytics().logEvent(eventName);
    Linking.openURL(bannerLoaded?.appLink!);
  };

  // Don't render any ad for premium users
  if (!isFreeUser) {return null;}

  return (
    <View style={styles.outerContainer}>
      <View style={styles.container}>
        {didAdLoaded ? (
          <View style={styles.adContainer}>
            <BannerAd
              unitId={adUnitId!}
              size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
              onAdFailedToLoad={onAdFailedToLoad}
              requestOptions={{
                requestNonPersonalizedAdsOnly: true,
              }}
            />
          </View>
        ) : (
          <TouchableOpacity
            onPress={onAdClicked}
            style={styles.fallbackContainer}>
            <Image
              source={bannerLoaded?.imagePath!}
              style={[styles.fallbackImage, getSafeDimensions('BANNER')]}
              resizeMode="contain"
              onError={(error) => console.log('Banner image load error:', error)}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    // backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: adjust(8),
  },
  container: {
    width: CONTAINER_WIDTH,
    alignItems: 'center',
  },
  adContainer: {},
  fallbackContainer: {
    width: '100%',
    alignItems: 'stretch',
  },
  fallbackImage: {
    width: 320, // Fixed width to prevent large bitmap loading
    height: adjust(50),
    maxWidth: '100%',
  },
});

export default MyBannerAd;

function getRandomPreLoadedBanner(preLoadedBanners: any) {
  if (preLoadedBanners.length === 0) {
    return null;
  }
  const randomIndex = Math.floor(Math.random() * preLoadedBanners.length);
  return preLoadedBanners[randomIndex];
}
