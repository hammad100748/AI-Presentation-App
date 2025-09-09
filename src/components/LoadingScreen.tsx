import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { useMemo, useEffect, useRef } from 'react';

interface LoadingScreenProps {
  message?: string;
  isVisible: boolean;
  progressMessage?: string;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Deleting account...',
  isVisible,
  progressMessage,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;
  const dotsAnim = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  // Create floating orbs for background effect
  const orbs = useMemo(() => {
    return Array.from({ length: 8 }).map((_, i) => ({
      id: i,
      size: Math.random() * 60 + 40,
      x: Math.random() * screenWidth,
      y: Math.random() * screenHeight,
      opacity: Math.random() * 0.3 + 0.1,
      speed: Math.random() * 0.5 + 0.3,
      color: i % 2 === 0 ? '#6366F1' : '#EC4899',
    }));
  }, []);

  const orbAnims = useRef(
    orbs.map(() => ({
      translateX: new Animated.Value(0),
      translateY: new Animated.Value(0),
      scale: new Animated.Value(1),
    }))
  ).current;

  // Create sparkle particles
  const sparkles = useMemo(() => {
    return Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      size: Math.random() * 4 + 2,
      x: Math.random() * screenWidth * 0.6 + screenWidth * 0.2,
      y: Math.random() * screenHeight * 0.6 + screenHeight * 0.2,
      delay: Math.random() * 2000,
    }));
  }, []);

  const sparkleAnims = useRef(
    sparkles.map(() => ({
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    if (isVisible) {
      // Main entrance animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();

      // Continuous rotation for the main spinner
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();

      // Pulse animation for the center
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Wave animation for progress
      Animated.loop(
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        })
      ).start();

      // Animate floating dots
      dotsAnim.forEach((anim, index) => {
        Animated.loop(
          Animated.sequence([
            Animated.delay(index * 200),
            Animated.timing(anim, {
              toValue: 1,
              duration: 800,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 800,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: true,
            }),
          ])
        ).start();
      });

      // Animate background orbs
      orbs.forEach((orb, index) => {
        animateOrb(orb, index);
      });

      // Animate sparkles
      sparkles.forEach((sparkle, index) => {
        animateSparkle(sparkle, index);
      });
    } else {
      // Exit animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible]);

  const animateOrb = (orb: any, index: number) => {
    const randomX = (Math.random() - 0.5) * 200;
    const randomY = (Math.random() - 0.5) * 200;

    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(orbAnims[index].translateX, {
            toValue: randomX,
            duration: 4000 / orb.speed,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(orbAnims[index].translateY, {
            toValue: randomY,
            duration: 4000 / orb.speed,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(orbAnims[index].scale, {
            toValue: 1.2,
            duration: 2000 / orb.speed,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(orbAnims[index].translateX, {
            toValue: -randomX,
            duration: 4000 / orb.speed,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(orbAnims[index].translateY, {
            toValue: -randomY,
            duration: 4000 / orb.speed,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(orbAnims[index].scale, {
            toValue: 0.8,
            duration: 2000 / orb.speed,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  };

  const animateSparkle = (sparkle: any, index: number) => {
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(sparkleAnims[index].opacity, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.spring(sparkleAnims[index].scale, {
              toValue: 1,
              tension: 100,
              friction: 3,
              useNativeDriver: true,
            }),
          ]),
          Animated.delay(Math.random() * 1000 + 500),
          Animated.parallel([
            Animated.timing(sparkleAnims[index].opacity, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(sparkleAnims[index].scale, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
          ]),
          Animated.delay(Math.random() * 2000 + 1000),
        ])
      ).start();
    }, sparkle.delay);
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const waveTranslate = waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, screenWidth * 0.6 + 100],
  });

  if (!isVisible) {return null;}

  return (
    <View style={styles.overlay}>
      {/* Gradient Background */}
      <View style={styles.gradientBackground} />

      {/* Background Orbs */}
      {orbs.map((orb, index) => (
        <Animated.View
          key={orb.id}
          style={[
            styles.orb,
            {
              width: orb.size,
              height: orb.size,
              backgroundColor: orb.color,
              opacity: orb.opacity,
              left: orb.x - orb.size / 2,
              top: orb.y - orb.size / 2,
              transform: [
                { translateX: orbAnims[index].translateX },
                { translateY: orbAnims[index].translateY },
                { scale: orbAnims[index].scale },
              ],
            },
          ]}
        />
      ))}

      {/* Sparkles */}
      {sparkles.map((sparkle, index) => (
        <Animated.View
          key={sparkle.id}
          style={[
            styles.sparkle,
            {
              width: sparkle.size,
              height: sparkle.size,
              left: sparkle.x,
              top: sparkle.y,
              opacity: sparkleAnims[index].opacity,
              transform: [{ scale: sparkleAnims[index].scale }],
            },
          ]}
        />
      ))}

      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Main Loading Spinner */}
        <View style={styles.spinnerContainer}>
          <Animated.View
            style={[
              styles.outerRing,
              { transform: [{ rotate: rotation }] },
            ]}
          />
          <Animated.View
            style={[
              styles.innerRing,
              {
                transform: [
                  { rotate: rotation },
                  { scale: pulseAnim },
                ],
              },
            ]}
          />
          <View style={styles.centerDot} />
        </View>

        {/* Floating Dots */}
        <View style={styles.dotsContainer}>
          {dotsAnim.map((anim, index) => (
            <Animated.View
              key={index}
              style={[
                styles.floatingDot,
                {
                  opacity: anim,
                  transform: [
                    {
                      translateY: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -15],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
        </View>

        <Text style={styles.message}>{message}</Text>

        {/* Progress Message */}
        {progressMessage && (
          <Text style={styles.progressMessage}>{progressMessage}</Text>
        )}

        {/* Wave Progress Indicator */}
        <View style={styles.progressContainer}>
          <Animated.View
            style={[
              styles.progressWave,
              {
                transform: [{ translateX: waveTranslate }],
              },
            ]}
          />
        </View>

        <Text style={styles.subMessage}>Please wait while we process your request</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  gradientBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0F0F23',
    opacity: 0.95,
  },
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    padding: screenWidth * 0.08,
    alignItems: 'center',
    justifyContent: 'center',
    width: screenWidth * 0.85,
    maxWidth: 360,
    minHeight: screenHeight * 0.4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  spinnerContainer: {
    width: screenWidth * 0.25,
    height: screenWidth * 0.25,
    maxWidth: 120,
    maxHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  outerRing: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 1000,
    borderWidth: 3,
    borderColor: 'transparent',
    borderTopColor: '#6366F1',
    borderRightColor: '#EC4899',
  },
  innerRing: {
    position: 'absolute',
    width: '70%',
    height: '70%',
    borderRadius: 1000,
    borderWidth: 2,
    borderColor: 'transparent',
    borderBottomColor: '#8B5CF6',
    borderLeftColor: '#06B6D4',
  },
  centerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 8,
  },
  floatingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366F1',
  },
  message: {
    fontSize: screenWidth * 0.05,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(99, 102, 241, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  progressMessage: {
    fontSize: screenWidth * 0.04,
    fontWeight: '500',
    color: '#E0E7FF',
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  progressContainer: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  progressWave: {
    width: 100,
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 2,
    position: 'absolute',
    opacity: 0.8,
  },
  subMessage: {
    fontSize: screenWidth * 0.035,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    fontWeight: '400',
  },
  orb: {
    position: 'absolute',
    borderRadius: 1000,
    opacity: 0.1,
  },
  sparkle: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 1000,
  },
});

export default LoadingScreen;
