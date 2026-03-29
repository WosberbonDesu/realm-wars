import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants/theme';
import { useGameStore } from '../store/gameStore';

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

      {/* Harita alani - Adim 3'te Skia ile doldurulacak */}
      <View style={styles.mapArea}>
        <Text style={styles.placeholderText}>
          Harita burada render edilecek
        </Text>
        <Text style={styles.placeholderSubText}>
          (Adim 3: Skia Hex Renderer)
        </Text>
      </View>

      {/* Alt bilgi - kaynak gosterimi placeholder */}
      <View style={styles.bottomBar}>
        {currentPlayer && (
          <View style={styles.resourceRow}>
            <Text style={styles.resText}>
              Altin: {currentPlayer.resources.gold}
            </Text>
            <Text style={styles.resText}>
              Demir: {currentPlayer.resources.iron}
            </Text>
            <Text style={styles.resText}>
              Yiyecek: {currentPlayer.resources.food}
            </Text>
            <Text style={styles.resText}>
              Odun: {currentPlayer.resources.wood}
            </Text>
            <Text style={styles.resText}>
              Tas: {currentPlayer.resources.stone}
            </Text>
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
  mapArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: COLORS.textMuted,
    fontSize: 18,
  },
  placeholderSubText: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 8,
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
  resText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
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
