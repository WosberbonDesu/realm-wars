import React, { useMemo, useCallback, useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { View, StyleSheet, Dimensions, LayoutChangeEvent } from 'react-native';
import {
  Canvas, Path, Skia, Group, Circle, Line, vec,
  LinearGradient, RadialGradient,
} from '@shopify/react-native-skia';
import {
  Gesture, GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withDecay, withTiming,
  runOnJS, type SharedValue,
} from 'react-native-reanimated';
import { useGameStore } from '../store/gameStore';
import { hexToPixel, getHexCorners, pixelToHex, getNeighbors } from '../engine/hexUtils';
import { HexTile, HexCoord, HexTerrain, hexKey } from '../types/game';
import { HEX_SIZE, TERRAIN_PALETTE, BUILDING_ICONS, UNIT_ICONS } from '../constants/game';
import { COLORS } from '../constants/theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const S = HEX_SIZE;
// Canvas 2000x2000, left:-1000 top:-1000. Hex'leri canvas ortasina cizmek icin offset:
const CC = 1000;

// ===== HEX PATH HELPERS =====

function makeHexPath(cx: number, cy: number, size: number) {
  const path = Skia.Path.Make();
  const corners = getHexCorners(cx, cy, size);
  path.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < corners.length; i++) {
    path.lineTo(corners[i].x, corners[i].y);
  }
  path.close();
  return path;
}

// Inset hex (golge/derinlik icin)
function makeHexPathInset(cx: number, cy: number, size: number, inset: number) {
  return makeHexPath(cx, cy, size - inset);
}

// ===== TERRAIN DECORATION PATHS =====
// Organik/gercekci fantazi harita dekorasyonlari — bezier egrileri ile dogal formlar

function makeTreePaths(cx: number, cy: number, seed: number) {
  const paths: { path: ReturnType<typeof Skia.Path.Make>; color: string }[] = [];
  const rng = simpleRng(seed);

  // Tum agaclari TEK path'te birlestir (performans)
  const treePath = Skia.Path.Make();
  const count = 2 + Math.floor(rng() * 2);
  for (let i = 0; i < count; i++) {
    const tx = cx + (rng() - 0.5) * S * 0.7;
    const ty = cy + (rng() - 0.5) * S * 0.5;
    const r = 3 + rng() * 3;
    treePath.addCircle(tx, ty - r * 0.5, r);
  }
  paths.push({ path: treePath, color: '#2E7D32CC' });

  // Koyu golge layer
  const shadowPath = Skia.Path.Make();
  for (let i = 0; i < count; i++) {
    const tx = cx + (rng() - 0.5) * S * 0.5;
    const ty = cy + (rng() - 0.5) * S * 0.4;
    shadowPath.addCircle(tx + 1, ty + 1, 2 + rng() * 2);
  }
  paths.push({ path: shadowPath, color: '#1A4A1A80' });

  return paths;
}

function makeMountainPaths(cx: number, cy: number, seed: number) {
  const paths: { path: ReturnType<typeof Skia.Path.Make>; color: string }[] = [];
  const rng = simpleRng(seed);
  const bw = S * 0.6;
  const bh = S * 0.55;

  // Dag silueti
  const p = Skia.Path.Make();
  p.moveTo(cx - bw * 0.5, cy + bh * 0.2);
  p.lineTo(cx + (rng() - 0.5) * 3, cy - bh * 0.55);
  p.lineTo(cx + bw * 0.5, cy + bh * 0.2);
  p.close();
  paths.push({ path: p, color: '#6E5D4B' });

  // Kar kapagi
  const snow = Skia.Path.Make();
  snow.addCircle(cx + (rng() - 0.5) * 2, cy - bh * 0.4, bw * 0.12);
  paths.push({ path: snow, color: '#E8EFF8D0' });

  return paths;
}

function makeWavePaths(cx: number, cy: number, seed: number) {
  const paths: { path: ReturnType<typeof Skia.Path.Make>; color: string }[] = [];
  const rng = simpleRng(seed);

  // 2 dalga cizgisi tek path
  const wave = Skia.Path.Make();
  for (let i = 0; i < 2; i++) {
    const wy = cy - S * 0.15 + i * S * 0.2;
    const wx = cx - S * 0.35;
    wave.moveTo(wx, wy);
    wave.cubicTo(wx + S * 0.2, wy - 2, wx + S * 0.45, wy + 2, wx + S * 0.7, wy);
  }
  paths.push({ path: wave, color: '#6BB8E850' });
  return paths;
}

function makeDesertPaths(cx: number, cy: number, seed: number) {
  const paths: { path: ReturnType<typeof Skia.Path.Make>; color: string }[] = [];
  const rng = simpleRng(seed);

  const dune = Skia.Path.Make();
  const dy = cy + S * 0.05;
  dune.moveTo(cx - S * 0.4, dy);
  dune.cubicTo(cx - S * 0.15, dy - S * 0.15, cx + S * 0.15, dy - S * 0.1, cx + S * 0.4, dy);
  paths.push({ path: dune, color: '#E8C06040' });
  return paths;
}

function makeSwampPaths(cx: number, cy: number, seed: number) {
  const paths: { path: ReturnType<typeof Skia.Path.Make>; color: string }[] = [];
  const rng = simpleRng(seed);

  // Su birikintisi
  const pool = Skia.Path.Make();
  pool.addOval(Skia.XYWHRect(cx - 5 + (rng() - 0.5) * 4, cy - 3, 10, 6));
  paths.push({ path: pool, color: '#2A504050' });

  // Saz
  const reed = Skia.Path.Make();
  for (let i = 0; i < 2; i++) {
    const rx = cx + (rng() - 0.5) * S * 0.5;
    const ry = cy + (rng() - 0.5) * S * 0.3;
    reed.moveTo(rx, ry);
    reed.lineTo(rx + (rng() - 0.5) * 3, ry - 5 - rng() * 3);
  }
  paths.push({ path: reed, color: '#607848CC' });
  return paths;
}

function makePlainsPaths(cx: number, cy: number, seed: number) {
  const paths: { path: ReturnType<typeof Skia.Path.Make>; color: string }[] = [];
  const rng = simpleRng(seed);

  // Cimen cizgileri tek path
  const grass = Skia.Path.Make();
  for (let i = 0; i < 3; i++) {
    const gx = cx + (rng() - 0.5) * S * 0.6;
    const gy = cy + (rng() - 0.5) * S * 0.4;
    grass.moveTo(gx, gy);
    grass.lineTo(gx + (rng() - 0.5) * 3, gy - 3 - rng() * 2);
  }
  paths.push({ path: grass, color: '#8FD46250' });
  return paths;
}

// Basit deterministik RNG (seed bazli)
function simpleRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return (s % 10000) / 10000;
  };
}

function makeSeaPaths(_cx: number, _cy: number, _seed: number) {
  return []; // Deniz: sadece base renk yeterli
}

function makeCoastPaths(cx: number, cy: number, seed: number) {
  const rng = simpleRng(seed);
  const wave = Skia.Path.Make();
  const wy = cy + (rng() - 0.5) * S * 0.2;
  wave.moveTo(cx - S * 0.3, wy);
  wave.cubicTo(cx - S * 0.1, wy - 2, cx + S * 0.1, wy + 1.5, cx + S * 0.3, wy);
  return [{ path: wave, color: '#80C8F830' }];
}

function makeLakePaths(cx: number, cy: number, seed: number) {
  const rng = simpleRng(seed);
  const shimmer = Skia.Path.Make();
  shimmer.moveTo(cx - 2, cy);
  shimmer.cubicTo(cx - 1, cy - 1, cx + 1, cy - 1, cx + 2, cy);
  return [{ path: shimmer, color: '#FFFFFF20' }];
}

function makeShorePaths(cx: number, cy: number, seed: number) {
  const rng = simpleRng(seed);
  const sand = Skia.Path.Make();
  sand.moveTo(cx - S * 0.3, cy);
  sand.cubicTo(cx - S * 0.1, cy - 1.5, cx + S * 0.2, cy + 1, cx + S * 0.35, cy);
  return [{ path: sand, color: '#D4C09830' }];
}

function getTerrainDecorations(terrain: HexTerrain, cx: number, cy: number, q: number, r: number) {
  const seed = q * 1000 + r * 31 + 7919;
  switch (terrain) {
    case HexTerrain.Sea: return makeSeaPaths(cx, cy, seed);
    case HexTerrain.Coast: return makeCoastPaths(cx, cy, seed);
    case HexTerrain.Forest: return makeTreePaths(cx, cy, seed);
    case HexTerrain.Mountain: return makeMountainPaths(cx, cy, seed);
    case HexTerrain.River: return makeWavePaths(cx, cy, seed);
    case HexTerrain.Desert: return makeDesertPaths(cx, cy, seed);
    case HexTerrain.Swamp: return makeSwampPaths(cx, cy, seed);
    case HexTerrain.Plains: return makePlainsPaths(cx, cy, seed);
    case HexTerrain.Lake: return makeLakePaths(cx, cy, seed);
    case HexTerrain.Shore: return makeShorePaths(cx, cy, seed);
    case HexTerrain.Hills: return makeHillsPaths(cx, cy, seed);
    case HexTerrain.Fertile: return makeFertilePaths(cx, cy, seed);
    default: return [];
  }
}

function makeHillsPaths(cx: number, cy: number, seed: number) {
  const rng = simpleRng(seed);
  const hill = Skia.Path.Make();
  const hw = S * 0.35;
  hill.moveTo(cx - hw, cy + S * 0.05);
  hill.cubicTo(cx - hw * 0.3, cy - S * 0.15, cx + hw * 0.3, cy - S * 0.12, cx + hw, cy + S * 0.05);
  return [{ path: hill, color: '#5A7A3840' }];
}

function makeFertilePaths(cx: number, cy: number, seed: number) {
  const rng = simpleRng(seed);
  const grass = Skia.Path.Make();
  for (let i = 0; i < 3; i++) {
    const gx = cx + (rng() - 0.5) * S * 0.6;
    const gy = cy + (rng() - 0.5) * S * 0.4;
    grass.moveTo(gx, gy);
    grass.lineTo(gx + (rng() - 0.5) * 2, gy - 3 - rng() * 2);
  }
  const flower = Skia.Path.Make();
  flower.addCircle(cx + (rng() - 0.5) * S * 0.4, cy + (rng() - 0.5) * S * 0.3, 1.5);
  return [
    { path: grass, color: '#50A83060' },
    { path: flower, color: '#FFD54F70' },
  ];
}

// ===== COMPONENT =====

export interface HexMapRef {
  focusOnHex: (q: number, r: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

interface Props {
  onBattleResult?: (result: import('../engine/combat').BattleResult) => void;
  showGrid?: boolean;
  showFogOfWar?: boolean;
  dayPhase?: 'dawn' | 'day' | 'dusk' | 'night';
}

const DAY_TINT: Record<string, string> = {
  dawn: '#FF880015',
  day: '#00000000',
  dusk: '#FF440020',
  night: '#0A0A3040',
};

const HexMapRenderer = forwardRef<HexMapRef, Props>(function HexMapRenderer({
  onBattleResult, showGrid = true, showFogOfWar = true, dayPhase = 'day',
}, ref) {
  const map = useGameStore(s => s.map);
  const selectedHex = useGameStore(s => s.selectedHex);
  const selectHex = useGameStore(s => s.selectHex);
  const currentPlayerId = useGameStore(s => s.currentPlayerId);
  const players = useGameStore(s => s.players);
  const moveMode = useGameStore(s => s.moveMode);
  const moveFrom = useGameStore(s => s.moveFrom);
  const moveTargets = useGameStore(s => s.moveTargets);
  const moveArmy = useGameStore(s => s.moveArmy);
  const exitMoveMode = useGameStore(s => s.exitMoveMode);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const canvasWidth = useSharedValue(SCREEN_W);
  const canvasHeight = useSharedValue(SCREEN_H - 160);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    canvasWidth.value = e.nativeEvent.layout.width;
    canvasHeight.value = e.nativeEvent.layout.height;
  }, []);

  useImperativeHandle(ref, () => ({
    focusOnHex: (q: number, r: number) => {
      const { x, y } = hexToPixel(q, r);
      translateX.value = withTiming(-x, { duration: 400 });
      translateY.value = withTiming(-y, { duration: 400 });
      scale.value = withTiming(1.2, { duration: 400 });
    },
    zoomIn: () => {
      scale.value = withTiming(Math.min(3, scale.value * 1.4), { duration: 250 });
    },
    zoomOut: () => {
      scale.value = withTiming(Math.max(0.3, scale.value / 1.4), { duration: 250 });
    },
  }));

  const currentPlayer = players.find(p => p.id === currentPlayerId);
  const hasFocused = useRef(false);
  useEffect(() => {
    if (currentPlayer?.castleCoord && !hasFocused.current) {
      hasFocused.current = true;
      const { q, r } = currentPlayer.castleCoord;
      const { x, y } = hexToPixel(q, r);
      translateX.value = -x;
      translateY.value = -y;
      scale.value = 1.2;
    }
  }, [currentPlayer?.castleCoord]);

  // Gestures
  const panGesture = Gesture.Pan()
    .onStart(() => { savedTranslateX.value = translateX.value; savedTranslateY.value = translateY.value; })
    .onUpdate((e) => { translateX.value = savedTranslateX.value + e.translationX; translateY.value = savedTranslateY.value + e.translationY; })
    .onEnd((e) => { translateX.value = withDecay({ velocity: e.velocityX, deceleration: 0.997 }); translateY.value = withDecay({ velocity: e.velocityY, deceleration: 0.997 }); });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => { savedScale.value = scale.value; })
    .onUpdate((e) => { scale.value = Math.max(0.3, Math.min(3, savedScale.value * e.scale)); });

  const handleTap = useCallback((x: number, y: number) => {
    const cx = canvasWidth.value / 2;
    const cy = canvasHeight.value / 2;
    const mapX = (x - cx - translateX.value) / scale.value;
    const mapY = (y - cy - translateY.value) / scale.value;
    const hexCoord = pixelToHex(mapX, mapY);
    const key = hexKey(hexCoord.q, hexCoord.r);
    if (!map.has(key)) return;

    if (moveMode && moveFrom) {
      const isTarget = moveTargets.some(t => t.q === hexCoord.q && t.r === hexCoord.r);
      if (isTarget) {
        const result = moveArmy(moveFrom, hexCoord);
        exitMoveMode();
        if (result && onBattleResult) onBattleResult(result);
      } else {
        exitMoveMode();
      }
      return;
    }
    selectHex(hexCoord);
  }, [map, moveMode, moveFrom, moveTargets, moveArmy, exitMoveMode, onBattleResult, selectHex]);

  const tapGesture = Gesture.Tap()
    .onEnd((e) => {
      'worklet';
      runOnJS(handleTap)(e.x, e.y);
    });

  const composed = Gesture.Simultaneous(panGesture, pinchGesture);
  const allGestures = Gesture.Exclusive(tapGesture, composed);

  const hexRenderData = useMemo(() => {
    const data: {
      key: string;
      cx: number; cy: number;
      tile: HexTile;
      palette: typeof TERRAIN_PALETTE[HexTerrain.Plains];
      isExploredOnly: boolean;
      ownerColor: string | null;
      buildingIcon: string | null;
      armyIcon: string | null;
      armyCount: number;
      isMoveTarget: boolean;
      isAttackTarget: boolean;
      isSelected: boolean;
      decorations: { path: ReturnType<typeof Skia.Path.Make>; color: string }[];
    }[] = [];

    const playerColorMap = new Map<string, string>();
    for (const p of players) playerColorMap.set(p.id, p.color);

    for (const [key, tile] of map) {
      const isVisible = showFogOfWar ? tile.visible : true;
      const isExplored = showFogOfWar ? tile.explored : true;
      if (!isExplored && !isVisible) continue;

      const { x: rawX, y: rawY } = hexToPixel(tile.coord.q, tile.coord.r);
      const cx = rawX + CC;
      const cy = rawY + CC;
      const palette = TERRAIN_PALETTE[tile.terrain];
      const isExploredOnly = !isVisible && isExplored;

      const isMoveTarget = moveMode && moveTargets.some(t => t.q === tile.coord.q && t.r === tile.coord.r);
      const isAttackTarget = isMoveTarget && tile.army !== null && tile.army.ownerId !== currentPlayerId;
      const isSelected = !!(selectedHex && selectedHex.q === tile.coord.q && selectedHex.r === tile.coord.r);

      const ownerColor = tile.ownerId ? (playerColorMap.get(tile.ownerId) ?? null) : null;
      const buildingIcon = tile.building && isVisible ? BUILDING_ICONS[tile.building.type] : null;

      let armyIcon: string | null = null;
      let armyCount = 0;
      if (tile.army && isVisible) {
        const mainUnit = tile.army.units.reduce((best, u) => u.count > best.count ? u : best, tile.army.units[0]);
        armyIcon = UNIT_ICONS[mainUnit.type];
        armyCount = tile.army.units.reduce((s, u) => s + u.count, 0);
      }

      // Terrain dekorasyonlari — overflow ile (sinirlari asar)
      const decorations = isVisible
        ? getTerrainDecorations(tile.terrain, cx, cy, tile.coord.q, tile.coord.r)
        : [];

      data.push({
        key, cx, cy, tile, palette, isExploredOnly, ownerColor,
        buildingIcon, armyIcon, armyCount, isMoveTarget, isAttackTarget,
        isSelected, decorations,
      });
    }
    return data;
  }, [map, selectedHex, players, moveMode, moveTargets, currentPlayerId]);

  // Fog hexleri - TEK PATH'te birlestir (performans)
  const fogPath = useMemo(() => {
    if (!showFogOfWar) return null;
    const path = Skia.Path.Make();
    for (const [, tile] of map) {
      if (!tile.explored && !tile.visible) {
        const { x: rx, y: ry } = hexToPixel(tile.coord.q, tile.coord.r);
        const corners = getHexCorners(rx + CC, ry + CC, HEX_SIZE);
        path.moveTo(corners[0].x, corners[0].y);
        for (let i = 1; i < 6; i++) path.lineTo(corners[i].x, corners[i].y);
        path.close();
      }
    }
    return path;
  }, [map, showFogOfWar]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: canvasWidth.value / 2 + translateX.value },
      { translateY: canvasHeight.value / 2 + translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={styles.container} onLayout={onLayout}>
      <GestureDetector gesture={allGestures}>
        <Animated.View style={[styles.canvasWrapper, animatedStyle]}>
          <Canvas style={styles.canvas}>
            {hexRenderData.map((hex) => {
              const { cx, cy, palette, isExploredOnly, tile } = hex;
              const fogAlpha = isExploredOnly ? '60' : 'FF';

              return (
                <Group key={hex.key}>
                  {/* Base fill — hafif buyuk hex, bosluk olmasin */}
                  <Path path={makeHexPath(cx, cy, S + 0.5)} color={palette.base + fogAlpha} style="fill" />

                  {/* Terrain dekorasyonlari */}
                  {!isExploredOnly && hex.decorations.map((dec, i) => (
                    <Path
                      key={`d-${i}`}
                      path={dec.path}
                      color={dec.color}
                      style={dec.path.getBounds().width > 2 ? 'fill' : 'stroke'}
                      strokeWidth={1.2}
                      strokeCap="round"
                    />
                  ))}

                  {/* Sahiplik overlay */}
                  {hex.ownerColor && (showFogOfWar ? tile.visible : true) && (
                    <Path
                      path={makeHexPath(cx, cy, S - 2)}
                      color={hex.ownerColor + '20'}
                      style="fill"
                    />
                  )}

                  {/* Hareket hedef */}
                  {hex.isMoveTarget && (
                    <Path
                      path={makeHexPath(cx, cy, S - 1)}
                      color={hex.isAttackTarget ? COLORS.red + '40' : COLORS.green + '40'}
                      style="fill"
                    />
                  )}

                  {/* Secim */}
                  {hex.isSelected && (
                    <>
                      <Path path={makeHexPath(cx, cy, S)} color={COLORS.selection + '30'} style="fill" />
                      <Path path={makeHexPath(cx, cy, S + 1)} color={COLORS.selection + '80'} style="stroke" strokeWidth={2} />
                    </>
                  )}
                </Group>
              );
            })}

            {/* Fog — tek path */}
            {fogPath && <Path path={fogPath} color="#0A1018" style="fill" />}
          </Canvas>
        </Animated.View>
      </GestureDetector>

      {/* Day/night tint */}
      {dayPhase !== 'day' && (
        <View style={[styles.dayNightOverlay, { backgroundColor: DAY_TINT[dayPhase] }]} pointerEvents="none" />
      )}

      {/* Emoji overlay */}
      <EmojiOverlay
        hexRenderData={hexRenderData}
        translateX={translateX}
        translateY={translateY}
        scale={scale}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
      />
    </View>
  );
});

export default HexMapRenderer;

// ===== EMOJI OVERLAY =====

function EmojiOverlay({
  hexRenderData, translateX, translateY, scale, canvasWidth, canvasHeight,
}: {
  hexRenderData: { cx: number; cy: number; buildingIcon: string | null; armyIcon: string | null; armyCount: number; ownerColor: string | null; tile: HexTile }[];
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  scale: SharedValue<number>;
  canvasWidth: SharedValue<number>;
  canvasHeight: SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: canvasWidth.value / 2 + translateX.value },
      { translateY: canvasHeight.value / 2 + translateY.value },
      { scale: scale.value },
    ],
  }));

  const icons = useMemo(() => hexRenderData.filter(h => h.buildingIcon || h.armyIcon), [hexRenderData]);

  if (icons.length === 0) return null;

  return (
    <Animated.View style={[styles.emojiOverlay, animatedStyle]} pointerEvents="none">
      {icons.map((hex, i) => (
        <View key={i} style={[styles.emojiContainer, { left: hex.cx - 14, top: hex.cy - 16 }]}>
          {hex.buildingIcon && (
            <Animated.Text style={styles.emojiText}>{hex.buildingIcon}</Animated.Text>
          )}
          {hex.armyIcon && (
            <View style={[styles.armyBadge, hex.ownerColor ? { borderColor: hex.ownerColor + '80', borderWidth: 1.5 } : undefined]}>
              <Animated.Text style={styles.emojiTextSmall}>{hex.armyIcon}</Animated.Text>
              <View style={styles.armyCountBg}>
                <Animated.Text style={styles.armyCountText}>{hex.armyCount}</Animated.Text>
              </View>
              {hex.tile.army && (
                <View style={styles.armyPowerBg}>
                  <Animated.Text style={styles.armyPowerText}>⚔{hex.tile.army.totalPower}</Animated.Text>
                </View>
              )}
            </View>
          )}
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080E14',
    overflow: 'hidden',
  },
  canvasWrapper: {
    position: 'absolute',
    width: 2000,
    height: 2000,
    left: -1000,
    top: -1000,
  },
  canvas: { flex: 1 },
  dayNightOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  emojiOverlay: {
    position: 'absolute',
    width: 2000,
    height: 2000,
    left: -1000,
    top: -1000,
  },
  emojiContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 34,
  },
  emojiText: {
    fontSize: 16,
    textShadowColor: '#00000090',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1.5 },
  },
  emojiTextSmall: { fontSize: 12 },
  armyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#00000050',
    borderRadius: 6,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  armyCountBg: {
    backgroundColor: '#D4382C',
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingVertical: 0.5,
    minWidth: 14,
    alignItems: 'center' as const,
  },
  armyCountText: {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  armyPowerBg: {
    backgroundColor: '#1A1A2ECC',
    borderRadius: 3,
    paddingHorizontal: 2,
    paddingVertical: 0.5,
  },
  armyPowerText: {
    color: '#FFD700',
    fontSize: 6,
    fontWeight: '800',
  },
});
