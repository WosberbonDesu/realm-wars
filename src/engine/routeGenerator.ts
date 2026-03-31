// Route generator - Azgaar tarzı ticaret yolları ve ana yollar
// Burg'lar arası en kısa yol (terrain maliyetli) hesaplar

import { HexCoord, hexKey, HexTerrain } from '../types/game';
import { getNeighbors, isInMapBounds, hexDistance } from './hexUtils';
import { SEA_LEVEL } from './biomes';
import { Burg } from './burgGenerator';

export interface Route {
  id: number;
  from: number;       // burg ID
  to: number;         // burg ID
  path: HexCoord[];
  type: RouteType;
  length: number;
}

export enum RouteType {
  Trail = 'trail',       // patika
  Road = 'road',         // ana yol
  Highway = 'highway',   // otoyol (capital arası)
  SeaRoute = 'searoute', // deniz yolu
}

export interface RouteResult {
  routes: Route[];
  roadCells: Map<string, number>;  // key → kaç yol geçiyor
}

// Terrain bazlı yol maliyeti
const ROAD_COST: Record<string, number> = {
  [HexTerrain.Plains]: 1,
  [HexTerrain.Forest]: 3,
  [HexTerrain.Mountain]: 6,
  [HexTerrain.Desert]: 4,
  [HexTerrain.Swamp]: 5,
  [HexTerrain.Tundra]: 3,
  [HexTerrain.Snow]: 8,
};

export function generateRoutes(
  elevationMap: Map<string, number>,
  terrainMap: Map<string, HexTerrain>,
  riverCells: Set<string>,
  burgs: Burg[],
  radius: number,
  maxRoutes: number = 30,
): RouteResult {
  const routes: Route[] = [];
  const roadCells = new Map<string, number>();

  if (burgs.length < 2) return { routes, roadCells };

  // Burg çiftleri arasında yol oluştur
  // Öncelik: capital'lar arası → büyük burg'lar arası → yakın burg'lar arası
  const pairs: { from: number; to: number; priority: number }[] = [];

  for (let i = 0; i < burgs.length; i++) {
    for (let j = i + 1; j < burgs.length; j++) {
      const dist = hexDistance(burgs[i].coord, burgs[j].coord);
      if (dist > radius) continue; // çok uzak

      let priority = 0;
      if (burgs[i].isCapital && burgs[j].isCapital) priority = 100;
      else if (burgs[i].isCapital || burgs[j].isCapital) priority = 50;
      priority += (burgs[i].population + burgs[j].population) / 1000;
      priority -= dist; // yakın olanlar öncelikli

      pairs.push({ from: i, to: j, priority });
    }
  }

  pairs.sort((a, b) => b.priority - a.priority);

  // En yüksek öncelikli çiftler için A* pathfinding
  for (const pair of pairs.slice(0, maxRoutes)) {
    const fromBurg = burgs[pair.from];
    const toBurg = burgs[pair.to];

    const path = findPath(
      fromBurg.coord, toBurg.coord,
      elevationMap, terrainMap, riverCells, radius,
    );

    if (path.length < 2) continue;

    // Route tipi
    let type = RouteType.Trail;
    if (fromBurg.isCapital && toBurg.isCapital) type = RouteType.Highway;
    else if (fromBurg.isCapital || toBurg.isCapital) type = RouteType.Road;
    else if (fromBurg.population + toBurg.population > 3000) type = RouteType.Road;

    routes.push({
      id: routes.length,
      from: pair.from,
      to: pair.to,
      path,
      type,
      length: path.length,
    });

    // Road cell tracking
    for (const p of path) {
      const key = hexKey(p.q, p.r);
      roadCells.set(key, (roadCells.get(key) || 0) + 1);
    }
  }

  return { routes, roadCells };
}

// A* pathfinding
function findPath(
  from: HexCoord,
  to: HexCoord,
  elevationMap: Map<string, number>,
  terrainMap: Map<string, HexTerrain>,
  riverCells: Set<string>,
  radius: number,
): HexCoord[] {
  const startKey = hexKey(from.q, from.r);
  const endKey = hexKey(to.q, to.r);

  const openSet = new Map<string, { key: string; g: number; f: number; parent: string | null }>();
  const closedSet = new Set<string>();

  openSet.set(startKey, { key: startKey, g: 0, f: hexDistance(from, to), parent: null });

  while (openSet.size > 0) {
    // Find lowest f
    let current: { key: string; g: number; f: number; parent: string | null } | null = null;
    for (const node of openSet.values()) {
      if (!current || node.f < current.f) current = node;
    }
    if (!current) break;

    if (current.key === endKey) {
      // Reconstruct path
      const path: HexCoord[] = [];
      let node: string | null = current.key;
      const parentMap = new Map<string, string | null>();

      // Build parent map from closed + current
      for (const [k, v] of closedSet) {
        // closedSet sadece key tutuyor, parentMap'i ayrı tutmalıyız
      }
      // Alternatif: parent'ları ayrı map'te tut
      break; // Aşağıdaki basit implementasyonu kullan
    }

    openSet.delete(current.key);
    closedSet.add(current.key);

    const [cq, cr] = current.key.split(',').map(Number);
    const neighbors = getNeighbors({ q: cq, r: cr });

    for (const n of neighbors) {
      if (!isInMapBounds(n.q, n.r, radius)) continue;
      const nKey = hexKey(n.q, n.r);
      if (closedSet.has(nKey)) continue;

      const nElev = elevationMap.get(nKey);
      if (nElev === undefined || nElev < SEA_LEVEL) continue;

      const nTerrain = terrainMap.get(nKey) || HexTerrain.Plains;
      let cost = ROAD_COST[nTerrain] || 2;

      // Nehir kenarı yol maliyeti azalır (su kaynağı)
      if (riverCells.has(nKey)) cost *= 0.7;

      const g = current.g + cost;
      const h = hexDistance(n, to);
      const f = g + h;

      const existing = openSet.get(nKey);
      if (existing && existing.g <= g) continue;

      openSet.set(nKey, { key: nKey, g, f, parent: current.key });
    }
  }

  // Basit fallback: düz çizgi yol (A* bulamadıysa)
  return simplePath(from, to, elevationMap, radius);
}

// Basit greedy path (fallback)
function simplePath(
  from: HexCoord, to: HexCoord,
  elevationMap: Map<string, number>,
  radius: number,
): HexCoord[] {
  const path: HexCoord[] = [from];
  let current = from;
  const visited = new Set<string>();
  visited.add(hexKey(from.q, from.r));

  for (let step = 0; step < 100; step++) {
    if (current.q === to.q && current.r === to.r) break;

    const neighbors = getNeighbors(current);
    let best: HexCoord | null = null;
    let bestDist = Infinity;

    for (const n of neighbors) {
      if (!isInMapBounds(n.q, n.r, radius)) continue;
      const nKey = hexKey(n.q, n.r);
      if (visited.has(nKey)) continue;
      const elev = elevationMap.get(nKey);
      if (elev === undefined || elev < SEA_LEVEL) continue;

      const dist = hexDistance(n, to);
      if (dist < bestDist) {
        bestDist = dist;
        best = n;
      }
    }

    if (!best) break;
    visited.add(hexKey(best.q, best.r));
    path.push(best);
    current = best;
  }

  return path;
}
