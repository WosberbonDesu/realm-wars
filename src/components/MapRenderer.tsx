import React, { useRef, useEffect, useCallback } from 'react';
import { View, Dimensions, Platform } from 'react-native';
import { HexTile, HexTerrain } from '../types/game';
import { Point, VoronoiGraph, VoronoiCell } from '../engine/voronoi';
import { VoronoiRiver, VoronoiBurg, VoronoiState, VoronoiRoute } from '../engine/voronoiMapGenerator';
import { cellKey } from '../engine/voronoiGrid';
import { SEA_LEVEL } from '../engine/biomes';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ===== AZGAAR RENKLERİ (orijinal kaynak kodundan) =====

// Okyanus derinlik renkleri
const OCEAN_COLORS = [
  '#ecf2f9', '#d8e4f0', '#b5c9e0', '#a0b8d4', '#8baac6', '#7699b8', '#6389aa',
];

// Biome renkleri - Azgaar defaults
const BIOME_FILL: Record<string, string> = {
  [HexTerrain.Ocean]: '#466eab',
  [HexTerrain.Coast]: '#89b0d1',
  [HexTerrain.Lake]: '#6d9bcb',
  [HexTerrain.Plains]: '#d2d082',    // Grassland
  [HexTerrain.Forest]: '#71a74e',    // Temperate Deciduous Forest
  [HexTerrain.Mountain]: '#8c8c8c',  // Mountain
  [HexTerrain.Desert]: '#ffd699',    // Hot Desert
  [HexTerrain.Swamp]: '#6d887b',     // Wetland
  [HexTerrain.Tundra]: '#b5b887',    // Tundra
  [HexTerrain.Snow]: '#ebebeb',      // Glacier
};

// Azgaar biome detay renkleri (sıcaklık/nem kombinasyonları)
function getDetailedBiomeColor(tile: HexTile): string {
  const e = tile.elevation;
  const m = tile.moisture;
  const t = tile.temperature;

  if (e < SEA_LEVEL) return BIOME_FILL[HexTerrain.Ocean];

  // Snow/Ice
  if (t < 0.15 || (e > 0.8 && t < 0.3)) return '#ebebeb';
  // Tundra
  if (t < 0.25) return '#b5b887';
  // Taiga
  if (t < 0.35 && m > 0.3) return '#7b9171';

  // Mountain (yüksek)
  if (e > 0.75) return '#8c8c8c';
  if (e > 0.65) return '#a09882';

  // Sıcaklık ve nem bazlı
  if (t > 0.7) {
    // Tropik
    if (m > 0.7) return '#6d887b'; // Tropical Wetland
    if (m > 0.5) return '#4d8c2e'; // Tropical Rainforest
    if (m > 0.3) return '#88a84d'; // Tropical Seasonal Forest
    if (m > 0.15) return '#c8c89a'; // Savanna
    return '#ffd699'; // Hot Desert
  }

  if (t > 0.5) {
    // Ilıman sıcak
    if (m > 0.7) return '#6d887b'; // Wetland
    if (m > 0.5) return '#71a74e'; // Temperate Deciduous Forest
    if (m > 0.3) return '#b6d95d'; // Temperate Grassland
    if (m > 0.15) return '#d2d082'; // Steppe
    return '#e8d58e'; // Temperate Desert
  }

  // Ilıman
  if (m > 0.6) return '#4b7a2e'; // Conifer Forest
  if (m > 0.35) return '#7b9f4e'; // Mixed Forest
  if (m > 0.2) return '#d2d082'; // Grassland
  return '#c4b990'; // Shrubland
}

// Azgaar state renkleri (20 renk paleti)
const AZGAAR_STATE_COLORS = [
  '#4b6a2e', '#b74530', '#5e3f73', '#42738b', '#9c5229',
  '#67833e', '#c94663', '#325a7d', '#887539', '#4c8553',
  '#a44e8a', '#437c6e', '#b5593c', '#5d6994', '#8f6a3c',
  '#567d3e', '#8e4969', '#3a7a6e', '#a1632a', '#6b5d88',
];

interface MapRendererProps {
  graph: VoronoiGraph | null;
  cellTiles: HexTile[];
  rivers: VoronoiRiver[];
  burgs: VoronoiBurg[];
  routes: VoronoiRoute[];
  states: VoronoiState[];
  stateMap: Map<string, number>;
  coastPaths: Point[][];
  mapWidth: number;
  mapHeight: number;
  cameraX: number;
  cameraY: number;
  zoom: number;
  selectedCell: number | null;
  showBiomes: boolean;
  showRivers: boolean;
  showBorders: boolean;
  showRoutes: boolean;
  showBurgs: boolean;
  showGrid: boolean;
  showPopulation: boolean;
}

export const MapRenderer: React.FC<MapRendererProps> = React.memo(({
  graph, cellTiles, rivers, burgs, routes, states, stateMap, coastPaths,
  mapWidth, mapHeight, cameraX, cameraY, zoom, selectedCell,
  showBiomes, showRivers, showBorders, showRoutes, showBurgs, showGrid, showPopulation,
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

    // Background - derin okyanus
    ctx.fillStyle = '#1a3b5c';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(zoom, zoom);

    // === Pass 1: Ocean depth layers ===
    drawOceanLayers(ctx, graph, cellTiles, mapWidth, mapHeight);

    // === Pass 2: Land biome ===
    for (let i = 0; i < graph.cells.length; i++) {
      const cell = graph.cells[i];
      if (cell.vertices.length < 3) continue;
      const tile = cellTiles[i];
      if (!tile || tile.elevation < SEA_LEVEL) continue;

      const biomeColor = showBiomes ? getDetailedBiomeColor(tile) : BIOME_FILL[tile.terrain] || '#888';
      fillPoly(ctx, cell.vertices, biomeColor);
    }

    // === Pass 3: State overlay (yarı saydam) ===
    if (showBorders) {
      for (let i = 0; i < graph.cells.length; i++) {
        const cell = graph.cells[i];
        if (cell.vertices.length < 3) continue;
        const tile = cellTiles[i];
        if (!tile || tile.elevation < SEA_LEVEL) continue;

        const sId = stateMap.get(cellKey(i));
        if (sId !== undefined && sId >= 0 && sId < states.length) {
          const stateColor = AZGAAR_STATE_COLORS[sId % AZGAAR_STATE_COLORS.length];
          fillPoly(ctx, cell.vertices, stateColor + '77');
        }
      }
    }

    // === Pass 4: Population dots ===
    if (showPopulation) {
      drawPopulation(ctx, graph, cellTiles);
    }

    // === Pass 5: Coastlines ===
    drawCoastlines(ctx, graph, cellTiles);

    // === Pass 6: Grid ===
    if (showGrid) {
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 0.3;
      for (const cell of graph.cells) {
        if (cell.vertices.length < 3) continue;
        strokePoly(ctx, cell.vertices);
      }
    }

    // === Pass 7: State borders ===
    if (showBorders) {
      drawStateBorders(ctx, graph, stateMap, states);
    }

    // === Pass 8: Rivers ===
    if (showRivers) {
      drawRivers(ctx, graph, rivers);
    }

    // === Pass 9: Routes ===
    if (showRoutes) {
      drawRoutes(ctx, graph, routes);
    }

    // === Pass 10: Burgs + castles ===
    if (showBurgs) {
      drawBurgs(ctx, graph, burgs, states, stateMap, zoom);
    }

    // === Pass 11: State labels ===
    if (showBorders) {
      drawStateLabels(ctx, graph, states);
    }

    // === Pass 12: Selection ===
    if (selectedCell !== null && selectedCell >= 0 && selectedCell < graph.cells.length) {
      const cell = graph.cells[selectedCell];
      if (cell.vertices.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(cell.vertices[0].x, cell.vertices[0].y);
        for (let i = 1; i < cell.vertices.length; i++) ctx.lineTo(cell.vertices[i].x, cell.vertices[i].y);
        ctx.closePath();
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }

    ctx.restore();
  }, [graph, cellTiles, rivers, burgs, routes, states, stateMap, coastPaths,
      mapWidth, mapHeight, cameraX, cameraY, zoom, selectedCell,
      showBiomes, showRivers, showBorders, showRoutes, showBurgs, showGrid, showPopulation]);

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
        <canvas ref={canvasRef as any} width={SCREEN_W} height={SCREEN_H}
          style={{ width: '100%', height: '100%' } as any} />
      </View>
    );
  }
  return <View style={{ flex: 1, backgroundColor: '#1a3b5c' }} />;
});

// ===== Drawing functions =====

function fillPoly(ctx: CanvasRenderingContext2D, verts: Point[], color: string): void {
  ctx.beginPath();
  ctx.moveTo(verts[0].x, verts[0].y);
  for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function strokePoly(ctx: CanvasRenderingContext2D, verts: Point[]): void {
  ctx.beginPath();
  ctx.moveTo(verts[0].x, verts[0].y);
  for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y);
  ctx.closePath();
  ctx.stroke();
}

function drawOceanLayers(ctx: CanvasRenderingContext2D, graph: VoronoiGraph, tiles: HexTile[], w: number, h: number): void {
  const n = graph.cells.length;
  const depth = new Int32Array(n).fill(-1);
  const queue: number[] = [];

  for (let i = 0; i < n; i++) {
    if (tiles[i].elevation >= SEA_LEVEL) continue;
    for (const ni of graph.cells[i].neighbors) {
      if (tiles[ni].elevation >= SEA_LEVEL) { depth[i] = 0; queue.push(i); break; }
    }
  }

  let qi = 0;
  while (qi < queue.length) {
    const ci = queue[qi++];
    for (const ni of graph.cells[ci].neighbors) {
      if (tiles[ni].elevation >= SEA_LEVEL || depth[ni] >= 0) continue;
      depth[ni] = depth[ci] + 1;
      queue.push(ni);
    }
  }

  for (let i = 0; i < n; i++) {
    if (tiles[i].elevation >= SEA_LEVEL) continue;
    const cell = graph.cells[i];
    if (cell.vertices.length < 3) continue;
    const d = Math.min(depth[i] >= 0 ? depth[i] : 6, OCEAN_COLORS.length - 1);
    fillPoly(ctx, cell.vertices, OCEAN_COLORS[d]);
  }
}

function drawCoastlines(ctx: CanvasRenderingContext2D, graph: VoronoiGraph, tiles: HexTile[]): void {
  ctx.strokeStyle = '#56566d';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';

  for (const [a, b] of graph.edges) {
    const aLand = tiles[a]?.elevation >= SEA_LEVEL;
    const bLand = tiles[b]?.elevation >= SEA_LEVEL;
    if (aLand === bLand) continue;

    const shared = findSharedVertices(graph.cells[a], graph.cells[b]);
    if (shared.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(shared[0].x, shared[0].y);
      for (let i = 1; i < shared.length; i++) ctx.lineTo(shared[i].x, shared[i].y);
      ctx.stroke();
    }
  }
}

function drawStateBorders(ctx: CanvasRenderingContext2D, graph: VoronoiGraph, stateMap: Map<string, number>, states: VoronoiState[]): void {
  // Azgaar tarzı: koyu çizgi, hafif dash
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#56566d';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([2, 0]);

  for (const [a, b] of graph.edges) {
    const sA = stateMap.get(cellKey(a));
    const sB = stateMap.get(cellKey(b));
    if (sA === undefined && sB === undefined) continue;
    if (sA === sB) continue;

    const shared = findSharedVertices(graph.cells[a], graph.cells[b]);
    if (shared.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(shared[0].x, shared[0].y);
      for (let i = 1; i < shared.length; i++) ctx.lineTo(shared[i].x, shared[i].y);
      ctx.stroke();
    }
  }
  ctx.setLineDash([]);
}

function drawRivers(ctx: CanvasRenderingContext2D, graph: VoronoiGraph, rivers: VoronoiRiver[]): void {
  ctx.fillStyle = '#5d97bb'; // Azgaar river color
  ctx.strokeStyle = '#5d97bb';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const river of rivers) {
    if (river.path.length < 2) continue;
    ctx.beginPath();
    const c0 = graph.cells[river.path[0]]?.center;
    if (!c0) continue;
    ctx.moveTo(c0.x, c0.y);

    for (let i = 1; i < river.path.length; i++) {
      const ci = graph.cells[river.path[i]]?.center;
      if (!ci) continue;
      if (i < river.path.length - 1) {
        const cn = graph.cells[river.path[i + 1]]?.center;
        if (cn) {
          ctx.quadraticCurveTo(ci.x, ci.y, (ci.x + cn.x) / 2, (ci.y + cn.y) / 2);
        } else {
          ctx.lineTo(ci.x, ci.y);
        }
      } else {
        ctx.lineTo(ci.x, ci.y);
      }
    }
    ctx.lineWidth = Math.min(5, 0.5 + river.flux * 0.12);
    ctx.stroke();
  }
}

function drawRoutes(ctx: CanvasRenderingContext2D, graph: VoronoiGraph, routes: VoronoiRoute[]): void {
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
    // Azgaar road colors
    ctx.strokeStyle = route.type === 'highway' ? '#d06324' :
                      route.type === 'road' ? '#996633' : '#8b7355';
    ctx.lineWidth = route.type === 'highway' ? 0.9 : 0.5;
    ctx.setLineDash(route.type === 'trail' ? [2, 2] : [3, 1]);
    ctx.globalAlpha = 0.8;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
  }
}

function drawPopulation(ctx: CanvasRenderingContext2D, graph: VoronoiGraph, tiles: HexTile[]): void {
  // Azgaar tarzı: kara hücrelerinde küçük siyah noktalar (nüfus yoğunluğu)
  for (let i = 0; i < graph.cells.length; i++) {
    const tile = tiles[i];
    if (!tile || tile.elevation < SEA_LEVEL) continue;

    // Population score: moisture + temperature + river
    const pop = tile.moisture * 0.4 + tile.temperature * 0.3 + (tile.hasRiver ? 0.3 : 0);
    if (pop < 0.25) continue; // çok düşük nüfus

    const center = graph.cells[i].center;
    const dotSize = Math.min(1.5, pop * 1.2);

    ctx.beginPath();
    ctx.arc(center.x, center.y, dotSize, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();
  }
}

function drawBurgs(ctx: CanvasRenderingContext2D, graph: VoronoiGraph, burgs: VoronoiBurg[], states: VoronoiState[], stateMap: Map<string, number>, zoom: number): void {
  const sorted = [...burgs].sort((a, b) => (a.isCapital ? 1 : 0) - (b.isCapital ? 1 : 0));

  for (const burg of sorted) {
    const cell = graph.cells[burg.cellIndex];
    if (!cell) continue;
    const { x, y } = cell.center;

    if (burg.isCapital) {
      // === BAŞKENT: Kale ikonu ===
      const s = 6;

      // Kale temeli (dikdörtgen)
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(x - s, y - s * 0.3, s * 2, s * 1.3);

      // Kale kuleleri (3 adet)
      ctx.fillStyle = '#A0522D';
      ctx.fillRect(x - s, y - s * 1.2, s * 0.5, s * 0.9);
      ctx.fillRect(x - s * 0.25, y - s * 1.4, s * 0.5, s * 1.1);
      ctx.fillRect(x + s * 0.5, y - s * 1.2, s * 0.5, s * 0.9);

      // Mazgallar (kule tepelerinde)
      ctx.fillStyle = '#654321';
      for (let t = 0; t < 3; t++) {
        const tx = x - s + t * s * 0.75;
        const ty = t === 1 ? y - s * 1.4 : y - s * 1.2;
        ctx.fillRect(tx, ty - 1.5, 2, 1.5);
        ctx.fillRect(tx + 3, ty - 1.5, 2, 1.5);
      }

      // Kapı
      ctx.fillStyle = '#3D2B1F';
      ctx.beginPath();
      ctx.arc(x, y + s * 0.5, s * 0.25, Math.PI, 0);
      ctx.fillRect(x - s * 0.25, y + s * 0.25, s * 0.5, s * 0.25);
      ctx.fill();

      // Bayrak
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y - s * 1.4);
      ctx.lineTo(x, y - s * 2.2);
      ctx.stroke();

      // Bayrak kumaşı (devlet rengi)
      const sId = stateMap.get(cellKey(burg.cellIndex));
      const flagColor = sId !== undefined ? AZGAAR_STATE_COLORS[sId % AZGAAR_STATE_COLORS.length] : '#c00';
      ctx.fillStyle = flagColor;
      ctx.beginPath();
      ctx.moveTo(x, y - s * 2.2);
      ctx.lineTo(x + s * 0.6, y - s * 1.9);
      ctx.lineTo(x, y - s * 1.6);
      ctx.fill();

    } else {
      // === NORMAL BURG: Azgaar tarzı küçük daire ===
      const size = burg.population > 3000 ? 3 : burg.population > 1000 ? 2.2 : 1.5;

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }

    // Label
    if (zoom > 0.5 || burg.isCapital || burg.population > 2000) {
      const fontSize = burg.isCapital ? 11 : burg.population > 2000 ? 8 : 6;
      ctx.font = `${burg.isCapital ? 'bold ' : ''}${fontSize}px "Almendra SC", "Georgia", serif`;
      ctx.textAlign = 'center';
      const labelY = burg.isCapital ? y - 16 : y - 5;
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 2;
      ctx.strokeText(burg.name, x, labelY);
      ctx.fillStyle = '#333';
      ctx.fillText(burg.name, x, labelY);
    }
  }
}

function drawStateLabels(ctx: CanvasRenderingContext2D, graph: VoronoiGraph, states: VoronoiState[]): void {
  for (const state of states) {
    if (state.cells.length === 0) continue;

    let cx = 0, cy = 0;
    for (const ci of state.cells) {
      cx += graph.cells[ci].center.x;
      cy += graph.cells[ci].center.y;
    }
    cx /= state.cells.length;
    cy /= state.cells.length;

    const fontSize = Math.min(22, Math.max(9, Math.sqrt(state.cells.length) * 0.7));

    ctx.save();
    ctx.font = `italic ${fontSize}px "Almendra SC", "Georgia", "Times New Roman", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(40,40,40,0.5)';
    ctx.fillText(state.name, cx + 0.5, cy + 0.5);
    ctx.fillStyle = 'rgba(60,50,40,0.65)';
    ctx.fillText(state.name, cx, cy);
    ctx.restore();
  }
}

function findSharedVertices(a: VoronoiCell, b: VoronoiCell): Point[] {
  const shared: Point[] = [];
  const tol = 1.5;
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
