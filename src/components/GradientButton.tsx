import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import adjust from '../utils/adjust';

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  rightIcon?: string;
  containerStyle?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  gradientColors?: string[];
}

const GradientButton: React.FC<GradientButtonProps> = ({
  title,
  onPress,
  rightIcon,
  containerStyle,
  textStyle,
  disabled = false,
  gradientColors = ['#2371EA', '#6E64FC'],
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled}
      style={[styles.buttonContainer, containerStyle]}>
      <View
        style={[
          styles.gradient,
          {
            backgroundColor: gradientColors[1], // Base color is the end color
          },
        ]}>
        {/* Gradient layers - create smoother effect with more layers */}
        <View
          style={[
            styles.gradientLayer,
            {width: '100%', opacity: 0.95, backgroundColor: gradientColors[0]},
          ]}
        />
        <View
          style={[
            styles.gradientLayer,
            {width: '95%', opacity: 0.9, backgroundColor: gradientColors[0]},
          ]}
        />
        <View
          style={[
            styles.gradientLayer,
            {width: '90%', opacity: 0.85, backgroundColor: gradientColors[0]},
          ]}
        />
        <View
          style={[
            styles.gradientLayer,
            {width: '85%', opacity: 0.8, backgroundColor: gradientColors[0]},
          ]}
        />
        <View
          style={[
            styles.gradientLayer,
            {width: '80%', opacity: 0.75, backgroundColor: gradientColors[0]},
          ]}
        />
        <View
          style={[
            styles.gradientLayer,
            {width: '75%', opacity: 0.7, backgroundColor: gradientColors[0]},
          ]}
        />
        <View
          style={[
            styles.gradientLayer,
            {width: '70%', opacity: 0.65, backgroundColor: gradientColors[0]},
          ]}
        />
        <View
          style={[
            styles.gradientLayer,
            {width: '65%', opacity: 0.6, backgroundColor: gradientColors[0]},
          ]}
        />
        <View
          style={[
            styles.gradientLayer,
            {width: '60%', opacity: 0.55, backgroundColor: gradientColors[0]},
          ]}
        />
        <View
          style={[
            styles.gradientLayer,
            {width: '55%', opacity: 0.5, backgroundColor: gradientColors[0]},
          ]}
        />
        <View
          style={[
            styles.gradientLayer,
            {width: '50%', opacity: 0.45, backgroundColor: gradientColors[0]},
          ]}
        />
        <View
          style={[
            styles.gradientLayer,
            {width: '45%', opacity: 0.4, backgroundColor: gradientColors[0]},
          ]}
        />
        <View
          style={[
            styles.gradientLayer,
            {width: '40%', opacity: 0.35, backgroundColor: gradientColors[0]},
          ]}
        />
        <View
          style={[
            styles.gradientLayer,
            {width: '35%', opacity: 0.3, backgroundColor: gradientColors[0]},
          ]}
        />
        <View
          style={[
            styles.gradientLayer,
            {width: '30%', opacity: 0.25, backgroundColor: gradientColors[0]},
          ]}
        />
        <View
          style={[
            styles.gradientLayer,
            {width: '25%', opacity: 0.2, backgroundColor: gradientColors[0]},
          ]}
        />
        <View
          style={[
            styles.gradientLayer,
            {width: '20%', opacity: 0.15, backgroundColor: gradientColors[0]},
          ]}
        />
        <View
          style={[
            styles.gradientLayer,
            {width: '15%', opacity: 0.1, backgroundColor: gradientColors[0]},
          ]}
        />
        <View
          style={[
            styles.gradientLayer,
            {width: '10%', opacity: 0.05, backgroundColor: gradientColors[0]},
          ]}
        />

        <View style={styles.contentContainer}>
          <Text style={[styles.buttonText, textStyle]}>{title}</Text>
          {rightIcon && <Text style={styles.icon}>{rightIcon}</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    borderRadius: adjust(10),
    overflow: 'hidden',
    width: '100%',
  },
  gradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: adjust(16),
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.3,
    shadowRadius: adjust(5),
    elevation: 5,
    borderRadius: adjust(10),
    overflow: 'hidden',
    position: 'relative',
  },
  gradientLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderTopLeftRadius: adjust(10),
    borderBottomLeftRadius: adjust(10),
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: adjust(16),
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: adjust(2),
  },
  icon: {
    color: '#FFFFFF',
    fontSize: adjust(18),
    marginLeft: adjust(8),
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: adjust(2),
  },
});

export default GradientButton;
