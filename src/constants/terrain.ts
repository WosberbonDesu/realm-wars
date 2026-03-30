import { HexTerrain, BuildingType } from '../types/game';

// Terrain'e gore bina kurma izinleri
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
  [HexTerrain.Sea]: [],
  [HexTerrain.Lake]: [],
  [HexTerrain.Hills]: [
    BuildingType.Tower, BuildingType.Mine, BuildingType.Barracks,
  ],
  [HexTerrain.Fertile]: [
    BuildingType.Castle, BuildingType.Farm, BuildingType.Market,
    BuildingType.Tower, BuildingType.Barracks,
  ],
};

// Terrain hareket maliyeti
export const TERRAIN_MOVE_COST: Record<HexTerrain, number> = {
  [HexTerrain.Plains]: 1,
  [HexTerrain.Mountain]: 3,
  [HexTerrain.Forest]: 2,
  [HexTerrain.River]: 2,
  [HexTerrain.Desert]: 2,
  [HexTerrain.Swamp]: 3,
  [HexTerrain.Sea]: Infinity,
  [HexTerrain.Lake]: Infinity,
  [HexTerrain.Hills]: 2,
  [HexTerrain.Fertile]: 1,
};

// Terrain savunma bonusu
export const TERRAIN_DEFENSE_BONUS: Record<HexTerrain, number> = {
  [HexTerrain.Plains]: 0,
  [HexTerrain.Mountain]: 0.30,
  [HexTerrain.Forest]: 0.15,
  [HexTerrain.River]: 0.20,
  [HexTerrain.Desert]: -0.05,
  [HexTerrain.Swamp]: -0.10,
  [HexTerrain.Sea]: 0,
  [HexTerrain.Lake]: 0,
  [HexTerrain.Hills]: 0.20,
  [HexTerrain.Fertile]: 0,
};

// Terrain display adlari
export const TERRAIN_NAMES: Record<HexTerrain, string> = {
  [HexTerrain.Plains]: 'Ova',
  [HexTerrain.Mountain]: 'Dag',
  [HexTerrain.Forest]: 'Orman',
  [HexTerrain.River]: 'Nehir',
  [HexTerrain.Desert]: 'Col',
  [HexTerrain.Swamp]: 'Bataklik',
  [HexTerrain.Sea]: 'Deniz',
  [HexTerrain.Lake]: 'Gol',
  [HexTerrain.Hills]: 'Tepe',
  [HexTerrain.Fertile]: 'Verimli Toprak',
};

// Su terrain'leri (gecilmez, bina kurulamaz)
export const WATER_TERRAINS = new Set([HexTerrain.Sea, HexTerrain.Lake]);
export const LAND_TERRAINS = new Set([
  HexTerrain.Plains, HexTerrain.Mountain, HexTerrain.Forest,
  HexTerrain.River, HexTerrain.Desert, HexTerrain.Swamp,
  HexTerrain.Hills, HexTerrain.Fertile,
]);
