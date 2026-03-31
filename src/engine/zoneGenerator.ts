// Zone generator - Azgaar tarzı dinamik olay bölgeleri
// İstila, isyan, salgın, doğal afet, dini sefer vb.

import { HexCoord, hexKey, HexTerrain } from '../types/game';
import { getNeighbors, isInMapBounds, hexDistance } from './hexUtils';
import { SEA_LEVEL } from './biomes';
import { Alea } from './alea';
import { State } from './stateGenerator';

export interface Zone {
  id: number;
  type: ZoneType;
  name: string;
  description: string;
  cells: string[];
  center: HexCoord;
  radius: number;
  severity: number;     // 0-1
  color: string;
  icon: string;
  stateId: number | null;  // etkilenen devlet
}

export enum ZoneType {
  Invasion = 'invasion',
  Rebels = 'rebels',
  Proselytism = 'proselytism',
  Crusade = 'crusade',
  Disease = 'disease',
  Disaster = 'disaster',
  Eruption = 'eruption',
  Avalanche = 'avalanche',
  Earthquake = 'earthquake',
  Flood = 'flood',
  Tsunami = 'tsunami',
  Drought = 'drought',
  Famine = 'famine',
  Plague = 'plague',
  Wildfire = 'wildfire',
}

interface ZoneTemplate {
  type: ZoneType;
  name: string;
  description: string;
  color: string;
  icon: string;
  minRadius: number;
  maxRadius: number;
  terrainAffinity: HexTerrain[];  // bu arazilerde oluşabilir
  weight: number;  // oluşma olasılık ağırlığı
}

const ZONE_TEMPLATES: ZoneTemplate[] = [
  {
    type: ZoneType.Invasion, name: 'Istila', description: 'Yabanci kuvvetler siniri gecti',
    color: '#FF000066', icon: '⚔️', minRadius: 3, maxRadius: 6,
    terrainAffinity: [HexTerrain.Plains, HexTerrain.Forest, HexTerrain.Desert],
    weight: 3,
  },
  {
    type: ZoneType.Rebels, name: 'Isyan', description: 'Halk ayaklandi',
    color: '#FF450066', icon: '🔥', minRadius: 2, maxRadius: 4,
    terrainAffinity: [HexTerrain.Plains, HexTerrain.Forest, HexTerrain.Mountain],
    weight: 3,
  },
  {
    type: ZoneType.Crusade, name: 'Kutsal Sefer', description: 'Dini savascilar yola cikti',
    color: '#FFD70066', icon: '✝️', minRadius: 3, maxRadius: 5,
    terrainAffinity: [HexTerrain.Plains, HexTerrain.Desert],
    weight: 1,
  },
  {
    type: ZoneType.Proselytism, name: 'Misyonerlik', description: 'Yeni bir inanc yayiliyor',
    color: '#9370DB66', icon: '📿', minRadius: 3, maxRadius: 7,
    terrainAffinity: [HexTerrain.Plains, HexTerrain.Forest, HexTerrain.Desert, HexTerrain.Tundra],
    weight: 2,
  },
  {
    type: ZoneType.Disease, name: 'Salgin', description: 'Olumcul bir hastalik yayiliyor',
    color: '#00800066', icon: '☠️', minRadius: 3, maxRadius: 6,
    terrainAffinity: [HexTerrain.Plains, HexTerrain.Swamp, HexTerrain.Forest],
    weight: 2,
  },
  {
    type: ZoneType.Plague, name: 'Veba', description: 'Kara veba tum bolgeyi sardi',
    color: '#2F4F4F66', icon: '🐀', minRadius: 4, maxRadius: 8,
    terrainAffinity: [HexTerrain.Plains, HexTerrain.Swamp],
    weight: 1,
  },
  {
    type: ZoneType.Eruption, name: 'Yanardag Patlamasi', description: 'Lav ve kul her yeri kapliyor',
    color: '#FF4500AA', icon: '🌋', minRadius: 2, maxRadius: 4,
    terrainAffinity: [HexTerrain.Mountain],
    weight: 2,
  },
  {
    type: ZoneType.Earthquake, name: 'Deprem', description: 'Yer sarsildi',
    color: '#8B451366', icon: '💥', minRadius: 3, maxRadius: 5,
    terrainAffinity: [HexTerrain.Mountain, HexTerrain.Plains],
    weight: 2,
  },
  {
    type: ZoneType.Avalanche, name: 'Cigir', description: 'Kar kutlesi dagdan indi',
    color: '#E8EDF0AA', icon: '❄️', minRadius: 1, maxRadius: 3,
    terrainAffinity: [HexTerrain.Mountain, HexTerrain.Snow],
    weight: 2,
  },
  {
    type: ZoneType.Flood, name: 'Sel', description: 'Nehir taski, ovalar sular altinda',
    color: '#4A90D966', icon: '🌊', minRadius: 2, maxRadius: 5,
    terrainAffinity: [HexTerrain.Plains, HexTerrain.Swamp],
    weight: 2,
  },
  {
    type: ZoneType.Tsunami, name: 'Tsunami', description: 'Dev dalgalar kiyiyi vurdu',
    color: '#1A4A7AAA', icon: '🌊', minRadius: 2, maxRadius: 4,
    terrainAffinity: [HexTerrain.Coast],
    weight: 1,
  },
  {
    type: ZoneType.Drought, name: 'Kuraklik', description: 'Yagmur aylardir yagmiyor',
    color: '#D4A84366', icon: '☀️', minRadius: 4, maxRadius: 8,
    terrainAffinity: [HexTerrain.Plains, HexTerrain.Desert],
    weight: 2,
  },
  {
    type: ZoneType.Famine, name: 'Kitlik', description: 'Yiyecek stoklari tukendi',
    color: '#8B6914AA', icon: '🍂', minRadius: 3, maxRadius: 6,
    terrainAffinity: [HexTerrain.Plains, HexTerrain.Tundra, HexTerrain.Desert],
    weight: 1,
  },
  {
    type: ZoneType.Wildfire, name: 'Orman Yangini', description: 'Atesler kontrol edilemiyor',
    color: '#FF6347AA', icon: '🔥', minRadius: 2, maxRadius: 5,
    terrainAffinity: [HexTerrain.Forest],
    weight: 2,
  },
  {
    type: ZoneType.Disaster, name: 'Felaket', description: 'Bilinmeyen bir felaket',
    color: '#80008066', icon: '⚠️', minRadius: 2, maxRadius: 4,
    terrainAffinity: [HexTerrain.Plains, HexTerrain.Mountain, HexTerrain.Forest, HexTerrain.Desert],
    weight: 1,
  },
];

export interface ZoneResult {
  zones: Zone[];
  zoneCells: Map<string, number[]>;  // key → zone ID'leri (üst üste binebilir)
}

export function generateZones(
  elevationMap: Map<string, number>,
  terrainMap: Map<string, HexTerrain>,
  states: State[],
  stateMap: Map<string, number>,
  riverCells: Set<string>,
  coastCells: Set<string>,
  radius: number,
  rng: Alea,
  zoneCount: number = 8,
): ZoneResult {
  const zones: Zone[] = [];
  const zoneCells = new Map<string, number[]>();

  // Ağırlıklı template havuzu
  const weightedTemplates: ZoneTemplate[] = [];
  for (const t of ZONE_TEMPLATES) {
    for (let i = 0; i < t.weight; i++) {
      weightedTemplates.push(t);
    }
  }

  // Kara hücrelerini terrain'e göre grupla
  const cellsByTerrain = new Map<HexTerrain, string[]>();
  for (const [key, terrain] of terrainMap) {
    const elev = elevationMap.get(key);
    if (elev === undefined || elev < SEA_LEVEL) continue;
    if (!cellsByTerrain.has(terrain)) cellsByTerrain.set(terrain, []);
    cellsByTerrain.get(terrain)!.push(key);
  }

  // Kıyı hücreleri Coast olarak ekle
  for (const key of coastCells) {
    if (!cellsByTerrain.has(HexTerrain.Coast)) cellsByTerrain.set(HexTerrain.Coast, []);
    cellsByTerrain.get(HexTerrain.Coast)!.push(key);
  }

  const usedCenters: HexCoord[] = [];

  for (let i = 0; i < zoneCount; i++) {
    const template = rng.pick(weightedTemplates);

    // Bu template'in uygun olduğu hücreler
    let candidates: string[] = [];
    for (const terrain of template.terrainAffinity) {
      const cells = cellsByTerrain.get(terrain);
      if (cells) candidates = candidates.concat(cells);
    }

    // Flood için nehir kenarı tercih et
    if (template.type === ZoneType.Flood) {
      const riverCandidates = candidates.filter(k => riverCells.has(k));
      if (riverCandidates.length > 10) candidates = riverCandidates;
    }

    if (candidates.length === 0) continue;

    // Merkez seç (önceki zone'lardan uzak)
    let center: HexCoord | null = null;
    for (let attempt = 0; attempt < 20; attempt++) {
      const key = rng.pick(candidates);
      const [q, r] = key.split(',').map(Number);
      const coord = { q, r };

      const tooClose = usedCenters.some(uc => hexDistance(uc, coord) < 4);
      if (!tooClose) {
        center = coord;
        break;
      }
    }
    if (!center) continue;

    usedCenters.push(center);

    // BFS ile zone hücrelerini yayılarak topla
    const zoneRadius = rng.nextInt(template.minRadius, template.maxRadius);
    const zoneCellList: string[] = [];
    const visited = new Set<string>();
    const queue: { key: string; dist: number }[] = [{ key: hexKey(center.q, center.r), dist: 0 }];
    visited.add(hexKey(center.q, center.r));

    while (queue.length > 0) {
      const { key, dist } = queue.shift()!;
      if (dist > zoneRadius) continue;

      const elev = elevationMap.get(key);
      // Tsunami hariç su hücrelerini atla
      if (template.type !== ZoneType.Tsunami && elev !== undefined && elev < SEA_LEVEL) continue;

      zoneCellList.push(key);

      const [q, r] = key.split(',').map(Number);
      const neighbors = getNeighbors({ q, r });
      for (const n of neighbors) {
        if (!isInMapBounds(n.q, n.r, radius)) continue;
        const nKey = hexKey(n.q, n.r);
        if (visited.has(nKey)) continue;
        visited.add(nKey);

        // Rastgele yayılma (organik şekil)
        if (rng.next() > 0.3) {
          queue.push({ key: nKey, dist: dist + 1 });
        }
      }
    }

    if (zoneCellList.length < 2) continue;

    // Etkilenen devlet
    const centerKey = hexKey(center.q, center.r);
    const stateId = stateMap.get(centerKey) ?? null;

    const zone: Zone = {
      id: zones.length,
      type: template.type,
      name: template.name,
      description: template.description,
      cells: zoneCellList,
      center,
      radius: zoneRadius,
      severity: rng.nextFloat(0.3, 1.0),
      color: template.color,
      icon: template.icon,
      stateId,
    };

    zones.push(zone);

    // zoneCells map güncelle
    for (const key of zoneCellList) {
      if (!zoneCells.has(key)) zoneCells.set(key, []);
      zoneCells.get(key)!.push(zone.id);
    }
  }

  return { zones, zoneCells };
}
