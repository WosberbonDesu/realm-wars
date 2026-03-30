/**
 * MapEffects — harita üzerindeki animasyonlu efektler.
 * Ordu hareketi çizgisi, savaş patlaması, bina inşaat parıltısı.
 */
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSequence,
  withDelay, runOnJS,
  type SharedValue,
} from 'react-native-reanimated';
import { COLORS } from '../constants/theme';

// ═══ ORDU HAREKET ANIMASYONU ═══
export interface MoveAnimation {
  id: string;
  fromX: number; fromY: number;
  toX: number; toY: number;
  icon: string;
  color: string;
}

export function ArmyMoveEffect({
  anim, onDone, translateX, translateY, scale, canvasWidth, canvasHeight,
}: {
  anim: MoveAnimation;
  onDone: (id: string) => void;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  scale: SharedValue<number>;
  canvasWidth: SharedValue<number>;
  canvasHeight: SharedValue<number>;
}) {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    progress.value = withTiming(1, { duration: 600 });
    opacity.value = withDelay(500, withTiming(0, { duration: 200 }, () => {
      runOnJS(onDone)(anim.id);
    }));
  }, []);

  const style = useAnimatedStyle(() => {
    const cx = canvasWidth.value / 2;
    const cy = canvasHeight.value / 2;
    const x = anim.fromX + (anim.toX - anim.fromX) * progress.value;
    const y = anim.fromY + (anim.toY - anim.fromY) * progress.value;
    return {
      position: 'absolute' as const,
      left: cx + (x + translateX.value) * scale.value - 14,
      top: cy + (y + translateY.value) * scale.value - 14,
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <Animated.Text style={[styles.moveIcon, style]}>{anim.icon}</Animated.Text>
  );
}

// ═══ SAVAŞ PATLAMA EFEKTİ ═══
export interface BattleEffect {
  id: string;
  x: number; y: number;
  won: boolean;
}

export function BattleExplosion({
  effect, onDone, translateX, translateY, scale, canvasWidth, canvasHeight,
}: {
  effect: BattleEffect;
  onDone: (id: string) => void;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  scale: SharedValue<number>;
  canvasWidth: SharedValue<number>;
  canvasHeight: SharedValue<number>;
}) {
  const explosionScale = useSharedValue(0.3);
  const opacity = useSharedValue(1);

  useEffect(() => {
    explosionScale.value = withSequence(
      withTiming(1.8, { duration: 200 }),
      withTiming(1.2, { duration: 150 }),
    );
    opacity.value = withDelay(400, withTiming(0, { duration: 300 }, () => {
      runOnJS(onDone)(effect.id);
    }));
  }, []);

  const style = useAnimatedStyle(() => {
    const cx = canvasWidth.value / 2;
    const cy = canvasHeight.value / 2;
    return {
      position: 'absolute' as const,
      left: cx + (effect.x + translateX.value) * scale.value - 20,
      top: cy + (effect.y + translateY.value) * scale.value - 20,
      opacity: opacity.value,
      transform: [{ scale: explosionScale.value * scale.value }],
    };
  });

  return (
    <Animated.Text style={[styles.explosionIcon, style]}>
      {effect.won ? '⚔️' : '💥'}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  moveIcon: {
    fontSize: 20,
    textShadowColor: '#000',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },
  explosionIcon: {
    fontSize: 28,
    textShadowColor: '#FF440080',
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 0 },
  },
});
