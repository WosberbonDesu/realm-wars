// Burg (şehir/kasaba) generator - Azgaar tarzı yerleşim yeri üretimi
// Her hücreye uygunluk puanı verir, en yüksek puanlı yerlere şehir kurar

import { HexCoord, hexKey, HexTerrain } from '../types/game';
import { getNeighbors, isInMapBounds, hexDistance } from './hexUtils';
import { SEA_LEVEL } from './biomes';
import { Alea } from './alea';

export interface Burg {
  id: number;
  name: string;
  coord: HexCoord;
  population: number;
  isCapital: boolean;
  stateId: number;
  score: number;
  port: boolean;       // kıyıda mı
  citadel: boolean;    // tepede mi
  walls: boolean;
  plaza: boolean;
}

export interface BurgResult {
  burgs: Burg[];
  burgMap: Map<string, number>;  // key → burg ID
}

export function generateBurgs(
  elevationMap: Map<string, number>,
  moistureMap: Map<string, number>,
  temperatureMap: Map<string, number>,
  terrainMap: Map<string, HexTerrain>,
  riverCells: Set<string>,
  coastCells: Set<string>,
  radius: number,
  rng: Alea,
  maxBurgs: number = 40,
  minDistance: number = 3,
): BurgResult {
  const scores = new Map<string, number>();
  const burgs: Burg[] = [];
  const burgMap = new Map<string, number>();

  // 1. Her kara hücresine uygunluk puanı ver
  for (const [key, elev] of elevationMap) {
    if (elev < SEA_LEVEL) continue;

    const terrain = terrainMap.get(key);
    if (!terrain || terrain === HexTerrain.Ocean || terrain === HexTerrain.Coast ||
        terrain === HexTerrain.Lake || terrain === HexTerrain.Snow) continue;

    const [q, r] = key.split(',').map(Number);
    const moisture = moistureMap.get(key) || 0;
    const temp = temperatureMap.get(key) || 0;

    let score = 0;

    // Nehir kenarı büyük bonus
    if (riverCells.has(key)) score += 8;

    // Kıyı bonusu (ticaret)
    if (coastCells.has(key)) score += 6;

    // Verimli toprak (nem + sıcaklık)
    score += moisture * 4;
    score += temp * 3;

    // Yükseklik cezası (çok yüksek = zor yaşam)
    const landElev = (elev - SEA_LEVEL) / (1 - SEA_LEVEL);
    score -= landElev * 5;

    // Terrain bonusları
    if (terrain === HexTerrain.Plains) score += 4;
    if (terrain === HexTerrain.Forest) score += 2;
    if (terrain === HexTerrain.Desert) score -= 3;
    if (terrain === HexTerrain.Swamp) score -= 2;
    if (terrain === HexTerrain.Tundra) score -= 4;
    if (terrain === HexTerrain.Mountain) score -= 3;

    // Rastgele varyasyon
    score += rng.nextFloat(-1, 1);

    scores.set(key, Math.max(0, score));
  }

  // 2. Greedy placement: en yüksek puanlıdan başla, minimum mesafe koru
  const sorted = [...scores.entries()]
    .sort((a, b) => b[1] - a[1]);

  const placedCoords: HexCoord[] = [];

  for (const [key, score] of sorted) {
    if (burgs.length >= maxBurgs) break;

    const [q, r] = key.split(',').map(Number);
    const coord = { q, r };

    // Minimum mesafe kontrolü
    const tooClose = placedCoords.some(
      pc => hexDistance(pc, coord) < minDistance
    );
    if (tooClose) continue;

    const isPort = coastCells.has(key);
    const elev = elevationMap.get(key) || 0;
    const isCitadel = elev > 0.5;

    // Population: score bazlı
    const basePop = Math.floor(score * 200 + rng.nextFloat(100, 500));
    // İlk şehirler daha büyük (capital candidates)
    const population = burgs.length < 4 ? basePop * 3 : basePop;

    burgs.push({
      id: burgs.length,
      name: '', // nameGenerator doldurur
      coord,
      population,
      isCapital: false, // states generator belirler
      stateId: -1,
      score,
      port: isPort,
      citadel: isCitadel,
      walls: score > 10,
      plaza: score > 8,
    });

    burgMap.set(key, burgs.length - 1);
    placedCoords.push(coord);
  }

  return { burgs, burgMap };
}
