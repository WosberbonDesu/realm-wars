/**
 * GameToast — oyun içi bildirim toast'ları.
 * "Düşman saldırdı!", "Araştırma tamamlandı!" gibi olaylar.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSequence,
  withDelay, runOnJS,
} from 'react-native-reanimated';
import { COLORS, FONT, SPACE, RADIUS } from '../constants/theme';

export interface ToastItem {
  id: string;
  icon: string;
  text: string;
  color: string;
  type: 'info' | 'warning' | 'danger' | 'success';
}

interface Props {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export default function GameToast({ toasts, onDismiss }: Props) {
  return (
    <View style={styles.container} pointerEvents="none">
      {toasts.slice(0, 3).map((toast, idx) => (
        <ToastBubble key={toast.id} toast={toast} index={idx} onDone={onDismiss} />
      ))}
    </View>
  );
}

function ToastBubble({ toast, index, onDone }: { toast: ToastItem; index: number; onDone: (id: string) => void }) {
  const translateX = useSharedValue(300);
  const opacity = useSharedValue(0);

  const bgColors = {
    info: COLORS.primaryDark,
    warning: '#4A3800',
    danger: '#4A1010',
    success: '#103A10',
  };

  const borderColors = {
    info: COLORS.primary + '80',
    warning: '#FFD70060',
    danger: COLORS.red + '60',
    success: COLORS.green + '60',
  };

  useEffect(() => {
    translateX.value = withTiming(0, { duration: 300 });
    opacity.value = withTiming(1, { duration: 200 });

    // 3 saniye sonra kaybol
    translateX.value = withDelay(3000, withTiming(300, { duration: 300 }));
    opacity.value = withDelay(3000, withTiming(0, { duration: 300 }, () => {
      runOnJS(onDone)(toast.id);
    }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[
      styles.toast,
      { backgroundColor: bgColors[toast.type], borderColor: borderColors[toast.type] },
      animStyle,
    ]}>
      <Text style={styles.toastIcon}>{toast.icon}</Text>
      <Text style={[styles.toastText, { color: toast.color }]} numberOfLines={2}>
        {toast.text}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    right: 10,
    gap: SPACE.sm,
    zIndex: 250,
    maxWidth: 260,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  toastIcon: {
    fontSize: 20,
  },
  toastText: {
    fontSize: FONT.caption,
    fontWeight: '600' as any,
    flex: 1,
  },
});
