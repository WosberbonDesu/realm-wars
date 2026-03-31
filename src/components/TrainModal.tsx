import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView,
} from 'react-native';
import { useGameStore } from '../store/gameStore';
import { UnitType, Resources } from '../types/game';
import { BASE_UNITS } from '../constants/tech';
import { COLORS, RESOURCE_COLORS, RESOURCE_ICONS } from '../constants/theme';
import { UNIT_STATS, UNIT_ICONS } from '../constants/game';
import { UNIT_ABILITIES } from '../constants/abilities';
import { useI18n } from '../i18n/useI18n';

interface Props {
  visible: boolean;
  onClose: (trained?: boolean) => void;
}

export default function TrainModal({ visible, onClose }: Props) {
  const { t } = useI18n();
  const selectedHex = useGameStore(s => s.selectedHex);
  const trainUnit = useGameStore(s => s.trainUnit);
  const currentPlayerId = useGameStore(s => s.currentPlayerId);
  const players = useGameStore(s => s.players);
  const [counts, setCounts] = useState<Record<string, number>>({
    [UnitType.Warrior]: 1,
    [UnitType.Archer]: 1,
    [UnitType.Cavalry]: 1,
    [UnitType.Catapult]: 1,
    [UnitType.Scout]: 1,
    [UnitType.Galley]: 1,
    [UnitType.Warship]: 1,
  });
  const getUnlockedUnits = useGameStore(s => s.getUnlockedUnits);
  const unitTypes = getUnlockedUnits(currentPlayerId);

  if (!selectedHex) return null;

  const player = players.find(p => p.id === currentPlayerId);

  const canAfford = (type: UnitType, count: number): boolean => {
    if (!player) return false;
    const cost = UNIT_STATS[type].cost;
    const r = player.resources;
    return (
      r.gold >= (cost.gold ?? 0) * count &&
      r.iron >= (cost.iron ?? 0) * count &&
      r.food >= (cost.food ?? 0) * count &&
      r.wood >= (cost.wood ?? 0) * count &&
      r.stone >= (cost.stone ?? 0) * count
    );
  };

  const handleTrain = (type: UnitType) => {
    const count = counts[type];
    const success = trainUnit(selectedHex, type, count);
    if (success) onClose(true);
  };

  const adjustCount = (type: UnitType, delta: number) => {
    setCounts(prev => ({
      ...prev,
      [type]: Math.max(1, Math.min(20, prev[type] + delta)),
    }));
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('train.title')}</Text>
            <TouchableOpacity onPress={() => onClose()}>
              <Text style={styles.closeText}>{t('train.close')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.list}>
            {unitTypes.map(type => {
              const stats = UNIT_STATS[type];
              const count = counts[type];
              const affordable = canAfford(type, count);

              return (
                <View key={type} style={styles.item}>
                  <View style={styles.itemTop}>
                    <Text style={styles.itemIcon}>{UNIT_ICONS[type]}</Text>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{t(`unit.${type}`)}</Text>
                      <Text style={styles.itemDesc}>{t(`unit.${type}.desc`)}</Text>
                    </View>
                  </View>

                  {/* Yetenek */}
                  {UNIT_ABILITIES[type] && (
                    <View style={styles.abilityRow}>
                      <Text style={styles.abilityIcon}>{UNIT_ABILITIES[type].icon}</Text>
                      <Text style={styles.abilityName}>{UNIT_ABILITIES[type].name}: </Text>
                      <Text style={styles.abilityDesc}>{UNIT_ABILITIES[type].description}</Text>
                    </View>
                  )}

                  {/* Statlar */}
                  <View style={styles.statsRow}>
                    <Text style={styles.statText}>ATK {stats.attack}</Text>
                    <Text style={styles.statText}>DEF {stats.defense}</Text>
                    <Text style={styles.statText}>HP {stats.health}</Text>
                    <Text style={styles.statText}>SPD {stats.speed}</Text>
                  </View>

                  {/* Birim basi maliyet */}
                  <View style={styles.costRow}>
                    {Object.entries(stats.cost).map(([res, val]) => (
                      <Text
                        key={res}
                        style={[
                          styles.costText,
                          { color: RESOURCE_COLORS[res as keyof typeof RESOURCE_COLORS] },
                        ]}
                      >
                        {RESOURCE_ICONS[res as keyof typeof RESOURCE_ICONS]} {(val as number) * count}
                      </Text>
                    ))}
                  </View>

                  {/* Adet secici + egit butonu */}
                  <View style={styles.bottomRow}>
                    <View style={styles.counter}>
                      <TouchableOpacity
                        style={styles.counterBtn}
                        onPress={() => adjustCount(type, -1)}
                      >
                        <Text style={styles.counterBtnText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.counterValue}>{count}</Text>
                      <TouchableOpacity
                        style={styles.counterBtn}
                        onPress={() => adjustCount(type, 1)}
                      >
                        <Text style={styles.counterBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={[styles.trainBtn, !affordable && styles.trainBtnDisabled]}
                      onPress={() => handleTrain(type)}
                      disabled={!affordable}
                    >
                      <Text style={styles.trainBtnText}>{t('train.train')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.bgOverlay,
    justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: COLORS.bgLight,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 36,
    maxHeight: '75%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    color: COLORS.gold,
    fontSize: 18,
    fontWeight: '800',
  },
  closeText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  item: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  itemIcon: {
    fontSize: 26,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  itemDesc: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  abilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  abilityIcon: { fontSize: 12 },
  abilityName: { color: COLORS.gold, fontSize: 10, fontWeight: '700' },
  abilityDesc: { color: COLORS.textMuted, fontSize: 10 },
  statsRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 6,
  },
  statText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  costRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  costText: {
    fontSize: 11,
    fontWeight: '600',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  counterBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.bgLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnText: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  counterValue: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    minWidth: 28,
    textAlign: 'center',
  },
  trainBtn: {
    backgroundColor: '#2D5A27',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  trainBtnDisabled: {
    opacity: 0.4,
  },
  trainBtnText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
});
