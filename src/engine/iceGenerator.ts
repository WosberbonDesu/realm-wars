// Ice generator - Azgaar tarzı buzul/kutup bölgeleri
// Sıcaklığa göre buz kaplaması belirler

import { hexKey, HexTerrain } from '../types/game';
import { getNeighbors, isInMapBounds } from './hexUtils';
import { SEA_LEVEL } from './biomes';

export interface IceResult {
  iceCells: Set<string>;           // buz kaplı hücreler
  packIceCells: Set<string>;       // kalın buz (deniz)
  glacierCells: Set<string>;       // buzul (kara)
  iceShelfCells: Set<string>;      // buz rafı (kıyı)
}

export function generateIce(
  elevationMap: Map<string, number>,
  temperatureMap: Map<string, number>,
  radius: number,
  freezeThreshold: number = 0.15,  // bu sıcaklığın altı donar
): IceResult {
  const iceCells = new Set<string>();
  const packIceCells = new Set<string>();
  const glacierCells = new Set<string>();
  const iceShelfCells = new Set<string>();

  for (const [key, temp] of temperatureMap) {
    if (temp > freezeThreshold) continue;

    const elev = elevationMap.get(key);
    if (elev === undefined) continue;

    iceCells.add(key);

    if (elev < SEA_LEVEL) {
      // Deniz buzu
      packIceCells.add(key);
    } else if (elev > 0.6) {
      // Yüksek dağ buzulu
      glacierCells.add(key);
    } else {
      // Kıyı buz rafı kontrolü
      const [q, r] = key.split(',').map(Number);
      const neighbors = getNeighbors({ q, r });
      let nearWater = false;
      for (const n of neighbors) {
        if (!isInMapBounds(n.q, n.r, radius)) continue;
        const nElev = elevationMap.get(hexKey(n.q, n.r));
        if (nElev !== undefined && nElev < SEA_LEVEL) {
          nearWater = true;
          break;
        }
      }
      if (nearWater) {
        iceShelfCells.add(key);
      } else {
        glacierCells.add(key);
      }
    }
  }

  return { iceCells, packIceCells, glacierCells, iceShelfCells };
}
