// Feature detection - Azgaar tarzı kıta/ada/okyanus havzası tespiti
// BFS ile bağlı bölgeleri etiketler
import { HexCoord, hexKey } from '../types/game';
import { getNeighbors, isInMapBounds } from './hexUtils';
import { SEA_LEVEL } from './biomes';

export enum FeatureType {
  Ocean = 'ocean',
  Continent = 'continent',
  Island = 'island',
  Lake = 'lake',
}

export interface MapFeature {
  id: number;
  type: FeatureType;
  cells: string[];       // hex key'leri
  size: number;
  border: string[];      // kıyı hex'leri
}

export interface FeatureResult {
  features: MapFeature[];
  featureMap: Map<string, number>;  // key → feature ID
  coastCells: Set<string>;          // kıyı hex'leri
}

export function detectFeatures(
  elevationMap: Map<string, number>,
  radius: number,
): FeatureResult {
  const features: MapFeature[] = [];
  const featureMap = new Map<string, number>();
  const coastCells = new Set<string>();
  const visited = new Set<string>();
  let featureId = 0;

  // Tüm hex'leri tara, BFS ile bağlı bölgeleri grupla
  for (const [key, elev] of elevationMap) {
    if (visited.has(key)) continue;

    const isLand = elev >= SEA_LEVEL;
    const cells: string[] = [];
    const border: string[] = [];
    const queue: string[] = [key];
    visited.add(key);

    while (queue.length > 0) {
      const current = queue.shift()!;
      cells.push(current);
      featureMap.set(current, featureId);

      const [q, r] = current.split(',').map(Number);
      const neighbors = getNeighbors({ q, r });
      let isBorder = false;

      for (const n of neighbors) {
        if (!isInMapBounds(n.q, n.r, radius)) {
          if (isLand) isBorder = true;
          continue;
        }

        const nKey = hexKey(n.q, n.r);
        const nElev = elevationMap.get(nKey);
        if (nElev === undefined) continue;

        const nIsLand = nElev >= SEA_LEVEL;

        if (nIsLand !== isLand) {
          // Kara-su sınırı → kıyı
          isBorder = true;
          if (isLand) coastCells.add(current);
          else coastCells.add(nKey);
          continue;
        }

        if (!visited.has(nKey)) {
          visited.add(nKey);
          queue.push(nKey);
        }
      }

      if (isBorder) border.push(current);
    }

    // Feature türünü belirle
    let type: FeatureType;
    if (isLand) {
      type = cells.length > 20 ? FeatureType.Continent : FeatureType.Island;
    } else {
      type = cells.length > 20 ? FeatureType.Ocean : FeatureType.Lake;
    }

    features.push({ id: featureId, type, cells, size: cells.length, border });
    featureId++;
  }

  return { features, featureMap, coastCells };
}

// Kıyı mesafesi hesapla (her kara hex'i için denize uzaklık)
export function computeCoastDistance(
  elevationMap: Map<string, number>,
  coastCells: Set<string>,
  radius: number,
): Map<string, number> {
  const distMap = new Map<string, number>();
  const queue: { key: string; dist: number }[] = [];

  // BFS başlangıcı: kıyı hücreleri
  for (const key of coastCells) {
    distMap.set(key, 0);
    queue.push({ key, dist: 0 });
  }

  while (queue.length > 0) {
    const { key, dist } = queue.shift()!;
    const [q, r] = key.split(',').map(Number);
    const neighbors = getNeighbors({ q, r });

    for (const n of neighbors) {
      if (!isInMapBounds(n.q, n.r, radius)) continue;
      const nKey = hexKey(n.q, n.r);
      if (distMap.has(nKey)) continue;

      const nElev = elevationMap.get(nKey);
      if (nElev === undefined || nElev < SEA_LEVEL) continue;

      distMap.set(nKey, dist + 1);
      queue.push({ key: nKey, dist: dist + 1 });
    }
  }

  return distMap;
}
