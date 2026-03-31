import { create } from 'zustand';
import {
  GameState, GamePhase, Player, HexTile, HexCoord,
  hexKey, BuildingType, UnitType, Building, Army, Unit, Resources,
} from '../types/game';
import { generateMap, findStartPositions, GeneratedMap } from '../engine/mapGenerator';
import { simulateBattle, BattleResult } from '../engine/combat';
import { botTakeTurn, BotActions } from '../engine/botAI';
import { hexesInRange, getNeighbors } from '../engine/hexUtils';
import { RiverSegment } from '../engine/rivers';
import { Burg } from '../engine/burgGenerator';
import { Route } from '../engine/routeGenerator';
import { Marker } from '../engine/markerGenerator';
import { State } from '../engine/stateGenerator';
import { Culture } from '../engine/cultureGenerator';
import { Religion } from '../engine/religionGenerator';
import { Province } from '../engine/provinceGenerator';
import { MilitaryUnit } from '../engine/militaryGenerator';
import {
  STARTING_RESOURCES, PLAYER_COLORS, MAP_RADIUS,
  BUILDING_COSTS, BUILDING_HEALTH, BUILDING_PRODUCTION,
  UNIT_STATS, VISIBILITY_RANGE, SCOUT_VISIBILITY_RANGE,
  BOT_NAMES,
} from '../constants/game';
import { TERRAIN_BUILDABLE, TERRAIN_MOVE_COST } from '../constants/terrain';

export type Screen = 'menu' | 'game';

interface GameStore {
  // Navigation
  screen: Screen;
  setScreen: (s: Screen) => void;

  // Game state
  game: GameState | null;
  rivers: RiverSegment[];
  burgs: Burg[];
  routes: Route[];
  markers: Marker[];
  states: State[];
  stateMap: Map<string, number>;
  cultures: Culture[];
  religions: Religion[];
  provinces: Province[];
  military: MilitaryUnit[];
  oceanDepthMap: Map<string, number>;
  iceCells: Set<string>;
  lastBattle: BattleResult | null;

  // Layer toggles
  showBiomes: boolean;
  showRivers: boolean;
  showBorders: boolean;
  showRoutes: boolean;
  showBurgs: boolean;
  showMarkers: boolean;
  showGrid: boolean;
  toggleLayer: (layer: string) => void;

  // Camera
  cameraX: number;
  cameraY: number;
  cameraZoom: number;
  setCameraPos: (x: number, y: number) => void;
  setCameraZoom: (z: number) => void;

  // UI state
  selectedHex: HexCoord | null;
  showBuildMenu: boolean;
  showBattleResult: boolean;

  // Actions
  newGame: (seed?: number) => void;
  selectHex: (coord: HexCoord | null) => void;
  toggleBuildMenu: () => void;
  buildStructure: (type: BuildingType) => void;
  trainUnit: (type: UnitType, count: number) => void;
  moveArmy: (from: HexCoord, to: HexCoord) => void;
  endTurn: () => void;
  dismissBattle: () => void;
}

function createPlayer(id: string, name: string, color: string, isBot: boolean): Player {
  return {
    id, name, color, isBot,
    resources: { ...STARTING_RESOURCES },
    territory: [],
    castleCoord: null,
  };
}

function updateVisibility(game: GameState): void {
  // Reset visibility
  for (const tile of game.map.values()) {
    tile.visible = false;
  }

  const player = game.players.find(p => !p.isBot);
  if (!player) return;

  for (const coord of player.territory) {
    const tile = game.map.get(hexKey(coord.q, coord.r));
    if (!tile) continue;

    // Scout'lar daha geniş görüş alanı
    const range = tile.army?.units.some(u => u.type === UnitType.Scout)
      ? SCOUT_VISIBILITY_RANGE
      : VISIBILITY_RANGE;

    const visible = hexesInRange(coord, range);
    for (const v of visible) {
      const vTile = game.map.get(hexKey(v.q, v.r));
      if (vTile) {
        vTile.visible = true;
        vTile.explored = true;
      }
    }
  }
}

function collectResources(game: GameState, player: Player): void {
  for (const coord of player.territory) {
    const tile = game.map.get(hexKey(coord.q, coord.r));
    if (!tile) continue;

    // Tile base resources
    player.resources.gold += tile.resources.gold;
    player.resources.iron += tile.resources.iron;
    player.resources.food += tile.resources.food;
    player.resources.wood += tile.resources.wood;
    player.resources.stone += tile.resources.stone;

    // Building production
    if (tile.building && tile.building.ownerId === player.id) {
      const prod = tile.building.productionPerTick;
      player.resources.gold += prod.gold || 0;
      player.resources.iron += prod.iron || 0;
      player.resources.food += prod.food || 0;
      player.resources.wood += prod.wood || 0;
      player.resources.stone += prod.stone || 0;
    }
  }
}

function canAfford(player: Player, cost: Partial<Resources>): boolean {
  return (
    (cost.gold ?? 0) <= player.resources.gold &&
    (cost.iron ?? 0) <= player.resources.iron &&
    (cost.food ?? 0) <= player.resources.food &&
    (cost.wood ?? 0) <= player.resources.wood &&
    (cost.stone ?? 0) <= player.resources.stone
  );
}

function deductCost(player: Player, cost: Partial<Resources>): void {
  player.resources.gold -= cost.gold || 0;
  player.resources.iron -= cost.iron || 0;
  player.resources.food -= cost.food || 0;
  player.resources.wood -= cost.wood || 0;
  player.resources.stone -= cost.stone || 0;
}

export const useGameStore = create<GameStore>((set, get) => ({
  screen: 'menu',
  game: null,
  rivers: [],
  burgs: [],
  routes: [],
  markers: [],
  states: [],
  stateMap: new Map(),
  cultures: [],
  religions: [],
  provinces: [],
  military: [],
  oceanDepthMap: new Map(),
  iceCells: new Set(),
  lastBattle: null,
  showBiomes: true,
  showRivers: true,
  showBorders: true,
  showRoutes: true,
  showBurgs: true,
  showMarkers: true,
  showGrid: false,
  cameraX: 0,
  cameraY: 0,
  cameraZoom: 1,
  selectedHex: null,
  showBuildMenu: false,
  showBattleResult: false,

  toggleLayer: (layer) => set((s) => ({ [layer]: !(s as any)[layer] } as any)),

  setScreen: (s) => set({ screen: s }),

  setCameraPos: (x, y) => set({ cameraX: x, cameraY: y }),
  setCameraZoom: (z) => set({ cameraZoom: Math.max(0.3, Math.min(3, z)) }),

  selectHex: (coord) => set({ selectedHex: coord, showBuildMenu: false }),

  toggleBuildMenu: () => set((s) => ({ showBuildMenu: !s.showBuildMenu })),

  dismissBattle: () => set({ showBattleResult: false, lastBattle: null }),

  newGame: (seed) => {
    const gameSeed = seed ?? Date.now();
    const result: GeneratedMap = generateMap(gameSeed, MAP_RADIUS);

    const players: Player[] = [
      createPlayer('p1', 'Oyuncu', PLAYER_COLORS[0], false),
      ...BOT_NAMES.map((name, i) =>
        createPlayer(`bot${i + 1}`, name, PLAYER_COLORS[i + 1], true)
      ),
    ];

    const startPositions = findStartPositions(result.tiles, players.length, MAP_RADIUS);

    // Her oyuncuya başlangıç noktası + kale
    for (let i = 0; i < players.length; i++) {
      const pos = startPositions[i];
      const player = players[i];
      player.castleCoord = { q: pos.q, r: pos.r };

      const tile = result.tiles.get(hexKey(pos.q, pos.r));
      if (tile) {
        tile.ownerId = player.id;
        tile.building = {
          type: BuildingType.Castle,
          level: 1,
          ownerId: player.id,
          health: BUILDING_HEALTH[BuildingType.Castle],
          maxHealth: BUILDING_HEALTH[BuildingType.Castle],
          productionPerTick: BUILDING_PRODUCTION[BuildingType.Castle],
        };

        // Başlangıç birliği
        tile.army = {
          ownerId: player.id,
          units: [{ type: UnitType.Warrior, count: 5, ...UNIT_STATS[UnitType.Warrior] }],
          totalPower: 5 * UNIT_STATS[UnitType.Warrior].attack,
        };

        player.territory.push({ q: pos.q, r: pos.r });

        // Komşu hex'leri de ver
        const neighbors = getNeighbors({ q: pos.q, r: pos.r });
        for (const n of neighbors) {
          const nTile = result.tiles.get(hexKey(n.q, n.r));
          if (nTile && nTile.ownerId === null &&
              nTile.terrain !== 'ocean' && nTile.terrain !== 'coast' && nTile.terrain !== 'lake') {
            nTile.ownerId = player.id;
            player.territory.push({ q: n.q, r: n.r });
          }
        }
      }
    }

    const game: GameState = {
      map: result.tiles,
      mapRadius: MAP_RADIUS,
      players,
      currentPlayerId: 'p1',
      turn: 1,
      phase: GamePhase.Playing,
      selectedHex: null,
      isPaused: false,
      seed: gameSeed,
    };

    updateVisibility(game);

    set({
      game,
      rivers: result.rivers,
      burgs: result.burgs,
      routes: result.routes,
      markers: result.markers,
      states: result.states,
      stateMap: result.states.length > 0 ?
        new Map(result.states.flatMap(s => s.cells.map(c => [c, s.id] as [string, number]))) :
        new Map(),
      cultures: result.cultures,
      religions: result.religions,
      provinces: result.provinces,
      military: result.military,
      oceanDepthMap: result.oceanLayers.depthMap,
      iceCells: result.ice.iceCells,
      screen: 'game',
      selectedHex: null,
      cameraX: 0,
      cameraY: 0,
      cameraZoom: 1,
      lastBattle: null,
      showBuildMenu: false,
      showBattleResult: false,
    });
  },

  buildStructure: (type) => {
    const { game, selectedHex } = get();
    if (!game || !selectedHex) return;

    const player = game.players.find(p => p.id === game.currentPlayerId);
    if (!player) return;

    const key = hexKey(selectedHex.q, selectedHex.r);
    const tile = game.map.get(key);
    if (!tile || tile.ownerId !== player.id || tile.building) return;

    // Terrain check
    const allowed = TERRAIN_BUILDABLE[tile.terrain];
    if (!allowed.includes(type)) return;

    const cost = BUILDING_COSTS[type];
    if (!canAfford(player, cost)) return;

    deductCost(player, cost);

    tile.building = {
      type,
      level: 1,
      ownerId: player.id,
      health: BUILDING_HEALTH[type],
      maxHealth: BUILDING_HEALTH[type],
      productionPerTick: BUILDING_PRODUCTION[type],
    };

    set({ game: { ...game }, showBuildMenu: false });
  },

  trainUnit: (type, count) => {
    const { game, selectedHex } = get();
    if (!game || !selectedHex) return;

    const player = game.players.find(p => p.id === game.currentPlayerId);
    if (!player) return;

    const key = hexKey(selectedHex.q, selectedHex.r);
    const tile = game.map.get(key);
    if (!tile || tile.ownerId !== player.id) return;

    const stats = UNIT_STATS[type];
    const totalCost: Partial<Resources> = {};
    for (const [res, val] of Object.entries(stats.cost)) {
      (totalCost as Record<string, number>)[res] = (val as number) * count;
    }

    if (!canAfford(player, totalCost)) return;
    deductCost(player, totalCost);

    const newUnit: Unit = {
      type,
      count,
      attack: stats.attack,
      defense: stats.defense,
      health: stats.health,
      speed: stats.speed,
    };

    if (tile.army) {
      const existing = tile.army.units.find(u => u.type === type);
      if (existing) {
        existing.count += count;
      } else {
        tile.army.units.push(newUnit);
      }
      tile.army.totalPower = tile.army.units.reduce(
        (s, u) => s + u.attack * u.count, 0
      );
    } else {
      tile.army = {
        ownerId: player.id,
        units: [newUnit],
        totalPower: stats.attack * count,
      };
    }

    set({ game: { ...game } });
  },

  moveArmy: (from, to) => {
    const { game } = get();
    if (!game) return;

    const player = game.players.find(p => p.id === game.currentPlayerId);
    if (!player) return;

    const fromKey = hexKey(from.q, from.r);
    const toKey = hexKey(to.q, to.r);
    const fromTile = game.map.get(fromKey);
    const toTile = game.map.get(toKey);

    if (!fromTile?.army || fromTile.army.ownerId !== player.id || !toTile) return;

    // Movement cost check
    const moveCost = TERRAIN_MOVE_COST[toTile.terrain];
    if (moveCost === Infinity) return;

    // Combat if enemy
    if (toTile.army && toTile.army.ownerId !== player.id) {
      const result = simulateBattle(fromTile.army, toTile.army, toTile);

      if (result.winner === 'attacker') {
        toTile.army = {
          ownerId: player.id,
          units: result.attackerSurvivors,
          totalPower: result.attackerSurvivors.reduce((s, u) => s + u.attack * u.count, 0),
        };
        // Claim territory
        if (toTile.ownerId && toTile.ownerId !== player.id) {
          const enemy = game.players.find(p => p.id === toTile.ownerId);
          if (enemy) {
            enemy.territory = enemy.territory.filter(
              c => !(c.q === to.q && c.r === to.r)
            );
          }
        }
        toTile.ownerId = player.id;
        if (!player.territory.some(c => c.q === to.q && c.r === to.r)) {
          player.territory.push({ q: to.q, r: to.r });
        }
      } else {
        toTile.army = {
          ...toTile.army,
          units: result.defenderSurvivors,
          totalPower: result.defenderSurvivors.reduce((s, u) => s + u.attack * u.count, 0),
        };
      }

      fromTile.army = null;
      set({ game: { ...game }, lastBattle: result, showBattleResult: true });
      return;
    }

    // Move army
    toTile.army = fromTile.army;
    fromTile.army = null;

    // Claim empty territory
    if (toTile.ownerId === null) {
      toTile.ownerId = player.id;
      player.territory.push({ q: to.q, r: to.r });
    }

    updateVisibility(game);
    set({ game: { ...game }, selectedHex: to });
  },

  endTurn: () => {
    const { game } = get();
    if (!game) return;

    // Collect resources for all players
    for (const player of game.players) {
      collectResources(game, player);
    }

    // Bot turns
    for (const bot of game.players.filter(p => p.isBot)) {
      const actions: BotActions = {
        build: (q, r, type) => {
          const tile = game.map.get(hexKey(q, r));
          if (!tile) return;
          const cost = BUILDING_COSTS[type];
          if (!canAfford(bot, cost)) return;
          deductCost(bot, cost);
          tile.building = {
            type, level: 1, ownerId: bot.id,
            health: BUILDING_HEALTH[type],
            maxHealth: BUILDING_HEALTH[type],
            productionPerTick: BUILDING_PRODUCTION[type],
          };
        },
        train: (cq, cr, type, count) => {
          const tile = game.map.get(hexKey(cq, cr));
          if (!tile) return;
          const stats = UNIT_STATS[type];
          const unit: Unit = { type, count, ...stats };
          if (tile.army) {
            tile.army.units.push(unit);
            tile.army.totalPower += stats.attack * count;
          } else {
            tile.army = {
              ownerId: bot.id,
              units: [unit],
              totalPower: stats.attack * count,
            };
          }
        },
        moveArmy: (fq, fr, tq, tr) => {
          const from = game.map.get(hexKey(fq, fr));
          const to = game.map.get(hexKey(tq, tr));
          if (!from?.army || !to) return;
          if (TERRAIN_MOVE_COST[to.terrain] === Infinity) return;

          if (to.army && to.army.ownerId !== bot.id) {
            const result = simulateBattle(from.army, to.army, to);
            if (result.winner === 'attacker') {
              to.army = {
                ownerId: bot.id,
                units: result.attackerSurvivors,
                totalPower: result.attackerSurvivors.reduce((s, u) => s + u.attack * u.count, 0),
              };
              if (to.ownerId && to.ownerId !== bot.id) {
                const victim = game.players.find(p => p.id === to.ownerId);
                if (victim) {
                  victim.territory = victim.territory.filter(
                    c => !(c.q === tq && c.r === tr)
                  );
                }
              }
              to.ownerId = bot.id;
              if (!bot.territory.some(c => c.q === tq && c.r === tr)) {
                bot.territory.push({ q: tq, r: tr });
              }
            }
            from.army = null;
          } else if (!to.army) {
            to.army = from.army;
            from.army = null;
            if (to.ownerId === null) {
              to.ownerId = bot.id;
              bot.territory.push({ q: tq, r: tr });
            }
          }
        },
      };
      botTakeTurn(game, bot, actions);
    }

    // Check game over
    const activePlayers = game.players.filter(p => p.territory.length > 0);
    if (activePlayers.length <= 1) {
      game.phase = GamePhase.GameOver;
    }

    game.turn += 1;
    updateVisibility(game);
    set({ game: { ...game } });
  },
}));
