import React, { useRef, useEffect, useCallback } from 'react';
import { View, Dimensions, Platform } from 'react-native';
import { HexTile, HexTerrain } from '../types/game';
import { TERRAIN_COLORS, RIVER_COLOR } from '../constants/game';
import { Point, VoronoiGraph, VoronoiCell } from '../engine/voronoi';
import { VoronoiRiver, VoronoiBurg, VoronoiState, VoronoiRoute } from '../engine/voronoiMapGenerator';
import { cellKey } from '../engine/voronoiGrid';
import { SEA_LEVEL } from '../engine/biomes';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Gerçekçi okyanus renkleri (kıyıda açık, derinde koyu mavi)
const OCEAN_COLORS = ['#7FCDEE', '#5BB5D5', '#3E9DBD', '#2885A5', '#1A6D8D', '#0F5575', '#083D5D'];

// Biome renkleri (Azgaar tarzı - daha doğal, daha soft)
const BIOME_FILL: Record<string, string> = {
  [HexTerrain.Ocean]: '#88A088',
  [HexTerrain.Coast]: '#A8B8A8',
  [HexTerrain.Lake]: '#6B9FBF',
  [HexTerrain.Plains]: '#D4E09B',
  [HexTerrain.Forest]: '#6B8E23',
  [HexTerrain.Mountain]: '#A0908A',
  [HexTerrain.Desert]: '#F0DC82',
  [HexTerrain.Swamp]: '#8B9D77',
  [HexTerrain.Tundra]: '#C8D8C8',
  [HexTerrain.Snow]: '#E8ECE8',
};

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
}

export const MapRenderer: React.FC<MapRendererProps> = React.memo(({
  graph, cellTiles, rivers, burgs, routes, states, stateMap, coastPaths,
  mapWidth, mapHeight, cameraX, cameraY, zoom, selectedCell,
  showBiomes, showRivers, showBorders, showRoutes, showBurgs, showGrid,
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
    ctx.fillStyle = '#083D5D';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(zoom, zoom);

    // === Pass 1: Ocean depth layers (Azgaar'daki gri konturlar) ===
    drawOceanLayers(ctx, graph, cellTiles, mapWidth, mapHeight);

    // === Pass 2: Land cells - biome altında, üstüne state overlay ===
    for (let i = 0; i < graph.cells.length; i++) {
      const cell = graph.cells[i];
      if (cell.vertices.length < 3) continue;
      const tile = cellTiles[i];
      if (!tile || tile.elevation < SEA_LEVEL) continue;

      // Biome rengi (her zaman çiz - base layer)
      const biomeColor = showBiomes ? getBiomeColor(tile) : BIOME_FILL[tile.terrain] || '#888';
      fillPoly(ctx, cell.vertices, biomeColor);

      // State overlay (yarı saydam, biome üzerine)
      if (showBorders) {
        const sId = stateMap.get(cellKey(i));
        if (sId !== undefined && sId >= 0 && sId < states.length) {
          fillPoly(ctx, cell.vertices, states[sId].color + '88');
        }
      }
    }

    // === Pass 3: Kıyı çizgileri (belirgin) ===
    drawCoastlines(ctx, graph, cellTiles);

    // === Pass 4: Grid ===
    if (showGrid) {
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 0.3;
      for (const cell of graph.cells) {
        if (cell.vertices.length < 3) continue;
        strokePoly(ctx, cell.vertices);
      }
    }

    // === Pass 5: State borders (kalın, belirgin) ===
    if (showBorders) {
      drawStateBorders(ctx, graph, stateMap, states);
    }

    // === Pass 6: Rivers ===
    if (showRivers) {
      drawRivers(ctx, graph, rivers);
    }

    // === Pass 7: Routes ===
    if (showRoutes) {
      drawRoutes(ctx, graph, routes);
    }

    // === Pass 8: Burgs ===
    if (showBurgs) {
      drawBurgs(ctx, graph, burgs, zoom);
    }

    // === Pass 9: State labels (Azgaar tarzı büyük isimler) ===
    if (showBorders) {
      drawStateLabels(ctx, graph, states);
    }

    // === Pass 10: Selection ===
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
        <canvas ref={canvasRef as any} width={SCREEN_W} height={SCREEN_H}
          style={{ width: '100%', height: '100%' } as any} />
      </View>
    );
  }
  return <View style={{ flex: 1, backgroundColor: '#083D5D' }} />;
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
  // BFS'den okyanusa derinlik ata
  const n = graph.cells.length;
  const depth = new Int32Array(n).fill(-1);
  const queue: number[] = [];

  // Kıyı hücrelerini bul (kara komşusu olan su hücreleri)
  for (let i = 0; i < n; i++) {
    if (tiles[i].elevation >= SEA_LEVEL) continue;
    for (const ni of graph.cells[i].neighbors) {
      if (tiles[ni].elevation >= SEA_LEVEL) {
        depth[i] = 0;
        queue.push(i);
        break;
      }
    }
  }

  // BFS yayılım
  let qi = 0;
  while (qi < queue.length) {
    const ci = queue[qi++];
    for (const ni of graph.cells[ci].neighbors) {
      if (tiles[ni].elevation >= SEA_LEVEL) continue;
      if (depth[ni] >= 0) continue;
      depth[ni] = depth[ci] + 1;
      queue.push(ni);
    }
  }

  // Su hücrelerini derinliğe göre renklendir
  for (let i = 0; i < n; i++) {
    if (tiles[i].elevation >= SEA_LEVEL) continue;
    const cell = graph.cells[i];
    if (cell.vertices.length < 3) continue;

    const d = Math.min(depth[i] >= 0 ? depth[i] : 6, OCEAN_COLORS.length - 1);
    fillPoly(ctx, cell.vertices, OCEAN_COLORS[d]);
  }
}

function drawCoastlines(ctx: CanvasRenderingContext2D, graph: VoronoiGraph, tiles: HexTile[]): void {
  ctx.strokeStyle = '#2A4A3A';
  ctx.lineWidth = 2;

  for (const [a, b] of graph.edges) {
    const aLand = tiles[a]?.elevation >= SEA_LEVEL;
    const bLand = tiles[b]?.elevation >= SEA_LEVEL;
    if (aLand === bLand) continue;

    // Ortak kenar köşelerini bul
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
  // Sınır segmentlerini topla ve birleştir
  const borderSegments: Point[][] = [];

  for (const [a, b] of graph.edges) {
    const sA = stateMap.get(cellKey(a));
    const sB = stateMap.get(cellKey(b));
    if (sA === undefined && sB === undefined) continue;
    if (sA === sB) continue;

    const shared = findSharedVertices(graph.cells[a], graph.cells[b]);
    if (shared.length >= 2) {
      borderSegments.push(shared);
    }
  }

  // Her segmenti çiz (hafif gölge + ana çizgi)
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Gölge
  for (const seg of borderSegments) {
    ctx.beginPath();
    ctx.moveTo(seg[0].x + 1, seg[0].y + 1);
    for (let i = 1; i < seg.length; i++) ctx.lineTo(seg[i].x + 1, seg[i].y + 1);
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 3.5;
    ctx.stroke();
  }

  // Ana sınır çizgisi
  for (const seg of borderSegments) {
    ctx.beginPath();
    ctx.moveTo(seg[0].x, seg[0].y);
    for (let i = 1; i < seg.length; i++) ctx.lineTo(seg[i].x, seg[i].y);
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([5, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
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
        if (cn) {
          ctx.quadraticCurveTo(ci.x, ci.y, (ci.x + cn.x) / 2, (ci.y + cn.y) / 2);
        } else {
          ctx.lineTo(ci.x, ci.y);
        }
      } else {
        ctx.lineTo(ci.x, ci.y);
      }
    }

    ctx.strokeStyle = '#5D97BB';
    ctx.lineWidth = Math.min(6, 0.8 + river.flux * 0.15);
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

    ctx.strokeStyle = route.type === 'highway' ? '#D06324CC' :
                      route.type === 'road' ? '#88888899' : '#66666644';
    ctx.lineWidth = route.type === 'highway' ? 1.5 : route.type === 'road' ? 0.8 : 0.4;
    ctx.setLineDash(route.type === 'trail' ? [3, 3] : route.type === 'road' ? [4, 2] : []);
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawBurgs(ctx: CanvasRenderingContext2D, graph: VoronoiGraph, burgs: VoronoiBurg[], zoom: number): void {
  // Küçük burg'ları önce, capital'ları son çiz
  const sorted = [...burgs].sort((a, b) => (a.isCapital ? 1 : 0) - (b.isCapital ? 1 : 0));

  for (const burg of sorted) {
    const cell = graph.cells[burg.cellIndex];
    if (!cell) continue;
    const { x, y } = cell.center;

    const size = burg.isCapital ? 5 : burg.population > 2000 ? 3.5 : 2;

    if (burg.isCapital) {
      // Başkent: star/crown şekli
      const s = 7;
      // Altın yıldız
      ctx.beginPath();
      for (let j = 0; j < 5; j++) {
        const angle = -Math.PI / 2 + (j * 2 * Math.PI) / 5;
        const outerX = x + Math.cos(angle) * s;
        const outerY = y + Math.sin(angle) * s;
        if (j === 0) ctx.moveTo(outerX, outerY);
        else ctx.lineTo(outerX, outerY);
        const innerAngle = angle + Math.PI / 5;
        ctx.lineTo(x + Math.cos(innerAngle) * s * 0.4, y + Math.sin(innerAngle) * s * 0.4);
      }
      ctx.closePath();
      ctx.fillStyle = '#FFD700';
      ctx.fill();
      ctx.strokeStyle = '#8B6914';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Taç emoji üstte
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('👑', x, y - 10);
    } else {
      // Normal burg: daire
      ctx.beginPath();
      ctx.arc(x + 0.4, y + 0.4, size + 0.3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = burg.population > 2000 ? '#FFF' : '#DDD';
      ctx.fill();
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    // Label
    if (zoom > 0.5 || burg.isCapital || burg.population > 2000) {
      const fontSize = burg.isCapital ? 12 : burg.population > 2000 ? 9 : 7;
      ctx.font = `${burg.isCapital ? 'bold ' : ''}${fontSize}px "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      const labelY = burg.isCapital ? y - 18 : y - size - 3;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 3;
      ctx.strokeText(burg.name, x, labelY);
      ctx.fillStyle = '#222';
      ctx.fillText(burg.name, x, labelY);
    }
  }
}

function drawStateLabels(ctx: CanvasRenderingContext2D, graph: VoronoiGraph, states: VoronoiState[]): void {
  for (const state of states) {
    if (state.cells.length === 0) continue;

    // Devletin ağırlık merkezi
    let cx = 0, cy = 0;
    for (const ci of state.cells) {
      cx += graph.cells[ci].center.x;
      cy += graph.cells[ci].center.y;
    }
    cx /= state.cells.length;
    cy /= state.cells.length;

    // Label boyutu alan büyüklüğüne göre
    const fontSize = Math.min(24, Math.max(10, Math.sqrt(state.cells.length) * 0.8));

    ctx.save();
    ctx.font = `italic ${fontSize}px "Georgia", "Times New Roman", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Gölge
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillText(state.name, cx + 1, cy + 1);

    // Ana metin
    ctx.fillStyle = 'rgba(50,50,50,0.7)';
    ctx.fillText(state.name, cx, cy);
    ctx.restore();
  }
}

function getBiomeColor(tile: HexTile): string {
  const base = BIOME_FILL[tile.terrain] || '#888';
  const factor = 0.8 + tile.elevation * 0.35;
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
