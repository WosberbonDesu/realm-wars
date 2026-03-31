// Ocean layers - Azgaar tarzı batimetri (deniz derinlik konturları)
// Kıyıdan uzaklığa göre derinlik bantları oluşturur

import { hexKey } from '../types/game';
import { getNeighbors, isInMapBounds } from './hexUtils';
import { SEA_LEVEL } from './biomes';

export interface OceanLayer {
  depth: number;      // 0-5 (0=kıyı, 5=derin okyanus)
  cells: Set<string>;
}

export interface OceanResult {
  layers: OceanLayer[];
  depthMap: Map<string, number>;  // key → depth (0-5)
}

export function generateOceanLayers(
  elevationMap: Map<string, number>,
  radius: number,
  layerCount: number = 5,
): OceanResult {
  const depthMap = new Map<string, number>();
  const layers: OceanLayer[] = [];

  // Tüm su hücrelerini bul
  const waterCells: string[] = [];
  const landCells = new Set<string>();
  for (const [key, elev] of elevationMap) {
    if (elev < SEA_LEVEL) {
      waterCells.push(key);
    } else {
      landCells.add(key);
    }
  }

  // BFS: kıyıdan başlayarak derinlik katmanları oluştur
  // İlk olarak kıyıya komşu su hücrelerini bul (depth=0)
  const queue: { key: string; depth: number }[] = [];
  const visited = new Set<string>();

  for (const wKey of waterCells) {
    const [q, r] = wKey.split(',').map(Number);
    const neighbors = getNeighbors({ q, r });
    let isCoastal = false;
    for (const n of neighbors) {
      if (!isInMapBounds(n.q, n.r, radius)) continue;
      const nKey = hexKey(n.q, n.r);
      if (landCells.has(nKey)) {
        isCoastal = true;
        break;
      }
    }
    if (isCoastal) {
      queue.push({ key: wKey, depth: 0 });
      visited.add(wKey);
      depthMap.set(wKey, 0);
    }
  }

  // BFS yayılım
  while (queue.length > 0) {
    const { key, depth } = queue.shift()!;
    const [q, r] = key.split(',').map(Number);
    const neighbors = getNeighbors({ q, r });

    for (const n of neighbors) {
      if (!isInMapBounds(n.q, n.r, radius)) continue;
      const nKey = hexKey(n.q, n.r);
      if (visited.has(nKey)) continue;

      const nElev = elevationMap.get(nKey);
      if (nElev === undefined || nElev >= SEA_LEVEL) continue;

      const newDepth = Math.min(depth + 1, layerCount - 1);
      visited.add(nKey);
      depthMap.set(nKey, newDepth);
      queue.push({ key: nKey, depth: newDepth });
    }
  }

  // Ziyaret edilmemiş su hücreleri → en derin
  for (const wKey of waterCells) {
    if (!depthMap.has(wKey)) {
      depthMap.set(wKey, layerCount - 1);
    }
  }

  // Layer grupları oluştur
  for (let d = 0; d < layerCount; d++) {
    const cells = new Set<string>();
    for (const [key, depth] of depthMap) {
      if (depth === d) cells.add(key);
    }
    layers.push({ depth: d, cells });
  }

  return { layers, depthMap };
}
