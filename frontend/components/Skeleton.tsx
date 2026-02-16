import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, DimensionValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: any;
  circle?: boolean;
}

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

export default function Skeleton({ width = '100%', height = 20, borderRadius = 8, style, circle }: Props) {
  const { colors } = useTheme();
  const translateX = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(translateX, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const animatedStyle = {
    transform: [
      {
        translateX: translateX.interpolate({
          inputRange: [-1, 1],
          outputRange: [-200, 200], // Adjust based on common widths
        }),
      },
    ],
  };

  return (
    <View
      style={[
        styles.container,
        {
          width,
          height,
          borderRadius: circle ? (typeof height === 'number' ? height / 2 : 50) : borderRadius,
          backgroundColor: colors.glass,
          borderColor: colors.glassBorder,
        },
        style,
      ]}
    >
      <AnimatedGradient
        colors={['transparent', colors.textMuted + '20', 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[StyleSheet.absoluteFill, animatedStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderWidth: 1,
  },
});
