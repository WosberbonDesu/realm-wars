// Religion generator - Azgaar tarzı inanç sistemi üretimi
// Kültürlere benzer wave-front expansion ile yayılır

import { hexKey, HexTerrain } from '../types/game';
import { getNeighbors, isInMapBounds } from './hexUtils';
import { SEA_LEVEL } from './biomes';
import { Alea } from './alea';
import { Burg } from './burgGenerator';
import { Culture } from './cultureGenerator';

export interface Religion {
  id: number;
  name: string;
  color: string;
  type: ReligionType;
  center: { q: number; r: number };
  deity: string;
  cells: string[];
  expansion: number;   // 0-1
  origin: string;      // "Organized", "Folk", "Cult", "Heresy"
}

export enum ReligionType {
  Organized = 'organized',
  Folk = 'folk',
  Cult = 'cult',
  Heresy = 'heresy',
}

export interface ReligionResult {
  religions: Religion[];
  religionMap: Map<string, number>;  // key → religion ID
}

const RELIGION_COLORS = [
  '#ffd700', '#ff6347', '#9370db', '#20b2aa', '#ff69b4',
  '#00ced1', '#ff4500', '#7b68ee', '#3cb371', '#dc143c',
  '#1e90ff', '#ff8c00', '#8a2be2', '#00fa9a',
];

const DEITY_PREFIXES = [
  'Ulu', 'Yuce', 'Sonsuz', 'Kutsal', 'Kadim', 'Ezeli',
  'Gizli', 'Parlak', 'Karanlik', 'Gunesli',
];

const DEITY_NAMES = [
  'Tanri', 'Isik', 'Gunes', 'Ay', 'Ates', 'Ruzgar',
  'Toprak', 'Deniz', 'Gok', 'Yildiz', 'Orman', 'Dag',
];

export function generateReligions(
  elevationMap: Map<string, number>,
  terrainMap: Map<string, HexTerrain>,
  cultureMap: Map<string, number>,
  cultures: Culture[],
  burgs: Burg[],
  radius: number,
  rng: Alea,
  religionCount: number = 6,
): ReligionResult {
  const religionMap = new Map<string, number>();
  const religions: Religion[] = [];

  // Ana dinler: büyük kültür merkezlerinden doğar
  const sortedBurgs = [...burgs].sort((a, b) => b.population - a.population);
  const usedCultures = new Set<number>();

  for (let i = 0; i < Math.min(religionCount, sortedBurgs.length); i++) {
    const burg = sortedBurgs[i];
    const key = hexKey(burg.coord.q, burg.coord.r);
    const cultureId = cultureMap.get(key);

    // Aynı kültürden çok din çıkmasın
    if (cultureId !== undefined && usedCultures.has(cultureId) && rng.next() > 0.3) continue;
    if (cultureId !== undefined) usedCultures.add(cultureId);

    const type = i < 3 ? ReligionType.Organized :
                 rng.next() > 0.5 ? ReligionType.Folk : ReligionType.Cult;

    const deity = rng.pick(DEITY_PREFIXES) + ' ' + rng.pick(DEITY_NAMES);

    religions.push({
      id: religions.length,
      name: '', // nameGenerator doldurur
      color: RELIGION_COLORS[religions.length % RELIGION_COLORS.length],
      type,
      center: burg.coord,
      deity,
      cells: [],
      expansion: rng.nextFloat(0.4, 1.0),
      origin: type.charAt(0).toUpperCase() + type.slice(1),
    });
  }

  if (religions.length === 0) return { religions, religionMap };

  // Wave-front expansion
  const costMap = new Map<string, number>();
  const pq: { key: string; relId: number; cost: number }[] = [];

  for (const rel of religions) {
    const key = hexKey(rel.center.q, rel.center.r);
    pq.push({ key, relId: rel.id, cost: 0 });
    costMap.set(key, 0);
    religionMap.set(key, rel.id);
  }

  pq.sort((a, b) => a.cost - b.cost);

  while (pq.length > 0) {
    const { key, relId, cost } = pq.shift()!;
    if (religionMap.has(key) && religionMap.get(key) !== relId) continue;
    religionMap.set(key, relId);

    const [q, r] = key.split(',').map(Number);
    const neighbors = getNeighbors({ q, r });

    for (const n of neighbors) {
      if (!isInMapBounds(n.q, n.r, radius)) continue;
      const nKey = hexKey(n.q, n.r);
      const nElev = elevationMap.get(nKey);
      if (nElev === undefined || nElev < SEA_LEVEL) continue;
      if (religionMap.has(nKey)) continue;

      let moveCost = 1;
      const nTerrain = terrainMap.get(nKey);
      if (nTerrain === HexTerrain.Mountain) moveCost = 3;
      if (nTerrain === HexTerrain.Desert) moveCost = 2;

      // Kültür sınırı geçişi daha zor
      const myCulture = cultureMap.get(key);
      const nCulture = cultureMap.get(nKey);
      if (myCulture !== nCulture) moveCost += 2;

      const totalCost = cost + moveCost / religions[relId].expansion;
      const existing = costMap.get(nKey);
      if (existing !== undefined && existing <= totalCost) continue;
      costMap.set(nKey, totalCost);

      let inserted = false;
      for (let i = 0; i < pq.length; i++) {
        if (pq[i].cost > totalCost) {
          pq.splice(i, 0, { key: nKey, relId, cost: totalCost });
          inserted = true;
          break;
        }
      }
      if (!inserted) pq.push({ key: nKey, relId, cost: totalCost });
    }
  }

  // Hücreleri dinlere ata
  for (const [key, rId] of religionMap) {
    religions[rId].cells.push(key);
  }

  return { religions, religionMap };
}
