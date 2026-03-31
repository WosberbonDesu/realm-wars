import { HexTerrain, BuildingType } from '../types/game';

// Terrain'e göre bina kurma izinleri
export const TERRAIN_BUILDABLE: Record<HexTerrain, BuildingType[]> = {
  [HexTerrain.Plains]: [
    BuildingType.Castle, BuildingType.Barracks, BuildingType.Farm,
    BuildingType.Market, BuildingType.Tower,
  ],
  [HexTerrain.Mountain]: [
    BuildingType.Mine, BuildingType.Tower,
  ],
  [HexTerrain.Forest]: [
    BuildingType.Lumbermill, BuildingType.Tower, BuildingType.Barracks,
  ],
  [HexTerrain.Desert]: [
    BuildingType.Mine, BuildingType.Tower, BuildingType.Market,
  ],
  [HexTerrain.Swamp]: [
    BuildingType.Tower,
  ],
  [HexTerrain.Tundra]: [
    BuildingType.Mine, BuildingType.Tower,
  ],
  [HexTerrain.Snow]: [],
  [HexTerrain.Ocean]: [],
  [HexTerrain.Coast]: [
    BuildingType.Port, BuildingType.Market,
  ],
  [HexTerrain.Lake]: [],
};

// Terrain hareket maliyeti (1 = normal, Infinity = geçilemez)
export const TERRAIN_MOVE_COST: Record<HexTerrain, number> = {
  [HexTerrain.Plains]: 1,
  [HexTerrain.Mountain]: 3,
  [HexTerrain.Forest]: 2,
  [HexTerrain.Desert]: 2,
  [HexTerrain.Swamp]: 3,
  [HexTerrain.Tundra]: 2,
  [HexTerrain.Snow]: 4,
  [HexTerrain.Ocean]: Infinity,
  [HexTerrain.Coast]: Infinity,  // kara birliği geçemez (liman lazım)
  [HexTerrain.Lake]: Infinity,
};

// Terrain savunma bonusu (savaşta savunmacıya eklenir)
export const TERRAIN_DEFENSE_BONUS: Record<HexTerrain, number> = {
  [HexTerrain.Plains]: 0,
  [HexTerrain.Mountain]: 0.30,
  [HexTerrain.Forest]: 0.15,
  [HexTerrain.Desert]: -0.05,
  [HexTerrain.Swamp]: -0.10,
  [HexTerrain.Tundra]: 0.05,
  [HexTerrain.Snow]: 0.10,
  [HexTerrain.Ocean]: 0,
  [HexTerrain.Coast]: -0.10,
  [HexTerrain.Lake]: 0,
};

// Nehir geçişi savunma bonusu (hasRiver=true olan tile'lar)
export const RIVER_DEFENSE_BONUS = 0.20;

// Terrain display adları
export const TERRAIN_NAMES: Record<HexTerrain, string> = {
  [HexTerrain.Plains]: 'Ova',
  [HexTerrain.Mountain]: 'Dag',
  [HexTerrain.Forest]: 'Orman',
  [HexTerrain.Desert]: 'Col',
  [HexTerrain.Swamp]: 'Bataklik',
  [HexTerrain.Tundra]: 'Tundra',
  [HexTerrain.Snow]: 'Karlik',
  [HexTerrain.Ocean]: 'Okyanus',
  [HexTerrain.Coast]: 'Kiyi',
  [HexTerrain.Lake]: 'Gol',
};
