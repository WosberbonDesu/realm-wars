import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { COLORS, RESOURCE_COLORS, SHARED } from '../constants/theme';

export const HUD: React.FC = () => {
  const game = useGameStore(s => s.game);
  const endTurn = useGameStore(s => s.endTurn);

  if (!game) return null;

  const player = game.players.find(p => p.id === game.currentPlayerId);
  if (!player) return null;

  const r = player.resources;

  return (
    <View style={styles.container}>
      {/* Top bar: Resources */}
      <View style={styles.topBar}>
        <View style={styles.resourceRow}>
          <ResourceBadge label="Altin" value={r.gold} color={RESOURCE_COLORS.gold} />
          <ResourceBadge label="Demir" value={r.iron} color={RESOURCE_COLORS.iron} />
          <ResourceBadge label="Yemek" value={r.food} color={RESOURCE_COLORS.food} />
          <ResourceBadge label="Odun" value={r.wood} color={RESOURCE_COLORS.wood} />
          <ResourceBadge label="Tas" value={r.stone} color={RESOURCE_COLORS.stone} />
        </View>
        <View style={styles.turnInfo}>
          <Text style={styles.turnText}>Tur {game.turn}</Text>
          <Text style={styles.territoryText}>{player.territory.length} hex</Text>
        </View>
      </View>

      {/* Bottom: End turn button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.endTurnButton} onPress={endTurn}>
          <Text style={styles.endTurnText}>TURU BITIR</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const ResourceBadge: React.FC<{ label: string; value: number; color: string }> = ({
  label, value, color,
}) => (
  <View style={styles.badge}>
    <View style={[styles.dot, { backgroundColor: color }]} />
    <Text style={styles.badgeValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    pointerEvents: 'box-none',
  },
  topBar: {
    position: 'absolute',
    top: 50, left: 8, right: 8,
    backgroundColor: COLORS.bgPanel,
    borderRadius: 12,
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resourceRow: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgLight,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 3,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeValue: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  turnInfo: {
    alignItems: 'flex-end',
  },
  turnText: {
    color: COLORS.gold,
    fontSize: 14,
    fontWeight: '700',
  },
  territoryText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 40,
    left: 0, right: 0,
    alignItems: 'center',
  },
  endTurnButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
  },
  endTurnText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
