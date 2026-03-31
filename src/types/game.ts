// ===== HEX & MAP =====
export enum HexTerrain {
  Sea = 'sea',
  Coast = 'coast',
  Plains = 'plains',
  Mountain = 'mountain',
  Forest = 'forest',
  River = 'river',
  Desert = 'desert',
  Swamp = 'swamp',
  Lake = 'lake',
  Shore = 'shore',
  Hills = 'hills',
  Fertile = 'fertile',
}

export interface HexCoord {
  q: number; // column (axial)
  r: number; // row (axial)
}

export interface HexTile {
  coord: HexCoord;
  terrain: HexTerrain;
  visible: boolean;    // fog of war
  explored: boolean;   // keşfedilmiş mi
  ownerId: string | null;
  building: Building | null;
  army: Army | null;
  resources: Resources;
}

// ===== RESOURCES =====
export interface Resources {
  gold: number;
  iron: number;
  food: number;
  wood: number;
  stone: number;
}

// ===== BUILDINGS =====
export enum BuildingType {
  Castle = 'castle',       // ana kale - şehir merkezi
  Barracks = 'barracks',   // kışla - asker üret
  Mine = 'mine',           // maden - demir/taş
  Farm = 'farm',           // çiftlik - yiyecek
  Lumbermill = 'lumbermill', // kereste - odun
  Tower = 'tower',         // savunma kulesi
  Market = 'market',       // pazar - altın üretimi
}

export interface Building {
  type: BuildingType;
  level: number;
  ownerId: string;
  health: number;
  maxHealth: number;
  productionPerTick: Partial<Resources>;
}

// ===== UNITS =====
export enum UnitType {
  Warrior = 'warrior',     // piyade - dengeli
  Archer = 'archer',       // okçu - uzak mesafe
  Cavalry = 'cavalry',     // süvari - hızlı
  Catapult = 'catapult',   // kuşatma - bina yıkıcı
  Scout = 'scout',         // kaşif - fog açar
  Galley = 'galley',       // gemi - deniz geçişi
  Warship = 'warship',     // savaş gemisi - deniz savaşı
}

export interface Unit {
  type: UnitType;
  count: number;
  attack: number;
  defense: number;
  health: number;
  speed: number;
}

export interface Army {
  ownerId: string;
  units: Unit[];
  totalPower: number;
}

// ===== TECHNOLOGY =====
export enum TechId {
  Agriculture = 'agriculture',
  Mining = 'mining',
  Archery = 'archery',
  HorseRiding = 'horse_riding',
  Fortification = 'fortification',
  Commerce = 'commerce',
  SiegeEngines = 'siege_engines',
  SteelWorking = 'steel_working',
  AdvancedFarming = 'advanced_farming',
  Cartography = 'cartography',
  Navigation = 'navigation',
  Shipbuilding = 'shipbuilding',
}

export interface TechProgress {
  techId: TechId;
  turnsLeft: number;
}

// ===== HEROES =====
export interface HeroState {
  heroId: string;
  assignedArmyHex: HexCoord | null;
  abilityCooldown: number;
  isDisabled: boolean;
}

// ===== PLAYERS =====
export interface Player {
  id: string;
  name: string;
  color: string;
  isBot: boolean;
  factionId: string;
  resources: Resources;
  territory: HexCoord[];
  castleCoord: HexCoord | null;
  researchedTechs: TechId[];
  currentResearch: TechProgress | null;
  heroes: HeroState[];
}

// ===== GAME STATE =====
export type BotDifficulty = 'easy' | 'normal' | 'hard';

export interface GameState {
  // Eski hex map (geriye uyumluluk)
  map: Map<string, HexTile>;
  mapRadius: number;
  mapSeed: number;
  // Yeni Voronoi region map
  worldMap: import('./region').WorldMap | null;
  useRegionMap: boolean;
  selectedRegionId: string | null;
  botDifficulty: BotDifficulty;
  players: Player[];
  currentPlayerId: string;
  turn: number;
  phase: GamePhase;
  selectedHex: HexCoord | null;
  isPaused: boolean;
  moveMode: boolean;
  moveFrom: HexCoord | null;
  moveTargets: HexCoord[];
  actionLog: { id: string; text: string; color: string; icon: string }[];
  pendingEvent: { type: string; name: string; icon: string; positive: boolean } | null;
  victoryInfo: { winnerId: string; victoryType: string } | null;
  relations: { playerId: string; targetId: string; type: string; turnsRemaining: number }[];
  proposals: { id: string; fromId: string; toId: string; action: string; tribute?: Partial<Resources>; turnsLeft: number }[];
  currentSeason: string;
  currentWeather: string;
  seasonTurnCounter: number;
  // Real-time tick sistemi
  gameSpeed: number;       // 0=pause, 1=normal, 2=fast, 3=ultra
  tickCount: number;       // toplam tick sayisi
  dayPhase: 'dawn' | 'day' | 'dusk' | 'night';
  dayTick: number;         // gun icindeki tick (0-23 gibi)
}

export enum GamePhase {
  Setup = 'setup',
  Playing = 'playing',
  Battle = 'battle',
  GameOver = 'gameover',
}

// hex key helper
export function hexKey(q: number, r: number): string {
  return `${q},${r}`;
}
