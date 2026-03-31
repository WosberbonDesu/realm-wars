// Voronoi-based harita üretim pipeline'ı
// Azgaar tarzı: jittered grid → Voronoi → heightmap → biome → rivers → features
// Hex grid tamamen devre dışı, organik polygon hücreler

import { HexTile, HexTerrain, hexKey, Resources } from '../types/game';
import { createNoise2D } from './noise';
import { Alea } from './alea';
import { classifyBiome, baseTemperature, applyLapseRate, SEA_LEVEL } from './biomes';
import { NameGenerator } from './nameGenerator';
import { Point, VoronoiGraph, VoronoiCell, chaikinSmooth } from './voronoi';
import {
  VoronoiMapData, createVoronoiMap, findCoastEdges,
  cellKey, normalizeCoord, cellDistance,
} from './voronoiGrid';
import { TERRAIN_RESOURCES, MAP_RADIUS } from '../constants/game';

// ===== Voronoi Map Result =====
export interface VoronoiMapResult {
  voronoi: VoronoiMapData;
  tiles: Map<string, HexTile>;          // cellKey → tile (geriye uyumluluk)
  cellTiles: HexTile[];                  // index-aligned tile array
  rivers: VoronoiRiver[];
  coastPaths: Point[][];                 // yumuşatılmış kıyı çizgileri
  borderPaths: Map<string, Point[][]>;   // stateId → sınır çizgileri
  seed: number;
  width: number;
  height: number;
}

export interface VoronoiRiver {
  id: number;
  path: number[];     // cell index'leri
  flux: number;
  name: string;
}

// ===== ANA PIPELINE =====
export function generateVoronoiMap(
  seed: number = Date.now(),
  width: number = 1200,
  height: number = 800,
  cellCount: number = 3000,
): VoronoiMapResult {
  const rng = new Alea(seed);
  const nameGen = new NameGenerator(seed);

  // --- Aşama 1: Voronoi grid oluştur ---
  const voronoiData = createVoronoiMap({ width, height, cellCount, seed, jitter: 0.7 });
  const graph = voronoiData.graph;
  const n = graph.cells.length;

  // --- Aşama 2: Heightmap ---
  const noise1 = createNoise2D(seed);
  const noise2 = createNoise2D(seed + 1337);
  const noise3 = createNoise2D(seed + 7919);

  const useArchipelago = rng.next() > 0.6;

  // Hill primitifler
  const hillCount = rng.nextInt(3, 7);
  const hills: { x: number; y: number; strength: number; size: number }[] = [];
  for (let i = 0; i < hillCount; i++) {
    hills.push({
      x: rng.nextFloat(width * 0.15, width * 0.85),
      y: rng.nextFloat(height * 0.15, height * 0.85),
      strength: rng.nextFloat(0.15, 0.4),
      size: rng.nextFloat(width * 0.08, width * 0.2),
    });
  }

  // Dağ sıraları
  const rangeCount = rng.nextInt(1, 3);
  const ranges: { x1: number; y1: number; x2: number; y2: number; w: number; h: number }[] = [];
  for (let i = 0; i < rangeCount; i++) {
    const angle = rng.nextFloat(0, Math.PI);
    const len = width * rng.nextFloat(0.3, 0.6);
    const cx = width / 2, cy = height / 2;
    ranges.push({
      x1: cx + Math.cos(angle) * len * 0.5,
      y1: cy + Math.sin(angle) * len * 0.5,
      x2: cx - Math.cos(angle) * len * 0.5,
      y2: cy - Math.sin(angle) * len * 0.5,
      w: rng.nextFloat(width * 0.02, width * 0.06),
      h: rng.nextFloat(0.3, 0.5),
    });
  }

  for (let i = 0; i < n; i++) {
    const cell = graph.cells[i];
    const { nx, ny } = normalizeCoord(cell, width, height);
    // -0.5 to 0.5 range for noise
    const sx = (nx - 0.5) * 20;
    const sy = (ny - 0.5) * 20;

    let e = noise1(sx * 0.3, sy * 0.3) * 0.4
          + noise2(sx * 0.6, sy * 0.6) * 0.25
          + noise3(sx * 1.2, sy * 1.2) * 0.1;

    // Continent shape (merkeze yakın yüksek)
    const distFromCenter = Math.sqrt((nx - 0.5) ** 2 + (ny - 0.5) ** 2) * 2;
    if (useArchipelago) {
      const centers = [
        { cx: 0.3, cy: 0.5 }, { cx: 0.7, cy: 0.3 },
        { cx: 0.5, cy: 0.7 }, { cx: 0.6, cy: 0.6 },
      ];
      let maxInf = 0;
      for (const c of centers) {
        const d = Math.sqrt((nx - c.cx) ** 2 + (ny - c.cy) ** 2) / 0.3;
        maxInf = Math.max(maxInf, Math.max(0, 1 - d));
      }
      e += maxInf * 0.35;
    } else {
      e += Math.max(0, 1 - distFromCenter * 1.3) * 0.35;
    }

    // Hill primitifler
    for (const hill of hills) {
      const dx = cell.center.x - hill.x;
      const dy = cell.center.y - hill.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < hill.size) {
        e += ((1 - dist / hill.size) ** 2) * hill.strength;
      }
    }

    // Dağ sıraları
    for (const range of ranges) {
      const dist = ptSegDist(cell.center.x, cell.center.y, range.x1, range.y1, range.x2, range.y2);
      if (dist < range.w) {
        e += ((1 - dist / range.w) ** 2) * range.h;
      }
    }

    voronoiData.elevation[i] = Math.max(0, Math.min(1, (e + 0.5) / 1.5));
  }

  // --- Aşama 3: Temperature ---
  const tempNoise = createNoise2D(seed + 3000);
  for (let i = 0; i < n; i++) {
    const { nx, ny } = normalizeCoord(graph.cells[i], width, height);
    const dist = Math.sqrt((nx - 0.5) ** 2 + (ny - 0.5) ** 2) * 2;
    let temp = Math.max(0, Math.min(1, 1 - dist * 0.8));
    temp = applyLapseRate(temp, voronoiData.elevation[i]);
    temp += tempNoise((nx - 0.5) * 10, (ny - 0.5) * 10) * 0.1;
    voronoiData.temperature[i] = Math.max(0, Math.min(1, temp));
  }

  // --- Aşama 4: Moisture ---
  const moistNoise1 = createNoise2D(seed + 5000);
  const moistNoise2 = createNoise2D(seed + 6000);
  for (let i = 0; i < n; i++) {
    const { nx, ny } = normalizeCoord(graph.cells[i], width, height);
    const sx = (nx - 0.5) * 20;
    const sy = (ny - 0.5) * 20;
    let m = moistNoise1(sx * 0.4, sy * 0.4) * 0.5
          + moistNoise2(sx * 0.8, sy * 0.8) * 0.25
          + 0.35;

    const elev = voronoiData.elevation[i];
    if (elev < SEA_LEVEL) {
      m = 0.8;
    } else {
      const landElev = (elev - SEA_LEVEL) / (1 - SEA_LEVEL);
      if (landElev > 0.5) m -= (landElev - 0.5) * 0.3;
    }
    voronoiData.moisture[i] = Math.max(0, Math.min(1, m));
  }

  // --- Aşama 5: Biome classification + Tile creation ---
  const tiles = new Map<string, HexTile>();
  const cellTiles: HexTile[] = [];

  for (let i = 0; i < n; i++) {
    const cell = graph.cells[i];
    const elev = voronoiData.elevation[i];
    const moist = voronoiData.moisture[i];
    const temp = voronoiData.temperature[i];

    const biome = classifyBiome(elev, moist, temp);
    const baseRes = TERRAIN_RESOURCES[biome.terrain] || {};
    const key = cellKey(i);

    const tile: HexTile = {
      coord: { q: i, r: 0 },  // Voronoi index as q, r=0
      terrain: biome.terrain,
      elevation: elev,
      moisture: moist,
      temperature: temp,
      hasRiver: false,
      riverFlow: 0,
      featureId: -1,
      isCoast: false,
      visible: true,   // Voronoi preview'da hep görünür
      explored: true,
      ownerId: null,
      building: null,
      army: null,
      resources: {
        gold: baseRes.gold || 0,
        iron: baseRes.iron || 0,
        food: baseRes.food || 0,
        wood: baseRes.wood || 0,
        stone: baseRes.stone || 0,
      },
      biomeName: biome.name,
      regionName: '',
    };

    tiles.set(key, tile);
    cellTiles.push(tile);
  }

  // --- Aşama 6: Voronoi rivers (kenar bazlı flux) ---
  const rivers = generateVoronoiRivers(graph, voronoiData.elevation, voronoiData.moisture, n, nameGen);

  // River hücrelerini işaretle
  for (const river of rivers) {
    for (const ci of river.path) {
      cellTiles[ci].hasRiver = true;
      cellTiles[ci].riverFlow = river.flux;
      // Nehir kenarında kaynak bonusu
      cellTiles[ci].resources.gold += 1;
      cellTiles[ci].resources.food += 1;
    }
  }

  // --- Aşama 7: Coast edges (Chaikin smooth) ---
  const isLand = (i: number) => voronoiData.elevation[i] >= SEA_LEVEL;
  const coastEdgesRaw = findCoastEdges(graph, isLand, 3);
  voronoiData.coastEdges = coastEdgesRaw;

  // Coast paths: kenarları birleştir
  const coastPaths: Point[][] = coastEdgesRaw.map(e => e.smoothPath);

  // Coast hücrelerini işaretle
  for (const edge of coastEdgesRaw) {
    if (isLand(edge.from)) cellTiles[edge.from].isCoast = true;
    if (isLand(edge.to)) cellTiles[edge.to].isCoast = true;
  }

  return {
    voronoi: voronoiData,
    tiles,
    cellTiles,
    rivers,
    coastPaths,
    borderPaths: new Map(),
    seed,
    width,
    height,
  };
}

// ===== Voronoi River Generation =====
function generateVoronoiRivers(
  graph: VoronoiGraph,
  elevation: Float32Array,
  moisture: Float32Array,
  n: number,
  nameGen: NameGenerator,
  minFlux: number = 4,
): VoronoiRiver[] {
  // Downhill flow: her kara hücresinden en alçak komşuya
  const downhill = new Int32Array(n).fill(-1);
  const flux = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    if (elevation[i] < SEA_LEVEL) continue;
    flux[i] = moisture[i];

    let lowest = -1;
    let lowestElev = elevation[i];
    for (const ni of graph.cells[i].neighbors) {
      if (elevation[ni] < lowestElev) {
        lowestElev = elevation[ni];
        lowest = ni;
      }
    }
    downhill[i] = lowest;
  }

  // Sort by elevation (high to low), accumulate flux
  const sorted = Array.from({ length: n }, (_, i) => i)
    .filter(i => elevation[i] >= SEA_LEVEL)
    .sort((a, b) => elevation[b] - elevation[a]);

  for (const i of sorted) {
    if (downhill[i] >= 0) {
      flux[downhill[i]] += flux[i];
    }
  }

  // Trace rivers from high-flux cells
  const rivers: VoronoiRiver[] = [];
  const visited = new Set<number>();

  const sources = sorted
    .filter(i => flux[i] >= minFlux)
    .sort((a, b) => flux[b] - flux[a]);

  for (const src of sources) {
    if (visited.has(src)) continue;

    const path: number[] = [];
    let cur = src;

    while (cur >= 0 && !visited.has(cur)) {
      path.push(cur);
      visited.add(cur);

      if (downhill[cur] >= 0 && elevation[downhill[cur]] < SEA_LEVEL) break;
      cur = downhill[cur];
    }

    if (path.length >= 3) {
      rivers.push({
        id: rivers.length,
        path,
        flux: flux[src],
        name: nameGen.riverName(),
      });
    }
  }

  return rivers;
}

// Point-to-segment distance
function ptSegDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt((px - x1 - t * dx) ** 2 + (py - y1 - t * dy) ** 2);
}
