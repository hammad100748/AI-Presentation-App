import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';
import {PermissionsAndroid, Platform} from 'react-native';

const usePushNotification = () => {
  const requestUserPermission = async () => {
    console.log('🔐 Requesting user permission for notifications...');
    console.log('📱 Platform:', Platform.OS, 'Version:', Platform.Version);
    
    if (Platform.OS === 'ios') {
      // Request iOS permission
      console.log('🍎 Requesting iOS notification permission...');
      const authStatus = await messaging().requestPermission();
      console.log('🍎 iOS permission status:', authStatus);
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      
      console.log('🍎 iOS permission enabled:', enabled);
      return enabled;
    } else if (Platform.OS === 'android' && Platform.Version >= 33) {
      // Request Android permission for API level 33 and above
      console.log('🤖 Requesting Android notification permission...');
      const res = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      console.log('🤖 Android permission result:', res);
      const granted = res === PermissionsAndroid.RESULTS.GRANTED;
      console.log('🤖 Android permission granted:', granted);
      return granted;
    } else {
      // For Android versions below API level 33, permission is not required
      console.log('🤖 Android version < 33, permission not required');
      return true;
    }
  };

  const getFCMToken = async () => {
    try {
      console.log('🔥 Attempting to get FCM token...');
      
      // First check if messaging is available
      if (!messaging) {
        console.log('❌ Firebase messaging is not available');
        return null;
      }
      
      console.log('✅ Firebase messaging is available');
      
      // Check if we have permission first
      const authStatus = await messaging().hasPermission();
      console.log('📱 Messaging permission status:', authStatus);
      
      if (authStatus === messaging.AuthorizationStatus.DENIED) {
        console.log('❌ Messaging permission denied, requesting permission...');
        const permissionGranted = await requestUserPermission();
        if (!permissionGranted) {
          console.log('❌ Permission request denied');
          return null;
        }
        console.log('✅ Permission granted after request');
      } else if (authStatus === messaging.AuthorizationStatus.AUTHORIZED) {
        console.log('✅ Messaging permission already authorized');
      } else if (authStatus === messaging.AuthorizationStatus.PROVISIONAL) {
        console.log('✅ Messaging permission provisional');
      } else {
        console.log('❓ Unknown messaging permission status:', authStatus);
      }
      
      // Get the token
      console.log('🔄 Calling messaging().getToken()...');
      
      // Check if Cloud Messaging is enabled
      try {
        const fcmToken = await messaging().getToken();
        console.log('🔍 FCM token result:', fcmToken ? 'Token received' : 'No token');
        console.log('🔍 FCM token value:', fcmToken);
        console.log('🔍 FCM token type:', typeof fcmToken);
        console.log('🔍 FCM token length:', fcmToken ? fcmToken.length : 0);
        
        if (fcmToken) {
          console.log('✅ FCM token received successfully, length:', fcmToken.length);
          console.log('🔑 Token preview:', fcmToken.substring(0, 20) + '...');
          return fcmToken;
        } else {
          console.log('❌ Failed to get FCM token: No token received');
          console.log('❌ This might indicate Cloud Messaging is not enabled in Firebase console');
          return null;
        }
      } catch (tokenError: any) {
        console.log('❌ Error getting FCM token:', tokenError.message);
        console.log('❌ This might indicate Cloud Messaging is not enabled in Firebase console');
        return null;
      }
    } catch (error: any) {
      console.log('❌ Failed to get FCM token:', error.message);
      console.log('❌ Error details:', error);
      console.log('❌ Error stack:', error.stack);
      return null;
    }
  };

  const listenToForegroundNotifications = async () => {
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log(
        'A new message arrived! (FOREGROUND)',
        JSON.stringify(remoteMessage),
      );
    });
    return unsubscribe;
  };

  const listenToBackgroundNotifications = async () => {
    const unsubscribe = messaging().setBackgroundMessageHandler(
      async remoteMessage => {
        console.log(
          'A new message arrived! (BACKGROUND)',
          JSON.stringify(remoteMessage),
        );
      },
    );
    return unsubscribe;
  };

  const onNotificationOpenedAppFromBackground = async () => {
    const unsubscribe = messaging().onNotificationOpenedApp(
      async remoteMessage => {
        console.log(
          'App opened from BACKGROUND by tapping notification:',
          JSON.stringify(remoteMessage),
        );
      },
    );
    return unsubscribe;
  };

  const onNotificationOpenedAppFromQuit = async () => {
    const message = await messaging().getInitialNotification();

    if (message) {
      console.log(
        'App opened from QUIT by tapping notification:',
        JSON.stringify(message),
      );
    }
  };

  const updateFCMTokenInFirestore = async (
    userId: string,
    fcmToken: string,
    removeToken: boolean = false,
  ) => {
    console.log({fcmToken});
    
    // Don't proceed if fcmToken is undefined, null, or empty
    if (!fcmToken) {
      console.log('FCM token is empty or undefined, skipping update');
      return;
    }
    
    try {
      await firestore()
        .collection('users')
        .doc(userId)
        .update({
          fcmTokens: !removeToken
            ? firestore.FieldValue.arrayUnion(fcmToken)
            : firestore.FieldValue.arrayRemove(fcmToken),
        });
    } catch (error) {
      console.error('Error updating FCM token in Firestore:', error);
    }
  };

  return {
    requestUserPermission,
    getFCMToken,
    listenToForegroundNotifications,
    listenToBackgroundNotifications,
    onNotificationOpenedAppFromBackground,
    onNotificationOpenedAppFromQuit,
    updateFCMTokenInFirestore,
  };
};

export default usePushNotification;
