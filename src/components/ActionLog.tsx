import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay,
  FadeIn, FadeOut, Layout,
} from 'react-native-reanimated';
import { COLORS } from '../constants/theme';

export interface LogEntry {
  id: string;
  text: string;
  color: string;
  icon: string;
}

interface Props {
  entries: LogEntry[];
}

export default function ActionLog({ entries }: Props) {
  // Son 4 entry'yi göster
  const visible = entries.slice(-4);

  return (
    <Animated.View style={styles.container} pointerEvents="none">
      {visible.map((entry) => (
        <LogItem key={entry.id} entry={entry} />
      ))}
    </Animated.View>
  );
}

function LogItem({ entry }: { entry: LogEntry }) {
  const opacity = useSharedValue(1);
  const translateX = useSharedValue(100);

  useEffect(() => {
    translateX.value = withTiming(0, { duration: 300 });
    opacity.value = withDelay(2500, withTiming(0, { duration: 500 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View style={[styles.entry, animStyle]}>
      <Animated.Text style={styles.icon}>{entry.icon}</Animated.Text>
      <Animated.View style={[styles.dot, { backgroundColor: entry.color }]} />
      <Animated.Text style={styles.text} numberOfLines={1}>{entry.text}</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    right: 8,
    width: 220,
    zIndex: 50,
    gap: 6,
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgPanel,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  icon: {
    fontSize: 14,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
});
