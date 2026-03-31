// Population / demographics generator - Azgaar tarzı nüfus hesaplaması
// Biome, yükseklik, nehir yakınlığı ve kıyı etkisiyle nüfus yoğunluğu

import { hexKey, HexTerrain } from '../types/game';
import { SEA_LEVEL } from './biomes';
import { Alea } from './alea';

export interface PopulationResult {
  populationMap: Map<string, number>;    // key → nüfus
  suitabilityMap: Map<string, number>;   // key → uygunluk (0-1)
  totalPopulation: number;
  urbanPopulation: number;
  ruralPopulation: number;
}

// Terrain bazlı temel uygunluk
const TERRAIN_SUITABILITY: Record<string, number> = {
  [HexTerrain.Plains]: 0.9,
  [HexTerrain.Forest]: 0.5,
  [HexTerrain.Mountain]: 0.15,
  [HexTerrain.Desert]: 0.1,
  [HexTerrain.Swamp]: 0.2,
  [HexTerrain.Tundra]: 0.1,
  [HexTerrain.Snow]: 0.02,
  [HexTerrain.Coast]: 0.0,
  [HexTerrain.Ocean]: 0.0,
  [HexTerrain.Lake]: 0.0,
};

export function generatePopulation(
  elevationMap: Map<string, number>,
  terrainMap: Map<string, HexTerrain>,
  moistureMap: Map<string, number>,
  temperatureMap: Map<string, number>,
  riverCells: Set<string>,
  coastCells: Set<string>,
  burgCells: Map<string, number>,  // key → burg ID
  rng: Alea,
): PopulationResult {
  const populationMap = new Map<string, number>();
  const suitabilityMap = new Map<string, number>();
  let totalPopulation = 0;
  let urbanPopulation = 0;
  let ruralPopulation = 0;

  for (const [key, elev] of elevationMap) {
    if (elev < SEA_LEVEL) continue;

    const terrain = terrainMap.get(key);
    if (!terrain) continue;

    // 1. Temel uygunluk
    let suitability = TERRAIN_SUITABILITY[terrain] || 0;

    // 2. Nem bonusu
    const moisture = moistureMap.get(key) || 0;
    suitability += moisture * 0.3;

    // 3. Sıcaklık bonusu (ilıman en iyi)
    const temp = temperatureMap.get(key) || 0;
    const tempBonus = 1 - Math.abs(temp - 0.6) * 1.5; // optimal: 0.6
    suitability += Math.max(0, tempBonus) * 0.2;

    // 4. Nehir kenarı büyük bonus
    if (riverCells.has(key)) suitability += 0.3;

    // 5. Kıyı yakınlığı bonusu
    if (coastCells.has(key)) suitability += 0.2;

    // 6. Yükseklik cezası
    const landElev = (elev - SEA_LEVEL) / (1 - SEA_LEVEL);
    suitability -= landElev * 0.4;

    suitability = Math.max(0, Math.min(1, suitability));
    suitabilityMap.set(key, suitability);

    // Nüfus hesapla
    const basePop = Math.floor(suitability * 100 * (1 + rng.nextFloat(-0.2, 0.2)));

    // Burg varsa şehir nüfusu
    const isBurg = burgCells.has(key);
    const pop = isBurg ? basePop * 10 : basePop;

    populationMap.set(key, pop);
    totalPopulation += pop;
    if (isBurg) urbanPopulation += pop;
    else ruralPopulation += pop;
  }

  return {
    populationMap,
    suitabilityMap,
    totalPopulation,
    urbanPopulation,
    ruralPopulation,
  };
}
