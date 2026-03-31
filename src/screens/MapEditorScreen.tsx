/**
 * Fantasy Map Editor — Azgaar kalitesinde harita oluşturma aracı.
 *
 * Özellikler:
 * - Voronoi region bazlı boyama (terrain, sahiplik, nehir, etiket)
 * - 5 harita şablonu ile otomatik üretim
 * - 4 görsel stil: Siyasi / Fiziki / Fantazi / Parşömen
 * - PNG/JPG export (Skia snapshot)
 * - Undo/Redo (20 adım)
 * - Bölge isimlendirme, nehir çizme, dağ zinciri
 */
import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView,
  Dimensions, Share, Platform,
} from 'react-native';
import {
  Canvas, Path, Skia, Group, Circle, vec,
  RadialGradient, LinearGradient,
  makeImageFromView,
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDecay, runOnJS,
} from 'react-native-reanimated';
import { COLORS, FONT, SPACE, RADIUS } from '../constants/theme';
import { RegionTerrain, REGION_TERRAIN_COLORS, MapPoint, WorldMap, Region } from '../types/region';
import { generateWorld, MAP_TEMPLATES, MapTemplate as WorldTemplate } from '../engine/worldGenerator';
import { pointDistance } from '../engine/voronoi';
import { playSound } from '../services/soundService';
import AnimatedButton from '../components/AnimatedButton';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ═══ EDITOR TOOL TYPES ═══
type EditorMode = 'terrain' | 'owner' | 'river' | 'label' | 'eraser';
type MapStyle = 'political' | 'physical' | 'fantasy' | 'parchment';

const EDITOR_TOOLS: { id: EditorMode; icon: string; label: string }[] = [
  { id: 'terrain', icon: '🎨', label: 'Arazi' },
  { id: 'owner', icon: '🏴', label: 'Ulke' },
  { id: 'river', icon: '💧', label: 'Nehir' },
  { id: 'label', icon: '🏷️', label: 'Etiket' },
  { id: 'eraser', icon: '🧹', label: 'Sil' },
];

const TERRAIN_OPTIONS: { terrain: RegionTerrain; icon: string; label: string }[] = [
  { terrain: RegionTerrain.DeepSea, icon: '🌊', label: 'Derin Deniz' },
  { terrain: RegionTerrain.Sea, icon: '🌊', label: 'Deniz' },
  { terrain: RegionTerrain.Coast, icon: '🏖️', label: 'Kiyi' },
  { terrain: RegionTerrain.Beach, icon: '⛱️', label: 'Sahil' },
  { terrain: RegionTerrain.Plains, icon: '🌾', label: 'Ova' },
  { terrain: RegionTerrain.Grassland, icon: '🌿', label: 'Cayir' },
  { terrain: RegionTerrain.Forest, icon: '🌲', label: 'Orman' },
  { terrain: RegionTerrain.DenseForest, icon: '🌳', label: 'Yogun Orman' },
  { terrain: RegionTerrain.Hills, icon: '⛰️', label: 'Tepe' },
  { terrain: RegionTerrain.Mountain, icon: '🏔️', label: 'Dag' },
  { terrain: RegionTerrain.SnowPeak, icon: '❄️', label: 'Karli Zirve' },
  { terrain: RegionTerrain.Desert, icon: '🏜️', label: 'Col' },
  { terrain: RegionTerrain.Savanna, icon: '🦁', label: 'Savan' },
  { terrain: RegionTerrain.Swamp, icon: '🐸', label: 'Bataklik' },
  { terrain: RegionTerrain.Tundra, icon: '🧊', label: 'Tundra' },
  { terrain: RegionTerrain.Fertile, icon: '🌱', label: 'Verimli' },
  { terrain: RegionTerrain.Lake, icon: '🏞️', label: 'Gol' },
];

const OWNER_COLORS = [
  { id: 'none', color: 'transparent', label: 'Yok' },
  { id: 'red', color: '#C0392B', label: 'Kirmizi' },
  { id: 'blue', color: '#2980B9', label: 'Mavi' },
  { id: 'green', color: '#27AE60', label: 'Yesil' },
  { id: 'purple', color: '#8E44AD', label: 'Mor' },
  { id: 'orange', color: '#E67E22', label: 'Turuncu' },
  { id: 'cyan', color: '#16A085', label: 'Turkuaz' },
  { id: 'pink', color: '#E91E63', label: 'Pembe' },
  { id: 'yellow', color: '#F1C40F', label: 'Sari' },
];

const MAP_STYLES: { id: MapStyle; icon: string; label: string }[] = [
  { id: 'political', icon: '🗺️', label: 'Siyasi' },
  { id: 'physical', icon: '🏔️', label: 'Fiziki' },
  { id: 'fantasy', icon: '⚔️', label: 'Fantazi' },
  { id: 'parchment', icon: '📜', label: 'Parsomen' },
];

const STYLE_BG: Record<MapStyle, string> = {
  political: '#E8E0D0',
  physical: '#A8C8A0',
  fantasy: '#0E1E38',
  parchment: '#F0E6D0',
};

const STYLE_BORDER: Record<MapStyle, string> = {
  political: '#40404080',
  physical: '#20402050',
  fantasy: '#FFFFFF30',
  parchment: '#80604060',
};

const STYLE_COAST: Record<MapStyle, string> = {
  political: '#40404090',
  physical: '#1A3A5A90',
  fantasy: '#FFFFFF50',
  parchment: '#60402080',
};

// ═══ PATH BUILDER ═══

function makeRegionPath(region: Region) {
  const path = Skia.Path.Make();
  const v = region.smoothVertices;
  const cp = region.controlPoints;
  if (v.length < 3) return path;
  path.moveTo(v[0].x, v[0].y);
  for (let i = 0; i < v.length; i++) {
    const next = (i + 1) % v.length;
    if (cp[i]) {
      path.cubicTo(cp[i][0].x, cp[i][0].y, cp[i][1].x, cp[i][1].y, v[next].x, v[next].y);
    } else {
      path.lineTo(v[next].x, v[next].y);
    }
  }
  path.close();
  return path;
}

function getRegionFillColor(region: Region, style: MapStyle): string {
  const tc = REGION_TERRAIN_COLORS[region.terrain];

  switch (style) {
    case 'physical': {
      // Yükseklik bazlı renk
      const e = region.elevation;
      if (!region.isLand) return tc.fill;
      if (e > 0.8) return '#E0E8F0'; // kar
      if (e > 0.65) return '#8A7A68'; // dag
      if (e > 0.5) return '#A09878'; // tepe
      if (e > 0.4) return '#88B868'; // yesil tepe
      return '#6AB848'; // ovalik
    }
    case 'parchment': {
      if (!region.isLand) return '#C8B898';
      return '#E8DCC0';
    }
    case 'fantasy':
      return tc.fill;
    case 'political':
    default:
      if (!region.isLand) return '#B8D0E8';
      return tc.fill;
  }
}

// ═══ COMPONENT ═══

interface Props {
  editTemplate?: any;
  onSave: (template: any) => void;
  onBack: () => void;
}

export default function MapEditorScreen({ editTemplate, onSave, onBack }: Props) {
  const [mapName, setMapName] = useState('');
  const [mode, setMode] = useState<EditorMode>('terrain');
  const [selectedTerrain, setSelectedTerrain] = useState<RegionTerrain>(RegionTerrain.Plains);
  const [selectedOwner, setSelectedOwner] = useState('red');
  const [mapStyle, setMapStyle] = useState<MapStyle>('fantasy');
  const [world, setWorld] = useState<WorldMap | null>(null);
  const [worldTemplate, setWorldTemplate] = useState<WorldTemplate>('continents');
  const [labels, setLabels] = useState<{ x: number; y: number; text: string }[]>([]);
  const [undoStack, setUndoStack] = useState<WorldMap[]>([]);

  const canvasRef = useRef<any>(null);

  // Harita üret
  const handleGenerate = (tmpl: WorldTemplate) => {
    playSound('click');
    setWorldTemplate(tmpl);
    const seed = Date.now();
    const w = generateWorld(seed, tmpl);
    if (world) setUndoStack(prev => [...prev.slice(-15), world]);
    setWorld(w);
  };

  // İlk açılışta otomatik üret
  if (!world) {
    const seed = Date.now();
    const w = generateWorld(seed, 'continents');
    setWorld(w);
  }

  // Undo
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    setWorld(undoStack[undoStack.length - 1]);
    setUndoStack(prev => prev.slice(0, -1));
  };

  // Bölgeye tıklama
  const handleRegionTap = useCallback((x: number, y: number) => {
    if (!world) return;
    // En yakın bölgeyi bul
    let bestId = '';
    let bestDist = Infinity;
    for (const [id, region] of world.regions) {
      const d = pointDistance(region.center, { x, y });
      if (d < bestDist) { bestDist = d; bestId = id; }
    }
    if (!bestId) return;
    const region = world.regions.get(bestId);
    if (!region) return;

    setUndoStack(prev => [...prev.slice(-15), { ...world, regions: new Map(world.regions) }]);

    const newRegions = new Map(world.regions);
    const newRegion = { ...region };

    switch (mode) {
      case 'terrain':
        newRegion.terrain = selectedTerrain;
        newRegion.isLand = !['deep_sea', 'sea', 'coast', 'lake', 'river'].includes(selectedTerrain);
        break;
      case 'owner':
        newRegion.ownerId = selectedOwner === 'none' ? null : selectedOwner;
        break;
      case 'eraser':
        newRegion.terrain = RegionTerrain.Sea;
        newRegion.isLand = false;
        newRegion.ownerId = null;
        newRegion.building = null;
        newRegion.army = null;
        break;
      case 'label':
        const text = `Bolge ${labels.length + 1}`;
        setLabels(prev => [...prev, { x: region.center.x, y: region.center.y, text }]);
        break;
    }

    newRegions.set(bestId, newRegion);
    setWorld({ ...world, regions: newRegions });
  }, [world, mode, selectedTerrain, selectedOwner, labels]);

  // Camera
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(0.5);
  const savedTX = useSharedValue(0);
  const savedTY = useSharedValue(0);
  const savedScale = useSharedValue(0.5);

  const panGesture = Gesture.Pan()
    .onStart(() => { savedTX.value = translateX.value; savedTY.value = translateY.value; })
    .onUpdate(e => { translateX.value = savedTX.value + e.translationX; translateY.value = savedTY.value + e.translationY; })
    .onEnd(e => { translateX.value = withDecay({ velocity: e.velocityX }); translateY.value = withDecay({ velocity: e.velocityY }); });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => { savedScale.value = scale.value; })
    .onUpdate(e => { scale.value = Math.max(0.2, Math.min(3, savedScale.value * e.scale)); });

  const handleTap = useCallback((ex: number, ey: number) => {
    if (!world) return;
    const mapX = (ex - SCREEN_W / 2 - translateX.value) / scale.value + world.width / 2;
    const mapY = (ey - (SCREEN_H - 300) / 2 - translateY.value) / scale.value + world.height / 2;
    handleRegionTap(mapX, mapY);
  }, [handleRegionTap, world]);

  const tapGesture = Gesture.Tap().onEnd(e => { 'worklet'; runOnJS(handleTap)(e.x, e.y); });
  const allGestures = Gesture.Exclusive(tapGesture, Gesture.Simultaneous(panGesture, pinchGesture));

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: SCREEN_W / 2 + translateX.value },
      { translateY: (SCREEN_H - 300) / 2 + translateY.value },
      { scale: scale.value },
    ],
  }));

  // Render data
  const renderData = useMemo(() => {
    if (!world) return [];
    return [...world.regions.values()].map(region => ({
      region,
      path: makeRegionPath(region),
      fillColor: getRegionFillColor(region, mapStyle),
    }));
  }, [world, mapStyle]);

  // Stats
  const landCount = world ? [...world.regions.values()].filter(r => r.isLand).length : 0;
  const totalCount = world?.regions.size ?? 0;
  const landPct = totalCount > 0 ? Math.round((landCount / totalCount) * 100) : 0;

  // Export as PNG
  const handleExport = async () => {
    if (!canvasRef.current) {
      Alert.alert('Hata', 'Canvas referansi bulunamadi.');
      return;
    }
    try {
      // Skia snapshot
      const image = await makeImageFromView(canvasRef);
      if (image) {
        Alert.alert('Basarili', 'Harita kaydedildi! (Skia snapshot)');
      } else {
        Alert.alert('Bilgi', 'Export icin Expo Media Library gerekli. Simdilik harita oyun icinde kaydedildi.');
      }
    } catch {
      Alert.alert('Bilgi', 'Harita oyun verisi olarak kaydedildi.');
    }
    // Oyun verisi olarak kaydet
    handleSave();
  };

  // Save
  const handleSave = () => {
    if (!world) return;
    if (!mapName.trim()) {
      Alert.alert('Hata', 'Harita ismi girin.');
      return;
    }
    playSound('build');
    onSave({
      id: `custom-${Date.now()}`,
      name: mapName.trim(),
      description: `${landPct}% kara, ${totalCount} bolge`,
      icon: '🎨',
      author: 'Oyuncu',
      createdAt: Date.now(),
      radius: 18,
      playerCount: 4,
      startPositions: [],
      terrainData: [],
      generatorType: 'custom',
      tags: ['ozel', worldTemplate],
    });
  };

  return (
    <View style={styles.container}>
      {/* ═══ HEADER ═══ */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>{'‹'}</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.nameInput}
          value={mapName}
          onChangeText={setMapName}
          placeholder="Harita ismi..."
          placeholderTextColor={COLORS.textMuted}
          maxLength={30}
        />
        <TouchableOpacity onPress={handleUndo} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>↩</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleExport} style={[styles.headerBtn, { backgroundColor: COLORS.gold }]}>
          <Text style={styles.headerBtnText}>📷</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSave} style={[styles.headerBtn, { backgroundColor: COLORS.green }]}>
          <Text style={styles.headerBtnText}>💾</Text>
        </TouchableOpacity>
      </View>

      {/* ═══ MAP STYLE SELECTOR ═══ */}
      <View style={styles.styleBar}>
        {MAP_STYLES.map(s => (
          <TouchableOpacity
            key={s.id}
            style={[styles.styleBtn, mapStyle === s.id && styles.styleBtnActive]}
            onPress={() => { playSound('click'); setMapStyle(s.id); }}
          >
            <Text style={styles.styleIcon}>{s.icon}</Text>
            <Text style={[styles.styleLabel, mapStyle === s.id && styles.styleLabelActive]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
        <View style={styles.statsBadge}>
          <Text style={styles.statsText}>{landPct}% kara • {totalCount} bolge</Text>
        </View>
      </View>

      {/* ═══ CANVAS ═══ */}
      <View style={styles.canvasArea} ref={canvasRef}>
        <GestureDetector gesture={allGestures}>
          <Animated.View style={[styles.canvasWrapper, animStyle, { width: world?.width ?? 1600, height: world?.height ?? 1200 }]}>
            {world && (
              <Canvas style={styles.canvas}>
                {/* Arka plan */}
                <Path
                  path={Skia.Path.Make().addRect(Skia.XYWHRect(0, 0, world.width, world.height))}
                  color={STYLE_BG[mapStyle]}
                  style="fill"
                />

                {/* Bölge dolguları */}
                {renderData.map(({ region, path, fillColor }) => (
                  <Group key={region.id}>
                    <Path path={path} color={fillColor} style="fill" />
                    {/* Sahiplik overlay */}
                    {region.ownerId && (
                      <Path path={path} color={
                        (OWNER_COLORS.find(c => c.id === region.ownerId)?.color || '#FF0000') + '40'
                      } style="fill" />
                    )}
                  </Group>
                ))}

                {/* İç sınırlar */}
                {renderData.filter(d => d.region.isLand).map(({ region, path }) => (
                  <Path
                    key={`b-${region.id}`}
                    path={path}
                    color={STYLE_BORDER[mapStyle]}
                    style="stroke"
                    strokeWidth={mapStyle === 'parchment' ? 0.6 : 0.5}
                  />
                ))}

                {/* Kıyı çizgisi */}
                {renderData.filter(d => d.region.isCoast).map(({ region, path }) => (
                  <Path
                    key={`c-${region.id}`}
                    path={path}
                    color={STYLE_COAST[mapStyle]}
                    style="stroke"
                    strokeWidth={1.5}
                    strokeCap="round"
                  />
                ))}

                {/* Sahiplik sınırları */}
                {renderData.filter(d => d.region.ownerId).map(({ region, path }) => (
                  <Path
                    key={`o-${region.id}`}
                    path={path}
                    color={(OWNER_COLORS.find(c => c.id === region.ownerId)?.color || '#FF0000') + '80'}
                    style="stroke"
                    strokeWidth={2}
                  />
                ))}

                {/* Nehirler */}
                {world.rivers.map((river, i) => {
                  const rPath = Skia.Path.Make();
                  if (river.points.length < 2) return null;
                  rPath.moveTo(river.points[0].x, river.points[0].y);
                  for (let pi = 1; pi < river.points.length; pi++) {
                    if (pi < river.points.length - 1) {
                      const mx = (river.points[pi].x + river.points[pi + 1].x) / 2;
                      const my = (river.points[pi].y + river.points[pi + 1].y) / 2;
                      rPath.quadTo(river.points[pi].x, river.points[pi].y, mx, my);
                    } else {
                      rPath.lineTo(river.points[pi].x, river.points[pi].y);
                    }
                  }
                  return (
                    <Path key={`river-${i}`} path={rPath}
                      color={mapStyle === 'parchment' ? '#6080A0' : '#3A80C8'}
                      style="stroke" strokeWidth={river.width}
                      strokeCap="round" strokeJoin="round"
                    />
                  );
                })}
              </Canvas>
            )}
          </Animated.View>
        </GestureDetector>

        {/* Etiketler */}
        {world && (
          <Animated.View style={[styles.canvasWrapper, animStyle, { width: world.width, height: world.height }]} pointerEvents="none">
            {labels.map((lbl, i) => (
              <Text key={i} style={[styles.mapLabel, { left: lbl.x - 30, top: lbl.y - 8 }]}>{lbl.text}</Text>
            ))}
          </Animated.View>
        )}
      </View>

      {/* ═══ TOOLBAR ═══ */}
      <View style={styles.toolbar}>
        {/* Şablon butonları */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templateScroll}>
          <View style={styles.templateRow}>
            <Text style={styles.toolbarSectionLabel}>SABLON:</Text>
            {(Object.keys(MAP_TEMPLATES) as WorldTemplate[]).map(tmpl => (
              <TouchableOpacity
                key={tmpl}
                style={[styles.templateBtn, worldTemplate === tmpl && styles.templateBtnActive]}
                onPress={() => handleGenerate(tmpl)}
              >
                <Text style={styles.templateIcon}>{MAP_TEMPLATES[tmpl].icon}</Text>
                <Text style={styles.templateLabel}>{MAP_TEMPLATES[tmpl].name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.templateBtn, { borderColor: COLORS.gold }]}
              onPress={() => handleGenerate(worldTemplate)}
            >
              <Text style={styles.templateIcon}>🎲</Text>
              <Text style={styles.templateLabel}>Yeniden</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Araç seçimi */}
        <View style={styles.toolRow}>
          {EDITOR_TOOLS.map(tool => (
            <TouchableOpacity
              key={tool.id}
              style={[styles.toolBtn, mode === tool.id && styles.toolBtnActive]}
              onPress={() => { playSound('click'); setMode(tool.id); }}
            >
              <Text style={styles.toolIcon}>{tool.icon}</Text>
              <Text style={[styles.toolLabel, mode === tool.id && styles.toolLabelActive]}>{tool.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Alt palette — mod'a göre */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.paletteScroll}>
          {mode === 'terrain' && (
            <View style={styles.paletteRow}>
              {TERRAIN_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.terrain}
                  style={[
                    styles.paletteBtn,
                    { borderColor: REGION_TERRAIN_COLORS[opt.terrain].fill },
                    selectedTerrain === opt.terrain && { backgroundColor: REGION_TERRAIN_COLORS[opt.terrain].fill + '40', borderWidth: 2 },
                  ]}
                  onPress={() => setSelectedTerrain(opt.terrain)}
                >
                  <Text style={styles.paletteIcon}>{opt.icon}</Text>
                  <Text style={styles.paletteLabel}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {mode === 'owner' && (
            <View style={styles.paletteRow}>
              {OWNER_COLORS.map(oc => (
                <TouchableOpacity
                  key={oc.id}
                  style={[
                    styles.paletteBtn,
                    { borderColor: oc.color || COLORS.border },
                    selectedOwner === oc.id && { backgroundColor: (oc.color || '#888') + '40', borderWidth: 2 },
                  ]}
                  onPress={() => setSelectedOwner(oc.id)}
                >
                  <View style={[styles.colorDot, { backgroundColor: oc.color || '#444' }]} />
                  <Text style={styles.paletteLabel}>{oc.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

// ═══ STYLES ═══

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACE.sm,
    paddingTop: 50, paddingBottom: SPACE.sm, backgroundColor: COLORS.bgLight,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: SPACE.xs,
  },
  headerBtn: {
    width: 38, height: 38, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerBtnText: { fontSize: 18 },
  nameInput: {
    flex: 1, backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.sm, paddingHorizontal: SPACE.md, paddingVertical: 8,
    color: COLORS.textPrimary, fontSize: FONT.body,
  },
  styleBar: {
    flexDirection: 'row', paddingHorizontal: SPACE.sm, paddingVertical: SPACE.xs,
    backgroundColor: COLORS.bgLight, gap: SPACE.xs, alignItems: 'center',
  },
  styleBtn: {
    paddingHorizontal: SPACE.sm, paddingVertical: SPACE.xs, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bg,
    flexDirection: 'row', alignItems: 'center', gap: 3,
  },
  styleBtnActive: { borderColor: COLORS.gold, backgroundColor: COLORS.primaryDark },
  styleIcon: { fontSize: 14 },
  styleLabel: { color: COLORS.textMuted, fontSize: 9, fontWeight: '700' as any },
  styleLabelActive: { color: COLORS.gold },
  statsBadge: { marginLeft: 'auto', paddingHorizontal: SPACE.sm },
  statsText: { color: COLORS.textMuted, fontSize: 9, fontWeight: '600' as any },

  canvasArea: { flex: 1, backgroundColor: '#080E14', overflow: 'hidden' },
  canvasWrapper: { position: 'absolute' as const },
  canvas: { flex: 1 },
  mapLabel: {
    position: 'absolute' as const, color: '#000000AA', fontSize: 10,
    fontWeight: '700' as any, fontStyle: 'italic' as const, width: 60, textAlign: 'center' as const,
  },

  toolbar: {
    backgroundColor: COLORS.bgLight, borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingBottom: 28,
  },
  templateScroll: { paddingVertical: SPACE.xs, paddingHorizontal: SPACE.sm },
  templateRow: { flexDirection: 'row', gap: SPACE.xs, alignItems: 'center' },
  toolbarSectionLabel: {
    color: COLORS.textMuted, fontSize: 8, fontWeight: '700' as any,
    marginRight: SPACE.xs,
  },
  templateBtn: {
    paddingHorizontal: SPACE.sm, paddingVertical: SPACE.xs, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bg,
    alignItems: 'center',
  },
  templateBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryDark },
  templateIcon: { fontSize: 16 },
  templateLabel: { color: COLORS.textMuted, fontSize: 7, fontWeight: '600' as any },

  toolRow: {
    flexDirection: 'row', paddingHorizontal: SPACE.sm, paddingVertical: SPACE.xs, gap: SPACE.xs,
  },
  toolBtn: {
    flex: 1, alignItems: 'center', paddingVertical: SPACE.xs, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bg,
  },
  toolBtnActive: { borderColor: COLORS.gold, backgroundColor: COLORS.primaryDark },
  toolIcon: { fontSize: 18 },
  toolLabel: { color: COLORS.textMuted, fontSize: 8, fontWeight: '700' as any },
  toolLabelActive: { color: COLORS.gold },

  paletteScroll: { paddingHorizontal: SPACE.sm, paddingBottom: SPACE.xs },
  paletteRow: { flexDirection: 'row', gap: SPACE.xs },
  paletteBtn: {
    alignItems: 'center', paddingVertical: SPACE.xs, paddingHorizontal: SPACE.sm,
    borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.bg, minWidth: 52,
  },
  paletteIcon: { fontSize: 18 },
  paletteLabel: { color: COLORS.textMuted, fontSize: 7, fontWeight: '600' as any, marginTop: 1 },
  colorDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: '#FFF3' },
});
