import React, {
  createContext,
  useEffect,
  useState,
  useContext,
  useRef,
} from 'react';
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  MakePurchaseResult,
  PurchasesOffering,
  PurchasesPackage,
  PurchasesStoreTransaction,
} from 'react-native-purchases';
import {Alert, Platform} from 'react-native';
// import SplashScreen from 'react-native-splash-screen';
import analytics from '@react-native-firebase/analytics';
import {useAuth} from './AuthContext';
import {useTokens} from './TokenContext';

export type PurchasesContextProps = {
  currentOffering: PurchasesOffering | null;
  purchasePackage: (
    packageToPurchase: PurchasesPackage,
    ref: any,
  ) => Promise<MakePurchaseResult>;
  customerInfo?: CustomerInfo;
  isSubscribed: boolean;
  initialized: boolean;
  getNonSubscriptionPurchase: (
    identifier: string,
  ) => Promise<PurchasesStoreTransaction | null | undefined>;
  restorePurchases: () => Promise<void>;
  pricesAndPkgs: {
    proMonthly?: PurchasesPackage;
    basicMonthly?: PurchasesPackage;
    proWeekly?: PurchasesPackage;
    basicWeekly?: PurchasesPackage;
    threeDays?: PurchasesPackage;
    proMonthlyPrice?: string;
    basicMonthlyPrice?: string;
    proWeeklyPrice?: string;
    basicWeeklyPrice?: string;
    threeDaysPrice?: string;
  };
};

export const PurchasesContext = createContext<
  PurchasesContextProps | undefined
>(undefined);

type SubscriptionProviderProps = {
  children: React.ReactNode;
};

const androidApiKey = 'goog_NVLVbddlEAIGmULkiArRHVnqdNI';
const iosApiKey = '---------';

// Helper: Extract presentation count from product metadata
const extractPresentationCount = (
  productId?: string,
  title?: string,
  description?: string,
): number => {
  // Try productId patterns like: slide_ai_presentation_business_10_presentation
  const fromId = productId?.match(/_(\d+)_presentations?/i) || productId?.match(/_(\d+)_presentation/i);
  if (fromId && fromId[1]) return parseInt(fromId[1], 10);
  // Try title/description phrases like: "Access 50 AI-powered presentations"
  const fromTitle = title?.match(/(\d+)\s*presentations?/i);
  if (fromTitle && fromTitle[1]) return parseInt(fromTitle[1], 10);
  const fromDesc = description?.match(/(\d+)\s*presentations?/i);
  if (fromDesc && fromDesc[1]) return parseInt(fromDesc[1], 10);
  return 0;
};

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({
  children,
}) => {
  const [initialized, setInitialized] = useState(false); // State to check if Purchases is initialized
  const [offering, setOffering] = useState<PurchasesOffering | null>(null); // State to store current offering
  const [isSubscribed, setIsSubscribed] = useState(false); // State to check if user is subscribed
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>(); // State to store customer infor

  const {addTokensToUser, tokens} = useTokens();
  const subRef = useRef<any>(null);
  const {currentUser} = useAuth();

  // Function to initialize Purchases SDK
  const init = async () => {
    Purchases.configure({
      apiKey: Platform.OS === 'ios' ? iosApiKey : androidApiKey,
      // appUserID: auth().currentUser?.uid
    });

    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG); // Enable debug logging in development
    }

    await getOfferings(); // Fetch the offerings

    // Listener to update customer info when it changes

    Purchases.addCustomerInfoUpdateListener(customerInfo => {
      if (subRef.current) {
        // Sanitize event name to follow Firebase rules
        const eventName = String(subRef.current)
          .replace(/[^a-zA-Z0-9_]/g, '_')
          .replace(/^[0-9]/, 'event_$&')
          .substring(0, 40);
        analytics().logEvent(eventName);
      }
      setCustomerInfo(customerInfo);
    });

    setInitialized(true); // Set initialized to true after setup
  };

  // Function to fetch offerings from Purchases SDK

  const getOfferings = async () => {
    try {
      const offerings = await Purchases.getOfferings();
      const currentOffering = offerings.current;

      setOffering(currentOffering); // Update state with current offering
    } catch (error) {

    }
  };

  // Function to call backend to add tokens

  // Function to handle package purchases
  const purchasePackage = async (
    packageToPurchase: PurchasesPackage,
    ref: any,
  ) => {
    try {
      subRef.current = ref;

      
      const result = await Purchases.purchasePackage(packageToPurchase);

      
      // Check if purchase was successful
      if (result && result.customerInfo) {

        
        // After successful purchase, add presentation tokens based on purchased package
        const productId = packageToPurchase.product.identifier;
        const productTitle = packageToPurchase.product.title as any;
        const productDesc = (packageToPurchase.product as any).description as string | undefined;
        let presentationsToAdd = extractPresentationCount(productId, productTitle, productDesc);
        
        // Fallback mapping for legacy IDs, if parsing failed
        if (!presentationsToAdd) {
          const legacyMap: Record<string, number> = {
            slides_ai_presentation_pro_monthly_0003: 1,
            slides_ai_presentation_basic_monthly_0002: 5,
            slides_ai_presentation_pro_weekly_0006: 10,
            slides_ai_presentation_basic_weekly_0004: 20,
            slide_ai_presentation_3days_005: 50,
          };
          presentationsToAdd = legacyMap[productId] || 0;
        }
        

        
        if (presentationsToAdd && presentationsToAdd > 0) {

          const tokenResult = await addTokensToUser(presentationsToAdd);
          
          if (tokenResult) {

          } else {
            console.error('❌ Failed to add premium tokens');
          }
        } else {

        }
      } else {
        console.error('❌ Purchase result is invalid');
      }
      
      return result;
    } catch (error) {

      throw error; // Re-throw to let calling components handle the error
    }
  };

  // Function to fetch customer info from Purchases SDK
  const getCustomerInfo = async () => {
    const customerInfo = await Purchases.getCustomerInfo();
    setCustomerInfo(customerInfo); // Update state with customer info
  };

  const checkIfUserIsSubscribed = async () => {
    setIsSubscribed(tokens.premiumToken > 0);
    // SplashScreen.hide();
  };

  // Function to get non-subscription purchases
  const getNonSubscriptionPurchase = async (identifier: string) => {
    if (!initialized || !customerInfo) {return null;}

    const item = customerInfo.nonSubscriptionTransactions.find(
      t => t.productIdentifier === identifier,
    );

    return item; // Return the non-subscription purchase item
  };

  const restorePurchases = async () => {
    try {
      // Restore purchases
      const customerInfo = await Purchases.restorePurchases();

      // Handle the restored purchases
      if (
        customerInfo.activeSubscriptions.length > 0 ||
        Object.keys(customerInfo.entitlements.active).length > 0
      ) {
        Alert.alert('Success', 'Purchases restored successfully!');
      } else {
        Alert.alert('No Purchases', 'No purchases were found to restore.');
      }
    } catch (error) {
      // Handle error
      Alert.alert(
        'Error',
        'Failed to restore purchases. Please try again later.',
      );
    }
  };

  // Effect to initialize Purchases SDK on component mount
  useEffect(() => {
    init();
    getCustomerInfo();
  }, []);

  // Return null if not initialized to avoid rendering children prematurely
  useEffect(() => {
    checkIfUserIsSubscribed();
  }, [initialized, customerInfo, tokens, currentUser]);

  if (!initialized) {
    return null;
  }

  const proMonthly = offering?.availablePackages[0];
  const basicMonthly = offering?.availablePackages[1];
  const proWeekly = offering?.availablePackages[2];
  const basicWeekly = offering?.availablePackages[3];
  const threeDays = offering?.availablePackages[4];

  const proMonthlyPrice = proMonthly?.product.priceString;
  const basicMonthlyPrice = basicMonthly?.product.priceString;
  const proWeeklyPrice = proWeekly?.product.priceString;
  const basicWeeklyPrice = basicWeekly?.product.priceString;
  const threeDaysPrice = threeDays?.product.priceString;

  const pricesAndPkgs: any = {
    proMonthly,
    basicMonthly,
    proWeekly,
    basicWeekly,
    threeDays,
    proMonthlyPrice,
    basicMonthlyPrice,
    proWeeklyPrice,
    basicWeeklyPrice,
    threeDaysPrice,
  };

  const value: PurchasesContextProps = {
    currentOffering: offering,
    purchasePackage,
    customerInfo,
    isSubscribed,
    getNonSubscriptionPurchase,
    initialized,
    restorePurchases,
    pricesAndPkgs,
  };

  return (
    <PurchasesContext.Provider value={value}>
      {children}
    </PurchasesContext.Provider>
  );
};

// Hook to use Purchases context
export const usePurchases = (): PurchasesContextProps => {
  const context = useContext(PurchasesContext);
  if (context === undefined) {
    throw new Error('usePurchases must be used within a SubscriptionProvider');
  }
  return context;
};
