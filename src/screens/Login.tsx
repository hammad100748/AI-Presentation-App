import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigations';
import Icon from '@react-native-vector-icons/ionicons';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../utils/showTost';

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

// Define particle props interface
interface ParticleProps {
  delay: number;
  duration: number;
  startX: number;
  startY: number;
  scale: number;
  color: string;
}

// Create particle effect component
const Particle = React.memo(({ delay, duration, startY, startX, scale, color }: ParticleProps) => {
  const translateX = useSharedValue(startX);
  const translateY = useSharedValue(startY);
  const opacity = useSharedValue(0);
  const particleScale = useSharedValue(0);

  useEffect(() => {
    // Start the animation sequence
    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: duration * 0.2 }),
        withTiming(0, { duration: duration * 0.3 })
      )
    );

    particleScale.value = withDelay(
      delay,
      withSequence(
        withTiming(scale, { duration: duration * 0.3 }),
        withTiming(0, { duration: duration * 0.3 })
      )
    );

    translateX.value = withDelay(
      delay,
      withTiming(startX + (Math.random() * 160 - 80), {
        duration: duration,
        easing: Easing.out(Easing.cubic),
      })
    );

    translateY.value = withDelay(
      delay,
      withTiming(startY - (Math.random() * 100 + 50), {
        duration: duration,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: particleScale.value },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
        },
        animatedStyle,
      ]}
    >
      <View style={[styles.particle, { backgroundColor: color }]} />
    </Animated.View>
  );
});

const Login = () => {
  // Only log on first render using useRef
  const isFirstRender = useRef(true);
  if (isFirstRender.current) {
    isFirstRender.current = false;
  }

  const navigation = useNavigation<LoginScreenNavigationProp>();
  const [showParticles, setShowParticles] = useState(false);
  const [buttonActive, setButtonActive] = useState(false);

  // Use ref to track if navigation has already been attempted
  const hasNavigated = useRef(false);

  // Get auth context
  const { signInWithGoogle, loading: isLoading, currentUser } = useAuth();

  // Check if user is already logged in and redirect to Home
  useEffect(() => {
    if (currentUser && !hasNavigated.current) {
      console.log('User already logged in, redirecting to Home');
      hasNavigated.current = true;
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    }
  }, [currentUser, navigation]);

  // Use refs for animation state to reduce re-renders
  const buttonStyleRef = useRef({
    borderColor: 'rgba(66, 133, 244, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 1)',
    shadowRadius: 2,
    shadowOpacity: 0.1,
    letterSpacing: 0,
  });

  // State for non-native animations - use fewer state variables
  const [buttonStyles, setButtonStyles] = useState(buttonStyleRef.current);

  // Animation values for native animations
  const logoAnim = useSharedValue(0);
  const titleAnim = useSharedValue(0);
  const subtitleAnim = useSharedValue(0);
  const buttonAnim = useSharedValue(0);
  const buttonPulseAnim = useSharedValue(0);
  const pulseAnim = useSharedValue(0);
  const googleIconRotation = useSharedValue(0);
  const starRotation = useSharedValue(0);
  const starScale = useSharedValue(0);
  const buttonX = useSharedValue(0);
  const loadingRotation = useSharedValue(0);

  // Create particles for animation - memoize to prevent recreation on each render
  const particles = useMemo(() =>
    Array(20).fill(0).map((_, index) => ({
    id: index,
    delay: Math.random() * 500,
    duration: 1000 + Math.random() * 2000,
    startX: 0,
    startY: 0,
    scale: 0.3 + Math.random() * 0.7,
    color: [
      '#4F67ED', '#6E64FC', '#5669FF', '#7856FF',
      '#3A50C5', '#2371EA', '#4285F4', '#5C9DFF',
      '#EA4335', '#FBBC05', '#34A853', '#4285F4', // Google colors added
    ][Math.floor(Math.random() * 12)],
    })),
  []);

  // Non-native animation interval for color changes - reduce frequency
  useEffect(() => {
    // Store state update functions in refs to avoid re-renders
    const updateColors = () => {
      if (buttonActive) {return;} // Don't run background animation when button is active

      // Update all styles at once to reduce state updates
      const newStyles = {
        borderColor: `rgba(66, 133, 244, ${(Math.random() * 0.2) + 0.2})`,
        backgroundColor: `rgb(${Math.floor(Math.random() * 10) + 245}, ${Math.floor(Math.random() * 10) + 245}, 255)`,
        shadowRadius: Math.random() * 5 + 2,
        shadowOpacity: Math.random() * 0.3 + 0.1,
        letterSpacing: Math.random() * 0.5,
      };

      buttonStyleRef.current = newStyles;
      setButtonStyles(newStyles);
    };

    // Color cycle interval - longer interval to reduce updates
    const colorInterval = setInterval(updateColors, 2500);

    return () => clearInterval(colorInterval);
  }, [buttonActive]); // Only depend on buttonActive

  // Button pulse animation - memoize functions
  const startButtonPulse = useCallback(() => {
    buttonPulseAnim.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(0, {
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
        })
      ),
      -1,
      false
    );
  }, [buttonPulseAnim]);

  // Button subtle movement animation - memoized
  const startButtonMovement = useCallback(() => {
    buttonX.value = withRepeat(
      withSequence(
        withTiming(5, {
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(-5, {
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(0, {
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
        })
      ),
      -1,
      false
    );
  }, [buttonX]);

  // Start button animations
  useEffect(() => {
    startButtonPulse();
    startButtonMovement();
  }, [startButtonPulse, startButtonMovement]);

  // Create animation sequence once
  const startAnimations = useCallback(() => {
    // Star entrance animation
    starScale.value = withSequence(
      withTiming(1.2, {
        duration: 700,
        easing: Easing.out(Easing.back(2)),
      }),
      withTiming(1, {
        duration: 400,
        easing: Easing.inOut(Easing.quad),
      })
    );

    // Start continuous star rotation
    starRotation.value = withRepeat(
      withTiming(1, {
        duration: 30000,
        easing: Easing.linear,
      }),
      -1,
      false
    );

    // Logo pulse animation
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(0, {
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
        })
      ),
      -1,
      false
    );

    // Staggered text and button animations with delays
    logoAnim.value = withDelay(
      200,
      withTiming(1, {
        duration: 700,
        easing: Easing.out(Easing.back(1.5)),
      })
    );

    titleAnim.value = withDelay(
      400,
      withTiming(1, {
        duration: 700,
        easing: Easing.out(Easing.back(1.5)),
      })
    );

    subtitleAnim.value = withDelay(
      600,
      withTiming(1, {
        duration: 700,
        easing: Easing.out(Easing.back(1.5)),
      })
    );

    buttonAnim.value = withDelay(
      800,
      withTiming(1, {
        duration: 800,
        easing: Easing.out(Easing.back(1.7)),
      })
    );
  }, [starScale, starRotation, pulseAnim, logoAnim, titleAnim, subtitleAnim, buttonAnim]);

  // Start animations when component mounts - single useEffect for all initial animations
  useEffect(() => {
    console.log('Starting enhanced login animations with native driver fix');

    startAnimations();

    // Delay showing particles until logo has appeared
    const particlesTimer = setTimeout(() => {
      setShowParticles(true);
    }, 800);

    return () => clearTimeout(particlesTimer);
  }, [startAnimations]);

  // Calculate animation values for transforms - using useAnimatedStyle
  const logoAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: logoAnim.value,
      transform: [
        { scale: 1 + pulseAnim.value * 0.08 },
        { rotate: `${starRotation.value * 360}deg` },
      ],
    };
  });

  const starAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: starScale.value }],
    };
  });

  const titleAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: titleAnim.value,
      transform: [{ translateY: interpolate(titleAnim.value, [0, 1], [20, 0], Extrapolate.CLAMP) }],
    };
  });

  const subtitleAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: subtitleAnim.value,
      transform: [{ translateY: interpolate(subtitleAnim.value, [0, 1], [20, 0], Extrapolate.CLAMP) }],
    };
  });

  const buttonAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: buttonAnim.value,
      transform: [
        { translateY: interpolate(buttonAnim.value, [0, 1], [50, 0], Extrapolate.CLAMP) },
        { translateX: buttonX.value },
        { scale: 1 + buttonPulseAnim.value * 0.05 },
      ],
    };
  });

  // Memoize the burst animation function to prevent recreation on each render
  const createBurstAnimation = useCallback(() => {
    // Show particles after burst
    setShowParticles(true);

    // Hide particles after animation completes
    setTimeout(() => {
      setShowParticles(false);
    }, 2500);
  }, []);

  // Start loading animation when isLoading changes
  useEffect(() => {
    if (isLoading) {
      loadingRotation.value = withRepeat(
        withTiming(1, {
          duration: 1000,
          easing: Easing.linear,
        }),
        -1,
        false
      );
    } else {
      loadingRotation.value = 0;
    }
  }, [isLoading, loadingRotation]);

  // Interpolate rotation value for loading indicator
  const loadingAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${loadingRotation.value * 360}deg` }],
    };
  });

  // Handle Google login with memoization to prevent recreation on each render
  const handleGoogleLogin = useCallback(() => {
    console.log('Login button pressed');
    setButtonActive(true);

    // Enhanced button appearance changes - update all at once
    setButtonStyles({
      borderColor: 'rgba(66, 133, 244, 0.8)',
      backgroundColor: '#f8f9ff',
      shadowRadius: 10,
      shadowOpacity: 0.4,
      letterSpacing: 0,
    });

    // Create particle burst on press
    createBurstAnimation();

    // Button press animation with reanimated
    const performButtonAnimation = () => {
      buttonAnim.value = withSequence(
        withTiming(0.90, {
          duration: 100,
          easing: Easing.out(Easing.cubic),
        }),
        withSpring(1.15, {
          damping: 3,
          stiffness: 40,
        }),
        withSpring(1, {
          damping: 4,
          stiffness: 20,
        })
      );

      buttonX.value = withSequence(
        withTiming(10, { duration: 100 }),
        withTiming(-10, { duration: 100 }),
        withTiming(5, { duration: 100 }),
        withTiming(0, { duration: 100 })
      );
    };

    performButtonAnimation();

    // Use setTimeout to simulate animation completion
    setTimeout(async () => {
      // Reset button state
      setButtonActive(false);

      try {
        // Call the signInWithGoogle function from AuthContext
        await signInWithGoogle();
        // Navigate to Home on successful login - navigation will be handled by the useEffect above
      } catch (error: any) {
        console.error('Error signing in with Google:', error);

        // Don't show alert if user cancelled
        if (error.code === 'SIGN_IN_CANCELLED') {
          return;
        }

        // Check for network-related errors and show toast
        if (error.code === 'NETWORK_ERROR' || 
            error.message?.includes('network') || 
            error.message?.includes('Network') ||
            error.message?.includes('connection') ||
            error.message?.includes('Connection') ||
            error.code === 'auth/network-request-failed') {
          showToast('Network error. Please check your internet connection and try again.');
          return;
        }

        // For other errors, show simple alert
        Alert.alert('Sign In Failed', 'Please try again');
      }
    }, 800);
  }, [buttonAnim, buttonX, createBurstAnimation, signInWithGoogle, setButtonActive, setButtonStyles]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#e6f2ff" />

      {/* Animated content */}
      <View style={styles.contentContainer}>
        <View style={styles.logoContainer}>
          <Animated.View
            style={[
              styles.logo,
              logoAnimatedStyle,
            ]}
          >
            <Animated.Text
              style={[
                styles.starIcon,
                starAnimatedStyle,
              ]}
            >
              ★
            </Animated.Text>

            {/* Particles */}
            {showParticles && particles.map(p => (
              <Particle
                key={p.id}
                delay={p.delay}
                duration={p.duration}
                startX={p.startX}
                startY={p.startY}
                scale={p.scale}
                color={p.color}
              />
            ))}
          </Animated.View>
        </View>

        <Animated.Text
          style={[
            styles.title,
            titleAnimatedStyle,
          ]}
        >
          PresentationAI
        </Animated.Text>

        <Animated.Text
          style={[
            styles.subtitle,
            subtitleAnimatedStyle,
          ]}
        >
          Create stunning presentations with AI
        </Animated.Text>
      </View>

      {/* Animated button with enhanced effects */}
      <Animated.View
        style={[
          styles.buttonContainer,
          buttonAnimatedStyle,
        ]}
      >
        <View
          style={[
            styles.buttonBorderGlow,
            {
              borderColor: buttonStyles.borderColor,
              shadowColor: buttonStyles.borderColor,
              shadowRadius: buttonActive ? 10 : buttonStyles.shadowRadius,
              shadowOpacity: buttonActive ? 0.4 : buttonStyles.shadowOpacity,
              elevation: buttonActive ? 8 : 4,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.googleButton,
              { backgroundColor: buttonStyles.backgroundColor },
            ]}
        onPress={handleGoogleLogin}
            activeOpacity={0.85}
            disabled={isLoading}
      >
            {/* Simple Google icon and text */}
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <Animated.View
                  style={[
                    styles.loadingIndicator,
                    loadingAnimatedStyle,
                  ]}
                />
              </View>
            ) : (
              <Icon name="logo-google" size={22} color="#C25449" style={styles.googleIconStyle} />
            )}
            <Text style={styles.googleButtonText}>
              {isLoading ? 'Signing in...' : 'Continue with Google'}
            </Text>
      </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e6f2ff',
    justifyContent: 'space-between',
    paddingBottom: 80,
  },
  contentContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  logo: {
    width: 100,
    height: 100,
    backgroundColor: '#5669ff',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    position: 'relative',
    overflow: 'visible',
  },
  starIcon: {
    color: 'white',
    fontSize: 48,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 40,
  },
  buttonBorderGlow: {
    borderRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 100,
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  googleIconStyle: {
    marginRight: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  loadingContainer: {
    width: 22,
    height: 22,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIndicator: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#4285F4',
    borderTopColor: 'transparent',
  },
  particle: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default Login;
