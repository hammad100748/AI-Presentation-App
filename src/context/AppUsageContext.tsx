import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import crashlytics from '@react-native-firebase/crashlytics';

interface AppUsageContextType {
  appLaunchCount: number;
  lastVisitDate: string;
  shouldShowPaywall: boolean;
  dismissPaywall: () => Promise<void>;
  resetPaywallStatus: () => Promise<void>;
  forceShowPaywall: () => Promise<void>;
}

// Keys for AsyncStorage
const APP_LAUNCH_COUNT_KEY = '@ai_presentation_app_launch_count';
const LAST_VISIT_DATE_KEY = '@ai_presentation_last_visit_date';
const HAS_SEEN_PAYWALL_ONCE_KEY = '@ai_presentation_has_seen_paywall_once';

const AppUsageContext = createContext<AppUsageContextType>({
  appLaunchCount: 0,
  lastVisitDate: '',
  shouldShowPaywall: true,
  dismissPaywall: async () => {},
  resetPaywallStatus: async () => {},
  forceShowPaywall: async () => {},
});

export const AppUsageProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [appLaunchCount, setAppLaunchCount] = useState<number>(0);
  const [hasSeenPaywallOnce, setHasSeenPaywallOnce] = useState<boolean>(false);
  const [lastVisitDate, setLastVisitDate] = useState<string>('');
  const [initialized, setInitialized] = useState<boolean>(false);
  const [forcePaywall, setForcePaywall] = useState<boolean>(false);
  const [showPaywall, setShowPaywall] = useState<boolean>(false);
  const [appState, setAppState] = useState(AppState.currentState);
  const [paywallDismissedThisSession, setPaywallDismissedThisSession] = useState<boolean>(false);

  // Load app usage data and handle app state changes
  useEffect(() => {
    // Load data on initial mount
    loadAppUsageData();

    // Add app state change listener
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Clean up subscription
    return () => {
      subscription.remove();
    };
  }, []);

  // Handle app state changes (background, active)
  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    // When app comes to foreground
    if ((appState === 'background' || appState === 'inactive') && nextAppState === 'active') {
      const today = new Date().toDateString();

      // Check if it's a new day since last visit
      if (lastVisitDate !== today) {
        // Update last visit date
        await AsyncStorage.setItem(LAST_VISIT_DATE_KEY, today);
        setLastVisitDate(today);
      }
    }

    setAppState(nextAppState);
  };

  const loadAppUsageData = async () => {
    try {
      const storedLaunchCount = await AsyncStorage.getItem(APP_LAUNCH_COUNT_KEY);
      const storedHasSeenPaywallOnce = await AsyncStorage.getItem(HAS_SEEN_PAYWALL_ONCE_KEY);
      const storedLastVisitDate = await AsyncStorage.getItem(LAST_VISIT_DATE_KEY);

      // Get current date
      const today = new Date().toDateString();

      // Set last visit date
      setLastVisitDate(storedLastVisitDate || '');

      // Set launch count, default to 0
      let launchCount = storedLaunchCount ? parseInt(storedLaunchCount, 10) : 0;

      // Increment launch count on every app open
      launchCount += 1;
      await AsyncStorage.setItem(APP_LAUNCH_COUNT_KEY, launchCount.toString());
      setAppLaunchCount(launchCount);

      console.log(`App launch count incremented to: ${launchCount}`);

      // Set paywall seen state
      const hasSeenPaywall = storedHasSeenPaywallOnce === 'true';
      setHasSeenPaywallOnce(hasSeenPaywall);

      // Update last visit date if needed
      if (storedLastVisitDate !== today) {
        await AsyncStorage.setItem(LAST_VISIT_DATE_KEY, today);
        setLastVisitDate(today);
      }

      setInitialized(true);

      // Reset session dismissal flag on app launch
      setPaywallDismissedThisSession(false);

      // Set initial paywall visibility
      // Show paywall on 1st visit OR every 3rd visit after the first, but only if not dismissed this session
      const shouldShow = !hasSeenPaywall || (hasSeenPaywall && (launchCount - 1) % 3 === 0);
      setShowPaywall(shouldShow);
    } catch (error:any) {
      console.error('Error loading app usage data:', error);
      crashlytics().recordError(error);
      setInitialized(true);
    }
  };

  // Dismiss the paywall
  const dismissPaywall = async (): Promise<void> => {
    try {
      console.log('🔒 AppUsageContext: dismissPaywall called');
      console.log('🔒 Before dismissal:', {
        hasSeenPaywallOnce,
        showPaywall,
        forcePaywall,
        paywallDismissedThisSession
      });

      // If this is the first time seeing the paywall, mark it as seen
      if (!hasSeenPaywallOnce) {
        await AsyncStorage.setItem(HAS_SEEN_PAYWALL_ONCE_KEY, 'true');
        setHasSeenPaywallOnce(true);
        console.log('🔒 Marked paywall as seen for the first time');
      }

      setForcePaywall(false);
      setShowPaywall(false);
      setPaywallDismissedThisSession(true);
      console.log('🔒 Paywall dismissed successfully');
      console.log('🔒 After dismissal:', {
        hasSeenPaywallOnce: !hasSeenPaywallOnce ? true : hasSeenPaywallOnce,
        showPaywall: false,
        forcePaywall: false,
        paywallDismissedThisSession: true
      });
    } catch (error:any) {
      console.error('Error dismissing paywall:', error);
      crashlytics().recordError(error);
    }
  };

  // Reset paywall status (for testing or after subscription)
  const resetPaywallStatus = async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(HAS_SEEN_PAYWALL_ONCE_KEY);
      await AsyncStorage.setItem(APP_LAUNCH_COUNT_KEY, '0');
      setAppLaunchCount(0);
      setHasSeenPaywallOnce(false);
      setForcePaywall(false);
      setShowPaywall(false);
      setPaywallDismissedThisSession(false);
      console.log('Paywall status reset');
    } catch (error:any) {
      console.error('Error resetting paywall status:', error);
      crashlytics().recordError(error);
    }
  };

  // Force show paywall regardless of other conditions
  const forceShowPaywall = async (): Promise<void> => {
    setForcePaywall(true);
    setShowPaywall(true);
    setPaywallDismissedThisSession(false);
    console.log('Paywall forced to show');
  };

  // Use the showPaywall state to determine visibility, but respect session dismissal
  const shouldShowPaywall = (showPaywall || forcePaywall) && !paywallDismissedThisSession;

  // Add debugging logs
  useEffect(() => {
    console.log('🔍 Paywall Debug Info:', {
      showPaywall,
      forcePaywall,
      paywallDismissedThisSession,
      shouldShowPaywall,
      hasSeenPaywallOnce,
      appLaunchCount
    });
  }, [showPaywall, forcePaywall, paywallDismissedThisSession, shouldShowPaywall, hasSeenPaywallOnce, appLaunchCount]);

  const value: AppUsageContextType = {
    appLaunchCount,
    lastVisitDate,
    shouldShowPaywall,
    dismissPaywall,
    resetPaywallStatus,
    forceShowPaywall,
  };

  return <AppUsageContext.Provider value={value}>{children}</AppUsageContext.Provider>;
};

export const useAppUsage = () => useContext(AppUsageContext);
