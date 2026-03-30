/**
 * Azgaar-inspired world generator.
 *
 * Teknikler:
 * 1. Jittered grid + Lloyd relaxation → düzgün Voronoi hücreleri
 * 2. Heightmap templates → farklı kıta şekilleri
 * 3. Whittaker biome modeli → sıcaklık × nem → biyom
 * 4. Nehir confluences → birleşen nehirler, genişleyen akış
 * 5. Kıyı çizgisi = su/kara hücre sınırı (otomatik organik)
 * 6. Devlet sınırları = Voronoi kenar izleme
 */

import { Region, RegionTerrain, WorldMap, RiverSegment, MapPoint } from '../types/region';
import { REGION_TERRAIN_PROPS } from '../types/region';
import {
  jitteredGrid, lloydRelaxation, computeVoronoi,
  smoothPolygon, pointDistance, polygonArea,
} from './voronoi';
import { createNoise2D } from './noise';

// ═══ HARITA ŞABLONLARI ═══

export type MapTemplate = 'continents' | 'archipelago' | 'pangaea' | 'isthmus' | 'mediterranean';

interface TemplateConfig {
  name: string;
  icon: string;
  description: string;
  seaLevel: number;      // 0-1 arası (düşük = daha fazla kara)
  edgeFalloff: number;   // kenar düşüş gücü (yüksek = daha yuvarlak kıta)
  noiseScale: number;    // noise detay seviyesi
  noiseWeight: number;   // noise etkisi
  centerBoost: number;   // merkez yükseklik artışı
}

const TEMPLATES: Record<MapTemplate, TemplateConfig> = {
  continents: {
    name: 'Kitalar', icon: '🌍',
    description: 'Birden fazla kita, denizlerle ayrilmis',
    seaLevel: 0.38, edgeFalloff: 0.65, noiseScale: 0.003,
    noiseWeight: 0.7, centerBoost: 0.25,
  },
  archipelago: {
    name: 'Takimadalar', icon: '🏝️',
    description: 'Kucuk adalar zinciri',
    seaLevel: 0.50, edgeFalloff: 0.3, noiseScale: 0.005,
    noiseWeight: 0.9, centerBoost: 0.1,
  },
  pangaea: {
    name: 'Pangaea', icon: '🗺️',
    description: 'Tek buyuk kita',
    seaLevel: 0.30, edgeFalloff: 0.85, noiseScale: 0.002,
    noiseWeight: 0.5, centerBoost: 0.45,
  },
  isthmus: {
    name: 'Kistaklar', icon: '🌉',
    description: 'Dar kara kopruleriyle bagli kitalar',
    seaLevel: 0.42, edgeFalloff: 0.5, noiseScale: 0.004,
    noiseWeight: 0.8, centerBoost: 0.2,
  },
  mediterranean: {
    name: 'Ic Deniz', icon: '🏛️',
    description: 'Merkezi denizle cevrili kara parcalari',
    seaLevel: 0.35, edgeFalloff: 0.4, noiseScale: 0.003,
    noiseWeight: 0.6, centerBoost: 0.15,
  },
};

export { TEMPLATES as MAP_TEMPLATES };

// ═══ ANA ÜRETICI ═══

const MAP_W = 1600;
const MAP_H = 1200;
const CELL_SPACING = 36;

export function generateWorld(
  seed: number = Date.now(),
  template: MapTemplate = 'continents',
): WorldMap {
  const config = TEMPLATES[template];
  const rng = seedRng(seed);

  // ── 1. Jittered grid + Lloyd relaxation ──
  const rawPoints = jitteredGrid(MAP_W, MAP_H, CELL_SPACING, seed, 0.45);
  const relaxedPoints = lloydRelaxation(rawPoints, MAP_W, MAP_H, 2);
  const cells = computeVoronoi(relaxedPoints, MAP_W, MAP_H);

  // ── 2. Noise katmanları ──
  const elevNoise = createNoise2D(seed);
  const moistNoise = createNoise2D(seed + 1000);
  const tempNoise = createNoise2D(seed + 2000);
  const detailNoise = createNoise2D(seed + 5000);
  const contNoise = createNoise2D(seed + 7777);

  // ── 3. Elevation hesapla (template-aware) ──
  const elevations: number[] = [];
  for (let i = 0; i < cells.length; i++) {
    const { x, y } = cells[i].center;

    // Kenardan uzaklık
    const edX = Math.min(x, MAP_W - x) / (MAP_W * 0.5);
    const edY = Math.min(y, MAP_H - y) / (MAP_H * 0.5);
    const edgeDist = Math.min(edX, edY);
    const falloff = Math.pow(Math.max(0, edgeDist), config.edgeFalloff);

    // Multi-octave noise
    const s = config.noiseScale;
    let e = elevNoise(x * s, y * s) * 0.4
          + elevNoise(x * s * 2, y * s * 2) * 0.25
          + detailNoise(x * s * 4, y * s * 4) * 0.15
          + contNoise(x * s * 0.5, y * s * 0.5) * 0.2;

    // Mediterranean: merkez çukur
    if (template === 'mediterranean') {
      const cx = (x / MAP_W - 0.5) * 2;
      const cy = (y / MAP_H - 0.5) * 2;
      const centerDist = Math.sqrt(cx * cx + cy * cy);
      if (centerDist < 0.4) e -= (0.4 - centerDist) * 1.5;
    }

    // Template etkisi
    const elevation = (e * config.noiseWeight + falloff * config.centerBoost) * falloff;
    elevations.push(Math.max(0, Math.min(1, elevation * 0.8 + 0.35)));
  }

  // ── 4. Bölgeleri oluştur ──
  const regions = new Map<string, Region>();
  const regionList: Region[] = [];

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    if (cell.vertices.length < 3) continue;

    const id = `r-${i}`;
    const { x, y } = cell.center;
    const elev = elevations[i];
    const isLand = elev > config.seaLevel;

    // Whittaker biome modeli
    // Sıcaklık: enlem + yükseklik etkisi
    const latTemp = 1 - Math.abs(y / MAP_H - 0.5) * 1.6; // ekvator=sıcak
    const elevCool = isLand ? Math.max(0, (elev - config.seaLevel) / (1 - config.seaLevel)) * 0.5 : 0;
    const temperature = Math.max(0, Math.min(1,
      latTemp - elevCool + tempNoise(x * 0.003, y * 0.003) * 0.15
    ));

    // Nem: noise + denize yakınlık etkisi
    const moisture = Math.max(0, Math.min(1,
      moistNoise(x * 0.004, y * 0.004) * 0.4
      + moistNoise(x * 0.008, y * 0.008) * 0.25
      + 0.4
    ));

    const terrain = whittakerBiome(elev, temperature, moisture, isLand, config.seaLevel);
    const props = REGION_TERRAIN_PROPS[terrain];

    // Bezier smoothing
    const { smoothed, controls } = smoothPolygon(cell.vertices, 0.22);

    const region: Region = {
      id,
      center: cell.center,
      vertices: cell.vertices,
      smoothVertices: smoothed,
      controlPoints: controls,
      neighborIds: cell.neighborIndices.map(ni => `r-${ni}`),
      terrain,
      ownerId: null,
      building: null,
      army: null,
      resources: {
        gold: props.resourceYield.gold ?? 0,
        iron: props.resourceYield.iron ?? 0,
        food: props.resourceYield.food ?? 0,
        wood: props.resourceYield.wood ?? 0,
        stone: props.resourceYield.stone ?? 0,
      },
      visible: false,
      explored: false,
      elevation: elev,
      moisture,
      isLand,
      isCoast: false,
      hasRiver: false,
      area: polygonArea(cell.vertices),
    };

    regions.set(id, region);
    regionList.push(region);
  }

  // ── 5. Kıyı tespiti ──
  for (const region of regionList) {
    if (!region.isLand) continue;
    region.isCoast = region.neighborIds.some(nid => {
      const n = regions.get(nid);
      return n && !n.isLand;
    });
    if (region.isCoast && region.terrain === RegionTerrain.Plains) {
      region.terrain = RegionTerrain.Beach;
    }
  }

  // ── 6. Nehir sistemi (confluence modeli) ──
  const rivers = generateRiverSystem(regionList, regions, seed);

  // ── 7. Denize yakın bölgelere nem bonusu ──
  for (const region of regionList) {
    if (!region.isLand) continue;
    const nearSea = region.neighborIds.some(nid => {
      const n = regions.get(nid);
      return n && !n.isLand;
    });
    if (nearSea && region.moisture < 0.5) {
      region.moisture = Math.min(1, region.moisture + 0.15);
    }
  }

  // ── 8. Doğrulama ──
  const landCount = regionList.filter(r => r.isLand).length;
  if (landCount < regionList.length * 0.12 || landCount > regionList.length * 0.92) {
    return generateWorld(seed + 7, template);
  }

  return { regions, width: MAP_W, height: MAP_H, rivers, seed };
}

// ═══ WHITTAKER BIOME MODELİ ═══
// Sıcaklık × Nem → Biyom (Azgaar tarzı)

function whittakerBiome(
  elev: number, temp: number, moist: number, isLand: boolean, seaLevel: number,
): RegionTerrain {
  if (!isLand) {
    if (elev < seaLevel - 0.15) return RegionTerrain.DeepSea;
    if (elev < seaLevel - 0.05) return RegionTerrain.Sea;
    return RegionTerrain.Coast;
  }

  // Normalize elevation (kara için 0-1)
  const landElev = (elev - seaLevel) / (1 - seaLevel);

  // Yüksek dağlar
  if (landElev > 0.85) return RegionTerrain.SnowPeak;
  if (landElev > 0.65) return RegionTerrain.Mountain;
  if (landElev > 0.50) return RegionTerrain.Hills;

  // Whittaker grid: temp × moist
  // Soğuk bölgeler
  if (temp < 0.2) {
    return moist > 0.5 ? RegionTerrain.DenseForest : RegionTerrain.Tundra;
  }

  // Ilıman bölgeler
  if (temp < 0.5) {
    if (moist > 0.65) return RegionTerrain.DenseForest;
    if (moist > 0.45) return RegionTerrain.Forest;
    if (moist > 0.30) return RegionTerrain.Grassland;
    return RegionTerrain.Plains;
  }

  // Sıcak bölgeler
  if (temp < 0.75) {
    if (moist > 0.70) return RegionTerrain.Fertile;
    if (moist > 0.50) return RegionTerrain.Forest;
    if (moist > 0.35) return RegionTerrain.Savanna;
    if (moist > 0.20) return RegionTerrain.Plains;
    return RegionTerrain.Desert;
  }

  // Çok sıcak
  if (moist > 0.60) return RegionTerrain.Fertile;
  if (moist > 0.40) return RegionTerrain.Savanna;
  if (moist > 0.20) return RegionTerrain.Desert;
  return RegionTerrain.Desert;
}

// ═══ NEHİR SİSTEMİ (Confluence Model) ═══

function generateRiverSystem(
  regionList: Region[],
  regions: Map<string, Region>,
  seed: number,
): RiverSegment[] {
  const rivers: RiverSegment[] = [];
  const rng = seedRng(seed + 9999);

  // Drainage map: her bölge hangi bölgeye akar
  const drainage = new Map<string, string>(); // regionId → downhill neighbor regionId
  const flowAccum = new Map<string, number>(); // regionId → toplam akış (yağmur toplama)

  // Her kara bölgesi için en düşük komşuya akış yönü hesapla
  for (const region of regionList) {
    if (!region.isLand) continue;
    flowAccum.set(region.id, 1); // Her bölge 1 birim yağmur toplar

    let lowestNeighbor: Region | null = null;
    let lowestElev = region.elevation;
    for (const nid of region.neighborIds) {
      const n = regions.get(nid);
      if (!n) continue;
      if (n.elevation < lowestElev) {
        lowestElev = n.elevation;
        lowestNeighbor = n;
      }
    }
    if (lowestNeighbor) drainage.set(region.id, lowestNeighbor.id);
  }

  // Akış biriktirme: yüksekten alçağa sıralayıp akışı aktar
  const sorted = regionList.filter(r => r.isLand).sort((a, b) => b.elevation - a.elevation);
  for (const region of sorted) {
    const downId = drainage.get(region.id);
    if (!downId) continue;
    const currentFlow = flowAccum.get(region.id) ?? 1;
    const downFlow = flowAccum.get(downId) ?? 0;
    flowAccum.set(downId, downFlow + currentFlow);
  }

  // Nehir eşiği: flowAccum > threshold olan bölgeler nehir taşır
  const RIVER_THRESHOLD = 5;
  const riverRegions = new Set<string>();
  for (const [rid, flow] of flowAccum) {
    if (flow >= RIVER_THRESHOLD) {
      const r = regions.get(rid);
      if (r) {
        r.hasRiver = true;
        riverRegions.add(rid);
      }
    }
  }

  // Nehir segmentleri oluştur: nehir bölgelerden akış yönünde path izle
  const visitedRivers = new Set<string>();
  const mountainRegions = regionList.filter(r =>
    r.terrain === RegionTerrain.Mountain || r.terrain === RegionTerrain.Hills
  );

  // En yüksek akışlı dağ bölgelerinden başla
  const riverStarts = mountainRegions
    .filter(r => (flowAccum.get(r.id) ?? 0) >= RIVER_THRESHOLD)
    .sort((a, b) => (flowAccum.get(b.id) ?? 0) - (flowAccum.get(a.id) ?? 0))
    .slice(0, Math.max(3, Math.floor(regionList.length * 0.008)));

  for (const start of riverStarts) {
    const points: MapPoint[] = [start.center];
    let current = start;
    let steps = 0;

    while (steps < 100) {
      steps++;
      const downId = drainage.get(current.id);
      if (!downId || visitedRivers.has(`${current.id}-${downId}`)) break;
      visitedRivers.add(`${current.id}-${downId}`);

      const next = regions.get(downId);
      if (!next) break;
      points.push(next.center);
      if (!next.isLand) break; // Denize ulaştık
      current = next;
    }

    if (points.length >= 3) {
      // Nehir genişliği = akış miktarına göre
      const flow = flowAccum.get(start.id) ?? RIVER_THRESHOLD;
      const width = Math.min(5, 1.5 + Math.log2(flow / RIVER_THRESHOLD) * 0.8);
      rivers.push({ points, width });
    }
  }

  return rivers;
}

// ═══ BAŞLANGIÇ NOKTALARI ═══

export function findRegionStartPositions(
  world: WorldMap,
  count: number,
): string[] {
  // İyi kara bölgeleri bul (büyük, düz, bina kurulabilir)
  const candidates = [...world.regions.values()].filter(r =>
    r.isLand
    && r.terrain !== RegionTerrain.Mountain
    && r.terrain !== RegionTerrain.SnowPeak
    && r.terrain !== RegionTerrain.Swamp
    && r.terrain !== RegionTerrain.Desert
    && r.area > 400
  ).sort((a, b) => b.area - a.area);

  if (candidates.length < count) return candidates.slice(0, count).map(r => r.id);

  // Birbirinden en uzak noktaları seç (greedy farthest-point)
  const positions: string[] = [candidates[0].id];
  const used = new Set([candidates[0].id]);

  for (let i = 1; i < count; i++) {
    let bestId = '';
    let bestMinDist = 0;
    for (const c of candidates) {
      if (used.has(c.id)) continue;
      let minDist = Infinity;
      for (const pid of positions) {
        const pr = world.regions.get(pid)!;
        const d = pointDistance(c.center, pr.center);
        if (d < minDist) minDist = d;
      }
      if (minDist > bestMinDist) {
        bestMinDist = minDist;
        bestId = c.id;
      }
    }
    if (bestId) { positions.push(bestId); used.add(bestId); }
  }

  return positions;
}

// ═══ HELPERS ═══

function seedRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return (s % 10000) / 10000;
  };
}
