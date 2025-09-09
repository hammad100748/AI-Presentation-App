import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
} from 'react';
import firestore from '@react-native-firebase/firestore';
import {useAuth} from './AuthContext';
import {BASE_URL} from '../../utils';
import {Alert} from 'react-native';
import {showToast} from '../utils/showTost';
import auth from '@react-native-firebase/auth';

interface TokenObject {
  freeTokens: number;
  premiumToken: number;
}

interface TokenContextType {
  tokens: TokenObject;
  loading: boolean;
  hasSubscription: boolean;
  isSubscriptionActive: boolean;
  consumeToken: () => Promise<boolean>;
  refreshTokens: () => Promise<void>;
  addTokensToUser: (amount: number) => Promise<boolean>;
  upgradeAllUsersTokens: () => Promise<void>;
  totalTokens: number;
  isFreeUser: boolean; // New property to check if user should see ads
}

const TokenContext = createContext<TokenContextType>({
  tokens: {freeTokens: 1, premiumToken: 0},
  loading: false,
  hasSubscription: false,
  isSubscriptionActive: false,
  consumeToken: async () => false,
  refreshTokens: async () => {},
  addTokensToUser: async () => false,
  upgradeAllUsersTokens: async () => {},
  totalTokens: 2,
  isFreeUser: true, // Default to free user (will see ads)
});

export const TokenProvider: React.FC<{children: ReactNode}> = ({children}) => {
  const [tokens, setTokens] = useState<TokenObject>({
    freeTokens: 1,
    premiumToken: 0,
  });
  const [totalTokens, setTotalTokens] = useState(2);

  const [hasSubscription, setHasSubscription] = useState<boolean>(false);
  const [isSubscriptionActive, setIsSubscriptionActive] =
    useState<boolean>(false);
  const [isFreeUser, setIsFreeUser] = useState<boolean>(true); // Default to free user
  const [loading, setLoading] = useState<boolean>(true);
  const {currentUser} = useAuth();

  // Fetch user tokens whenever the current user changes
  useEffect(() => {
    if (currentUser) {
      const unsubscribe = setupTokensListener();
      return () => unsubscribe();
    } else {
      setTokens({freeTokens: 1, premiumToken: 0});
      setTotalTokens(1);
      setHasSubscription(false);
      setIsSubscriptionActive(false);
      setIsFreeUser(true);
      setLoading(false);
    }
  }, [currentUser]);

  // Setup real-time listener for user tokens
  const setupTokensListener = () => {
    if (!currentUser) {return () => {};}

    setLoading(true);

    // Create a real-time snapshot listener
    const unsubscribe = firestore()
      .collection('users')
      .doc(currentUser.uid)
      .onSnapshot(
        snapshot => {
          const userData = snapshot.data();

          if (userData) {
            let safeTokens: TokenObject;
            
            // Set tokens - ensure every user has at least 2 tokens
            if (userData.tokens !== undefined) {

              const userTokens = userData.tokens;

              safeTokens = {
                freeTokens: userTokens.freeTokens ?? 0,
                premiumToken: userTokens.premiumToken ?? 0,
              };
              setTokens(safeTokens);
              setTotalTokens(safeTokens.freeTokens + safeTokens.premiumToken);


            } else {
              // If tokens field doesn't exist, initialize with 2 tokens (2 full presentations)
              safeTokens = {freeTokens: 1, premiumToken: 0};
              firestore()
                .collection('users')
                .doc(currentUser.uid)
                .update({
                  tokens: safeTokens,
                });
              setTokens(safeTokens);
              setTotalTokens(2);
              // console.log('Initialized user with 2 tokens (2 full presentations)');
            }

            // Check subscription status
            setHasSubscription(!!userData.subscription);

            // Check if subscription is active
            const isActive =
              userData.subscription &&
              userData.subscription.status === 'active' &&
              (!userData.subscription.expiryDate ||
                new Date(userData.subscription.expiryDate) > new Date());
            setIsSubscriptionActive(isActive);

            // Determine if user is free (should see ads)
            // User is considered free if they have no premium tokens or only have the default 2 free tokens
            // This means they will see ads and have limited access
            const isUserFree = safeTokens.premiumToken === 0;
            setIsFreeUser(isUserFree);
            // console.log('User is free user (will see ads):', isUserFree, 'Tokens:', safeTokens);
          }

          setLoading(false);
        },
        error => {
          console.error('Error listening to user tokens:', error);
          setLoading(false);
        },
      );

    return unsubscribe;
  };

  // Consume a token when downloading a full presentation (1 token = 1 presentation)
  const consumeToken = async (): Promise<boolean> => {
    if (!currentUser) {return false;}
    
    // Always consume exactly 1 token per presentation, regardless of slide count
    const tokensToDeduct = 1;
    const totalAvailable = tokens.freeTokens + tokens.premiumToken;
    
    if (totalAvailable < tokensToDeduct) {
      return false;
    }
    
    try {
      setLoading(true);
      let freeTokens = tokens.freeTokens;
      let premiumToken = tokens.premiumToken;
      
      // Deduct from freeTokens first, then from premium tokens
      if (freeTokens >= tokensToDeduct) {
        freeTokens -= tokensToDeduct;
      } else {
        const remainingDeduction = tokensToDeduct - freeTokens;
        freeTokens = 0;
        premiumToken = Math.max(0, premiumToken - remainingDeduction);
      }
      
      const newTokenObj = {freeTokens, premiumToken};
      await firestore().collection('users').doc(currentUser.uid).update({
        tokens: newTokenObj,
      });
      
      setTokens(newTokenObj);
      setTotalTokens(newTokenObj.freeTokens + newTokenObj.premiumToken);
      
      // Update isFreeUser status after consuming tokens
      const newIsFreeUser = newTokenObj.premiumToken === 0;
      setIsFreeUser(newIsFreeUser);
      // console.log('Updated isFreeUser status:', newIsFreeUser);
      
      // console.log('Consumed token for full presentation. New balance:', newTokenObj);
      return true;
    } catch (error) {
      console.error('Error consuming token:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Add tokens when purchasing a subscription or token pack
  const addTokensToUser = async (amount: number) => {
    // console.log('🎯 addTokensToUser called with amount:', amount);
    // console.log('👤 Current user:', currentUser?.uid);
    
    if (!currentUser?.uid) {
      console.error('❌ No current user found');
      Alert.alert('Error', 'Please sign in');
      return false;
    }
    
    try {
      // console.log('🔐 Getting Firebase ID token...');
      // Get the Firebase ID token for authentication
      const idToken = await auth().currentUser?.getIdToken();
      if (!idToken) {
        throw new Error('User not authenticated. Please sign in again.');
      }
      // console.log('✅ Firebase ID token obtained');

      // console.log('🌐 Calling Firebase function to add tokens...');
      // console.log('📤 Request payload:', {userId: currentUser.uid, tokens: amount});
      
      const response = await fetch(
        'https://addtokens-arlkyu6kda-uc.a.run.app',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
          body: JSON.stringify({userId: currentUser.uid, tokens: amount}),
        },
      );
      
      // console.log('📥 Response status:', response.status);
      // console.log('📥 Response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error details');
        console.error('❌ API Error Response:', errorText);
        
        // Log authentication errors specifically
        if (response.status === 401) {
          console.error('Authentication error (401): Missing or invalid authorization header');
        } else if (response.status === 403) {
          console.error('Authorization error (403): Invalid or expired token');
        }
        
        throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const data = await response.json();
      // console.log('📊 Response data:', data);
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to add tokens');
      }
      
      // console.log('✅ Tokens added successfully via Firebase function');
      showToast(`You received ${amount} premium presentations!`);
      
      // Update isFreeUser status after adding tokens
      // If premium tokens were added, user is no longer free
      if (amount > 0) {
        const newIsFreeUser = false; // User now has premium tokens
        setIsFreeUser(newIsFreeUser);
        // console.log('🔄 Updated isFreeUser status after adding tokens:', newIsFreeUser);
      }
      
      return true;
    } catch (error: any) {
      console.error('❌ Failed to add tokens:', error);
      console.error('❌ Error details:', error.message);
      return false;
    }
  };

  // Refresh user tokens (now just returns a promise for API compatibility)
  const refreshTokens = async () => {
    return Promise.resolve();
  };

  // Admin function to upgrade all users to have at least 3 freeTokens
  const upgradeAllUsersTokens = async () => {
    try {
      setLoading(true);
      const usersSnapshot = await firestore().collection('users').get();
      const batch = firestore().batch();
      let upgradeCount = 0;
      usersSnapshot.docs.forEach(doc => {
        const userData = doc.data();
        const userTokens = userData.tokens;
        if (
          !userTokens ||
          typeof userTokens !== 'object' ||
          userTokens.freeTokens === undefined ||
          userTokens.freeTokens < 1
        ) {
          batch.update(doc.ref, {tokens: {freeTokens: 1, premiumToken: 0}});
          upgradeCount++;
        }
      });
      await batch.commit();
      console.log(`Upgraded ${upgradeCount} users to 1 freeTokens (1 full presentations)`);
    } catch (error) {
      console.error('Error upgrading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const value: TokenContextType = {
    tokens,
    loading,
    hasSubscription,
    isSubscriptionActive,
    consumeToken,
    refreshTokens,
    addTokensToUser,
    upgradeAllUsersTokens,
    totalTokens,
    isFreeUser,
  };

  return (
    <TokenContext.Provider value={value}>{children}</TokenContext.Provider>
  );
};

export const useTokens = () => useContext(TokenContext);
