import { create } from 'zustand';
import {
  GameState, GamePhase, Player, HexTile, HexCoord,
  hexKey, BuildingType, UnitType, Building, Army, Unit, Resources,
} from '../types/game';
import { generateVoronoiMap, VoronoiMapResult, VoronoiRiver, VoronoiBurg, VoronoiState, VoronoiCulture, VoronoiReligion, VoronoiRoute, MapTemplate } from '../engine/voronoiMapGenerator';
import { VoronoiGraph, Point } from '../engine/voronoi';
import { cellKey, findCellAtPoint } from '../engine/voronoiGrid';
import { BattleResult } from '../engine/combat';
import {
  STARTING_RESOURCES, PLAYER_COLORS,
  BUILDING_COSTS, BUILDING_HEALTH, BUILDING_PRODUCTION,
  UNIT_STATS, BOT_NAMES,
} from '../constants/game';

export type Screen = 'menu' | 'game';

interface GameStore {
  screen: Screen;
  setScreen: (s: Screen) => void;

  // Voronoi data
  voronoiGraph: VoronoiGraph | null;
  cellTiles: HexTile[];
  rivers: VoronoiRiver[];
  coastPaths: Point[][];
  burgs: VoronoiBurg[];
  routes: VoronoiRoute[];
  states: VoronoiState[];
  cultures: VoronoiCulture[];
  religions: VoronoiReligion[];
  stateMap: Map<string, number>;
  cultureMap: Map<string, number>;
  religionMap: Map<string, number>;
  oceanDepthMap: Map<string, number>;
  iceCells: Set<string>;
  customMarkers: { cellIndex: number; icon: string; name: string }[];
  mapWidth: number;
  mapHeight: number;
  seed: number;
  mapTemplate: MapTemplate;

  // Game
  game: GameState | null;
  lastBattle: BattleResult | null;

  // Camera
  cameraX: number;
  cameraY: number;
  cameraZoom: number;
  setCameraPos: (x: number, y: number) => void;
  setCameraZoom: (z: number) => void;

  // UI
  selectedCell: number | null;
  showBuildMenu: boolean;
  showBattleResult: boolean;
  showBiomes: boolean;
  showRivers: boolean;
  showBorders: boolean;
  showRoutes: boolean;
  showBurgs: boolean;
  showPopulation: boolean;
  showGrid: boolean;
  showStats: boolean;
  showRelief: boolean;
  showEmblems: boolean;
  showIce: boolean;
  showWind: boolean;
  showElevation: boolean;
  showTemperature: boolean;
  showMoisture: boolean;
  showCultures: boolean;
  showReligion: boolean;
  showList: boolean;
  showLegend: boolean;
  isGenerating: boolean;
  toggleLayer: (layer: string) => void;

  // Actions
  newGame: (seed?: number, template?: MapTemplate) => void;
  selectCell: (cellIndex: number | null) => void;
  toggleBuildMenu: () => void;
  dismissBattle: () => void;
  endTurn: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  screen: 'menu',
  voronoiGraph: null,
  cellTiles: [],
  rivers: [],
  coastPaths: [],
  burgs: [],
  routes: [],
  states: [],
  cultures: [],
  religions: [],
  stateMap: new Map(),
  cultureMap: new Map(),
  religionMap: new Map(),
  oceanDepthMap: new Map(),
  iceCells: new Set(),
  customMarkers: [],
  mapWidth: 1200,
  mapHeight: 800,
  seed: 0,
  mapTemplate: 'highIsland',
  game: null,
  lastBattle: null,
  cameraX: 0,
  cameraY: 0,
  cameraZoom: 1,
  selectedCell: null,
  showBuildMenu: false,
  showBattleResult: false,
  showBiomes: true,
  showRivers: true,
  showBorders: true,
  showRoutes: true,
  showBurgs: true,
  showPopulation: true,
  showGrid: false,
  showStats: false,
  showRelief: true,
  showEmblems: true,
  showIce: true,
  showWind: false,
  showElevation: false,
  showTemperature: false,
  showMoisture: false,
  showCultures: false,
  showReligion: false,
  showList: false,
  showLegend: false,
  isGenerating: false,

  setScreen: (s) => set({ screen: s }),
  setCameraPos: (x, y) => set({ cameraX: x, cameraY: y }),
  setCameraZoom: (z) => set({ cameraZoom: Math.max(0.3, Math.min(3, z)) }),
  selectCell: (cellIndex) => set({ selectedCell: cellIndex, showBuildMenu: false }),
  toggleBuildMenu: () => set((s) => ({ showBuildMenu: !s.showBuildMenu })),
  dismissBattle: () => set({ showBattleResult: false, lastBattle: null }),
  toggleLayer: (layer) => set((s) => ({ [layer]: !(s as any)[layer] } as any)),

  newGame: (seed, template) => {
    set({ isGenerating: true });
    const gameSeed = seed ?? Math.floor(Math.random() * 999999999);
    const mapTemplate = template ?? get().mapTemplate ?? 'highIsland';

    // Voronoi harita üret
    // Tarayıcı pencere boyutuna göre harita boyutu
    const mapW = typeof window !== 'undefined' ? Math.max(window.innerWidth, 1400) : 1600;
    const mapH = typeof window !== 'undefined' ? Math.max(window.innerHeight, 900) : 1000;
    const result = generateVoronoiMap(gameSeed, mapW, mapH, 4000, mapTemplate);

    // Basit game state (voronoi uyumlu)
    const players: Player[] = [
      { id: 'p1', name: 'Oyuncu', color: PLAYER_COLORS[0], isBot: false, resources: { ...STARTING_RESOURCES }, territory: [], castleCoord: null },
      ...BOT_NAMES.map((name, i) => ({
        id: `bot${i + 1}`, name, color: PLAYER_COLORS[i + 1], isBot: true,
        resources: { ...STARTING_RESOURCES }, territory: [] as HexCoord[], castleCoord: null as HexCoord | null,
      })),
    ];

    const game: GameState = {
      map: result.tiles,
      mapRadius: 18,
      players,
      currentPlayerId: 'p1',
      turn: 1,
      phase: GamePhase.Playing,
      selectedHex: null,
      isPaused: false,
      seed: gameSeed,
    };

    set({
      isGenerating: false,
      voronoiGraph: result.voronoi.graph,
      cellTiles: result.cellTiles,
      rivers: result.rivers,
      coastPaths: result.coastPaths,
      burgs: result.burgs,
      routes: result.routes,
      states: result.states,
      cultures: result.cultures,
      religions: result.religions,
      stateMap: result.stateMap,
      cultureMap: result.cultureMap,
      religionMap: result.religionMap,
      oceanDepthMap: new Map(),
      iceCells: new Set(),
      mapWidth: result.width,
      mapHeight: result.height,
      seed: gameSeed,
      mapTemplate,
      game,
      screen: 'game',
      selectedCell: null,
      cameraX: 0,
      cameraY: 0,
      cameraZoom: 1,
      lastBattle: null,
      showBuildMenu: false,
      showBattleResult: false,
    });
  },

  endTurn: () => {
    const { game } = get();
    if (!game) return;
    game.turn += 1;
    set({ game: { ...game } });
  },
}));
