import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { cellKey } from '../engine/voronoiGrid';

type Tab = 'burgs' | 'states';

export const ListPanel: React.FC = () => {
  const showList = useGameStore(s => s.showList);
  const toggleLayer = useGameStore(s => s.toggleLayer);
  const burgs = useGameStore(s => s.burgs);
  const states = useGameStore(s => s.states);
  const voronoiGraph = useGameStore(s => s.voronoiGraph);
  const mapWidth = useGameStore(s => s.mapWidth);
  const mapHeight = useGameStore(s => s.mapHeight);
  const setCameraPos = useGameStore(s => s.setCameraPos);
  const selectCell = useGameStore(s => s.selectCell);

  const [tab, setTab] = useState<Tab>('burgs');
  const [search, setSearch] = useState('');

  const sortedBurgs = useMemo(() => {
    if (!showList) return [];
    const filtered = search
      ? burgs.filter(b => b.name.toLowerCase().includes(search.toLowerCase()))
      : burgs;
    return [...filtered].sort((a, b) => b.population - a.population);
  }, [showList, burgs, search]);

  const sortedStates = useMemo(() => {
    if (!showList) return [];
    const filtered = search
      ? states.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
      : states;
    return [...filtered].sort((a, b) => b.cells.length - a.cells.length);
  }, [showList, states, search]);

  const stateCenter = useMemo(() => {
    if (!showList || !voronoiGraph) return new Map<number, { x: number; y: number; cellIndex: number }>();
    const map = new Map<number, { x: number; y: number; cellIndex: number }>();
    for (const state of states) {
      if (state.cells.length === 0) continue;
      let sx = 0;
      let sy = 0;
      let count = 0;
      for (const ci of state.cells) {
        const cell = voronoiGraph.cells[ci];
        if (cell) {
          sx += cell.center.x;
          sy += cell.center.y;
          count++;
        }
      }
      if (count > 0) {
        map.set(state.id, { x: sx / count, y: sy / count, cellIndex: state.cells[0] });
      }
    }
    return map;
  }, [showList, states, voronoiGraph]);

  if (!showList) return null;

  const dismiss = () => toggleLayer('showList');

  const goToBurg = (b: typeof burgs[0]) => {
    if (!voronoiGraph) return;
    const cell = voronoiGraph.cells[b.cellIndex];
    if (cell) {
      setCameraPos(-(cell.center.x - mapWidth / 2), -(cell.center.y - mapHeight / 2));
      selectCell(b.cellIndex);
    }
  };

  const goToState = (s: typeof states[0]) => {
    const center = stateCenter.get(s.id);
    if (center) {
      setCameraPos(-(center.x - mapWidth / 2), -(center.y - mapHeight / 2));
      selectCell(center.cellIndex);
    }
  };

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={dismiss} />
      <View style={styles.modal}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Liste</Text>
          <TouchableOpacity onPress={dismiss}>
            <Text style={styles.closeBtn}>{'\u2715'}</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <TextInput
          style={styles.searchInput}
          placeholder="Ara..."
          placeholderTextColor="#607080"
          value={search}
          onChangeText={setSearch}
        />

        {/* Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, tab === 'burgs' && styles.tabActive]}
            onPress={() => setTab('burgs')}
          >
            <Text style={[styles.tabText, tab === 'burgs' && styles.tabTextActive]}>Sehirler</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'states' && styles.tabActive]}
            onPress={() => setTab('states')}
          >
            <Text style={[styles.tabText, tab === 'states' && styles.tabTextActive]}>Devletler</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollArea}>
          {tab === 'burgs' && sortedBurgs.map(b => (
            <View key={b.id} style={styles.row}>
              <View style={styles.rowInfo}>
                <Text style={styles.rowName}>{b.name}</Text>
                <View style={styles.badgeRow}>
                  <Text style={styles.rowSub}>{formatPop(b.population)}</Text>
                  {b.isCapital && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Baskent</Text>
                    </View>
                  )}
                  {b.port && (
                    <View style={[styles.badge, styles.portBadge]}>
                      <Text style={styles.badgeText}>Liman</Text>
                    </View>
                  )}
                </View>
              </View>
              <TouchableOpacity style={styles.goBtn} onPress={() => goToBurg(b)}>
                <Text style={styles.goBtnText}>Git</Text>
              </TouchableOpacity>
            </View>
          ))}

          {tab === 'states' && sortedStates.map(s => (
            <View key={s.id} style={styles.row}>
              <View style={styles.rowInfo}>
                <View style={styles.stateNameRow}>
                  <View style={[styles.colorDot, { backgroundColor: s.color }]} />
                  <Text style={styles.rowName}>{s.name}</Text>
                </View>
                <View style={styles.badgeRow}>
                  <Text style={styles.rowSub}>{s.formName}</Text>
                  <Text style={styles.rowSub}>{s.cells.length} hucre</Text>
                  <Text style={styles.rowSub}>{s.burgIds.length} sehir</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.goBtn} onPress={() => goToState(s)}>
                <Text style={styles.goBtnText}>Git</Text>
              </TouchableOpacity>
            </View>
          ))}

          {tab === 'burgs' && sortedBurgs.length === 0 && (
            <Text style={styles.emptyText}>Sonuc bulunamadi</Text>
          )}
          {tab === 'states' && sortedStates.length === 0 && (
            <Text style={styles.emptyText}>Sonuc bulunamadi</Text>
          )}
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
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#2A3A4A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { color: '#FFD700', fontSize: 18, fontWeight: '800' },
  closeBtn: { color: '#8aa0b8', fontSize: 18, fontWeight: '700', paddingHorizontal: 8 },
  searchInput: {
    backgroundColor: '#111C2A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A3A4A',
    color: '#FFF',
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    backgroundColor: '#111C2A',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A3A4A',
  },
  tabActive: {
    backgroundColor: 'rgba(74,144,217,0.25)',
    borderColor: '#4A90D9',
  },
  tabText: { color: '#607080', fontSize: 12, fontWeight: '700' },
  tabTextActive: { color: '#6AADE6' },
  scrollArea: { flexGrow: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111C2A',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 4,
  },
  rowInfo: { flex: 1, gap: 2 },
  rowName: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  rowSub: { color: '#8aa0b8', fontSize: 10, fontWeight: '500' },
  stateNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  colorDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: '#FFF4' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  badge: {
    backgroundColor: '#FFD70033',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  portBadge: { backgroundColor: '#4A90D933' },
  badgeText: { color: '#FFD700', fontSize: 9, fontWeight: '700' },
  goBtn: {
    backgroundColor: '#2A4A6A',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  goBtnText: { color: '#8ac4ff', fontSize: 11, fontWeight: '700' },
  emptyText: { color: '#607080', fontSize: 12, textAlign: 'center', marginTop: 20 },
});
