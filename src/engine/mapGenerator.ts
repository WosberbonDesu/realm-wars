// Azgaar-inspired harita üretim pipeline'ı
// Seed → Heightmap → Temperature → Moisture → Biomes → Features → Rivers → Names
import { HexTile, HexTerrain, HexCoord, hexKey, Resources } from '../types/game';
import { createNoise2D } from './noise';
import { isInMapBounds } from './hexUtils';
import { Alea } from './alea';
import {
  classifyBiome, baseTemperature, applyLapseRate,
  SEA_LEVEL, BiomeResult,
} from './biomes';
import { generateRivers, RiverResult, RiverSegment } from './rivers';
import { detectFeatures, FeatureResult, FeatureType } from './features';
import { NameGenerator } from './nameGenerator';
import { generateOceanLayers, OceanResult } from './oceanLayers';
import { generateBurgs, Burg, BurgResult } from './burgGenerator';
import { generateCultures, Culture, CultureResult } from './cultureGenerator';
import { generateStates, State, StateResult } from './stateGenerator';
import { generateProvinces, Province, ProvinceResult } from './provinceGenerator';
import { generateReligions, Religion, ReligionResult } from './religionGenerator';
import { generateRoutes, Route, RouteResult } from './routeGenerator';
import { generateMilitary, MilitaryUnit, MilitaryResult } from './militaryGenerator';
import { generateMarkers, Marker } from './markerGenerator';
import { generatePopulation, PopulationResult } from './populationGenerator';
import { generateIce, IceResult } from './iceGenerator';
import { generateWind, WindResult } from './windGenerator';
import { TERRAIN_RESOURCES, MAP_RADIUS } from '../constants/game';

// ===== Pipeline çıktısı =====
export interface GeneratedMap {
  tiles: Map<string, HexTile>;
  rivers: RiverSegment[];
  features: FeatureResult;
  oceanLayers: OceanResult;
  burgs: Burg[];
  cultures: Culture[];
  states: State[];
  provinces: Province[];
  religions: Religion[];
  routes: Route[];
  military: MilitaryUnit[];
  markers: Marker[];
  population: PopulationResult;
  ice: IceResult;
  wind: WindResult;
  seed: number;
  stats: MapStats;
}

export interface MapStats {
  totalTiles: number;
  landTiles: number;
  waterTiles: number;
  riverCount: number;
  continents: number;
  islands: number;
  lakes: number;
}

// ===== Heightmap şekillendirme template'leri =====
interface HeightmapTemplate {
  name: string;
  apply: (q: number, r: number, radius: number, rng: Alea) => number;
}

// Kıta şekli: merkeze yakın yüksek, kenarlarda okyanus
function continentShape(q: number, r: number, radius: number): number {
  const dist = Math.sqrt(q * q + r * r + q * r) / radius;
  // Smooth falloff: merkez yüksek, kenarlar okyanus
  return Math.max(0, 1 - dist * 1.3);
}

// Ada takımadası: birden fazla merkez
function archipelagoShape(q: number, r: number, radius: number, rng: Alea): number {
  const centers = [
    { cq: radius * 0.3, cr: 0 },
    { cq: -radius * 0.2, cr: radius * 0.3 },
    { cq: 0, cr: -radius * 0.25 },
    { cq: -radius * 0.3, cr: -radius * 0.1 },
  ];

  let maxInfluence = 0;
  for (const c of centers) {
    const dx = q - c.cq;
    const dy = r - c.cr;
    const dist = Math.sqrt(dx * dx + dy * dy) / (radius * 0.4);
    const influence = Math.max(0, 1 - dist);
    maxInfluence = Math.max(maxInfluence, influence);
  }
  return maxInfluence;
}

// ===== ANA PIPELINE =====
export function generateMap(
  seed: number = Date.now(),
  radius: number = MAP_RADIUS,
): GeneratedMap {
  const rng = new Alea(seed);
  const nameGen = new NameGenerator(seed);

  // Template seçimi (seed'e göre)
  const useArchipelago = rng.next() > 0.6;

  // --- Aşama 1: Heightmap üretimi ---
  const elevationMap = generateHeightmap(seed, radius, rng, useArchipelago);

  // --- Aşama 2: Sıcaklık haritası ---
  const temperatureMap = generateTemperature(elevationMap, radius, seed);

  // --- Aşama 3: Nem haritası ---
  const moistureMap = generateMoisture(elevationMap, radius, seed);

  // --- Aşama 4: Feature detection (kıta/ada/okyanus) ---
  const featureResult = detectFeatures(elevationMap, radius);

  // --- Aşama 5: Nehir üretimi ---
  const riverResult = generateRivers(elevationMap, moistureMap, radius);

  // Nehir isimlerini ata
  for (const river of riverResult.rivers) {
    river.name = nameGen.riverName();
  }

  // Nehirler çevresindeki hücrelerin nemini artır
  boostMoistureNearRivers(moistureMap, riverResult, radius);

  // --- Aşama 6: Biome sınıflandırma + Tile oluşturma ---
  const tiles = new Map<string, HexTile>();

  for (const [key, elevation] of elevationMap) {
    const [q, r] = key.split(',').map(Number);
    const temperature = temperatureMap.get(key) || 0.5;
    const moisture = moistureMap.get(key) || 0.3;

    // Biome belirle
    let biome: BiomeResult = classifyBiome(elevation, moisture, temperature);

    // Göl override
    if (riverResult.lakeCells.has(key) && elevation >= SEA_LEVEL) {
      biome = { terrain: HexTerrain.Lake, name: 'Gol' };
    }

    // Kaynak hesapla
    const baseRes = TERRAIN_RESOURCES[biome.terrain] || {};

    // Nehir bonusu
    const hasRiver = riverResult.riverCells.has(key);
    const riverFlow = riverResult.fluxMap.get(key) || 0;

    // Kıyı tespiti
    const isCoast = featureResult.coastCells.has(key);

    // Region name
    const regionName = generateRegionName(biome.terrain, nameGen);

    const tile: HexTile = {
      coord: { q, r },
      terrain: biome.terrain,
      elevation,
      moisture,
      temperature,
      hasRiver,
      riverFlow,
      featureId: featureResult.featureMap.get(key) ?? -1,
      isCoast,
      visible: false,
      explored: false,
      ownerId: null,
      building: null,
      army: null,
      resources: {
        gold: (baseRes.gold || 0) + (hasRiver ? 1 : 0),
        iron: baseRes.iron || 0,
        food: (baseRes.food || 0) + (hasRiver ? 1 : 0),
        wood: baseRes.wood || 0,
        stone: baseRes.stone || 0,
      },
      biomeName: biome.name,
      regionName,
    };

    tiles.set(key, tile);
  }

  // Terrain map (biome sonuçlarından)
  const terrainMap = new Map<string, HexTerrain>();
  for (const [key, tile] of tiles) {
    terrainMap.set(key, tile.terrain);
  }

  // --- Aşama 7: Ocean layers ---
  const oceanLayers = generateOceanLayers(elevationMap, radius);

  // --- Aşama 8: Wind simulation ---
  const windResult = generateWind(elevationMap, terrainMap, radius, rng);

  // --- Aşama 9: Ice generation ---
  const iceResult = generateIce(elevationMap, temperatureMap, radius);

  // --- Aşama 10: Burg (şehir) yerleşimi ---
  const burgResult = generateBurgs(
    elevationMap, moistureMap, temperatureMap, terrainMap,
    riverResult.riverCells, featureResult.coastCells, radius, rng,
  );

  // Burg isimlerini ata
  for (const burg of burgResult.burgs) {
    burg.name = nameGen.cityName();
  }

  // --- Aşama 11: Cultures ---
  const cultureResult = generateCultures(
    elevationMap, terrainMap, riverResult.riverCells,
    featureResult.coastCells, burgResult.burgs, radius, rng,
  );
  for (const culture of cultureResult.cultures) {
    culture.name = nameGen.regionName();
  }

  // --- Aşama 12: States ---
  const stateResult = generateStates(
    elevationMap, terrainMap, burgResult.burgs,
    cultureResult.cultureMap, radius, rng,
  );
  for (const state of stateResult.states) {
    state.name = nameGen.regionName();
  }

  // --- Aşama 13: Provinces ---
  const provinceResult = generateProvinces(
    stateResult.states, stateResult.stateMap,
    burgResult.burgs, radius, rng,
  );
  for (const province of provinceResult.provinces) {
    province.name = nameGen.regionName();
  }

  // --- Aşama 14: Religions ---
  const religionResult = generateReligions(
    elevationMap, terrainMap, cultureResult.cultureMap,
    cultureResult.cultures, burgResult.burgs, radius, rng,
  );
  for (const religion of religionResult.religions) {
    religion.name = nameGen.regionName();
  }

  // --- Aşama 15: Routes ---
  const routeResult = generateRoutes(
    elevationMap, terrainMap, riverResult.riverCells,
    burgResult.burgs, radius,
  );

  // --- Aşama 16: Military ---
  const militaryResult = generateMilitary(
    stateResult.states, stateResult.stateMap,
    burgResult.burgs, terrainMap, featureResult.coastCells, radius, rng,
  );

  // --- Aşama 17: Markers ---
  const markers = generateMarkers(
    elevationMap, terrainMap, riverResult.riverCells,
    featureResult.coastCells, burgResult.burgMap, radius, rng,
  );

  // --- Aşama 18: Population ---
  const populationResult = generatePopulation(
    elevationMap, terrainMap, moistureMap, temperatureMap,
    riverResult.riverCells, featureResult.coastCells,
    burgResult.burgMap, rng,
  );

  // Stats
  let landTiles = 0;
  let waterTiles = 0;
  for (const tile of tiles.values()) {
    if (tile.terrain === HexTerrain.Ocean || tile.terrain === HexTerrain.Coast || tile.terrain === HexTerrain.Lake) {
      waterTiles++;
    } else {
      landTiles++;
    }
  }

  const stats: MapStats = {
    totalTiles: tiles.size,
    landTiles,
    waterTiles,
    riverCount: riverResult.rivers.length,
    continents: featureResult.features.filter(f => f.type === FeatureType.Continent).length,
    islands: featureResult.features.filter(f => f.type === FeatureType.Island).length,
    lakes: featureResult.features.filter(f => f.type === FeatureType.Lake).length + riverResult.lakeCells.size,
  };

  return {
    tiles,
    rivers: riverResult.rivers,
    features: featureResult,
    oceanLayers,
    burgs: burgResult.burgs,
    cultures: cultureResult.cultures,
    states: stateResult.states,
    provinces: provinceResult.provinces,
    religions: religionResult.religions,
    routes: routeResult.routes,
    military: militaryResult.units,
    markers,
    population: populationResult,
    ice: iceResult,
    wind: windResult,
    seed,
    stats,
  };
}

// ===== Heightmap üretimi =====
function generateHeightmap(
  seed: number,
  radius: number,
  rng: Alea,
  useArchipelago: boolean,
): Map<string, number> {
  const elevMap = new Map<string, number>();
  const noise1 = createNoise2D(seed);
  const noise2 = createNoise2D(seed + 1337);
  const noise3 = createNoise2D(seed + 7919);

  // Template primitifler (Azgaar tarzı: hills, ranges, troughs)
  const hillCount = rng.nextInt(3, 7);
  const hills: { q: number; r: number; strength: number; size: number }[] = [];
  for (let i = 0; i < hillCount; i++) {
    hills.push({
      q: rng.nextFloat(-radius * 0.6, radius * 0.6),
      r: rng.nextFloat(-radius * 0.6, radius * 0.6),
      strength: rng.nextFloat(0.15, 0.4),
      size: rng.nextFloat(radius * 0.15, radius * 0.4),
    });
  }

  // Dağ sıraları
  const rangeCount = rng.nextInt(1, 3);
  const ranges: { q1: number; r1: number; q2: number; r2: number; width: number; height: number }[] = [];
  for (let i = 0; i < rangeCount; i++) {
    const angle = rng.nextFloat(0, Math.PI);
    const len = radius * rng.nextFloat(0.4, 0.8);
    ranges.push({
      q1: Math.cos(angle) * len * 0.5,
      r1: Math.sin(angle) * len * 0.5,
      q2: -Math.cos(angle) * len * 0.5,
      r2: -Math.sin(angle) * len * 0.5,
      width: rng.nextFloat(radius * 0.05, radius * 0.12),
      height: rng.nextFloat(0.3, 0.5),
    });
  }

  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (!isInMapBounds(q, r, radius)) continue;
      const key = hexKey(q, r);

      // 1. Base noise (multi-octave)
      let e = noise1(q * 0.06, r * 0.06) * 0.4
            + noise2(q * 0.12, r * 0.12) * 0.25
            + noise3(q * 0.24, r * 0.24) * 0.1;

      // 2. Continent/archipelago shape
      if (useArchipelago) {
        e += archipelagoShape(q, r, radius, rng) * 0.35;
      } else {
        e += continentShape(q, r, radius) * 0.35;
      }

      // 3. Hill primitifler
      for (const hill of hills) {
        const dx = q - hill.q;
        const dy = r - hill.r;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < hill.size) {
          const influence = (1 - dist / hill.size) ** 2;
          e += influence * hill.strength;
        }
      }

      // 4. Dağ sıraları
      for (const range of ranges) {
        const dist = pointToSegmentDist(q, r, range.q1, range.r1, range.q2, range.r2);
        if (dist < range.width) {
          const influence = (1 - dist / range.width) ** 2;
          e += influence * range.height;
        }
      }

      // Normalize: [-∞,+∞] → [0,1]
      const normalized = (e + 0.5) / 1.5; // roughly center
      const clamped = Math.max(0, Math.min(1, normalized));

      elevMap.set(key, clamped);
    }
  }

  return elevMap;
}

// ===== Sıcaklık haritası =====
function generateTemperature(
  elevationMap: Map<string, number>,
  radius: number,
  seed: number,
): Map<string, number> {
  const tempMap = new Map<string, number>();
  const tempNoise = createNoise2D(seed + 3000);

  for (const [key, elev] of elevationMap) {
    const [q, r] = key.split(',').map(Number);
    let temp = baseTemperature(q, r, radius);
    temp = applyLapseRate(temp, elev);
    // Noise ile doğal varyasyon
    temp += tempNoise(q * 0.05, r * 0.05) * 0.1;
    tempMap.set(key, Math.max(0, Math.min(1, temp)));
  }

  return tempMap;
}

// ===== Nem haritası =====
function generateMoisture(
  elevationMap: Map<string, number>,
  radius: number,
  seed: number,
): Map<string, number> {
  const moistMap = new Map<string, number>();
  const moistNoise1 = createNoise2D(seed + 5000);
  const moistNoise2 = createNoise2D(seed + 6000);

  for (const [key, elev] of elevationMap) {
    const [q, r] = key.split(',').map(Number);

    // Base moisture from noise
    let m = moistNoise1(q * 0.08, r * 0.08) * 0.5
          + moistNoise2(q * 0.16, r * 0.16) * 0.25
          + 0.35; // base offset

    // Denize yakınlık → nem artışı
    if (elev < SEA_LEVEL) {
      m = 0.8; // su hücreleri yüksek nem
    } else {
      // Yükseklik → rain shadow etkisi
      const landElev = (elev - SEA_LEVEL) / (1 - SEA_LEVEL);
      if (landElev > 0.5) {
        m -= (landElev - 0.5) * 0.3; // dağların arkası kurak
      }
    }

    moistMap.set(key, Math.max(0, Math.min(1, m)));
  }

  return moistMap;
}

// Nehir çevresindeki nemi artır
function boostMoistureNearRivers(
  moistureMap: Map<string, number>,
  riverResult: RiverResult,
  radius: number,
): void {
  for (const key of riverResult.riverCells) {
    const [q, r] = key.split(',').map(Number);
    // Nehir hücresinin kendisi
    const current = moistureMap.get(key) || 0;
    moistureMap.set(key, Math.min(1, current + 0.15));

    // Komşuları da biraz nemlenir
    const neighbors = [
      hexKey(q + 1, r), hexKey(q - 1, r), hexKey(q, r + 1),
      hexKey(q, r - 1), hexKey(q + 1, r - 1), hexKey(q - 1, r + 1),
    ];
    for (const nKey of neighbors) {
      const nMoist = moistureMap.get(nKey);
      if (nMoist !== undefined) {
        moistureMap.set(nKey, Math.min(1, nMoist + 0.05));
      }
    }
  }
}

// Biome'a göre bölge ismi üret
function generateRegionName(terrain: HexTerrain, nameGen: NameGenerator): string {
  switch (terrain) {
    case HexTerrain.Mountain:
    case HexTerrain.Snow:
      return nameGen.mountainName();
    case HexTerrain.Forest:
      return nameGen.forestName();
    case HexTerrain.Ocean:
    case HexTerrain.Coast:
    case HexTerrain.Lake:
      return '';
    default:
      return nameGen.regionName();
  }
}

// Nokta-doğru parçası mesafesi (dağ sıraları için)
function pointToSegmentDist(
  px: number, py: number,
  x1: number, y1: number, x2: number, y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}

// ===== Oyuncu başlangıç noktaları =====
// Kara hex'ler arasından, eşit dağılmış, ova tercihli
export function findStartPositions(
  map: Map<string, HexTile>,
  count: number,
  radius: number = MAP_RADIUS,
): { q: number; r: number }[] {
  const positions: { q: number; r: number }[] = [];
  const angleStep = (2 * Math.PI) / count;
  const spawnRadius = Math.floor(radius * 0.5);

  // Kara hex'lerini topla
  const landTiles: HexTile[] = [];
  for (const tile of map.values()) {
    if (tile.terrain !== HexTerrain.Ocean &&
        tile.terrain !== HexTerrain.Coast &&
        tile.terrain !== HexTerrain.Lake &&
        tile.terrain !== HexTerrain.Mountain &&
        tile.terrain !== HexTerrain.Snow) {
      landTiles.push(tile);
    }
  }

  for (let i = 0; i < count; i++) {
    const angle = angleStep * i;
    const targetQ = Math.round(spawnRadius * Math.cos(angle));
    const targetR = Math.round(spawnRadius * Math.sin(angle));

    // En yakın uygun kara hex'i bul
    let bestTile: HexTile | null = null;
    let bestDist = Infinity;

    for (const tile of landTiles) {
      const dq = tile.coord.q - targetQ;
      const dr = tile.coord.r - targetR;
      const dist = Math.sqrt(dq * dq + dr * dr);
      // Ova tercih et (mesafeye bonus)
      const bonus = tile.terrain === HexTerrain.Plains ? 0 : 2;
      if (dist + bonus < bestDist) {
        bestDist = dist + bonus;
        bestTile = tile;
      }
    }

    if (bestTile) {
      positions.push({ q: bestTile.coord.q, r: bestTile.coord.r });
    } else {
      positions.push({ q: targetQ, r: targetR });
    }
  }

  return positions;
}
