import React, {useState, useEffect} from 'react';
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
  Switch,
  Linking,
  Alert,
  Share,
  Image,
} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../navigations';
import {useAuth} from '../context/AuthContext';
import {useTokens} from '../context/TokenContext';
import {clearRecentPresentations, getRecentPresentations} from '../utils/presentationStorage';
import {showToast} from '../utils/showTost';
import { getSafeDimensions } from '../utils/imageOptimization';
import Ionicons from '@react-native-vector-icons/ionicons';
import LoadingScreen from '../components/LoadingScreen';
import crashlytics from '@react-native-firebase/crashlytics';
import {usePurchases} from '../context/SubscriptionContext';
// Import gradient background
const gradientBg = require('../assets/images/gradient_bg.jpeg');

type SettingsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Settings'
>;

interface SettingsItemProps {
  icon: string;
  title: string;
  onPress: () => void;
  color?: string;
  showArrow?: boolean;
  isLast?: boolean;
  isFirst?: boolean;
  isLoading?: boolean;
  disabled?: boolean;
}

const SettingsItem: React.FC<SettingsItemProps> = ({
  icon,
  title,
  onPress,
  color = '#333',
  showArrow = true,
  isLast = false,
  isFirst = false,
  isLoading = false,
  disabled = false,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.settingsItem,
        isLast && styles.settingsItemLast,
        isFirst && styles.settingsItemFirst,
        disabled && {opacity: 0.6},
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.settingsItemLeft}>
        <Ionicons
          name={icon}
          size={18}
          color={color}
          style={styles.settingsItemIcon}
        />
        <Text style={[styles.settingsItemTitle, {color}]}>{title}</Text>
        {isLoading && (
          <View style={{marginLeft: 8}}>
            <View style={{width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#4F67ED', borderTopColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#4F67ED', borderLeftColor: '#4F67ED', transform: [{rotate: '0deg'}],}}>
            </View>
          </View>
        )}
      </View>
      {showArrow && (
        <Ionicons name="chevron-forward" size={18} color="#CCCCCC" />
      )}
    </TouchableOpacity>
  );
};

const Settings = () => {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const {currentUser, logout, deleteAccount, isDeletingAccount}: any =
    useAuth();
  const {tokens, hasSubscription} = useTokens();
  const {isSubscribed} = usePurchases();
  const [checkingSubscription, setCheckingSubscription] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [deletingPresentations, setDeletingPresentations] = useState(false);
  const [hasRecentPresentations, setHasRecentPresentations] = useState(false);

  // Check if user is an admin (you can implement your own admin check)
  // For now, we'll just use a simple check based on email
  const isAdmin = currentUser?.email === 'admin@example.com';
  const [adminTapCount, setAdminTapCount] = useState(0);
  const [showAdminAccess, setShowAdminAccess] = useState(isAdmin);

  const isPro = isSubscribed;

  // Check if there are any recent presentations
  const checkRecentPresentations = async () => {
    try {
      const presentations = await getRecentPresentations();
      setHasRecentPresentations(presentations.length > 0);
    } catch (error) {
      console.error('Error checking recent presentations:', error);
      setHasRecentPresentations(false);
    }
  };

  useEffect(() => {
    checkRecentPresentations();
  }, []);

  // Refresh presentations state when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      checkRecentPresentations();
    }, [])
  );

  // Handle profile image tap to unlock admin panel
  const handleProfileTap = () => {
    const newCount = adminTapCount + 1;
    setAdminTapCount(newCount);

    // After 7 taps, show the admin option
    if (newCount >= 7) {
      setShowAdminAccess(true);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            navigation.reset({
              index: 0,
              routes: [{name: 'Login'}],
            });
          } catch (error: any) {
            console.error('Error logging out:', error);
            crashlytics().recordError(error);
          }
        },
      },
    ]);
  };

  const handleSubscribe = () => {
    navigation.navigate('SubscriptionManagement');
  };

  const handleReportProblem = async () => {
    const emailRecipient = 'apps@fordnine.com';
    const emailSubject = 'Report a Problem: AI Presentation Generator';
    const deviceType = Platform.OS === 'ios' ? 'iOS' : 'Android';
    const emailBody = `Device Type: ${deviceType}

[Write your problem here]

Sent from AI Presentation Generator`;

    try {
      const mailUrl = `mailto:${emailRecipient}?subject=${encodeURIComponent(
        emailSubject,
      )}&body=${encodeURIComponent(emailBody)}`;
      await Linking.openURL(mailUrl);
    } catch (error: any) {
      console.error('Error opening email client:', error);
      crashlytics().recordError(error);
      Alert.alert(
        'Cannot Open Email',
        `Please manually send an email to ${emailRecipient} to report your problem.`,
        [{text: 'OK'}],
      );
    }
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL(
      'https://fordnine.com/apps/ai-presentation-maker-slides/privacy-policy.html',
    );
  };

  const handleTermsAndConditions = () => {
    Linking.openURL(
      'https://fordnine.com/apps/ai-presentation-maker-slides/terms-of-use.html',
    );
  };

  const handleAbout = () => {
    navigation.navigate('AboutApp');
  };

  const handleDeleteChats = () => {
    // Check if there are any presentations to delete
    if (!hasRecentPresentations) {
      showToast('No presentations to delete');
      return;
    }

    Alert.alert(
      'Delete All Presentations',
      'Are you sure you want to delete all presentations? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingPresentations(true);
              await clearRecentPresentations();
              setHasRecentPresentations(false); // Update state after deletion
              setTimeout(() => {
                setDeletingPresentations(false);
                showToast('All presentations deleted successfully');
              }, 1000);
            } catch (error) {
              setDeletingPresentations(false);
              showToast('Failed to delete presentations');
            }
          },
        },
      ],
    );
  };

  const handleTellFriend = () => {
    const APP_LINK =
      'https://play.google.com/store/apps/details?id=com.ford9.create.slides.ai.presentation.generator.maker.creator.builder';
    const shareMessage = `🎤 Captivate your audience with stunning slides in seconds! ✨ AI Presentation Generator turns your ideas into professional presentations—effortlessly and instantly. 💼 Perfect for students, professionals, and creators on the go.  
Create, present, and impress—download now: ${APP_LINK} 🚀  
#AIPresentation #SlideMaker #ProductivityTools #AIforWork #PresentationApp #EduTech`;

    try {
      // Use the Share API to share the message
      const shareOptions = {
        message: shareMessage,
        title: 'Share PresentationAI',
      };

      Share.share(shareOptions)
        .then(result => {
          if (result.action === Share.sharedAction) {
            if (result.activityType) {
              // Shared with activity type of result.activityType
              console.log(`Shared with ${result.activityType}`);
            } else {
              // Shared
              console.log('Shared successfully');
            }
          } else if (result.action === Share.dismissedAction) {
            // Dismissed
            console.log('Share dismissed');
          }
        })
        .catch(error => {
          console.error('Error sharing:', error);
          crashlytics().recordError(error);
          Alert.alert('Error', 'Something went wrong sharing the app');
        });
    } catch (error: any) {
      console.error('Error in handleTellFriend:', error);
      crashlytics().recordError(error);
    }
  };

  const handleFeedback = async () => {
    try {
      const playStoreUrl =
        'https://play.google.com/store/apps/details?id=com.ford9.create.slides.ai.presentation.generator.maker.creator.builder';
      const canOpen = await Linking.canOpenURL(playStoreUrl);

      if (canOpen) {
        await Linking.openURL(playStoreUrl);
      } else {
        Alert.alert(
          'Cannot Open Play Store',
          'Please visit the Play Store to leave your feedback.',
          [{text: 'OK'}],
        );
      }
    } catch (error: any) {
      console.error('Error opening Play Store:', error);
      crashlytics().recordError(error);
      Alert.alert(
        'Error',
        'Could not open the Play Store. Please try again later.',
        [{text: 'OK'}],
      );
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone. Your remaining tokens will be preserved if you sign up again with the same email.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await deleteAccount();
              if (success) {
                Alert.alert(
                  'Account Deleted',
                  'Your account has been successfully deleted.',
                );
                navigation.reset({
                  index: 0,
                  routes: [{name: 'Login'}],
                });
              } else {
                Alert.alert(
                  'Error',
                  'Could not delete your account. Please try again later.',
                );
              }
            } catch (error: any) {
              console.error('Error deleting account:', error);
              crashlytics().recordError(error);
              Alert.alert(
                'Error',
                'An unexpected error occurred while deleting your account.',
              );
            }
          },
        },
      ],
    );
  };

  const handleAdminPanel = () => {
    navigation.navigate('AdminScreen');
  };

  // Get user's first initial for the avatar
  const userInitial = currentUser?.displayName
    ? currentUser.displayName[0].toUpperCase()
    : 'U';

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
            <Text style={styles.headerTitle}>Setting</Text>
            <View style={styles.headerRight} />
          </View>

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}>
            <View style={styles.container}>
              {/* Profile Section */}
              <View style={styles.profileSection}>
                <TouchableOpacity onPress={handleProfileTap}>
                  <View style={styles.profileImageContainer}>
                    {currentUser?.photoURL ? (
                      <Image
                        source={{ uri: currentUser.photoURL }}
                        style={[styles.profileImage, getSafeDimensions('PROFILE')]}
                        resizeMode="cover"
                        onError={(error) => console.log('Profile image load error:', error)}
                      />
                    ) : (
                      <Text style={styles.profileInitial}>{userInitial}</Text>
                    )}
                  </View>
                </TouchableOpacity>
                <Text style={styles.profileName}>
                  {currentUser?.displayName || 'User'}
                </Text>
                {currentUser?.email && (
                  <Text style={styles.profileEmail}>
                    {currentUser.email}
                  </Text>
                )}
              </View>

              {/* Subscription Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Subscription</Text>
                <SettingsItem
                  icon="diamond-outline"
                  title={'Subscribe'}
                  onPress={handleSubscribe}
                  isFirst={true}
                  isLast={true}
                />
              </View>

              {/* About Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>About</Text>
                <SettingsItem
                  icon="document-text-outline"
                  title="Report A Problem"
                  onPress={handleReportProblem}
                  isFirst={true}
                />
                <SettingsItem
                  icon="lock-closed-outline"
                  title="Privacy Policy"
                  onPress={handlePrivacyPolicy}
                />
                <SettingsItem
                  icon="document-outline"
                  title="Terms and Conditions"
                  onPress={handleTermsAndConditions}
                />
                <SettingsItem
                  icon="information-circle-outline"
                  title="About PresentationAI"
                  onPress={handleAbout}
                />
                <SettingsItem
                  icon="trash-outline"
                  title="Delete All Presentations"
                  onPress={handleDeleteChats}
                  isLoading={deletingPresentations}
                  disabled={deletingPresentations || !hasRecentPresentations}
                />
                <SettingsItem
                  icon="share-social-outline"
                  title="Tell a Friend"
                  onPress={handleTellFriend}
                />
                <SettingsItem
                  icon="chatbox-outline"
                  title="Feedback"
                  onPress={handleFeedback}
                  isLast={!showAdminAccess}
                />
                {showAdminAccess && (
                  <SettingsItem
                    icon="construct-outline"
                    title="Admin Panel"
                    onPress={handleAdminPanel}
                    isLast={true}
                  />
                )}
              </View>

              {/* Accounts Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Accounts</Text>
                <SettingsItem
                  icon="person-remove-outline"
                  title="Delete Account"
                  onPress={handleDeleteAccount}
                  isFirst={true}
                />
                <SettingsItem
                  icon="log-out-outline"
                  title="Logout"
                  onPress={handleLogout}
                  color="#FF3B30"
                  isLast={true}
                />
              </View>
            </View>
          </ScrollView>
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
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  headerRight: {
    width: 32,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  container: {
    flex: 1,
    padding: 8,
    paddingBottom: 16,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 8,
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 1.5,
    elevation: 1.5,
  },
  profileImageContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 6,
    backgroundColor: '#4F67ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
  },
  profileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 8,
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 1.5,
    elevation: 1.5,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#888',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 5,
    marginBottom: 0,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingsItemFirst: {
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  settingsItemLast: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsItemIcon: {
    marginRight: 8,
  },
  settingsItemTitle: {
    fontSize: 14,
    fontWeight: '400',
  },
});

export default Settings;
