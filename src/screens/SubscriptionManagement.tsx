import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Platform,
  ImageBackground,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../navigations';
import Ionicons from '@react-native-vector-icons/ionicons';
import {usePurchases} from '../context/SubscriptionContext';
import {useRevenueCat} from '../context/RevenueCatContext';
import {PlanCard, PlanType} from '../components/PaywallModal';
import adjust from '../utils/adjust';

// Import gradient background
const gradientBg = require('../assets/images/gradient_bg.jpeg');

type SubscriptionManagementNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'SubscriptionManagement'
>;

const SubscriptionManagement = () => {
  const navigation = useNavigation<SubscriptionManagementNavigationProp>();
  const {restorePurchases, pricesAndPkgs, purchasePackage} = usePurchases();
  const {packages: rcPackages} = useRevenueCat();
  const [selectedPlan, setSelectedPlan] = useState<any>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState<boolean>(false);
  const {
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
  } = pricesAndPkgs;

  // Map product identifiers to presentation limits
  // 1 token = 1 full presentation (regardless of slide count)
  const presentationLimits: Record<string, number> = {
    slides_ai_presentation_pro_monthly_0003: 1,      // 👑 Starter Spark: 1 presentation
    slides_ai_presentation_basic_monthly_0002: 5,    // 🔓 Pro Pack: 5 presentations
    slides_ai_presentation_pro_weekly_0006: 10,     // 🔑 Business Boost: 10 presentations
    slides_ai_presentation_basic_weekly_0004: 20,   // 🏆 Premium Creator: 20 presentations
    slide_ai_presentation_3days_005: 50,            // 💼 Enterprise Unlimited: 50 presentations
  };

  // Extract presentation count from product metadata
  const extractPresentationCount = (productId?: string, title?: string, description?: string): number => {
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

  // Build plans directly from real RevenueCat packages when available
  const realPlans = (rcPackages || [])
    .map(pkg => ({
      id: pkg.product.identifier,
      title: pkg.product.title,
      tokens: extractPresentationCount(
        pkg.product.identifier,
        pkg.product.title,
        pkg.product.description as any
      ) || presentationLimits[pkg.product.identifier] || 0,
      price: pkg.product.price,
      priceString: pkg.product.priceString,
      planType: pkg.product.identifier as PlanType,
      packageIdentifier: pkg.identifier,
      isRecommended: false,
      isPro: true,
      _pkg: pkg,
    }))
    .sort((a, b) => (a.tokens || 0) - (b.tokens || 0));

  // Auto-select the 10 presentations plan when plans are loaded (only once)
  const hasSetInitialSelection = useRef<boolean>(false);
  
  useEffect(() => {
    if (realPlans.length > 0 && !hasSetInitialSelection.current) {
      const tenPresentationPlan = realPlans.find(plan => plan.tokens === 10);
      if (tenPresentationPlan) {
        setSelectedPlan(tenPresentationPlan.id);
        hasSetInitialSelection.current = true;
      }
    }
  }, [realPlans]);

  // Add a fallback for handleContinue if not defined
  const handleSubscribe = async () => {
    if (!selectedPlan) return;
    
    try {
      setIsProcessing(true);

      // Prefer real RevenueCat package if available
      const selectedPkg = realPlans.find(p => p.id === selectedPlan)?._pkg;
      if (!selectedPkg) {
        Alert.alert('Purchase Failed', 'Please try again');
        return;
      }

      const result = await purchasePackage(selectedPkg as any, `rc_${selectedPlan}`);

      if (result) {
        setPurchaseSuccess(true);
        setTimeout(() => {
          navigation.goBack();
          setPurchaseSuccess(false);
        }, 1000);
      } else {
        Alert.alert('Purchase Failed', 'Please try again');
      }
    } catch (error: any) {
      Alert.alert('Purchase Failed', 'Please try again');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };
  const handleSelectPlan = (plan: PlanType) => {
    setSelectedPlan(plan);
  };

  // Helper function to get plan display names
  const getPlanDisplayName = (planType: string) => {
    switch (planType) {
      case 'proMonthly':
        return '👑 Starter Spark    1 presentation';
      case 'basicMonthly':
        return '🔓 Pro Pack          5 presentations';
      case 'proWeekly':
        return '🔑 Business Boost   10 presentations';
      case 'basicWeekly':
        return '🏆 Premium Creator  20 presentations';
      case 'threeDays':
        return '💼 Enterprise Unlimited  50 presentations';
      default:
        return 'Plan';
    }
  };

  return (
    <View style={styles.mainContainer}>
      <ImageBackground
        source={gradientBg}
        style={styles.backgroundImage}
        resizeMode="cover">
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent={true}
        />

        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="chevron-back" size={20} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Choose Your Plan</Text>
            <View style={styles.headerRight} />
          </View>

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}>
            <View style={styles.container}>
              <View style={styles.iconContainer}>
                <Ionicons name="diamond" size={28} color="#4F67ED" />
              </View>

              <Text style={styles.mainTitle}>Unlock Premium Features</Text>
              <Text style={styles.subtitle}>
                Select a plan that works best for you
              </Text>

              {/* Available Plans from RevenueCat */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Available Plans</Text>
                {realPlans.length === 0 ? (
                  <Text style={{ textAlign: 'center', color: '#666' }}>Loading plans...</Text>
                ) : (
                  realPlans.map(plan => (
                      <PlanCard
                        key={plan.id}
                      title={plan.title}
                        tokens={plan.tokens}
                        price={plan.priceString}
                        isRecommended={plan.isRecommended}
                        isPro={!!plan.isPro}
                        planType={plan.planType as PlanType}
                        selectedPlan={selectedPlan as PlanType}
                      onSelect={() => handleSelectPlan(plan.id as any)}
                      />
                  ))
                )}
              </View>

              {/* Hide old sections when real plans exist */}
              {realPlans.length === 0 && (
              <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>Weekly Plans</Text>
                </View>
              )}

              {realPlans.length === 0 && (
              <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>Short Term Plans</Text>
                </View>
              )}

              {/* Additional spacing at the bottom for sticky button */}
              <View style={styles.bottomSpacing} />
            </View>
          </ScrollView>

          {/* Sticky Action Buttons */}
          <View style={styles.stickyButtonContainer}>
            <TouchableOpacity
              style={[
                styles.continueButton,
                !selectedPlan && styles.continueButtonDisabled,
                isProcessing && styles.continueButtonDisabled,
                purchaseSuccess && styles.continueButtonSuccess,
              ]}
              onPress={handleSubscribe}
              disabled={!selectedPlan || isProcessing || purchaseSuccess}>
              <Text style={styles.continueButtonText}>
                {purchaseSuccess
                  ? '✅ Purchase Successful!'
                  : isProcessing
                  ? 'Processing...'
                  : selectedPlan
                  ? 'Subscribe'
                  : 'Select a Plan'}
              </Text>
              {isProcessing && (
                <ActivityIndicator size="small" color="#FFFFFF" style={{marginLeft: adjust(8)}} />
              )}
              {!isProcessing && !purchaseSuccess && selectedPlan && (
                <Ionicons name="arrow-forward" size={adjust(16)} color="white" style={{marginLeft: adjust(8)}} />
              )}
            </TouchableOpacity>

            {/* Restore Purchases Button - Only show on iOS */}
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.restoreButton}
                onPress={restorePurchases}
                disabled={isProcessing}>
                <Text style={styles.restoreButtonText}>Restore Purchases</Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#4F67ED',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  headerRight: {
    width: 28,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  container: {
    flex: 1,
    padding: 10,
    paddingBottom: 20,
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 14,
  },
  sectionContainer: {
    width: '100%',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    paddingLeft: 4,
  },
  planCard: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
    position: 'relative',
  },
  proPlanCard: {
    backgroundColor: '#f0f4ff',
    borderWidth: 0,
  },
  selectedPlanCard: {
    borderWidth: 1.5,
    borderColor: '#4F67ED',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  planTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  proPlanTitle: {
    color: '#4F67ED',
  },
  planDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tokenAmount: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  proTokenAmount: {
    color: '#4F67ED',
  },
  planPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  proPlanPrice: {
    color: '#4F67ED',
  },
  recommendedBadge: {
    backgroundColor: '#4F67ED',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 21,
  },
  recommendedText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '600',
  },
  selectIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  selectedIndicator: {
    backgroundColor: 'white',
    borderRadius: 8,
  },
  continueButton: {
    backgroundColor: '#4F67ED',
    borderRadius: adjust(10),
    paddingVertical: adjust(14),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: adjust(10),
  },
  continueButtonText: {
    color: 'white',
    fontSize: adjust(13),
    fontWeight: '600',
  },
  continueButtonDisabled: {
    backgroundColor: '#A0A0A0',
  },
  continueButtonSuccess: {
    backgroundColor: '#4CAF50',
  },
  restoreButton: {
    marginTop: adjust(15),
    padding: adjust(10),
    alignItems: 'center',
  },
  restoreButtonText: {
    fontSize: adjust(14),
    color: '#4F67ED',
    textDecorationLine: 'underline',
  },
  bottomSpacing: {
    height: adjust(120), // Increased spacing for sticky button
  },
  stickyButtonContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    padding: adjust(12),
    paddingBottom: Platform.OS === 'android' ? adjust(8) : adjust(20), // Less padding on Android
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    zIndex: 1000,
  },
});

export default SubscriptionManagement;
