import React, { useRef, useEffect, useCallback } from 'react';
import { View, Dimensions, Platform } from 'react-native';
import { HexTile, HexTerrain, hexKey } from '../types/game';
import { hexToPixel, getHexCorners } from '../engine/hexUtils';
import { TERRAIN_COLORS, HEX_SIZE, RIVER_COLOR } from '../constants/game';
import { COLORS } from '../constants/theme';
import { RiverSegment } from '../engine/rivers';
import { Burg } from '../engine/burgGenerator';
import { Route } from '../engine/routeGenerator';
import { Marker } from '../engine/markerGenerator';
import { State } from '../engine/stateGenerator';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Ocean derinlik renkleri
const OCEAN_DEPTH_COLORS = [
  '#2A6FA8', '#245F95', '#1E5082', '#18416F', '#12325C', '#0C2349',
];

interface MapRendererProps {
  tiles: Map<string, HexTile>;
  rivers: RiverSegment[];
  burgs: Burg[];
  routes: Route[];
  markers: Marker[];
  states: State[];
  stateMap: Map<string, number>;
  oceanDepthMap: Map<string, number>;
  iceCells: Set<string>;
  cameraX: number;
  cameraY: number;
  zoom: number;
  selectedHex: { q: number; r: number } | null;
  players: { id: string; color: string }[];
  // Layer visibility
  showBiomes: boolean;
  showRivers: boolean;
  showBorders: boolean;
  showRoutes: boolean;
  showBurgs: boolean;
  showMarkers: boolean;
  showGrid: boolean;
}

export const MapRenderer: React.FC<MapRendererProps> = React.memo(({
  tiles, rivers, burgs, routes, markers, states, stateMap, oceanDepthMap,
  iceCells, cameraX, cameraY, zoom, selectedHex, players,
  showBiomes, showRivers, showBorders, showRoutes, showBurgs, showMarkers, showGrid,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const offsetX = w / 2 + cameraX * zoom;
    const offsetY = h / 2 + cameraY * zoom;

    // Clear
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(zoom, zoom);

    // --- Terrain layer ---
    for (const tile of tiles.values()) {
      const { x, y } = hexToPixel(tile.coord.q, tile.coord.r);

      // Viewport culling
      const sx = x * zoom + offsetX;
      const sy = y * zoom + offsetY;
      if (sx < -HEX_SIZE * zoom * 2 || sx > w + HEX_SIZE * zoom * 2) continue;
      if (sy < -HEX_SIZE * zoom * 2 || sy > h + HEX_SIZE * zoom * 2) continue;

      // Fog of war
      if (!tile.explored) {
        drawHex(ctx, x, y, COLORS.fog);
        continue;
      }

      // Terrain color
      let color: string;
      if (showBiomes) {
        if (tile.terrain === HexTerrain.Ocean || tile.terrain === HexTerrain.Coast) {
          const depth = oceanDepthMap.get(hexKey(tile.coord.q, tile.coord.r)) ?? 3;
          color = OCEAN_DEPTH_COLORS[Math.min(depth, OCEAN_DEPTH_COLORS.length - 1)];
        } else {
          color = getElevationTintedColor(tile);
        }
      } else {
        color = TERRAIN_COLORS[tile.terrain];
      }

      drawHex(ctx, x, y, color);

      // Ice overlay
      if (iceCells.has(hexKey(tile.coord.q, tile.coord.r))) {
        drawHex(ctx, x, y, '#E8EDF0AA');
      }

      // Owner overlay
      if (tile.ownerId) {
        const player = players.find(p => p.id === tile.ownerId);
        if (player) drawHex(ctx, x, y, player.color + '44');
      }

      // Fog (explored but not visible)
      if (!tile.visible) {
        drawHex(ctx, x, y, COLORS.fogExplored);
      }

      // Grid lines
      if (showGrid) {
        drawHexOutline(ctx, x, y, '#00000022', 0.5);
      }
    }

    // --- State borders ---
    if (showBorders && stateMap.size > 0) {
      for (const tile of tiles.values()) {
        if (!tile.explored) continue;
        const key = hexKey(tile.coord.q, tile.coord.r);
        const sId = stateMap.get(key);
        if (sId === undefined) continue;

        const { x, y } = hexToPixel(tile.coord.q, tile.coord.r);
        const corners = getHexCorners(x, y, HEX_SIZE);
        const neighbors = [
          { dq: 1, dr: 0 }, { dq: 1, dr: -1 }, { dq: 0, dr: -1 },
          { dq: -1, dr: 0 }, { dq: -1, dr: 1 }, { dq: 0, dr: 1 },
        ];

        for (let i = 0; i < 6; i++) {
          const n = neighbors[i];
          const nKey = hexKey(tile.coord.q + n.dq, tile.coord.r + n.dr);
          const nState = stateMap.get(nKey);
          if (nState !== sId) {
            const state = states[sId];
            ctx.beginPath();
            ctx.moveTo(corners[i].x, corners[i].y);
            ctx.lineTo(corners[(i + 1) % 6].x, corners[(i + 1) % 6].y);
            ctx.strokeStyle = state?.color || '#fff';
            ctx.lineWidth = 2.5;
            ctx.stroke();
          }
        }
      }
    }

    // --- Rivers ---
    if (showRivers) {
      for (const river of rivers) {
        if (river.path.length < 2) continue;
        ctx.beginPath();
        const start = hexToPixel(river.path[0].q, river.path[0].r);
        ctx.moveTo(start.x, start.y);
        for (let i = 1; i < river.path.length; i++) {
          const p = hexToPixel(river.path[i].q, river.path[i].r);
          ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = RIVER_COLOR;
        ctx.lineWidth = Math.min(4, 1 + river.flux * 0.3);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      }
    }

    // --- Routes ---
    if (showRoutes) {
      for (const route of routes) {
        if (route.path.length < 2) continue;
        ctx.beginPath();
        const start = hexToPixel(route.path[0].q, route.path[0].r);
        ctx.moveTo(start.x, start.y);
        for (let i = 1; i < route.path.length; i++) {
          const p = hexToPixel(route.path[i].q, route.path[i].r);
          ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = route.type === 'highway' ? '#D4A843' :
                          route.type === 'road' ? '#AAA' : '#77777788';
        ctx.lineWidth = route.type === 'highway' ? 2 : route.type === 'road' ? 1.5 : 0.8;
        ctx.setLineDash(route.type === 'trail' ? [3, 3] : []);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // --- Burgs ---
    if (showBurgs) {
      for (const burg of burgs) {
        const { x, y } = hexToPixel(burg.coord.q, burg.coord.r);
        const size = burg.isCapital ? 6 : burg.population > 2000 ? 4 : 3;

        // Burg circle
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = burg.isCapital ? '#FFD700' : '#FFF';
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = burg.isCapital ? 2 : 1;
        ctx.stroke();

        // Name label (zoomed in only)
        if (zoom > 0.8 || burg.isCapital) {
          ctx.fillStyle = '#000';
          ctx.strokeStyle = '#FFF';
          ctx.lineWidth = 2.5;
          ctx.font = burg.isCapital ? 'bold 10px sans-serif' : '8px sans-serif';
          ctx.textAlign = 'center';
          ctx.strokeText(burg.name, x, y - size - 3);
          ctx.fillText(burg.name, x, y - size - 3);
        }
      }
    }

    // --- Markers ---
    if (showMarkers) {
      for (const marker of markers) {
        const { x, y } = hexToPixel(marker.coord.q, marker.coord.r);
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(marker.icon, x, y + 4);
      }
    }

    // --- Selection highlight ---
    if (selectedHex) {
      const { x, y } = hexToPixel(selectedHex.q, selectedHex.r);
      drawHexOutline(ctx, x, y, '#FFD700', 3);
    }

    ctx.restore();
  }, [tiles, rivers, burgs, routes, markers, states, stateMap, oceanDepthMap,
      iceCells, cameraX, cameraY, zoom, selectedHex, players,
      showBiomes, showRivers, showBorders, showRoutes, showBurgs, showMarkers, showGrid]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = SCREEN_W;
    canvas.height = SCREEN_H;
    draw();
  }, []);

  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1 }}>
        <canvas
          ref={canvasRef as any}
          width={SCREEN_W}
          height={SCREEN_H}
          style={{ width: '100%', height: '100%' } as any}
        />
      </View>
    );
  }

  // Fallback for native: basit View-based rendering
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }} />
  );
});

// --- Helper functions ---

function drawHex(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string): void {
  const corners = getHexCorners(cx, cy, HEX_SIZE);
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < 6; i++) ctx.lineTo(corners[i].x, corners[i].y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawHexOutline(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string, lineWidth: number): void {
  const corners = getHexCorners(cx, cy, HEX_SIZE);
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < 6; i++) ctx.lineTo(corners[i].x, corners[i].y);
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function getElevationTintedColor(tile: HexTile): string {
  const base = TERRAIN_COLORS[tile.terrain];
  // Elevation-based brightness
  const elev = tile.elevation;
  const factor = 0.7 + elev * 0.5;
  return tintColor(base, factor);
}

function tintColor(hex: string, factor: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  let r = Math.min(255, Math.floor(((num >> 16) & 0xff) * factor));
  let g = Math.min(255, Math.floor(((num >> 8) & 0xff) * factor));
  let b = Math.min(255, Math.floor((num & 0xff) * factor));
  return `rgb(${r},${g},${b})`;
}
