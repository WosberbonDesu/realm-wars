import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { cellKey } from '../engine/voronoiGrid';

export const MapStatsPanel: React.FC = () => {
  const showStats = useGameStore(s => s.showStats);
  const toggleLayer = useGameStore(s => s.toggleLayer);
  const cellTiles = useGameStore(s => s.cellTiles);
  const states = useGameStore(s => s.states);
  const burgs = useGameStore(s => s.burgs);
  const rivers = useGameStore(s => s.rivers);
  const cultures = useGameStore(s => s.cultures);
  const voronoiGraph = useGameStore(s => s.voronoiGraph);

  const stats = useMemo(() => {
    if (!showStats) return null;

    const totalCells = cellTiles.length;
    const landCells = cellTiles.filter(t => t.elevation >= 0.2);
    const waterCells = totalCells - landCells.length;
    const landPercent = totalCells > 0 ? ((landCells.length / totalCells) * 100).toFixed(1) : '0';

    // Largest state
    let largestState = states.length > 0
      ? states.reduce((a, b) => (b.cells.length > a.cells.length ? b : a), states[0])
      : null;

    // Most populated city
    let mostPopulatedBurg = burgs.length > 0
      ? burgs.reduce((a, b) => (b.population > a.population ? b : a), burgs[0])
      : null;

    // Longest river
    let longestRiver = rivers.length > 0
      ? rivers.reduce((a, b) => (b.path.length > a.path.length ? b : a), rivers[0])
      : null;

    // Highest point
    let highestElev = 0;
    let highestCell = -1;
    for (let i = 0; i < cellTiles.length; i++) {
      if (cellTiles[i].elevation > highestElev) {
        highestElev = cellTiles[i].elevation;
        highestCell = i;
      }
    }

    // Average temperature & moisture (land cells only)
    let avgTemp = 0;
    let avgMoisture = 0;
    if (landCells.length > 0) {
      let tempSum = 0;
      let moistSum = 0;
      for (const t of landCells) {
        tempSum += t.temperature;
        moistSum += t.moisture;
      }
      avgTemp = (tempSum / landCells.length) * 40;
      avgMoisture = (moistSum / landCells.length) * 100;
    }

    // Coastal cells
    const coastalCells = cellTiles.filter(t => t.isCoast).length;

    // Number of islands via BFS on land cells
    const landSet = new Set<number>();
    for (let i = 0; i < cellTiles.length; i++) {
      if (cellTiles[i].elevation >= 0.2) landSet.add(i);
    }

    let islandCount = 0;
    const visited = new Set<number>();
    const graph = voronoiGraph;

    for (const cellIdx of landSet) {
      if (visited.has(cellIdx)) continue;
      islandCount++;
      const queue = [cellIdx];
      visited.add(cellIdx);
      while (queue.length > 0) {
        const curr = queue.shift()!;
        // Get neighbors from voronoi graph
        const neighbors = graph?.cells?.[curr]?.neighbors ?? [];
        for (const n of neighbors) {
          if (landSet.has(n) && !visited.has(n)) {
            visited.add(n);
            queue.push(n);
          }
        }
      }
    }

    return {
      totalCells,
      landCount: landCells.length,
      waterCells,
      landPercent,
      stateCount: states.length,
      burgCount: burgs.length,
      riverCount: rivers.length,
      cultureCount: cultures.length,
      largestState,
      mostPopulatedBurg,
      longestRiver,
      highestElev: (highestElev * 100).toFixed(0),
      avgTemp: avgTemp.toFixed(1),
      avgMoisture: avgMoisture.toFixed(0),
      coastalCells,
      islandCount,
    };
  }, [showStats, cellTiles, states, burgs, rivers, cultures, voronoiGraph]);

  if (!showStats || !stats) return null;

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => toggleLayer('showStats')} />
      <View style={styles.modal}>
        <View style={styles.header}>
          <Text style={styles.title}>Dunya Istatistikleri</Text>
          <TouchableOpacity onPress={() => toggleLayer('showStats')}>
            <Text style={styles.closeBtn}>X</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Geography */}
          <Text style={styles.sectionTitle}>Cografya</Text>
          <View style={styles.grid}>
            <StatRow label="Toplam Hucre" value={String(stats.totalCells)} />
            <StatRow label="Kara Hucre" value={String(stats.landCount)} color="#8BC34A" />
            <StatRow label="Su Hucre" value={String(stats.waterCells)} color="#4A90D9" />
            <StatRow label="Kara Orani" value={`%${stats.landPercent}`} />
            <StatRow label="Kiyisal Hucre" value={String(stats.coastalCells)} color="#5AC8FA" />
            <StatRow label="Ada Sayisi" value={String(stats.islandCount)} />
            <StatRow label="En Yuksek Nokta" value={`${stats.highestElev}m`} color="#E8A838" />
            <StatRow label="Ort. Sicaklik" value={`${stats.avgTemp}C`} />
            <StatRow label="Ort. Nem" value={`%${stats.avgMoisture}`} />
          </View>

          {/* Political */}
          <Text style={styles.sectionTitle}>Siyasi</Text>
          <View style={styles.grid}>
            <StatRow label="Devlet Sayisi" value={String(stats.stateCount)} color="#D94A4A" />
            <StatRow label="Sehir Sayisi" value={String(stats.burgCount)} color="#FFD700" />
            <StatRow label="Nehir Sayisi" value={String(stats.riverCount)} color="#3A7BD5" />
            <StatRow label="Kultur Sayisi" value={String(stats.cultureCount)} color="#C080E0" />
          </View>

          {/* Records */}
          <Text style={styles.sectionTitle}>Rekorlar</Text>
          <View style={styles.grid}>
            {stats.largestState && (
              <StatRow
                label="En Buyuk Devlet"
                value={`${stats.largestState.name} (${stats.largestState.cells.length})`}
                color={stats.largestState.color}
              />
            )}
            {stats.mostPopulatedBurg && (
              <StatRow
                label="En Kalabalik Sehir"
                value={`${stats.mostPopulatedBurg.name} (${formatPop(stats.mostPopulatedBurg.population)})`}
                color="#FFD700"
              />
            )}
            {stats.longestRiver && (
              <StatRow
                label="En Uzun Nehir"
                value={`${stats.longestRiver.name} (${stats.longestRiver.path.length})`}
                color="#3A7BD5"
              />
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

function formatPop(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

const StatRow: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <View style={styles.statRow}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modal: {
    backgroundColor: 'rgba(10,18,30,0.95)',
    borderRadius: 20,
    padding: 20,
    width: '85%',
    maxWidth: 420,
    maxHeight: '75%',
    borderWidth: 1,
    borderColor: '#2A3A4A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { color: '#FFD700', fontSize: 18, fontWeight: '800' },
  closeBtn: { color: '#8aa0b8', fontSize: 18, fontWeight: '700', paddingHorizontal: 8 },
  sectionTitle: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3A4A',
    paddingBottom: 4,
  },
  grid: { gap: 2 },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: '#111C2A',
    borderRadius: 6,
  },
  statLabel: { color: '#8aa0b8', fontSize: 11, fontWeight: '500' },
  statValue: { color: '#FFF', fontSize: 12, fontWeight: '700' },
});
