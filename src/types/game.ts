// ===== HEX & MAP =====
export enum HexTerrain {
  // Kara
  Plains = 'plains',
  Mountain = 'mountain',
  Forest = 'forest',
  Desert = 'desert',
  Swamp = 'swamp',
  Tundra = 'tundra',
  Snow = 'snow',
  // Su
  Ocean = 'ocean',
  Coast = 'coast',
  Lake = 'lake',
}

export interface HexCoord {
  q: number; // column (axial)
  r: number; // row (axial)
}

export interface HexTile {
  coord: HexCoord;
  terrain: HexTerrain;

  // Azgaar-style procedural data
  elevation: number;    // 0-1 (0=deep ocean, 0.2=sea level, 1=peak)
  moisture: number;     // 0-1
  temperature: number;  // 0-1 (0=frozen, 1=scorching)

  // River overlay (nehirler arazi üzerinden geçer)
  hasRiver: boolean;
  riverFlow: number;    // flux value (0 = no river)

  // Feature detection
  featureId: number;    // continent/island/ocean basin ID
  isCoast: boolean;     // kara-su sınırında mı

  // Fog of war
  visible: boolean;
  explored: boolean;

  // Ownership & gameplay
  ownerId: string | null;
  building: Building | null;
  army: Army | null;
  resources: Resources;

  // Display
  biomeName: string;    // human-readable biome name
  regionName: string;   // procedural region name
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
  Castle = 'castle',
  Barracks = 'barracks',
  Mine = 'mine',
  Farm = 'farm',
  Lumbermill = 'lumbermill',
  Tower = 'tower',
  Market = 'market',
  Port = 'port',           // yeni: kıyı ticareti
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
  Warrior = 'warrior',
  Archer = 'archer',
  Cavalry = 'cavalry',
  Catapult = 'catapult',
  Scout = 'scout',
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
  territory: HexCoord[];
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
  seed: number;            // harita seed'i (reproducibility)
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
