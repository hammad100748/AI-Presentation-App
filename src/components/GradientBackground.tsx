import React from 'react';
import { View, StyleSheet, Image, Platform } from 'react-native';

type GradientBackgroundProps = {
  children: React.ReactNode;
};

const GradientBackground: React.FC<GradientBackgroundProps> = ({ children }) => {
  // Using Image instead of ImageBackground for better control
  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/gradient_bg.jpeg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      <View style={styles.contentContainer}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4F67ED', // Fallback color
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    ...Platform.select({
      ios: {
        // iOS specific adjustments
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      },
    }),
  },
  contentContainer: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
  },
});

export default GradientBackground;
