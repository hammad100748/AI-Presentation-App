import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  Platform,
  StatusBar,
  ActivityIndicator,
  useWindowDimensions,
  Alert,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import {useAppUsage} from '../context/AppUsageContext';
import {usePurchases} from '../context/SubscriptionContext';
import {useRevenueCat} from '../context/RevenueCatContext';
import adjust from '../utils/adjust';
// Import gradient background
const gradientBg = require('../assets/images/gradient_bg.jpeg');

interface PaywallModalProps {
  visible: boolean;
}

// Add PlanType type
export type PlanType =
  | 'proMonthly'
  | 'basicMonthly'
  | 'proWeekly'
  | 'basicWeekly'
  | 'threeDays';

interface PlanProps {
  title: string;
  tokens: number; // represents presentation count now
  price: string;
  isRecommended?: boolean;
  isPro?: boolean;
  planType: PlanType;
  selectedPlan: PlanType | any;
  onSelect: (plan: PlanType) => void;
}

export const PlanCard: React.FC<PlanProps> = ({
  title,
  tokens,
  price,
  isRecommended = false,
  isPro = false,
  planType,
  selectedPlan = 'proMonthly',
  onSelect,
}) => {
  const isSelected = selectedPlan === planType;

  return (
    <TouchableOpacity
      style={[
        styles.planCard,
        isSelected && styles.selectedPlanCard,
        isSelected && isPro && styles.proPlanCard,
      ]}
      onPress={() => onSelect(planType)}>
      <View style={styles.planHeader}>
        <Text
          style={[
            styles.planTitle,
            isSelected && isPro && styles.proPlanTitle,
          ]}>
          {title}
        </Text>
      </View>
      {isRecommended && (
        <View style={styles.recommendedBadgeContainer}>
          <View style={styles.recommendedBadge}>
            <Text style={styles.recommendedText}>Best Value</Text>
          </View>
        </View>
      )}
      <View style={styles.planDetails}>
        <Text
          style={[
            styles.tokenAmount,
            isSelected && isPro && styles.proTokenAmount,
          ]}>
          {tokens} Presentations
        </Text>
        <Text
          style={[
            styles.planPrice,
            isSelected && isPro && styles.proPlanPrice,
          ]}>
          {price}
        </Text>
      </View>
      <View
        style={[
          styles.selectIndicator,
          isSelected && styles.selectedIndicator,
        ]}>
        <Ionicons
          name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
          size={16}
          color={isSelected ? '#4F67ED' : '#CCCCCC'}
        />
      </View>
    </TouchableOpacity>
  );
};

const PaywallModal: React.FC<PaywallModalProps> = ({visible}) => {
  const {dismissPaywall} = useAppUsage();
  const {width: screenWidth, height: screenHeight} = useWindowDimensions();

  const {pricesAndPkgs, purchasePackage} = usePurchases();
  const {packages: rcPackages} = useRevenueCat();
  const [selectedPlan, setSelectedPlan] = useState<PlanType | string | null>('proMonthly');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState<boolean>(false);
  const hasSetInitialSelection = useRef<boolean>(false);



  const handleSubscribe = async () => {
    if (!selectedPlan) return;

    try {
      setIsProcessing(true);

      // Prefer real RC package
      const selectedPkg = (rcPackages || []).find(p => p.product.identifier === selectedPlan);
      const planToBuy: any = selectedPkg
        ? selectedPkg
        : selectedPlan === 'proMonthly'
        ? pricesAndPkgs.proMonthly
        : selectedPlan === 'basicMonthly'
        ? pricesAndPkgs.basicMonthly
        : selectedPlan === 'proWeekly'
        ? pricesAndPkgs.proWeekly
        : selectedPlan === 'basicWeekly'
        ? pricesAndPkgs.basicWeekly
        : pricesAndPkgs.threeDays;

      const result = await purchasePackage(planToBuy as any, `pw_${selectedPlan}`);

      if (result) {
        setPurchaseSuccess(true);
        setTimeout(() => {
          handleDismiss();
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

  const handleDismiss = () => {
    // Only dismiss the modal, don't try to navigate back

    dismissPaywall();
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

  const planFeatures = [
    'Premium templates',
    'Higher quality AI generated content',
    'Priority support',
    'No watermarks',
    'Export to multiple formats',
  ];

  // Extract plans from pricesAndPkgs
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

  // Map product identifiers to presentation limits (legacy fallback)
  const presentationLimits: Record<string, number> = {
    slides_ai_presentation_pro_monthly_0003: 1,
    slides_ai_presentation_basic_monthly_0002: 5,
    slides_ai_presentation_pro_weekly_0006: 10,
    slides_ai_presentation_basic_weekly_0004: 20,
    slide_ai_presentation_3days_005: 50,
  };

  // Extract presentation count from product metadata
  const extractPresentationCount = (
    productId?: string,
    title?: string,
    description?: string,
  ): number => {
    const fromId = productId?.match(/_(\d+)_presentations?/i) || productId?.match(/_(\d+)_presentation/i);
    if (fromId && fromId[1]) return parseInt(fromId[1], 10);
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
      tokens:
        extractPresentationCount(
          pkg.product.identifier,
          pkg.product.title as any,
          (pkg.product as any).description as any,
        ) || presentationLimits[pkg.product.identifier] || 0,
      priceString: pkg.product.priceString,
      planType: pkg.product.identifier as any,
      isRecommended: false,
      isPro: true,
      _pkg: pkg,
    }))
    .sort((a, b) => (a.tokens || 0) - (b.tokens || 0));

  // Auto-select the 10 presentations plan only when modal first opens
  useEffect(() => {
    if (visible && realPlans.length > 0 && !hasSetInitialSelection.current) {
      const tenPresentationPlan = realPlans.find(plan => plan.tokens === 10);
      if (tenPresentationPlan) {
        setSelectedPlan(tenPresentationPlan.id);
        hasSetInitialSelection.current = true;
        console.log('🎯 PaywallModal: Auto-selected 10 presentations plan:', tenPresentationPlan.id);
      }
    }
  }, [visible, realPlans]);

  // Reset the initial selection flag when modal closes
  useEffect(() => {
    if (!visible) {
      hasSetInitialSelection.current = false;
    }
  }, [visible]);

  const monthlyPlans = [
    proMonthly && {
      title: proMonthly.product.title,
      tokens: presentationLimits[proMonthly.product.identifier] || 0,
      price: proMonthlyPrice,
      isRecommended: true,
      isPro: true,
      planType: 'proMonthly',
      pkg: proMonthly,
    },
    basicMonthly && {
      title: basicMonthly.product.title,
      tokens: presentationLimits[basicMonthly.product.identifier] || 0,
      price: basicMonthlyPrice,
      isRecommended: false,
      isPro: false,
      planType: 'basicMonthly',
      pkg: basicMonthly,
    },
  ].filter(Boolean);

  const weeklyPlans = [
    proWeekly && {
      title: proWeekly.product.title,
      tokens: presentationLimits[proWeekly.product.identifier] || 0,
      price: proWeeklyPrice,
      isRecommended: false,
      isPro: true,
      planType: 'proWeekly',
      pkg: proWeekly,
    },
    basicWeekly && {
      title: basicWeekly.product.title,
      tokens: presentationLimits[basicWeekly.product.identifier] || 0,
      price: basicWeeklyPrice,
      isRecommended: false,
      isPro: false,
      planType: 'basicWeekly',
      pkg: basicWeekly,
    },
  ].filter(Boolean);

  const shortTermPlan = threeDays
    ? {
        title: threeDays.product.title,
        tokens: presentationLimits[threeDays.product.identifier] || 0,
        price: threeDaysPrice,
        isRecommended: false,
        isPro: false,
        planType: 'threeDays',
        pkg: threeDays,
      }
    : null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleDismiss}>
      <View style={styles.modalContainer}>
        <StatusBar
          backgroundColor="rgba(0, 0, 0, 0.5)"
          barStyle="light-content"
        />
        <ImageBackground
          source={gradientBg}
          style={styles.backgroundImage}
          resizeMode="cover">
          {/* Close Button with increased hit area and better positioning */}
          <TouchableOpacity
            style={[
              styles.closeIconButton,
              {top: Platform.OS === 'ios' ? adjust(50) : adjust(20)}
            ]}
            onPress={handleDismiss}
            hitSlop={{top: 20, right: 20, bottom: 20, left: 20}}
            activeOpacity={0.6}>
            <View style={styles.closeButtonCircle}>
              <Ionicons name="close" size={adjust(24)} color="#333" />
            </View>
          </TouchableOpacity>

          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              {paddingBottom: adjust(120)} // Extra padding for sticky buttons
            ]}
            showsVerticalScrollIndicator={false}
            bounces={true}
            alwaysBounceVertical={false}
            keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <Text style={styles.mainTitle}>Upgrade to Premium</Text>
              <Text style={styles.subtitle}>
                Get unlimited presentations and premium features
              </Text>
            </View>

            <View style={styles.featuresCard}>
              <Text style={styles.featureTitle}>Premium Features</Text>

              {planFeatures.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={adjust(20)} color="#4F67ED" />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>

            {realPlans.length > 0 ? (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Available Plans</Text>
                {realPlans.map(plan => (
                  <PlanCard
                    key={plan.id}
                    title={plan.title}
                    tokens={plan.tokens}
                    price={plan.priceString}
                    isRecommended={plan.isRecommended}
                    isPro={!!plan.isPro}
                    planType={plan.planType as any}
                    selectedPlan={selectedPlan as any}
                    onSelect={() => setSelectedPlan(plan.id)}
                  />
                ))}
              </View>
            ) : (
              <>
                {/* Fallback to legacy static groupings */}
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>Monthly Plans</Text>
                  {monthlyPlans.map(plan =>
                    plan ? (
                      <PlanCard
                        key={plan.planType || ''}
                        title={getPlanDisplayName(plan.planType)}
                        tokens={plan.tokens}
                        price={plan.price || ''}
                        isRecommended={plan.isRecommended}
                        isPro={plan.isPro}
                        planType={plan.planType as PlanType}
                        selectedPlan={selectedPlan as any}
                        onSelect={handleSelectPlan}
                      />
                    ) : null,
                  )}
                </View>
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>Weekly Plans</Text>
                  {weeklyPlans.map(plan =>
                    plan ? (
                      <PlanCard
                        key={plan.planType || ''}
                        title={getPlanDisplayName(plan.planType)}
                        tokens={plan.tokens}
                        price={plan.price || ''}
                        isRecommended={plan.isRecommended}
                        isPro={plan.isPro}
                        planType={plan.planType as PlanType}
                        selectedPlan={selectedPlan as any}
                        onSelect={handleSelectPlan}
                      />
                    ) : null,
                  )}
                </View>
                {shortTermPlan && (
                  <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Short Term Plans</Text>
                    <PlanCard
                      title={getPlanDisplayName(shortTermPlan.planType)}
                      tokens={shortTermPlan.tokens}
                      price={shortTermPlan.price || ''}
                      isPro={shortTermPlan.isPro}
                      planType={shortTermPlan.planType as PlanType}
                      selectedPlan={selectedPlan as any}
                      onSelect={handleSelectPlan}
                    />
                  </View>
                )}
              </>
            )}

            {/* Additional spacing at the bottom to ensure content doesn't get hidden behind sticky buttons */}
            <View style={styles.bottomSpacing} />
          </ScrollView>

          {/* Sticky Bottom Buttons Container */}
          <View style={styles.stickyBottomContainer}>
            <TouchableOpacity
              style={[
                styles.upgradeButton,
                isProcessing && styles.upgradeButtonDisabled,
                purchaseSuccess && styles.upgradeButtonSuccess,
              ]}
              onPress={handleSubscribe}
              disabled={!selectedPlan || isProcessing || purchaseSuccess}>
              <Text style={styles.upgradeButtonText}>
                {purchaseSuccess
                  ? '✅ Purchase Successful!'
                  : isProcessing
                  ? 'Processing...'
                  : selectedPlan
                  ? 'Continue to Subscribe'
                  : 'Select a Plan'}
              </Text>
              {isProcessing && (
                <ActivityIndicator size="small" color="#FFFFFF" style={{marginLeft: adjust(8)}} />
              )}
            </TouchableOpacity>

            {/* Limited access button with improved styling and touch area */}
            <TouchableOpacity
              style={styles.limitedAccessButton}
              onPress={handleDismiss}
              hitSlop={{top: adjust(10), right: adjust(10), bottom: adjust(10), left: adjust(10)}}
              activeOpacity={0.7}>
              <Text style={styles.limitedAccessText}>
                Continue with limited access
              </Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  closeIconButton: {
    position: 'absolute',
    right: adjust(20),
    zIndex: 10,
  },
  closeButtonCircle: {
    width: adjust(36),
    height: adjust(36),
    borderRadius: adjust(18),
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: adjust(2)},
    shadowOpacity: 0.15,
    shadowRadius: adjust(3),
    elevation: 3,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: adjust(20),
    paddingTop: Platform.OS === 'ios' ? adjust(90) : adjust(70),
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: adjust(20),
    marginTop: 0,
  },
  mainTitle: {
    fontSize: adjust(28),
    fontWeight: 'bold',
    color: '#222',
    marginBottom: adjust(10),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: adjust(16),
    color: '#666',
    textAlign: 'center',
    marginBottom: adjust(20),
  },
  featuresCard: {
    backgroundColor: 'white',
    borderRadius: adjust(16),
    padding: adjust(20),
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: adjust(4)},
    shadowOpacity: 0.1,
    shadowRadius: adjust(8),
    elevation: 5,
    marginBottom: adjust(20),
  },
  featureTitle: {
    fontSize: adjust(18),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: adjust(15),
    textAlign: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: adjust(12),
  },
  featureText: {
    fontSize: adjust(15),
    color: '#444',
    marginLeft: adjust(10),
  },
  sectionContainer: {
    width: '100%',
    marginBottom: adjust(10),
  },
  sectionTitle: {
    fontSize: adjust(16),
    fontWeight: '600',
    color: '#333',
    marginBottom: adjust(8),
    paddingLeft: adjust(4),
  },
  planCard: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: adjust(10),
    padding: adjust(12),
    marginBottom: adjust(8),
    shadowColor: '#000',
    shadowOffset: {width: 0, height: adjust(1)},
    shadowOpacity: 0.1,
    shadowRadius: adjust(2),
    elevation: 2,
    position: 'relative',
  },
  proPlanCard: {
    backgroundColor: '#f0f4ff',
    borderWidth: 1,
    borderColor: '#4F67ED',
  },
  selectedPlanCard: {
    borderWidth: 1.5,
    borderColor: '#4F67ED',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: adjust(6),
  },
  recommendedBadgeContainer: {
    alignItems: 'flex-start',
    marginBottom: adjust(4),
  },
  planTitle: {
    fontSize: adjust(12),
    fontWeight: '600',
    color: '#333',
    width: '95%',
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
    fontSize: adjust(14),
    fontWeight: '500',
    color: '#666',
  },
  proTokenAmount: {
    color: '#4F67ED',
  },
  planPrice: {
    fontSize: adjust(16),
    fontWeight: 'bold',
    color: '#333',
  },
  proPlanPrice: {
    color: '#4F67ED',
  },
  recommendedBadge: {
    backgroundColor: '#4F67ED',
    paddingHorizontal: adjust(6),
    paddingVertical: adjust(2),
    borderRadius: adjust(6),
    zIndex: 1,
    alignSelf: 'flex-start',
  },
  recommendedText: {
    color: 'white',
    fontSize: adjust(10),
    fontWeight: '600',
  },
  selectIndicator: {
    position: 'absolute',
    top: adjust(12),
    right: adjust(12),
  },
  selectedIndicator: {
    backgroundColor: 'white',
    borderRadius: adjust(8),
  },
  // Sticky bottom container for buttons
  stickyBottomContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    padding: adjust(16),
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    zIndex: 10,
  },
  upgradeButton: {
    backgroundColor: '#4F67ED',
    borderRadius: adjust(10),
    paddingVertical: adjust(14),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: adjust(10),
  },
  upgradeButtonText: {
    color: 'white',
    fontSize: adjust(13),
    fontWeight: '600',
    marginRight: adjust(6),
  },
  upgradeButtonDisabled: {
    backgroundColor: '#A0A0A0',
  },
  upgradeButtonSuccess: {
    backgroundColor: '#4CAF50',
  },
  limitedAccessButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: adjust(10),
    paddingVertical: adjust(14),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: adjust(8),
  },
  limitedAccessText: {
    color: '#4F67ED',
    fontSize: adjust(13),
    fontWeight: '600',
    marginRight: adjust(6),
  },
  bottomSpacing: {
    height: adjust(20),
  },
});

export default PaywallModal;
