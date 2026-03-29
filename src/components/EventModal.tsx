import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { GameEvent } from '../constants/events';
import { COLORS, RESOURCE_COLORS, RESOURCE_ICONS } from '../constants/theme';
import { Resources } from '../types/game';
import { t } from '../i18n';

interface Props {
  visible: boolean;
  event: GameEvent | null;
  onClose: () => void;
}

export default function EventModal({ visible, event, onClose }: Props) {
  if (!event) return null;

  const effectText = () => {
    switch (event.effect.kind) {
      case 'resource_gain':
        return Object.entries(event.effect.resources)
          .filter(([, v]) => v !== 0)
          .map(([res, val]) => ({
            res,
            val: val as number,
            positive: (val as number) > 0,
          }));
      case 'resource_loss':
        return Object.entries(event.effect.resources)
          .filter(([, v]) => v !== 0)
          .map(([res, val]) => ({
            res,
            val: -(val as number),
            positive: false,
          }));
      case 'unit_loss':
        return [{ res: 'units', val: -Math.round(event.effect.percentage * 100), positive: false }];
      default:
        return [];
    }
  };

  const effects = effectText();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[
          styles.panel,
          { borderLeftColor: event.positive ? COLORS.green : COLORS.red },
        ]}>
          <Text style={styles.icon}>{event.icon}</Text>
          <Text style={[
            styles.title,
            { color: event.positive ? COLORS.green : COLORS.red },
          ]}>
            {event.name}
          </Text>
          <Text style={styles.description}>{event.description}</Text>

          <View style={styles.effectsContainer}>
            {effects.map((e, i) => (
              <View key={i} style={styles.effectRow}>
                {e.res === 'units' ? (
                  <Text style={[styles.effectText, { color: COLORS.red }]}>
                    {t('event.units', { val: e.val })}
                  </Text>
                ) : (
                  <>
                    <Text style={styles.effectIcon}>
                      {RESOURCE_ICONS[e.res as keyof typeof RESOURCE_ICONS]}
                    </Text>
                    <Text style={[
                      styles.effectText,
                      { color: e.positive ? COLORS.green : COLORS.red },
                    ]}>
                      {e.positive ? '+' : ''}{e.val} {e.res}
                    </Text>
                  </>
                )}
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>{t('event.ok')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.bgOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  panel: {
    width: '100%',
    backgroundColor: COLORS.bgLight,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 4,
    alignItems: 'center',
  },
  icon: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 8,
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  effectsContainer: {
    width: '100%',
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  effectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  effectIcon: {
    fontSize: 16,
  },
  effectText: {
    fontSize: 14,
    fontWeight: '700',
  },
  closeBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 10,
  },
  closeBtnText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
});
