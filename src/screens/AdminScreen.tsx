import React, { useState } from 'react';
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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigations';
import { useAuth } from '../context/AuthContext';
import { useTokens } from '../context/TokenContext';
import { useRevenueCat } from '../context/RevenueCatContext';
import Ionicons from '@react-native-vector-icons/ionicons';
import crashlytics from '@react-native-firebase/crashlytics';

// Import gradient background
const gradientBg = require('../assets/images/gradient_bg.jpeg');

type AdminScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'AdminScreen'
>;

const AdminScreen = () => {
  const navigation = useNavigation<AdminScreenNavigationProp>();
  const { currentUser } = useAuth();
  const { upgradeAllUsersTokens, loading } = useTokens();
  const { debugOfferings } = useRevenueCat();
  const [upgradeComplete, setUpgradeComplete] = useState(false);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleUpgradeAllUsers = async () => {
    try {
      Alert.alert(
        'Confirm Upgrade',
        'This will upgrade all users to have at least 3 tokens. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Upgrade',
            onPress: async () => {
              await upgradeAllUsersTokens();
              setUpgradeComplete(true);
              Alert.alert('Success', 'All users have been upgraded to have at least 3 tokens.');
            },
          },
        ]
      );
    } catch (error:any) {
      console.error('Error upgrading users:', error);
      crashlytics().recordError(error);
      Alert.alert('Error', 'Failed to upgrade users. Please try again.');
    }
  };

  const handleDebugOfferings = async () => {
    try {
      console.log('🔍 Admin: Starting debug offerings check...');
      await debugOfferings();
      Alert.alert(
        'Debug Complete',
        'Check the console logs for detailed offerings information from RevenueCat API key: goog_NVLVbddlEAIGmULkiArRHVnqdNI',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error debugging offerings:', error);
      Alert.alert('Debug Error', 'Failed to debug offerings. Check console for details.');
    }
  };

  return (
    <View style={styles.mainContainer}>
      <ImageBackground source={gradientBg} style={styles.backgroundImage} resizeMode="cover">
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />

        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Admin Panel</Text>
            <View style={styles.headerRight} />
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.container}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>User Management</Text>

                <View style={styles.actionCard}>
                  <Text style={styles.actionTitle}>Upgrade All Users</Text>
                  <Text style={styles.actionDescription}>
                    Give all users at least 3 tokens. This will only upgrade users who have fewer than 3 tokens.
                  </Text>

                  <TouchableOpacity
                    style={[styles.actionButton, loading && styles.actionButtonDisabled]}
                    onPress={handleUpgradeAllUsers}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text style={styles.actionButtonText}>
                        {upgradeComplete ? 'Upgrade Complete' : 'Upgrade All Users'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.actionCard}>
                  <Text style={styles.actionTitle}>Debug RevenueCat Offerings</Text>
                  <Text style={styles.actionDescription}>
                    Check what packages are available from RevenueCat API key: goog_NVLVbddlEAIGmULkiArRHVnqdNI
                  </Text>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleDebugOfferings}
                  >
                    <Text style={styles.actionButtonText}>Debug Offerings</Text>
                  </TouchableOpacity>
                </View>
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
    backgroundColor: '#4F67ED',
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  container: {
    flex: 1,
    padding: 15,
    paddingBottom: 30,
  },
  section: {
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  actionCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  actionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  actionButton: {
    backgroundColor: '#4F67ED',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionButtonDisabled: {
    backgroundColor: '#A0A0A0',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AdminScreen;
