import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Canvas, Path, Skia, Group } from '@shopify/react-native-skia';
import { useGameStore } from '../store/gameStore';
import { hexToPixel, getHexCorners } from '../engine/hexUtils';
import { HEX_SIZE, TERRAIN_COLORS, MAP_RADIUS } from '../constants/game';
import { COLORS } from '../constants/theme';

const MINI_SIZE = 120;
// Harita piksel boyutunu hesapla ve minimap'e sığdır
const MAP_PIXEL_RANGE = MAP_RADIUS * HEX_SIZE * 2.2;
const MINI_SCALE = MINI_SIZE / MAP_PIXEL_RANGE;
const MINI_HEX_SIZE = HEX_SIZE * MINI_SCALE;
const MINI_CENTER = MINI_SIZE / 2;

interface Props {
  onTapHex?: (q: number, r: number) => void;
}

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

export default function Minimap({ onTapHex }: Props) {
  const map = useGameStore(s => s.map);
  const players = useGameStore(s => s.players);
  const currentPlayerId = useGameStore(s => s.currentPlayerId);

  const miniHexData = useMemo(() => {
    const data: {
      path: ReturnType<typeof Skia.Path.Make>;
      color: string;
    }[] = [];

    const playerColorMap = new Map<string, string>();
    for (const p of players) {
      playerColorMap.set(p.id, p.color);
    }

    for (const [, tile] of map) {
      if (!tile.explored && !tile.visible) continue;

      const { x, y } = hexToPixel(tile.coord.q, tile.coord.r);
      const mx = x * MINI_SCALE + MINI_CENTER;
      const my = y * MINI_SCALE + MINI_CENTER;

      const path = makeHexPath(mx, my, MINI_HEX_SIZE);

      // Renk: sahiplik varsa oyuncu rengi, yoksa terrain rengi
      let color: string;
      if (tile.ownerId) {
        color = playerColorMap.get(tile.ownerId) ?? TERRAIN_COLORS[tile.terrain];
      } else if (!tile.visible && tile.explored) {
        color = '#1a1a2e';
      } else {
        color = TERRAIN_COLORS[tile.terrain];
      }

      data.push({ path, color });
    }

    return data;
  }, [map, players]);

  // Kale ikonlari
  const castleMarkers = useMemo(() => {
    return players
      .filter(p => p.castleCoord !== null)
      .map(p => {
        const { x, y } = hexToPixel(p.castleCoord!.q, p.castleCoord!.r);
        return {
          cx: x * MINI_SCALE + MINI_CENTER,
          cy: y * MINI_SCALE + MINI_CENTER,
          color: p.color,
          isCurrent: p.id === currentPlayerId,
        };
      });
  }, [players, currentPlayerId]);

  const handleTap = () => {
    // Kendi kaleye odaklan
    const player = players.find(p => p.id === currentPlayerId);
    if (player?.castleCoord && onTapHex) {
      onTapHex(player.castleCoord.q, player.castleCoord.r);
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handleTap}
      activeOpacity={0.8}
    >
      <Canvas style={styles.canvas}>
        {/* Arkaplan */}
        <Path
          path={Skia.Path.Make().addRect(Skia.XYWHRect(0, 0, MINI_SIZE, MINI_SIZE))}
          color={COLORS.bg}
          style="fill"
        />

        {/* Hex'ler */}
        {miniHexData.map((hex, i) => (
          <Path
            key={i}
            path={hex.path}
            color={hex.color}
            style="fill"
          />
        ))}

        {/* Kale isaretleri */}
        {castleMarkers.map((marker, i) => {
          const markerPath = Skia.Path.Make();
          markerPath.addCircle(marker.cx, marker.cy, marker.isCurrent ? 4 : 3);
          return (
            <Group key={`castle-${i}`}>
              <Path
                path={markerPath}
                color={marker.color}
                style="fill"
              />
              {marker.isCurrent && (
                <Path
                  path={(() => {
                    const p = Skia.Path.Make();
                    p.addCircle(marker.cx, marker.cy, 5);
                    return p;
                  })()}
                  color={COLORS.selection}
                  style="stroke"
                  strokeWidth={1}
                />
              )}
            </Group>
          );
        })}
      </Canvas>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: MINI_SIZE,
    height: MINI_SIZE,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    backgroundColor: COLORS.bg,
  },
  canvas: {
    flex: 1,
  },
});
