import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { BattleResult } from '../engine/combat';
import { COLORS } from '../constants/theme';
import { t } from '../i18n';

interface Props {
  visible: boolean;
  result: BattleResult | null;
  onClose: () => void;
}

export default function BattleResultModal({ visible, result, onClose }: Props) {
  if (!result) return null;

  const isVictory = result.winner === 'attacker';

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.panel}>
          {/* Baslik */}
          <Text style={[styles.title, { color: isVictory ? COLORS.green : COLORS.red }]}>
            {isVictory ? t('battle.victory') : t('battle.defeat')}
          </Text>

          {/* Sonuc detaylari */}
          <View style={styles.statsContainer}>
            {/* Saldiran */}
            <View style={styles.side}>
              <Text style={styles.sideTitle}>{t('battle.attacker')}</Text>
              <Text style={[styles.lossText, { color: COLORS.red }]}>
                {t('battle.loss', { pct: Math.round(result.attackerLosses * 100) })}
              </Text>
              <Text style={styles.survivorText}>
                {t('battle.surviving')}
              </Text>
              {result.attackerSurvivors.map((u, i) => (
                <Text key={i} style={styles.unitText}>
                  {u.type} x{u.count}
                </Text>
              ))}
              {result.attackerSurvivors.length === 0 && (
                <Text style={styles.eliminatedText}>{t('battle.destroyed')}</Text>
              )}
            </View>

            <View style={styles.divider} />

            {/* Savunan */}
            <View style={styles.side}>
              <Text style={styles.sideTitle}>{t('battle.defender')}</Text>
              <Text style={[styles.lossText, { color: COLORS.red }]}>
                {t('battle.loss', { pct: Math.round(result.defenderLosses * 100) })}
              </Text>
              <Text style={styles.survivorText}>
                {t('battle.surviving')}
              </Text>
              {result.defenderSurvivors.map((u, i) => (
                <Text key={i} style={styles.unitText}>
                  {u.type} x{u.count}
                </Text>
              ))}
              {result.defenderSurvivors.length === 0 && (
                <Text style={styles.eliminatedText}>{t('battle.destroyed')}</Text>
              )}
            </View>
          </View>

          {/* Tetiklenen yetenekler */}
          {result.triggeredAbilities && result.triggeredAbilities.length > 0 && (
            <View style={styles.abilitiesContainer}>
              {result.triggeredAbilities.map((ab, i) => (
                <Text key={i} style={styles.abilityText}>{ab.text}</Text>
              ))}
            </View>
          )}

          {/* Bina hasari */}
          {result.buildingDamage > 0 && (
            <Text style={styles.buildingDmgText}>
              {t('battle.buildingDmg', { val: result.buildingDamage })}
            </Text>
          )}

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>{t('battle.ok')}</Text>
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
    paddingHorizontal: 24,
  },
  panel: {
    width: '100%',
    backgroundColor: COLORS.bgLight,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  side: {
    flex: 1,
  },
  sideTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  lossText: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  survivorText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginBottom: 4,
  },
  unitText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  eliminatedText: {
    color: COLORS.red,
    fontSize: 11,
    fontStyle: 'italic',
  },
  divider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  abilitiesContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    gap: 4,
  },
  abilityText: {
    color: COLORS.gold,
    fontSize: 11,
    fontWeight: '600',
  },
  buildingDmgText: {
    color: COLORS.red,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  closeBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeBtnText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
});
