// Province generator - Azgaar tarzı alt bölge/eyalet üretimi
// Her devleti burg'lar etrafında alt bölgelere ayırır

import { hexKey } from '../types/game';
import { getNeighbors, isInMapBounds, hexDistance } from './hexUtils';
import { Alea } from './alea';
import { Burg } from './burgGenerator';
import { State } from './stateGenerator';

export interface Province {
  id: number;
  name: string;
  stateId: number;
  center: { q: number; r: number };
  burgId: number;        // merkez burg
  cells: string[];
  color: string;
  area: number;
}

export interface ProvinceResult {
  provinces: Province[];
  provinceMap: Map<string, number>;  // key → province ID
}

export function generateProvinces(
  states: State[],
  stateMap: Map<string, number>,
  burgs: Burg[],
  radius: number,
  rng: Alea,
): ProvinceResult {
  const provinces: Province[] = [];
  const provinceMap = new Map<string, number>();
  let provinceId = 0;

  for (const state of states) {
    // Bu devlete ait burg'lar
    const stateBurgs = state.burgs
      .map(bId => burgs[bId])
      .filter(Boolean);

    if (stateBurgs.length === 0) continue;

    // Her burg için bir province oluştur
    const provinceSeeds: { burgId: number; coord: { q: number; r: number }; pid: number }[] = [];

    for (const burg of stateBurgs) {
      const color = adjustColor(state.color, rng.nextFloat(-30, 30));
      provinces.push({
        id: provinceId,
        name: '', // nameGenerator doldurur
        stateId: state.id,
        center: burg.coord,
        burgId: burg.id,
        cells: [],
        color,
        area: 0,
      });
      provinceSeeds.push({ burgId: burg.id, coord: burg.coord, pid: provinceId });
      state.provinces.push(provinceId);
      provinceId++;
    }

    // Voronoi-benzeri atama: her hücreyi en yakın burg'un province'ına ata
    for (const cellKey of state.cells) {
      const [q, r] = cellKey.split(',').map(Number);
      let closest = provinceSeeds[0];
      let minDist = Infinity;

      for (const seed of provinceSeeds) {
        const dist = hexDistance({ q, r }, seed.coord);
        if (dist < minDist) {
          minDist = dist;
          closest = seed;
        }
      }

      provinceMap.set(cellKey, closest.pid);
      provinces[closest.pid].cells.push(cellKey);
      provinces[closest.pid].area++;
    }
  }

  return { provinces, provinceMap };
}

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  let r = (num >> 16) + Math.floor(amount);
  let g = ((num >> 8) & 0x00ff) + Math.floor(amount * 0.8);
  let b = (num & 0x0000ff) + Math.floor(amount * 0.6);
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
