import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { cellKey } from '../engine/voronoiGrid';

export const StateDetailPanel: React.FC = () => {
  const selectedCell = useGameStore(s => s.selectedCell);
  const selectCell = useGameStore(s => s.selectCell);
  const cellTiles = useGameStore(s => s.cellTiles);
  const stateMap = useGameStore(s => s.stateMap);
  const states = useGameStore(s => s.states);
  const burgs = useGameStore(s => s.burgs);
  const cultures = useGameStore(s => s.cultures);
  const cultureMap = useGameStore(s => s.cultureMap);

  const data = useMemo(() => {
    if (selectedCell === null || selectedCell < 0 || selectedCell >= cellTiles.length) return null;

    const key = cellKey(selectedCell);
    const stateId = stateMap.get(key);
    if (stateId === undefined) return null;

    const state = states.find(s => s.id === stateId);
    if (!state) return null;

    const stateBurgs = burgs.filter(b => b.stateId === stateId);
    const capitalBurg = burgs.find(b => b.id === state.capitalBurg);
    const totalPopulation = stateBurgs.reduce((sum, b) => sum + b.population, 0);
    const militaryPower = state.cells.length * 100 + stateBurgs.length * 500;

    const neighborStates = state.neighbors
      .map(nid => states.find(s => s.id === nid))
      .filter(Boolean);

    const cultureId = cultureMap.get(key);
    const culture = cultureId !== undefined ? cultures.find(c => c.id === cultureId) : undefined;

    const cellBurg = burgs.find(b => b.cellIndex === selectedCell);

    return { state, stateBurgs, capitalBurg, totalPopulation, militaryPower, neighborStates, culture, cellBurg };
  }, [selectedCell, cellTiles, stateMap, states, burgs, cultures, cultureMap]);

  if (!data) return null;

  const { state, stateBurgs, capitalBurg, totalPopulation, militaryPower, neighborStates, culture, cellBurg } = data;

  return (
    <View style={styles.container}>
      <View style={styles.panel}>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* State Header */}
          <View style={styles.header}>
            <View style={[styles.colorDot, { backgroundColor: state.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.stateName}>{state.name}</Text>
              <Text style={styles.formName}>{state.formName}</Text>
            </View>
            <TouchableOpacity onPress={() => selectCell(null)} style={styles.closeBtn}>
              <Text style={styles.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Core Stats */}
          <View style={styles.statsGrid}>
            <StatBox label="Baskent" value={capitalBurg?.name ?? '—'} />
            <StatBox label="Toprak" value={`${state.cells.length} hucre`} />
            <StatBox label="Sehirler" value={String(stateBurgs.length)} />
            <StatBox label="Nufus" value={formatPopulation(totalPopulation)} />
            <StatBox label="Askeri Guc" value={formatPopulation(militaryPower)} />
          </View>

          {/* Neighbors */}
          {neighborStates.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Komsular</Text>
              <View style={styles.neighborRow}>
                {neighborStates.map((ns: any) => (
                  <View key={ns.id} style={styles.neighborChip}>
                    <View style={[styles.neighborDot, { backgroundColor: ns.color }]} />
                    <Text style={styles.neighborText}>{ns.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Culture */}
          {culture && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Kultur</Text>
              <View style={styles.cultureRow}>
                <View style={[styles.neighborDot, { backgroundColor: culture.color }]} />
                <Text style={styles.cultureText}>{culture.name}</Text>
                <Text style={styles.cultureCells}>{culture.cells.length} hucre</Text>
              </View>
            </View>
          )}

          {/* Burg in selected cell */}
          {cellBurg && (
            <View style={styles.burgSection}>
              <Text style={styles.sectionTitle}>Sehir Detayi</Text>
              <View style={styles.burgRow}>
                <Text style={styles.burgName}>{cellBurg.name}</Text>
                {cellBurg.isCapital && <View style={styles.badge}><Text style={styles.badgeText}>Baskent</Text></View>}
                {cellBurg.port && <View style={[styles.badge, styles.portBadge]}><Text style={styles.badgeText}>Liman</Text></View>}
              </View>
              <View style={styles.burgStats}>
                <StatBox label="Nufus" value={formatPopulation(cellBurg.population)} />
                <StatBox label="Skor" value={String(cellBurg.score)} />
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
};

function formatPopulation(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

const StatBox: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.statBox}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { position: 'absolute', bottom: 0, left: 0, right: 0, pointerEvents: 'box-none' },
  panel: {
    backgroundColor: 'rgba(10,18,30,0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A3A4A',
    borderBottomWidth: 0,
    maxHeight: 360,
  },
  scroll: {},
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  closeBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#2A3A4A', justifyContent: 'center', alignItems: 'center' },
  closeTxt: { color: '#8aa0b8', fontSize: 16, fontWeight: '700' },
  colorDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: '#FFF4' },
  stateName: { color: '#FFD700', fontSize: 18, fontWeight: '800' },
  formName: { color: '#8aa0b8', fontSize: 12, fontWeight: '500' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  statBox: {
    backgroundColor: '#111C2A',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    minWidth: 70,
  },
  statLabel: { color: '#8aa0b8', fontSize: 9, fontWeight: '500' },
  statValue: { color: '#FFF', fontSize: 13, fontWeight: '700', marginTop: 2 },
  section: { marginBottom: 10 },
  sectionTitle: { color: '#FFD700', fontSize: 11, fontWeight: '700', marginBottom: 6 },
  neighborRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  neighborChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#111C2A',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  neighborDot: { width: 8, height: 8, borderRadius: 4 },
  neighborText: { color: '#CCC', fontSize: 11, fontWeight: '500' },
  cultureRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cultureText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  cultureCells: { color: '#8aa0b8', fontSize: 10 },
  burgSection: {
    backgroundColor: '#111C2A',
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
  },
  burgRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  burgName: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  badge: {
    backgroundColor: '#FFD70033',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  portBadge: { backgroundColor: '#4A90D933' },
  badgeText: { color: '#FFD700', fontSize: 9, fontWeight: '700' },
  burgStats: { flexDirection: 'row', gap: 6 },
});
