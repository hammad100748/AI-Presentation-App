import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import adjust from '../utils/adjust';

interface DownloadAdBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onWatchAd: () => void;
  onSubscribe: () => void;
}

const DownloadAdBottomSheet: React.FC<DownloadAdBottomSheetProps> = ({
  visible,
  onClose,
  onWatchAd,
  onSubscribe,
}) => {
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={adjust(24)} color="#666" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Download Presentation</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Content */}
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            bounces={true}
            alwaysBounceVertical={false}
            keyboardShouldPersistTaps="handled">
            <View style={styles.content}>
              <View style={styles.iconContainer}>
                <Ionicons name="cloud-download-outline" size={adjust(48)} color="#4F67ED" />
              </View>

              <Text style={styles.title}>Watch an Ad to Download</Text>
              <Text style={styles.subtitle}>
                Watch a short ad to download your presentation for free
              </Text>

              <View style={styles.benefitsList}>
                <View style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={adjust(20)} color="#4F67ED" />
                  <Text style={styles.benefitText}>Download your presentation</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={adjust(20)} color="#4F67ED" />
                  <Text style={styles.benefitText}>Support the app development</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Ionicons name="checkmark-circle" size={adjust(20)} color="#4F67ED" />
                  <Text style={styles.benefitText}>Quick 15-30 second ad</Text>
                </View>
              </View>
              
              {/* Additional spacing at the bottom */}
              <View style={styles.bottomSpacing} />
            </View>
          </ScrollView>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.subscribeButton}
              onPress={onSubscribe}
              activeOpacity={0.8}>
              <Ionicons name="diamond-outline" size={adjust(20)} color="white" />
              <Text style={styles.subscribeButtonText}>Subscribe</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.watchAdButton}
              onPress={onWatchAd}
              activeOpacity={0.8}>
              <Ionicons name="play-circle" size={adjust(20)} color="#FFFFFF" />
              <Text style={styles.watchAdButtonText}>Watch Ad & Download</Text>
            </TouchableOpacity>
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
    borderTopLeftRadius: adjust(20),
    borderTopRightRadius: adjust(20),
    paddingBottom: adjust(34),
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: adjust(20),
    paddingVertical: adjust(16),
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  closeButton: {
    padding: adjust(4),
  },
  headerTitle: {
    fontSize: adjust(18),
    fontWeight: '600',
    color: '#333',
  },
  headerSpacer: {
    width: adjust(32),
  },
  content: {
    paddingHorizontal: adjust(24),
    paddingVertical: adjust(24),
    alignItems: 'center',
  },
  iconContainer: {
    width: adjust(80),
    height: adjust(80),
    borderRadius: adjust(40),
    backgroundColor: '#F0F4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: adjust(20),
  },
  title: {
    fontSize: adjust(22),
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: adjust(8),
  },
  subtitle: {
    fontSize: adjust(16),
    color: '#666',
    textAlign: 'center',
    marginBottom: adjust(24),
    lineHeight: adjust(22),
  },
  benefitsList: {
    width: '100%',
    marginBottom: adjust(8),
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: adjust(12),
    paddingHorizontal: adjust(4),
  },
  benefitText: {
    fontSize: adjust(15),
    color: '#444',
    marginLeft: adjust(12),
    flex: 1,
  },
  buttonContainer: {
    paddingHorizontal: adjust(24),
    gap: adjust(12),
  },
  watchAdButton: {
    backgroundColor: '#4F67ED',
    borderRadius: adjust(10),
    paddingVertical: adjust(16),
    paddingHorizontal: adjust(24),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4F67ED',
    shadowOffset: {width: 0, height: adjust(4)},
    shadowOpacity: 0.3,
    shadowRadius: adjust(8),
    elevation: 6,
  },
  watchAdButtonText: {
    color: '#FFFFFF',
    fontSize: adjust(16),
    fontWeight: '600',
    marginLeft: adjust(8),
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: adjust(10),
    paddingVertical: adjust(16),
    paddingHorizontal: adjust(24),
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: adjust(16),
    fontWeight: '500',
  },
  subscribeButton: {
    backgroundColor: '#4F67ED',
    borderRadius: adjust(10),
    paddingVertical: adjust(16),
    paddingHorizontal: adjust(24),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4F67ED',
    shadowOffset: {width: 0, height: adjust(4)},
    shadowOpacity: 0.3,
    shadowRadius: adjust(8),
    elevation: 6,
    marginBottom: adjust(10),
  },
  subscribeButtonText: {
    color: 'white',
    fontSize: adjust(16),
    fontWeight: '600',
    marginLeft: adjust(8),
  },
  scrollView: {
    flex: 1,
  },
  bottomSpacing: {
    height: adjust(20),
  },
});

export default DownloadAdBottomSheet; 