import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  useWindowDimensions,
  Alert,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import {usePurchases} from '../context/SubscriptionContext';
import {PlanCard, PlanType} from './PaywallModal';
import adjust from '../utils/adjust';
import {useRevenueCat} from '../context/RevenueCatContext';


interface TokenUsageBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onContinueLimited: () => void;
  outOfTokens?: boolean;
  source?: 'home' | 'custom';
  showTokenWarning?: boolean;
  requiredTokens?: number;
  zeroTokens?: boolean; // New prop for when user has 0 tokens
  onSubscribe?: () => void; // New prop for subscribe action
}

// Plan data structure
interface PlanData {
  id: PlanType;
  title: string;
  tokens: number;
  price: number;
  priceString: string;
  period: 'monthly' | 'weekly' | 'days';
  isRecommended?: boolean;
  isPro?: boolean;
  packageIdentifier?: string; // RevenueCat package identifier
}

const TokenUsageBottomSheet: React.FC<TokenUsageBottomSheetProps> = ({
  visible,
  onContinueLimited,
  onClose,
  outOfTokens = false,
  source = 'home',
  showTokenWarning = false,
  requiredTokens = 3,
  zeroTokens = false,
  onSubscribe,
}) => {
  const {width: screenWidth, height: screenHeight} = useWindowDimensions();
  const {purchasePackage, pricesAndPkgs} = usePurchases();
  const {packages: rcPackages} = useRevenueCat();
  const [selectedPlan, setSelectedPlan] = useState<any>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState<boolean>(false);

  // Auto-select the 10 presentations plan when bottom sheet opens
  useEffect(() => {
    if (visible && realPlans.length > 0) {
      const tenPresentationPlan = realPlans.find(plan => plan.tokens === 10);
      if (tenPresentationPlan) {
        setSelectedPlan(tenPresentationPlan.id);
        console.log('🎯 TokenUsageBottomSheet: Auto-selected 10 presentations plan:', tenPresentationPlan.id);
      }
    }
  }, [visible]);

  // Extract plans from pricesAndPkgs (like PaywallModal)
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

  const handleSubscribe = async () => {
    if (!selectedPlan) return;

    try {
      setIsProcessing(true);

      // Prefer real RC package
      const selectedPkg = realPlans.find(p => p.id === selectedPlan)?._pkg;
      const planToBuy: any = selectedPkg
        ? selectedPkg
        : selectedPlan === 'proMonthly'
        ? proMonthly
        : selectedPlan === 'basicMonthly'
        ? basicMonthly
        : selectedPlan === 'proWeekly'
        ? proWeekly
        : selectedPlan === 'basicWeekly'
        ? basicWeekly
        : threeDays;

      const result = await purchasePackage(planToBuy, `bs_${selectedPlan}`);

      if (result) {
        setPurchaseSuccess(true);
        setTimeout(() => {
          onClose();
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={styles.emptyLeftSide} />
            <Text style={styles.modalTitle}>Choose Your Plan</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={true}
            alwaysBounceVertical={false}
            contentContainerStyle={{flexGrow: 1}}>
            <View style={[styles.container, { paddingBottom: adjust(120) }]}>
              
                <>
              {showTokenWarning && !zeroTokens && (
                <View style={styles.tokenWarningBanner}>
                  <Text style={styles.tokenWarningText}>
                    ⚠️ You need 1 token to generate this presentation.
                  </Text>
                </View>
              )}
              {/* Out of tokens message */}
              {zeroTokens && (
                <View style={{marginBottom: adjust(16), alignItems: 'center'}}>
                  <Text style={{color: '#D32F2F', fontWeight: 'bold', fontSize: adjust(16)}}>
                    You are out of tokens.
                  </Text>
                </View>
              )}
              {/* Token Usage Info */}
              <View style={styles.tokenInfoCard}>
                <Text style={styles.tokenInfoTitle}>How Tokens Work</Text>
                <View style={styles.tokenInfoItem}>
                  <Ionicons
                    name="information-circle"
                    size={adjust(20)}
                    color="#4F67ED"
                  />
                  <Text style={styles.tokenInfoText}>
                    Each presentation consumes 1 token
                  </Text>
                </View>
                <View style={styles.tokenInfoItem}>
                  <Ionicons name="refresh-circle" size={adjust(20)} color="#4F67ED" />
                  <Text style={styles.tokenInfoText}>
                    Tokens refresh with each subscription renewal
                  </Text>
                </View>
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
                      planType={plan.planType}
                      selectedPlan={selectedPlan}
                      onSelect={() => setSelectedPlan(plan.id as any)}
                    />
                  ))}
                </View>
              ) : (
                <>
                  {/* Legacy fallback sections if RC packages not ready */}
                  <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Monthly Plans</Text>
                    {monthlyPlans.map((plan: any) => (
                      <PlanCard
                        key={plan.planType}
                        title={getPlanDisplayName(plan.planType)}
                        tokens={plan.tokens}
                        price={plan.price}
                        isRecommended={plan.isRecommended}
                        isPro={plan.isPro}
                        planType={plan.planType}
                        selectedPlan={selectedPlan}
                        onSelect={setSelectedPlan}
                      />
                    ))}
                  </View>
                  <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Weekly Plans</Text>
                    {weeklyPlans.map((plan: any) => (
                      <PlanCard
                        key={plan.planType}
                        title={getPlanDisplayName(plan.planType)}
                        tokens={plan.tokens}
                        price={plan.price}
                        isRecommended={plan.isRecommended}
                        isPro={plan.isPro}
                        planType={plan.planType}
                        selectedPlan={selectedPlan}
                        onSelect={setSelectedPlan}
                      />
                    ))}
                  </View>
                  {shortTermPlan && (
                    <View style={styles.sectionContainer}>
                      <Text style={styles.sectionTitle}>Short Term Plans</Text>
                      <PlanCard
                        key={shortTermPlan.planType}
                        title={getPlanDisplayName(shortTermPlan.planType)}
                        tokens={shortTermPlan.tokens}
                        price={shortTermPlan.price as any}
                        isRecommended={shortTermPlan.isRecommended}
                        isPro={shortTermPlan.isPro}
                        planType={shortTermPlan.planType as any}
                        selectedPlan={selectedPlan}
                        onSelect={setSelectedPlan}
                      />
                    </View>
                  )}
                </>
              )}
              
              {/* Additional spacing at the bottom */}
              <View style={styles.bottomSpacing} />
                </>
              )}
            </View>
          </ScrollView>
          {/* Sticky Action Buttons */}
          <View style={styles.stickyButtonContainer}>
            {zeroTokens ? (
              // Simplified buttons for zero tokens
              <>
                <TouchableOpacity
                  style={styles.subscribeButton}
                  onPress={onSubscribe || onClose}>
                  <Text style={styles.subscribeButtonText}>Subscribe</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelButtonBottom}
                  onPress={onClose}>
                  <Text style={styles.cancelButtonBottomText}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : (
              // Regular buttons with plans
              <>
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
                  ? 'Continue to Subscribe'
                  : 'Select a Plan'}
              </Text>
              {isProcessing && (
                <ActivityIndicator size="small" color="#FFFFFF" style={{marginLeft: adjust(8)}} />
              )}
            </TouchableOpacity>
            {/* Continue Limited Button only for custom source */}
            {source === 'custom' && (
              <TouchableOpacity
                style={styles.continueLimitedButton}
                onPress={onContinueLimited}
              >
                <Text style={styles.continueLimitedButtonText}>Watch Ad To Create Presentation</Text>
              </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: adjust(15),
    borderTopRightRadius: adjust(15),
    height: '80%',
    paddingBottom: adjust(34),
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: adjust(16),
    paddingVertical: adjust(18),
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  cancelButton: {
    fontSize: adjust(16),
    color: '#4F67ED',
    fontWeight: '400',
  },
  modalTitle: {
    fontSize: adjust(16),
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    flex: 1,
  },
  emptyRightSide: {
    width: adjust(50),
  },
  emptyLeftSide: {
    width: adjust(40),
  },
  closeButton: {
    width: adjust(40),
    height: adjust(40),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: adjust(20),
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: adjust(10),
    fontSize: adjust(16),
    color: '#4F67ED',
  },
  scrollView: {
    flex: 1,
  },
  container: {
    padding: adjust(16),
  },
  tokenInfoCard: {
    backgroundColor: '#F8F9FC',
    borderRadius: adjust(12),
    padding: adjust(16),
    marginBottom: adjust(20),
  },
  tokenInfoTitle: {
    fontSize: adjust(16),
    fontWeight: '600',
    color: '#333',
    marginBottom: adjust(12),
  },
  tokenInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: adjust(8),
  },
  tokenInfoText: {
    fontSize: adjust(14),
    color: '#666',
    marginLeft: adjust(8),
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
    borderRadius: adjust(8),
    padding: adjust(10),
    marginBottom: adjust(6),
    shadowOffset: {width: 0, height: adjust(1)},
    shadowOpacity: 0.08,
    shadowRadius: adjust(2),
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
    marginBottom: adjust(6),
  },
  planTitle: {
    fontSize: adjust(14),
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
    fontSize: adjust(13),
    fontWeight: '500',
    color: '#666',
  },
  proTokenAmount: {
    color: '#4F67ED',
  },
  planPrice: {
    fontSize: adjust(14),
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
  },
  recommendedText: {
    color: 'white',
    fontSize: adjust(9),
    fontWeight: '600',
  },
  selectIndicator: {
    position: 'absolute',
    top: adjust(10),
    right: adjust(10),
  },
  selectedIndicator: {
    backgroundColor: 'white',
    borderRadius: adjust(8),
  },
  continueButton: {
    backgroundColor: '#4F67ED',
    borderRadius: adjust(10),
    paddingVertical: adjust(14),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: adjust(10),
  },
  continueButtonText: {
    color: 'white',
    fontSize: adjust(13),
    fontWeight: '600',
    marginRight: adjust(6),
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
  continueLimitedButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: adjust(10),
    paddingVertical: adjust(14),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: adjust(8),
  },
  continueLimitedButtonText: {
    color: '#4F67ED',
    fontSize: adjust(13),
    fontWeight: '600',
    marginRight: adjust(6),
  },
  tokenWarningBanner: {
    padding: adjust(12),
    marginBottom: adjust(6),
    alignItems: 'center',
  },
  tokenWarningText: {
    color: '#D32F2F',
    fontWeight: 'bold',
    fontSize: adjust(15),
    textAlign: 'center',
  },
  stickyButtonContainer: {
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
  bottomSpacing: {
    height: adjust(100), // Add some space at the bottom
  },
  // Zero tokens styles
  zeroTokensContainer: {
    alignItems: 'center',
    paddingVertical: adjust(20),
  },
  zeroTokensIcon: {
    marginBottom: adjust(16),
  },
  zeroTokensTitle: {
    fontSize: adjust(20),
    fontWeight: 'bold',
    color: '#D32F2F',
    marginBottom: adjust(12),
    textAlign: 'center',
  },
  zeroTokensMessage: {
    fontSize: adjust(16),
    color: '#666',
    textAlign: 'center',
    lineHeight: adjust(22),
    marginBottom: adjust(24),
    paddingHorizontal: adjust(20),
  },
  zeroTokensInfo: {
    width: '100%',
    paddingHorizontal: adjust(20),
  },
  zeroTokensInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: adjust(12),
  },
  zeroTokensInfoText: {
    fontSize: adjust(14),
    color: '#333',
    marginLeft: adjust(12),
    flex: 1,
  },
  subscribeButton: {
    backgroundColor: '#4F67ED',
    borderRadius: adjust(10),
    paddingVertical: adjust(14),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: adjust(10),
  },
  subscribeButtonText: {
    color: 'white',
    fontSize: adjust(16),
    fontWeight: '600',
  },
  cancelButtonBottom: {
    backgroundColor: '#F5F5F5',
    borderRadius: adjust(10),
    paddingVertical: adjust(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonBottomText: {
    color: '#666',
    fontSize: adjust(16),
    fontWeight: '500',
  },
});

export default TokenUsageBottomSheet;
