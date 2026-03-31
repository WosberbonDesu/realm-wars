// Military generator - Azgaar tarzı askeri birlik yerleşimi
// Devlet sınırlarında ve stratejik noktalarda garnizon yerleştirir

import { HexCoord, hexKey, HexTerrain } from '../types/game';
import { getNeighbors, isInMapBounds } from './hexUtils';
import { Alea } from './alea';
import { State } from './stateGenerator';
import { Burg } from './burgGenerator';

export interface MilitaryUnit {
  id: number;
  name: string;
  stateId: number;
  coord: HexCoord;
  type: MilitaryType;
  strength: number;
  icon: string;
}

export enum MilitaryType {
  Infantry = 'infantry',
  Cavalry = 'cavalry',
  Artillery = 'artillery',
  Fleet = 'fleet',
  Garrison = 'garrison',
}

export interface MilitaryResult {
  units: MilitaryUnit[];
  militaryMap: Map<string, number>;  // key → unit ID
}

const MILITARY_ICONS: Record<MilitaryType, string> = {
  [MilitaryType.Infantry]: '⚔️',
  [MilitaryType.Cavalry]: '🐴',
  [MilitaryType.Artillery]: '💥',
  [MilitaryType.Fleet]: '⛵',
  [MilitaryType.Garrison]: '🛡️',
};

export function generateMilitary(
  states: State[],
  stateMap: Map<string, number>,
  burgs: Burg[],
  terrainMap: Map<string, HexTerrain>,
  coastCells: Set<string>,
  radius: number,
  rng: Alea,
): MilitaryResult {
  const units: MilitaryUnit[] = [];
  const militaryMap = new Map<string, number>();

  for (const state of states) {
    if (state.cells.length === 0) continue;

    const totalMilitary = state.military;
    let remaining = totalMilitary;

    // 1. Capital'da garnizon
    const capital = burgs[state.capitalId];
    if (capital) {
      const key = hexKey(capital.coord.q, capital.coord.r);
      const strength = Math.floor(remaining * 0.3);
      units.push({
        id: units.length,
        name: `${state.name} Muhafizlari`,
        stateId: state.id,
        coord: capital.coord,
        type: MilitaryType.Garrison,
        strength,
        icon: MILITARY_ICONS[MilitaryType.Garrison],
      });
      militaryMap.set(key, units.length - 1);
      remaining -= strength;
    }

    // 2. Sınır hex'lerinde birlikler
    const borderCells: string[] = [];
    for (const key of state.cells) {
      const [q, r] = key.split(',').map(Number);
      const neighbors = getNeighbors({ q, r });
      for (const n of neighbors) {
        if (!isInMapBounds(n.q, n.r, radius)) continue;
        const nKey = hexKey(n.q, n.r);
        const nState = stateMap.get(nKey);
        if (nState !== undefined && nState !== state.id) {
          borderCells.push(key);
          break;
        }
      }
    }

    // Sınır garnizonları (2-4 adet)
    const borderCount = Math.min(rng.nextInt(2, 4), borderCells.length);
    const shuffledBorder = rng.shuffle(borderCells);

    for (let i = 0; i < borderCount && remaining > 0; i++) {
      const key = shuffledBorder[i];
      if (militaryMap.has(key)) continue;

      const [q, r] = key.split(',').map(Number);
      const strength = Math.floor(remaining / (borderCount - i));
      const terrain = terrainMap.get(key);

      const type = terrain === HexTerrain.Mountain ? MilitaryType.Artillery :
                   rng.next() > 0.5 ? MilitaryType.Infantry : MilitaryType.Cavalry;

      units.push({
        id: units.length,
        name: '',
        stateId: state.id,
        coord: { q, r },
        type,
        strength,
        icon: MILITARY_ICONS[type],
      });
      militaryMap.set(key, units.length - 1);
      remaining -= strength;
    }

    // 3. Kıyıda donanma
    const coastalStateCells = state.cells.filter(k => coastCells.has(k));
    if (coastalStateCells.length > 0 && remaining > 10) {
      const fleetKey = rng.pick(coastalStateCells);
      const [q, r] = fleetKey.split(',').map(Number);
      units.push({
        id: units.length,
        name: `${state.name} Donanmasi`,
        stateId: state.id,
        coord: { q, r },
        type: MilitaryType.Fleet,
        strength: Math.floor(remaining * 0.5),
        icon: MILITARY_ICONS[MilitaryType.Fleet],
      });
      militaryMap.set(fleetKey, units.length - 1);
    }
  }

  return { units, militaryMap };
}
