// Voronoi-based harita üretim pipeline'ı - TAM Azgaar uyumlu
// Jittered grid → Voronoi → heightmap → biome → rivers → burgs → cultures → states → routes

import { HexTile, HexTerrain, hexKey, Resources } from '../types/game';
import { createNoise2D } from './noise';
import { Alea } from './alea';
import { classifyBiome, applyLapseRate, SEA_LEVEL } from './biomes';
import { NameGenerator } from './nameGenerator';
import { Point, VoronoiGraph, chaikinSmooth } from './voronoi';
import {
  VoronoiMapData, createVoronoiMap, findCoastEdges,
  cellKey, normalizeCoord, cellDistance,
} from './voronoiGrid';
import { TERRAIN_RESOURCES } from '../constants/game';

// ===== Types =====
export type MapTemplate = 'highIsland' | 'continent' | 'archipelago' | 'pangaea';
export interface VoronoiRiver {
  id: number;
  path: number[];
  flux: number;
  name: string;
}

export interface VoronoiBurg {
  id: number;
  cellIndex: number;
  name: string;
  population: number;
  isCapital: boolean;
  stateId: number;
  port: boolean;
  score: number;
}

export interface VoronoiState {
  id: number;
  name: string;
  color: string;
  capitalBurg: number;
  cells: number[];
  burgIds: number[];
  formName: string;
  neighbors: number[];
}

export interface VoronoiCulture {
  id: number;
  name: string;
  color: string;
  cells: number[];
  center: number;
}

export interface VoronoiRoute {
  id: number;
  fromBurg: number;
  toBurg: number;
  path: number[];      // cell indices
  type: 'highway' | 'road' | 'trail';
}

export interface VoronoiMapResult {
  voronoi: VoronoiMapData;
  tiles: Map<string, HexTile>;
  cellTiles: HexTile[];
  rivers: VoronoiRiver[];
  burgs: VoronoiBurg[];
  states: VoronoiState[];
  cultures: VoronoiCulture[];
  routes: VoronoiRoute[];
  coastPaths: Point[][];
  stateMap: Map<string, number>;    // cellKey → stateId
  cultureMap: Map<string, number>;  // cellKey → cultureId
  seed: number;
  width: number;
  height: number;
}

// Azgaar C_12 state renkleri
const STATE_COLORS = [
  '#dababf', '#fb8072', '#80b1d3', '#fdb462', '#b3de69',
  '#fccde5', '#c6b9c1', '#bc80bd', '#ccebc5', '#ffed6f',
  '#8dd3c7', '#eb8de7',
];

const CULTURE_COLORS = [
  '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
  '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#fabed4',
];

const FORM_NAMES = [
  'Krallik', 'Imparatorluk', 'Cumhuriyet', 'Hanlik', 'Beylik',
  'Sultanlik', 'Prenslik', 'Dukalik',
];

// ===== ANA PIPELINE =====
export function generateVoronoiMap(
  seed: number = Date.now(),
  width: number = 1200,
  height: number = 800,
  cellCount: number = 3000,
  template: MapTemplate = 'highIsland',
): VoronoiMapResult {
  const rng = new Alea(seed);
  const nameGen = new NameGenerator(seed);

  // --- 1. Voronoi grid ---
  const voronoiData = createVoronoiMap({ width, height, cellCount, seed, jitter: 0.7 });
  const graph = voronoiData.graph;
  const n = graph.cells.length;

  // --- 2. Heightmap ---
  generateHeightmap(voronoiData, graph, rng, width, height, seed, template);

  // --- 3. Temperature ---
  generateTemperature(voronoiData, graph, width, height, seed);

  // --- 4. Moisture ---
  generateMoisture(voronoiData, graph, width, height, seed);

  // --- 5. Biome + Tiles ---
  const tiles = new Map<string, HexTile>();
  const cellTiles: HexTile[] = [];
  const terrainArr: HexTerrain[] = [];
  const landCells: number[] = [];

  for (let i = 0; i < n; i++) {
    const elev = voronoiData.elevation[i];
    const moist = voronoiData.moisture[i];
    const temp = voronoiData.temperature[i];
    const biome = classifyBiome(elev, moist, temp);
    const baseRes = TERRAIN_RESOURCES[biome.terrain] || {};
    const key = cellKey(i);

    terrainArr.push(biome.terrain);
    if (elev >= SEA_LEVEL) landCells.push(i);

    const tile: HexTile = {
      coord: { q: i, r: 0 },
      terrain: biome.terrain,
      elevation: elev, moisture: moist, temperature: temp,
      hasRiver: false, riverFlow: 0, featureId: -1, isCoast: false,
      visible: true, explored: true,
      ownerId: null, building: null, army: null,
      resources: { gold: baseRes.gold || 0, iron: baseRes.iron || 0, food: baseRes.food || 0, wood: baseRes.wood || 0, stone: baseRes.stone || 0 },
      biomeName: biome.name, regionName: '',
    };
    tiles.set(key, tile);
    cellTiles.push(tile);
  }

  // --- 6. Coast ---
  const isLand = (i: number) => voronoiData.elevation[i] >= SEA_LEVEL;
  const coastEdgesRaw = findCoastEdges(graph, isLand, 3);
  voronoiData.coastEdges = coastEdgesRaw;
  const coastPaths = coastEdgesRaw.map(e => e.smoothPath);
  const coastCellSet = new Set<number>();
  for (const edge of coastEdgesRaw) {
    if (isLand(edge.from)) { cellTiles[edge.from].isCoast = true; coastCellSet.add(edge.from); }
    if (isLand(edge.to)) { cellTiles[edge.to].isCoast = true; coastCellSet.add(edge.to); }
  }

  // --- 7. Rivers ---
  const rivers = generateVoronoiRivers(graph, voronoiData.elevation, voronoiData.moisture, n, nameGen);
  const riverCellSet = new Set<number>();
  for (const river of rivers) {
    for (const ci of river.path) {
      cellTiles[ci].hasRiver = true;
      cellTiles[ci].riverFlow = river.flux;
      riverCellSet.add(ci);
    }
  }

  // --- 7b. River moisture boost ---
  for (const river of rivers) {
    for (const ci of river.path) {
      voronoiData.moisture[ci] = Math.min(1, voronoiData.moisture[ci] + 0.15);
      for (const ni of graph.cells[ci].neighbors) {
        if (voronoiData.elevation[ni] >= SEA_LEVEL) {
          voronoiData.moisture[ni] = Math.min(1, voronoiData.moisture[ni] + 0.05);
        }
      }
    }
  }

  // --- 8. Burgs ---
  const burgs = generateVoronoiBurgs(graph, voronoiData, terrainArr, landCells, riverCellSet, coastCellSet, rng, nameGen);

  // --- 9. Cultures ---
  const cultures = generateVoronoiCultures(graph, voronoiData, landCells, burgs, rng, nameGen);
  const cultureMap = new Map<string, number>();
  for (const c of cultures) {
    for (const ci of c.cells) cultureMap.set(cellKey(ci), c.id);
  }

  // --- 10. States ---
  const states = generateVoronoiStates(graph, voronoiData, landCells, burgs, cultures, cultureMap, rng, nameGen);
  const stateMap = new Map<string, number>();
  for (const s of states) {
    for (const ci of s.cells) stateMap.set(cellKey(ci), s.id);
  }

  // Burg state ataması
  for (const burg of burgs) {
    const sId = stateMap.get(cellKey(burg.cellIndex));
    if (sId !== undefined) burg.stateId = sId;
  }

  // --- 11. Routes ---
  const routes = generateVoronoiRoutes(graph, voronoiData, burgs, rng);

  return {
    voronoi: voronoiData, tiles, cellTiles, rivers, burgs, states, cultures, routes,
    coastPaths, stateMap, cultureMap, seed, width, height,
  };
}

// ===== Azgaar-style Heightmap (High Island template) =====
// Elevation: 0-100, sea level = 20
// Tüm hücreler 0'dan başlar (okyanus), Hill/Range ile yükseltilir, Mask ile ada şekli verilir

function generateHeightmap(data: VoronoiMapData, graph: VoronoiGraph, rng: Alea, w: number, h: number, seed: number, template: MapTemplate = 'highIsland'): void {
  const n = graph.cells.length;
  const heights = new Float32Array(n); // 0-100 scale

  // blobPower: hücre sayısına göre (Azgaar lookup)
  const blobPower = n < 2000 ? 0.95 : n < 5000 ? 0.97 : n < 10000 ? 0.98 : 0.99;
  const linePower = n < 5000 ? 0.78 : n < 10000 ? 0.81 : 0.86;

  switch (template) {
    case 'highIsland':
      templateHighIsland(graph, heights, rng, blobPower, linePower, w, h, n, seed);
      break;
    case 'continent':
      templateContinent(graph, heights, rng, blobPower, linePower, w, h, n, seed);
      break;
    case 'archipelago':
      templateArchipelago(graph, heights, rng, blobPower, linePower, w, h, n, seed);
      break;
    case 'pangaea':
      templatePangaea(graph, heights, rng, blobPower, linePower, w, h, n, seed);
      break;
  }

  // Apply tectonic plate boundaries
  applyTectonics(graph, heights, rng, w, h);

  // Smooth tectonic effects
  smoothHeights(graph, heights, 2);

  // Apply hydraulic erosion (3 iterations)
  applyErosion(graph, heights, 3);

  // 0-100 → 0-1 normalize
  for (let i = 0; i < n; i++) {
    data.elevation[i] = Math.max(0, Math.min(1, heights[i] / 100));
  }
}

// === High Island Template (Azgaar'ın en sık kullanılan template'i) ===
function templateHighIsland(graph: VoronoiGraph, heights: Float32Array, rng: Alea,
  blobPower: number, linePower: number, w: number, h: number, n: number, seed: number): void {

  // Hill 1 90-100 65-75 47-53 (büyük merkez tepe)
  addHill(graph, heights, rng, 1, rng.nextInt(90, 100),
    [w * 0.65, w * 0.75], [h * 0.47, h * 0.53], blobPower, w, h);

  // Add 7 all (tüm hücrelere +7)
  for (let i = 0; i < n; i++) heights[i] = Math.min(100, heights[i] + 7);

  // Hill 5-6 20-30 25-55 45-55 (orta boy tepeler)
  addHill(graph, heights, rng, rng.nextInt(5, 6), rng.nextInt(20, 30),
    [w * 0.25, w * 0.55], [h * 0.45, h * 0.55], blobPower, w, h);

  // Range 1 40-50 45-55 45-55 (merkez dağ sırası)
  addRange(graph, heights, rng, 1, rng.nextInt(40, 50),
    [w * 0.45, w * 0.55], [h * 0.45, h * 0.55], linePower, w, h);

  // Multiply 0.8 land (kara yüksekliklerini %80'e düşür)
  for (let i = 0; i < n; i++) {
    if (heights[i] >= 20) heights[i] = (heights[i] - 20) * 0.8 + 20;
  }

  // Mask 3 (ELİPTİK MASKE - ADA ŞEKLİ VERİR!)
  applyMask(graph, heights, 3, w, h);

  // Smooth 2
  smoothHeights(graph, heights, 2);

  // Trough 2-3 (üst bölgede vadiler)
  addTrough(graph, heights, rng, rng.nextInt(2, 3), rng.nextInt(20, 30),
    [w * 0.20, w * 0.30], [h * 0.20, h * 0.30], linePower, w, h);

  // Trough 2-3 (alt bölgede vadiler)
  addTrough(graph, heights, rng, rng.nextInt(2, 3), rng.nextInt(20, 30),
    [w * 0.60, w * 0.80], [h * 0.70, h * 0.80], linePower, w, h);

  // Hill 1 10-15 (merkez küçük tepe)
  addHill(graph, heights, rng, 1, rng.nextInt(10, 15),
    [w * 0.58, w * 0.62], [h * 0.48, h * 0.52], blobPower, w, h);

  // Hill 1.5 13-16 (sol küçük tepe → yarımada/ada)
  addHill(graph, heights, rng, Math.round(rng.nextFloat(1, 2)), rng.nextInt(13, 16),
    [w * 0.15, w * 0.20], [h * 0.20, h * 0.75], blobPower, w, h);

  // Range 1.5 30-40 (üst dağ sırası)
  addRange(graph, heights, rng, Math.round(rng.nextFloat(1, 2)), rng.nextInt(30, 40),
    [w * 0.15, w * 0.85], [h * 0.30, h * 0.40], linePower, w, h);

  // Range 1.5 30-40 (alt dağ sırası)
  addRange(graph, heights, rng, Math.round(rng.nextFloat(1, 2)), rng.nextInt(30, 40),
    [w * 0.15, w * 0.85], [h * 0.60, h * 0.70], linePower, w, h);

  // Pit 3-5 (çöküntüler/körfezler)
  addPit(graph, heights, rng, rng.nextInt(3, 5), rng.nextInt(10, 30),
    [w * 0.15, w * 0.85], [h * 0.20, h * 0.80], blobPower, w, h);

  // Kıyı kenarına noise ekle (daha düzensiz kıyı çizgisi)
  const coastNoise = createNoise2D(seed + 9999);
  for (let i = 0; i < n; i++) {
    if (heights[i] > 12 && heights[i] < 28) {
      const { nx, ny } = normalizeCoord(graph.cells[i], w, h);
      const noiseVal = coastNoise(nx * 30, ny * 30) * 8;
      heights[i] = Math.max(0, Math.min(100, heights[i] + noiseVal));
    }
  }

  // Ekstra küçük adalar (ada grubu oluşturur)
  const islandCount = rng.nextInt(3, 8);
  for (let a = 0; a < islandCount; a++) {
    addHill(graph, heights, rng, 1, rng.nextInt(22, 35),
      [w * 0.05, w * 0.95], [h * 0.05, h * 0.95], blobPower * 0.995, w, h);
  }

  // Son Mask (küçük adaları kenarlarda kırp)
  applyMask(graph, heights, 2, w, h);
}

// === Continent Template - Large landmass filling most of the map ===
function templateContinent(graph: VoronoiGraph, heights: Float32Array, rng: Alea,
  blobPower: number, linePower: number, w: number, h: number, n: number, seed: number): void {

  // Multiple large hills spread across 70% of the map
  addHill(graph, heights, rng, 1, rng.nextInt(90, 100),
    [w * 0.35, w * 0.65], [h * 0.40, h * 0.60], blobPower, w, h);

  addHill(graph, heights, rng, 1, rng.nextInt(90, 100),
    [w * 0.20, w * 0.40], [h * 0.30, h * 0.50], blobPower, w, h);

  addHill(graph, heights, rng, 1, rng.nextInt(90, 95),
    [w * 0.55, w * 0.80], [h * 0.35, h * 0.65], blobPower, w, h);

  addHill(graph, heights, rng, 1, rng.nextInt(90, 95),
    [w * 0.30, w * 0.60], [h * 0.55, h * 0.75], blobPower, w, h);

  // Add base elevation to fill gaps
  for (let i = 0; i < n; i++) heights[i] = Math.min(100, heights[i] + 10);

  // Medium hills to fill interior
  addHill(graph, heights, rng, rng.nextInt(4, 6), rng.nextInt(25, 40),
    [w * 0.15, w * 0.85], [h * 0.20, h * 0.80], blobPower, w, h);

  // Multiple mountain ranges (3-4)
  addRange(graph, heights, rng, 1, rng.nextInt(40, 55),
    [w * 0.30, w * 0.70], [h * 0.35, h * 0.50], linePower, w, h);

  addRange(graph, heights, rng, 1, rng.nextInt(35, 50),
    [w * 0.20, w * 0.50], [h * 0.50, h * 0.65], linePower, w, h);

  addRange(graph, heights, rng, 1, rng.nextInt(35, 45),
    [w * 0.50, w * 0.80], [h * 0.40, h * 0.60], linePower, w, h);

  addRange(graph, heights, rng, Math.round(rng.nextFloat(0, 1)), rng.nextInt(30, 40),
    [w * 0.25, w * 0.75], [h * 0.25, h * 0.40], linePower, w, h);

  // Multiply 0.85 land (slightly less flattening than high island)
  for (let i = 0; i < n; i++) {
    if (heights[i] >= 20) heights[i] = (heights[i] - 20) * 0.85 + 20;
  }

  // Light mask (level 1-2) - less aggressive so continent stays large
  applyMask(graph, heights, rng.nextInt(1, 2), w, h);

  smoothHeights(graph, heights, 2);

  // Troughs for river valleys
  addTrough(graph, heights, rng, rng.nextInt(2, 4), rng.nextInt(15, 25),
    [w * 0.20, w * 0.80], [h * 0.25, h * 0.75], linePower, w, h);

  // Pits for bays/inlets
  addPit(graph, heights, rng, rng.nextInt(2, 4), rng.nextInt(10, 20),
    [w * 0.10, w * 0.90], [h * 0.15, h * 0.85], blobPower, w, h);

  // Coast noise
  const coastNoise = createNoise2D(seed + 9999);
  for (let i = 0; i < n; i++) {
    if (heights[i] > 12 && heights[i] < 28) {
      const { nx, ny } = normalizeCoord(graph.cells[i], w, h);
      const noiseVal = coastNoise(nx * 25, ny * 25) * 6;
      heights[i] = Math.max(0, Math.min(100, heights[i] + noiseVal));
    }
  }

  // Small peripheral islands
  const islandCount = rng.nextInt(2, 5);
  for (let a = 0; a < islandCount; a++) {
    addHill(graph, heights, rng, 1, rng.nextInt(22, 35),
      [w * 0.05, w * 0.95], [h * 0.05, h * 0.95], blobPower * 0.995, w, h);
  }

  // Final light mask
  applyMask(graph, heights, 1, w, h);
}

// === Archipelago Template - Many small islands ===
function templateArchipelago(graph: VoronoiGraph, heights: Float32Array, rng: Alea,
  blobPower: number, linePower: number, w: number, h: number, n: number, seed: number): void {

  // Many small hills (15-25 each) at random positions - creates 8-15 small-medium islands
  const islandCount = rng.nextInt(10, 18);
  for (let a = 0; a < islandCount; a++) {
    addHill(graph, heights, rng, 1, rng.nextInt(15, 25),
      [w * 0.08, w * 0.92], [h * 0.08, h * 0.92], blobPower * 0.993, w, h);
  }

  // A few slightly larger islands to anchor the cluster
  addHill(graph, heights, rng, 1, rng.nextInt(30, 40),
    [w * 0.35, w * 0.65], [h * 0.35, h * 0.65], blobPower * 0.995, w, h);

  addHill(graph, heights, rng, 1, rng.nextInt(25, 35),
    [w * 0.20, w * 0.45], [h * 0.25, h * 0.55], blobPower * 0.994, w, h);

  addHill(graph, heights, rng, 1, rng.nextInt(25, 35),
    [w * 0.55, w * 0.80], [h * 0.45, h * 0.75], blobPower * 0.994, w, h);

  // Small ranges on some islands for mountains
  addRange(graph, heights, rng, Math.round(rng.nextFloat(1, 2)), rng.nextInt(20, 30),
    [w * 0.30, w * 0.70], [h * 0.30, h * 0.70], linePower, w, h);

  // No large central landmass - use aggressive mask (level 4-5)
  applyMask(graph, heights, rng.nextInt(4, 5), w, h);

  smoothHeights(graph, heights, 1);

  // Coast noise for irregular coastlines
  const coastNoise = createNoise2D(seed + 9999);
  for (let i = 0; i < n; i++) {
    if (heights[i] > 12 && heights[i] < 28) {
      const { nx, ny } = normalizeCoord(graph.cells[i], w, h);
      const noiseVal = coastNoise(nx * 35, ny * 35) * 10;
      heights[i] = Math.max(0, Math.min(100, heights[i] + noiseVal));
    }
  }

  // Extra tiny islands scattered around
  const extraIslands = rng.nextInt(5, 10);
  for (let a = 0; a < extraIslands; a++) {
    addHill(graph, heights, rng, 1, rng.nextInt(18, 28),
      [w * 0.05, w * 0.95], [h * 0.05, h * 0.95], blobPower * 0.992, w, h);
  }

  // Pits to break up any accidental connections
  addPit(graph, heights, rng, rng.nextInt(3, 6), rng.nextInt(15, 25),
    [w * 0.15, w * 0.85], [h * 0.15, h * 0.85], blobPower, w, h);

  // Final aggressive mask
  applyMask(graph, heights, 3, w, h);
}

// === Pangaea Template - Massive supercontinent ===
function templatePangaea(graph: VoronoiGraph, heights: Float32Array, rng: Alea,
  blobPower: number, linePower: number, w: number, h: number, n: number, seed: number): void {

  // One enormous hill (95-100) covering center
  addHill(graph, heights, rng, 1, rng.nextInt(95, 100),
    [w * 0.40, w * 0.60], [h * 0.40, h * 0.60], blobPower, w, h);

  // Add +15 to all cells - raises everything significantly
  for (let i = 0; i < n; i++) heights[i] = Math.min(100, heights[i] + 15);

  // Large supporting hills to fill out the supercontinent
  addHill(graph, heights, rng, 1, rng.nextInt(80, 95),
    [w * 0.20, w * 0.40], [h * 0.30, h * 0.50], blobPower, w, h);

  addHill(graph, heights, rng, 1, rng.nextInt(80, 95),
    [w * 0.60, w * 0.80], [h * 0.50, h * 0.70], blobPower, w, h);

  addHill(graph, heights, rng, 1, rng.nextInt(75, 90),
    [w * 0.30, w * 0.55], [h * 0.60, h * 0.80], blobPower, w, h);

  addHill(graph, heights, rng, 1, rng.nextInt(75, 90),
    [w * 0.45, w * 0.70], [h * 0.20, h * 0.40], blobPower, w, h);

  // Fill-in hills for gaps
  addHill(graph, heights, rng, rng.nextInt(4, 6), rng.nextInt(30, 50),
    [w * 0.15, w * 0.85], [h * 0.15, h * 0.85], blobPower, w, h);

  // Multiple ranges connecting edges - creates mountain spines
  addRange(graph, heights, rng, 1, rng.nextInt(45, 60),
    [w * 0.20, w * 0.80], [h * 0.40, h * 0.55], linePower, w, h);

  addRange(graph, heights, rng, 1, rng.nextInt(40, 55),
    [w * 0.30, w * 0.70], [h * 0.25, h * 0.45], linePower, w, h);

  addRange(graph, heights, rng, 1, rng.nextInt(40, 55),
    [w * 0.25, w * 0.65], [h * 0.55, h * 0.75], linePower, w, h);

  addRange(graph, heights, rng, 1, rng.nextInt(35, 45),
    [w * 0.40, w * 0.60], [h * 0.15, h * 0.85], linePower, w, h);

  // Very light mask (level 1) - keeps the supercontinent intact
  applyMask(graph, heights, 1, w, h);

  smoothHeights(graph, heights, 3);

  // Troughs for inland seas and large river valleys
  addTrough(graph, heights, rng, rng.nextInt(3, 5), rng.nextInt(20, 35),
    [w * 0.25, w * 0.75], [h * 0.25, h * 0.75], linePower, w, h);

  // A few pits for inland seas/lakes
  addPit(graph, heights, rng, rng.nextInt(2, 4), rng.nextInt(20, 35),
    [w * 0.20, w * 0.80], [h * 0.20, h * 0.80], blobPower, w, h);

  // Coast noise
  const coastNoise = createNoise2D(seed + 9999);
  for (let i = 0; i < n; i++) {
    if (heights[i] > 12 && heights[i] < 28) {
      const { nx, ny } = normalizeCoord(graph.cells[i], w, h);
      const noiseVal = coastNoise(nx * 20, ny * 20) * 5;
      heights[i] = Math.max(0, Math.min(100, heights[i] + noiseVal));
    }
  }

  // Final very light mask
  applyMask(graph, heights, 1, w, h);
}

// Hill: BFS flood-fill ile blob şeklinde yükseklik ekle
function addHill(graph: VoronoiGraph, heights: Float32Array, rng: Alea,
  count: number, baseHeight: number, xRange: number[], yRange: number[],
  blobPower: number, w: number, h: number): void {

  for (let c = 0; c < count; c++) {
    const targetX = rng.nextFloat(xRange[0], xRange[1]);
    const targetY = rng.nextFloat(yRange[0], yRange[1]);

    // En yakın hücreyi bul
    let start = 0, minDist = Infinity;
    for (let i = 0; i < graph.cells.length; i++) {
      const dx = graph.cells[i].center.x - targetX;
      const dy = graph.cells[i].center.y - targetY;
      const d = dx * dx + dy * dy;
      if (d < minDist) { minDist = d; start = i; }
    }

    // Zaten çok yüksekse atla
    if (heights[start] + baseHeight > 90) continue;

    // BFS flood-fill
    const change = new Float32Array(graph.cells.length);
    change[start] = baseHeight;
    heights[start] = Math.min(100, heights[start] + baseHeight);

    const queue = [start];
    const visited = new Set<number>([start]);

    while (queue.length > 0) {
      const ci = queue.shift()!;
      for (const ni of graph.cells[ci].neighbors) {
        if (visited.has(ni)) continue;
        visited.add(ni);

        const newChange = change[ci] ** blobPower * rng.nextFloat(0.9, 1.1);
        if (newChange < 1) continue;

        change[ni] = newChange;
        heights[ni] = Math.min(100, heights[ni] + newChange);
        queue.push(ni);
      }
    }
  }
}

// Pit: Hill'in tersi - BFS ile çöküntü
function addPit(graph: VoronoiGraph, heights: Float32Array, rng: Alea,
  count: number, baseDepth: number, xRange: number[], yRange: number[],
  blobPower: number, w: number, h: number): void {

  for (let c = 0; c < count; c++) {
    const targetX = rng.nextFloat(xRange[0], xRange[1]);
    const targetY = rng.nextFloat(yRange[0], yRange[1]);

    let start = 0, minDist = Infinity;
    for (let i = 0; i < graph.cells.length; i++) {
      const dx = graph.cells[i].center.x - targetX;
      const dy = graph.cells[i].center.y - targetY;
      const d = dx * dx + dy * dy;
      if (d < minDist) { minDist = d; start = i; }
    }

    if (heights[start] < 20) continue; // sadece karada

    const queue = [start];
    const visited = new Set<number>([start]);
    let depth = baseDepth;

    while (queue.length > 0 && depth >= 1) {
      const ci = queue.shift()!;
      heights[ci] = Math.max(0, heights[ci] - depth);
      depth = depth ** blobPower * rng.nextFloat(0.9, 1.1);

      for (const ni of graph.cells[ci].neighbors) {
        if (!visited.has(ni)) { visited.add(ni); queue.push(ni); }
      }
    }
  }
}

// Range: meander eden dağ sırası
function addRange(graph: VoronoiGraph, heights: Float32Array, rng: Alea,
  count: number, baseHeight: number, xRange: number[], yRange: number[],
  linePower: number, w: number, h: number): void {

  for (let c = 0; c < count; c++) {
    const startX = rng.nextFloat(xRange[0], xRange[1]);
    const startY = rng.nextFloat(yRange[0], yRange[1]);

    // Rastgele bitiş noktası (başlangıçtan w/4 - w/3 uzaklıkta)
    const angle = rng.nextFloat(0, Math.PI * 2);
    const dist = rng.nextFloat(w * 0.25, w * 0.4);
    const endX = startX + Math.cos(angle) * dist;
    const endY = startY + Math.sin(angle) * dist;

    let start = 0, minDist = Infinity;
    for (let i = 0; i < graph.cells.length; i++) {
      const dx = graph.cells[i].center.x - startX;
      const dy = graph.cells[i].center.y - startY;
      const d = dx * dx + dy * dy;
      if (d < minDist) { minDist = d; start = i; }
    }

    // Greedy path: başlangıçtan bitişe doğru yürü (meander ile)
    const path = [start];
    const pathSet = new Set<number>([start]);
    let cur = start;

    for (let step = 0; step < 200; step++) {
      const cx = graph.cells[cur].center.x;
      const cy = graph.cells[cur].center.y;
      if ((cx - endX) ** 2 + (cy - endY) ** 2 < (w * 0.02) ** 2) break;

      let best = -1, bestDist = Infinity;
      for (const ni of graph.cells[cur].neighbors) {
        if (pathSet.has(ni)) continue;
        const nx = graph.cells[ni].center.x;
        const ny = graph.cells[ni].center.y;
        let d = (nx - endX) ** 2 + (ny - endY) ** 2;
        // %15 meander şansı
        if (rng.next() < 0.15) d *= rng.nextFloat(0.5, 2.0);
        if (d < bestDist) { bestDist = d; best = ni; }
      }
      if (best < 0) break;
      pathSet.add(best);
      path.push(best);
      cur = best;
    }

    // Path boyunca yükseklik ekle
    for (const pi of path) {
      heights[pi] = Math.min(100, heights[pi] + baseHeight);
    }

    // BFS ile sırt genişliği
    let ridgeH = baseHeight;
    const expanded = new Set<number>(path);
    let frontier = [...path];

    while (ridgeH > 2) {
      ridgeH = ridgeH ** linePower - 1;
      const nextFrontier: number[] = [];
      for (const fi of frontier) {
        for (const ni of graph.cells[fi].neighbors) {
          if (expanded.has(ni)) continue;
          expanded.add(ni);
          heights[ni] = Math.min(100, heights[ni] + ridgeH);
          nextFrontier.push(ni);
        }
      }
      frontier = nextFrontier;
    }
  }
}

// Trough: Range gibi ama yükseklik çıkarır (vadi/kanal)
function addTrough(graph: VoronoiGraph, heights: Float32Array, rng: Alea,
  count: number, baseDepth: number, xRange: number[], yRange: number[],
  linePower: number, w: number, h: number): void {

  for (let c = 0; c < count; c++) {
    const startX = rng.nextFloat(xRange[0], xRange[1]);
    const startY = rng.nextFloat(yRange[0], yRange[1]);
    const angle = rng.nextFloat(0, Math.PI * 2);
    const dist = rng.nextFloat(w * 0.2, w * 0.5);
    const endX = startX + Math.cos(angle) * dist;
    const endY = startY + Math.sin(angle) * dist;

    let start = 0, minDist = Infinity;
    for (let i = 0; i < graph.cells.length; i++) {
      if (heights[i] < 20) continue; // sadece karada başla
      const dx = graph.cells[i].center.x - startX;
      const dy = graph.cells[i].center.y - startY;
      const d = dx * dx + dy * dy;
      if (d < minDist) { minDist = d; start = i; }
    }

    const path = [start];
    const pathSet = new Set<number>([start]);
    let cur = start;

    for (let step = 0; step < 200; step++) {
      const cx = graph.cells[cur].center.x;
      const cy = graph.cells[cur].center.y;
      if ((cx - endX) ** 2 + (cy - endY) ** 2 < (w * 0.02) ** 2) break;

      let best = -1, bestDist = Infinity;
      for (const ni of graph.cells[cur].neighbors) {
        if (pathSet.has(ni)) continue;
        const nx = graph.cells[ni].center.x;
        const ny = graph.cells[ni].center.y;
        let d = (nx - endX) ** 2 + (ny - endY) ** 2;
        if (rng.next() < 0.2) d *= rng.nextFloat(0.5, 2.0);
        if (d < bestDist) { bestDist = d; best = ni; }
      }
      if (best < 0) break;
      pathSet.add(best);
      path.push(best);
      cur = best;
    }

    for (const pi of path) {
      heights[pi] = Math.max(0, heights[pi] - baseDepth);
    }

    let troughD = baseDepth * 0.5;
    const expanded = new Set<number>(path);
    let frontier = [...path];

    while (troughD > 2) {
      troughD = troughD ** linePower - 1;
      const nextFrontier: number[] = [];
      for (const fi of frontier) {
        for (const ni of graph.cells[fi].neighbors) {
          if (expanded.has(ni)) continue;
          expanded.add(ni);
          heights[ni] = Math.max(0, heights[ni] - troughD);
          nextFrontier.push(ni);
        }
      }
      frontier = nextFrontier;
    }
  }
}

// Mask: eliptik maske - ADA ŞEKLİ OLUŞTURUR
// distance = (1 - nx²)(1 - ny²), power controls blending
// === Tectonic Plates Simulation ===
function applyTectonics(graph: VoronoiGraph, heights: Float32Array, rng: Alea, w: number, h: number): void {
  const n = graph.cells.length;
  const plateCount = rng.nextInt(4, 8);

  // 1. Seed plates with random cells
  const plateId = new Int32Array(n).fill(-1);
  const plateSeeds: number[] = [];
  for (let p = 0; p < plateCount; p++) {
    const x = rng.nextFloat(w * 0.1, w * 0.9);
    const y = rng.nextFloat(h * 0.1, h * 0.9);
    let best = 0, bestD = Infinity;
    for (let i = 0; i < n; i++) {
      const dx = graph.cells[i].center.x - x;
      const dy = graph.cells[i].center.y - y;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = i; }
    }
    plateSeeds.push(best);
    plateId[best] = p;
  }

  // 2. Flood-fill to assign all cells to plates (BFS)
  const queue = [...plateSeeds];
  let qi = 0;
  while (qi < queue.length) {
    const ci = queue[qi++];
    for (const ni of graph.cells[ci].neighbors) {
      if (plateId[ni] === -1) {
        plateId[ni] = plateId[ci];
        queue.push(ni);
      }
    }
  }

  // 3. Assign random velocity vectors to each plate
  const plateVx = new Float32Array(plateCount);
  const plateVy = new Float32Array(plateCount);
  for (let p = 0; p < plateCount; p++) {
    const angle = rng.nextFloat(0, Math.PI * 2);
    const speed = rng.nextFloat(0.3, 1.0);
    plateVx[p] = Math.cos(angle) * speed;
    plateVy[p] = Math.sin(angle) * speed;
  }

  // 4. Find plate boundaries and compute stress
  for (const [a, b] of graph.edges) {
    if (plateId[a] === plateId[b]) continue; // same plate

    const pA = plateId[a];
    const pB = plateId[b];

    // Relative velocity along boundary normal
    const ca = graph.cells[a].center;
    const cb = graph.cells[b].center;
    const nx = cb.x - ca.x;
    const ny = cb.y - ca.y;
    const len = Math.sqrt(nx * nx + ny * ny);
    if (len < 0.01) continue;

    // Dot product of relative velocity with normal
    const relVx = plateVx[pA] - plateVx[pB];
    const relVy = plateVy[pA] - plateVy[pB];
    const stress = (relVx * nx / len + relVy * ny / len);

    // Convergent boundary (positive stress) → mountains
    if (stress > 0.1) {
      const boost = stress * rng.nextFloat(25, 45);
      heights[a] = Math.min(100, heights[a] + boost);
      heights[b] = Math.min(100, heights[b] + boost * 0.7);
    }
    // Divergent boundary (negative stress) → rift valleys / ocean trenches
    else if (stress < -0.1) {
      const drop = Math.abs(stress) * rng.nextFloat(10, 25);
      heights[a] = Math.max(0, heights[a] - drop);
      heights[b] = Math.max(0, heights[b] - drop * 0.7);
    }
    // Transform boundary → mild uplift
    else {
      heights[a] = Math.min(100, heights[a] + Math.abs(stress) * 5);
    }
  }

  // 5. Spread boundary effects (BFS from boundaries, 3-5 cells deep)
  const boundaryBoost = new Float32Array(n);
  for (const [a, b] of graph.edges) {
    if (plateId[a] !== plateId[b]) {
      boundaryBoost[a] = Math.max(boundaryBoost[a], heights[a] * 0.3);
      boundaryBoost[b] = Math.max(boundaryBoost[b], heights[b] * 0.3);
    }
  }
  // BFS spread 3 levels
  const frontier: number[] = [];
  for (let i = 0; i < n; i++) if (boundaryBoost[i] > 0) frontier.push(i);
  for (let level = 0; level < 3; level++) {
    const next: number[] = [];
    for (const fi of frontier) {
      for (const ni of graph.cells[fi].neighbors) {
        const spread = boundaryBoost[fi] * 0.5;
        if (spread > boundaryBoost[ni]) {
          boundaryBoost[ni] = spread;
          next.push(ni);
        }
      }
    }
    frontier.length = 0;
    frontier.push(...next);
  }
  for (let i = 0; i < n; i++) {
    heights[i] = Math.min(100, heights[i] + boundaryBoost[i]);
  }
}

// === Hydraulic Erosion Simulation ===
function applyErosion(graph: VoronoiGraph, heights: Float32Array, iterations: number = 3): void {
  const n = graph.cells.length;

  for (let iter = 0; iter < iterations; iter++) {
    const erosion = new Float32Array(n);
    const sediment = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      if (heights[i] < 20) continue; // skip water

      // Find steepest downhill neighbor
      let steepest = -1;
      let maxSlope = 0;
      for (const ni of graph.cells[i].neighbors) {
        const slope = heights[i] - heights[ni];
        if (slope > maxSlope) {
          maxSlope = slope;
          steepest = ni;
        }
      }

      if (steepest < 0 || maxSlope < 0.5) continue;

      // Erosion proportional to slope
      const erodeAmount = Math.min(maxSlope * 0.15, heights[i] * 0.05);
      erosion[i] += erodeAmount;
      sediment[steepest] += erodeAmount * 0.6; // deposit downstream
    }

    // Apply erosion and deposition
    for (let i = 0; i < n; i++) {
      heights[i] = Math.max(0, heights[i] - erosion[i] + sediment[i]);
    }
  }

  // Final smooth to blend erosion effects
  smoothHeights(graph, heights, 2);
}

function applyMask(graph: VoronoiGraph, heights: Float32Array, power: number, w: number, h: number): void {
  for (let i = 0; i < graph.cells.length; i++) {
    const cx = graph.cells[i].center.x;
    const cy = graph.cells[i].center.y;
    // Normalize to -1..1
    const nx = (cx / w) * 2 - 1;
    const ny = (cy / h) * 2 - 1;
    const distance = (1 - nx * nx) * (1 - ny * ny); // 0 at edges, 1 at center

    // Blend: result = (h * (power-1) + h * distance) / power
    heights[i] = (heights[i] * (power - 1) + heights[i] * distance) / power;
    heights[i] = Math.max(0, Math.min(100, heights[i]));
  }
}

// Smooth: komşu ortalaması
function smoothHeights(graph: VoronoiGraph, heights: Float32Array, factor: number): void {
  const smoothed = new Float32Array(heights.length);
  for (let i = 0; i < graph.cells.length; i++) {
    const neighbors = graph.cells[i].neighbors;
    if (neighbors.length === 0) { smoothed[i] = heights[i]; continue; }
    let sum = 0;
    for (const ni of neighbors) sum += heights[ni];
    const mean = sum / neighbors.length;
    smoothed[i] = (heights[i] * (factor - 1) + mean) / factor;
  }
  for (let i = 0; i < heights.length; i++) heights[i] = smoothed[i];
}

function generateTemperature(data: VoronoiMapData, graph: VoronoiGraph, w: number, h: number, seed: number): void {
  const n = graph.cells.length;
  const tn = createNoise2D(seed + 3000);

  // 1. Compute distance-to-ocean for each land cell (BFS)
  const distToOcean = new Float32Array(n).fill(Infinity);
  const oceanQueue: number[] = [];
  for (let i = 0; i < n; i++) {
    if (data.elevation[i] < SEA_LEVEL) {
      distToOcean[i] = 0;
      oceanQueue.push(i);
    }
  }
  let qi = 0;
  while (qi < oceanQueue.length) {
    const ci = oceanQueue[qi++];
    for (const ni of graph.cells[ci].neighbors) {
      const newDist = distToOcean[ci] + 1;
      if (newDist < distToOcean[ni]) {
        distToOcean[ni] = newDist;
        oceanQueue.push(ni);
      }
    }
  }
  const maxDist = Math.max(...distToOcean.filter(d => d < Infinity));

  for (let i = 0; i < n; i++) {
    const { nx, ny } = normalizeCoord(graph.cells[i], w, h);

    // Latitude-based temperature: ny=0 is north (cold), ny=0.5 is equator (hot), ny=1 is south (cold)
    // Use sinusoidal curve: hottest at equator
    const latitude = Math.abs(ny - 0.5) * 2; // 0 at equator, 1 at poles
    let t = 1 - latitude * 0.95; // base temp from latitude

    // Equatorial warm belt (wider warm zone)
    t = Math.pow(t, 0.7); // flatten the curve near equator

    // Lapse rate: elevation cooling
    // Real: ~6.5°C per 1000m, we model as 0.55 per unit above sea level
    if (data.elevation[i] > SEA_LEVEL) {
      const landElev = (data.elevation[i] - SEA_LEVEL) / (1 - SEA_LEVEL);
      t -= landElev * 0.55;
    }

    // Ocean proximity: coasts buffer temperature toward 0.5 (marine climate)
    // Continental interiors have more extreme temperatures
    if (data.elevation[i] >= SEA_LEVEL && maxDist > 0) {
      const oceanInfluence = 1 - Math.min(distToOcean[i] / maxDist, 1);
      // Pull temperature toward 0.5 based on ocean proximity
      t = t + (0.5 - t) * oceanInfluence * 0.3;
    }

    // Ocean cells: moderate temperature (sea surface temp)
    if (data.elevation[i] < SEA_LEVEL) {
      t = Math.max(t, 0.1); // oceans don't get as cold
      t = Math.min(t, 0.85); // oceans don't get as hot
    }

    // Add noise for regional variation (±0.08)
    t += tn((nx - 0.5) * 12, (ny - 0.5) * 12) * 0.08;

    data.temperature[i] = Math.max(0, Math.min(1, t));
  }
}

function generateMoisture(data: VoronoiMapData, graph: VoronoiGraph, w: number, h: number, seed: number): void {
  const n = graph.cells.length;
  const rng = new Alea(seed + 5555);
  const mn = createNoise2D(seed + 5000);

  // Prevailing wind direction (global westerlies + trade winds approximation)
  // Wind comes from the west in mid-latitudes, east near equator
  const windDir = rng.nextFloat(230, 280) * Math.PI / 180; // radians, roughly from west
  const windDx = Math.cos(windDir);
  const windDy = Math.sin(windDir);

  // 1. Compute base moisture from distance-to-ocean along wind direction
  // Cells close to the windward coast get more moisture
  const moisture = new Float32Array(n);

  // First: all ocean cells have max moisture
  for (let i = 0; i < n; i++) {
    if (data.elevation[i] < SEA_LEVEL) {
      moisture[i] = 0.85;
    }
  }

  // 2. Sort cells by wind direction (upwind to downwind)
  // Cells that the wind reaches first get processed first
  const windOrder = Array.from({ length: n }, (_, i) => i)
    .sort((a, b) => {
      const ca = graph.cells[a].center;
      const cb = graph.cells[b].center;
      // Project onto wind direction (dot product)
      const projA = ca.x * windDx + ca.y * windDy;
      const projB = cb.x * windDx + cb.y * windDy;
      return projA - projB; // upwind first
    });

  // 3. Propagate moisture downwind, reduce when hitting mountains
  for (const i of windOrder) {
    if (data.elevation[i] < SEA_LEVEL) continue;

    // Start with neighbor moisture from upwind direction
    let maxUpwindMoisture = 0;
    for (const ni of graph.cells[i].neighbors) {
      // Check if neighbor is upwind
      const dx = graph.cells[i].center.x - graph.cells[ni].center.x;
      const dy = graph.cells[i].center.y - graph.cells[ni].center.y;
      const dot = dx * windDx + dy * windDy;
      if (dot > 0) { // neighbor is upwind
        maxUpwindMoisture = Math.max(maxUpwindMoisture, moisture[ni]);
      }
    }

    // Base moisture from upwind propagation (slight decay)
    let m = maxUpwindMoisture * 0.92;

    // Rain shadow: high elevation forces moisture to drop (orographic lift)
    if (data.elevation[i] > 0.5) {
      const elevFactor = (data.elevation[i] - 0.5) * 2; // 0-1 for elevation 0.5-1.0
      // Orographic precipitation: moisture drops sharply on windward side
      m -= elevFactor * 0.4;
      // But some precipitation falls here (windward wet)
      m = Math.max(m, 0.1);
    }

    // Temperature influence: warm air holds more moisture
    m *= (0.7 + data.temperature[i] * 0.4);

    // Noise for local variation
    const { nx, ny } = normalizeCoord(graph.cells[i], w, h);
    m += mn((nx - 0.5) * 15, (ny - 0.5) * 15) * 0.12;

    moisture[i] = Math.max(0.02, Math.min(1, m));
  }

  // 4. Smooth moisture slightly (2 passes)
  for (let pass = 0; pass < 2; pass++) {
    const smoothed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      if (data.elevation[i] < SEA_LEVEL) { smoothed[i] = moisture[i]; continue; }
      let sum = moisture[i] * 2;
      let count = 2;
      for (const ni of graph.cells[i].neighbors) {
        sum += moisture[ni];
        count++;
      }
      smoothed[i] = sum / count;
    }
    for (let i = 0; i < n; i++) moisture[i] = smoothed[i];
  }

  // Copy to data
  for (let i = 0; i < n; i++) {
    data.moisture[i] = Math.max(0, Math.min(1, moisture[i]));
  }
}

// ===== Rivers =====
function generateVoronoiRivers(graph: VoronoiGraph, elevation: Float32Array, moisture: Float32Array, n: number, nameGen: NameGenerator): VoronoiRiver[] {
  // === Azgaar's river algorithm ===
  // 1. resolveDepressions
  // 2. drainWater (flux accumulation + river tracing)

  const h = new Float32Array(elevation); // working copy
  const cellsModifier = Math.pow(n / 10000, 0.25);
  const MIN_FLUX = 30 / cellsModifier; // Azgaar: 30 base

  // --- Step 1: alterHeights (tiny gradient based on coast distance) ---
  // Compute distance-to-coast (t field)
  const t = new Int8Array(n);
  for (let i = 0; i < n; i++) {
    if (h[i] < SEA_LEVEL) { t[i] = -1; continue; }
    let nearWater = false;
    for (const ni of graph.cells[i].neighbors) {
      if (h[ni] < SEA_LEVEL) { nearWater = true; break; }
    }
    t[i] = nearWater ? 1 : 2;
  }
  // BFS to expand t inward for land
  const tQueue: number[] = [];
  for (let i = 0; i < n; i++) { if (t[i] === 1) tQueue.push(i); }
  let qi = 0;
  while (qi < tQueue.length) {
    const ci = tQueue[qi++];
    for (const ni of graph.cells[ci].neighbors) {
      if (t[ni] === 2) { t[ni] = Math.min(t[ci] + 1, 10) as any; tQueue.push(ni); }
    }
  }
  // Add tiny gradient
  for (let i = 0; i < n; i++) {
    if (h[i] >= SEA_LEVEL) {
      h[i] += t[i] / 10000;
    }
  }

  // --- Step 2: resolveDepressions ---
  // Sort land cells low to high, raise sinks
  const landSorted = Array.from({ length: n }, (_, i) => i)
    .filter(i => h[i] >= SEA_LEVEL)
    .sort((a, b) => h[a] - h[b]);

  for (let iter = 0; iter < 50; iter++) {
    let depressions = 0;
    for (const i of landSorted) {
      let minNeighborH = Infinity;
      let hasLower = false;
      for (const ni of graph.cells[i].neighbors) {
        if (h[ni] < h[i]) { hasLower = true; break; }
        if (h[ni] < minNeighborH) minNeighborH = h[ni];
      }
      if (!hasLower && minNeighborH < Infinity) {
        h[i] = minNeighborH + 0.001;
        depressions++;
      }
    }
    if (depressions === 0) break;
  }

  // --- Step 3: drainWater with watershed accumulation ---
  const flux = new Float32Array(n);
  const downhill = new Int32Array(n).fill(-1);
  const riverIds = new Int32Array(n).fill(-1);
  const watershedArea = new Float32Array(n).fill(1); // each cell contributes area=1

  // Find downhill for each cell (steepest descent)
  for (let i = 0; i < n; i++) {
    if (h[i] < SEA_LEVEL) continue;
    let lowest = -1, lowestH = h[i];
    for (const ni of graph.cells[i].neighbors) {
      if (h[ni] < lowestH) { lowestH = h[ni]; lowest = ni; }
    }
    downhill[i] = lowest;
  }

  // Sort HIGH to LOW
  const highToLow = Array.from({ length: n }, (_, i) => i)
    .filter(i => h[i] >= SEA_LEVEL)
    .sort((a, b) => h[b] - h[a]);

  for (const i of highToLow) {
    // Precipitation: based on moisture and temperature
    // Warmer, moister cells produce more runoff
    const precip = moisture[i] * (0.5 + elevation[i] * 0.3) * 80 / cellsModifier;
    flux[i] += precip;

    const min = downhill[i];
    if (min < 0) continue;
    if (h[i] <= h[min]) continue;

    // Pass flux AND watershed area downhill
    flux[min] += flux[i];
    watershedArea[min] += watershedArea[i];
  }

  // --- Step 4: Trace rivers from high-flux cells ---
  const rivers: VoronoiRiver[] = [];
  const usedCells = new Set<number>();
  let nextRiverId = 0;

  // Sort by flux descending, trace each river
  const byFlux = highToLow
    .filter(i => flux[i] >= MIN_FLUX)
    .sort((a, b) => flux[b] - flux[a]);

  for (const src of byFlux) {
    if (usedCells.has(src)) continue;
    if (flux[src] < MIN_FLUX) continue;

    const path: number[] = [];
    let cur = src;

    while (cur >= 0 && !usedCells.has(cur)) {
      path.push(cur);
      usedCells.add(cur);
      riverIds[cur] = nextRiverId;

      const next = downhill[cur];
      if (next < 0) break;
      if (h[next] < SEA_LEVEL) { path.push(next); break; } // reached ocean
      cur = next;
    }

    if (path.length >= 2) {
      rivers.push({
        id: nextRiverId,
        path,
        flux: flux[src],
        name: nameGen.riverName(),
      });
      nextRiverId++;
    }
  }

  return rivers;
}

// ===== Burgs =====
function generateVoronoiBurgs(graph: VoronoiGraph, data: VoronoiMapData, terrain: HexTerrain[], landCells: number[], riverCells: Set<number>, coastCells: Set<number>, rng: Alea, nameGen: NameGenerator, maxBurgs: number = 30): VoronoiBurg[] {
  const scores = new Map<number, number>();
  for (const i of landCells) {
    if (terrain[i] === HexTerrain.Snow || terrain[i] === HexTerrain.Mountain) continue;
    let s = 0;
    if (riverCells.has(i)) s += 8;
    if (coastCells.has(i)) s += 6;
    s += data.moisture[i] * 4 + data.temperature[i] * 3;
    s -= ((data.elevation[i]-SEA_LEVEL)/(1-SEA_LEVEL)) * 5;
    if (terrain[i] === HexTerrain.Plains) s += 4;
    if (terrain[i] === HexTerrain.Forest) s += 2;
    if (terrain[i] === HexTerrain.Desert) s -= 3;
    s += rng.nextFloat(-1, 1);
    scores.set(i, Math.max(0, s));
  }
  const sorted = [...scores.entries()].sort((a,b) => b[1]-a[1]);
  const burgs: VoronoiBurg[] = [];
  const placed: number[] = [];
  for (const [ci, score] of sorted) {
    if (burgs.length >= maxBurgs) break;
    const tooClose = placed.some(pi => cellDistance(graph, pi, ci) < 40);
    if (tooClose) continue;
    burgs.push({
      id: burgs.length, cellIndex: ci, name: nameGen.cityName(),
      population: Math.floor(score * 200 + rng.nextFloat(100, 500)) * (burgs.length < 4 ? 3 : 1),
      isCapital: false, stateId: -1, port: coastCells.has(ci), score,
    });
    placed.push(ci);
  }
  return burgs;
}

// ===== Cultures =====
function generateVoronoiCultures(graph: VoronoiGraph, data: VoronoiMapData, landCells: number[], burgs: VoronoiBurg[], rng: Alea, nameGen: NameGenerator, count: number = 6): VoronoiCulture[] {
  const seeds = [...burgs].sort((a,b) => b.population-a.population).slice(0, count);
  const cultures: VoronoiCulture[] = seeds.map((b, i) => ({
    id: i, name: nameGen.regionName(), color: CULTURE_COLORS[i % CULTURE_COLORS.length], cells: [], center: b.cellIndex,
  }));
  if (cultures.length === 0) return cultures;
  // Wave-front expansion
  const cellCulture = new Int32Array(graph.cells.length).fill(-1);
  const costMap = new Float32Array(graph.cells.length).fill(Infinity);
  const pq: { ci: number; cId: number; cost: number }[] = [];
  for (const c of cultures) { pq.push({ci: c.center, cId: c.id, cost: 0}); costMap[c.center] = 0; cellCulture[c.center] = c.id; }
  pq.sort((a,b)=>a.cost-b.cost);
  while (pq.length > 0) {
    const {ci, cId, cost} = pq.shift()!;
    if (cellCulture[ci] !== -1 && cellCulture[ci] !== cId && costMap[ci] < cost) continue;
    cellCulture[ci] = cId;
    for (const ni of graph.cells[ci].neighbors) {
      if (data.elevation[ni] < SEA_LEVEL) continue;
      const mc = cost + 1 + (data.elevation[ni] > 0.7 ? 3 : 0);
      if (mc < costMap[ni]) { costMap[ni] = mc; cellCulture[ni] = cId; pq.push({ci:ni, cId, cost:mc}); pq.sort((a,b)=>a.cost-b.cost); }
    }
  }
  for (let i = 0; i < graph.cells.length; i++) { if (cellCulture[i] >= 0) cultures[cellCulture[i]].cells.push(i); }
  return cultures;
}

// ===== States =====
function generateVoronoiStates(graph: VoronoiGraph, data: VoronoiMapData, landCells: number[], burgs: VoronoiBurg[], cultures: VoronoiCulture[], cultureMap: Map<string, number>, rng: Alea, nameGen: NameGenerator, count: number = 6): VoronoiState[] {
  const capitals = [...burgs].sort((a,b)=>b.population-a.population);
  const stateSeeds: VoronoiBurg[] = [];
  for (const b of capitals) {
    if (stateSeeds.length >= count) break;
    const tooClose = stateSeeds.some(s => cellDistance(graph, s.cellIndex, b.cellIndex) < 80);
    if (!tooClose) { b.isCapital = true; stateSeeds.push(b); }
  }
  const states: VoronoiState[] = stateSeeds.map((b, i) => ({
    id: i, name: nameGen.regionName() + ' ' + rng.pick(FORM_NAMES),
    color: STATE_COLORS[i % STATE_COLORS.length], capitalBurg: b.id,
    cells: [], burgIds: [b.id], formName: rng.pick(FORM_NAMES), neighbors: [],
  }));
  if (states.length === 0) return states;

  const cellState = new Int32Array(graph.cells.length).fill(-1);
  const costMap = new Float32Array(graph.cells.length).fill(Infinity);
  const pq: { ci: number; sId: number; cost: number }[] = [];
  for (const s of states) { const ci = stateSeeds[s.id].cellIndex; pq.push({ci, sId: s.id, cost: 0}); costMap[ci] = 0; cellState[ci] = s.id; }
  pq.sort((a,b)=>a.cost-b.cost);
  while (pq.length > 0) {
    const {ci, sId, cost} = pq.shift()!;
    if (cellState[ci] !== -1 && cellState[ci] !== sId && costMap[ci] < cost) continue;
    cellState[ci] = sId;
    for (const ni of graph.cells[ci].neighbors) {
      if (data.elevation[ni] < SEA_LEVEL) continue;
      let mc = cost + 1;
      if (data.elevation[ni] > 0.7) mc += 3;
      // Kültür sınırı maliyet
      const curCult = cultureMap.get(cellKey(ci));
      const nCult = cultureMap.get(cellKey(ni));
      if (curCult !== undefined && nCult !== undefined && curCult !== nCult) mc += 2;
      if (mc < costMap[ni]) { costMap[ni] = mc; cellState[ni] = sId; pq.push({ci:ni, sId, cost:mc}); pq.sort((a,b)=>a.cost-b.cost); }
    }
  }
  for (let i = 0; i < graph.cells.length; i++) { if (cellState[i] >= 0) states[cellState[i]].cells.push(i); }

  // Komşuları bul
  for (const s of states) {
    const ns = new Set<number>();
    for (const ci of s.cells) { for (const ni of graph.cells[ci].neighbors) { const nS = cellState[ni]; if (nS >= 0 && nS !== s.id) ns.add(nS); } }
    s.neighbors = [...ns];
  }

  // === State normalization (Azgaar: smooth borders) ===
  // Her non-capital hücre için: komşularının çoğunluğu farklı devletteyse, o devlete geç
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < graph.cells.length; i++) {
      if (data.elevation[i] < SEA_LEVEL) continue;
      const curState = cellState[i];
      if (curState < 0) continue;

      // Capital veya burg hücresini değiştirme
      const isBurgCell = burgs.some(b => b.cellIndex === i);
      if (isBurgCell) continue;

      // Komşu devletleri say
      const neighborStates = new Map<number, number>();
      let sameCount = 0;
      for (const ni of graph.cells[i].neighbors) {
        const ns = cellState[ni];
        if (ns < 0) continue;
        if (ns === curState) { sameCount++; }
        else { neighborStates.set(ns, (neighborStates.get(ns) || 0) + 1); }
      }

      // En çok komşusu olan farklı devlet
      let bestOther = -1, bestCount = 0;
      for (const [sId, cnt] of neighborStates) {
        if (cnt > bestCount) { bestCount = cnt; bestOther = sId; }
      }

      // Azgaar: adversaries >= 2 && adversaries > buddies && buddies <= 2
      if (bestCount >= 2 && bestCount > sameCount && sameCount <= 2) {
        // Devleti değiştir
        states[curState].cells = states[curState].cells.filter(c => c !== i);
        cellState[i] = bestOther;
        states[bestOther].cells.push(i);
      }
    }
  }

  // Burg ataması
  for (const b of burgs) { const sId = cellState[b.cellIndex]; if (sId >= 0) { b.stateId = sId; if (!states[sId].burgIds.includes(b.id)) states[sId].burgIds.push(b.id); } }
  return states;
}

// ===== Routes =====
function generateVoronoiRoutes(graph: VoronoiGraph, data: VoronoiMapData, burgs: VoronoiBurg[], rng: Alea, maxRoutes: number = 20): VoronoiRoute[] {
  const routes: VoronoiRoute[] = [];
  if (burgs.length < 2) return routes;

  const pairs: {a:number;b:number;pri:number}[] = [];
  for (let i=0;i<burgs.length;i++) for (let j=i+1;j<burgs.length;j++) {
    const d = cellDistance(graph, burgs[i].cellIndex, burgs[j].cellIndex);
    if (d > 600) continue;
    let pri = 0;
    if (burgs[i].isCapital && burgs[j].isCapital) pri = 100;
    else if (burgs[i].isCapital || burgs[j].isCapital) pri = 50;
    pri += (burgs[i].population + burgs[j].population) / 1000 - d/100;
    pairs.push({a:i,b:j,pri});
  }
  pairs.sort((a,b) => b.pri-a.pri);

  for (const pair of pairs.slice(0, maxRoutes)) {
    const path = greedyPath(graph, data.elevation, burgs[pair.a].cellIndex, burgs[pair.b].cellIndex);
    if (path.length < 2) continue;
    const type = burgs[pair.a].isCapital && burgs[pair.b].isCapital ? 'highway' as const :
                 burgs[pair.a].isCapital || burgs[pair.b].isCapital ? 'road' as const : 'trail' as const;
    routes.push({ id: routes.length, fromBurg: pair.a, toBurg: pair.b, path, type });
  }
  return routes;
}

function greedyPath(graph: VoronoiGraph, elevation: Float32Array, from: number, to: number): number[] {
  const path = [from];
  const visited = new Set<number>([from]);
  let cur = from;
  const target = graph.cells[to].center;
  for (let step = 0; step < 200; step++) {
    if (cur === to) break;
    let best = -1, bestScore = Infinity;
    for (const ni of graph.cells[cur].neighbors) {
      if (visited.has(ni)) continue;
      if (elevation[ni] < SEA_LEVEL) continue;
      const c = graph.cells[ni].center;
      const dist = Math.sqrt((c.x-target.x)**2+(c.y-target.y)**2);
      const elevCost = elevation[ni] > 0.7 ? 50 : 0;
      const score = dist + elevCost;
      if (score < bestScore) { bestScore = score; best = ni; }
    }
    if (best < 0) break;
    visited.add(best); path.push(best); cur = best;
  }
  return path;
}

function ptSegDist(px:number,py:number,x1:number,y1:number,x2:number,y2:number):number{const dx=x2-x1,dy=y2-y1,ls=dx*dx+dy*dy;if(ls===0)return Math.sqrt((px-x1)**2+(py-y1)**2);let t=((px-x1)*dx+(py-y1)*dy)/ls;t=Math.max(0,Math.min(1,t));return Math.sqrt((px-x1-t*dx)**2+(py-y1-t*dy)**2);}
