import {GoogleSignin} from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from 'react';
import {Platform} from 'react-native';
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
  signInWithGoogle: () => Promise<any>; // For Android
  signInWithApple: () => Promise<any>; // For iOS
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
  signInWithApple: async () => null,
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

      // Handle hash collection lookup for token restoration
      let hashData = null;
      
      // Check if email exists and is not a private relay email
      if (email) {
        console.log('🔍 Checking hash collection for email:', email);
        console.log('🔍 Is private relay email?', email.includes('@privaterelay.appleid.com'));
        
        // For Apple private relay emails, we can't restore previous tokens
        // since the private relay email changes and isn't consistent
        if (!email.includes('@privaterelay.appleid.com')) {
          console.log('📧 Regular email detected, checking for previous token data');
          hashData = await getUserFromHashCollection(email);
        } else {
          console.log('🔒 Private relay email detected, skipping token restoration');
          console.log('🔒 Private relay emails are unique per app and cannot be used for token restoration');
        }
      } else {
        console.log('❌ No email provided');
      }

      if (hashData) {
        try {
          if (hashData && hashData.tokens) {
            initialTokens = hashData.tokens;
            await removeUserFromHashCollection(email);
            console.log('✅ Token data restored from hash collection:', initialTokens);
          } else {
            console.log('No previous token data found, using default tokens:', initialTokens);
          }
        } catch (hashError: any) {
          console.error('Error checking hash collection:', hashError);
          crashlytics().recordError(hashError);
        }
      } else {
        console.log('📝 Using default tokens for new user:', initialTokens);
      }

      // Create user document in Firestore
      const userDoc = {
        uid,
        email,
        displayName,
        phoneNumber,
        photoURL,
        tokens: initialTokens,
        fcmTokens,
        // Add metadata for Apple Sign-In users
        authProvider: email?.includes('@privaterelay.appleid.com') ? 'apple' : 'google',
        isPrivateRelay: email?.includes('@privaterelay.appleid.com') || false,
        createdAt: firestore.Timestamp.now(),
      };

      await firestore().collection('users').doc(uid).set(userDoc);
      console.log('✅ User successfully added to Firestore with auth provider:', userDoc.authProvider);
      
      if (userDoc.isPrivateRelay) {
        console.log('🔒 User signed in with Apple Private Relay email');
      }
      
    } catch (error: any) {
      console.error('Error adding user to Firestore:', error);
      crashlytics().recordError(error);
    }
  };

  const signInWithApple = async () => {
    try {
      setLoading(true);
      
      // Check if Apple Sign-In is available
      if (!appleAuth.isSupported) {
        throw new Error('Apple Sign-In is not supported on this device');
      }

      // Start the sign-in request
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });

      // Ensure Apple returned a user identityToken
      if (!appleAuthRequestResponse.identityToken) {
        throw new Error('Apple Sign-In failed - no identity token returned');
      }

      console.log('Apple Sign-In Response:', {
        email: appleAuthRequestResponse.email,
        fullName: appleAuthRequestResponse.fullName,
        user: appleAuthRequestResponse.user,
        realUserStatus: appleAuthRequestResponse.realUserStatus,
      });

      // Create a Firebase credential from the response
      const { identityToken, nonce } = appleAuthRequestResponse;
      const appleCredential = auth.AppleAuthProvider.credential(identityToken, nonce);

      // Sign the user in with the credential
      const userCredential = await auth().signInWithCredential(appleCredential);
      
      // Handle the email scenario - Apple provides email only on first sign-in
      // or we need to get it from Firebase Auth user
      let userEmail = appleAuthRequestResponse.email || userCredential.user.email;
      
      // Handle display name - combine first and last name from Apple response
      let displayName = userCredential.user.displayName;
      if (!displayName && appleAuthRequestResponse.fullName) {
        const { givenName, familyName } = appleAuthRequestResponse.fullName;
        if (givenName || familyName) {
          displayName = `${givenName || ''} ${familyName || ''}`.trim();
        }
      }
      
      console.log('Apple Sign-In processed email:', userEmail);
      console.log('Apple Sign-In processed displayName:', displayName);
      console.log('Firebase user email:', userCredential.user.email);
      console.log('Is email private relay?', userEmail?.includes('@privaterelay.appleid.com'));
      
      setLoading(false);
      showToast('Sign in Successfully');
      
      return userCredential;
    } catch (error: any) {
      console.error('Apple Sign-In Error:', error);
      crashlytics().recordError(error);
      console.error('Error details:', error.message, error.code);
      crashlytics().log(`Apple Sign-In Error details: ${error.message}, ${error.code}`);
      setLoading(false);
      
      // Handle specific Apple Sign-In errors
      if (error.code === '1001') {
        // User cancelled the sign-in flow
        console.log('User cancelled Apple Sign-In');
        return null;
      }
      
      // Check for network-related errors and show toast
      if (error.code === 'NETWORK_ERROR' || 
          error.message?.includes('network') || 
          error.message?.includes('Network') ||
          error.message?.includes('connection') ||
          error.message?.includes('Connection')) {
        showToast('Network error. Please check your internet connection and try again.');
      }
      
      throw error; // Re-throw to allow handling in the UI
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
        
        // Check if this is a private relay email
        const isPrivateRelay = userData.email.includes('@privaterelay.appleid.com');
        
        console.log('🔍 Account deletion - Email type:', {
          email: userData.email,
          isPrivateRelay,
          authProvider: userData.authProvider
        });
        
        let operations = [
          // Always delete user document from Firestore
          firestore().collection('users').doc(currentUser.uid).delete()
        ];

        // Only try to preserve tokens for non-private relay emails
        // Private relay emails can't be used for token restoration since they're unique per app
        if (!isPrivateRelay) {
          console.log('📧 Regular email - preserving tokens for future restoration');
          operations.push(
            storeUserInHashCollection(userData.email, userData.tokens || 0)
          );
        } else {
          console.log('🔒 Private relay email - tokens cannot be preserved');
          console.log('🔒 Private relay emails are unique and cannot be used for token restoration');
        }

        // Try cloud function first, but don't wait for it if it fails
        setDeleteProgress('Processing account deletion...');
        let cloudFunctionPromise;
        
        if (!isPrivateRelay) {
          // Only call cloud function for regular emails
          cloudFunctionPromise = callDeleteUserDataFunction(
            userData.email,
            userData.tokens || 0,
            currentUser.uid,
          ).catch((error: any) => {
            console.log('Cloud function failed, using fallback:', error.message);
            crashlytics().recordError(error);
            return null; // Don't throw, just continue with fallback
          });
        } else {
          // For private relay emails, create a resolved promise
          cloudFunctionPromise = Promise.resolve(null);
          console.log('🔒 Skipping cloud function for private relay email');
        }

        // Wait for all operations to complete
        await Promise.all([...operations, cloudFunctionPromise]);
        
        setDeleteProgress('Signing you out...');
        // Logout user
        await logout();
        
        setDeleteProgress('Account deleted successfully!');
        
        if (isPrivateRelay) {
          showToast('Account deleted. Note: Tokens cannot be restored for Apple Private Relay emails.');
        } else {
          showToast('Account deleted successfully');
        }
        
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
    signInWithApple, // Apple Sign-In for iOS
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
