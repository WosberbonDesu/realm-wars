// Marker generator - Azgaar tarzı ilgi noktaları (POI)
// Haritadaki özel lokasyonlar: harabe, mağara, tapınak, fener, vb.

import { HexCoord, hexKey, HexTerrain } from '../types/game';
import { isInMapBounds } from './hexUtils';
import { SEA_LEVEL } from './biomes';
import { Alea } from './alea';

export interface Marker {
  id: number;
  coord: HexCoord;
  type: MarkerType;
  name: string;
  icon: string;
  description: string;
}

export enum MarkerType {
  Ruins = 'ruins',
  Cave = 'cave',
  Temple = 'temple',
  Lighthouse = 'lighthouse',
  Mine = 'mine',
  Oasis = 'oasis',
  Volcano = 'volcano',
  Battlefield = 'battlefield',
  Portal = 'portal',
  Treasure = 'treasure',
  Tower = 'tower',
  Bridge = 'bridge',
}

const MARKER_ICONS: Record<MarkerType, string> = {
  [MarkerType.Ruins]: '🏚️',
  [MarkerType.Cave]: '🕳️',
  [MarkerType.Temple]: '⛩️',
  [MarkerType.Lighthouse]: '🗼',
  [MarkerType.Mine]: '⛏️',
  [MarkerType.Oasis]: '🌴',
  [MarkerType.Volcano]: '🌋',
  [MarkerType.Battlefield]: '⚔️',
  [MarkerType.Portal]: '🌀',
  [MarkerType.Treasure]: '💎',
  [MarkerType.Tower]: '🏰',
  [MarkerType.Bridge]: '🌉',
};

const MARKER_DESCRIPTIONS: Record<MarkerType, string[]> = {
  [MarkerType.Ruins]: ['Eski bir uygarligin kalintilari', 'Yikilmis kale', 'Terk edilmis sehir'],
  [MarkerType.Cave]: ['Derin bir magara sistemi', 'Ejderha ini', 'Kristal magarasi'],
  [MarkerType.Temple]: ['Kadim bir tapinak', 'Kayip tapinak', 'Kutsal mekan'],
  [MarkerType.Lighthouse]: ['Deniz feneri', 'Gozetleme kulesi'],
  [MarkerType.Mine]: ['Terk edilmis maden', 'Altin madeni', 'Elmas ocagi'],
  [MarkerType.Oasis]: ['Col vahasi', 'Gizli pinar'],
  [MarkerType.Volcano]: ['Aktif yanardagi', 'Somus volkan'],
  [MarkerType.Battlefield]: ['Eski savas alani', 'Kan ovasi'],
  [MarkerType.Portal]: ['Gizemli gecit', 'Boyut kapisi'],
  [MarkerType.Treasure]: ['Gizli hazine', 'Gomulu altin'],
  [MarkerType.Tower]: ['Buyucu kulesi', 'Gozetleme kulesi'],
  [MarkerType.Bridge]: ['Kadim kopru', 'Tas kopru'],
};

// Terrain → uygun marker tipleri
const TERRAIN_MARKERS: Partial<Record<HexTerrain, MarkerType[]>> = {
  [HexTerrain.Mountain]: [MarkerType.Cave, MarkerType.Mine, MarkerType.Ruins, MarkerType.Volcano, MarkerType.Tower],
  [HexTerrain.Forest]: [MarkerType.Ruins, MarkerType.Temple, MarkerType.Cave, MarkerType.Portal],
  [HexTerrain.Plains]: [MarkerType.Ruins, MarkerType.Battlefield, MarkerType.Treasure, MarkerType.Tower],
  [HexTerrain.Desert]: [MarkerType.Oasis, MarkerType.Ruins, MarkerType.Treasure, MarkerType.Temple],
  [HexTerrain.Swamp]: [MarkerType.Ruins, MarkerType.Portal, MarkerType.Treasure],
  [HexTerrain.Tundra]: [MarkerType.Ruins, MarkerType.Cave, MarkerType.Portal],
  [HexTerrain.Snow]: [MarkerType.Cave, MarkerType.Portal, MarkerType.Tower],
};

export function generateMarkers(
  elevationMap: Map<string, number>,
  terrainMap: Map<string, HexTerrain>,
  riverCells: Set<string>,
  coastCells: Set<string>,
  burgMap: Map<string, number>,
  radius: number,
  rng: Alea,
  markerCount: number = 25,
): Marker[] {
  const markers: Marker[] = [];
  const usedCells = new Set<string>();

  // Tüm kara hücrelerini topla (burg olmayan)
  const candidates: { key: string; terrain: HexTerrain }[] = [];
  for (const [key, elev] of elevationMap) {
    if (elev < SEA_LEVEL) continue;
    if (burgMap.has(key)) continue;

    const terrain = terrainMap.get(key);
    if (!terrain || !TERRAIN_MARKERS[terrain]) continue;

    candidates.push({ key, terrain });
  }

  // Rastgele seç
  const shuffled = rng.shuffle(candidates);

  for (const { key, terrain } of shuffled) {
    if (markers.length >= markerCount) break;
    if (usedCells.has(key)) continue;

    const possibleTypes = TERRAIN_MARKERS[terrain]!;
    const type = rng.pick(possibleTypes);

    // Nehir kenarındaysa köprü olabilir
    const finalType = riverCells.has(key) && rng.next() > 0.5 ? MarkerType.Bridge : type;
    // Kıyıdaysa fener olabilir
    const actualType = coastCells.has(key) && rng.next() > 0.6 ? MarkerType.Lighthouse : finalType;

    const [q, r] = key.split(',').map(Number);
    const descriptions = MARKER_DESCRIPTIONS[actualType];

    markers.push({
      id: markers.length,
      coord: { q, r },
      type: actualType,
      name: '', // nameGenerator doldurur
      icon: MARKER_ICONS[actualType],
      description: rng.pick(descriptions),
    });

    usedCells.add(key);
  }

  return markers;
}
