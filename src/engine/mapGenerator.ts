import { HexTile, HexTerrain, hexKey, Resources } from '../types/game';
import { createNoise2D } from './noise';
import { isInMapBounds, getNeighbors, hexDistance } from './hexUtils';
import { TERRAIN_RESOURCES, MAP_RADIUS } from '../constants/game';

/**
 * Gerçekçi kıta harita üretici
 *
 * 1. Elevation noise + kenarlardan düşüş → ada/kıta şekli
 * 2. Deniz seviyesi kesimi → Sea / kara ayrımı
 * 3. Kara hex'lerden denize komşu olanlar → Coast / Shore
 * 4. Yüksek bölgeler → Mountain zincirleri
 * 5. Nem + sıcaklık → Forest, Desert, Swamp, Plains
 * 6. İç çukurlar → Lake
 * 7. Dağdan denize akış → River
 */

export function generateMap(seed: number = Date.now(), radius: number = MAP_RADIUS): Map<string, HexTile> {
  const map = new Map<string, HexTile>();

  // Noise katmanları
  const elevNoise = createNoise2D(seed);
  const moistNoise = createNoise2D(seed + 1000);
  const tempNoise = createNoise2D(seed + 2000);
  const detailNoise = createNoise2D(seed + 5000);
  const contNoise = createNoise2D(seed + 7000);

  // ── 1. ADIM: Elevation haritası oluştur ──
  const elevationMap = new Map<string, number>();
  const moistureMap = new Map<string, number>();
  const temperatureMap = new Map<string, number>();

  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (!isInMapBounds(q, r, radius)) continue;
      const key = hexKey(q, r);

      // Kenardan uzaklık (0=kenar, 1=merkez)
      const dist = hexDistance({ q: 0, r: 0 }, { q, r });
      const edgeDist = 1 - (dist / radius);
      // Kenar düşüşü — kıyılarda deniz oluşsun
      const falloff = Math.pow(Math.max(0, edgeDist), 0.8);

      // Çoklu octave elevation
      const e = elevNoise(q * 0.06, r * 0.06) * 0.5
             + elevNoise(q * 0.12, r * 0.12) * 0.3
             + detailNoise(q * 0.25, r * 0.25) * 0.15
             + contNoise(q * 0.03, r * 0.03) * 0.25;

      // Kıta şekli: noise * falloff
      const elevation = e * falloff + (falloff - 0.45) * 0.6;
      elevationMap.set(key, elevation);

      // Nem
      const m = moistNoise(q * 0.08, r * 0.08) * 0.6
             + moistNoise(q * 0.16, r * 0.16) * 0.3
             + detailNoise(q * 0.2 + 100, r * 0.2 + 100) * 0.1;
      moistureMap.set(key, m);

      // Sıcaklık (kuzeyde soğuk, güneyde sıcak)
      const latNorm = r / radius;
      const t = tempNoise(q * 0.05, r * 0.05) * 0.3 + latNorm * 0.5;
      temperatureMap.set(key, t);
    }
  }

  // ── 2. ADIM: Terrain ata ──
  const SEA_LEVEL = -0.05;
  const MOUNTAIN_LEVEL = 0.42;
  const HIGH_MOUNTAIN = 0.55;
  const LAKE_THRESHOLD = -0.18;

  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (!isInMapBounds(q, r, radius)) continue;
      const key = hexKey(q, r);
      const elev = elevationMap.get(key) ?? 0;
      const moist = moistureMap.get(key) ?? 0;
      const temp = temperatureMap.get(key) ?? 0;

      let terrain: HexTerrain;

      if (elev < SEA_LEVEL) {
        // Su: derin deniz mi, sığ kıyı mı?
        if (elev < SEA_LEVEL - 0.15) {
          terrain = HexTerrain.Sea;
        } else {
          // Sığ su — kıyıya yakınsa Coast, değilse hala Sea
          terrain = HexTerrain.Coast;
        }
      } else if (elev > MOUNTAIN_LEVEL) {
        terrain = HexTerrain.Mountain;
      } else if (elev > MOUNTAIN_LEVEL - 0.12) {
        // Dağ etekleri — tepeler
        terrain = HexTerrain.Hills;
      } else {
        // Kara arazisi — nem ve sıcaklığa göre
        if (moist > 0.4 && temp > 0.0) {
          terrain = HexTerrain.Fertile;
        } else if (moist > 0.25 && temp < 0.15) {
          terrain = HexTerrain.Forest;
        } else if (moist > 0.3) {
          terrain = HexTerrain.Forest;
        } else if (moist < -0.25 && temp > 0.1) {
          terrain = HexTerrain.Desert;
        } else if (moist > 0.1 && elev < 0.05) {
          terrain = HexTerrain.Swamp;
        } else {
          terrain = HexTerrain.Plains;
        }
      }

      const baseRes = TERRAIN_RESOURCES[terrain] || {};
      const tile: HexTile = {
        coord: { q, r },
        terrain,
        visible: false,
        explored: false,
        ownerId: null,
        building: null,
        army: null,
        resources: {
          gold: baseRes.gold || 0,
          iron: baseRes.iron || 0,
          food: baseRes.food || 0,
          wood: baseRes.wood || 0,
          stone: baseRes.stone || 0,
        },
      };
      map.set(key, tile);
    }
  }

  // ── 3. ADIM: İç göller — karalar içindeki alçak çukurlar ──
  for (const [key, tile] of map) {
    if (tile.terrain !== HexTerrain.Swamp && tile.terrain !== HexTerrain.Plains) continue;
    const elev = elevationMap.get(key) ?? 0;
    if (elev < 0.03 && elev > SEA_LEVEL) {
      // Etrafında deniz yok, iç bölgede mi kontrol et
      const neighbors = getNeighbors(tile.coord);
      const hasSea = neighbors.some(n => {
        const nt = map.get(hexKey(n.q, n.r));
        return nt && (nt.terrain === HexTerrain.Sea || nt.terrain === HexTerrain.Coast);
      });
      if (!hasSea && (moistureMap.get(key) ?? 0) > 0.05) {
        tile.terrain = HexTerrain.Lake;
        tile.resources = { gold: 0, iron: 0, food: 2, wood: 0, stone: 0 };
      }
    }
  }

  // ── 4. ADIM: Shore — kara hex'lerin denize/göle komşu olanları ──
  const shoreKeys: string[] = [];
  for (const [key, tile] of map) {
    if (tile.terrain === HexTerrain.Sea || tile.terrain === HexTerrain.Coast ||
        tile.terrain === HexTerrain.Lake || tile.terrain === HexTerrain.Mountain) continue;

    const neighbors = getNeighbors(tile.coord);
    const hasWater = neighbors.some(n => {
      const nt = map.get(hexKey(n.q, n.r));
      return nt && (nt.terrain === HexTerrain.Sea || nt.terrain === HexTerrain.Coast || nt.terrain === HexTerrain.Lake);
    });
    if (hasWater) shoreKeys.push(key);
  }
  for (const key of shoreKeys) {
    const tile = map.get(key)!;
    tile.terrain = HexTerrain.Shore;
    tile.resources = { gold: 0, iron: 0, food: 2, wood: 1, stone: 0 };
  }

  // ── 5. ADIM: Nehirler — dağlardan denize doğru akan su yolları ──
  const mountains = [...map.values()].filter(t => t.terrain === HexTerrain.Mountain);
  const rng = seedRng(seed + 9999);
  const riverCount = Math.max(2, Math.floor(radius * 0.2));

  for (let ri = 0; ri < riverCount; ri++) {
    if (mountains.length === 0) break;
    const start = mountains[Math.floor(rng() * mountains.length)];
    let current = start.coord;
    const visited = new Set<string>();
    let steps = 0;

    while (steps < radius * 2) {
      steps++;
      const key = hexKey(current.q, current.r);
      if (visited.has(key)) break;
      visited.add(key);

      const tile = map.get(key);
      if (!tile) break;
      if (tile.terrain === HexTerrain.Sea || tile.terrain === HexTerrain.Coast || tile.terrain === HexTerrain.Lake) break;

      // Dağ olmayan karalarda nehir yap
      if (tile.terrain !== HexTerrain.Mountain) {
        tile.terrain = HexTerrain.River;
        tile.resources = { gold: 2, iron: 0, food: 2, wood: 0, stone: 0 };
      }

      // En düşük komşuya ak
      const neighbors = getNeighbors(current);
      let lowestElev = Infinity;
      let nextCoord = current;
      for (const n of neighbors) {
        const nKey = hexKey(n.q, n.r);
        if (visited.has(nKey)) continue;
        const nElev = elevationMap.get(nKey) ?? 999;
        if (nElev < lowestElev) {
          lowestElev = nElev;
          nextCoord = n;
        }
      }

      if (nextCoord.q === current.q && nextCoord.r === current.r) break;
      current = nextCoord;
    }
  }

  return map;
}

function seedRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return (s % 10000) / 10000;
  };
}

// Bot'lar için başlangıç noktası bul — karada, ovaya yakın, birbirinden uzak
export function findStartPositions(
  map: Map<string, HexTile>,
  count: number,
  radius: number = MAP_RADIUS
): { q: number; r: number }[] {
  const positions: { q: number; r: number }[] = [];
  const angleStep = (2 * Math.PI) / count;
  const spawnRadius = Math.floor(radius * 0.5);

  for (let i = 0; i < count; i++) {
    const angle = angleStep * i + 0.3; // Offset so they don't line up perfectly
    let bestQ = Math.round(spawnRadius * Math.cos(angle));
    let bestR = Math.round(spawnRadius * Math.sin(angle));

    // En yakın kara (Plains/Shore/Forest) hex'i bul
    const searchRange = 6;
    let found = false;
    let bestDist = Infinity;
    for (let dq = -searchRange; dq <= searchRange; dq++) {
      for (let dr = -searchRange; dr <= searchRange; dr++) {
        const key = hexKey(bestQ + dq, bestR + dr);
        const tile = map.get(key);
        if (tile && (tile.terrain === HexTerrain.Plains || tile.terrain === HexTerrain.Shore || tile.terrain === HexTerrain.Forest)) {
          const dist = Math.abs(dq) + Math.abs(dr);
          if (dist < bestDist) {
            bestDist = dist;
            bestQ = bestQ + dq;
            bestR = bestR + dr;
            found = true;
          }
        }
      }
    }

    positions.push({ q: bestQ, r: bestR });
  }

  return positions;
}
