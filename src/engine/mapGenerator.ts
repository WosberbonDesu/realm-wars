import { HexTile, HexTerrain, hexKey, Resources } from '../types/game';
import { createNoise2D } from './noise';
import { isInMapBounds } from './hexUtils';
import { TERRAIN_RESOURCES, MAP_RADIUS } from '../constants/game';

export function generateMap(seed: number = Date.now(), radius: number = MAP_RADIUS): Map<string, HexTile> {
  const map = new Map<string, HexTile>();
  const elevation = createNoise2D(seed);
  const moisture = createNoise2D(seed + 1000);
  const detail = createNoise2D(seed + 5000);

  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (!isInMapBounds(q, r, radius)) continue;

      // Çoklu octave noise → doğal görünüm
      const e = elevation(q * 0.08, r * 0.08) * 0.6
              + elevation(q * 0.15, r * 0.15) * 0.3
              + detail(q * 0.3, r * 0.3) * 0.1;

      const m = moisture(q * 0.1, r * 0.1) * 0.7
              + moisture(q * 0.2, r * 0.2) * 0.3;

      const terrain = decideTerrain(e, m);
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

      map.set(hexKey(q, r), tile);
    }
  }

  return map;
}

function decideTerrain(elevation: number, moisture: number): HexTerrain {
  // Yükseklik bazlı
  if (elevation > 0.45) return HexTerrain.Mountain;
  if (elevation < -0.35) {
    return moisture > 0 ? HexTerrain.Swamp : HexTerrain.River;
  }

  // Nem bazlı
  if (moisture > 0.3) return HexTerrain.Forest;
  if (moisture < -0.3) return HexTerrain.Desert;

  return HexTerrain.Plains;
}

// Bot'lar için başlangıç noktası bul (oyuncudan uzak, ova tercihli)
export function findStartPositions(
  map: Map<string, HexTile>,
  count: number,
  radius: number = MAP_RADIUS
): { q: number; r: number }[] {
  const positions: { q: number; r: number }[] = [];
  // Haritanın kenarlarına yakın, eşit dağılmış noktalar
  const angleStep = (2 * Math.PI) / count;
  const spawnRadius = Math.floor(radius * 0.6);

  for (let i = 0; i < count; i++) {
    const angle = angleStep * i;
    let bestQ = Math.round(spawnRadius * Math.cos(angle));
    let bestR = Math.round(spawnRadius * Math.sin(angle));

    // En yakın ova hex'i bul
    const searchRange = 3;
    let found = false;
    for (let dq = -searchRange; dq <= searchRange && !found; dq++) {
      for (let dr = -searchRange; dr <= searchRange && !found; dr++) {
        const key = hexKey(bestQ + dq, bestR + dr);
        const tile = map.get(key);
        if (tile && tile.terrain === HexTerrain.Plains) {
          bestQ += dq;
          bestR += dr;
          found = true;
        }
      }
    }

    positions.push({ q: bestQ, r: bestR });
  }

  return positions;
}
