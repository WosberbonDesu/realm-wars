/**
 * FloatingFeedback — shows a floating icon + text that rises and fades out.
 * Used for in-game action confirmations: build, train, move, research, etc.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { COLORS, FONT, RADIUS, SPACE } from '../constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');

export interface FeedbackItem {
  id: string;
  icon: string;
  text: string;
  color: string;
}

interface Props {
  items: FeedbackItem[];
  onItemDone: (id: string) => void;
}

export default function FloatingFeedback({ items, onItemDone }: Props) {
  return (
    <>
      {items.map((item, idx) => (
        <FeedbackBubble key={item.id} item={item} index={idx} onDone={onItemDone} />
      ))}
    </>
  );
}

function FeedbackBubble({
  item, index, onDone,
}: {
  item: FeedbackItem; index: number; onDone: (id: string) => void;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(0.6);

  useEffect(() => {
    // Appear
    opacity.value = withTiming(1, { duration: 150 });
    scale.value = withTiming(1, { duration: 200 });

    // Float up and fade after delay
    translateY.value = withDelay(
      600,
      withTiming(-60, { duration: 600 }),
    );
    opacity.value = withDelay(
      800,
      withTiming(0, { duration: 400 }, () => {
        runOnJS(onDone)(item.id);
      }),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={[styles.bubble, { bottom: 180 + index * 50 }, animStyle]}>
      <Animated.Text style={styles.icon}>{item.icon}</Animated.Text>
      <Animated.Text style={[styles.text, { color: item.color }]}>{item.text}</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    backgroundColor: COLORS.bgPanel,
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    zIndex: 200,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  icon: {
    fontSize: 18,
  },
  text: {
    fontSize: FONT.caption,
    fontWeight: FONT.bold,
  },
});
