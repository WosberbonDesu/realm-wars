import React, { useEffect } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSequence,
  withDelay, runOnJS,
} from 'react-native-reanimated';
import { COLORS } from '../constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');

interface Props {
  turn: number;
  playerName: string;
  playerColor: string;
  visible: boolean;
  onFinish: () => void;
}

export default function TurnBanner({ turn, playerName, playerColor, visible, onFinish }: Props) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-60);
  const scaleX = useSharedValue(0.8);

  useEffect(() => {
    if (visible) {
      opacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withDelay(1200, withTiming(0, { duration: 300 }, () => {
          runOnJS(onFinish)();
        })),
      );
      translateY.value = withSequence(
        withTiming(0, { duration: 250 }),
        withDelay(1200, withTiming(-60, { duration: 300 })),
      );
      scaleX.value = withSequence(
        withTiming(1, { duration: 250 }),
        withDelay(1200, withTiming(0.8, { duration: 300 })),
      );
    }
  }, [visible, turn]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scaleX: scaleX.value },
    ],
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, animStyle]}>
      <Animated.View style={[styles.banner, { borderLeftColor: playerColor }]}>
        <Animated.Text style={styles.turnText}>Tur {turn}</Animated.Text>
        <Animated.Text style={[styles.playerText, { color: playerColor }]}>
          {playerName}
        </Animated.Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
    pointerEvents: 'none',
  },
  banner: {
    backgroundColor: COLORS.bgPanel,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    minWidth: 200,
  },
  turnText: {
    color: COLORS.gold,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
  },
  playerText: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
});
