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
  [HexTerrain.River]: [
    BuildingType.Market, BuildingType.Farm,
  ],
  [HexTerrain.Desert]: [
    BuildingType.Mine, BuildingType.Tower, BuildingType.Market,
  ],
  [HexTerrain.Swamp]: [
    BuildingType.Tower,
  ],
};

// Terrain hareket maliyeti (1 = normal, 2 = zor, Infinity = geçilemez)
export const TERRAIN_MOVE_COST: Record<HexTerrain, number> = {
  [HexTerrain.Plains]: 1,
  [HexTerrain.Mountain]: 3,
  [HexTerrain.Forest]: 2,
  [HexTerrain.River]: 2,
  [HexTerrain.Desert]: 2,
  [HexTerrain.Swamp]: 3,
};

// Terrain savunma bonusu (savaşta savunmacıya eklenir)
export const TERRAIN_DEFENSE_BONUS: Record<HexTerrain, number> = {
  [HexTerrain.Plains]: 0,
  [HexTerrain.Mountain]: 0.30,
  [HexTerrain.Forest]: 0.15,
  [HexTerrain.River]: 0.20,
  [HexTerrain.Desert]: -0.05,
  [HexTerrain.Swamp]: -0.10,
};

// Terrain display adları
export const TERRAIN_NAMES: Record<HexTerrain, string> = {
  [HexTerrain.Plains]: 'Ova',
  [HexTerrain.Mountain]: 'Dag',
  [HexTerrain.Forest]: 'Orman',
  [HexTerrain.River]: 'Nehir',
  [HexTerrain.Desert]: 'Col',
  [HexTerrain.Swamp]: 'Bataklik',
};
