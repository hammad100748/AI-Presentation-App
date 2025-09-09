import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BackHandler, View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

// Screens
import Login from '../screens/Login';
import Home from '../screens/Home';
import GeneratingPresentation from '../screens/Generating-presentation';
import PresentationResult from '../screens/Presentation-result';
import RecentlyCreated from '../screens/RecentlyCreated';
import Settings from '../screens/Settings';
import SubscriptionManagement from '../screens/SubscriptionManagement';
import AdminScreen from '../screens/AdminScreen';
import AboutApp from '../screens/AboutApp';
import usePushNotification from '../hooks/usePushNotification';

// Navigation types
export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  GeneratingPresentation: {
    topic: string;
    // Default values for the new API
    length?: 'short' | 'informative' | 'detailed' | 'custom';
    slides?: number;
    language?: string;
    tone?: string;
    textAmount?: string;
    includeImages?: boolean;
    customInstructions?: string;
    template?: string;
  };
  PresentationResult: {
    presentationUrl: string;
    presentationId?: string; // Added for PowerPoint Online access
    templateName: string;
    fromGenerationScreen?: boolean;
    topic?: string;
    numberOfSlides?: number;
    actualTitle?: string; // Add actual title from API
  };
  RecentlyCreated: undefined;
  Settings: undefined;
  SubscriptionManagement: undefined;
  AdminScreen: undefined;
  AboutApp: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Auth Navigator - Handles authentication flow
const AuthNavigator = () => {
  const { currentUser, initializing } = useAuth();

  useEffect(() => {
    const listenToNotifications = async () => {
      const {requestUserPermission, getFCMToken} = usePushNotification();
      try {
        const res = await requestUserPermission();
        if (res) {
          getFCMToken();
        }
      } catch (error: any) {
        console.log('Error at getting push notification: ', error.message);
      }
    };

    listenToNotifications();
  }, []);

  // Show loading screen while checking auth status
  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F67ED" />
      </View>
    );
  }

  return (
      <Stack.Navigator
      initialRouteName={currentUser ? 'Home' : 'Login'}
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}>
      {!currentUser ? (
        // Auth screens
        <Stack.Screen name="Login" component={Login} />
      ) : (
        // App screens
        <>
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen
          name="GeneratingPresentation"
          component={GeneratingPresentation}
          options={{
            gestureEnabled: false,
            headerLeft: () => null,
          }}
        />
        <Stack.Screen
          name="PresentationResult"
          component={PresentationResult}
          options={{
            gestureEnabled: false,
            headerLeft: () => null,
          }}
        />
        <Stack.Screen name="RecentlyCreated" component={RecentlyCreated} />
        <Stack.Screen name="Settings" component={Settings} />
        <Stack.Screen name="SubscriptionManagement" component={SubscriptionManagement} />
        <Stack.Screen name="AdminScreen" component={AdminScreen} />
        <Stack.Screen name="AboutApp" component={AboutApp} />
        </>
      )}
      </Stack.Navigator>
  );
};

const AppNavigator = () => <AuthNavigator />;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e6f2ff',
  },
});

export default AppNavigator;
