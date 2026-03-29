import React from 'react';
import { StyleSheet, Text, ViewStyle, TextStyle } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSequence,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { COLORS } from '../constants/theme';

interface Props {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  variant?: 'primary' | 'gold' | 'danger' | 'secondary';
}

export default function AnimatedButton({
  label, onPress, style, textStyle, disabled, variant = 'primary',
}: Props) {
  const scaleVal = useSharedValue(1);
  const opacityVal = useSharedValue(1);

  const gesture = Gesture.Tap()
    .enabled(!disabled)
    .onBegin(() => {
      scaleVal.value = withTiming(0.95, { duration: 80 });
      opacityVal.value = withTiming(0.8, { duration: 80 });
    })
    .onFinalize(() => {
      scaleVal.value = withTiming(1, { duration: 120 });
      opacityVal.value = withTiming(1, { duration: 120 });
    })
    .onEnd(() => {
      scaleVal.value = withSequence(
        withTiming(1.03, { duration: 60 }),
        withTiming(1, { duration: 80 }),
      );
      onPress();
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleVal.value }],
    opacity: disabled ? 0.4 : opacityVal.value,
  }));

  const bgColor = {
    primary: COLORS.primary,
    gold: COLORS.gold,
    danger: COLORS.red,
    secondary: 'transparent',
  }[variant];

  const txtColor = variant === 'gold' ? COLORS.bg : COLORS.textPrimary;
  const borderStyle = variant === 'secondary'
    ? { borderWidth: 1, borderColor: COLORS.border }
    : {};

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          styles.button,
          { backgroundColor: bgColor },
          borderStyle,
          style,
          animStyle,
        ]}
      >
        <Text style={[styles.text, { color: txtColor }, textStyle]}>{label}</Text>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
  },
});
