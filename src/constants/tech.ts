import { TechId, BuildingType, UnitType, Resources } from '../types/game';

export interface TechDefinition {
  id: TechId;
  name: string;
  description: string;
  icon: string;
  cost: Partial<Resources>;
  researchTurns: number;
  prerequisites: TechId[];
  unlocks: {
    buildings?: BuildingType[];
    units?: UnitType[];
    bonuses?: string[];
  };
}

export const TECH_TREE: Record<TechId, TechDefinition> = {
  // === TIER 1 - Baslangic (on kosul yok) ===
  [TechId.Agriculture]: {
    id: TechId.Agriculture,
    name: 'Tarim',
    description: 'Ciftlik uretimini %50 arttirir',
    icon: '🌾',
    cost: { gold: 50 },
    researchTurns: 3,
    prerequisites: [],
    unlocks: {
      bonuses: ['farm_production_50'],
    },
  },
  [TechId.Mining]: {
    id: TechId.Mining,
    name: 'Madencilik',
    description: 'Maden uretimini %50 arttirir',
    icon: '⛏️',
    cost: { gold: 50 },
    researchTurns: 3,
    prerequisites: [],
    unlocks: {
      bonuses: ['mine_production_50'],
    },
  },
  [TechId.Archery]: {
    id: TechId.Archery,
    name: 'Okculuk',
    description: 'Okcu birimini acar',
    icon: '🏹',
    cost: { gold: 60, wood: 20 },
    researchTurns: 4,
    prerequisites: [],
    unlocks: {
      units: [UnitType.Archer],
    },
  },

  // === TIER 2 - Orta seviye ===
  [TechId.HorseRiding]: {
    id: TechId.HorseRiding,
    name: 'Binicilik',
    description: 'Suvari birimini acar',
    icon: '🐴',
    cost: { gold: 100, food: 30 },
    researchTurns: 5,
    prerequisites: [TechId.Archery],
    unlocks: {
      units: [UnitType.Cavalry],
    },
  },
  [TechId.Fortification]: {
    id: TechId.Fortification,
    name: 'Tahkimat',
    description: 'Kule savunmasini %30 arttirir',
    icon: '🏰',
    cost: { gold: 80, stone: 30 },
    researchTurns: 4,
    prerequisites: [TechId.Mining],
    unlocks: {
      buildings: [BuildingType.Tower],
      bonuses: ['tower_defense_30'],
    },
  },
  [TechId.Commerce]: {
    id: TechId.Commerce,
    name: 'Ticaret',
    description: 'Pazar uretimini %50 arttirir',
    icon: '💰',
    cost: { gold: 80 },
    researchTurns: 4,
    prerequisites: [TechId.Agriculture],
    unlocks: {
      bonuses: ['market_production_50'],
    },
  },

  // === TIER 3 - Ileri seviye ===
  [TechId.SiegeEngines]: {
    id: TechId.SiegeEngines,
    name: 'Kusatma Makineleri',
    description: 'Mancnik birimini acar',
    icon: '💥',
    cost: { gold: 150, iron: 40, wood: 30 },
    researchTurns: 6,
    prerequisites: [TechId.Fortification],
    unlocks: {
      units: [UnitType.Catapult],
    },
  },
  [TechId.SteelWorking]: {
    id: TechId.SteelWorking,
    name: 'Celik Isleme',
    description: 'Tum birimlere +3 saldiri',
    icon: '🗡️',
    cost: { gold: 120, iron: 50 },
    researchTurns: 5,
    prerequisites: [TechId.Mining, TechId.HorseRiding],
    unlocks: {
      bonuses: ['unit_attack_3'],
    },
  },
  [TechId.AdvancedFarming]: {
    id: TechId.AdvancedFarming,
    name: 'Gelismis Tarim',
    description: 'Tum yiyecek uretimi 2x',
    icon: '🌿',
    cost: { gold: 100, wood: 40 },
    researchTurns: 5,
    prerequisites: [TechId.Agriculture, TechId.Commerce],
    unlocks: {
      bonuses: ['food_production_2x'],
    },
  },
  [TechId.Cartography]: {
    id: TechId.Cartography,
    name: 'Haritacilik',
    description: 'Gorus menzili +2',
    icon: '🗺️',
    cost: { gold: 80, wood: 20 },
    researchTurns: 4,
    prerequisites: [TechId.Archery],
    unlocks: {
      bonuses: ['visibility_range_2'],
    },
  },
  [TechId.Navigation]: {
    id: TechId.Navigation,
    name: 'Denizcilik',
    description: 'Kadirga uretimine izin verir, deniz kesfi baslar',
    icon: '⛵',
    cost: { gold: 60, wood: 30 },
    researchTurns: 4,
    prerequisites: [TechId.Commerce],
    unlocks: {
      units: [UnitType.Galley],
      bonuses: ['naval_movement'],
    },
  },
  [TechId.Shipbuilding]: {
    id: TechId.Shipbuilding,
    name: 'Gemi Insasi',
    description: 'Savas gemisi uretimi, deniz bombardimani',
    icon: '🚢',
    cost: { gold: 100, wood: 50, iron: 30 },
    researchTurns: 6,
    prerequisites: [TechId.Navigation, TechId.SteelWorking],
    unlocks: {
      units: [UnitType.Warship],
      bonuses: ['advanced_naval'],
    },
  },
};

// Tech agaci siralamasi (UI icin)
export const TECH_TIERS: TechId[][] = [
  // Tier 1
  [TechId.Agriculture, TechId.Mining, TechId.Archery],
  // Tier 2
  [TechId.Commerce, TechId.Fortification, TechId.HorseRiding, TechId.Cartography],
  // Tier 3
  [TechId.AdvancedFarming, TechId.SteelWorking, TechId.SiegeEngines],
  // Tier 4 - Deniz
  [TechId.Navigation, TechId.Shipbuilding],
];

// Baslangicta acik birimler (tech gerektirmeyen)
export const BASE_UNITS: UnitType[] = [UnitType.Warrior, UnitType.Scout];
