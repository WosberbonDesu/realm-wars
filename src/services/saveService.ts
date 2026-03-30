import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GameState, GamePhase, HexTile, HexCoord, Player, BotDifficulty,
} from '../types/game';

const SAVE_KEY = '@realm_wars_save';
const SETTINGS_KEY = '@realm_wars_settings';

// ===== SERIALIZATION =====
// Map<string, HexTile> JSON'a cevirilemiyor, ozel serialize/deserialize lazim

interface SerializedGameState {
  mapEntries: [string, HexTile][];
  mapRadius: number;
  mapSeed: number;
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
  pendingEvent: any;
  victoryInfo: any;
  relations: any[];
  proposals: any[];
  currentSeason: string;
  currentWeather: string;
  seasonTurnCounter: number;
  gameSpeed: number;
  tickCount: number;
  dayPhase: string;
  dayTick: number;
}

export function serializeState(state: GameState): SerializedGameState {
  return {
    mapEntries: Array.from(state.map.entries()),
    mapRadius: state.mapRadius,
    mapSeed: state.mapSeed,
    botDifficulty: state.botDifficulty,
    players: state.players,
    currentPlayerId: state.currentPlayerId,
    turn: state.turn,
    phase: state.phase,
    selectedHex: state.selectedHex,
    isPaused: false,
    moveMode: false,
    moveFrom: null,
    moveTargets: [],
    actionLog: [],
    pendingEvent: null,
    victoryInfo: null,
    relations: state.relations ?? [],
    proposals: state.proposals ?? [],
    currentSeason: state.currentSeason ?? 'spring',
    currentWeather: state.currentWeather ?? 'clear',
    seasonTurnCounter: state.seasonTurnCounter ?? 0,
    gameSpeed: 1,
    tickCount: state.tickCount ?? 0,
    dayPhase: (state as any).dayPhase ?? 'day',
    dayTick: (state as any).dayTick ?? 6,
  };
}

export function deserializeState(data: SerializedGameState): GameState {
  return {
    map: new Map(data.mapEntries),
    mapRadius: data.mapRadius,
    mapSeed: data.mapSeed ?? 0,
    botDifficulty: (data as any).botDifficulty ?? 'normal',
    players: data.players,
    currentPlayerId: data.currentPlayerId,
    turn: data.turn,
    phase: data.phase,
    selectedHex: null,
    isPaused: false,
    moveMode: false,
    moveFrom: null,
    moveTargets: [],
    actionLog: [],
    pendingEvent: null,
    victoryInfo: null,
    relations: (data as any).relations ?? [],
    proposals: (data as any).proposals ?? [],
    currentSeason: (data as any).currentSeason ?? 'spring',
    currentWeather: (data as any).currentWeather ?? 'clear',
    seasonTurnCounter: (data as any).seasonTurnCounter ?? 0,
    gameSpeed: 1,
    tickCount: (data as any).tickCount ?? 0,
    dayPhase: (data as any).dayPhase ?? 'day',
    dayTick: (data as any).dayTick ?? 6,
  };
}

// ===== SAVE / LOAD =====

export interface SaveData {
  version: number;
  timestamp: number;
  state: SerializedGameState;
}

export async function saveGame(state: GameState): Promise<void> {
  const data: SaveData = {
    version: 1,
    timestamp: Date.now(),
    state: serializeState(state),
  };
  await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

export async function loadGame(): Promise<GameState | null> {
  const raw = await AsyncStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as SaveData;
    if (data.version !== 1) return null;
    return deserializeState(data.state);
  } catch {
    return null;
  }
}

export async function deleteSave(): Promise<void> {
  await AsyncStorage.removeItem(SAVE_KEY);
}

export async function hasSave(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(SAVE_KEY);
  return raw !== null;
}

export async function getSaveInfo(): Promise<{ timestamp: number; turn: number; playerName: string } | null> {
  const raw = await AsyncStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as SaveData;
    const humanPlayer = data.state.players.find(p => !p.isBot);
    return {
      timestamp: data.timestamp,
      turn: data.state.turn,
      playerName: humanPlayer?.name ?? 'Bilinmeyen',
    };
  } catch {
    return null;
  }
}

export async function saveSettings(settings: Record<string, unknown>): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function loadSettings(): Promise<Record<string, unknown> | null> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
