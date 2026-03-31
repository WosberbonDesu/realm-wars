import {
  GameState, Player, HexTile, HexTerrain, BuildingType,
  UnitType, hexKey,
} from '../types/game';
import { getNeighbors } from './hexUtils';
import { BUILDING_COSTS, UNIT_STATS } from '../constants/game';
import { TERRAIN_MOVE_COST } from '../constants/terrain';

// Bot karar verme - her tur çağrılır
export function botTakeTurn(
  state: GameState,
  bot: Player,
  actions: BotActions,
): void {
  // 1. Bina inşa et
  tryBuildSomething(state, bot, actions);

  // 2. Asker üret
  tryTrainUnits(state, bot, actions);

  // 3. Genişle veya saldır
  tryExpandOrAttack(state, bot, actions);
}

export interface BotActions {
  build: (q: number, r: number, type: BuildingType) => void;
  train: (castleQ: number, castleR: number, type: UnitType, count: number) => void;
  moveArmy: (fromQ: number, fromR: number, toQ: number, toR: number) => void;
}

// Su hücreleri - geçilemez/kurulamaz
const WATER_TERRAINS = new Set<HexTerrain>([
  HexTerrain.Ocean,
  HexTerrain.Coast,
  HexTerrain.Lake,
]);

function isPassable(tile: HexTile): boolean {
  return !WATER_TERRAINS.has(tile.terrain);
}

function tryBuildSomething(state: GameState, bot: Player, actions: BotActions) {
  if (!bot.castleCoord) return;

  const ownedTiles = bot.territory
    .map(c => state.map.get(hexKey(c.q, c.r)))
    .filter((t): t is HexTile => t !== undefined && t.building === null && isPassable(t));

  if (ownedTiles.length === 0) return;

  // Öncelik: Farm > Mine > Lumbermill > Market > Barracks > Tower > Port
  const priority: BuildingType[] = [
    BuildingType.Farm, BuildingType.Mine, BuildingType.Lumbermill,
    BuildingType.Market, BuildingType.Barracks, BuildingType.Tower,
  ];

  // Kıyı hex'i varsa Port da düşün
  const hasCoastalTile = bot.territory.some(c => {
    const t = state.map.get(hexKey(c.q, c.r));
    return t?.isCoast;
  });
  if (hasCoastalTile) {
    priority.push(BuildingType.Port);
  }

  for (const buildType of priority) {
    const cost = BUILDING_COSTS[buildType];
    if (canAfford(bot, cost)) {
      const bestTile = pickBestTileForBuilding(ownedTiles, buildType);
      if (bestTile) {
        actions.build(bestTile.coord.q, bestTile.coord.r, buildType);
        return;
      }
    }
  }
}

function tryTrainUnits(state: GameState, bot: Player, actions: BotActions) {
  if (!bot.castleCoord) return;
  const castleKey = hexKey(bot.castleCoord.q, bot.castleCoord.r);
  const castleTile = state.map.get(castleKey);
  if (!castleTile?.building || castleTile.building.type !== BuildingType.Castle) return;

  const hasBarracks = bot.territory.some(c => {
    const t = state.map.get(hexKey(c.q, c.r));
    return t?.building?.type === BuildingType.Barracks;
  });

  const unitType = hasBarracks ? UnitType.Warrior : UnitType.Scout;
  const cost = UNIT_STATS[unitType].cost;

  if (canAfford(bot, cost)) {
    actions.train(bot.castleCoord.q, bot.castleCoord.r, unitType, 2);
  }
}

function tryExpandOrAttack(state: GameState, bot: Player, actions: BotActions) {
  for (const coord of bot.territory) {
    const tile = state.map.get(hexKey(coord.q, coord.r));
    if (!tile?.army || tile.army.ownerId !== bot.id) continue;

    const neighbors = getNeighbors(coord);

    // Boş ve geçilebilir komşu hex → genişle
    const emptyNeighbor = neighbors.find(n => {
      const nt = state.map.get(hexKey(n.q, n.r));
      return nt && nt.ownerId === null && isPassable(nt);
    });

    if (emptyNeighbor) {
      actions.moveArmy(coord.q, coord.r, emptyNeighbor.q, emptyNeighbor.r);
      return;
    }

    // Düşman komşu → saldır (güç yeterliyse)
    const enemyNeighbor = neighbors.find(n => {
      const nt = state.map.get(hexKey(n.q, n.r));
      return nt && nt.ownerId !== null && nt.ownerId !== bot.id && isPassable(nt);
    });

    if (enemyNeighbor && tile.army.totalPower > 50) {
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
    [BuildingType.Mine]: [HexTerrain.Mountain, HexTerrain.Tundra],
    [BuildingType.Lumbermill]: [HexTerrain.Forest],
    [BuildingType.Market]: [HexTerrain.Plains],
    [BuildingType.Port]: [HexTerrain.Coast],
  };

  const preferred = terrainPreference[type];
  if (preferred) {
    // Tercih edilen terrain'de olanı bul
    const match = tiles.find(t => preferred.includes(t.terrain));
    if (match) return match;
  }

  // Nehir kenarı Market için bonus
  if (type === BuildingType.Market) {
    const riverTile = tiles.find(t => t.hasRiver);
    if (riverTile) return riverTile;
  }

  return tiles[0] || null;
}
