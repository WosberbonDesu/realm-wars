// State (devlet) generator - Azgaar tarzı siyasi sınırlar
// Capital burg'lardan BFS ile yayılarak devlet toprakları oluşturur

import { hexKey, HexTerrain } from '../types/game';
import { getNeighbors, isInMapBounds, hexDistance } from './hexUtils';
import { SEA_LEVEL } from './biomes';
import { Alea } from './alea';
import { Burg } from './burgGenerator';

export interface State {
  id: number;
  name: string;
  color: string;
  capitalId: number;      // burg ID
  center: { q: number; r: number };
  cells: string[];
  burgs: number[];        // burg ID'leri
  provinces: number[];    // province ID'leri
  area: number;
  population: number;
  military: number;
  neighbors: number[];    // komşu state ID'leri
  formName: string;       // "Kingdom", "Empire", "Republic"...
}

export interface StateResult {
  states: State[];
  stateMap: Map<string, number>;  // key → state ID
}

const STATE_COLORS = [
  '#4a90d9', '#d94a4a', '#d9a84a', '#8b4ad9', '#4ad97a',
  '#d94a8b', '#4ad9d9', '#d9d94a', '#7a4ad9', '#d97a4a',
  '#4a7ad9', '#d94ad9', '#4ad94a', '#d9d94a', '#9a4ad9',
  '#d9a84a', '#4ad9a8', '#d94a4a',
];

const FORM_NAMES = [
  'Krallik', 'Imparatorluk', 'Cumhuriyet', 'Hanlik', 'Beylik',
  'Sultanlik', 'Prenslik', 'Dukalik', 'Konfederasyon', 'Birlik',
];

export function generateStates(
  elevationMap: Map<string, number>,
  terrainMap: Map<string, HexTerrain>,
  burgs: Burg[],
  cultureMap: Map<string, number>,
  radius: number,
  rng: Alea,
  stateCount: number = 6,
): StateResult {
  const stateMap = new Map<string, number>();
  const states: State[] = [];

  if (burgs.length === 0) return { states, stateMap };

  // Capital seçimi: en büyük burg'lar, birbirinden uzak
  const capitalBurgs: Burg[] = [];
  const sortedBurgs = [...burgs].sort((a, b) => b.population - a.population);

  for (const burg of sortedBurgs) {
    if (capitalBurgs.length >= stateCount) break;
    const tooClose = capitalBurgs.some(
      cb => hexDistance(cb.coord, burg.coord) < 5
    );
    if (!tooClose) {
      capitalBurgs.push(burg);
    }
  }

  // Devletleri oluştur
  for (let i = 0; i < capitalBurgs.length; i++) {
    const capital = capitalBurgs[i];
    capital.isCapital = true;
    capital.stateId = i;

    states.push({
      id: i,
      name: '', // nameGenerator doldurur
      color: STATE_COLORS[i % STATE_COLORS.length],
      capitalId: capital.id,
      center: capital.coord,
      cells: [],
      burgs: [capital.id],
      provinces: [],
      area: 0,
      population: 0,
      military: 0,
      neighbors: [],
      formName: rng.pick(FORM_NAMES),
    });
  }

  // Wave-front expansion: capital'lardan BFS
  const costMap = new Map<string, number>();
  const pq: { key: string; stateId: number; cost: number }[] = [];

  for (const state of states) {
    const key = hexKey(state.center.q, state.center.r);
    pq.push({ key, stateId: state.id, cost: 0 });
    costMap.set(`${state.id}:${key}`, 0);
    stateMap.set(key, state.id);
  }

  pq.sort((a, b) => a.cost - b.cost);

  while (pq.length > 0) {
    const { key, stateId, cost } = pq.shift()!;

    if (stateMap.has(key) && stateMap.get(key) !== stateId) {
      continue;
    }
    stateMap.set(key, stateId);

    const [q, r] = key.split(',').map(Number);
    const neighbors = getNeighbors({ q, r });

    for (const n of neighbors) {
      if (!isInMapBounds(n.q, n.r, radius)) continue;
      const nKey = hexKey(n.q, n.r);
      const nElev = elevationMap.get(nKey);
      if (nElev === undefined || nElev < SEA_LEVEL) continue;
      if (stateMap.has(nKey)) continue;

      const nTerrain = terrainMap.get(nKey) || HexTerrain.Plains;
      let moveCost = 1;
      if (nTerrain === HexTerrain.Mountain) moveCost = 4;
      else if (nTerrain === HexTerrain.Forest) moveCost = 2;
      else if (nTerrain === HexTerrain.Swamp) moveCost = 3;
      else if (nTerrain === HexTerrain.Desert) moveCost = 2;

      // Kültür sınırı maliyet artışı
      const currentCulture = cultureMap.get(key);
      const neighborCulture = cultureMap.get(nKey);
      if (currentCulture !== undefined && neighborCulture !== undefined && currentCulture !== neighborCulture) {
        moveCost += 3;
      }

      const totalCost = cost + moveCost;
      const cacheKey = `${stateId}:${nKey}`;
      const existing = costMap.get(cacheKey);
      if (existing !== undefined && existing <= totalCost) continue;

      costMap.set(cacheKey, totalCost);

      let inserted = false;
      for (let i = 0; i < pq.length; i++) {
        if (pq[i].cost > totalCost) {
          pq.splice(i, 0, { key: nKey, stateId, cost: totalCost });
          inserted = true;
          break;
        }
      }
      if (!inserted) pq.push({ key: nKey, stateId, cost: totalCost });
    }
  }

  // Hücreleri devletlere ata + istatistik hesapla
  for (const [key, sId] of stateMap) {
    states[sId].cells.push(key);
    states[sId].area++;
  }

  // Burg'ları devletlere ata
  for (const burg of burgs) {
    const key = hexKey(burg.coord.q, burg.coord.r);
    const sId = stateMap.get(key);
    if (sId !== undefined) {
      burg.stateId = sId;
      if (!states[sId].burgs.includes(burg.id)) {
        states[sId].burgs.push(burg.id);
      }
      states[sId].population += burg.population;
    }
  }

  // Komşu devletleri bul
  for (const state of states) {
    const neighborSet = new Set<number>();
    for (const key of state.cells) {
      const [q, r] = key.split(',').map(Number);
      const neighbors = getNeighbors({ q, r });
      for (const n of neighbors) {
        const nKey = hexKey(n.q, n.r);
        const nState = stateMap.get(nKey);
        if (nState !== undefined && nState !== state.id) {
          neighborSet.add(nState);
        }
      }
    }
    state.neighbors = [...neighborSet];
  }

  // Military gücü
  for (const state of states) {
    state.military = Math.floor(state.population * 0.05 + state.area * 2);
  }

  return { states, stateMap };
}
