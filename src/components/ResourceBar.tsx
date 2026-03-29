import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSequence,
} from 'react-native-reanimated';
import { COLORS, RESOURCE_COLORS, RESOURCE_ICONS } from '../constants/theme';
import { Resources } from '../types/game';

interface Props {
  resources: Resources;
  income: Resources | null;
}

const RES_KEYS = ['gold', 'iron', 'food', 'wood', 'stone'] as const;

export default function ResourceBar({ resources, income }: Props) {
  return (
    <View style={styles.row}>
      {RES_KEYS.map(res => (
        <ResourceItem
          key={res}
          icon={RESOURCE_ICONS[res]}
          value={resources[res]}
          income={income ? income[res] : 0}
          color={RESOURCE_COLORS[res]}
        />
      ))}
    </View>
  );
}

function ResourceItem({
  icon, value, income, color,
}: {
  icon: string; value: number; income: number; color: string;
}) {
  const scaleVal = useSharedValue(1);
  const colorFlash = useSharedValue(0);
  const prevValue = useRef(value);

  useEffect(() => {
    if (value !== prevValue.current) {
      const increased = value > prevValue.current;
      prevValue.current = value;
      // Bounce animasyonu
      scaleVal.value = withSequence(
        withTiming(increased ? 1.3 : 0.8, { duration: 100 }),
        withTiming(1, { duration: 200 }),
      );
      colorFlash.value = withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0, { duration: 400 }),
      );
    }
  }, [value]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleVal.value }],
  }));

  return (
    <Animated.View style={[styles.item, animStyle]}>
      <Animated.Text style={styles.icon}>{icon}</Animated.Text>
      <Animated.Text style={[styles.value, { color }]}>{value}</Animated.Text>
      {income > 0 && (
        <Animated.Text style={styles.income}>+{income}</Animated.Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  icon: {
    fontSize: 12,
  },
  value: {
    fontSize: 12,
    fontWeight: '700',
  },
  income: {
    color: COLORS.green,
    fontSize: 9,
    fontWeight: '700',
  },
});
