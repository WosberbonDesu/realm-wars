import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { TERRAIN_ICONS } from '../constants/game';
import { TERRAIN_NAMES } from '../constants/terrain';
import { COLORS } from '../constants/theme';

export const TileInfoPanel: React.FC = () => {
  const selectedCell = useGameStore(s => s.selectedCell);
  const cellTiles = useGameStore(s => s.cellTiles);

  if (selectedCell === null || selectedCell < 0 || selectedCell >= cellTiles.length) return null;

  const tile = cellTiles[selectedCell];
  if (!tile) return null;

  return (
    <View style={styles.container}>
      <View style={styles.panel}>
        <View style={styles.header}>
          <Text style={styles.icon}>{TERRAIN_ICONS[tile.terrain]}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{tile.biomeName || TERRAIN_NAMES[tile.terrain]}</Text>
            {tile.regionName ? <Text style={styles.subtitle}>{tile.regionName}</Text> : null}
          </View>
        </View>
        <View style={styles.statsRow}>
          <Stat label="Yukseklik" value={`${(tile.elevation * 100).toFixed(0)}m`} />
          <Stat label="Sicaklik" value={`${(tile.temperature * 40).toFixed(0)}`} />
          <Stat label="Nem" value={`${(tile.moisture * 100).toFixed(0)}%`} />
          {tile.hasRiver && <Stat label="Nehir" value="Var" color="#4A90D9" />}
        </View>
        <View style={styles.resourceRow}>
          {tile.resources.gold > 0 && <Res icon="Au" val={tile.resources.gold} color="#FFD700" />}
          {tile.resources.iron > 0 && <Res icon="Fe" val={tile.resources.iron} color="#A0A0B0" />}
          {tile.resources.food > 0 && <Res icon="Fd" val={tile.resources.food} color="#7EC850" />}
          {tile.resources.wood > 0 && <Res icon="Wd" val={tile.resources.wood} color="#8B6914" />}
          {tile.resources.stone > 0 && <Res icon="St" val={tile.resources.stone} color="#9A9A9A" />}
        </View>
      </View>
    </View>
  );
};

const Stat: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <View style={styles.statItem}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
  </View>
);

const Res: React.FC<{ icon: string; val: number; color: string }> = ({ icon, val, color }) => (
  <View style={[styles.resItem, { borderColor: color + '44' }]}>
    <Text style={[styles.resIcon, { color }]}>{icon}</Text>
    <Text style={styles.resVal}>{val}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { position: 'absolute', bottom: 100, left: 8, right: 8, pointerEvents: 'box-none' },
  panel: { backgroundColor: 'rgba(26,35,50,0.9)', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#2A3A4A' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  icon: { fontSize: 28 },
  title: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  subtitle: { color: '#607080', fontSize: 11 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  statItem: { backgroundColor: '#1A2332', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center' },
  statLabel: { color: '#607080', fontSize: 9 },
  statValue: { color: '#A0B0C0', fontSize: 12, fontWeight: '600' },
  resourceRow: { flexDirection: 'row', gap: 6 },
  resItem: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#1A2332', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, borderWidth: 1 },
  resIcon: { fontSize: 10, fontWeight: '700' },
  resVal: { color: '#FFF', fontSize: 12, fontWeight: '600' },
});
