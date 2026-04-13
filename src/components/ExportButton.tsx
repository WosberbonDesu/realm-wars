import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { renderFullMapToCanvas } from './MapRenderer';
import { COLORS, SPACING, RADIUS, SHADOW, FONT, SHARED } from '../constants/theme';

export const ExportButton: React.FC = () => {
  const [exporting, setExporting] = useState(false);

  const handleExport = () => {
    if (Platform.OS !== 'web' || exporting) return;

    const graph = useGameStore.getState().voronoiGraph;
    const cellTiles = useGameStore.getState().cellTiles;
    const rivers = useGameStore.getState().rivers;
    const burgs = useGameStore.getState().burgs;
    const routes = useGameStore.getState().routes;
    const states = useGameStore.getState().states;
    const stateMap = useGameStore.getState().stateMap;
    const mapWidth = useGameStore.getState().mapWidth;
    const mapHeight = useGameStore.getState().mapHeight;
    const showBiomes = useGameStore.getState().showBiomes;
    const showRivers = useGameStore.getState().showRivers;
    const showBorders = useGameStore.getState().showBorders;
    const showRoutes = useGameStore.getState().showRoutes;
    const showBurgs = useGameStore.getState().showBurgs;
    const showPopulation = useGameStore.getState().showPopulation;

    if (!graph || cellTiles.length === 0) return;

    setExporting(true);

    // Use requestAnimationFrame so the UI updates before heavy render work
    requestAnimationFrame(() => {
      try {
        const offscreen = document.createElement('canvas');
        renderFullMapToCanvas(
          offscreen, graph, cellTiles, rivers, burgs, routes,
          states, stateMap, mapWidth, mapHeight,
          showBiomes, showRivers, showBorders, showRoutes, showBurgs, showPopulation,
        );

        const dataUrl = offscreen.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `realm-wars-map-${Date.now()}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.error('Map export failed:', err);
      } finally {
        setExporting(false);
      }
    });
  };

  if (Platform.OS !== 'web') return null;

  return (
    <TouchableOpacity
      style={[styles.btn, exporting && styles.btnDisabled]}
      onPress={handleExport}
      activeOpacity={0.7}
      disabled={exporting}
    >
      <Text style={styles.txt}>{exporting ? 'Kaydediliyor...' : '\uD83D\uDCE5 Kaydet'}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    backgroundColor: COLORS.surfaceOverlay,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.gold,
    ...SHADOW.button,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  txt: {
    color: COLORS.goldLight,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
