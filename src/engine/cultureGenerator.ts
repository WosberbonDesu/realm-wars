// Culture generator - Azgaar tarzı kültür bölgeleri
// Seed noktalarından wave-front expansion ile yayılır
// Biome bazlı hareket maliyeti ile doğal sınırlar oluşur

import { hexKey, HexTerrain } from '../types/game';
import { getNeighbors, isInMapBounds } from './hexUtils';
import { SEA_LEVEL } from './biomes';
import { Alea } from './alea';
import { Burg } from './burgGenerator';

export interface Culture {
  id: number;
  name: string;
  color: string;
  type: CultureType;
  center: { q: number; r: number };
  expansionism: number;  // 0-1, yayılma hızı
  cells: string[];
  population: number;
}

export enum CultureType {
  Nomadic = 'nomadic',
  Highland = 'highland',
  River = 'river',
  Naval = 'naval',
  Lake = 'lake',
  Hunting = 'hunting',
  Farming = 'farming',
}

export interface CultureResult {
  cultures: Culture[];
  cultureMap: Map<string, number>;  // key → culture ID
}

// Kültür renkleri
const CULTURE_COLORS = [
  '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
  '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#fabed4',
  '#469990', '#dcbeff', '#9A6324', '#800000', '#aaffc3',
  '#808000', '#ffd8b1', '#000075',
];

// Terrain bazlı hareket maliyeti (kültür yayılması için)
const EXPANSION_COST: Record<string, number> = {
  [HexTerrain.Plains]: 1,
  [HexTerrain.Forest]: 2,
  [HexTerrain.Mountain]: 4,
  [HexTerrain.Desert]: 3,
  [HexTerrain.Swamp]: 3,
  [HexTerrain.Tundra]: 3,
  [HexTerrain.Snow]: 5,
};

function determineCultureType(
  terrain: HexTerrain,
  hasRiver: boolean,
  isCoast: boolean,
  elevation: number,
): CultureType {
  if (isCoast) return CultureType.Naval;
  if (hasRiver) return CultureType.River;
  if (elevation > 0.6) return CultureType.Highland;
  if (terrain === HexTerrain.Desert || terrain === HexTerrain.Tundra) return CultureType.Nomadic;
  if (terrain === HexTerrain.Forest) return CultureType.Hunting;
  return CultureType.Farming;
}

export function generateCultures(
  elevationMap: Map<string, number>,
  terrainMap: Map<string, HexTerrain>,
  riverCells: Set<string>,
  coastCells: Set<string>,
  burgs: Burg[],
  radius: number,
  rng: Alea,
  cultureCount: number = 8,
): CultureResult {
  const cultureMap = new Map<string, number>();
  const cultures: Culture[] = [];

  // Kültür merkezleri: en büyük burg'lar
  const sortedBurgs = [...burgs]
    .sort((a, b) => b.population - a.population)
    .slice(0, cultureCount);

  for (let i = 0; i < sortedBurgs.length; i++) {
    const burg = sortedBurgs[i];
    const key = hexKey(burg.coord.q, burg.coord.r);
    const terrain = terrainMap.get(key) || HexTerrain.Plains;
    const elev = elevationMap.get(key) || 0.3;

    cultures.push({
      id: i,
      name: '', // nameGenerator doldurur
      color: CULTURE_COLORS[i % CULTURE_COLORS.length],
      type: determineCultureType(
        terrain,
        riverCells.has(key),
        coastCells.has(key),
        elev,
      ),
      center: burg.coord,
      expansionism: rng.nextFloat(0.3, 1.0),
      cells: [],
      population: 0,
    });
  }

  if (cultures.length === 0) return { cultures, cultureMap };

  // Wave-front expansion (Dijkstra benzeri)
  // Priority queue: { key, cultureId, cost }
  const costMap = new Map<string, number>();
  const pq: { key: string; cultureId: number; cost: number }[] = [];

  // Seed noktaları
  for (const culture of cultures) {
    const key = hexKey(culture.center.q, culture.center.r);
    pq.push({ key, cultureId: culture.id, cost: 0 });
    costMap.set(key, 0);
    cultureMap.set(key, culture.id);
  }

  // Sort by cost (simple priority queue)
  pq.sort((a, b) => a.cost - b.cost);

  while (pq.length > 0) {
    const current = pq.shift()!;
    const { key, cultureId, cost } = current;

    // Zaten başka kültür aldıysa atla
    if (cultureMap.has(key) && cultureMap.get(key) !== cultureId) {
      const existingCost = costMap.get(key) || 0;
      if (existingCost < cost) continue;
    }

    cultureMap.set(key, cultureId);

    const [q, r] = key.split(',').map(Number);
    const neighbors = getNeighbors({ q, r });

    for (const n of neighbors) {
      if (!isInMapBounds(n.q, n.r, radius)) continue;
      const nKey = hexKey(n.q, n.r);
      const nElev = elevationMap.get(nKey);
      if (nElev === undefined || nElev < SEA_LEVEL) continue;

      const nTerrain = terrainMap.get(nKey) || HexTerrain.Plains;
      const moveCost = EXPANSION_COST[nTerrain] || 2;
      const culture = cultures[cultureId];
      const totalCost = cost + moveCost / culture.expansionism;

      const existingCost = costMap.get(nKey);
      if (existingCost !== undefined && existingCost <= totalCost) continue;

      costMap.set(nKey, totalCost);
      cultureMap.set(nKey, cultureId);

      // Insert sorted
      const entry = { key: nKey, cultureId, cost: totalCost };
      let inserted = false;
      for (let i = 0; i < pq.length; i++) {
        if (pq[i].cost > totalCost) {
          pq.splice(i, 0, entry);
          inserted = true;
          break;
        }
      }
      if (!inserted) pq.push(entry);
    }
  }

  // Hücreleri kültürlere ata
  for (const [key, cId] of cultureMap) {
    cultures[cId].cells.push(key);
  }

  return { cultures, cultureMap };
}
