import React, {useEffect, useState} from 'react';
import {
  Modal,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  Animated,
  Linking,
  ImageProps,
  Platform,
} from 'react-native';
import {PRE_LOADED_BANNERS} from './AdsImages/PRE_LOADED_ADS';
import { getSafeDimensions } from '../../utils/imageOptimization';

// Make analytics import optional
let analytics: any = null;
try {
  analytics = require('@react-native-firebase/analytics').default;
} catch (error) {
  console.log('Firebase analytics not available');
}

const CLOSE_ICON = require('./AdsImages/CloseIcon.png');

interface AdStructure {
  imagePath: ImageProps;
  appLink: string;
  title: string;
}

interface MyInterstitialAdProps {
  modalVisible: boolean;
  onClose: () => void;
}

const MyInterstitialAd: React.FC<MyInterstitialAdProps> = ({
  modalVisible,
  onClose,
}) => {
  const [randomBanner, setRandomBanner] = useState<AdStructure | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [showCloseBtn, setShowCloseBtn] = useState(false);

  useEffect(() => {
    setRandomBanner(getRandomPreLoadedBanner(PRE_LOADED_BANNERS));
    if (modalVisible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [modalVisible]);

  useEffect(() => {
    const timeout = setTimeout(() => setShowCloseBtn(true), 2000);

    return () => {
      // setRandomBanner(null);
      setShowCloseBtn(false);
      clearTimeout(timeout);
    };
  }, [modalVisible]);

  const onAdClicked = () => {
    if (analytics && randomBanner?.title) {
      // Sanitize event name to follow Firebase rules
      const eventName = `${randomBanner.title}_int_clicked`
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .replace(/^[0-9]/, 'event_$&')
        .substring(0, 40);
      analytics().logEvent(eventName);
    }
    if (randomBanner?.appLink) {
      Linking.openURL(randomBanner.appLink);
    }
  };

  const onAdClosed = () => {
    if (analytics && randomBanner?.title) {
      // Sanitize event name to follow Firebase rules
      const eventName = `${randomBanner.title}_int_impression`
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .replace(/^[0-9]/, 'event_$&')
        .substring(0, 40);
      analytics().logEvent(eventName);
    }
    setRandomBanner(getRandomPreLoadedBanner(PRE_LOADED_BANNERS));
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        {showCloseBtn && (
          <TouchableOpacity style={styles.closeButton} onPress={onAdClosed}>
            <Image source={CLOSE_ICON} />
          </TouchableOpacity>
        )}

        {randomBanner && (
          <Animated.View style={[styles.adContainer, {opacity: fadeAnim}]}>
            <TouchableOpacity
              onPress={onAdClicked}
              style={{height: '100%', width: '100%'}}>
              <Image 
                source={randomBanner?.imagePath} 
                style={[styles.adImage, getSafeDimensions('INTERSTITIAL')]}
                onError={(error) => console.log('Interstitial image load error:', error)}
              />
            </TouchableOpacity>
          </Animated.View>
        )}

        <View style={styles.adBox}>
          <Text>AD</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 45 : 20,
    right: 20,
    padding: 2,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
  },
  adContainer: {
    flex: 1,
    marginVertical: '20%',
    backgroundColor: 'black',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adImage: {
    width: 300, // Fixed width to prevent large bitmap loading
    height: 400, // Fixed height to prevent large bitmap loading
    maxWidth: '100%',
    maxHeight: '100%',
    resizeMode: 'contain',
  },
  adBox: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 10,
    left: 10,
    paddingHorizontal: 16,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MyInterstitialAd;

function getRandomPreLoadedBanner(preLoadedBanners: any) {
  const platformBanners = preLoadedBanners.filter(
    (banner: any) => banner.imagePath && banner.appLink,
  );

  if (platformBanners.length === 0) {
    console.log('No valid banners available.');
    return null;
  }

  const randomIndex = Math.floor(Math.random() * platformBanners.length);
  const selectedBanner = platformBanners[randomIndex];

  console.log('Selected Banner:', selectedBanner);
  return selectedBanner;
}
