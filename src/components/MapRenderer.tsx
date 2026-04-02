import React, { useRef, useEffect, useCallback } from 'react';
import { View, Dimensions, Platform } from 'react-native';
import { HexTile, HexTerrain } from '../types/game';
import { Point, VoronoiGraph, VoronoiCell } from '../engine/voronoi';
import { VoronoiRiver, VoronoiBurg, VoronoiState, VoronoiCulture, VoronoiRoute } from '../engine/voronoiMapGenerator';
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
  showElevation: boolean;
  showTemperature: boolean;
  showMoisture: boolean;
  showCultures: boolean;
  cultures: VoronoiCulture[];
  cultureMap: Map<string, number>;
}

export const MapRenderer: React.FC<MapRendererProps> = React.memo(({
  graph, cellTiles, rivers, burgs, routes, states, stateMap,
  mapWidth, mapHeight, cameraX, cameraY, zoom, selectedCell,
  showBiomes, showRivers, showBorders, showRoutes, showBurgs, showGrid, showPopulation,
  showRelief, showEmblems, showIce, showWind, showElevation,
  showTemperature, showMoisture, showCultures, cultures, cultureMap,
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

    // === 7b. Elevation heatmap overlay ===
    if (showElevation) drawElevationHeatmap(ctx, graph, cellTiles);

    // === 7c. Temperature heatmap ===
    if (showTemperature) drawTemperatureHeatmap(ctx, graph, cellTiles);

    // === 7d. Moisture heatmap ===
    if (showMoisture) drawMoistureHeatmap(ctx, graph, cellTiles);

    // === 7e. Culture overlay ===
    if (showCultures) drawCultureOverlay(ctx, graph, cellTiles, cultureMap, cultures);

    // === 8. Rivers ===
    if (showRivers) drawRivers(ctx, graph, rivers);

    // === 8b. River labels ===
    if (showRivers) drawRiverLabels(ctx, graph, rivers);

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
      showRelief, showEmblems, showIce, showWind, showElevation,
      showTemperature, showMoisture, showCultures, cultures, cultureMap, renderBase]);

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

// Göl renkleri (okyanusdan daha açık, turkuaz)
const LAKE_COLORS = ['#6db8d4', '#5da8c8', '#4d98bc'];

function drawOcean(ctx: CanvasRenderingContext2D, graph: VoronoiGraph, tiles: HexTile[], w: number, h: number): void {
  const n = graph.cells.length;

  // 1. BFS depth from coast
  const bfsDepth = new Int32Array(n).fill(-1);
  const queue: number[] = [];
  for (let i = 0; i < n; i++) {
    if (tiles[i].elevation >= SEA_LEVEL) continue;
    for (const ni of graph.cells[i].neighbors) {
      if (tiles[ni].elevation >= SEA_LEVEL) { bfsDepth[i] = 0; queue.push(i); break; }
    }
  }
  let qi = 0;
  while (qi < queue.length) {
    const ci = queue[qi++];
    for (const ni of graph.cells[ci].neighbors) {
      if (tiles[ni].elevation >= SEA_LEVEL || bfsDepth[ni] >= 0) continue;
      bfsDepth[ni] = bfsDepth[ci] + 1;
      queue.push(ni);
    }
  }

  // 2. Göl tespiti: harita kenarına bağlı olmayan su kütleleri
  // Kenar su hücrelerinden BFS → ulaşılamayan su = göl
  const isOcean = new Uint8Array(n); // 1=okyanus, 0=göl veya kara
  const edgeMargin = 20; // px
  const oceanQueue: number[] = [];
  for (let i = 0; i < n; i++) {
    if (tiles[i].elevation >= SEA_LEVEL) continue;
    const c = graph.cells[i].center;
    if (c.x < edgeMargin || c.x > w - edgeMargin || c.y < edgeMargin || c.y > h - edgeMargin) {
      isOcean[i] = 1;
      oceanQueue.push(i);
    }
  }
  let oqi = 0;
  while (oqi < oceanQueue.length) {
    const ci = oceanQueue[oqi++];
    for (const ni of graph.cells[ci].neighbors) {
      if (tiles[ni].elevation < SEA_LEVEL && !isOcean[ni]) {
        isOcean[ni] = 1;
        oceanQueue.push(ni);
      }
    }
  }

  // 3. Çiz
  for (let i = 0; i < n; i++) {
    if (tiles[i].elevation >= SEA_LEVEL) continue;
    const cell = graph.cells[i];
    if (cell.vertices.length < 3) continue;

    if (isOcean[i]) {
      // Okyanus: derinlik bazlı renk
      const bfs = bfsDepth[i] >= 0 ? bfsDepth[i] : 8;
      const elevDepth = Math.floor((SEA_LEVEL - tiles[i].elevation) / SEA_LEVEL * 8);
      const blended = Math.min(Math.round(bfs * 0.6 + elevDepth * 0.4), OCEAN_COLORS.length - 1);
      fillCell(ctx, cell.vertices, OCEAN_COLORS[blended]);
    } else {
      // Göl: açık turkuaz
      const d = Math.min(bfsDepth[i] >= 0 ? bfsDepth[i] : 2, LAKE_COLORS.length - 1);
      fillCell(ctx, cell.vertices, LAKE_COLORS[d]);
    }
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
  // Collect all coast segments
  const segments: Point[][] = [];
  for (const [a, b] of graph.edges) {
    const aL = tiles[a]?.elevation >= SEA_LEVEL;
    const bL = tiles[b]?.elevation >= SEA_LEVEL;
    if (aL === bL) continue;
    const shared = sharedVerts(graph.cells[a], graph.cells[b]);
    if (shared.length >= 2) segments.push(shared);
  }

  // Dış glow (açık mavi, geniş - su tarafı)
  ctx.strokeStyle = 'rgba(60,100,120,0.25)';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const seg of segments) {
    drawSmoothSegment(ctx, seg);
  }

  // Ana kıyı çizgisi (koyu, ince)
  ctx.strokeStyle = '#2a4a3a';
  ctx.lineWidth = 1.2;
  for (const seg of segments) {
    drawSmoothSegment(ctx, seg);
  }
}

// Segment'i bezier curve ile smooth çiz
function drawSmoothSegment(ctx: CanvasRenderingContext2D, pts: Point[]): void {
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  if (pts.length === 2) {
    ctx.lineTo(pts[1].x, pts[1].y);
  } else {
    // Quadratic bezier through points
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2;
      const my = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
  }
  ctx.stroke();
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
  // Küçük nehirler önce, büyükler üstte
  const sorted = [...rivers].sort((a, b) => a.flux - b.flux);
  const rng = new Alea(graph.cells.length * 53);

  for (const river of sorted) {
    if (river.path.length < 2) continue;

    // Kontrol noktalarını topla
    const pts: Point[] = [];
    for (const ci of river.path) {
      const cell = graph.cells[ci];
      if (cell) pts.push(cell.center);
    }
    if (pts.length < 2) continue;

    // Doğal menderes: her noktaya küçük perpendicular offset ekle
    const meandered: Point[] = [pts[0]]; // kaynak noktası sabit
    for (let i = 1; i < pts.length - 1; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const next = pts[i + 1];
      // Normal yön (akış yönüne dik)
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 0.1) { meandered.push(curr); continue; }
      const nx = -dy / len;
      const ny = dx / len;
      // Menderes offset: nehir büyüklüğüne ve pozisyona göre
      const t = i / (pts.length - 1);
      const amplitude = (2 + Math.sqrt(river.flux) * 0.15) * (0.3 + t * 0.7);
      const offset = rng.nextFloat(-amplitude, amplitude);
      meandered.push({
        x: curr.x + nx * offset,
        y: curr.y + ny * offset,
      });
    }
    meandered.push(pts[pts.length - 1]); // ağız noktası sabit

    // Genişlik hesapla
    const maxWidth = Math.min(5.5, 0.5 + Math.sqrt(river.flux) * 0.1);
    const minWidth = Math.max(0.4, maxWidth * 0.12);

    // Catmull-Rom spline ile yumuşak eğri çiz
    // Tek bir path olarak çiz (daha gerçekçi)
    ctx.beginPath();
    ctx.moveTo(meandered[0].x, meandered[0].y);

    if (meandered.length === 2) {
      ctx.lineTo(meandered[1].x, meandered[1].y);
    } else {
      // Catmull-Rom → Bezier conversion
      for (let i = 0; i < meandered.length - 1; i++) {
        const p0 = meandered[Math.max(0, i - 1)];
        const p1 = meandered[i];
        const p2 = meandered[Math.min(meandered.length - 1, i + 1)];
        const p3 = meandered[Math.min(meandered.length - 1, i + 2)];

        // Catmull-Rom to cubic bezier control points
        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
      }
    }

    // Gradient width: tek stroke ama width ortalaması
    const avgWidth = (minWidth + maxWidth) / 2;
    const alpha = 0.55 + Math.min(0.45, river.flux / 150);
    ctx.strokeStyle = `rgba(60,130,175,${alpha})`;
    ctx.lineWidth = avgWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // İkinci pass: kalın ana gövde (ağız tarafı)
    if (meandered.length >= 4 && maxWidth > 2) {
      const halfLen = Math.floor(meandered.length / 2);
      ctx.beginPath();
      ctx.moveTo(meandered[halfLen].x, meandered[halfLen].y);
      for (let i = halfLen; i < meandered.length - 1; i++) {
        const p0 = meandered[Math.max(0, i - 1)];
        const p1 = meandered[i];
        const p2 = meandered[Math.min(meandered.length - 1, i + 1)];
        const p3 = meandered[Math.min(meandered.length - 1, i + 2)];
        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
      }
      ctx.strokeStyle = `rgba(55,120,165,${alpha * 0.7})`;
      ctx.lineWidth = maxWidth;
      ctx.stroke();
    }

    // Delta efekti: denize dökülen büyük nehirler
    if (meandered.length >= 3 && maxWidth > 1.5) {
      const last = meandered[meandered.length - 1];
      const elev = useGameStore.getState().cellTiles[river.path[river.path.length - 1]]?.elevation;
      if (elev !== undefined && elev < SEA_LEVEL) {
        ctx.beginPath();
        ctx.arc(last.x, last.y, maxWidth * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(60,130,175,${alpha * 0.3})`;
        ctx.fill();
      }
    }
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

// ===== ELEVATION HEATMAP =====
function drawElevationHeatmap(ctx: CanvasRenderingContext2D, graph: VoronoiGraph, tiles: HexTile[]): void {
  ctx.save();
  ctx.globalAlpha = 0.55;

  for (let i = 0; i < graph.cells.length; i++) {
    const tile = tiles[i];
    if (!tile) continue;
    const cell = graph.cells[i];
    if (cell.vertices.length < 3) continue;

    const e = tile.elevation;
    let r: number, g: number, b: number;

    if (e < SEA_LEVEL) {
      // Su: mavi tonları (derin→açık)
      const t = e / SEA_LEVEL;
      r = Math.floor(10 + t * 40);
      g = Math.floor(20 + t * 80);
      b = Math.floor(80 + t * 120);
    } else {
      // Kara: yeşil → sarı → kahverengi → beyaz
      const t = (e - SEA_LEVEL) / (1 - SEA_LEVEL);
      if (t < 0.25) {
        // Düşük: yeşil
        r = Math.floor(40 + t * 4 * 120);
        g = Math.floor(140 + t * 4 * 60);
        b = Math.floor(40);
      } else if (t < 0.5) {
        // Orta: sarı-kahverengi
        const u = (t - 0.25) * 4;
        r = Math.floor(160 + u * 60);
        g = Math.floor(200 - u * 80);
        b = Math.floor(40 + u * 20);
      } else if (t < 0.75) {
        // Yüksek: kahverengi
        const u = (t - 0.5) * 4;
        r = Math.floor(220 - u * 40);
        g = Math.floor(120 - u * 40);
        b = Math.floor(60 + u * 40);
      } else {
        // Çok yüksek: beyaz
        const u = (t - 0.75) * 4;
        r = Math.floor(180 + u * 75);
        g = Math.floor(80 + u * 175);
        b = Math.floor(100 + u * 155);
      }
    }

    fillCell(ctx, cell.vertices, `rgb(${r},${g},${b})`);
  }
  ctx.restore();
}

// ===== TEMPERATURE HEATMAP =====
function drawTemperatureHeatmap(ctx: CanvasRenderingContext2D, graph: VoronoiGraph, tiles: HexTile[]): void {
  ctx.save();
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < graph.cells.length; i++) {
    const tile = tiles[i];
    if (!tile) continue;
    const cell = graph.cells[i];
    if (cell.vertices.length < 3) continue;
    // HSL: kırmızı(0)=sıcak, mavi(240)=soğuk
    const hue = Math.floor((1 - tile.temperature) * 240);
    fillCell(ctx, cell.vertices, `hsl(${hue}, 80%, 50%)`);
  }
  ctx.restore();
}

// ===== MOISTURE HEATMAP =====
function drawMoistureHeatmap(ctx: CanvasRenderingContext2D, graph: VoronoiGraph, tiles: HexTile[]): void {
  ctx.save();
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < graph.cells.length; i++) {
    const tile = tiles[i];
    if (!tile) continue;
    const cell = graph.cells[i];
    if (cell.vertices.length < 3) continue;
    // Kahverengi(kuru) → yeşil(orta) → mavi(ıslak)
    const m = tile.moisture;
    const hue = Math.floor(m * 120 + 30);
    const light = Math.floor(40 + m * 20);
    fillCell(ctx, cell.vertices, `hsl(${hue}, 70%, ${light}%)`);
  }
  ctx.restore();
}

// ===== CULTURE OVERLAY =====
const CULTURE_COLORS_MAP = [
  '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
  '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#fabed4',
];

function drawCultureOverlay(ctx: CanvasRenderingContext2D, graph: VoronoiGraph, tiles: HexTile[], cultureMap: Map<string, number>, cultures: VoronoiCulture[]): void {
  ctx.save();
  ctx.globalAlpha = 0.35;
  for (let i = 0; i < graph.cells.length; i++) {
    const tile = tiles[i];
    if (!tile || tile.elevation < SEA_LEVEL) continue;
    const cell = graph.cells[i];
    if (cell.vertices.length < 3) continue;
    const cId = cultureMap.get(cellKey(i));
    if (cId === undefined || cId < 0) continue;
    const color = CULTURE_COLORS_MAP[cId % CULTURE_COLORS_MAP.length];
    fillCell(ctx, cell.vertices, color);
  }
  ctx.restore();

  // Kültür etiketleri
  for (const culture of cultures) {
    if (culture.cells.length < 5) continue;
    let cx = 0, cy = 0;
    for (const ci of culture.cells) {
      cx += graph.cells[ci].center.x;
      cy += graph.cells[ci].center.y;
    }
    cx /= culture.cells.length;
    cy /= culture.cells.length;
    const fs = Math.min(14, Math.max(7, Math.sqrt(culture.cells.length) * 0.5));
    ctx.font = `italic ${fs}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(80,40,20,0.5)';
    ctx.fillText(culture.name, cx, cy);
  }
}

// ===== RIVER LABELS =====
function drawRiverLabels(ctx: CanvasRenderingContext2D, graph: VoronoiGraph, rivers: VoronoiRiver[]): void {
  for (const river of rivers) {
    if (river.path.length < 6) continue;
    const midIdx = Math.floor(river.path.length / 2);
    const cell = graph.cells[river.path[midIdx]];
    if (!cell) continue;
    const prevCell = graph.cells[river.path[Math.max(0, midIdx - 1)]];
    const nextCell = graph.cells[river.path[Math.min(river.path.length - 1, midIdx + 1)]];
    if (!prevCell || !nextCell) continue;
    const angle = Math.atan2(
      nextCell.center.y - prevCell.center.y,
      nextCell.center.x - prevCell.center.x,
    );
    ctx.save();
    ctx.translate(cell.center.x, cell.center.y);
    // Ters dönük yazı okumak zor, düzelt
    const adjustedAngle = angle > Math.PI / 2 || angle < -Math.PI / 2 ? angle + Math.PI : angle;
    ctx.rotate(adjustedAngle);
    ctx.font = 'italic 7px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = 'rgba(40,80,130,0.55)';
    ctx.fillText(river.name, 0, -3);
    ctx.restore();
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
  const mapW = useGameStore.getState().mapWidth;
  const seed = useGameStore.getState().seed;
  const key = `${count}_${mapW}_${seed}`;
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

// Şehir büyüklüğüne göre farklı ikonlar
const CITY_TIERS = [
  { minPop: 8000, icons: ['🏰', '🏛️', '⛪'], surLabel: '🛡️', size: 18 }, // Başkent/Metropol
  { minPop: 5000, icons: ['🏘️', '🏗️'], surLabel: '🏰', size: 15 },       // Büyük şehir
  { minPop: 3000, icons: ['🏠', '🏘️'], surLabel: '', size: 13 },           // Orta şehir
  { minPop: 1000, icons: ['🏠'], surLabel: '', size: 11 },                   // Küçük kasaba
  { minPop: 0, icons: ['🛖'], surLabel: '', size: 9 },                       // Köy
];

function drawBurgs(ctx: CanvasRenderingContext2D, graph: VoronoiGraph, burgs: VoronoiBurg[], stateMap: Map<string, number>, zoom: number): void {
  // Küçükten büyüğe sırala (büyükler üstte çizilsin)
  const sorted = [...burgs].sort((a, b) => a.population - b.population);

  for (const burg of sorted) {
    const cell = graph.cells[burg.cellIndex];
    if (!cell) continue;
    const { x, y } = cell.center;

    const sId = stateMap.get(cellKey(burg.cellIndex));
    const col = sId !== undefined ? STATE_COLORS[sId % STATE_COLORS.length] : '#dababf';

    // Tier belirle
    const tier = CITY_TIERS.find(t => burg.population >= t.minPop) || CITY_TIERS[CITY_TIERS.length - 1];
    const rng = new Alea(burg.id * 77 + burg.population);

    if (burg.isCapital) {
      // === BAŞKENT ===
      // Sur çemberi
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Taç ikonu
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('👑', x, y - 12);

      // Ana yapı (kale/saray)
      ctx.font = `${tier.size}px sans-serif`;
      ctx.fillText('🏰', x, y);

      // Etrafında küçük yapılar
      const buildIcons = ['🏛️', '⛪', '🏘️', '🏗️'];
      for (let i = 0; i < Math.min(4, Math.floor(burg.population / 2000)); i++) {
        const angle = (i / 4) * Math.PI * 2 + rng.nextFloat(-0.3, 0.3);
        const dist = 10 + rng.nextFloat(0, 4);
        ctx.font = '8px sans-serif';
        ctx.fillText(buildIcons[i % buildIcons.length], x + Math.cos(angle) * dist, y + Math.sin(angle) * dist);
      }

      // Liman ikonu
      if (burg.port) {
        ctx.font = '9px sans-serif';
        ctx.fillText('⚓', x + 12, y + 8);
      }

    } else if (burg.population >= 5000) {
      // === BÜYÜK ŞEHİR ===
      // Sur
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = col + 'AA';
      ctx.fill();
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Ana yapı
      const mainIcon = tier.icons[Math.floor(rng.next() * tier.icons.length)];
      ctx.font = `${tier.size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(mainIcon, x, y);

      // 1-2 ek yapı
      const extras = Math.floor(burg.population / 3000);
      for (let i = 0; i < Math.min(extras, 2); i++) {
        const angle = rng.nextFloat(0, Math.PI * 2);
        ctx.font = '7px sans-serif';
        ctx.fillText('🏠', x + Math.cos(angle) * 7, y + Math.sin(angle) * 7);
      }

      if (burg.port) {
        ctx.font = '7px sans-serif';
        ctx.fillText('⚓', x + 8, y + 6);
      }

    } else if (burg.population >= 2000) {
      // === ORTA ŞEHİR ===
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#FFF';
      ctx.fill();
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 0.6;
      ctx.stroke();

      const mainIcon = tier.icons[Math.floor(rng.next() * tier.icons.length)];
      ctx.font = `${tier.size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(mainIcon, x, y);

    } else if (burg.population >= 1000) {
      // === KÜÇÜK KASABA ===
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#FFF';
      ctx.fill();
      ctx.strokeStyle = '#777';
      ctx.lineWidth = 0.4;
      ctx.stroke();

      ctx.font = `${tier.size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🏠', x, y);

    } else {
      // === KÖY ===
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = '#DDD';
      ctx.fill();

      ctx.font = '8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🛖', x, y);
    }

    // Label
    if (zoom > 0.5 || burg.isCapital || burg.population > 2000) {
      const fs = burg.isCapital ? 12 : burg.population > 5000 ? 9 : burg.population > 2000 ? 7 : 6;
      ctx.font = `${burg.isCapital ? 'bold ' : ''}${fs}px "Almendra SC", Georgia, serif`;
      ctx.textAlign = 'center';
      const ly = burg.isCapital ? y - 18 : y - (tier.size / 2 + 4);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 2.5;
      ctx.strokeText(burg.name, x, ly);
      ctx.fillStyle = burg.isCapital ? '#1a1a1a' : '#2a2a2a';
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
