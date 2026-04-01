import React, { useRef, useEffect, useCallback } from 'react';
import { View, Dimensions, Platform } from 'react-native';
import { HexTile, HexTerrain } from '../types/game';
import { TERRAIN_COLORS, RIVER_COLOR } from '../constants/game';
import { COLORS } from '../constants/theme';
import { Point, VoronoiGraph, VoronoiCell } from '../engine/voronoi';
import { VoronoiRiver, VoronoiBurg, VoronoiState, VoronoiRoute } from '../engine/voronoiMapGenerator';
import { cellKey } from '../engine/voronoiGrid';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const OCEAN_DEPTH_COLORS = [
  '#2E7BBF', '#276DAD', '#205F9B', '#1A5189', '#144377', '#0E3565',
];

const BIOME_COLORS: Record<string, string> = {
  [HexTerrain.Ocean]: '#1B4F82',
  [HexTerrain.Coast]: '#3B8BC4',
  [HexTerrain.Lake]: '#4B9BD5',
  [HexTerrain.Plains]: '#8BC34A',
  [HexTerrain.Forest]: '#2E7D32',
  [HexTerrain.Mountain]: '#8D6E63',
  [HexTerrain.Desert]: '#E8C84A',
  [HexTerrain.Swamp]: '#5D7B5B',
  [HexTerrain.Tundra]: '#B0BEC5',
  [HexTerrain.Snow]: '#ECEFF1',
};

interface MapRendererProps {
  graph: VoronoiGraph | null;
  cellTiles: HexTile[];
  rivers: VoronoiRiver[];
  coastPaths: Point[][];
  burgs: VoronoiBurg[];
  routes: VoronoiRoute[];
  states: VoronoiState[];
  stateMap: Map<string, number>;
  oceanDepthMap: Map<string, number>;
  iceCells: Set<string>;
  mapWidth: number;
  mapHeight: number;
  cameraX: number;
  cameraY: number;
  zoom: number;
  selectedCell: number | null;
  players: { id: string; color: string }[];
  showBiomes: boolean;
  showRivers: boolean;
  showBorders: boolean;
  showRoutes: boolean;
  showBurgs: boolean;
  showMarkers: boolean;
  showGrid: boolean;
}

export const MapRenderer: React.FC<MapRendererProps> = React.memo(({
  graph, cellTiles, rivers, coastPaths, burgs, routes,
  states, stateMap, oceanDepthMap, iceCells,
  mapWidth, mapHeight, cameraX, cameraY, zoom, selectedCell, players,
  showBiomes, showRivers, showBorders, showRoutes, showBurgs, showMarkers, showGrid,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !graph) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const ox = w / 2 - mapWidth / 2 * zoom + cameraX * zoom;
    const oy = h / 2 - mapHeight / 2 * zoom + cameraY * zoom;

    // Clear
    ctx.fillStyle = '#0A1628';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(zoom, zoom);

    // === 1. Voronoi cell fill (terrain) ===
    for (let i = 0; i < graph.cells.length; i++) {
      const cell = graph.cells[i];
      if (cell.vertices.length < 3) continue;

      const tile = cellTiles[i];
      if (!tile) continue;

      // Color
      let color: string;
      if (showBiomes) {
        color = getTerrainColor(tile);
      } else {
        color = BIOME_COLORS[tile.terrain] || '#333';
      }

      // Draw polygon
      drawPolygon(ctx, cell.vertices, color);

      // Ice overlay
      if (iceCells.has(cellKey(i))) {
        drawPolygon(ctx, cell.vertices, 'rgba(232,237,240,0.5)');
      }

      // Owner overlay
      if (tile.ownerId) {
        const player = players.find(p => p.id === tile.ownerId);
        if (player) drawPolygon(ctx, cell.vertices, player.color + '30');
      }
    }

    // === 2. Coast lines (Chaikin smoothed) ===
    ctx.strokeStyle = '#1A3A5A';
    ctx.lineWidth = 1.5;
    for (const path of coastPaths) {
      if (path.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
      }
      ctx.stroke();
    }

    // === 3. Grid overlay ===
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 0.5;
      for (const cell of graph.cells) {
        if (cell.vertices.length < 3) continue;
        ctx.beginPath();
        ctx.moveTo(cell.vertices[0].x, cell.vertices[0].y);
        for (let i = 1; i < cell.vertices.length; i++) {
          ctx.lineTo(cell.vertices[i].x, cell.vertices[i].y);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }

    // === 4. State borders ===
    if (showBorders && stateMap.size > 0) {
      for (const [a, b] of graph.edges) {
        const sA = stateMap.get(cellKey(a));
        const sB = stateMap.get(cellKey(b));
        if (sA === undefined || sB === undefined || sA === sB) continue;

        // Bu iki hücrenin ortak kenarını bul ve çiz
        const shared = findSharedVertices(graph.cells[a], graph.cells[b]);
        if (shared.length >= 2) {
          const state = states[sA];
          ctx.beginPath();
          ctx.moveTo(shared[0].x, shared[0].y);
          for (let i = 1; i < shared.length; i++) {
            ctx.lineTo(shared[i].x, shared[i].y);
          }
          ctx.strokeStyle = state?.color || '#FFD700';
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }
      }
    }

    // === 5. Rivers ===
    if (showRivers) {
      for (const river of rivers) {
        if (river.path.length < 2) continue;
        ctx.beginPath();
        const c0 = graph.cells[river.path[0]].center;
        ctx.moveTo(c0.x, c0.y);

        // Bezier curve ile yumuşak nehir
        for (let i = 1; i < river.path.length; i++) {
          const ci = graph.cells[river.path[i]].center;
          if (i < river.path.length - 1) {
            const cn = graph.cells[river.path[i + 1]].center;
            const cpx = ci.x;
            const cpy = ci.y;
            const ex = (ci.x + cn.x) / 2;
            const ey = (ci.y + cn.y) / 2;
            ctx.quadraticCurveTo(cpx, cpy, ex, ey);
          } else {
            ctx.lineTo(ci.x, ci.y);
          }
        }
        ctx.strokeStyle = RIVER_COLOR;
        ctx.lineWidth = Math.min(5, 1 + river.flux * 0.2);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      }
    }

    // === 6. Routes ===
    if (showRoutes) {
      for (const route of routes) {
        if (route.path.length < 2) continue;
        ctx.beginPath();
        const c0 = graph.cells[route.path[0]]?.center;
        if (!c0) continue;
        ctx.moveTo(c0.x, c0.y);
        for (let i = 1; i < route.path.length; i++) {
          const ci = graph.cells[route.path[i]]?.center;
          if (ci) ctx.lineTo(ci.x, ci.y);
        }
        ctx.strokeStyle = route.type === 'highway' ? '#D4A843CC' :
                          route.type === 'road' ? '#AAAAAABB' : '#77777766';
        ctx.lineWidth = route.type === 'highway' ? 2.5 : route.type === 'road' ? 1.5 : 0.8;
        ctx.setLineDash(route.type === 'trail' ? [4, 4] : []);
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // === 7. Burgs ===
    if (showBurgs) {
      for (const burg of burgs) {
        const cellIdx = burg.cellIndex;
        if (cellIdx < 0 || cellIdx >= graph.cells.length) continue;
        const center = graph.cells[cellIdx].center;

        const size = burg.isCapital ? 7 : burg.population > 2000 ? 5 : 3.5;

        // Glow
        ctx.beginPath();
        ctx.arc(center.x, center.y, size + 2, 0, Math.PI * 2);
        ctx.fillStyle = burg.isCapital ? 'rgba(255,215,0,0.3)' : 'rgba(255,255,255,0.15)';
        ctx.fill();

        // Circle
        ctx.beginPath();
        ctx.arc(center.x, center.y, size, 0, Math.PI * 2);
        ctx.fillStyle = burg.isCapital ? '#FFD700' : '#FFF';
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = burg.isCapital ? 2 : 1;
        ctx.stroke();

        // Label
        if (zoom > 0.6 || burg.isCapital) {
          ctx.font = burg.isCapital ? 'bold 11px sans-serif' : '9px sans-serif';
          ctx.textAlign = 'center';
          ctx.strokeStyle = 'rgba(0,0,0,0.7)';
          ctx.lineWidth = 3;
          ctx.strokeText(burg.name, center.x, center.y - size - 4);
          ctx.fillStyle = '#FFF';
          ctx.fillText(burg.name, center.x, center.y - size - 4);
        }
      }
    }

    // === 8. Selection ===
    if (selectedCell !== null && selectedCell >= 0 && selectedCell < graph.cells.length) {
      const cell = graph.cells[selectedCell];
      if (cell.vertices.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(cell.vertices[0].x, cell.vertices[0].y);
        for (let i = 1; i < cell.vertices.length; i++) {
          ctx.lineTo(cell.vertices[i].x, cell.vertices[i].y);
        }
        ctx.closePath();
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }

    ctx.restore();
  }, [graph, cellTiles, rivers, coastPaths, burgs, routes,
      states, stateMap, oceanDepthMap, iceCells,
      mapWidth, mapHeight, cameraX, cameraY, zoom, selectedCell, players,
      showBiomes, showRivers, showBorders, showRoutes, showBurgs, showGrid]);

  useEffect(() => { draw(); }, [draw]);

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

  return <View style={{ flex: 1, backgroundColor: '#0A1628' }} />;
});

// === Helpers ===

function drawPolygon(ctx: CanvasRenderingContext2D, vertices: Point[], color: string): void {
  ctx.beginPath();
  ctx.moveTo(vertices[0].x, vertices[0].y);
  for (let i = 1; i < vertices.length; i++) {
    ctx.lineTo(vertices[i].x, vertices[i].y);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function getTerrainColor(tile: HexTile): string {
  const base = BIOME_COLORS[tile.terrain] || '#333';
  // Elevation tint
  const factor = 0.75 + tile.elevation * 0.4;
  return tintColor(base, factor);
}

function tintColor(hex: string, factor: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.floor(((num >> 16) & 0xff) * factor));
  const g = Math.min(255, Math.floor(((num >> 8) & 0xff) * factor));
  const b = Math.min(255, Math.floor((num & 0xff) * factor));
  return `rgb(${r},${g},${b})`;
}

function findSharedVertices(a: VoronoiCell, b: VoronoiCell): Point[] {
  const shared: Point[] = [];
  const tol = 1.0;
  for (const va of a.vertices) {
    for (const vb of b.vertices) {
      if (Math.abs(va.x - vb.x) < tol && Math.abs(va.y - vb.y) < tol) {
        shared.push(va);
        break;
      }
    }
  }
  return shared;
}
