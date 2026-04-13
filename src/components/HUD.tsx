import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { COLORS, SPACING, RADIUS, SHADOW, FONT } from '../constants/theme';

export const HUD: React.FC = () => {
  const cellTiles = useGameStore(s => s.cellTiles);
  const rivers = useGameStore(s => s.rivers);
  const burgs = useGameStore(s => s.burgs);
  const states = useGameStore(s => s.states);
  const seed = useGameStore(s => s.seed);
  const setScreen = useGameStore(s => s.setScreen);
  const newGame = useGameStore(s => s.newGame);

  const landCount = cellTiles.filter(t => t.elevation >= 0.2).length;
  const waterCount = cellTiles.length - landCount;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.infoRow}>
          <Badge label="Hucre" value={String(cellTiles.length)} color={COLORS.textSecondary} />
          <Badge label="Kara" value={String(landCount)} color={COLORS.success} />
          <Badge label="Su" value={String(waterCount)} color={COLORS.info} />
          <Badge label="Nehir" value={String(rivers.length)} color="#5A9BD5" />
          <Badge label="Sehir" value={String(burgs.length)} color={COLORS.gold} />
          <Badge label="Devlet" value={String(states.length)} color={COLORS.danger} />
        </View>
        <View style={styles.rightGroup}>
          <Text style={styles.seedText}>Seed: {seed}</Text>
          <TouchableOpacity style={styles.regenBtn} onPress={() => newGame()}>
            <Text style={styles.regenText}>Yeni Harita</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuBtn} onPress={() => setScreen('menu')}>
            <Text style={styles.menuText}>Menu</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const Badge: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <View style={styles.badge}>
    <Text style={[styles.badgeLabel, { color }]}>{label}</Text>
    <Text style={styles.badgeValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    position: 'absolute', top: 0, left: 0, right: 0,
    pointerEvents: 'box-none',
  },
  topBar: {
    position: 'absolute', top: SPACING.sm, left: SPACING.sm, right: SPACING.sm,
    backgroundColor: COLORS.surfaceOverlay,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.panel,
  },
  infoRow: { flexDirection: 'row', gap: SPACING.xs, flexWrap: 'wrap' },
  badge: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 6,
    paddingVertical: 3,
    alignItems: 'center',
  },
  badgeLabel: { ...FONT.small },
  badgeValue: { color: COLORS.textPrimary, ...FONT.caption, fontWeight: '700' },
  rightGroup: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  seedText: { color: COLORS.textMuted, ...FONT.small },
  regenBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    ...SHADOW.button,
  },
  regenText: { color: COLORS.textDark, ...FONT.caption, fontWeight: '700' },
  menuBtn: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
  },
  menuText: { color: COLORS.textSecondary, ...FONT.caption, fontWeight: '600' },
});
