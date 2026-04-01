import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { COLORS } from '../constants/theme';

export const HUD: React.FC = () => {
  const game = useGameStore(s => s.game);
  const endTurn = useGameStore(s => s.endTurn);
  const seed = useGameStore(s => s.seed);
  const cellTiles = useGameStore(s => s.cellTiles);

  if (!game) return null;

  const landCount = cellTiles.filter(t => t.elevation >= 0.2).length;
  const waterCount = cellTiles.length - landCount;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.infoRow}>
          <Badge label="Toplam" value={String(cellTiles.length)} color="#A0B0C0" />
          <Badge label="Kara" value={String(landCount)} color="#8BC34A" />
          <Badge label="Su" value={String(waterCount)} color="#4A90D9" />
          <Badge label="Seed" value={String(seed)} color="#D4A843" />
        </View>
        <View style={styles.turnInfo}>
          <Text style={styles.turnText}>Tur {game.turn}</Text>
        </View>
      </View>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.endTurnButton} onPress={endTurn}>
          <Text style={styles.endTurnText}>TURU BITIR</Text>
        </TouchableOpacity>
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
  container: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'box-none' },
  topBar: { position: 'absolute', top: 50, left: 8, right: 8, backgroundColor: 'rgba(26,35,50,0.9)', borderRadius: 12, padding: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#2A3A4A' },
  infoRow: { flexDirection: 'row', gap: 6 },
  badge: { backgroundColor: '#1A2332', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3, alignItems: 'center' },
  badgeLabel: { fontSize: 8 },
  badgeValue: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  turnInfo: { alignItems: 'flex-end' },
  turnText: { color: '#D4A843', fontSize: 14, fontWeight: '700' },
  bottomBar: { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' },
  endTurnButton: { backgroundColor: '#4A90D9', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 16, borderWidth: 2, borderColor: '#6AADE6' },
  endTurnText: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
});
