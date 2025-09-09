import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { ImagesPath } from '../constants/ImagesPath';
import adjust from '../utils/adjust';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@react-native-vector-icons/ionicons';

const AboutApp = () => {
  const navigation = useNavigation();

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <SafeAreaView style={{ flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0 }}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="#222" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.headerSection}>
            <Image
              source={ImagesPath.aboutLogo}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Slides Ai Presentation</Text>
            <Text style={styles.version}>Version 1.0.0</Text>
          </View>

          <View style={styles.contentSection}>
            <Text style={styles.paragraph}>
              Slides Ai Presentation is more than just an app — it's your intelligent design assistant, your creative spark, and your productivity booster, all in one. Built with advanced artificial intelligence, Sl
            </Text>

            <Text style={styles.paragraph}>
              With Slides, you no longer need to struggle with formatting, layouts, or design choices. Our smart engine analyzes your input and crafts slides that not only look professional, but also tell your story with clarity and impact. From business pitches and academic lectures to project reports and creative storytelling, Slides helps you present with confidence, style, and elegance.
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.featuresSection}>
            <Text style={styles.sectionTitle}>🌟 Why choose Slides Ai Presentation?</Text>

            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• AI-powered magic: Our app automatically creates sleek, polished slides tailored to your content — saving you hours of design work.</Text>
              <Text style={styles.bulletItem}>• Dynamic charts & infographics: Convert complex data into beautiful visuals that engage your audience.</Text>
              <Text style={styles.bulletItem}>• Elegant templates: A rich collection of templates blending modern aesthetics with timeless simplicity, so your slides always feel fresh yet classic.</Text>
              <Text style={styles.bulletItem}>• Effortless customization: Adjust colors, fonts, and styles to match your brand or mood with ease.</Text>
              <Text style={styles.bulletItem}>• Seamless export & sharing: Present anywhere — in meetings, classrooms, or on the go — with easy export to all major formats.</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.contentSection}>
            <Text style={styles.paragraph}>
              🎨 Whether you're a student striving for top marks, a professional pitching to clients, or a creative sharing your vision, Slides Ai Presentation ensures your presentations leave a lasting impression.
            </Text>
          </View>

          <Text style={styles.footer}>
            Slides Ai Presentation — where your ideas meet intelligent design.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default AboutApp;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingBottom: 40,
    justifyContent: 'center',
    textAlign: 'justify',
  },
  backButton: {
    padding: 8,
  },
  headerSection: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 24,
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 4,
    textAlign: 'center',
  },
  version: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 5,
    textAlign: 'center',
  },
  contentSection: {
    marginBottom: 24,
  },
  paragraph: {
    fontSize: 16,
    color: '#333333',
    lineHeight: 23,
    marginBottom: 16,
    textAlign: 'justify',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginVertical: 16,
  },
  featuresSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 16,
  },
  bulletList: {
    marginLeft: 4,
  },
  bulletItem: {
    fontSize: 15,
    color: '#555555',
    lineHeight: 21,
    marginBottom: 12,
    textAlign: 'justify',
  },
  footer: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
    lineHeight: 22,
  },
});
