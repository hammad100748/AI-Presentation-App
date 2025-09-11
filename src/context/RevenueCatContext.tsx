import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform, AppState } from 'react-native';
import Purchases, { PurchasesPackage, PurchasesError } from 'react-native-purchases';
import { useAuth } from './AuthContext';

// RevenueCat API keys
const API_KEYS = {
  ios: 'appl_dZuvRlbdqvzqoOUaosdgAqvmHcu', // Replace with your actual iOS API key
  android: 'goog_NVLVbddlEAIGmULkiArRHVnqdNI', // Android API key
  
};

// Product identifiers for your subscription plans
export const SUBSCRIPTION_PLANS = {
  BASIC_MONTHLY: 'slides_ai_presentation_basic_monthly_0002',
  PRO_MONTHLY: 'slides_ai_presentation_pro_monthly_0003',
  BASIC_WEEKLY: 'slides_ai_presentation_basic_weekly_0004',
  PRO_WEEKLY: 'slides_ai_presentation_pro_weekly_0006',
  THREE_DAYS: 'slide_ai_presentation_3days_005',
};

// Entitlement identifiers
export const ENTITLEMENTS = {
  PRO: 'pro_access',
};

// Map our plan identifiers to RevenueCat package identifiers
const PACKAGE_ID_MAPPING = {
  [SUBSCRIPTION_PLANS.BASIC_MONTHLY]: '$rc_monthly',
  [SUBSCRIPTION_PLANS.PRO_MONTHLY]: '$rc_monthly',
  [SUBSCRIPTION_PLANS.BASIC_WEEKLY]: '$rc_weekly',
  [SUBSCRIPTION_PLANS.PRO_WEEKLY]: '$rc_weekly',
  [SUBSCRIPTION_PLANS.THREE_DAYS]: '$rc_weekly',
};

interface RevenueCatContextType {
  isInitialized: boolean;
  packages: PurchasesPackage[];
  currentOffering: string | null;
  isPro: boolean;
  isLoading: boolean;
  purchasePackage: (packageToPurchase: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  getPackageByIdentifier: (identifier: string) => PurchasesPackage | undefined;
  refreshOfferings: () => Promise<boolean>;
  checkIfProductOwned: (productIdentifier: string) => Promise<boolean>;
  forceCheckSubscription: () => Promise<boolean>;
  debugOfferings: () => Promise<void>;
}

const RevenueCatContext = createContext<RevenueCatContextType | undefined>(undefined);

export const RevenueCatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [currentOffering, setCurrentOffering] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize RevenueCat
  useEffect(() => {
    const initializePurchases = async () => {
      try {
        const apiKey = Platform.OS === 'ios' ? API_KEYS.ios : API_KEYS.android;

        await Purchases.configure({
          apiKey,
          appUserID: currentUser?.uid, // Use Firebase user ID for RevenueCat user ID
          useAmazon: false,
        });

        setIsInitialized(true);

        await syncPurchasesWithStore();
        await fetchOfferings();
        await checkSubscriptionStatus();

        // Set up purchase listener to automatically refresh customer info
        Purchases.addCustomerInfoUpdateListener((info) => {
          setIsPro(info.entitlements.active[ENTITLEMENTS.PRO] !== undefined);
        });
      } catch (error) {
        console.error('❌ Error initializing RevenueCat:', error);
      }
    };

    if (currentUser) {
      initializePurchases();
    }

    // Clean up listener when component unmounts
    return () => {
      Purchases.removeCustomerInfoUpdateListener(null as any);
    };
  }, [currentUser]);

  // Set up app state listener to sync purchases when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  // Handle app state changes
  const handleAppStateChange = async (nextAppState: string) => {
    // When app comes to foreground
    if (nextAppState === 'active') {
      await syncPurchasesWithStore();
      await checkSubscriptionStatus();
    }
  };

  // Sync purchases with store
  const syncPurchasesWithStore = async () => {
    try {
      await Purchases.syncPurchases();
      return true;
    } catch (error) {
      console.error('Error syncing purchases:', error);
      return false;
    }
  };

  // Fetch available offerings
  const fetchOfferings = async () => {
    try {
      const offerings = await Purchases.getOfferings();

      if (offerings.current) {
        setCurrentOffering(offerings.current.identifier);
        setPackages(offerings.current.availablePackages);
      } else if (offerings.all && Object.keys(offerings.all).length > 0) {
        // Use the first offering if current is not available
        const firstOffering = Object.values(offerings.all)[0];
        setCurrentOffering(firstOffering.identifier);
        setPackages(firstOffering.availablePackages);
      }

      // Create fallback packages if none are available from RevenueCat
      if (!offerings.current && (!offerings.all || Object.keys(offerings.all).length === 0)) {
        const fallbackPackages = Object.values(SUBSCRIPTION_PLANS).map(id => ({
          identifier: id,
          packageType: 'MONTHLY' as any,
          product: {
            identifier: id,
            title: id,
            description: 'Subscription plan',
            price: 0,
            priceString: 'PKR 0',
          },
          offeringIdentifier: 'default',
        })) as PurchasesPackage[];

        setPackages(fallbackPackages);
      }
    } catch (error) {
      console.error('❌ Error fetching offerings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Force check subscription status
  const forceCheckSubscription = async (): Promise<boolean> => {
    try {
      // First sync with store to get the latest status
      await syncPurchasesWithStore();

      // Then check subscription status
      const isSubscribed = await checkSubscriptionStatus();

      return isSubscribed;
    } catch (error) {
      console.error('Error forcing subscription check:', error);
      return false;
    }
  };

  // Check subscription status
  const checkSubscriptionStatus = async (): Promise<boolean> => {
    try {
      const customerInfo = await Purchases.getCustomerInfo();

      // Check if user has active entitlements
      const hasProAccess = customerInfo.entitlements.active[ENTITLEMENTS.PRO] !== undefined;

      // Check if user has any active subscriptions
      const hasActiveSubscriptions = customerInfo.activeSubscriptions &&
                                    customerInfo.activeSubscriptions.length > 0;

      // Consider user as having a subscription if they have either pro access or any active subscription
      const hasSubscription = hasProAccess || hasActiveSubscriptions;

      setIsPro(hasSubscription);
      return hasSubscription;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  };

  // Purchase a package
  const purchasePackage = async (packageToPurchase: PurchasesPackage): Promise<boolean> => {
    try {
      setIsLoading(true);

      // Make the purchase
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);

      // Check if purchase was successful by looking at active entitlements
      const hasProAccess = customerInfo.entitlements.active[ENTITLEMENTS.PRO] !== undefined;

      // Check if the purchase exists in the customer info
      const purchaseExists = customerInfo.allPurchasedProductIdentifiers.includes(
        packageToPurchase.product.identifier
      );

      // Consider the purchase successful if either we have pro access or the product is in purchased list
      const isSuccessful = hasProAccess || purchaseExists;

      if (isSuccessful) {
        setIsPro(hasProAccess);
        return true;
      } else {
        return false;
      }
    } catch (error: any) {
      console.error('Error purchasing package:', error);

      if (error.userCancelled) {
        return false;
      }
      if (error.code === 2) {
        return true;
      }

      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Restore purchases
  const restorePurchases = async () => {
    try {
      setIsLoading(true);

      // First sync with store to ensure we have the latest data
      await syncPurchasesWithStore();

      // Then restore purchases
      const customerInfo = await Purchases.restorePurchases();

      // Check if user has active entitlements after restore
      const hasProAccess = customerInfo.entitlements.active[ENTITLEMENTS.PRO] !== undefined;

      // Check if user has any active subscriptions
      const hasActiveSubscriptions = customerInfo.activeSubscriptions &&
                                    customerInfo.activeSubscriptions.length > 0;

      setIsPro(hasProAccess);

      // Return whether restore was successful (found active subscriptions)
      return hasProAccess || hasActiveSubscriptions;
    } catch (error) {
      console.error('Error restoring purchases:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Get a package by its identifier
  const getPackageByIdentifier = (identifier: string): PurchasesPackage | undefined => {
    // First try direct mapping if available
    const mappedIdentifier = PACKAGE_ID_MAPPING[identifier];
    if (mappedIdentifier) {
      const mappedPackage = packages.find(pkg => pkg.identifier === mappedIdentifier);
      if (mappedPackage) {
        return mappedPackage;
      }
    }

    // Try to find the package by exact identifier match
    let foundPackage = packages.find(pkg => pkg.identifier === identifier);

    // If not found, try to find by product identifier
    if (!foundPackage) {
      foundPackage = packages.find(pkg => pkg.product.identifier === identifier);
    }

    // If still not found, try to find by substring match (in case of formatting differences)
    if (!foundPackage && identifier) {
      foundPackage = packages.find(pkg =>
        pkg.identifier.includes(identifier) ||
        identifier.includes(pkg.identifier) ||
        pkg.product.identifier.includes(identifier) ||
        identifier.includes(pkg.product.identifier)
      );
    }

    return foundPackage;
  };

  // Manually refresh offerings
  const refreshOfferings = async () => {
    try {
      setIsLoading(true);

      await Purchases.syncPurchases();
      const offerings = await Purchases.getOfferings();

      if (offerings.current) {
        setCurrentOffering(offerings.current.identifier);
        setPackages(offerings.current.availablePackages);
      } else if (offerings.all && Object.keys(offerings.all).length > 0) {
        // Use the first offering if current is not available
        const firstOffering = Object.values(offerings.all)[0];
        setCurrentOffering(firstOffering.identifier);
        setPackages(firstOffering.availablePackages);
      }

      return true;
    } catch (error) {
      console.error('Error refreshing offerings:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Check if user already has an active subscription for a product
  const checkIfProductOwned = async (productIdentifier: string): Promise<boolean> => {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      // First check if the product is in active subscriptions
      if (customerInfo.activeSubscriptions && customerInfo.activeSubscriptions.length > 0) {
        const isActiveSubscription = customerInfo.activeSubscriptions.includes(productIdentifier);
        if (isActiveSubscription) {
          return true;
        }
      }

      // Then check if it's in active entitlements
      const hasActiveEntitlements = Object.keys(customerInfo.entitlements.active).length > 0;
      if (hasActiveEntitlements) {
        // Check if the product is in any active entitlement
        for (const entitlement of Object.values(customerInfo.entitlements.active)) {
          if (entitlement.productIdentifier === productIdentifier) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {

      return false;
    }
  };

  // Debug function to manually check offerings
  const debugOfferings = async (): Promise<void> => {
    try {
      const offerings = await Purchases.getOfferings();
      
      if (offerings.current) {
        offerings.current.availablePackages.forEach((pkg, index) => {
          console.log(`📦 DEBUG Package ${index + 1}:`, {
            identifier: pkg.identifier,
            packageType: pkg.packageType,
            productId: pkg.product.identifier,
            title: pkg.product.title,
            description: pkg.product.description,
            price: pkg.product.price,
            priceString: pkg.product.priceString,
            currencyCode: pkg.product.currencyCode,
            offeringIdentifier: pkg.offeringIdentifier
          });
        });
      }
      
      if (offerings.all && Object.keys(offerings.all).length > 0) {
        Object.entries(offerings.all).forEach(([key, offering]) => {
          console.log(`📦 DEBUG Offering "${key}":`, {
            identifier: offering.identifier,
            packageCount: offering.availablePackages.length,
            packages: offering.availablePackages.map(pkg => ({
              identifier: pkg.identifier,
              productId: pkg.product.identifier,
              title: pkg.product.title,
              priceString: pkg.product.priceString
            }))
          });
        });
      }
    } catch (error) {
      console.error('Error in debugOfferings:', error);
    }
  };

  const value = {
    isInitialized,
    packages,
    currentOffering,
    isPro,
    isLoading,
    purchasePackage,
    restorePurchases,
    getPackageByIdentifier,
    refreshOfferings,
    checkIfProductOwned,
    forceCheckSubscription,
    debugOfferings,
  };

  return (
    <RevenueCatContext.Provider value={value}>
      {children}
    </RevenueCatContext.Provider>
  );
};

export const useRevenueCat = (): RevenueCatContextType => {
  const context = useContext(RevenueCatContext);
  if (context === undefined) {
    throw new Error('useRevenueCat must be used within a RevenueCatProvider');
  }
  return context;
};
