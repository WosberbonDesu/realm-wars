import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useGameStore } from '../store/gameStore';

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
          <Badge label="Hucre" value={String(cellTiles.length)} color="#A0B0C0" />
          <Badge label="Kara" value={String(landCount)} color="#8BC34A" />
          <Badge label="Su" value={String(waterCount)} color="#4A90D9" />
          <Badge label="Nehir" value={String(rivers.length)} color="#3A7BD5" />
          <Badge label="Sehir" value={String(burgs.length)} color="#FFD700" />
          <Badge label="Devlet" value={String(states.length)} color="#D94A4A" />
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
  container: { position: 'absolute', top: 0, left: 0, right: 0, pointerEvents: 'box-none' },
  topBar: { position: 'absolute', top: 10, left: 8, right: 8, backgroundColor: 'rgba(15,25,35,0.92)', borderRadius: 12, padding: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#2A3A4A' },
  infoRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  badge: { backgroundColor: '#1A2332', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2, alignItems: 'center' },
  badgeLabel: { fontSize: 8 },
  badgeValue: { color: '#FFF', fontSize: 11, fontWeight: '600' },
  rightGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  seedText: { color: '#607080', fontSize: 9 },
  regenBtn: { backgroundColor: '#4A90D9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  regenText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  menuBtn: { backgroundColor: '#2A3A4A', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  menuText: { color: '#A0B0C0', fontSize: 10, fontWeight: '600' },
});
