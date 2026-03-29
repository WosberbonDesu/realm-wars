import {
  GameState, Player, HexTile, HexTerrain, BuildingType,
  UnitType, hexKey, Building, Army,
} from '../types/game';
import { getNeighbors, hexDistance } from './hexUtils';
import { BUILDING_COSTS, UNIT_STATS } from '../constants/game';

export type BotDifficulty = 'easy' | 'normal' | 'hard';

export interface BotActions {
  build: (q: number, r: number, type: BuildingType) => void;
  train: (castleQ: number, castleR: number, type: UnitType, count: number) => void;
  moveArmy: (fromQ: number, fromR: number, toQ: number, toR: number) => void;
}

// Zorluk bazli parametreler
interface DifficultyParams {
  buildChance: number;        // bina kurma olasiligi
  trainMultiplier: number;    // egitim adedi carpani
  aggressionThreshold: number; // saldiri icin min guc
  expandChance: number;       // genisleme olasiligi
  maxActionsPerTurn: number;  // tur basi max aksiyon
  preferredUnits: UnitType[]; // tercih edilen birimler
}

const DIFFICULTY: Record<BotDifficulty, DifficultyParams> = {
  easy: {
    buildChance: 0.5,
    trainMultiplier: 1,
    aggressionThreshold: 100,
    expandChance: 0.4,
    maxActionsPerTurn: 1,
    preferredUnits: [UnitType.Warrior, UnitType.Scout],
  },
  normal: {
    buildChance: 0.8,
    trainMultiplier: 2,
    aggressionThreshold: 50,
    expandChance: 0.7,
    maxActionsPerTurn: 2,
    preferredUnits: [UnitType.Warrior, UnitType.Archer, UnitType.Scout],
  },
  hard: {
    buildChance: 1.0,
    trainMultiplier: 3,
    aggressionThreshold: 30,
    expandChance: 0.9,
    maxActionsPerTurn: 3,
    preferredUnits: [UnitType.Warrior, UnitType.Archer, UnitType.Cavalry],
  },
};

// Bot karar verme - her tur cagirilir
export function botTakeTurn(
  state: GameState,
  bot: Player,
  actions: BotActions,
  difficulty: BotDifficulty = 'normal',
): void {
  const params = DIFFICULTY[difficulty];
  let actionsLeft = params.maxActionsPerTurn;

  // 1. Bina insa et
  if (Math.random() < params.buildChance && actionsLeft > 0) {
    if (tryBuildSomething(state, bot, actions, difficulty)) actionsLeft--;
  }

  // 2. Asker uret
  if (actionsLeft > 0) {
    tryTrainUnits(state, bot, actions, params);
    actionsLeft--;
  }

  // 3. Genisle veya saldir
  if (Math.random() < params.expandChance && actionsLeft > 0) {
    tryExpandOrAttack(state, bot, actions, params);
    actionsLeft--;
  }

  // Hard: ekstra genisleme hamlesi
  if (difficulty === 'hard' && actionsLeft > 0) {
    tryExpandOrAttack(state, bot, actions, params);
  }
}

function tryBuildSomething(
  state: GameState, bot: Player, actions: BotActions, difficulty: BotDifficulty,
): boolean {
  if (!bot.castleCoord) return false;

  const ownedTiles = bot.territory
    .map(c => state.map.get(hexKey(c.q, c.r)))
    .filter((t): t is HexTile => t !== undefined && t.building === null);

  if (ownedTiles.length === 0) return false;

  // Zorluga gore bina onceligi
  const priority: BuildingType[] = difficulty === 'hard'
    ? [BuildingType.Barracks, BuildingType.Farm, BuildingType.Mine, BuildingType.Market, BuildingType.Lumbermill, BuildingType.Tower]
    : difficulty === 'easy'
    ? [BuildingType.Farm, BuildingType.Lumbermill, BuildingType.Mine]
    : [BuildingType.Farm, BuildingType.Mine, BuildingType.Lumbermill, BuildingType.Market, BuildingType.Barracks, BuildingType.Tower];

  for (const buildType of priority) {
    const cost = BUILDING_COSTS[buildType];
    if (canAfford(bot, cost)) {
      const bestTile = pickBestTileForBuilding(ownedTiles, buildType);
      if (bestTile) {
        actions.build(bestTile.coord.q, bestTile.coord.r, buildType);
        return true;
      }
    }
  }
  return false;
}

function tryTrainUnits(
  state: GameState, bot: Player, actions: BotActions, params: DifficultyParams,
) {
  if (!bot.castleCoord) return;
  const castleKey = hexKey(bot.castleCoord.q, bot.castleCoord.r);
  const castleTile = state.map.get(castleKey);
  if (!castleTile?.building || castleTile.building.type !== BuildingType.Castle) return;

  // Zorluga gore birim sec
  const hasBarracks = bot.territory.some(c => {
    const t = state.map.get(hexKey(c.q, c.r));
    return t?.building?.type === BuildingType.Barracks;
  });

  // Tercih edilen birimlerden karsilanabileni sec
  for (const unitType of params.preferredUnits) {
    // Warrior ve Scout her zaman kullanilabilir, digerleri kisla gerektirir
    if (unitType !== UnitType.Warrior && unitType !== UnitType.Scout && !hasBarracks) continue;

    const cost = UNIT_STATS[unitType].cost;
    const count = params.trainMultiplier;

    // Toplam maliyet kontrol
    const totalCost: Record<string, number> = {};
    for (const [res, val] of Object.entries(cost)) {
      totalCost[res] = (val as number) * count;
    }

    if (canAfford(bot, totalCost)) {
      actions.train(bot.castleCoord.q, bot.castleCoord.r, unitType, count);
      return;
    }
  }
}

function tryExpandOrAttack(
  state: GameState, bot: Player, actions: BotActions, params: DifficultyParams,
) {
  for (const coord of bot.territory) {
    const tile = state.map.get(hexKey(coord.q, coord.r));
    if (!tile?.army || tile.army.ownerId !== bot.id) continue;

    const neighbors = getNeighbors(coord);

    // Bos komsu hex -> genisle
    const emptyNeighbor = neighbors.find(n => {
      const nt = state.map.get(hexKey(n.q, n.r));
      return nt && nt.ownerId === null;
    });

    if (emptyNeighbor) {
      actions.moveArmy(coord.q, coord.r, emptyNeighbor.q, emptyNeighbor.r);
      return;
    }

    // Dusman komsu -> saldir (guc yeterliyse)
    const enemyNeighbor = neighbors.find(n => {
      const nt = state.map.get(hexKey(n.q, n.r));
      return nt && nt.ownerId !== null && nt.ownerId !== bot.id;
    });

    if (enemyNeighbor && tile.army.totalPower > params.aggressionThreshold) {
      actions.moveArmy(coord.q, coord.r, enemyNeighbor.q, enemyNeighbor.r);
      return;
    }
  }
}

function canAfford(player: Player, cost: Partial<Record<string, number>>): boolean {
  const r = player.resources;
  return (
    (cost.gold ?? 0) <= r.gold &&
    (cost.iron ?? 0) <= r.iron &&
    (cost.food ?? 0) <= r.food &&
    (cost.wood ?? 0) <= r.wood &&
    (cost.stone ?? 0) <= r.stone
  );
}

function pickBestTileForBuilding(tiles: HexTile[], type: BuildingType): HexTile | null {
  const terrainPreference: Partial<Record<BuildingType, HexTerrain[]>> = {
    [BuildingType.Farm]: [HexTerrain.Plains],
    [BuildingType.Mine]: [HexTerrain.Mountain],
    [BuildingType.Lumbermill]: [HexTerrain.Forest],
    [BuildingType.Market]: [HexTerrain.Plains, HexTerrain.River],
  };

  const preferred = terrainPreference[type];
  if (preferred) {
    const match = tiles.find(t => preferred.includes(t.terrain));
    if (match) return match;
  }

  return tiles[0] || null;
}
