import React, { useMemo, useCallback, useRef } from 'react';
import { View, StyleSheet, Dimensions, LayoutChangeEvent } from 'react-native';
import {
  Canvas, Path, Skia, Group, Text as SkiaText,
  useFont, matchFont, Fill,
} from '@shopify/react-native-skia';
import {
  Gesture, GestureDetector, GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withDecay,
} from 'react-native-reanimated';
import { useGameStore } from '../store/gameStore';
import { hexToPixel, getHexCorners, pixelToHex } from '../engine/hexUtils';
import { HexTile, HexCoord, hexKey } from '../types/game';
import { HEX_SIZE, TERRAIN_COLORS, BUILDING_ICONS, UNIT_ICONS } from '../constants/game';
import { COLORS } from '../constants/theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Hex path olustur (Skia Path)
function makeHexPath(cx: number, cy: number, size: number): ReturnType<typeof Skia.Path.Make> {
  const path = Skia.Path.Make();
  const corners = getHexCorners(cx, cy, size);
  path.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < corners.length; i++) {
    path.lineTo(corners[i].x, corners[i].y);
  }
  path.close();
  return path;
}

interface Props {
  onBattleResult?: (result: import('../engine/combat').BattleResult) => void;
}

export default function HexMapRenderer({ onBattleResult }: Props = {}) {
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

  // Camera: pan offset + zoom
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const savedScale = useSharedValue(1);

  // Canvas boyutu
  const canvasWidth = useSharedValue(SCREEN_W);
  const canvasHeight = useSharedValue(SCREEN_H - 160);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    canvasWidth.value = e.nativeEvent.layout.width;
    canvasHeight.value = e.nativeEvent.layout.height;
  }, []);

  // Pan gesture
  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd((e) => {
      translateX.value = withDecay({ velocity: e.velocityX, deceleration: 0.997 });
      translateY.value = withDecay({ velocity: e.velocityY, deceleration: 0.997 });
    });

  // Pinch gesture (zoom)
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      const newScale = savedScale.value * e.scale;
      scale.value = Math.max(0.3, Math.min(3, newScale));
    });

  // Tap gesture (hex secimi veya hareket)
  const tapGesture = Gesture.Tap()
    .onEnd((e) => {
      // Ekran koordinatini harita koordinatina cevir
      const cx = canvasWidth.value / 2;
      const cy = canvasHeight.value / 2;
      const mapX = (e.x - cx - translateX.value) / scale.value;
      const mapY = (e.y - cy - translateY.value) / scale.value;

      const hexCoord = pixelToHex(mapX, mapY);
      const key = hexKey(hexCoord.q, hexCoord.r);

      if (!map.has(key)) return;

      // Hareket modundaysa hedefe tasi
      if (moveMode && moveFrom) {
        const isTarget = moveTargets.some(t => t.q === hexCoord.q && t.r === hexCoord.r);
        if (isTarget) {
          const result = moveArmy(moveFrom, hexCoord);
          exitMoveMode();
          if (result && onBattleResult) {
            onBattleResult(result);
          }
        } else {
          exitMoveMode();
        }
        return;
      }

      selectHex(hexCoord);
    });

  const composed = Gesture.Simultaneous(panGesture, pinchGesture);
  const allGestures = Gesture.Exclusive(tapGesture, composed);

  // Tum hex'leri render datasi olarak hazirla
  const hexRenderData = useMemo(() => {
    const data: {
      key: string;
      path: ReturnType<typeof Skia.Path.Make>;
      color: string;
      borderColor: string;
      borderWidth: number;
      cx: number;
      cy: number;
      tile: HexTile;
      ownerColor: string | null;
      buildingIcon: string | null;
      armyIcon: string | null;
      armyCount: number;
      isMoveTarget: boolean;
      isAttackTarget: boolean;
    }[] = [];

    const playerColorMap = new Map<string, string>();
    for (const p of players) {
      playerColorMap.set(p.id, p.color);
    }

    for (const [key, tile] of map) {
      // Fog of war: gorunmeyen hex'leri atla (explored olanlari koyulastir)
      if (!tile.explored && !tile.visible) continue;

      const { x: cx, y: cy } = hexToPixel(tile.coord.q, tile.coord.r);
      const path = makeHexPath(cx, cy, HEX_SIZE - 1);

      // Renk belirleme
      let color = TERRAIN_COLORS[tile.terrain];
      let borderColor = COLORS.border;
      let borderWidth = 0.5;

      if (!tile.visible && tile.explored) {
        // Kesfedilmis ama gorunmuyor -> koyulastir
        color = blendColor(color, COLORS.fog, 0.6);
      }

      // Hareket hedefi mi?
      const isMoveTarget = moveMode && moveTargets.some(
        t => t.q === tile.coord.q && t.r === tile.coord.r
      );
      const isAttackTarget = isMoveTarget && tile.army !== null &&
        tile.army.ownerId !== currentPlayerId;

      // Secili hex
      const isSelected = selectedHex &&
        selectedHex.q === tile.coord.q &&
        selectedHex.r === tile.coord.r;

      if (isMoveTarget) {
        borderColor = isAttackTarget ? COLORS.red : COLORS.green;
        borderWidth = 2.5;
      } else if (isSelected) {
        borderColor = COLORS.selection;
        borderWidth = 2;
      }

      // Sahiplik rengi
      const ownerColor = tile.ownerId ? (playerColorMap.get(tile.ownerId) ?? null) : null;

      // Bina ikonu
      const buildingIcon = tile.building && tile.visible
        ? BUILDING_ICONS[tile.building.type]
        : null;

      // Ordu ikonu
      let armyIcon: string | null = null;
      let armyCount = 0;
      if (tile.army && tile.visible) {
        const mainUnit = tile.army.units.reduce(
          (best, u) => (u.count > best.count ? u : best),
          tile.army.units[0]
        );
        armyIcon = UNIT_ICONS[mainUnit.type];
        armyCount = tile.army.units.reduce((s, u) => s + u.count, 0);
      }

      data.push({
        key, path, color, borderColor, borderWidth,
        cx, cy, tile, ownerColor, buildingIcon, armyIcon, armyCount,
        isMoveTarget, isAttackTarget,
      });
    }

    return data;
  }, [map, selectedHex, players, moveMode, moveTargets, currentPlayerId]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: canvasWidth.value / 2 + translateX.value },
      { translateY: canvasHeight.value / 2 + translateY.value },
      { scale: scale.value },
    ],
  }));

  // Fog hexleri: kesfedilmemis hexler
  const fogHexPaths = useMemo(() => {
    const paths: ReturnType<typeof Skia.Path.Make>[] = [];
    for (const [, tile] of map) {
      if (!tile.explored && !tile.visible) {
        const { x: cx, y: cy } = hexToPixel(tile.coord.q, tile.coord.r);
        paths.push(makeHexPath(cx, cy, HEX_SIZE));
      }
    }
    return paths;
  }, [map]);

  return (
    <View style={styles.container} onLayout={onLayout}>
      <GestureDetector gesture={allGestures}>
        <Animated.View style={[styles.canvasWrapper, animatedStyle]}>
          <Canvas style={styles.canvas}>
            {/* Terrain hexleri */}
            {hexRenderData.map((hex) => (
              <Group key={hex.key}>
                {/* Hex dolgu */}
                <Path
                  path={hex.path}
                  color={hex.color}
                  style="fill"
                />
                {/* Sahiplik overlay */}
                {hex.ownerColor && hex.tile.visible && (
                  <Path
                    path={hex.path}
                    color={hex.ownerColor + '30'}
                    style="fill"
                  />
                )}
                {/* Hareket/saldiri hedef overlay */}
                {hex.isMoveTarget && (
                  <Path
                    path={hex.path}
                    color={hex.isAttackTarget ? COLORS.attackHighlight : COLORS.moveHighlight}
                    style="fill"
                  />
                )}
                {/* Hex kenar */}
                <Path
                  path={hex.path}
                  color={hex.borderColor}
                  style="stroke"
                  strokeWidth={hex.borderWidth}
                />
              </Group>
            ))}

            {/* Fog hexleri */}
            {fogHexPaths.map((path, i) => (
              <Path
                key={`fog-${i}`}
                path={path}
                color={COLORS.fog}
                style="fill"
              />
            ))}
          </Canvas>
        </Animated.View>
      </GestureDetector>

      {/* Emoji overlay (Skia Text emoji destegi sinirli, RN Text ile) */}
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
}

// Emoji overlay - bina ve ordu ikonlarini goster
function EmojiOverlay({
  hexRenderData,
  translateX,
  translateY,
  scale,
  canvasWidth,
  canvasHeight,
}: {
  hexRenderData: {
    cx: number; cy: number;
    buildingIcon: string | null;
    armyIcon: string | null;
    armyCount: number;
    tile: HexTile;
  }[];
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

  const icons = useMemo(() => {
    return hexRenderData.filter(h => h.buildingIcon || h.armyIcon);
  }, [hexRenderData]);

  if (icons.length === 0) return null;

  return (
    <Animated.View style={[styles.emojiOverlay, animatedStyle]} pointerEvents="none">
      {icons.map((hex, i) => (
        <View
          key={i}
          style={[
            styles.emojiContainer,
            { left: hex.cx - 12, top: hex.cy - 14 },
          ]}
        >
          {hex.buildingIcon && (
            <Animated.Text style={styles.emojiText}>{hex.buildingIcon}</Animated.Text>
          )}
          {hex.armyIcon && (
            <View style={styles.armyBadge}>
              <Animated.Text style={styles.emojiTextSmall}>{hex.armyIcon}</Animated.Text>
              <Animated.Text style={styles.armyCountText}>{hex.armyCount}</Animated.Text>
            </View>
          )}
        </View>
      ))}
    </Animated.View>
  );
}

// Renk karistirma (basit alpha blend)
function blendColor(fg: string, bg: string, alpha: number): string {
  const parse = (hex: string) => {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16),
    };
  };
  const f = parse(fg);
  const b = parse(bg);
  const blend = (fc: number, bc: number) => Math.round(fc * (1 - alpha) + bc * alpha);
  const r = blend(f.r, b.r);
  const g = blend(f.g, b.g);
  const bl = blend(f.b, b.b);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.fog,
    overflow: 'hidden',
  },
  canvasWrapper: {
    position: 'absolute',
    width: 2000,
    height: 2000,
    left: -1000,
    top: -1000,
  },
  canvas: {
    flex: 1,
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
    width: 24,
    height: 28,
  },
  emojiText: {
    fontSize: 16,
  },
  emojiTextSmall: {
    fontSize: 12,
  },
  armyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  armyCountText: {
    color: COLORS.textPrimary,
    fontSize: 8,
    fontWeight: '700',
  },
});
