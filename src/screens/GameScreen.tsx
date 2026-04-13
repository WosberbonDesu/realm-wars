import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Animated,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { saveGame } from '../services/saveService';
import {
  COLORS,
  SPACING,
  RADIUS,
  SHADOW,
  FONT,
  isSmallScreen,
  isLargeScreen,
} from '../constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');
const TOOLBAR_H = 52;

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
  const seed = useGameStore(s => s.seed);

  const [showLayers, setShowLayers] = useState(false);
  const [showEditorPanel, setShowEditorPanel] = useState(false);
  const [savingToast, setSavingToast] = useState(false);
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  // Animate the layer bottom sheet
  useEffect(() => {
    Animated.spring(sheetAnim, {
      toValue: showLayers ? 1 : 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [showLayers, sheetAnim]);

  const handleSave = useCallback(async () => {
    try {
      setSavingToast(true);
      const st = useGameStore.getState();
      await saveGame(
        {
          seed: st.seed,
          mapWidth: st.mapWidth,
          mapHeight: st.mapHeight,
          cellTiles: st.cellTiles,
          burgs: st.burgs,
          states: st.states,
          rivers: st.rivers,
          routes: st.routes,
        } as unknown as Record<string, unknown>,
        {
          name: `Harita ${new Date().toLocaleDateString('tr-TR')}`,
          seed: st.seed,
          template: 'default',
          burgCount: st.burgs.length,
          stateCount: st.states.length,
        },
      );
      setTimeout(() => setSavingToast(false), 1500);
    } catch (e) {
      console.error('Save failed:', e);
      setSavingToast(false);
    }
  }, []);

  if (!game) return null;

  if (game.phase === GamePhase.GameOver) {
    return (
      <SafeAreaView style={styles.go} edges={['top', 'bottom']}>
        <Text style={styles.goTitle}>OYUN BITTI</Text>
        <Text style={styles.goLink} onPress={() => setScreen('menu')}>
          Ana Menuye Don
        </Text>
      </SafeAreaView>
    );
  }

  // Layer toggle definitions
  const LAYER_TOGGLES = [
    { key: 'showBiomes', label: 'Biome', on: showBiomes },
    { key: 'showRivers', label: 'Nehir', on: showRivers },
    { key: 'showBorders', label: 'Devlet', on: showBorders },
    { key: 'showRoutes', label: 'Yol', on: showRoutes },
    { key: 'showBurgs', label: 'Sehir', on: showBurgs },
    { key: 'showPopulation', label: 'Nufus', on: showPopulation },
    { key: 'showGrid', label: 'Grid', on: showGrid },
    { key: 'showRelief', label: 'Arazi', on: showRelief },
    { key: 'showEmblems', label: 'Arma', on: showEmblems },
    { key: 'showIce', label: 'Buz', on: showIce },
    { key: 'showWind', label: 'Ruzgar', on: showWind },
    { key: 'showElevation', label: 'Yukseklik', on: showElevation },
    { key: 'showTemperature', label: 'Sicaklik', on: showTemperature },
    { key: 'showMoisture', label: 'Nem', on: showMoisture },
    { key: 'showCultures', label: 'Kultur', on: showCultures },
    { key: 'showReligion', label: 'Din', on: showReligion },
    { key: 'showStats', label: 'Istatistik', on: showStats },
    { key: 'showList', label: 'Liste', on: showList },
    { key: 'showLegend', label: 'Lejand', on: showLegend },
  ];

  const sheetTranslateY = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* === MAP === */}
      <View style={styles.mapArea}>
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

        {/* HUD (top bar overlay) */}
        <HUD />

        {/* Minimap: hide on small screens */}
        {!isSmallScreen && <Minimap />}

        {/* Desktop: keep the right-side layer panel for large screens */}
        {isLargeScreen && (
          <ScrollView
            style={styles.desktopLayerPanel}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: 4 }}
          >
            {LAYER_TOGGLES.map(lt => (
              <LB key={lt.key} label={lt.label} on={lt.on} p={() => toggleLayer(lt.key)} />
            ))}
            <ExportButton />
          </ScrollView>
        )}
      </View>

      {/* === OVERLAY PANELS === */}
      <TileInfoPanel />
      <StateDetailPanel />
      <MapStatsPanel />
      <ListPanel />
      <LegendPanel />

      {/* Editor panel as modal on mobile */}
      {showEditorPanel && (
        <Modal
          visible={showEditorPanel}
          transparent
          animationType="slide"
          onRequestClose={() => setShowEditorPanel(false)}
        >
          <View style={styles.editorModalBackdrop}>
            <View style={styles.editorModalContent}>
              <TouchableOpacity
                style={styles.editorCloseBtn}
                onPress={() => setShowEditorPanel(false)}
              >
                <Text style={styles.editorCloseTxt}>X</Text>
              </TouchableOpacity>
              <EditorPanel />
            </View>
          </View>
        </Modal>
      )}
      {/* On large screens, EditorPanel shows inline */}
      {isLargeScreen && <EditorPanel />}

      {/* === LAYER BOTTOM SHEET (mobile/tablet) === */}
      {!isLargeScreen && showLayers && (
        <TouchableOpacity
          style={styles.sheetBackdrop}
          activeOpacity={1}
          onPress={() => setShowLayers(false)}
        >
          <Animated.View
            style={[
              styles.layerSheet,
              { paddingBottom: insets.bottom + SPACING.sm },
              { transform: [{ translateY: sheetTranslateY }] },
            ]}
          >
            <TouchableOpacity activeOpacity={1}>
              {/* Drag handle */}
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Katmanlar</Text>
              <ScrollView
                style={styles.sheetScroll}
                contentContainerStyle={styles.sheetGrid}
                showsVerticalScrollIndicator={false}
              >
                {LAYER_TOGGLES.map(lt => (
                  <TouchableOpacity
                    key={lt.key}
                    style={[styles.sheetChip, lt.on && styles.sheetChipActive]}
                    onPress={() => toggleLayer(lt.key)}
                  >
                    <Text style={[styles.sheetChipText, lt.on && styles.sheetChipTextActive]}>
                      {lt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {Platform.OS === 'web' && (
                <View style={{ paddingHorizontal: SPACING.md, paddingTop: SPACING.sm }}>
                  <ExportButton />
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      )}

      {/* === BOTTOM TOOLBAR (mobile/tablet) === */}
      {!isLargeScreen && (
        <View style={[styles.toolbar, { paddingBottom: Math.max(insets.bottom, SPACING.xs) }]}>
          <ToolbarBtn
            icon="M"
            label="Katman"
            active={showLayers}
            onPress={() => setShowLayers(prev => !prev)}
          />
          <ToolbarBtn
            icon="E"
            label="Duzenle"
            onPress={() => setShowEditorPanel(prev => !prev)}
          />
          <ToolbarBtn
            icon="I"
            label="Bilgi"
            active={showStats}
            onPress={() => toggleLayer('showStats')}
          />
          <ToolbarBtn
            icon="S"
            label="Kaydet"
            onPress={handleSave}
          />
          <ToolbarBtn
            icon="G"
            label="Menu"
            onPress={() => setScreen('menu')}
          />
        </View>
      )}

      {/* Saving toast */}
      {savingToast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>Kaydedildi!</Text>
        </View>
      )}

      {/* Loading overlay */}
      {isGenerating && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.gold} />
          <Text style={styles.loadingText}>Harita Olusturuluyor...</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

// ===== SUBCOMPONENTS =====

const ToolbarBtn: React.FC<{
  icon: string;
  label: string;
  active?: boolean;
  onPress: () => void;
}> = ({ icon, label, active, onPress }) => {
  const ICON_MAP: Record<string, string> = {
    M: '\uD83D\uDDFA\uFE0F',  // map
    E: '\u270F\uFE0F',         // pencil
    I: '\uD83D\uDCCA',         // chart
    S: '\uD83D\uDCBE',         // floppy
    G: '\u2699\uFE0F',         // gear
  };

  return (
    <TouchableOpacity
      style={[styles.toolbarBtn, active && styles.toolbarBtnActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.toolbarIcon}>{ICON_MAP[icon] || icon}</Text>
      <Text style={[styles.toolbarLabel, active && styles.toolbarLabelActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const LB: React.FC<{ label: string; on: boolean; p: () => void }> = ({ label, on, p }) => (
  <TouchableOpacity style={[styles.lb, on && styles.lba]} onPress={p}>
    <Text style={[styles.lt, on && styles.lta]}>{label}</Text>
  </TouchableOpacity>
);

// ===== STYLES =====

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.mapBg,
  },
  mapArea: {
    flex: 1,
  },

  // Game over
  go: {
    flex: 1,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goTitle: {
    color: COLORS.gold,
    fontSize: 36,
    fontWeight: '900',
    marginBottom: 20,
  },
  goLink: {
    color: COLORS.info,
    fontSize: 18,
    fontWeight: '700',
  },

  // Desktop layer panel (right side, large screens only)
  desktopLayerPanel: {
    position: 'absolute',
    top: 60,
    right: 8,
    maxHeight: '80%',
  },
  lb: {
    backgroundColor: COLORS.surfaceOverlay,
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.borderSolid,
  },
  lba: {
    backgroundColor: 'rgba(212,168,67,0.18)',
    borderColor: COLORS.gold,
  },
  lt: {
    color: COLORS.textMuted,
    ...FONT.caption,
  },
  lta: {
    color: COLORS.goldLight,
  },

  // Bottom Toolbar
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceOverlay,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSolid,
    paddingTop: SPACING.xs,
    minHeight: TOOLBAR_H,
    ...SHADOW.panel,
  },
  toolbarBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    minWidth: 52,
  },
  toolbarBtnActive: {
    backgroundColor: COLORS.goldDim,
  },
  toolbarIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  toolbarLabel: {
    color: COLORS.textMuted,
    ...FONT.small,
  },
  toolbarLabelActive: {
    color: COLORS.gold,
  },

  // Layer Bottom Sheet
  sheetBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  layerSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.md,
    maxHeight: '60%',
    borderTopWidth: 1,
    borderColor: COLORS.borderSolid,
    ...SHADOW.panel,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.textMuted,
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  sheetTitle: {
    color: COLORS.gold,
    ...FONT.h2,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  sheetScroll: {
    maxHeight: 280,
  },
  sheetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    justifyContent: 'center',
    paddingBottom: SPACING.md,
  },
  sheetChip: {
    backgroundColor: COLORS.surfaceMid,
    borderRadius: RADIUS.round,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderSolid,
    minWidth: 70,
    alignItems: 'center',
  },
  sheetChipActive: {
    backgroundColor: COLORS.goldDim,
    borderColor: COLORS.gold,
  },
  sheetChipText: {
    color: COLORS.textMuted,
    ...FONT.caption,
  },
  sheetChipTextActive: {
    color: COLORS.goldLight,
    fontWeight: '700',
  },

  // Editor modal
  editorModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  editorModalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '80%',
    padding: SPACING.md,
    ...SHADOW.panel,
  },
  editorCloseBtn: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  editorCloseTxt: {
    color: COLORS.textMuted,
    fontWeight: '700',
    fontSize: 14,
  },

  // Toast
  toast: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: COLORS.success,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    ...SHADOW.card,
  },
  toastText: {
    color: '#FFF',
    ...FONT.caption,
    fontWeight: '700',
  },

  // Loading overlay
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.gold,
    ...FONT.h2,
    marginTop: SPACING.lg,
  },
});
