import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView,
  Dimensions,
} from 'react-native';
import {
  Canvas, Path, Skia, Group,
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDecay, runOnJS,
} from 'react-native-reanimated';
import { COLORS, FONT, SPACE, RADIUS } from '../constants/theme';
import { HexTerrain, hexKey } from '../types/game';
import { EditorTool, MapTemplate } from '../types/mapEditor';
import { hexToPixel, getHexCorners, pixelToHex, isInMapBounds, getNeighbors, hexesInRange } from '../engine/hexUtils';
import { HEX_SIZE, TERRAIN_PALETTE, TERRAIN_COLORS, TERRAIN_ICONS } from '../constants/game';
import { saveCustomMap } from '../services/mapStorage';
import { playSound } from '../services/soundService';
import AnimatedButton from '../components/AnimatedButton';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const S = HEX_SIZE;
const CC = 800; // Canvas center

interface Props {
  editTemplate?: MapTemplate | null;
  onSave: (template: MapTemplate) => void;
  onBack: () => void;
}

// Terrain seçenekleri — editörde gösterilecek sıra
const TERRAIN_OPTIONS: HexTerrain[] = [
  HexTerrain.Sea, HexTerrain.Coast, HexTerrain.Lake,
  HexTerrain.Shore, HexTerrain.Plains, HexTerrain.Fertile,
  HexTerrain.Hills, HexTerrain.Forest, HexTerrain.Mountain,
  HexTerrain.Desert, HexTerrain.Swamp, HexTerrain.River,
];

const TOOL_OPTIONS: { id: EditorTool; icon: string; label: string }[] = [
  { id: 'single', icon: '✏️', label: 'Tek' },
  { id: 'brush', icon: '🖌️', label: 'Firca' },
  { id: 'fill', icon: '🪣', label: 'Doldur' },
  { id: 'eraser', icon: '🧹', label: 'Sil' },
  { id: 'startPos', icon: '📍', label: 'Baslangic' },
];

function makeHexPath(cx: number, cy: number, size: number) {
  const path = Skia.Path.Make();
  const corners = getHexCorners(cx, cy, size);
  path.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < corners.length; i++) path.lineTo(corners[i].x, corners[i].y);
  path.close();
  return path;
}

export default function MapEditorScreen({ editTemplate, onSave, onBack }: Props) {
  const radius = editTemplate?.radius ?? 14;
  const [mapName, setMapName] = useState(editTemplate?.name ?? '');
  const [selectedTerrain, setSelectedTerrain] = useState<HexTerrain>(HexTerrain.Plains);
  const [tool, setTool] = useState<EditorTool>('single');
  const [brushSize, setBrushSize] = useState(1);
  const [startPositions, setStartPositions] = useState<{ q: number; r: number }[]>(
    editTemplate?.startPositions ?? [],
  );

  // Terrain map
  const [terrainMap, setTerrainMap] = useState<Map<string, HexTerrain>>(() => {
    const m = new Map<string, HexTerrain>();
    if (editTemplate?.terrainData) {
      for (const [q, r, t] of editTemplate.terrainData) {
        m.set(hexKey(q, r), t);
      }
    } else {
      // Boş harita: hepsi deniz
      for (let q = -radius; q <= radius; q++) {
        for (let r = -radius; r <= radius; r++) {
          if (!isInMapBounds(q, r, radius)) continue;
          m.set(hexKey(q, r), HexTerrain.Sea);
        }
      }
    }
    return m;
  });

  // Undo/Redo
  const [undoStack, setUndoStack] = useState<Map<string, HexTerrain>[]>([]);

  const saveSnapshot = () => {
    setUndoStack(prev => [...prev.slice(-20), new Map(terrainMap)]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack(s => s.slice(0, -1));
    setTerrainMap(prev);
  };

  // Terrain boyama
  const paintHex = useCallback((q: number, r: number) => {
    const key = hexKey(q, r);
    if (!terrainMap.has(key)) return;

    if (tool === 'startPos') {
      const exists = startPositions.findIndex(p => p.q === q && p.r === r);
      if (exists >= 0) {
        setStartPositions(prev => prev.filter((_, i) => i !== exists));
      } else if (startPositions.length < 4) {
        setStartPositions(prev => [...prev, { q, r }]);
      }
      return;
    }

    saveSnapshot();
    const newMap = new Map(terrainMap);
    const terrain = tool === 'eraser' ? HexTerrain.Sea : selectedTerrain;

    if (tool === 'fill') {
      // Flood fill
      const targetTerrain = terrainMap.get(key);
      if (targetTerrain === terrain) return;
      const queue = [{ q, r }];
      const visited = new Set<string>();
      while (queue.length > 0) {
        const curr = queue.shift()!;
        const ck = hexKey(curr.q, curr.r);
        if (visited.has(ck)) continue;
        visited.add(ck);
        if (newMap.get(ck) !== targetTerrain) continue;
        newMap.set(ck, terrain);
        const neighbors = getNeighbors(curr);
        for (const n of neighbors) {
          if (newMap.has(hexKey(n.q, n.r))) queue.push(n);
        }
      }
    } else if (tool === 'brush' && brushSize > 1) {
      const hexes = hexesInRange({ q, r }, brushSize - 1);
      for (const h of hexes) {
        const hk = hexKey(h.q, h.r);
        if (newMap.has(hk)) newMap.set(hk, terrain);
      }
    } else {
      newMap.set(key, terrain);
    }

    setTerrainMap(newMap);
  }, [terrainMap, tool, selectedTerrain, brushSize, startPositions]);

  // Camera
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(0.9);
  const savedTX = useSharedValue(0);
  const savedTY = useSharedValue(0);
  const savedScale = useSharedValue(0.9);

  const panGesture = Gesture.Pan()
    .onStart(() => { savedTX.value = translateX.value; savedTY.value = translateY.value; })
    .onUpdate(e => { translateX.value = savedTX.value + e.translationX; translateY.value = savedTY.value + e.translationY; })
    .onEnd(e => { translateX.value = withDecay({ velocity: e.velocityX, deceleration: 0.997 }); translateY.value = withDecay({ velocity: e.velocityY, deceleration: 0.997 }); });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => { savedScale.value = scale.value; })
    .onUpdate(e => { scale.value = Math.max(0.3, Math.min(3, savedScale.value * e.scale)); });

  const handleTap = useCallback((x: number, y: number) => {
    const cw = SCREEN_W;
    const ch = SCREEN_H - 280;
    const mapX = (x - cw / 2 - translateX.value) / scale.value;
    const mapY = (y - ch / 2 - translateY.value) / scale.value;
    const coord = pixelToHex(mapX, mapY);
    paintHex(coord.q, coord.r);
  }, [paintHex]);

  const tapGesture = Gesture.Tap().onEnd(e => {
    'worklet';
    runOnJS(handleTap)(e.x, e.y);
  });

  const allGestures = Gesture.Exclusive(tapGesture, Gesture.Simultaneous(panGesture, pinchGesture));

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: SCREEN_W / 2 + translateX.value },
      { translateY: (SCREEN_H - 280) / 2 + translateY.value },
      { scale: scale.value },
    ],
  }));

  // Hex render
  const hexData = useMemo(() => {
    const data: { key: string; cx: number; cy: number; terrain: HexTerrain; isStart: number }[] = [];
    for (const [key, terrain] of terrainMap) {
      const [qs, rs] = key.split(',').map(Number);
      const { x, y } = hexToPixel(qs, rs);
      const startIdx = startPositions.findIndex(p => p.q === qs && p.r === rs);
      data.push({ key, cx: x + CC, cy: y + CC, terrain, isStart: startIdx + 1 });
    }
    return data;
  }, [terrainMap, startPositions]);

  // Stats
  const landCount = [...terrainMap.values()].filter(t =>
    t !== HexTerrain.Sea && t !== HexTerrain.Lake && t !== HexTerrain.Coast
  ).length;
  const landPct = Math.round((landCount / terrainMap.size) * 100);

  // Save
  const handleSave = async () => {
    if (!mapName.trim()) {
      Alert.alert('Hata', 'Harita ismi girin.');
      return;
    }
    if (startPositions.length < 2) {
      Alert.alert('Hata', 'En az 2 baslangic noktasi yerleştirin (📍 araci).');
      return;
    }

    const terrainData: [number, number, HexTerrain][] = [];
    for (const [key, terrain] of terrainMap) {
      const [q, r] = key.split(',').map(Number);
      terrainData.push([q, r, terrain]);
    }

    const template: MapTemplate = {
      id: editTemplate?.id ?? `custom-${Date.now()}`,
      name: mapName.trim(),
      description: `${landPct}% kara, ${startPositions.length} oyuncu`,
      icon: '🎨',
      author: 'Oyuncu',
      createdAt: Date.now(),
      radius,
      playerCount: startPositions.length,
      startPositions,
      terrainData,
      generatorType: 'custom',
      tags: ['ozel'],
    };

    await saveCustomMap(template);
    playSound('build');
    onSave(template);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>{'‹'}</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.nameInput}
          value={mapName}
          onChangeText={setMapName}
          placeholder="Harita ismi..."
          placeholderTextColor={COLORS.textMuted}
          maxLength={24}
        />
        <TouchableOpacity onPress={handleUndo} style={styles.undoBtn}>
          <Text style={styles.undoBtnText}>↩</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
          <Text style={styles.saveBtnText}>💾</Text>
        </TouchableOpacity>
      </View>

      {/* Canvas */}
      <View style={styles.canvasArea}>
        <GestureDetector gesture={allGestures}>
          <Animated.View style={[styles.canvasWrapper, animStyle]}>
            <Canvas style={styles.canvas}>
              {hexData.map(h => {
                const palette = TERRAIN_PALETTE[h.terrain];
                const outerPath = makeHexPath(h.cx, h.cy, S - 1);
                return (
                  <Group key={h.key}>
                    <Path path={outerPath} color={palette.base} style="fill" />
                    <Path path={outerPath} color={palette.dark + '40'} style="stroke" strokeWidth={0.5} />
                    {h.isStart > 0 && (
                      <Path
                        path={makeHexPath(h.cx, h.cy, S - 2)}
                        color="#FFD70060"
                        style="fill"
                      />
                    )}
                  </Group>
                );
              })}
            </Canvas>
          </Animated.View>
        </GestureDetector>

        {/* Start position labels */}
        <Animated.View style={[styles.canvasWrapper, animStyle]} pointerEvents="none">
          {hexData.filter(h => h.isStart > 0).map(h => (
            <View key={`sp-${h.key}`} style={[styles.startLabel, { left: h.cx - 10, top: h.cy - 10 }]}>
              <Text style={styles.startLabelText}>P{h.isStart}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Stats badge */}
        <View style={styles.statsBadge}>
          <Text style={styles.statsText}>{landPct}% kara • {startPositions.length}/4 oyuncu</Text>
        </View>
      </View>

      {/* Tool palette */}
      <View style={styles.toolBar}>
        {/* Tools */}
        <View style={styles.toolRow}>
          {TOOL_OPTIONS.map(t => (
            <TouchableOpacity
              key={t.id}
              style={[styles.toolBtn, tool === t.id && styles.toolBtnActive]}
              onPress={() => { playSound('click'); setTool(t.id); }}
            >
              <Text style={styles.toolIcon}>{t.icon}</Text>
              <Text style={[styles.toolLabel, tool === t.id && styles.toolLabelActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}

          {/* Brush size */}
          {tool === 'brush' && (
            <View style={styles.brushSizeRow}>
              {[1, 2, 3].map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.sizeBtn, brushSize === s && styles.sizeBtnActive]}
                  onPress={() => setBrushSize(s)}
                >
                  <Text style={styles.sizeBtnText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Terrain palette */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.terrainScroll}>
          <View style={styles.terrainRow}>
            {TERRAIN_OPTIONS.map(t => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.terrainBtn,
                  { borderColor: TERRAIN_COLORS[t] },
                  selectedTerrain === t && { backgroundColor: TERRAIN_COLORS[t] + '40', borderWidth: 2 },
                ]}
                onPress={() => { setSelectedTerrain(t); if (tool === 'startPos') setTool('single'); }}
              >
                <Text style={styles.terrainIcon}>{TERRAIN_ICONS[t]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACE.md,
    paddingTop: 50,
    paddingBottom: SPACE.sm,
    backgroundColor: COLORS.bgLight,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACE.sm,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  backText: { color: COLORS.textSecondary, fontSize: 20, fontWeight: '700' as any },
  nameInput: {
    flex: 1,
    backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.sm, paddingHorizontal: SPACE.md, paddingVertical: 8,
    color: COLORS.textPrimary, fontSize: FONT.body,
  },
  undoBtn: {
    width: 36, height: 36, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  undoBtnText: { fontSize: 18 },
  saveBtn: {
    width: 36, height: 36, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.gold, alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: { fontSize: 18 },

  canvasArea: { flex: 1, backgroundColor: '#080E14', overflow: 'hidden' },
  canvasWrapper: {
    position: 'absolute', width: 1600, height: 1600, left: -800, top: -800,
  },
  canvas: { flex: 1 },
  startLabel: {
    position: 'absolute', width: 20, height: 20,
    borderRadius: 10, backgroundColor: '#FFD700DD',
    alignItems: 'center', justifyContent: 'center',
  },
  startLabelText: { color: '#000', fontSize: 9, fontWeight: '900' as any },
  statsBadge: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: COLORS.bgLight + 'DD', borderRadius: RADIUS.sm,
    paddingHorizontal: SPACE.md, paddingVertical: SPACE.xs,
    borderWidth: 1, borderColor: COLORS.border,
  },
  statsText: { color: COLORS.textMuted, fontSize: FONT.tiny, fontWeight: '600' as any },

  toolBar: {
    backgroundColor: COLORS.bgLight, borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingBottom: 28,
  },
  toolRow: {
    flexDirection: 'row', paddingHorizontal: SPACE.md, paddingVertical: SPACE.sm,
    gap: SPACE.xs, alignItems: 'center',
  },
  toolBtn: {
    alignItems: 'center', paddingVertical: SPACE.xs, paddingHorizontal: SPACE.sm,
    borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bg,
  },
  toolBtnActive: { borderColor: COLORS.gold, backgroundColor: COLORS.primaryDark },
  toolIcon: { fontSize: 18 },
  toolLabel: { color: COLORS.textMuted, fontSize: 8, fontWeight: '700' as any, marginTop: 1 },
  toolLabelActive: { color: COLORS.gold },
  brushSizeRow: { flexDirection: 'row', gap: 3, marginLeft: SPACE.sm },
  sizeBtn: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg,
  },
  sizeBtnActive: { borderColor: COLORS.gold, backgroundColor: COLORS.primaryDark },
  sizeBtnText: { color: COLORS.textPrimary, fontSize: 10, fontWeight: '700' as any },

  terrainScroll: { paddingHorizontal: SPACE.md, paddingBottom: SPACE.sm },
  terrainRow: { flexDirection: 'row', gap: SPACE.xs },
  terrainBtn: {
    width: 44, height: 44, borderRadius: RADIUS.sm, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg,
  },
  terrainIcon: { fontSize: 22 },
});
