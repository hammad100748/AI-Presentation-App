import {GoogleSignin} from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from 'react';
import {
  removeUserFromHashCollection,
  getUserFromHashCollection,
  storeUserInHashCollection,
  callDeleteUserDataFunction,
} from '../utils/hash';
import LoadingScreen from '../components/LoadingScreen';
import crashlytics from '@react-native-firebase/crashlytics';
import {showToast} from '../utils/showTost';
import usePushNotification from '../hooks/usePushNotification';
// import usePushNotification from '../hooks/usePushNotification';

// Secret key for encryption - in production, this should be stored securely

// Simple hash function for document IDs

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
}

interface AuthContextType {
  initializing: boolean;
  currentUser: User | null;
  signInWithGoogle: () => Promise<any>; // Updated method name
  logout: () => void;
  deleteAccount: () => Promise<boolean>;
  loading: boolean;
  setResults: any;
  results: any;
}

const AuthContext = createContext<AuthContextType>({
  initializing: true,
  currentUser: null,
  signInWithGoogle: async () => null,
  logout: () => {},
  deleteAccount: async () => false,
  loading: false,
  setResults: () => {},
  results: '',
});

const STORAGE_KEYS = {
  LAST_LOGIN_TIME: 'LAST_LOGIN_TIME',
};

export const AuthProvider: React.FC<{children: ReactNode}> = ({children}) => {
  const { getFCMToken, updateFCMTokenInFirestore} =
    usePushNotification();
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [results, setResults] = useState<string>('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState('');

  useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        '1035894450264-0rl99319s0sl8b4aqrei6f99t6srmf4c.apps.googleusercontent.com', // Web client ID from Firebase console
      offlineAccess: true, // If you need offline access
      forceCodeForRefreshToken: true, // Force code for refresh token
      iosClientId:
        '1035894450264-0rl99319s0sl8b4aqrei6f99t6srmf4c.apps.googleusercontent.com', // iOS client ID from Firebase console
    });

    // Check if GoogleSignin is configured properly
    const checkSignInStatus = async () => {
      try {
        const user = await GoogleSignin.getCurrentUser();
        console.log(
          'GoogleSignin is configured properly. Current user:',
          user ? 'signed in' : 'not signed in',
        );
      } catch (error: any) {
        console.error('GoogleSignin configuration error:', error);
        crashlytics().recordError(error);
      }
    };
    
    checkSignInStatus();

    // Set up Firebase auth state listener
    const unsubscribe = auth().onAuthStateChanged(onAuthStateChanged);

    // Cleanup function to unsubscribe when component unmounts
    return () => unsubscribe();
  }, []);

  

  const onAuthStateChanged = async (authUser: any) => {
    setLoading(true);
    if (authUser) {
      const {uid, email, displayName, phoneNumber, photoURL} = authUser;

      // Update last login time
      try {
        const currentTime = Date.now();
        await AsyncStorage.setItem(
          STORAGE_KEYS.LAST_LOGIN_TIME,
          currentTime.toString(),
        );
      } catch (error: any) {
        console.error('Error saving last login time:', error);
        crashlytics().recordError(error);
      }

      const fireStoreUser = await getUserFromFireStore(uid);
      
      // Add a small delay to ensure Firebase messaging is fully initialized
      console.log('⏳ Waiting for Firebase messaging to initialize...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Try to get FCM token with retries
      let fcmToken = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`🔄 FCM token attempt ${attempt}/3`);
        fcmToken = await getFCMToken();
        console.log(`🔍 Attempt ${attempt} result:`, fcmToken ? `Token received (${fcmToken.length} chars)` : 'No token');
        if (fcmToken) {
          console.log(`✅ FCM token obtained on attempt ${attempt}`);
          break;
        }
        if (attempt < 3) {
          console.log(`⏳ Waiting before retry...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      console.log(`🎯 Final FCM token result:`, fcmToken ? `SUCCESS - ${fcmToken.length} chars` : 'FAILED - No token');
      
              console.log('Auth state changed - User:', { uid, email, displayName });
        console.log('FCM Token:', fcmToken ? `Received: ${fcmToken.substring(0, 20)}...` : 'Not available');
        console.log('FCM Token length:', fcmToken ? fcmToken.length : 0);
        console.log('FCM Token type:', typeof fcmToken);

      if (!fireStoreUser) {
        console.log('New user: Add them to Firestore');
        // New user: Add them to Firestore
        await addUserToFireStore({
          uid,
          email,
          displayName,
          phoneNumber,
          photoURL,
          fcmToken: fcmToken || undefined,
        });
        setCurrentUser({uid, email, displayName, photoURL});
        console.log('New user added to current user state');
        
        // If FCM token was not available during user creation, try to update it later
        if (!fcmToken) {
          console.log('FCM token not available during user creation, will retry later');
          // Retry FCM token generation after a short delay
          setTimeout(async () => {
            try {
              const retryFcmToken = await getFCMToken();
              if (retryFcmToken) {
                console.log('FCM token generated on retry, updating Firestore');
                await updateFCMTokenInFirestore(uid, retryFcmToken);
              } else {
                console.log('FCM token still not available after retry');
              }
            } catch (error) {
              console.log('Failed to generate FCM token on retry:', error);
            }
          }, 5000); // Retry after 5 seconds
        }
      } else {
        // Existing user: Check and update FCM token if needed
        const existingFcmTokens = fireStoreUser.fcmTokens || [];
        if (fcmToken && !existingFcmTokens.includes(fcmToken)) {
          await updateFCMTokenInFirestore(authUser.uid, fcmToken);
        }
        
        // Always set current user for existing users
        setCurrentUser(fireStoreUser as User);
        console.log('Existing user loaded from Firestore');
      }
    } else {
      // If no user is authenticated
      console.log('No authenticated user, clearing current user state');
      setCurrentUser(null);
    }

    setLoading(false);
    if (initializing) {
      console.log('Initialization complete');
      setInitializing(false);
    }
  };

  const getUserFromFireStore = async (userId: string) => {
    try {
      const userDoc = await firestore().collection('users').doc(userId).get();
      // Call data() method first and check if result exists
      const userData = userDoc.data();
      return userData || null;
    } catch (error: any) {
      console.error('Error getting user from Firestore:', error);
      crashlytics().recordError(error);
      return null;
    }
  };

  const addUserToFireStore = async (authUser: any) => {
    try {
      const {uid, email, displayName, phoneNumber, photoURL, fcmToken} = authUser;

      // Initialize tokens value - Free users get 2 tokens (2 full presentations)
      let initialTokens = {freeTokens: 1, premiumToken: 0}; // Default for new users
      let fcmTokens = [];
      
      // Use the FCM token passed from the caller if it exists
      console.log('🔍 addUserToFireStore - fcmToken received:', fcmToken);
      console.log('🔍 addUserToFireStore - fcmToken type:', typeof fcmToken);
      console.log('🔍 addUserToFireStore - fcmToken length:', fcmToken ? fcmToken.length : 0);
      
      if (fcmToken && fcmToken.trim() !== '') {
        fcmTokens.push(fcmToken);
        console.log('✅ FCM token added to user document:', fcmToken.substring(0, 20) + '...');
      } else {
        console.log('❌ No FCM token available for new user');
        console.log('❌ fcmToken value:', fcmToken);
        console.log('❌ fcmToken is null:', fcmToken === null);
        console.log('❌ fcmToken is undefined:', fcmToken === undefined);
        console.log('❌ fcmToken is empty string:', fcmToken === '');
      }
      const hashData = await getUserFromHashCollection(email);
      if (hashData) {
        try {
          if (hashData && hashData.tokens) {
            initialTokens = hashData.tokens;
            await removeUserFromHashCollection(email);
          } else {
            console.log(
              'No previous token data found, using default tokens:',
              initialTokens,
            );
          }
        } catch (hashError: any) {
          console.error('Error checking hash collection:', hashError);
          crashlytics().recordError(hashError);
        }
      } else {
        console.log('No email provided, using default tokens');
      }
      await firestore().collection('users').doc(uid).set({
        uid,
        email,
        displayName,
        phoneNumber,
        photoURL,
        tokens: initialTokens,
        fcmTokens,
      });
      console.log('User successfully added to Firestore');
    } catch (error: any) {
      console.error('Error adding user to Firestore:', error);
      crashlytics().recordError(error);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;
      
      if (!idToken) {
        throw new Error('Failed to get ID token from Google Sign In');
      }
      
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      await auth().signInWithCredential(googleCredential);
      setLoading(false);
      showToast('Sign in Successfully');
    } catch (error: any) {
      console.error('Google Sign-In Error:', error);
      crashlytics().recordError(error);
      console.error('Error details:', error.message, error.code);
      crashlytics().log(`Error details: ${error.message}, ${error.code}`);
      setLoading(false);
      
      // Check for network-related errors and show toast
      if (error.code === 'NETWORK_ERROR' || 
          error.message?.includes('network') || 
          error.message?.includes('Network') ||
          error.message?.includes('connection') ||
          error.message?.includes('Connection') ||
          error.code === 'auth/network-request-failed') {
        showToast('Network error. Please check your internet connection and try again.');
      }
      
      throw error; // Re-throw to allow handling in the UI
    }
  };

  const logout = async () => {
    try {
      setCurrentUser(null);
      await auth().signOut();
      await GoogleSignin.revokeAccess();
      console.log('Logout successful');
    } catch (error: any) {
      console.error('Error logging out:', error.message);
      crashlytics().recordError(error);
    }
  };

  const deleteAccount = async (): Promise<boolean> => {
    try {
      if (!currentUser) {
        crashlytics().log('No user is currently logged in');
        showToast('No user is currently logged in');
        return false;
      }
      
      setLoading(true);
      setIsDeletingAccount(true);
      setDeleteProgress('Preparing to delete your account...');
      
      // Get current user data including tokens
      setDeleteProgress('Fetching your account data...');
      const userDoc = await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .get();
      const userData = userDoc.data();
      
      if (userData && userData.email) {
        setDeleteProgress('Preserving your tokens...');
        
        // Use Promise.all to run operations in parallel for better performance
        const operations = [
          // Store tokens in hash collection (fallback)
          storeUserInHashCollection(userData.email, userData.tokens || 0),
          // Delete user document from Firestore
          firestore().collection('users').doc(currentUser.uid).delete()
        ];

        // Try cloud function first, but don't wait for it if it fails
        setDeleteProgress('Processing account deletion...');
        const cloudFunctionPromise = callDeleteUserDataFunction(
          userData.email,
          userData.tokens || 0,
          currentUser.uid,
        ).catch((error: any) => {
          console.log('Cloud function failed, using fallback:', error.message);
          crashlytics().recordError(error);
          return null; // Don't throw, just continue with fallback
        });

        // Wait for all operations to complete
        await Promise.all([...operations, cloudFunctionPromise]);
        
        setDeleteProgress('Signing you out...');
        // Logout user
        await logout();
        
        setDeleteProgress('Account deleted successfully!');
        showToast('Account deleted successfully');
        
        // Small delay to show success message
        setTimeout(() => {
          setLoading(false);
          setIsDeletingAccount(false);
          setDeleteProgress('');
        }, 1000);
        
        return true;
      } else {
        crashlytics().log('User data or email not found');
        showToast('User data or email not found');
        setLoading(false);
        setIsDeletingAccount(false);
        setDeleteProgress('');
        return false;
      }
    } catch (error: any) {
      crashlytics().recordError(error);
      showToast('Error deleting account');
      setLoading(false);
      setIsDeletingAccount(false);
      setDeleteProgress('');
      return false;
    }
  };

  const value: any = {
    initializing,
    currentUser,
    signInWithGoogle, // Use the updated method name
    logout,
    deleteAccount,
    loading,
    results,
    setResults,
    isDeletingAccount,
  };

  console.log('AuthProvider render - isDeletingAccount:', isDeletingAccount);

  return (
    <AuthContext.Provider value={value}>
      {children}
      <LoadingScreen 
        isVisible={isDeletingAccount} 
        message="Deleting your account..." 
        progressMessage={deleteProgress}
      />
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
