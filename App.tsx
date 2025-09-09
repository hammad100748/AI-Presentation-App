import React, {useEffect} from 'react';
import Orientation from 'react-native-orientation-locker';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppNavigator from './src/navigations';
import {AuthProvider} from './src/context/AuthContext';
import {TokenProvider} from './src/context/TokenContext';
import {AppUsageProvider} from './src/context/AppUsageContext';
import {RevenueCatProvider} from './src/context/RevenueCatContext';
import {RewardedAdProvider} from './src/context/RewardedAdContext';
// import SplashScreen from 'react-native-splash-screen';
import {SubscriptionProvider} from './src/context/SubscriptionContext';
import {NavigationContainer} from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import {API} from './utils/api';

// Keys for AsyncStorage
const APP_LAUNCH_COUNT_KEY = '@ai_presentation_app_launch_count';
const HAS_SEEN_PAYWALL_ONCE_KEY = '@ai_presentation_has_seen_paywall_once';

// Ensure emoji rendering is consistent
const App = () => {
  // Track app launches and manage paywall display
  useEffect(() => {
    Orientation.lockToPortrait();
    const trackAppLaunch = async () => {
      try {
        // Get current app launch count
        const storedLaunchCount = await AsyncStorage.getItem(
          APP_LAUNCH_COUNT_KEY,
        );
        const currentLaunchCount = storedLaunchCount
          ? parseInt(storedLaunchCount, 10) + 1
          : 1;

        // Update the launch count
        await AsyncStorage.setItem(
          APP_LAUNCH_COUNT_KEY,
          currentLaunchCount.toString(),
        );

        console.log(`App launch count: ${currentLaunchCount}`);

        // Check if user has seen paywall once
        const hasSeenPaywallOnce = await AsyncStorage.getItem(
          HAS_SEEN_PAYWALL_ONCE_KEY,
        );

        // First app open logic
        if (hasSeenPaywallOnce !== 'true') {
          console.log('First time user - showing paywall');
          // The paywall will be shown by the AppUsageContext
          // After user dismisses, we'll mark it as seen in the dismissPaywall function
        }
        // Every 4th app open logic
        else if (currentLaunchCount % 4 === 0) {
          console.log(`4th app open (${currentLaunchCount}) - showing paywall`);
          // The paywall will be shown by the AppUsageContext
        } else {
          console.log(
            `Regular app open (${currentLaunchCount}) - not showing paywall`,
          );
        }
      } catch (error) {
        console.error('Error tracking app launch:', error);
      }
    };

    trackAppLaunch();
  }, []);



  useEffect(() => {
    console.log('🔥 App started');

    // Defer heavy Firebase operations to prevent startup memory issues
    const timer = setTimeout(() => {
      auth().currentUser?.getIdToken().then(token => {
        // console.log('🔥 Firebase Token:', token);
      }).catch(err => {
        console.error('❌ Firebase Token Error:', err);
      });

      console.log('🌐 API:', API.presentationGenerate);
    }, 500); // Delay by 500ms to let app settle

    return () => clearTimeout(timer);
  }, []);

  // useEffect(() => {
  //   SplashScreen.hide();
  // }, []);
  return (
    <NavigationContainer>
      <SafeAreaProvider>
        <AuthProvider>
          <TokenProvider>
            <RevenueCatProvider>
              <SubscriptionProvider>
                <AppUsageProvider>
                  <RewardedAdProvider>
                    <AppNavigator />
                  </RewardedAdProvider>
                </AppUsageProvider>
              </SubscriptionProvider>
            </RevenueCatProvider>
          </TokenProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </NavigationContainer>
  );
};

export default App;