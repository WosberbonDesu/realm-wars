import { HexTerrain, BuildingType, UnitType, Resources } from '../types/game';

// ===== HEX RENDER =====
export const HEX_SIZE = 32;
export const MAP_RADIUS = 18;

// ===== TERRAIN COLORS =====
export const TERRAIN_COLORS: Record<HexTerrain, string> = {
  [HexTerrain.Plains]: '#7EC850',
  [HexTerrain.Mountain]: '#8B7355',
  [HexTerrain.Forest]: '#2D5A27',
  [HexTerrain.River]: '#4A90D9',
  [HexTerrain.Desert]: '#D4A843',
  [HexTerrain.Swamp]: '#5B6B4A',
};

// Fantastik harita - zengin renk paleti
export const TERRAIN_PALETTE: Record<HexTerrain, {
  base: string;
  light: string;
  dark: string;
  accent: string;
  shadow: string;
}> = {
  [HexTerrain.Plains]: {
    base: '#6AAF3D',
    light: '#8FD462',
    dark: '#4A8A28',
    accent: '#C8E89A',
    shadow: '#2E5E15',
  },
  [HexTerrain.Mountain]: {
    base: '#7A6850',
    light: '#A89880',
    dark: '#5A4A38',
    accent: '#C8B8A0',
    shadow: '#3A2A1A',
  },
  [HexTerrain.Forest]: {
    base: '#2A5E20',
    light: '#3D7A30',
    dark: '#1A3E12',
    accent: '#5AA848',
    shadow: '#0E2A08',
  },
  [HexTerrain.River]: {
    base: '#3A80C8',
    light: '#5AAAE8',
    dark: '#2060A0',
    accent: '#80C8F8',
    shadow: '#103860',
  },
  [HexTerrain.Desert]: {
    base: '#C89838',
    light: '#E8C060',
    dark: '#A07020',
    accent: '#F0D888',
    shadow: '#705010',
  },
  [HexTerrain.Swamp]: {
    base: '#4A5E3A',
    light: '#607848',
    dark: '#2A3820',
    accent: '#788858',
    shadow: '#1A2810',
  },
};

export const TERRAIN_ICONS: Record<HexTerrain, string> = {
  [HexTerrain.Plains]: '🌾',
  [HexTerrain.Mountain]: '⛰️',
  [HexTerrain.Forest]: '🌲',
  [HexTerrain.River]: '💧',
  [HexTerrain.Desert]: '🏜️',
  [HexTerrain.Swamp]: '🌿',
};

// ===== TERRAIN RESOURCE YIELDS =====
export const TERRAIN_RESOURCES: Record<HexTerrain, Partial<Resources>> = {
  [HexTerrain.Plains]: { food: 3, gold: 1 },
  [HexTerrain.Mountain]: { iron: 3, stone: 2 },
  [HexTerrain.Forest]: { wood: 3, food: 1 },
  [HexTerrain.River]: { gold: 2, food: 2 },
  [HexTerrain.Desert]: { gold: 3, stone: 1 },
  [HexTerrain.Swamp]: { food: 1, wood: 1 },
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
};

export const BUILDING_HEALTH: Record<BuildingType, number> = {
  [BuildingType.Castle]: 500,
  [BuildingType.Barracks]: 200,
  [BuildingType.Mine]: 100,
  [BuildingType.Farm]: 80,
  [BuildingType.Lumbermill]: 80,
  [BuildingType.Tower]: 300,
  [BuildingType.Market]: 120,
};

export const BUILDING_PRODUCTION: Record<BuildingType, Partial<Resources>> = {
  [BuildingType.Castle]: { gold: 5 },
  [BuildingType.Barracks]: {},
  [BuildingType.Mine]: { iron: 4, stone: 2 },
  [BuildingType.Farm]: { food: 5 },
  [BuildingType.Lumbermill]: { wood: 5 },
  [BuildingType.Tower]: {},
  [BuildingType.Market]: { gold: 8 },
};

export const BUILDING_ICONS: Record<BuildingType, string> = {
  [BuildingType.Castle]: '🏰',
  [BuildingType.Barracks]: '⚔️',
  [BuildingType.Mine]: '⛏️',
  [BuildingType.Farm]: '🌾',
  [BuildingType.Lumbermill]: '🪓',
  [BuildingType.Tower]: '🗼',
  [BuildingType.Market]: '🏪',
};

// ===== BUILDING UPGRADE =====
export const MAX_BUILDING_LEVEL = 3;

// Yükseltme maliyeti = bina maliyeti × çarpan
export const UPGRADE_COST_MULTIPLIER: Record<number, number> = {
  2: 1.5,  // Level 2: baz maliyetin 1.5 katı
  3: 2.5,  // Level 3: baz maliyetin 2.5 katı
};

// Her level üretimi bu kadar artırır (çarpan)
export const UPGRADE_PRODUCTION_MULTIPLIER: Record<number, number> = {
  1: 1.0,
  2: 1.6,
  3: 2.5,
};

// Her level HP bu kadar artırır (çarpan)
export const UPGRADE_HEALTH_MULTIPLIER: Record<number, number> = {
  1: 1.0,
  2: 1.5,
  3: 2.0,
};

// Level isim ve ikon
export const LEVEL_NAMES: Record<number, string> = {
  1: '',
  2: 'II',
  3: 'III',
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
