import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants/theme';
import { RESOURCE_COLORS, RESOURCE_ICONS } from '../constants/theme';
import { useGameStore } from '../store/gameStore';
import HexMapRenderer from '../components/HexMapRenderer';

interface Props {
  onBackToMenu: () => void;
}

export default function GameScreen({ onBackToMenu }: Props) {
  const turn = useGameStore(s => s.turn);
  const phase = useGameStore(s => s.phase);
  const currentPlayerId = useGameStore(s => s.currentPlayerId);
  const players = useGameStore(s => s.players);

  const currentPlayer = players.find(p => p.id === currentPlayerId);

  return (
    <View style={styles.container}>
      {/* Ust bilgi */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBackToMenu}>
          <Text style={styles.backText}>Menu</Text>
        </TouchableOpacity>
        <Text style={styles.turnText}>Tur {turn}</Text>
        <Text style={styles.playerText}>
          {currentPlayer?.name ?? '---'}
        </Text>
      </View>

      {/* Harita */}
      <HexMapRenderer />

      {/* Alt bilgi - kaynak gosterimi placeholder */}
      <View style={styles.bottomBar}>
        {currentPlayer && (
          <View style={styles.resourceRow}>
            {(['gold', 'iron', 'food', 'wood', 'stone'] as const).map(res => (
              <View key={res} style={styles.resItem}>
                <Text style={styles.resIcon}>{RESOURCE_ICONS[res]}</Text>
                <Text style={[styles.resText, { color: RESOURCE_COLORS[res] }]}>
                  {currentPlayer.resources[res]}
                </Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.endTurnButton} onPress={() => useGameStore.getState().endTurn()}>
          <Text style={styles.endTurnText}>Turu Bitir</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    backgroundColor: COLORS.bgLight,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  turnText: {
    color: COLORS.gold,
    fontSize: 16,
    fontWeight: '700',
  },
  playerText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 32,
    backgroundColor: COLORS.bgLight,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  resourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  resItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  resIcon: {
    fontSize: 12,
  },
  resText: {
    fontSize: 12,
    fontWeight: '700',
  },
  endTurnButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  endTurnText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
});
