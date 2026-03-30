/**
 * RegionMapRenderer — Voronoi bazlı harita render.
 *
 * Hex grid yok. Organik bölgeler, bezier sınırlar,
 * gerçek dünya haritası görünümü.
 */
import React, { useMemo, useCallback, useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import {
  Canvas, Path, Skia, Group, Circle, vec,
  LinearGradient, RadialGradient,
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withDecay, withTiming,
  runOnJS, type SharedValue,
} from 'react-native-reanimated';
import { Region, RegionTerrain, WorldMap, MapPoint, REGION_TERRAIN_COLORS } from '../types/region';
import { COLORS } from '../constants/theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export interface RegionMapRef {
  focusOnRegion: (regionId: string) => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

interface Props {
  world: WorldMap;
  selectedRegionId: string | null;
  onSelectRegion: (regionId: string) => void;
  onBattleResult?: (result: any) => void;
  dayPhase?: 'dawn' | 'day' | 'dusk' | 'night';
  playerColors?: Map<string, string>;
}

const DAY_TINT: Record<string, string> = {
  dawn: '#FF880012', day: '#00000000', dusk: '#FF440018', night: '#0A0A3035',
};

// ═══ PATH BUILDERS ═══

function makeRegionPath(region: Region): ReturnType<typeof Skia.Path.Make> {
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

function makeRawRegionPath(region: Region): ReturnType<typeof Skia.Path.Make> {
  const path = Skia.Path.Make();
  if (region.vertices.length < 3) return path;
  path.moveTo(region.vertices[0].x, region.vertices[0].y);
  for (let i = 1; i < region.vertices.length; i++) {
    path.lineTo(region.vertices[i].x, region.vertices[i].y);
  }
  path.close();
  return path;
}

// ═══ HELPERS ═══

function findSharedEdge(vertsA: MapPoint[], vertsB: MapPoint[]): MapPoint[] {
  const shared: MapPoint[] = [];
  const threshold = 2; // piksel tolerans
  for (const va of vertsA) {
    for (const vb of vertsB) {
      const dx = va.x - vb.x;
      const dy = va.y - vb.y;
      if (dx * dx + dy * dy < threshold * threshold) {
        shared.push(va);
        break;
      }
    }
  }
  return shared;
}

// ═══ COMPONENT ═══

const RegionMapRenderer = forwardRef<RegionMapRef, Props>(function RegionMapRenderer(
  { world, selectedRegionId, onSelectRegion, dayPhase = 'day', playerColors },
  ref,
) {
  const translateX = useSharedValue(-(world.width / 2 - SCREEN_W / 2));
  const translateY = useSharedValue(-(world.height / 2 - (SCREEN_H - 200) / 2));
  const scale = useSharedValue(0.6);
  const savedTX = useSharedValue(0);
  const savedTY = useSharedValue(0);
  const savedScale = useSharedValue(0.6);

  useImperativeHandle(ref, () => ({
    focusOnRegion: (regionId: string) => {
      const region = world.regions.get(regionId);
      if (!region) return;
      translateX.value = withTiming(-region.center.x + SCREEN_W / 2, { duration: 400 });
      translateY.value = withTiming(-region.center.y + (SCREEN_H - 200) / 2, { duration: 400 });
      scale.value = withTiming(1.2, { duration: 400 });
    },
    zoomIn: () => { scale.value = withTiming(Math.min(3, scale.value * 1.4), { duration: 250 }); },
    zoomOut: () => { scale.value = withTiming(Math.max(0.25, scale.value / 1.4), { duration: 250 }); },
  }));

  // Gestures
  const panGesture = Gesture.Pan()
    .onStart(() => { savedTX.value = translateX.value; savedTY.value = translateY.value; })
    .onUpdate(e => { translateX.value = savedTX.value + e.translationX; translateY.value = savedTY.value + e.translationY; })
    .onEnd(e => {
      translateX.value = withDecay({ velocity: e.velocityX, deceleration: 0.997 });
      translateY.value = withDecay({ velocity: e.velocityY, deceleration: 0.997 });
    });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => { savedScale.value = scale.value; })
    .onUpdate(e => { scale.value = Math.max(0.25, Math.min(3, savedScale.value * e.scale)); });

  const handleTap = useCallback((x: number, y: number) => {
    const mapX = (x - translateX.value) / scale.value;
    const mapY = (y - translateY.value) / scale.value;

    // En yakın bölgeyi bul
    let bestId = '';
    let bestDist = Infinity;
    for (const [id, region] of world.regions) {
      if (!region.isLand) continue;
      const dx = region.center.x - mapX;
      const dy = region.center.y - mapY;
      const d = dx * dx + dy * dy;
      if (d < bestDist) {
        bestDist = d;
        bestId = id;
      }
    }
    if (bestId) onSelectRegion(bestId);
  }, [world, onSelectRegion]);

  const tapGesture = Gesture.Tap().onEnd(e => {
    'worklet';
    runOnJS(handleTap)(e.x, e.y);
  });

  const allGestures = Gesture.Exclusive(tapGesture, Gesture.Simultaneous(panGesture, pinchGesture));

  // ═══ RENDER DATA ═══
  const regionRenderData = useMemo(() => {
    const data: {
      id: string;
      region: Region;
      path: ReturnType<typeof Skia.Path.Make>;
      rawPath: ReturnType<typeof Skia.Path.Make>;
      colors: typeof REGION_TERRAIN_COLORS[RegionTerrain.Plains];
      ownerColor: string | null;
    }[] = [];

    for (const [id, region] of world.regions) {
      const colors = REGION_TERRAIN_COLORS[region.terrain];
      const ownerColor = region.ownerId && playerColors ? (playerColors.get(region.ownerId) ?? null) : null;
      data.push({
        id,
        region,
        path: makeRegionPath(region),
        rawPath: makeRawRegionPath(region),
        colors,
        ownerColor,
      });
    }

    // Deniz bölgeleri altta, kara bölgeleri üstte olacak şekilde sırala
    data.sort((a, b) => {
      if (a.region.isLand !== b.region.isLand) return a.region.isLand ? 1 : -1;
      return a.region.elevation - b.region.elevation;
    });

    return data;
  }, [world, playerColors]);

  // Kıyı çizgisi path'i — kara/deniz sınırı boyunca izle (Azgaar tarzı)
  const coastlinePath = useMemo(() => {
    const path = Skia.Path.Make();
    for (const [, region] of world.regions) {
      if (!region.isCoast) continue;
      // Bu bölgenin kenarlarında denize bakan olanları bul
      for (let vi = 0; vi < region.vertices.length; vi++) {
        const v1 = region.vertices[vi];
        const v2 = region.vertices[(vi + 1) % region.vertices.length];
        // Bu kenar deniz bölgesiyle paylaşılıyor mu kontrol et
        // Basit yaklaşım: kenar çiz, deniz komşusu varsa
        path.moveTo(v1.x, v1.y);
        path.lineTo(v2.x, v2.y);
      }
    }
    return path;
  }, [world]);

  // Sahiplik sınır path'leri — farklı sahipli komşu bölgeler arası kenarlar
  const ownerBorderPaths = useMemo(() => {
    const paths: { path: ReturnType<typeof Skia.Path.Make>; color: string }[] = [];
    const drawnEdges = new Set<string>();

    for (const [, region] of world.regions) {
      if (!region.ownerId || !region.isLand) continue;
      for (const nid of region.neighborIds) {
        const neighbor = world.regions.get(nid);
        if (!neighbor || !neighbor.isLand) continue;
        if (neighbor.ownerId === region.ownerId) continue;

        const edgeKey = [region.id, nid].sort().join('-');
        if (drawnEdges.has(edgeKey)) continue;
        drawnEdges.add(edgeKey);

        // Shared edge vertices bul
        // (Voronoi'de paylaşılan kenar = her iki hücrenin ortak köşeleri)
        const sharedVerts = findSharedEdge(region.vertices, neighbor.vertices);
        if (sharedVerts.length >= 2) {
          const p = Skia.Path.Make();
          p.moveTo(sharedVerts[0].x, sharedVerts[0].y);
          for (let si = 1; si < sharedVerts.length; si++) {
            p.lineTo(sharedVerts[si].x, sharedVerts[si].y);
          }
          const color = playerColors?.get(region.ownerId) ?? '#FFFFFF';
          paths.push({ path: p, color });
        }
      }
    }
    return paths;
  }, [world, playerColors]);

  // Nehir path'leri
  const riverPaths = useMemo(() => {
    return world.rivers.map(river => {
      const path = Skia.Path.Make();
      if (river.points.length < 2) return { path, width: river.width };
      path.moveTo(river.points[0].x, river.points[0].y);
      for (let i = 1; i < river.points.length; i++) {
        if (i < river.points.length - 1) {
          const mx = (river.points[i].x + river.points[i + 1].x) / 2;
          const my = (river.points[i].y + river.points[i + 1].y) / 2;
          path.quadTo(river.points[i].x, river.points[i].y, mx, my);
        } else {
          path.lineTo(river.points[i].x, river.points[i].y);
        }
      }
      return { path, width: river.width };
    });
  }, [world.rivers]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={styles.container}>
      <GestureDetector gesture={allGestures}>
        <Animated.View style={[styles.canvasWrapper, { width: world.width, height: world.height }, animStyle]}>
          <Canvas style={styles.canvas}>
            {/* ═══ PASS 1: Deniz arka planı ═══ */}
            <Path
              path={Skia.Path.Make().addRect(Skia.XYWHRect(0, 0, world.width, world.height))}
              color="#0E1E38"
              style="fill"
            />

            {/* ═══ PASS 2: Bölge dolgular ═══ */}
            {regionRenderData.map(({ id, region, path, colors, ownerColor }) => (
              <Group key={id}>
                {/* Ana dolgu */}
                <Path path={path} color={colors.fill} style="fill" />

                {/* Hafif iç gradyan — derinlik hissi */}
                <Group clip={path}>
                  <Circle cx={region.center.x} cy={region.center.y} r={Math.sqrt(region.area) * 0.6}>
                    <RadialGradient
                      c={vec(region.center.x, region.center.y - 5)}
                      r={Math.sqrt(region.area) * 0.6}
                      colors={[colors.light + '30', 'transparent']}
                    />
                  </Circle>
                </Group>

                {/* Sahiplik rengi overlay */}
                {ownerColor && (
                  <Path path={path} color={ownerColor + '35'} style="fill" />
                )}
              </Group>
            ))}

            {/* ═══ PASS 3: Kara sınır çizgileri — ince gri ═══ */}
            {regionRenderData.filter(d => d.region.isLand).map(({ id, path }) => (
              <Path
                key={`border-${id}`}
                path={path}
                color="#00000025"
                style="stroke"
                strokeWidth={0.8}
              />
            ))}

            {/* ═══ PASS 4: Kıyı çizgisi — organik (Azgaar tarzı) ═══ */}
            <Path
              path={coastlinePath}
              color="#1A2A3A70"
              style="stroke"
              strokeWidth={1.8}
              strokeCap="round"
              strokeJoin="round"
            />

            {/* ═══ PASS 5: Nehirler ═══ */}
            {riverPaths.map((rp, i) => (
              <Path
                key={`river-${i}`}
                path={rp.path}
                color="#3A80C8"
                style="stroke"
                strokeWidth={rp.width}
                strokeCap="round"
                strokeJoin="round"
              />
            ))}

            {/* ═══ PASS 6: Sahiplik sınırları — Voronoi kenar izleme (Azgaar tarzı) ═══ */}
            {ownerBorderPaths.map((bp, i) => (
              <Path
                key={`owb-${i}`}
                path={bp.path}
                color={bp.color + '90'}
                style="stroke"
                strokeWidth={2.5}
                strokeCap="round"
                strokeJoin="round"
              />
            ))}

            {/* ═══ PASS 7: Seçili bölge ═══ */}
            {selectedRegionId && regionRenderData.find(d => d.id === selectedRegionId) && (() => {
              const sel = regionRenderData.find(d => d.id === selectedRegionId)!;
              return (
                <Group>
                  <Path path={sel.path} color={COLORS.selection + '30'} style="fill" />
                  <Path path={sel.path} color={COLORS.selection} style="stroke" strokeWidth={2.5} />
                </Group>
              );
            })()}
          </Canvas>
        </Animated.View>
      </GestureDetector>

      {/* Day/Night tint */}
      {dayPhase !== 'day' && (
        <View style={[styles.tintOverlay, { backgroundColor: DAY_TINT[dayPhase] }]} pointerEvents="none" />
      )}

      {/* Emoji overlay — binalar ve ordular */}
      <EmojiOverlay
        world={world}
        translateX={translateX}
        translateY={translateY}
        scale={scale}
      />
    </View>
  );
});

export default RegionMapRenderer;

// ═══ EMOJI OVERLAY ═══

function EmojiOverlay({
  world, translateX, translateY, scale,
}: {
  world: WorldMap;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  scale: SharedValue<number>;
}) {
  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const icons = useMemo(() => {
    const result: { x: number; y: number; icon: string; count?: number }[] = [];
    for (const [, region] of world.regions) {
      if (region.building) {
        // Bina ikonu
        const BUILDING_ICONS: Record<string, string> = {
          castle: '🏰', barracks: '⚔️', mine: '⛏️', farm: '🌾',
          lumbermill: '🪓', tower: '🗼', market: '🏪',
        };
        result.push({ x: region.center.x, y: region.center.y - 8, icon: BUILDING_ICONS[region.building.type] ?? '🏠' });
      }
      if (region.army) {
        const totalUnits = region.army.units.reduce((s, u) => s + u.count, 0);
        const UNIT_ICONS: Record<string, string> = {
          warrior: '⚔️', archer: '🏹', cavalry: '🐴', catapult: '💥',
          scout: '👁️', galley: '⛵', warship: '🚢',
        };
        const mainUnit = region.army.units.reduce((best, u) => u.count > best.count ? u : best, region.army.units[0]);
        result.push({ x: region.center.x, y: region.center.y + 6, icon: UNIT_ICONS[mainUnit.type] ?? '⚔️', count: totalUnits });
      }
    }
    return result;
  }, [world]);

  if (icons.length === 0) return null;

  return (
    <Animated.View style={[styles.emojiOverlay, { width: world.width, height: world.height }, animStyle]} pointerEvents="none">
      {icons.map((ic, i) => (
        <View key={i} style={[styles.iconWrap, { left: ic.x - 14, top: ic.y - 12 }]}>
          <Text style={styles.iconText}>{ic.icon}</Text>
          {ic.count !== undefined && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{ic.count}</Text>
            </View>
          )}
        </View>
      ))}
    </Animated.View>
  );
}

// ═══ STYLES ═══

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A1428', overflow: 'hidden' },
  canvasWrapper: { position: 'absolute' },
  canvas: { flex: 1 },
  tintOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
  emojiOverlay: { position: 'absolute' },
  iconWrap: {
    position: 'absolute', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 24,
  },
  iconText: {
    fontSize: 16,
    textShadowColor: '#00000090', textShadowRadius: 3,
    textShadowOffset: { width: 0, height: 1 },
  },
  countBadge: {
    position: 'absolute', right: -6, bottom: -4,
    backgroundColor: '#D4382CDD', borderRadius: 4,
    paddingHorizontal: 3, paddingVertical: 0.5, minWidth: 14,
    alignItems: 'center',
  },
  countText: { color: '#FFF', fontSize: 7, fontWeight: '900' },
});
