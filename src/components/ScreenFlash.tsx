/**
 * ScreenFlash — full-screen color flash overlay for impactful moments.
 * Used for battle, victory, defeat, etc.
 */
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSequence,
  runOnJS,
} from 'react-native-reanimated';

interface Props {
  visible: boolean;
  color: string;
  onDone: () => void;
  duration?: number;
}

export default function ScreenFlash({ visible, color, onDone, duration = 400 }: Props) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withSequence(
        withTiming(0.35, { duration: duration * 0.25 }),
        withTiming(0, { duration: duration * 0.75 }, () => {
          runOnJS(onDone)();
        }),
      );
    }
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.overlay, { backgroundColor: color }, animStyle]}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 300,
  },
});
