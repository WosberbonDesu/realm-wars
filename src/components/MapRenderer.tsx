import React, { useRef, useEffect, useCallback } from 'react';
import { View, Dimensions, Platform } from 'react-native';
import { HexTile, HexTerrain } from '../types/game';
import { Point, VoronoiGraph, VoronoiCell } from '../engine/voronoi';
import { VoronoiRiver, VoronoiBurg, VoronoiState, VoronoiRoute } from '../engine/voronoiMapGenerator';
import { cellKey } from '../engine/voronoiGrid';
import { SEA_LEVEL } from '../engine/biomes';
import { Alea } from '../engine/alea';
import { useGameStore } from '../store/gameStore';
import { renderEmblemToCanvas, generateEmblems, Emblem } from '../engine/emblemGenerator';

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
  showRelief: boolean;
  showEmblems: boolean;
  showIce: boolean;
  showWind: boolean;
}

export const MapRenderer: React.FC<MapRendererProps> = React.memo(({
  graph, cellTiles, rivers, burgs, routes, states, stateMap,
  mapWidth, mapHeight, cameraX, cameraY, zoom, selectedCell,
  showBiomes, showRivers, showBorders, showRoutes, showBurgs, showGrid, showPopulation,
  showRelief, showEmblems, showIce, showWind,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const baseCacheKeyRef = useRef<string>('');
  const rafRef = useRef<number>(0);

  // Base harita cache key: sadece harita verisi + layer toggle değiştiğinde yeniden çiz
  const baseCacheKey = `${graph?.cells.length}_${showBiomes}_${showBorders}_${showPopulation}_${showGrid}_${showIce}_${burgs.length}_${states.length}`;

  // Base haritayı offscreen canvas'a çiz (ağır işlemler burada)
  const renderBase = useCallback(() => {
    if (!graph) return null;

    if (baseCacheKeyRef.current === baseCacheKey && baseCanvasRef.current) {
      return baseCanvasRef.current;
    }

    if (!baseCanvasRef.current) {
      baseCanvasRef.current = document.createElement('canvas');
    }
    const offscreen = baseCanvasRef.current;
    offscreen.width = mapWidth;
    offscreen.height = mapHeight;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, mapWidth, mapHeight);

    // === 1. Ocean ===
    drawOcean(ctx, graph, cellTiles, mapWidth, mapHeight);

    // === 2. Land biome ===
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

    // === 5b. Ice layer ===
    if (showIce) drawIceLayer(ctx, graph, cellTiles);

    // === 6. Grid ===
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

    baseCacheKeyRef.current = baseCacheKey;
    return offscreen;
  }, [graph, cellTiles, stateMap, states, mapWidth, mapHeight, showBiomes, showBorders, showPopulation, showGrid, showIce, baseCacheKey]);

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

    // Base haritayı cache'den çiz
    const base = renderBase();
    if (base) {
      ctx.drawImage(base, 0, 0);
    }

    // === 8. Rivers (hafif, her frame çizilebilir) ===
    if (showRivers) drawRivers(ctx, graph, rivers);

    // === 9. Routes ===
    if (showRoutes) drawRoutes(ctx, graph, routes);

    // === 9b. Relief icons (dağ/orman/çöl) ===
    if (showRelief) drawReliefLayer(ctx, graph, cellTiles, mapWidth);

    // === 9c. Wind arrows ===
    if (showWind) drawWindLayer(ctx, graph, cellTiles, mapWidth);

    // === 10. Mythological markers ===
    drawMythMarkers(ctx, graph, cellTiles, mapWidth);

    // === 10b. Custom markers ===
    drawCustomMarkers(ctx, graph);

    // === 11. Burgs ===
    if (showBurgs) drawBurgs(ctx, graph, burgs, stateMap, zoom);

    // === 11b. State emblems ===
    if (showEmblems) drawEmblemsOnMap(ctx, graph, states, stateMap, mapWidth);

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
  }, [graph, cellTiles, rivers, burgs, routes, states, stateMap,
      mapWidth, mapHeight, cameraX, cameraY, zoom, selectedCell,
      showBiomes, showRivers, showBorders, showRoutes, showBurgs, showGrid, showPopulation,
      showRelief, showEmblems, showIce, showWind, renderBase]);

  // requestAnimationFrame ile çizim (smooth)
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

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

// Polygon çiz - vertex'leri hafif inflate ederek gap kaldır
function fillCell(ctx: CanvasRenderingContext2D, verts: Point[], color: string): void {
  if (verts.length < 3) return;

  // Merkez hesapla
  let cx = 0, cy = 0;
  for (const v of verts) { cx += v.x; cy += v.y; }
  cx /= verts.length; cy /= verts.length;

  // Her vertex'i merkezden 0.5px uzaklaştır (inflate)
  ctx.beginPath();
  for (let i = 0; i < verts.length; i++) {
    const dx = verts[i].x - cx;
    const dy = verts[i].y - cy;
    const len = Math.sqrt(dx * dx + dy * dy);
    const inflate = 0.5;
    const nx = verts[i].x + (len > 0 ? dx / len * inflate : 0);
    const ny = verts[i].y + (len > 0 ? dy / len * inflate : 0);
    if (i === 0) ctx.moveTo(nx, ny);
    else ctx.lineTo(nx, ny);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
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

// ===== ICE LAYER =====
function drawIceLayer(ctx: CanvasRenderingContext2D, graph: VoronoiGraph, tiles: HexTile[]): void {
  for (let i = 0; i < graph.cells.length; i++) {
    const tile = tiles[i];
    if (!tile) continue;
    // Buz: sıcaklık < 0.15
    if (tile.temperature > 0.15) continue;

    const cell = graph.cells[i];
    if (cell.vertices.length < 3) continue;

    if (tile.elevation >= SEA_LEVEL) {
      // Buzul (kara)
      if (tile.elevation > 0.6) {
        fillCell(ctx, cell.vertices, 'rgba(200,220,240,0.6)');
      } else {
        // Buz rafı
        fillCell(ctx, cell.vertices, 'rgba(180,210,235,0.4)');
      }
    } else {
      // Deniz buzu
      fillCell(ctx, cell.vertices, 'rgba(195,215,230,0.5)');
    }
  }

  // Buz kristal efektleri
  ctx.save();
  ctx.globalAlpha = 0.3;
  const iceRng = new Alea(graph.cells.length * 13);
  for (let i = 0; i < graph.cells.length; i++) {
    const tile = tiles[i];
    if (!tile || tile.temperature > 0.12) continue;
    if (iceRng.next() > 0.08) continue;
    const c = graph.cells[i].center;
    ctx.font = `${8 + iceRng.nextFloat(0, 6)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('❄', c.x + iceRng.nextFloat(-5, 5), c.y + iceRng.nextFloat(-5, 5));
  }
  ctx.restore();
}

// ===== RELIEF ICONS (Dağ/Orman/Çöl dekorasyonları) =====
// Voronoi uyumlu - hex grid yerine cell center kullanır

const RELIEF_CONFIG: Record<string, { icons: string[]; density: number; sizeMin: number; sizeMax: number }> = {
  mountain: { icons: ['▲', '▲', '⛰'], density: 0.7, sizeMin: 8, sizeMax: 14 },
  snow: { icons: ['▲', '❄'], density: 0.5, sizeMin: 7, sizeMax: 12 },
  forest_cold: { icons: ['🌲', '🌲', '🌲'], density: 0.6, sizeMin: 7, sizeMax: 11 },
  forest_temp: { icons: ['🌳', '🌳', '🌲'], density: 0.6, sizeMin: 7, sizeMax: 11 },
  forest_trop: { icons: ['🌴', '🌳'], density: 0.5, sizeMin: 7, sizeMax: 11 },
  desert: { icons: ['〰', '🌵'], density: 0.3, sizeMin: 6, sizeMax: 10 },
  swamp: { icons: ['⌇', '⌇'], density: 0.4, sizeMin: 6, sizeMax: 9 },
  tundra: { icons: ['∧', '⬢'], density: 0.2, sizeMin: 5, sizeMax: 8 },
  hills: { icons: ['∧', '∧'], density: 0.15, sizeMin: 5, sizeMax: 8 },
};

function getReliefType(tile: HexTile): string | null {
  if (tile.elevation < SEA_LEVEL) return null;
  if (tile.elevation > 0.75) return tile.temperature < 0.15 ? 'snow' : 'mountain';
  if (tile.elevation > 0.55) return 'hills';
  // Biome-based
  const biomeId = tile.terrain;
  if (biomeId === HexTerrain.Mountain || biomeId === HexTerrain.Snow) return tile.temperature < 0.15 ? 'snow' : 'mountain';
  if (biomeId === HexTerrain.Forest) {
    if (tile.temperature > 0.7) return 'forest_trop';
    if (tile.temperature < 0.3) return 'forest_cold';
    return 'forest_temp';
  }
  if (biomeId === HexTerrain.Desert) return 'desert';
  if (biomeId === HexTerrain.Swamp) return 'swamp';
  if (biomeId === HexTerrain.Tundra) return 'tundra';
  return null;
}

function drawReliefLayer(ctx: CanvasRenderingContext2D, graph: VoronoiGraph, tiles: HexTile[], mapW: number): void {
  const rng = new Alea(mapW * 31 + graph.cells.length);

  ctx.save();
  for (let i = 0; i < graph.cells.length; i++) {
    const tile = tiles[i];
    if (!tile) continue;
    const reliefType = getReliefType(tile);
    if (!reliefType) continue;

    const config = RELIEF_CONFIG[reliefType];
    if (!config) continue;

    if (rng.next() > config.density) continue;

    const c = graph.cells[i].center;
    const icon = config.icons[Math.floor(rng.next() * config.icons.length)];
    const size = config.sizeMin + rng.nextFloat(0, config.sizeMax - config.sizeMin);
    const ox = rng.nextFloat(-4, 4);
    const oy = rng.nextFloat(-4, 4);

    // Metin bazlı ikonlar (▲, ∧, ⬢, 〰, ⌇) farklı renk
    if (icon === '▲' || icon === '⛰') {
      ctx.font = `bold ${size}px sans-serif`;
      ctx.fillStyle = reliefType === 'snow' ? 'rgba(160,175,190,0.6)' : 'rgba(90,75,60,0.5)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icon, c.x + ox, c.y + oy);
    } else if (icon === '∧' || icon === '⬢') {
      ctx.font = `bold ${size}px sans-serif`;
      ctx.fillStyle = 'rgba(100,90,70,0.4)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icon, c.x + ox, c.y + oy);
    } else if (icon === '〰') {
      // Kumul dalgası
      ctx.strokeStyle = 'rgba(180,150,80,0.4)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      const sx = c.x + ox - size * 0.4;
      ctx.moveTo(sx, c.y + oy);
      ctx.quadraticCurveTo(sx + size * 0.2, c.y + oy - size * 0.25, sx + size * 0.4, c.y + oy);
      ctx.quadraticCurveTo(sx + size * 0.6, c.y + oy + size * 0.25, sx + size * 0.8, c.y + oy);
      ctx.stroke();
    } else if (icon === '⌇') {
      // Bataklık çizgileri
      ctx.strokeStyle = 'rgba(70,100,60,0.4)';
      ctx.lineWidth = 0.8;
      for (let j = -2; j <= 2; j++) {
        ctx.beginPath();
        ctx.moveTo(c.x + ox + j * 2.5, c.y + oy - size * 0.25);
        ctx.lineTo(c.x + ox + j * 2.5, c.y + oy + size * 0.25);
        ctx.stroke();
      }
    } else if (icon === '❄') {
      ctx.font = `${size}px sans-serif`;
      ctx.globalAlpha = 0.4;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icon, c.x + ox, c.y + oy);
      ctx.globalAlpha = 1;
    } else {
      // Emoji ikonlar (🌲, 🌳, 🌴, 🌵)
      ctx.font = `${size}px sans-serif`;
      ctx.globalAlpha = 0.65;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icon, c.x + ox, c.y + oy);
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}

// ===== WIND LAYER =====
function drawWindLayer(ctx: CanvasRenderingContext2D, graph: VoronoiGraph, tiles: HexTile[], mapW: number): void {
  const rng = new Alea(mapW * 47);
  // Prevailing wind direction (batıdan doğuya)
  const prevDir = 250 + rng.nextFloat(-30, 30); // derece
  const prevRad = (prevDir * Math.PI) / 180;

  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = '#a0c0e0';
  ctx.lineWidth = 0.8;

  for (let i = 0; i < graph.cells.length; i++) {
    if (rng.next() > 0.06) continue; // sadece %6 hücrede ok göster
    const tile = tiles[i];
    if (!tile) continue;

    const c = graph.cells[i].center;

    // Yüksekliğe göre yön sapması
    let dir = prevRad;
    let strength = 0.5;

    if (tile.elevation >= SEA_LEVEL) {
      if (tile.elevation > 0.6) {
        strength = 0.2; // dağlar bloklar
        dir += rng.nextFloat(-0.5, 0.5);
      } else if (tile.terrain === HexTerrain.Forest) {
        strength = 0.35;
      }
    } else {
      strength = 0.7; // denizde güçlü
    }

    dir += rng.nextFloat(-0.2, 0.2);

    const len = 8 + strength * 10;
    const ex = c.x + Math.cos(dir) * len;
    const ey = c.y + Math.sin(dir) * len;

    // Ok çiz
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    // Ok ucu
    const headLen = 3;
    const headAngle = 0.5;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - Math.cos(dir - headAngle) * headLen, ey - Math.sin(dir - headAngle) * headLen);
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - Math.cos(dir + headAngle) * headLen, ey - Math.sin(dir + headAngle) * headLen);
    ctx.stroke();
  }
  ctx.restore();
}

// ===== EMBLEM RENDERING =====
function drawEmblemsOnMap(ctx: CanvasRenderingContext2D, graph: VoronoiGraph, states: VoronoiState[], stateMap: Map<string, number>, mapW: number): void {
  // Her state için capital hücresinin yanına küçük emblem çiz
  const rng = new Alea(mapW * 71 + states.length);
  const emblems = generateEmblemsForStates(states.length, rng);

  for (let si = 0; si < states.length; si++) {
    const state = states[si];
    if (state.cells.length === 0) continue;

    const emblem = emblems[si];
    if (!emblem) continue;

    // Devlet merkezi bul
    let cx = 0, cy = 0;
    for (const ci of state.cells) {
      cx += graph.cells[ci].center.x;
      cy += graph.cells[ci].center.y;
    }
    cx /= state.cells.length;
    cy /= state.cells.length;

    // State label'ın biraz altına çiz
    const fs = Math.min(20, Math.max(9, Math.sqrt(state.cells.length) * 0.65));
    renderEmblemToCanvas(ctx, emblem, cx, cy + fs + 8, 18);
  }
}

// Emblem generation helper (cached)
let _emblemCache: { key: string; emblems: Emblem[] } | null = null;
function generateEmblemsForStates(count: number, rng: Alea): Emblem[] {
  const key = `${count}`;
  if (_emblemCache?.key === key) return _emblemCache.emblems;
  const emblems = generateEmblems(count, rng);
  _emblemCache = { key, emblems };
  return emblems;
}

function drawCustomMarkers(ctx: CanvasRenderingContext2D, graph: VoronoiGraph): void {
  const customMarkers = useGameStore.getState().customMarkers;
  for (const marker of customMarkers) {
    const cell = graph.cells[marker.cellIndex];
    if (!cell) continue;
    const { x, y } = cell.center;
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(marker.icon, x, y);
    ctx.font = '7px Georgia, serif';
    ctx.fillStyle = 'rgba(60,40,20,0.7)';
    ctx.fillText(marker.name, x, y + 11);
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

// ===== FULL-RES EXPORT =====

export function renderFullMapToCanvas(
  canvas: HTMLCanvasElement,
  graph: VoronoiGraph,
  cellTiles: HexTile[],
  rivers: VoronoiRiver[],
  burgs: VoronoiBurg[],
  routes: VoronoiRoute[],
  states: VoronoiState[],
  stateMap: Map<string, number>,
  mapWidth: number,
  mapHeight: number,
  showBiomes: boolean,
  showRivers: boolean,
  showBorders: boolean,
  showRoutes: boolean,
  showBurgs: boolean,
  showPopulation: boolean,
): void {
  canvas.width = mapWidth;
  canvas.height = mapHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, mapWidth, mapHeight);

  // 1. Ocean
  drawOcean(ctx, graph, cellTiles, mapWidth, mapHeight);
  // 2. Land biomes
  drawLandBiomes(ctx, graph, cellTiles, showBiomes);
  // 3. State overlay
  if (showBorders) drawStateOverlay(ctx, graph, cellTiles, stateMap, states);
  // 4. Population
  if (showPopulation) drawPopulation(ctx, graph, cellTiles);
  // 5. Coastlines
  drawCoastlines(ctx, graph, cellTiles);
  // 5b. Ice layer
  drawIceLayer(ctx, graph, cellTiles);
  // 6. State borders
  if (showBorders) drawStateBorders(ctx, graph, stateMap);
  // 7. Rivers
  if (showRivers) drawRivers(ctx, graph, rivers);
  // 8. Routes
  if (showRoutes) drawRoutes(ctx, graph, routes);
  // 8b. Relief icons
  drawReliefLayer(ctx, graph, cellTiles, mapWidth);
  // 9. Myth markers
  drawMythMarkers(ctx, graph, cellTiles, mapWidth);
  // 10. Custom markers
  drawCustomMarkers(ctx, graph);
  // 11. Burgs (zoom=1 for full-res)
  if (showBurgs) drawBurgs(ctx, graph, burgs, stateMap, 1);
  // 11b. State emblems
  drawEmblemsOnMap(ctx, graph, states, stateMap, mapWidth);
  // 12. State labels
  if (showBorders) drawStateLabels(ctx, graph, states);
}
