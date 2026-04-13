import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { TERRAIN_ICONS } from '../constants/game';
import { TERRAIN_NAMES } from '../constants/terrain';
import { COLORS, SPACING, RADIUS, SHADOW } from '../constants/theme';
import { cellKey } from '../engine/voronoiGrid';

export const TileInfoPanel: React.FC = () => {
  const selectedCell = useGameStore(s => s.selectedCell);
  const selectCell = useGameStore(s => s.selectCell);
  const cellTiles = useGameStore(s => s.cellTiles);
  const stateMap = useGameStore(s => s.stateMap);

  if (selectedCell === null || selectedCell < 0 || selectedCell >= cellTiles.length) return null;

  const tile = cellTiles[selectedCell];
  if (!tile) return null;

  // If this cell belongs to a state, StateDetailPanel will show instead
  const hasState = stateMap.get(cellKey(selectedCell)) !== undefined;
  if (hasState) return null;

  return (
    <View style={styles.container}>
      <View style={styles.panel}>
        <View style={styles.header}>
          <Text style={styles.icon}>{TERRAIN_ICONS[tile.terrain]}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{tile.biomeName || TERRAIN_NAMES[tile.terrain]}</Text>
            {tile.regionName ? <Text style={styles.subtitle}>{tile.regionName}</Text> : null}
          </View>
          <TouchableOpacity onPress={() => selectCell(null)} style={styles.closeBtn}>
            <Text style={styles.closeTxt}>✕</Text>
          </TouchableOpacity>
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
  container: { position: 'absolute', bottom: 100, left: SPACING.sm, right: SPACING.sm, pointerEvents: 'box-none' },
  panel: { backgroundColor: COLORS.surfaceOverlay, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.panel },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surfaceLight, justifyContent: 'center', alignItems: 'center' },
  closeTxt: { color: '#8aa0b8', fontSize: 14, fontWeight: '700' },
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
