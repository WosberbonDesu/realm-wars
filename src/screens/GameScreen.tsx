import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView } from 'react-native';
import { MapRenderer } from '../components/MapRenderer';
import { GestureHandler } from '../components/GestureHandler';
import { HUD } from '../components/HUD';
import { TileInfoPanel } from '../components/TileInfoPanel';
import { BuildMenu } from '../components/BuildMenu';
import { BattleDialog } from '../components/BattleDialog';
import { useGameStore } from '../store/gameStore';
import { COLORS } from '../constants/theme';
import { GamePhase } from '../types/game';

export const GameScreen: React.FC = () => {
  const game = useGameStore(s => s.game);
  const rivers = useGameStore(s => s.rivers);
  const burgs = useGameStore(s => s.burgs);
  const routes = useGameStore(s => s.routes);
  const markers = useGameStore(s => s.markers);
  const states = useGameStore(s => s.states);
  const stateMap = useGameStore(s => s.stateMap);
  const oceanDepthMap = useGameStore(s => s.oceanDepthMap);
  const iceCells = useGameStore(s => s.iceCells);
  const cameraX = useGameStore(s => s.cameraX);
  const cameraY = useGameStore(s => s.cameraY);
  const cameraZoom = useGameStore(s => s.cameraZoom);
  const selectedHex = useGameStore(s => s.selectedHex);
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

  // Game over
  if (game.phase === GamePhase.GameOver) {
    const winner = game.players.find(p => p.territory.length > 0);
    return (
      <View style={styles.gameOverContainer}>
        <Text style={styles.gameOverTitle}>OYUN BITTI</Text>
        <Text style={styles.gameOverWinner}>
          {winner ? (winner.isBot ? `${winner.name} kazandi!` : 'ZAFER! Kazandiniz!') : 'Berabere'}
        </Text>
        <Text style={styles.gameOverStats}>Tur: {game.turn} | Seed: {game.seed}</Text>
        <Text style={styles.menuLink} onPress={() => setScreen('menu')}>Ana Menuye Don</Text>
      </View>
    );
  }

  const players = game.players.map(p => ({ id: p.id, color: p.color }));

  return (
    <View style={styles.container}>
      <GestureHandler>
        <MapRenderer
          tiles={game.map}
          rivers={rivers}
          burgs={burgs}
          routes={routes}
          markers={markers}
          states={states}
          stateMap={stateMap}
          oceanDepthMap={oceanDepthMap}
          iceCells={iceCells}
          cameraX={cameraX}
          cameraY={cameraY}
          zoom={cameraZoom}
          selectedHex={selectedHex}
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

      {/* Layer toggle panel */}
      <View style={styles.layerPanel}>
        <LayerToggle label="Biome" active={showBiomes} onPress={() => toggleLayer('showBiomes')} />
        <LayerToggle label="Nehir" active={showRivers} onPress={() => toggleLayer('showRivers')} />
        <LayerToggle label="Sinir" active={showBorders} onPress={() => toggleLayer('showBorders')} />
        <LayerToggle label="Yol" active={showRoutes} onPress={() => toggleLayer('showRoutes')} />
        <LayerToggle label="Sehir" active={showBurgs} onPress={() => toggleLayer('showBurgs')} />
        <LayerToggle label="POI" active={showMarkers} onPress={() => toggleLayer('showMarkers')} />
        <LayerToggle label="Grid" active={showGrid} onPress={() => toggleLayer('showGrid')} />
      </View>

      <HUD />
      <TileInfoPanel />
      <BuildMenu />
      <BattleDialog />
    </View>
  );
};

const LayerToggle: React.FC<{ label: string; active: boolean; onPress: () => void }> = ({
  label, active, onPress,
}) => (
  <TouchableOpacity
    style={[styles.layerBtn, active && styles.layerBtnActive]}
    onPress={onPress}
  >
    <Text style={[styles.layerText, active && styles.layerTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  gameOverContainer: {
    flex: 1, backgroundColor: COLORS.bg,
    justifyContent: 'center', alignItems: 'center', padding: 40,
  },
  gameOverTitle: { color: COLORS.gold, fontSize: 36, fontWeight: '900', letterSpacing: 3, marginBottom: 16 },
  gameOverWinner: { color: COLORS.textPrimary, fontSize: 22, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  gameOverStats: { color: COLORS.textMuted, fontSize: 14, marginBottom: 30 },
  menuLink: { color: COLORS.primary, fontSize: 18, fontWeight: '700', textDecorationLine: 'underline' },
  layerPanel: {
    position: 'absolute',
    top: 110, right: 8,
    flexDirection: 'column',
    gap: 4,
  },
  layerBtn: {
    backgroundColor: COLORS.bgPanel,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  layerBtnActive: {
    backgroundColor: COLORS.primary + '33',
    borderColor: COLORS.primary,
  },
  layerText: { color: COLORS.textMuted, fontSize: 10, fontWeight: '600' },
  layerTextActive: { color: COLORS.primaryLight },
});
