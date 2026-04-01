import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { MapRenderer } from '../components/MapRenderer';
import { GestureHandler } from '../components/GestureHandler';
import { HUD } from '../components/HUD';
import { TileInfoPanel } from '../components/TileInfoPanel';
import { useGameStore } from '../store/gameStore';
import { COLORS } from '../constants/theme';
import { GamePhase } from '../types/game';

export const GameScreen: React.FC = () => {
  const game = useGameStore(s => s.game);
  const voronoiGraph = useGameStore(s => s.voronoiGraph);
  const cellTiles = useGameStore(s => s.cellTiles);
  const rivers = useGameStore(s => s.rivers);
  const coastPaths = useGameStore(s => s.coastPaths);
  const burgs = useGameStore(s => s.burgs);
  const routes = useGameStore(s => s.routes);
  const markers = useGameStore(s => s.markers);
  const states = useGameStore(s => s.states);
  const stateMap = useGameStore(s => s.stateMap);
  const oceanDepthMap = useGameStore(s => s.oceanDepthMap);
  const iceCells = useGameStore(s => s.iceCells);
  const mapWidth = useGameStore(s => s.mapWidth);
  const mapHeight = useGameStore(s => s.mapHeight);
  const cameraX = useGameStore(s => s.cameraX);
  const cameraY = useGameStore(s => s.cameraY);
  const cameraZoom = useGameStore(s => s.cameraZoom);
  const selectedCell = useGameStore(s => s.selectedCell);
  const setScreen = useGameStore(s => s.setScreen);
  const showBiomes = useGameStore(s => s.showBiomes);
  const showRivers = useGameStore(s => s.showRivers);
  const showBorders = useGameStore(s => s.showBorders);
  const showRoutes = useGameStore(s => s.showRoutes);
  const showBurgs = useGameStore(s => s.showBurgs);
  const showMarkers = useGameStore(s => s.showMarkers);
  const showGrid = useGameStore(s => s.showGrid);
  const toggleLayer = useGameStore(s => s.toggleLayer);

  if (!game) return null;

  if (game.phase === GamePhase.GameOver) {
    return (
      <View style={styles.gameOverContainer}>
        <Text style={styles.gameOverTitle}>OYUN BITTI</Text>
        <Text style={styles.menuLink} onPress={() => setScreen('menu')}>Ana Menuye Don</Text>
      </View>
    );
  }

  const players = game.players.map(p => ({ id: p.id, color: p.color }));

  return (
    <View style={styles.container}>
      <GestureHandler>
        <MapRenderer
          graph={voronoiGraph}
          cellTiles={cellTiles}
          rivers={rivers}
          coastPaths={coastPaths}
          burgs={burgs}
          routes={routes}
          markers={markers}
          states={states}
          stateMap={stateMap}
          oceanDepthMap={oceanDepthMap}
          iceCells={iceCells}
          mapWidth={mapWidth}
          mapHeight={mapHeight}
          cameraX={cameraX}
          cameraY={cameraY}
          zoom={cameraZoom}
          selectedCell={selectedCell}
          players={players}
          showBiomes={showBiomes}
          showRivers={showRivers}
          showBorders={showBorders}
          showRoutes={showRoutes}
          showBurgs={showBurgs}
          showMarkers={showMarkers}
          showGrid={showGrid}
        />
      </GestureHandler>

      {/* Layer toggles */}
      <View style={styles.layerPanel}>
        <LBtn label="Biome" active={showBiomes} onPress={() => toggleLayer('showBiomes')} />
        <LBtn label="Nehir" active={showRivers} onPress={() => toggleLayer('showRivers')} />
        <LBtn label="Sinir" active={showBorders} onPress={() => toggleLayer('showBorders')} />
        <LBtn label="Yol" active={showRoutes} onPress={() => toggleLayer('showRoutes')} />
        <LBtn label="Sehir" active={showBurgs} onPress={() => toggleLayer('showBurgs')} />
        <LBtn label="POI" active={showMarkers} onPress={() => toggleLayer('showMarkers')} />
        <LBtn label="Grid" active={showGrid} onPress={() => toggleLayer('showGrid')} />
      </View>

      <HUD />
      <TileInfoPanel />
    </View>
  );
};

const LBtn: React.FC<{ label: string; active: boolean; onPress: () => void }> = ({ label, active, onPress }) => (
  <TouchableOpacity style={[styles.layerBtn, active && styles.layerBtnActive]} onPress={onPress}>
    <Text style={[styles.layerText, active && styles.layerTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A1628' },
  gameOverContainer: { flex: 1, backgroundColor: '#0A1628', justifyContent: 'center', alignItems: 'center' },
  gameOverTitle: { color: '#FFD700', fontSize: 36, fontWeight: '900', marginBottom: 20 },
  menuLink: { color: '#4A90D9', fontSize: 18, fontWeight: '700' },
  layerPanel: { position: 'absolute', top: 110, right: 8, gap: 4 },
  layerBtn: { backgroundColor: 'rgba(26,35,50,0.9)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: '#2A3A4A' },
  layerBtnActive: { backgroundColor: 'rgba(74,144,217,0.2)', borderColor: '#4A90D9' },
  layerText: { color: '#607080', fontSize: 10, fontWeight: '600' },
  layerTextActive: { color: '#6AADE6' },
});
