import { HexTerrain, BuildingType, UnitType, Resources } from '../types/game';

// ===== HEX RENDER =====
export const HEX_SIZE = 32;
export const MAP_RADIUS = 18;

// ===== TERRAIN COLORS =====
export const TERRAIN_COLORS: Record<HexTerrain, string> = {
  [HexTerrain.Plains]: '#7EC850',
  [HexTerrain.Mountain]: '#8B7355',
  [HexTerrain.Forest]: '#2D5A27',
  [HexTerrain.Desert]: '#D4A843',
  [HexTerrain.Swamp]: '#5B6B4A',
  [HexTerrain.Tundra]: '#B8C4B8',
  [HexTerrain.Snow]: '#E8EDF0',
  [HexTerrain.Ocean]: '#1A4A7A',
  [HexTerrain.Coast]: '#4A90D9',
  [HexTerrain.Lake]: '#5B9BD5',
};

export const TERRAIN_ICONS: Record<HexTerrain, string> = {
  [HexTerrain.Plains]: '🌾',
  [HexTerrain.Mountain]: '⛰️',
  [HexTerrain.Forest]: '🌲',
  [HexTerrain.Desert]: '🏜️',
  [HexTerrain.Swamp]: '🌿',
  [HexTerrain.Tundra]: '❄️',
  [HexTerrain.Snow]: '🏔️',
  [HexTerrain.Ocean]: '🌊',
  [HexTerrain.Coast]: '🏖️',
  [HexTerrain.Lake]: '💧',
};

// ===== TERRAIN RESOURCE YIELDS =====
export const TERRAIN_RESOURCES: Record<HexTerrain, Partial<Resources>> = {
  [HexTerrain.Plains]: { food: 3, gold: 1 },
  [HexTerrain.Mountain]: { iron: 3, stone: 2 },
  [HexTerrain.Forest]: { wood: 3, food: 1 },
  [HexTerrain.Desert]: { gold: 3, stone: 1 },
  [HexTerrain.Swamp]: { food: 1, wood: 1 },
  [HexTerrain.Tundra]: { stone: 1, iron: 1 },
  [HexTerrain.Snow]: { stone: 1 },
  [HexTerrain.Ocean]: {},
  [HexTerrain.Coast]: { gold: 2, food: 2 },
  [HexTerrain.Lake]: { food: 2, gold: 1 },
};

// ===== BUILDING STATS =====
export const BUILDING_COSTS: Record<BuildingType, Partial<Resources>> = {
  [BuildingType.Castle]: { wood: 50, stone: 50, gold: 100 },
  [BuildingType.Barracks]: { wood: 30, iron: 20, gold: 40 },
  [BuildingType.Mine]: { wood: 20, gold: 30 },
  [BuildingType.Farm]: { wood: 15, gold: 10 },
  [BuildingType.Lumbermill]: { stone: 10, gold: 15 },
  [BuildingType.Tower]: { stone: 30, iron: 20, gold: 25 },
  [BuildingType.Market]: { wood: 25, stone: 15, gold: 50 },
  [BuildingType.Port]: { wood: 40, stone: 20, gold: 60 },
};

export const BUILDING_HEALTH: Record<BuildingType, number> = {
  [BuildingType.Castle]: 500,
  [BuildingType.Barracks]: 200,
  [BuildingType.Mine]: 100,
  [BuildingType.Farm]: 80,
  [BuildingType.Lumbermill]: 80,
  [BuildingType.Tower]: 300,
  [BuildingType.Market]: 120,
  [BuildingType.Port]: 150,
};

export const BUILDING_PRODUCTION: Record<BuildingType, Partial<Resources>> = {
  [BuildingType.Castle]: { gold: 5 },
  [BuildingType.Barracks]: {},
  [BuildingType.Mine]: { iron: 4, stone: 2 },
  [BuildingType.Farm]: { food: 5 },
  [BuildingType.Lumbermill]: { wood: 5 },
  [BuildingType.Tower]: {},
  [BuildingType.Market]: { gold: 8 },
  [BuildingType.Port]: { gold: 6, food: 2 },
};

export const BUILDING_ICONS: Record<BuildingType, string> = {
  [BuildingType.Castle]: '🏰',
  [BuildingType.Barracks]: '⚔️',
  [BuildingType.Mine]: '⛏️',
  [BuildingType.Farm]: '🌾',
  [BuildingType.Lumbermill]: '🪓',
  [BuildingType.Tower]: '🗼',
  [BuildingType.Market]: '🏪',
  [BuildingType.Port]: '⚓',
};

// ===== UNIT STATS =====
export interface UnitStats {
  attack: number;
  defense: number;
  health: number;
  speed: number;
  cost: Partial<Resources>;
}

export const UNIT_STATS: Record<UnitType, UnitStats> = {
  [UnitType.Warrior]: {
    attack: 10, defense: 8, health: 50, speed: 1,
    cost: { gold: 20, iron: 10, food: 5 },
  },
  [UnitType.Archer]: {
    attack: 12, defense: 4, health: 30, speed: 1,
    cost: { gold: 25, wood: 15, food: 5 },
  },
  [UnitType.Cavalry]: {
    attack: 14, defense: 6, health: 40, speed: 3,
    cost: { gold: 40, iron: 10, food: 15 },
  },
  [UnitType.Catapult]: {
    attack: 20, defense: 2, health: 60, speed: 1,
    cost: { gold: 60, wood: 30, iron: 20 },
  },
  [UnitType.Scout]: {
    attack: 3, defense: 3, health: 20, speed: 4,
    cost: { gold: 10, food: 5 },
  },
};

export const UNIT_ICONS: Record<UnitType, string> = {
  [UnitType.Warrior]: '⚔️',
  [UnitType.Archer]: '🏹',
  [UnitType.Cavalry]: '🐴',
  [UnitType.Catapult]: '💥',
  [UnitType.Scout]: '👁️',
};

// ===== PLAYER COLORS =====
export const PLAYER_COLORS = [
  '#4A90D9', // mavi - oyuncu
  '#D94A4A', // kırmızı - bot 1
  '#D9A84A', // turuncu - bot 2
  '#8B4AD9', // mor - bot 3
];

// ===== FOG OF WAR =====
export const FOG_COLOR = '#1a1a2e';
export const EXPLORED_FOG_COLOR = '#2a2a3eAA';
export const VISIBILITY_RANGE = 2;
export const SCOUT_VISIBILITY_RANGE = 4;

// ===== STARTING RESOURCES =====
export const STARTING_RESOURCES: Resources = {
  gold: 200,
  iron: 50,
  food: 100,
  wood: 100,
  stone: 50,
};

// ===== BOT NAMES =====
export const BOT_NAMES = [
  'Kara Kral',
  'Demir Lejyon',
  'Gölge Hanedanı',
];

// ===== RIVER RENDERING =====
export const RIVER_COLOR = '#3A7BD5';
export const RIVER_WIDTH_MIN = 1;
export const RIVER_WIDTH_MAX = 4;
