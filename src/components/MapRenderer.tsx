import React, { useRef, useEffect, useCallback } from 'react';
import { View, Dimensions, Platform } from 'react-native';
import { HexTile, HexTerrain } from '../types/game';
import { Point, VoronoiGraph, VoronoiCell } from '../engine/voronoi';
import { VoronoiRiver, VoronoiBurg, VoronoiState, VoronoiRoute } from '../engine/voronoiMapGenerator';
import { cellKey } from '../engine/voronoiGrid';
import { SEA_LEVEL } from '../engine/biomes';
import { Alea } from '../engine/alea';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ===== FANTASTİK HARİTA RENKLERİ =====

// Okyanus: derin gizemli maviler
const OCEAN_COLORS = [
  '#8fb8d4', '#6f9fc4', '#5087b4', '#3870a4', '#265994', '#1a4580', '#0f3268',
];

// Azgaar C_12 state renkleri (pastel, harita uyumlu)
const STATE_COLORS = [
  '#dababf', '#fb8072', '#80b1d3', '#fdb462', '#b3de69',
  '#fccde5', '#c6b9c1', '#bc80bd', '#ccebc5', '#ffed6f',
  '#8dd3c7', '#eb8de7',
];

// Fantasy biome renkleri (daha sıcak, parchment-like)
const BIOME_COLORS_BY_ID = [
  '#3a6b8f', // 0: Marine (derin mavi)
  '#e8c77b', // 1: Hot desert (altın kum)
  '#b5a882', // 2: Cold desert (kuru toprak)
  '#c9bf6b', // 3: Savanna (kuru ot)
  '#8db858', // 4: Grassland (yeşil çayır)
  '#6da842', // 5: Tropical seasonal
  '#2b8a3e', // 6: Temperate deciduous
  '#3da33a', // 7: Tropical rainforest
  '#1e7a2e', // 8: Temperate rainforest
  '#3a5e28', // 9: Taiga (koyu yeşil)
  '#8a7252', // 10: Tundra (kahverengi)
  '#c8d5d8', // 11: Glacier (buz beyazı)
  '#2d7a45', // 12: Wetland (koyu yeşil)
];

// Biome matrix (5 moisture x 26 temp, Azgaar exact)
const BM = [
  [1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,10,10],
  [3,3,3,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,9,9,9,9,10,10,10,10],
  [5,5,5,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,9,9,9,9,10,10,10,10],
  [5,5,5,5,6,6,6,6,6,8,8,8,8,8,8,8,8,8,9,9,9,9,10,10,10,10],
  [7,7,7,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,9,9,9,9,10,10,10,10],
];

// Mitolojik semboller
const MYTHOLOGICAL_MARKERS = [
  { icon: '🐉', name: 'Ejderha Yuvasi', chance: 0.003 },
  { icon: '🦑', name: 'Deniz Canavari', chance: 0.004, waterOnly: true },
  { icon: '👹', name: 'Ork Kampi', chance: 0.004 },
  { icon: '🧙', name: 'Buyucu Kulesi', chance: 0.002 },
  { icon: '💀', name: 'Lanetli Topraklar', chance: 0.003 },
  { icon: '🏛️', name: 'Kadim Tapinak', chance: 0.002 },
  { icon: '⚔️', name: 'Savas Alani', chance: 0.003 },
  { icon: '🌋', name: 'Ates Dagi', chance: 0.001 },
  { icon: '🕳️', name: 'Karanlik Portal', chance: 0.001 },
  { icon: '👻', name: 'Hayalet Sehir', chance: 0.002 },
  { icon: '🐺', name: 'Kurt Adam Bolgesi', chance: 0.003 },
  { icon: '🧝', name: 'Elf Ormani', chance: 0.002 },
  { icon: '⛏️', name: 'Cuceler Madeni', chance: 0.002 },
  { icon: '🏰', name: 'Terk Edilmis Kale', chance: 0.002 },
  { icon: '🌊', name: 'Cthulhu Tapinagi', chance: 0.001, waterOnly: true },
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

    ctx.fillStyle = '#0f2840';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(zoom, zoom);

    // === 1. Ocean ===
    drawOcean(ctx, graph, cellTiles, mapWidth, mapHeight);

    // === 2. Land biome (TEK BÜYÜK PATH olarak - çizgi yok) ===
    drawLandBiomes(ctx, graph, cellTiles, showBiomes);

    // === 3. State overlay ===
    if (showBorders) {
      drawStateOverlay(ctx, graph, cellTiles, stateMap, states);
    }

    // === 4. Population ===
    if (showPopulation) {
      drawPopulation(ctx, graph, cellTiles);
    }

    // === 5. Coastlines ===
    drawCoastlines(ctx, graph, cellTiles);

    // === 6. Grid (sadece toggle açıkken) ===
    if (showGrid) {
      ctx.strokeStyle = 'rgba(0,0,0,0.06)';
      ctx.lineWidth = 0.2;
      for (const cell of graph.cells) {
        if (cell.vertices.length < 3) continue;
        ctx.beginPath();
        ctx.moveTo(cell.vertices[0].x, cell.vertices[0].y);
        for (let j = 1; j < cell.vertices.length; j++) ctx.lineTo(cell.vertices[j].x, cell.vertices[j].y);
        ctx.closePath();
        ctx.stroke();
      }
    }

    // === 7. State borders ===
    if (showBorders) drawStateBorders(ctx, graph, stateMap);

    // === 8. Rivers ===
    if (showRivers) drawRivers(ctx, graph, rivers);

    // === 9. Routes ===
    if (showRoutes) drawRoutes(ctx, graph, routes);

    // === 10. Mythological markers ===
    drawMythMarkers(ctx, graph, cellTiles, mapWidth);

    // === 11. Burgs ===
    if (showBurgs) drawBurgs(ctx, graph, burgs, stateMap, zoom);

    // === 12. State labels ===
    if (showBorders) drawStateLabels(ctx, graph, states);

    // === 13. Selection ===
    if (selectedCell !== null && selectedCell >= 0 && selectedCell < graph.cells.length) {
      const cell = graph.cells[selectedCell];
      if (cell.vertices.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(cell.vertices[0].x, cell.vertices[0].y);
        for (let i = 1; i < cell.vertices.length; i++) ctx.lineTo(cell.vertices[i].x, cell.vertices[i].y);
        ctx.closePath();
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2.5;
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
  return <View style={{ flex: 1, backgroundColor: '#0f2840' }} />;
});

// ===== ÇİZİM FONKSİYONLARI =====

// Polygon çiz - stroke ile gap kapatma
function fillCell(ctx: CanvasRenderingContext2D, verts: Point[], color: string): void {
  ctx.beginPath();
  ctx.moveTo(verts[0].x, verts[0].y);
  for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  // Gap kapatma: aynı renkte çok ince stroke
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.7;
  ctx.stroke();
}

function drawOcean(ctx: CanvasRenderingContext2D, graph: VoronoiGraph, tiles: HexTile[], w: number, h: number): void {
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
    fillCell(ctx, cell.vertices, OCEAN_COLORS[d]);
  }
}

function drawLandBiomes(ctx: CanvasRenderingContext2D, graph: VoronoiGraph, tiles: HexTile[], showBiomes: boolean): void {
  for (let i = 0; i < graph.cells.length; i++) {
    const cell = graph.cells[i];
    if (cell.vertices.length < 3) continue;
    const tile = tiles[i];
    if (!tile || tile.elevation < SEA_LEVEL) continue;

    const color = showBiomes ? getBiomeColor(tile) : '#8db858';
    fillCell(ctx, cell.vertices, color);
  }
}

function drawStateOverlay(ctx: CanvasRenderingContext2D, graph: VoronoiGraph, tiles: HexTile[], stateMap: Map<string, number>, states: VoronoiState[]): void {
  for (let i = 0; i < graph.cells.length; i++) {
    const cell = graph.cells[i];
    if (cell.vertices.length < 3 || !tiles[i] || tiles[i].elevation < SEA_LEVEL) continue;
    const sId = stateMap.get(cellKey(i));
    if (sId === undefined || sId < 0 || sId >= states.length) continue;
    fillCell(ctx, cell.vertices, STATE_COLORS[sId % STATE_COLORS.length] + '88');
  }
}

function drawCoastlines(ctx: CanvasRenderingContext2D, graph: VoronoiGraph, tiles: HexTile[]): void {
  ctx.strokeStyle = '#2a4a3a';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  for (const [a, b] of graph.edges) {
    const aL = tiles[a]?.elevation >= SEA_LEVEL;
    const bL = tiles[b]?.elevation >= SEA_LEVEL;
    if (aL === bL) continue;
    const shared = sharedVerts(graph.cells[a], graph.cells[b]);
    if (shared.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(shared[0].x, shared[0].y);
      for (let i = 1; i < shared.length; i++) ctx.lineTo(shared[i].x, shared[i].y);
      ctx.stroke();
    }
  }
}

function drawStateBorders(ctx: CanvasRenderingContext2D, graph: VoronoiGraph, stateMap: Map<string, number>): void {
  ctx.strokeStyle = '#56566d';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 2]);
  ctx.lineCap = 'round';
  for (const [a, b] of graph.edges) {
    const sA = stateMap.get(cellKey(a));
    const sB = stateMap.get(cellKey(b));
    if (sA === undefined && sB === undefined) continue;
    if (sA === sB) continue;
    const shared = sharedVerts(graph.cells[a], graph.cells[b]);
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
        if (cn) ctx.quadraticCurveTo(ci.x, ci.y, (ci.x + cn.x) / 2, (ci.y + cn.y) / 2);
        else ctx.lineTo(ci.x, ci.y);
      } else ctx.lineTo(ci.x, ci.y);
    }
    ctx.strokeStyle = '#5d97bb';
    ctx.lineWidth = Math.min(3.5, 0.3 + Math.sqrt(river.flux) * 0.07);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
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
    ctx.strokeStyle = route.type === 'highway' ? '#d06324' : '#996633';
    ctx.lineWidth = route.type === 'highway' ? 0.8 : 0.5;
    ctx.setLineDash(route.type === 'highway' ? [] : [3, 2]);
    ctx.globalAlpha = 0.7;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
  }
}

function drawPopulation(ctx: CanvasRenderingContext2D, graph: VoronoiGraph, tiles: HexTile[]): void {
  for (let i = 0; i < graph.cells.length; i++) {
    const tile = tiles[i];
    if (!tile || tile.elevation < SEA_LEVEL) continue;
    const pop = tile.moisture * 0.4 + tile.temperature * 0.3 + (tile.hasRiver ? 0.3 : 0);
    if (pop < 0.3) continue;
    const c = graph.cells[i].center;
    ctx.beginPath();
    ctx.arc(c.x, c.y, Math.min(1.2, pop), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fill();
  }
}

function drawMythMarkers(ctx: CanvasRenderingContext2D, graph: VoronoiGraph, tiles: HexTile[], mapW: number): void {
  // Seed-based deterministic placement
  const rng = new Alea(mapW * 7 + graph.cells.length);

  for (let i = 0; i < graph.cells.length; i++) {
    const tile = tiles[i];
    if (!tile) continue;

    for (const marker of MYTHOLOGICAL_MARKERS) {
      if (marker.waterOnly && tile.elevation >= SEA_LEVEL) continue;
      if (!marker.waterOnly && tile.elevation < SEA_LEVEL) continue;

      if (rng.next() < marker.chance) {
        const c = graph.cells[i].center;
        const size = 14 + rng.nextFloat(0, 4);
        ctx.font = `${size}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(marker.icon, c.x, c.y);

        // Küçük isim etiketi (zoom yakınken)
        ctx.font = '6px Georgia, serif';
        ctx.fillStyle = 'rgba(60,40,20,0.6)';
        ctx.fillText(marker.name, c.x, c.y + 10);
        break; // hücre başına 1 marker
      }
    }
  }
}

function drawBurgs(ctx: CanvasRenderingContext2D, graph: VoronoiGraph, burgs: VoronoiBurg[], stateMap: Map<string, number>, zoom: number): void {
  const sorted = [...burgs].sort((a, b) => (a.isCapital ? 1 : 0) - (b.isCapital ? 1 : 0));

  for (const burg of sorted) {
    const cell = graph.cells[burg.cellIndex];
    if (!cell) continue;
    const { x, y } = cell.center;

    if (burg.isCapital) {
      // Başkent: büyük renkli daire + taç
      const sId = stateMap.get(cellKey(burg.cellIndex));
      const col = sId !== undefined ? STATE_COLORS[sId % STATE_COLORS.length] : '#dababf';

      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#000';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#000';
      ctx.fill();
    } else {
      const size = burg.population > 3000 ? 2.8 : burg.population > 1000 ? 2 : 1.3;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Label
    if (zoom > 0.5 || burg.isCapital || burg.population > 2000) {
      const fs = burg.isCapital ? 11 : burg.population > 2000 ? 8 : 6;
      ctx.font = `${burg.isCapital ? 'bold ' : ''}${fs}px "Almendra SC", Georgia, serif`;
      ctx.textAlign = 'center';
      const ly = burg.isCapital ? y - 10 : y - 5;
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2;
      ctx.strokeText(burg.name, x, ly);
      ctx.fillStyle = '#2a2a2a';
      ctx.fillText(burg.name, x, ly);
    }
  }
}

function drawStateLabels(ctx: CanvasRenderingContext2D, graph: VoronoiGraph, states: VoronoiState[]): void {
  for (const state of states) {
    if (state.cells.length === 0) continue;
    let cx = 0, cy = 0;
    for (const ci of state.cells) { cx += graph.cells[ci].center.x; cy += graph.cells[ci].center.y; }
    cx /= state.cells.length; cy /= state.cells.length;
    const fs = Math.min(20, Math.max(9, Math.sqrt(state.cells.length) * 0.65));
    ctx.save();
    ctx.font = `italic ${fs}px "Almendra SC", Georgia, serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(30,20,10,0.45)';
    ctx.fillText(state.name, cx + 0.5, cy + 0.5);
    ctx.fillStyle = 'rgba(50,35,20,0.6)';
    ctx.fillText(state.name, cx, cy);
    ctx.restore();
  }
}

function getBiomeColor(tile: HexTile): string {
  if (tile.elevation < SEA_LEVEL) return BIOME_COLORS_BY_ID[0];
  if (tile.temperature < 0.1) return BIOME_COLORS_BY_ID[11];
  if (tile.elevation > 0.75) {
    const s = Math.floor(100 + (1 - tile.elevation) * 180);
    return `rgb(${s},${s - 8},${s - 12})`;
  }
  if (tile.temperature > 0.15 && tile.moisture > 0.65 && tile.elevation < 0.35) return BIOME_COLORS_BY_ID[12];
  if (tile.temperature > 0.85 && tile.moisture < 0.15) return BIOME_COLORS_BY_ID[1];
  const mb = Math.min(Math.floor(tile.moisture * 5), 4);
  const tb = Math.min(Math.max(Math.floor((1 - tile.temperature) * 26), 0), 25);
  return BIOME_COLORS_BY_ID[BM[mb][tb]];
}

function sharedVerts(a: VoronoiCell, b: VoronoiCell): Point[] {
  const r: Point[] = [];
  for (const va of a.vertices) {
    for (const vb of b.vertices) {
      if (Math.abs(va.x - vb.x) < 1.5 && Math.abs(va.y - vb.y) < 1.5) { r.push(va); break; }
    }
  }
  return r;
}
