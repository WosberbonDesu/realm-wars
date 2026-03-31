import React, { useMemo } from 'react';
import { Canvas, Path, Skia, Group, Text, useFont, Fill } from '@shopify/react-native-skia';
import { Dimensions } from 'react-native';
import { HexTile, HexTerrain, hexKey } from '../types/game';
import { hexToPixel, getHexCorners } from '../engine/hexUtils';
import { useGameStore } from '../store/gameStore';
import { TERRAIN_COLORS, HEX_SIZE, RIVER_COLOR, PLAYER_COLORS } from '../constants/game';
import { COLORS } from '../constants/theme';
import { RiverSegment } from '../engine/rivers';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Hex path oluştur
function makeHexPath(cx: number, cy: number, size: number = HEX_SIZE): ReturnType<typeof Skia.Path.Make> {
  const path = Skia.Path.Make();
  const corners = getHexCorners(cx, cy, size);
  path.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < 6; i++) {
    path.lineTo(corners[i].x, corners[i].y);
  }
  path.close();
  return path;
}

// Terrain rengi (elevation ile degrade)
function getTileColor(tile: HexTile): string {
  const base = TERRAIN_COLORS[tile.terrain];
  return base;
}

// Owner overlay rengi
function getOwnerColor(ownerId: string | null, players: { id: string; color: string }[]): string | null {
  if (!ownerId) return null;
  const player = players.find(p => p.id === ownerId);
  return player ? player.color + '55' : null;
}

interface MapRendererProps {
  tiles: Map<string, HexTile>;
  rivers: RiverSegment[];
  cameraX: number;
  cameraY: number;
  zoom: number;
  selectedHex: { q: number; r: number } | null;
  players: { id: string; color: string }[];
}

export const MapRenderer: React.FC<MapRendererProps> = React.memo(({
  tiles, rivers, cameraX, cameraY, zoom, selectedHex, players,
}) => {
  // Viewport hesapla: sadece görünen tile'ları çiz
  const offsetX = SCREEN_W / 2 + cameraX * zoom;
  const offsetY = SCREEN_H / 2 + cameraY * zoom;

  // Viewport bounds (hex birim cinsinden, ekstra margin)
  const margin = HEX_SIZE * 2;
  const viewLeft = (-offsetX - margin) / zoom;
  const viewRight = (SCREEN_W - offsetX + margin) / zoom;
  const viewTop = (-offsetY - margin) / zoom;
  const viewBottom = (SCREEN_H - offsetY + margin) / zoom;

  // Visible tiles filter
  const visibleTiles = useMemo(() => {
    const result: HexTile[] = [];
    for (const tile of tiles.values()) {
      const { x, y } = hexToPixel(tile.coord.q, tile.coord.r);
      if (x >= viewLeft && x <= viewRight && y >= viewTop && y <= viewBottom) {
        result.push(tile);
      }
    }
    return result;
  }, [tiles, viewLeft, viewRight, viewTop, viewBottom]);

  // River paths
  const riverPaths = useMemo(() => {
    return rivers.map(river => {
      const path = Skia.Path.Make();
      if (river.path.length < 2) return null;
      const start = hexToPixel(river.path[0].q, river.path[0].r);
      path.moveTo(start.x, start.y);
      for (let i = 1; i < river.path.length; i++) {
        const p = hexToPixel(river.path[i].q, river.path[i].r);
        path.lineTo(p.x, p.y);
      }
      return { path, flux: river.flux };
    }).filter(Boolean) as { path: ReturnType<typeof Skia.Path.Make>; flux: number }[];
  }, [rivers]);

  return (
    <Canvas style={{ width: SCREEN_W, height: SCREEN_H }}>
      <Fill color={COLORS.bg} />
      <Group transform={[
        { translateX: offsetX },
        { translateY: offsetY },
        { scale: zoom },
      ]}>
        {/* Terrain tiles */}
        {visibleTiles.map(tile => {
          const { x, y } = hexToPixel(tile.coord.q, tile.coord.r);
          const hexPath = makeHexPath(x, y);
          const color = getTileColor(tile);
          const ownerColor = getOwnerColor(tile.ownerId, players);

          // Fog of war
          if (!tile.explored) {
            return (
              <Path
                key={`${tile.coord.q},${tile.coord.r}`}
                path={makeHexPath(x, y)}
                color={COLORS.fog}
              />
            );
          }

          return (
            <Group key={`${tile.coord.q},${tile.coord.r}`}>
              {/* Base terrain */}
              <Path path={hexPath} color={color} />

              {/* Owner overlay */}
              {ownerColor && (
                <Path path={makeHexPath(x, y)} color={ownerColor} />
              )}

              {/* Fog (explored but not visible) */}
              {!tile.visible && (
                <Path path={makeHexPath(x, y)} color={COLORS.fogExplored} />
              )}

              {/* Hex border */}
              <Path
                path={hexPath}
                color="#00000033"
                style="stroke"
                strokeWidth={0.5}
              />

              {/* River indicator on tile */}
              {tile.hasRiver && (
                <Path
                  path={makeHexPath(x, y, HEX_SIZE * 0.3)}
                  color={RIVER_COLOR + 'AA'}
                />
              )}

              {/* Building indicator */}
              {tile.building && tile.visible && (
                <Path
                  path={makeHexPath(x, y, HEX_SIZE * 0.25)}
                  color="#FFD700"
                />
              )}

              {/* Army indicator */}
              {tile.army && tile.visible && (
                <Path
                  path={makeHexPath(x, y, HEX_SIZE * 0.15)}
                  color="#FF4444"
                />
              )}
            </Group>
          );
        })}

        {/* Rivers */}
        {riverPaths.map((river, i) => (
          <Path
            key={`river-${i}`}
            path={river.path}
            color={RIVER_COLOR}
            style="stroke"
            strokeWidth={Math.min(4, 1 + river.flux * 0.3)}
            strokeCap="round"
            strokeJoin="round"
          />
        ))}

        {/* Selection highlight */}
        {selectedHex && (() => {
          const { x, y } = hexToPixel(selectedHex.q, selectedHex.r);
          return (
            <Path
              path={makeHexPath(x, y, HEX_SIZE + 2)}
              color="#FFD700"
              style="stroke"
              strokeWidth={3}
            />
          );
        })()}
      </Group>
    </Canvas>
  );
});
