import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { TechId } from '../types/game';
import { COLORS } from '../constants/theme';
import {
  VICTORY_CONDITIONS, VictoryType,
  ECONOMIC_GOLD_THRESHOLD, ECONOMIC_TERRITORY_THRESHOLD,
  DOMINATION_TERRITORY_PERCENT,
} from '../constants/victory';

interface Props {
  expanded: boolean;
  onToggle: () => void;
}

export default function VictoryProgress({ expanded, onToggle }: Props) {
  const currentPlayerId = useGameStore(s => s.currentPlayerId);
  const players = useGameStore(s => s.players);
  const map = useGameStore(s => s.map);

  const player = players.find(p => p.id === currentPlayerId);
  if (!player) return null;

  const totalHexes = map.size;
  const allTechCount = Object.values(TechId).length;

  const progresses = [
    {
      ...VICTORY_CONDITIONS[VictoryType.Military],
      current: players.filter(p => p.castleCoord === null && p.id !== player.id).length,
      target: players.filter(p => p.id !== player.id).length,
      label: 'Kaleler yikildi',
    },
    {
      ...VICTORY_CONDITIONS[VictoryType.Economic],
      current: Math.min(player.resources.gold, ECONOMIC_GOLD_THRESHOLD),
      target: ECONOMIC_GOLD_THRESHOLD,
      label: `${player.resources.gold}/${ECONOMIC_GOLD_THRESHOLD} altin, ${player.territory.length}/${ECONOMIC_TERRITORY_THRESHOLD} toprak`,
    },
    {
      ...VICTORY_CONDITIONS[VictoryType.Technology],
      current: player.researchedTechs.length,
      target: allTechCount,
      label: `${player.researchedTechs.length}/${allTechCount} tech`,
    },
    {
      ...VICTORY_CONDITIONS[VictoryType.Domination],
      current: player.territory.length,
      target: Math.ceil(totalHexes * DOMINATION_TERRITORY_PERCENT),
      label: `${player.territory.length}/${Math.ceil(totalHexes * DOMINATION_TERRITORY_PERCENT)} hex`,
    },
  ];

  // En yakin zafer
  const best = progresses.reduce((a, b) =>
    (a.current / a.target) > (b.current / b.target) ? a : b
  );

  if (!expanded) {
    const pct = Math.min(100, Math.round((best.current / best.target) * 100));
    return (
      <TouchableOpacity style={styles.collapsed} onPress={onToggle}>
        <Text style={styles.collapsedIcon}>{best.icon}</Text>
        <View style={styles.miniBar}>
          <View style={[styles.miniFill, { width: `${pct}%`, backgroundColor: best.color }]} />
        </View>
        <Text style={[styles.collapsedPct, { color: best.color }]}>{pct}%</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onToggle} style={styles.headerRow}>
        <Text style={styles.headerText}>Zafer Ilerleme</Text>
        <Text style={styles.collapseText}>Kucult</Text>
      </TouchableOpacity>
      {progresses.map(p => {
        const pct = Math.min(100, Math.round((p.current / p.target) * 100));
        return (
          <View key={p.type} style={styles.row}>
            <Text style={styles.rowIcon}>{p.icon}</Text>
            <View style={styles.rowInfo}>
              <Text style={styles.rowName}>{p.name}</Text>
              <View style={styles.bar}>
                <View style={[styles.fill, { width: `${pct}%`, backgroundColor: p.color }]} />
              </View>
              <Text style={styles.rowLabel}>{p.label}</Text>
            </View>
            <Text style={[styles.rowPct, { color: p.color }]}>{pct}%</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  collapsed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  collapsedIcon: { fontSize: 14 },
  miniBar: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
  },
  miniFill: { height: 4, borderRadius: 2 },
  collapsedPct: { fontSize: 10, fontWeight: '700', width: 30, textAlign: 'right' },

  container: {
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  collapseText: { color: COLORS.textMuted, fontSize: 10 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  rowIcon: { fontSize: 16 },
  rowInfo: { flex: 1 },
  rowName: { color: COLORS.textPrimary, fontSize: 11, fontWeight: '600', marginBottom: 3 },
  bar: { height: 4, backgroundColor: COLORS.border, borderRadius: 2 },
  fill: { height: 4, borderRadius: 2 },
  rowLabel: { color: COLORS.textMuted, fontSize: 9, marginTop: 2 },
  rowPct: { fontSize: 11, fontWeight: '700', width: 32, textAlign: 'right' },
});
