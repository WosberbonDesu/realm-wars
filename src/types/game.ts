// ===== HEX & MAP =====
export enum HexTerrain {
  Plains = 'plains',
  Mountain = 'mountain',
  Forest = 'forest',
  River = 'river',
  Desert = 'desert',
  Swamp = 'swamp',
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

// ===== PLAYERS =====
export interface Player {
  id: string;
  name: string;
  color: string;
  isBot: boolean;
  resources: Resources;
  territory: HexCoord[];  // sahip olunan hex'ler
  castleCoord: HexCoord | null;
}

// ===== GAME STATE =====
export interface GameState {
  map: Map<string, HexTile>;
  mapRadius: number;
  players: Player[];
  currentPlayerId: string;
  turn: number;
  phase: GamePhase;
  selectedHex: HexCoord | null;
  isPaused: boolean;
  moveMode: boolean;
  moveFrom: HexCoord | null;
  moveTargets: HexCoord[];
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
