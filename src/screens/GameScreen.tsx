import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { MapRenderer } from '../components/MapRenderer';
import { GestureHandler } from '../components/GestureHandler';
import { HUD } from '../components/HUD';
import { TileInfoPanel } from '../components/TileInfoPanel';
import { StateDetailPanel } from '../components/StateDetailPanel';
import { MapStatsPanel } from '../components/MapStatsPanel';
import { ListPanel } from '../components/ListPanel';
import { EditorPanel } from '../components/EditorPanel';
import { ExportButton } from '../components/ExportButton';
import { Minimap } from '../components/Minimap';
import { LegendPanel } from '../components/LegendPanel';
import { useGameStore } from '../store/gameStore';
import { GamePhase } from '../types/game';

export const GameScreen: React.FC = () => {
  const game = useGameStore(s => s.game);
  const voronoiGraph = useGameStore(s => s.voronoiGraph);
  const cellTiles = useGameStore(s => s.cellTiles);
  const rivers = useGameStore(s => s.rivers);
  const burgs = useGameStore(s => s.burgs);
  const routes = useGameStore(s => s.routes);
  const states = useGameStore(s => s.states);
  const stateMap = useGameStore(s => s.stateMap);
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
  const showPopulation = useGameStore(s => s.showPopulation);
  const showGrid = useGameStore(s => s.showGrid);
  const showStats = useGameStore(s => s.showStats);
  const showRelief = useGameStore(s => s.showRelief);
  const showEmblems = useGameStore(s => s.showEmblems);
  const showIce = useGameStore(s => s.showIce);
  const showWind = useGameStore(s => s.showWind);
  const showElevation = useGameStore(s => s.showElevation);
  const showTemperature = useGameStore(s => s.showTemperature);
  const showMoisture = useGameStore(s => s.showMoisture);
  const showCultures = useGameStore(s => s.showCultures);
  const showReligion = useGameStore(s => s.showReligion);
  const showList = useGameStore(s => s.showList);
  const showLegend = useGameStore(s => s.showLegend);
  const cultures = useGameStore(s => s.cultures);
  const cultureMap = useGameStore(s => s.cultureMap);
  const religions = useGameStore(s => s.religions);
  const religionMap = useGameStore(s => s.religionMap);
  const toggleLayer = useGameStore(s => s.toggleLayer);
  const isGenerating = useGameStore(s => s.isGenerating);

  if (!game) return null;

  if (game.phase === GamePhase.GameOver) {
    return (
      <View style={styles.go}>
        <Text style={styles.goTitle}>OYUN BITTI</Text>
        <Text style={styles.goLink} onPress={() => setScreen('menu')}>Ana Menuye Don</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GestureHandler>
        <MapRenderer
          graph={voronoiGraph}
          cellTiles={cellTiles}
          rivers={rivers}
          burgs={burgs}
          routes={routes}
          states={states}
          stateMap={stateMap}
          mapWidth={mapWidth}
          mapHeight={mapHeight}
          cameraX={cameraX}
          cameraY={cameraY}
          zoom={cameraZoom}
          selectedCell={selectedCell}
          showBiomes={showBiomes}
          showRivers={showRivers}
          showBorders={showBorders}
          showRoutes={showRoutes}
          showBurgs={showBurgs}
          showPopulation={showPopulation}
          showGrid={showGrid}
          showRelief={showRelief}
          showEmblems={showEmblems}
          showIce={showIce}
          showWind={showWind}
          showElevation={showElevation}
          showTemperature={showTemperature}
          showMoisture={showMoisture}
          showCultures={showCultures}
          cultures={cultures}
          cultureMap={cultureMap}
          showReligion={showReligion}
          religions={religions}
          religionMap={religionMap}
        />
      </GestureHandler>

      <ScrollView style={styles.lp} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>
        <LB label="Biome" on={showBiomes} p={() => toggleLayer('showBiomes')} />
        <LB label="Nehir" on={showRivers} p={() => toggleLayer('showRivers')} />
        <LB label="Devlet" on={showBorders} p={() => toggleLayer('showBorders')} />
        <LB label="Yol" on={showRoutes} p={() => toggleLayer('showRoutes')} />
        <LB label="Sehir" on={showBurgs} p={() => toggleLayer('showBurgs')} />
        <LB label="Nufus" on={showPopulation} p={() => toggleLayer('showPopulation')} />
        <LB label="Grid" on={showGrid} p={() => toggleLayer('showGrid')} />
        <LB label="Arazi" on={showRelief} p={() => toggleLayer('showRelief')} />
        <LB label="Arma" on={showEmblems} p={() => toggleLayer('showEmblems')} />
        <LB label="Buz" on={showIce} p={() => toggleLayer('showIce')} />
        <LB label="Ruzgar" on={showWind} p={() => toggleLayer('showWind')} />
        <LB label="Yukseklik" on={showElevation} p={() => toggleLayer('showElevation')} />
        <LB label="Sicaklik" on={showTemperature} p={() => toggleLayer('showTemperature')} />
        <LB label="Nem" on={showMoisture} p={() => toggleLayer('showMoisture')} />
        <LB label="Kultur" on={showCultures} p={() => toggleLayer('showCultures')} />
        <LB label="Din" on={showReligion} p={() => toggleLayer('showReligion')} />
        <LB label="Istatistik" on={showStats} p={() => toggleLayer('showStats')} />
        <LB label="Liste" on={showList} p={() => toggleLayer('showList')} />
        <LB label="Lejand" on={showLegend} p={() => toggleLayer('showLegend')} />
        <ExportButton />
      </ScrollView>

      <HUD />
      <Minimap />
      <TileInfoPanel />
      <StateDetailPanel />
      <MapStatsPanel />
      <ListPanel />
      <LegendPanel />
      <EditorPanel />

      {isGenerating && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Harita Olusturuluyor...</Text>
        </View>
      )}
    </View>
  );
};

const LB: React.FC<{ label: string; on: boolean; p: () => void }> = ({ label, on, p }) => (
  <TouchableOpacity style={[styles.lb, on && styles.lba]} onPress={p}>
    <Text style={[styles.lt, on && styles.lta]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#083D5D' },
  go: { flex: 1, backgroundColor: '#0A1628', justifyContent: 'center', alignItems: 'center' },
  goTitle: { color: '#FFD700', fontSize: 36, fontWeight: '900', marginBottom: 20 },
  goLink: { color: '#4A90D9', fontSize: 18, fontWeight: '700' },
  lp: { position: 'absolute', top: 60, right: 8, maxHeight: '80%' },
  lb: { backgroundColor: 'rgba(15,25,35,0.85)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#2A3A4A' },
  lba: { backgroundColor: 'rgba(74,144,217,0.25)', borderColor: '#4A90D9' },
  lt: { color: '#607080', fontSize: 11, fontWeight: '600' },
  lta: { color: '#6AADE6' },
  loadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center',
  },
  loadingText: {
    color: '#FFD700', fontSize: 18, fontWeight: '700', marginTop: 16,
  },
});
