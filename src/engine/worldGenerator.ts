/**
 * Voronoi bazlı dünya harita üretici.
 *
 * 1. Poisson disk sampling → rastgele ama eşit dağılmış noktalar
 * 2. Voronoi tessellation → organik bölgeler
 * 3. Noise-based elevation → kıta şekli (kenarlar deniz)
 * 4. Moisture + temperature → biyom ataması
 * 5. Nehir sistemi → dağdan denize akan su yolları
 * 6. Bezier smoothing → organik sınırlar
 */

import { Region, RegionTerrain, WorldMap, RiverSegment, MapPoint } from '../types/region';
import { Resources } from '../types/game';
import { REGION_TERRAIN_PROPS } from '../types/region';
import {
  poissonDiskSampling, computeVoronoi, smoothPolygon,
  pointDistance, polygonArea, VoronoiCell,
} from './voronoi';
import { createNoise2D } from './noise';

// Harita boyutları
const MAP_W = 1600;
const MAP_H = 1200;
const MIN_DIST = 38; // Bölgeler arası minimum mesafe (piksel)

export function generateWorld(seed: number = Date.now()): WorldMap {
  // ── 1. Poisson disk noktaları ──
  const points = poissonDiskSampling(MAP_W, MAP_H, MIN_DIST, seed);

  // ── 2. Voronoi hücreleri ──
  const cells = computeVoronoi(points, MAP_W, MAP_H);

  // ── 3. Noise katmanları ──
  const elevNoise = createNoise2D(seed);
  const moistNoise = createNoise2D(seed + 1000);
  const tempNoise = createNoise2D(seed + 2000);
  const detailNoise = createNoise2D(seed + 5000);

  // ── 4. Bölgeleri oluştur ──
  const regions = new Map<string, Region>();
  const regionList: Region[] = [];

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    if (cell.vertices.length < 3) continue;

    const { x, y } = cell.center;
    const id = `r-${i}`;

    // Kenardan uzaklık (0=kenar, 1=merkez)
    const edgeDistX = Math.min(x, MAP_W - x) / (MAP_W * 0.5);
    const edgeDistY = Math.min(y, MAP_H - y) / (MAP_H * 0.5);
    const edgeDist = Math.min(edgeDistX, edgeDistY);
    const falloff = Math.pow(Math.max(0, edgeDist), 0.7);

    // Çoklu octave elevation
    const scale = 0.003;
    const e = elevNoise(x * scale, y * scale) * 0.5
            + elevNoise(x * scale * 2, y * scale * 2) * 0.3
            + detailNoise(x * scale * 4, y * scale * 4) * 0.15
            + elevNoise(x * scale * 0.5, y * scale * 0.5) * 0.25;

    const elevation = Math.max(0, Math.min(1, (e * falloff + falloff * 0.3) * 0.8 + 0.1));

    // Nem
    const moisture = Math.max(0, Math.min(1,
      moistNoise(x * 0.004, y * 0.004) * 0.5
      + moistNoise(x * 0.008, y * 0.008) * 0.3 + 0.5
    ));

    // Sıcaklık (güneyde sıcak)
    const latNorm = y / MAP_H;
    const temperature = Math.max(0, Math.min(1,
      tempNoise(x * 0.003, y * 0.003) * 0.2 + latNorm * 0.6 + 0.2
    ));

    const isLand = elevation > 0.35;
    const terrain = assignTerrain(elevation, moisture, temperature, isLand);
    const props = REGION_TERRAIN_PROPS[terrain];

    // Bezier smoothing
    const { smoothed, controls } = smoothPolygon(cell.vertices, 0.25);

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
      elevation,
      moisture,
      isLand,
      isCoast: false,
      hasRiver: false,
      area: polygonArea(cell.vertices),
    };

    regions.set(id, region);
    regionList.push(region);
  }

  // ── 5. Kıyı bölgeleri tespit et ──
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

  // ── 6. Nehir sistemi ──
  const rivers = generateRivers(regionList, regions, seed);

  // ── 7. Harita doğrulama ──
  const landCount = regionList.filter(r => r.isLand).length;
  if (landCount < regionList.length * 0.15) {
    // Çok az kara → seed kaydır
    return generateWorld(seed + 7);
  }

  return { regions, width: MAP_W, height: MAP_H, rivers, seed };
}

// ═══ TERRAIN ATAMA ═══

function assignTerrain(
  elev: number, moisture: number, temp: number, isLand: boolean,
): RegionTerrain {
  if (!isLand) {
    if (elev < 0.2) return RegionTerrain.DeepSea;
    if (elev < 0.3) return RegionTerrain.Sea;
    return RegionTerrain.Coast;
  }

  // Dağlar
  if (elev > 0.80) return RegionTerrain.SnowPeak;
  if (elev > 0.68) return RegionTerrain.Mountain;
  if (elev > 0.58) return RegionTerrain.Hills;

  // Sıcaklık bazlı
  if (temp < 0.25) {
    return moisture > 0.5 ? RegionTerrain.DenseForest : RegionTerrain.Tundra;
  }

  if (temp > 0.75) {
    if (moisture < 0.3) return RegionTerrain.Desert;
    if (moisture < 0.5) return RegionTerrain.Savanna;
  }

  // Nem bazlı
  if (moisture > 0.7) return RegionTerrain.Fertile;
  if (moisture > 0.55) return RegionTerrain.DenseForest;
  if (moisture > 0.4) return RegionTerrain.Forest;
  if (moisture > 0.3) return RegionTerrain.Grassland;
  if (moisture < 0.2 && temp > 0.5) return RegionTerrain.Desert;

  // Bataklık (düşük elevation + yüksek nem)
  if (elev < 0.4 && moisture > 0.5) return RegionTerrain.Swamp;

  return RegionTerrain.Plains;
}

// ═══ NEHİR SİSTEMİ ═══

function generateRivers(
  regionList: Region[],
  regions: Map<string, Region>,
  seed: number,
): RiverSegment[] {
  const rivers: RiverSegment[] = [];
  const rng = seedRng(seed + 9999);

  // Dağ bölgelerinden başlayan nehirler
  const mountains = regionList.filter(r =>
    r.terrain === RegionTerrain.Mountain || r.terrain === RegionTerrain.Hills
  );
  if (mountains.length === 0) return rivers;

  const riverCount = Math.max(2, Math.floor(regionList.length * 0.01));

  for (let ri = 0; ri < riverCount; ri++) {
    const start = mountains[Math.floor(rng() * mountains.length)];
    const points: MapPoint[] = [start.center];
    const visited = new Set<string>();
    visited.add(start.id);
    let current = start;

    for (let step = 0; step < 50; step++) {
      // En düşük elevation'lı komşuya git
      let bestNeighbor: Region | null = null;
      let bestElev = Infinity;

      for (const nid of current.neighborIds) {
        if (visited.has(nid)) continue;
        const n = regions.get(nid);
        if (!n) continue;
        if (n.elevation < bestElev) {
          bestElev = n.elevation;
          bestNeighbor = n;
        }
      }

      if (!bestNeighbor) break;
      visited.add(bestNeighbor.id);
      bestNeighbor.hasRiver = true;
      points.push(bestNeighbor.center);
      current = bestNeighbor;

      // Denize ulaştık
      if (!current.isLand) break;
    }

    if (points.length >= 3) {
      rivers.push({ points, width: 2 + ri * 0.5 });
    }
  }

  return rivers;
}

// ═══ BAŞLANGIÇ NOKTALARI ═══

export function findRegionStartPositions(
  world: WorldMap,
  count: number,
): string[] {
  const landRegions = [...world.regions.values()].filter(r =>
    r.isLand && r.terrain !== RegionTerrain.Mountain && r.terrain !== RegionTerrain.SnowPeak
    && r.terrain !== RegionTerrain.Swamp && r.area > 500
  );

  if (landRegions.length < count) return landRegions.slice(0, count).map(r => r.id);

  // Birbirinden uzak noktalar seç
  const positions: string[] = [];
  const used = new Set<string>();

  // İlk noktayı merkeze yakın seç
  const centerX = world.width / 2;
  const centerY = world.height / 2;
  landRegions.sort((a, b) => {
    const da = pointDistance(a.center, { x: centerX, y: centerY });
    const db = pointDistance(b.center, { x: centerX, y: centerY });
    return da - db;
  });

  positions.push(landRegions[0].id);
  used.add(landRegions[0].id);

  // Sonraki noktaları mevcut noktalara en uzak olacak şekilde seç
  for (let i = 1; i < count; i++) {
    let bestId = '';
    let bestMinDist = 0;

    for (const r of landRegions) {
      if (used.has(r.id)) continue;
      let minDist = Infinity;
      for (const pid of positions) {
        const pr = world.regions.get(pid)!;
        const d = pointDistance(r.center, pr.center);
        if (d < minDist) minDist = d;
      }
      if (minDist > bestMinDist) {
        bestMinDist = minDist;
        bestId = r.id;
      }
    }

    if (bestId) {
      positions.push(bestId);
      used.add(bestId);
    }
  }

  return positions;
}

function seedRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return (s % 10000) / 10000;
  };
}
