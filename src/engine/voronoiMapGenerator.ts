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

const STATE_COLORS = [
  '#4a90d9', '#d94a4a', '#d9a84a', '#8b4ad9', '#4ad97a',
  '#d94a8b', '#4ad9d9', '#d9d94a', '#7a4ad9', '#d97a4a',
  '#4a7ad9', '#d94ad9', '#9a4ad9', '#d9a84a', '#4ad9a8',
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
): VoronoiMapResult {
  const rng = new Alea(seed);
  const nameGen = new NameGenerator(seed);

  // --- 1. Voronoi grid ---
  const voronoiData = createVoronoiMap({ width, height, cellCount, seed, jitter: 0.7 });
  const graph = voronoiData.graph;
  const n = graph.cells.length;

  // --- 2. Heightmap ---
  generateHeightmap(voronoiData, graph, rng, width, height, seed);

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

// ===== Heightmap =====
function generateHeightmap(data: VoronoiMapData, graph: VoronoiGraph, rng: Alea, w: number, h: number, seed: number): void {
  const n = graph.cells.length;
  const noise1 = createNoise2D(seed);
  const noise2 = createNoise2D(seed + 1337);
  const noise3 = createNoise2D(seed + 7919);
  const useArch = rng.next() > 0.6;

  const hills: { x: number; y: number; str: number; sz: number }[] = [];
  for (let i = 0; i < rng.nextInt(3, 7); i++) {
    hills.push({ x: rng.nextFloat(w * 0.15, w * 0.85), y: rng.nextFloat(h * 0.15, h * 0.85), str: rng.nextFloat(0.15, 0.4), sz: rng.nextFloat(w * 0.08, w * 0.2) });
  }
  const ranges: { x1: number; y1: number; x2: number; y2: number; rw: number; rh: number }[] = [];
  for (let i = 0; i < rng.nextInt(1, 3); i++) {
    const a = rng.nextFloat(0, Math.PI), l = w * rng.nextFloat(0.3, 0.6);
    ranges.push({ x1: w/2+Math.cos(a)*l*0.5, y1: h/2+Math.sin(a)*l*0.5, x2: w/2-Math.cos(a)*l*0.5, y2: h/2-Math.sin(a)*l*0.5, rw: rng.nextFloat(w*0.02, w*0.06), rh: rng.nextFloat(0.3, 0.5) });
  }

  for (let i = 0; i < n; i++) {
    const { nx, ny } = normalizeCoord(graph.cells[i], w, h);
    const sx = (nx - 0.5) * 20, sy = (ny - 0.5) * 20;
    let e = noise1(sx*0.3,sy*0.3)*0.4 + noise2(sx*0.6,sy*0.6)*0.25 + noise3(sx*1.2,sy*1.2)*0.1;
    const dc = Math.sqrt((nx-0.5)**2+(ny-0.5)**2)*2;
    if (useArch) {
      const centers = [{cx:0.3,cy:0.5},{cx:0.7,cy:0.3},{cx:0.5,cy:0.7},{cx:0.6,cy:0.6}];
      let mx = 0;
      for (const c of centers) { const d = Math.sqrt((nx-c.cx)**2+(ny-c.cy)**2)/0.3; mx = Math.max(mx, Math.max(0, 1-d)); }
      e += mx * 0.35;
    } else {
      e += Math.max(0, 1-dc*1.3)*0.35;
    }
    const cx = graph.cells[i].center.x, cy = graph.cells[i].center.y;
    for (const hl of hills) { const d = Math.sqrt((cx-hl.x)**2+(cy-hl.y)**2); if (d<hl.sz) e += ((1-d/hl.sz)**2)*hl.str; }
    for (const rn of ranges) { const d = ptSegDist(cx,cy,rn.x1,rn.y1,rn.x2,rn.y2); if (d<rn.rw) e += ((1-d/rn.rw)**2)*rn.rh; }
    data.elevation[i] = Math.max(0, Math.min(1, (e+0.5)/1.5));
  }
}

function generateTemperature(data: VoronoiMapData, graph: VoronoiGraph, w: number, h: number, seed: number): void {
  const tn = createNoise2D(seed+3000);
  for (let i = 0; i < graph.cells.length; i++) {
    const { nx, ny } = normalizeCoord(graph.cells[i], w, h);
    let t = Math.max(0, Math.min(1, 1-Math.sqrt((nx-0.5)**2+(ny-0.5)**2)*1.6));
    t = applyLapseRate(t, data.elevation[i]);
    t += tn((nx-0.5)*10,(ny-0.5)*10)*0.1;
    data.temperature[i] = Math.max(0, Math.min(1, t));
  }
}

function generateMoisture(data: VoronoiMapData, graph: VoronoiGraph, w: number, h: number, seed: number): void {
  const mn1 = createNoise2D(seed+5000), mn2 = createNoise2D(seed+6000);
  for (let i = 0; i < graph.cells.length; i++) {
    const { nx, ny } = normalizeCoord(graph.cells[i], w, h);
    const sx = (nx-0.5)*20, sy = (ny-0.5)*20;
    let m = mn1(sx*0.4,sy*0.4)*0.5+mn2(sx*0.8,sy*0.8)*0.25+0.35;
    if (data.elevation[i]<SEA_LEVEL) m=0.8;
    else { const le=(data.elevation[i]-SEA_LEVEL)/(1-SEA_LEVEL); if(le>0.5) m-=(le-0.5)*0.3; }
    data.moisture[i] = Math.max(0, Math.min(1, m));
  }
}

// ===== Rivers =====
function generateVoronoiRivers(graph: VoronoiGraph, elevation: Float32Array, moisture: Float32Array, n: number, nameGen: NameGenerator): VoronoiRiver[] {
  const downhill = new Int32Array(n).fill(-1);
  const flux = new Float32Array(n);
  for (let i=0;i<n;i++) { if(elevation[i]<SEA_LEVEL)continue; flux[i]=moisture[i]; let lo=-1,le=elevation[i]; for(const ni of graph.cells[i].neighbors){if(elevation[ni]<le){le=elevation[ni];lo=ni;}} downhill[i]=lo; }
  const sorted = Array.from({length:n},(_,i)=>i).filter(i=>elevation[i]>=SEA_LEVEL).sort((a,b)=>elevation[b]-elevation[a]);
  for (const i of sorted) { if(downhill[i]>=0) flux[downhill[i]]+=flux[i]; }
  const rivers: VoronoiRiver[] = [];
  const visited = new Set<number>();
  for (const src of sorted.filter(i=>flux[i]>=4).sort((a,b)=>flux[b]-flux[a])) {
    if(visited.has(src))continue;
    const path: number[] = []; let cur = src;
    while(cur>=0&&!visited.has(cur)){path.push(cur);visited.add(cur);if(downhill[cur]>=0&&elevation[downhill[cur]]<SEA_LEVEL)break;cur=downhill[cur];}
    if(path.length>=3) rivers.push({id:rivers.length,path,flux:flux[src],name:nameGen.riverName()});
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
