import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { COLORS, FONT, SPACE, RADIUS } from '../constants/theme';
import { useI18n } from '../i18n/useI18n';

const STEP_ICONS = ['🏰', '🚩', '🏗️', '⚔️', '🔬', '⚔️', '🏳️', '👑'];
const TOTAL_STEPS = 8;

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function TutorialModal({ visible, onClose }: Props) {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const isLast = step === TOTAL_STEPS - 1;
  const isFirst = step === 0;

  const handleNext = () => {
    if (isLast) {
      setStep(0);
      onClose();
    } else {
      setStep(s => s + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) setStep(s => s - 1);
  };

  const handleSkip = () => {
    setStep(0);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.panel}>
          {/* Progress dots */}
          <View style={styles.dots}>
            {STEP_ICONS.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === step && styles.dotActive, i < step && styles.dotDone]}
              />
            ))}
          </View>

          {/* Ikon */}
          <Text style={styles.icon}>{STEP_ICONS[step]}</Text>

          {/* Baslik */}
          <Text style={styles.title}>{t(`tutorial.${step}.title`)}</Text>

          {/* Aciklama */}
          <Text style={styles.text}>{t(`tutorial.${step}.text`)}</Text>

          {/* Ipucu */}
          <View style={styles.tipBox}>
            <Text style={styles.tipLabel}>{t('tutorial.tip')}</Text>
            <Text style={styles.tipText}>{t(`tutorial.${step}.tip`)}</Text>
          </View>

          {/* Adim sayaci */}
          <Text style={styles.counter}>{t('tutorial.step', { current: step + 1, total: TOTAL_STEPS })}</Text>

          {/* Butonlar */}
          <View style={styles.buttons}>
            {!isFirst ? (
              <TouchableOpacity style={styles.prevBtn} onPress={handlePrev}>
                <Text style={styles.prevText}>{t('tutorial.back')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
                <Text style={styles.skipText}>{t('tutorial.skip')}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
              <Text style={styles.nextText}>{isLast ? t('tutorial.start') : t('tutorial.next')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.bgOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  panel: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.bgLight,
    borderRadius: RADIUS.xl,
    padding: SPACE.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: SPACE.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  dotActive: {
    backgroundColor: COLORS.gold,
    width: 20,
  },
  dotDone: {
    backgroundColor: COLORS.green,
  },
  icon: {
    fontSize: 52,
    marginBottom: SPACE.md,
  },
  title: {
    color: COLORS.gold,
    fontSize: FONT.h2,
    fontWeight: FONT.black,
    textAlign: 'center',
    marginBottom: SPACE.md,
  },
  text: {
    color: COLORS.textPrimary,
    fontSize: FONT.body,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: SPACE.lg,
  },
  tipBox: {
    width: '100%',
    backgroundColor: COLORS.primaryMuted,
    borderRadius: RADIUS.md,
    padding: SPACE.md,
    marginBottom: SPACE.lg,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  tipLabel: {
    color: COLORS.primary,
    fontSize: FONT.tiny,
    fontWeight: FONT.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACE.xs,
  },
  tipText: {
    color: COLORS.textSecondary,
    fontSize: FONT.caption,
    lineHeight: 18,
  },
  counter: {
    color: COLORS.textMuted,
    fontSize: FONT.tiny,
    marginBottom: SPACE.md,
  },
  buttons: {
    flexDirection: 'row',
    gap: SPACE.md,
    width: '100%',
  },
  prevBtn: {
    flex: 1,
    paddingVertical: SPACE.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  prevText: {
    color: COLORS.textSecondary,
    fontSize: FONT.body,
    fontWeight: FONT.semi,
  },
  skipBtn: {
    flex: 1,
    paddingVertical: SPACE.md,
    alignItems: 'center',
  },
  skipText: {
    color: COLORS.textMuted,
    fontSize: FONT.body,
  },
  nextBtn: {
    flex: 2,
    paddingVertical: SPACE.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
  },
  nextText: {
    color: COLORS.textInverse,
    fontSize: FONT.body,
    fontWeight: FONT.bold,
  },
});
