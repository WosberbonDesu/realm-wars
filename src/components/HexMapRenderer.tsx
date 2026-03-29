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
} from 'react-native-reanimated';
import { useGameStore } from '../store/gameStore';
import { hexToPixel, getHexCorners, pixelToHex } from '../engine/hexUtils';
import { HexTile, HexCoord, HexTerrain, hexKey } from '../types/game';
import { HEX_SIZE, TERRAIN_PALETTE, BUILDING_ICONS, UNIT_ICONS } from '../constants/game';
import { COLORS } from '../constants/theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const S = HEX_SIZE;

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
// Her terrain tipi icin ic doku cizimleri

function makeTreePaths(cx: number, cy: number, seed: number) {
  const paths: { path: ReturnType<typeof Skia.Path.Make>; color: string }[] = [];
  const rng = simpleRng(seed);

  // 2-3 agac ciz
  const count = 2 + Math.floor(rng() * 2);
  for (let i = 0; i < count; i++) {
    const ox = (rng() - 0.5) * S * 0.7;
    const oy = (rng() - 0.5) * S * 0.5;
    const tx = cx + ox;
    const ty = cy + oy;
    const h = 5 + rng() * 4;

    // Govde
    const trunk = Skia.Path.Make();
    trunk.moveTo(tx, ty);
    trunk.lineTo(tx, ty - h * 0.4);
    paths.push({ path: trunk, color: '#4A3520' });

    // Yapraklar (ucgen)
    const crown = Skia.Path.Make();
    crown.moveTo(tx, ty - h);
    crown.lineTo(tx - h * 0.4, ty - h * 0.3);
    crown.lineTo(tx + h * 0.4, ty - h * 0.3);
    crown.close();
    paths.push({ path: crown, color: i % 2 === 0 ? '#2E7A22' : '#1E5A14' });
  }
  return paths;
}

function makeMountainPaths(cx: number, cy: number, seed: number) {
  const paths: { path: ReturnType<typeof Skia.Path.Make>; color: string }[] = [];
  const rng = simpleRng(seed);

  // Ana dag
  const p = Skia.Path.Make();
  const bw = S * 0.6;
  const bh = S * 0.55;
  p.moveTo(cx - bw * 0.5, cy + bh * 0.2);
  p.lineTo(cx - bw * 0.1 + rng() * 3, cy - bh * 0.5);
  p.lineTo(cx + bw * 0.1, cy - bh * 0.6);  // zirve
  p.lineTo(cx + bw * 0.3 + rng() * 2, cy - bh * 0.3);
  p.lineTo(cx + bw * 0.5, cy + bh * 0.2);
  p.close();
  paths.push({ path: p, color: '#6A5A48' });

  // Kar kapagi
  const snow = Skia.Path.Make();
  snow.moveTo(cx - bw * 0.05, cy - bh * 0.45);
  snow.lineTo(cx + bw * 0.1, cy - bh * 0.6);
  snow.lineTo(cx + bw * 0.25, cy - bh * 0.35);
  snow.close();
  paths.push({ path: snow, color: '#E0E8F0' });

  return paths;
}

function makeWavePaths(cx: number, cy: number, seed: number) {
  const paths: { path: ReturnType<typeof Skia.Path.Make>; color: string }[] = [];
  const rng = simpleRng(seed);

  // Dalga cizgileri
  for (let i = 0; i < 3; i++) {
    const wy = cy - S * 0.2 + i * S * 0.2;
    const wx = cx - S * 0.35 + rng() * 4;
    const wave = Skia.Path.Make();
    wave.moveTo(wx, wy);
    wave.cubicTo(wx + S * 0.15, wy - 3, wx + S * 0.3, wy + 3, wx + S * 0.5, wy);
    paths.push({ path: wave, color: i === 1 ? '#80C8F8' : '#5AAAE860' });
  }
  return paths;
}

function makeDesertPaths(cx: number, cy: number, seed: number) {
  const paths: { path: ReturnType<typeof Skia.Path.Make>; color: string }[] = [];
  const rng = simpleRng(seed);

  // Kum tepeleri
  const dune = Skia.Path.Make();
  const dy = cy + S * 0.1;
  dune.moveTo(cx - S * 0.4, dy);
  dune.cubicTo(cx - S * 0.15, dy - S * 0.2, cx + S * 0.15, dy - S * 0.15, cx + S * 0.4, dy);
  paths.push({ path: dune, color: '#E8C06040' });

  // Kucuk noktalar (kum taneleri)
  for (let i = 0; i < 4; i++) {
    const dot = Skia.Path.Make();
    dot.addCircle(cx + (rng() - 0.5) * S * 0.5, cy + (rng() - 0.5) * S * 0.4, 1);
    paths.push({ path: dot, color: '#F0D88840' });
  }
  return paths;
}

function makeSwampPaths(cx: number, cy: number, seed: number) {
  const paths: { path: ReturnType<typeof Skia.Path.Make>; color: string }[] = [];
  const rng = simpleRng(seed);

  // Su birikintileri
  for (let i = 0; i < 2; i++) {
    const pool = Skia.Path.Make();
    const px = cx + (rng() - 0.5) * S * 0.4;
    const py = cy + (rng() - 0.5) * S * 0.3;
    pool.addOval(Skia.XYWHRect(px - 4, py - 2, 8, 4));
    paths.push({ path: pool, color: '#3A6A5040' });
  }

  // Saz/ot
  for (let i = 0; i < 3; i++) {
    const reed = Skia.Path.Make();
    const rx = cx + (rng() - 0.5) * S * 0.5;
    const ry = cy + (rng() - 0.5) * S * 0.3;
    reed.moveTo(rx, ry);
    reed.lineTo(rx + (rng() - 0.5) * 3, ry - 5 - rng() * 3);
    paths.push({ path: reed, color: '#607848' });
  }
  return paths;
}

function makePlainsPaths(cx: number, cy: number, seed: number) {
  const paths: { path: ReturnType<typeof Skia.Path.Make>; color: string }[] = [];
  const rng = simpleRng(seed);

  // Cimen cizgileri
  for (let i = 0; i < 4; i++) {
    const grass = Skia.Path.Make();
    const gx = cx + (rng() - 0.5) * S * 0.6;
    const gy = cy + (rng() - 0.5) * S * 0.4;
    grass.moveTo(gx, gy);
    grass.lineTo(gx + (rng() - 0.5) * 3, gy - 3 - rng() * 2);
    paths.push({ path: grass, color: '#8FD46250' });
  }
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

function getTerrainDecorations(terrain: HexTerrain, cx: number, cy: number, q: number, r: number) {
  const seed = q * 1000 + r * 31 + 7919; // deterministik
  switch (terrain) {
    case HexTerrain.Forest: return makeTreePaths(cx, cy, seed);
    case HexTerrain.Mountain: return makeMountainPaths(cx, cy, seed);
    case HexTerrain.River: return makeWavePaths(cx, cy, seed);
    case HexTerrain.Desert: return makeDesertPaths(cx, cy, seed);
    case HexTerrain.Swamp: return makeSwampPaths(cx, cy, seed);
    case HexTerrain.Plains: return makePlainsPaths(cx, cy, seed);
    default: return [];
  }
}

// ===== COMPONENT =====

export interface HexMapRef {
  focusOnHex: (q: number, r: number) => void;
}

interface Props {
  onBattleResult?: (result: import('../engine/combat').BattleResult) => void;
  showGrid?: boolean;
  showFogOfWar?: boolean;
}

const HexMapRenderer = forwardRef<HexMapRef, Props>(function HexMapRenderer({
  onBattleResult, showGrid = true, showFogOfWar = true,
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

  const tapGesture = Gesture.Tap()
    .onEnd((e) => {
      const cx = canvasWidth.value / 2;
      const cy = canvasHeight.value / 2;
      const mapX = (e.x - cx - translateX.value) / scale.value;
      const mapY = (e.y - cy - translateY.value) / scale.value;
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
    });

  const composed = Gesture.Simultaneous(panGesture, pinchGesture);
  const allGestures = Gesture.Exclusive(tapGesture, composed);

  // ===== RENDER DATA =====
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

      const { x: cx, y: cy } = hexToPixel(tile.coord.q, tile.coord.r);
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

      // Terrain dekorasyonlari (sadece gorunur hex'ler icin)
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

  // Fog hexleri
  const fogHexPaths = useMemo(() => {
    if (!showFogOfWar) return [];
    const paths: ReturnType<typeof Skia.Path.Make>[] = [];
    for (const [, tile] of map) {
      if (!tile.explored && !tile.visible) {
        const { x: cx, y: cy } = hexToPixel(tile.coord.q, tile.coord.r);
        paths.push(makeHexPath(cx, cy, HEX_SIZE));
      }
    }
    return paths;
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
              const outerPath = makeHexPath(cx, cy, S - 1);
              const innerPath = makeHexPathInset(cx, cy, S, 3);
              const highlightPath = makeHexPathInset(cx, cy, S, 5);

              // Kesfedilmis ama gorunmuyor -> koyulastir
              const fogAlpha = isExploredOnly ? '60' : 'FF';

              return (
                <Group key={hex.key}>
                  {/* 1. Golge (3D derinlik) */}
                  <Path
                    path={makeHexPath(cx + 1.5, cy + 2, S - 1)}
                    color={palette.shadow + '40'}
                    style="fill"
                  />

                  {/* 2. Ana hex dolgu - gradient */}
                  <Group clip={outerPath}>
                    <Path path={outerPath} color={palette.base + fogAlpha} style="fill" />
                    {/* Ust highlight (isik geliyor) */}
                    <Path
                      path={highlightPath}
                      style="fill"
                    >
                      <LinearGradient
                        start={vec(cx, cy - S)}
                        end={vec(cx, cy + S * 0.3)}
                        colors={[palette.light + '50', 'transparent']}
                      />
                    </Path>
                    {/* Alt golge */}
                    <Path
                      path={innerPath}
                      style="fill"
                    >
                      <LinearGradient
                        start={vec(cx, cy + S * 0.2)}
                        end={vec(cx, cy + S)}
                        colors={['transparent', palette.dark + '40']}
                      />
                    </Path>
                  </Group>

                  {/* 3. Terrain dekorasyonlari */}
                  {!isExploredOnly && hex.decorations.map((dec, i) => (
                    <Path
                      key={`dec-${i}`}
                      path={dec.path}
                      color={dec.color}
                      style={dec.path.getBounds().width > 2 ? 'fill' : 'stroke'}
                      strokeWidth={1.2}
                      strokeCap="round"
                    />
                  ))}

                  {/* 4. Sahiplik overlay + kenar */}
                  {hex.ownerColor && (showFogOfWar ? tile.visible : true) && (
                    <>
                      <Path
                        path={outerPath}
                        color={hex.ownerColor + '18'}
                        style="fill"
                      />
                      <Path
                        path={outerPath}
                        color={hex.ownerColor + '50'}
                        style="stroke"
                        strokeWidth={1.5}
                      />
                    </>
                  )}

                  {/* 5. Hareket/saldiri hedef */}
                  {hex.isMoveTarget && (
                    <>
                      <Path
                        path={outerPath}
                        color={hex.isAttackTarget ? COLORS.attackHighlight : COLORS.moveHighlight}
                        style="fill"
                      />
                      <Path
                        path={outerPath}
                        color={hex.isAttackTarget ? COLORS.red + '80' : COLORS.green + '80'}
                        style="stroke"
                        strokeWidth={2}
                      />
                    </>
                  )}

                  {/* 6. Secili hex - parlayan kenar */}
                  {hex.isSelected && (
                    <>
                      <Path
                        path={outerPath}
                        color={COLORS.selectionFill}
                        style="fill"
                      />
                      <Path
                        path={makeHexPath(cx, cy, S + 1)}
                        color={COLORS.selection + 'AA'}
                        style="stroke"
                        strokeWidth={2.5}
                      />
                      <Path
                        path={makeHexPath(cx, cy, S + 3)}
                        color={COLORS.selection + '30'}
                        style="stroke"
                        strokeWidth={2}
                      />
                    </>
                  )}

                  {/* 7. Ince hex grid cizgisi */}
                  {showGrid && !hex.isSelected && !hex.isMoveTarget && (
                    <Path
                      path={outerPath}
                      color={isExploredOnly ? '#1A2A3A40' : '#00000020'}
                      style="stroke"
                      strokeWidth={0.5}
                    />
                  )}
                </Group>
              );
            })}

            {/* Fog hexleri - koyu arka plan */}
            {fogHexPaths.map((path, i) => (
              <Group key={`fog-${i}`}>
                <Path path={path} color="#0A1018" style="fill" />
                <Path path={path} color="#0A1018" style="stroke" strokeWidth={0.5} />
              </Group>
            ))}
          </Canvas>
        </Animated.View>
      </GestureDetector>

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
  hexRenderData: { cx: number; cy: number; buildingIcon: string | null; armyIcon: string | null; armyCount: number; tile: HexTile }[];
  translateX: Animated.SharedValue<number>;
  translateY: Animated.SharedValue<number>;
  scale: Animated.SharedValue<number>;
  canvasWidth: Animated.SharedValue<number>;
  canvasHeight: Animated.SharedValue<number>;
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
            <View style={styles.armyBadge}>
              <Animated.Text style={styles.emojiTextSmall}>{hex.armyIcon}</Animated.Text>
              <View style={styles.armyCountBg}>
                <Animated.Text style={styles.armyCountText}>{hex.armyCount}</Animated.Text>
              </View>
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
    width: 28,
    height: 32,
  },
  emojiText: { fontSize: 18, textShadowColor: '#00000080', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
  emojiTextSmall: { fontSize: 13 },
  armyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  armyCountBg: {
    backgroundColor: '#00000088',
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  armyCountText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },
});
