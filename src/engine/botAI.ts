import {
  GameState, Player, HexTile, HexTerrain, BuildingType,
  UnitType, hexKey, Building, Army,
} from '../types/game';
import { getNeighbors, hexDistance } from './hexUtils';
import { BUILDING_COSTS, UNIT_STATS } from '../constants/game';

// Bot karar verme - her tur çağrılır
export function botTakeTurn(
  state: GameState,
  bot: Player,
  actions: BotActions
): void {
  // 1. Kaynak toplama otomatik (store'da yapılıyor)

  // 2. Bina inşa et
  tryBuildSomething(state, bot, actions);

  // 3. Asker üret
  tryTrainUnits(state, bot, actions);

  // 4. Genişle veya saldır
  tryExpandOrAttack(state, bot, actions);
}

export interface BotActions {
  build: (q: number, r: number, type: BuildingType) => void;
  train: (castleQ: number, castleR: number, type: UnitType, count: number) => void;
  moveArmy: (fromQ: number, fromR: number, toQ: number, toR: number) => void;
}

function tryBuildSomething(state: GameState, bot: Player, actions: BotActions) {
  // Kale yoksa bir şey yapamaz
  if (!bot.castleCoord) return;

  // Sahip olduğu boş hex'lere bina kur
  const ownedTiles = bot.territory
    .map(c => state.map.get(hexKey(c.q, c.r)))
    .filter((t): t is HexTile => t !== undefined && t.building === null);

  if (ownedTiles.length === 0) return;

  // Öncelik: Farm > Mine > Lumbermill > Market > Barracks > Tower
  const priority: BuildingType[] = [
    BuildingType.Farm, BuildingType.Mine, BuildingType.Lumbermill,
    BuildingType.Market, BuildingType.Barracks, BuildingType.Tower,
  ];

  for (const buildType of priority) {
    const cost = BUILDING_COSTS[buildType];
    if (canAfford(bot, cost)) {
      // En uygun hex'i seç
      const bestTile = pickBestTileForBuilding(ownedTiles, buildType);
      if (bestTile) {
        actions.build(bestTile.coord.q, bestTile.coord.r, buildType);
        return; // Tur başına 1 bina
      }
    }
  }
}

function tryTrainUnits(state: GameState, bot: Player, actions: BotActions) {
  if (!bot.castleCoord) return;
  const castleKey = hexKey(bot.castleCoord.q, bot.castleCoord.r);
  const castleTile = state.map.get(castleKey);
  if (!castleTile?.building || castleTile.building.type !== BuildingType.Castle) return;

  // Kışla var mı kontrol et
  const hasBarracks = bot.territory.some(c => {
    const t = state.map.get(hexKey(c.q, c.r));
    return t?.building?.type === BuildingType.Barracks;
  });

  // Temel birim: Warrior
  const unitType = hasBarracks ? UnitType.Warrior : UnitType.Scout;
  const cost = UNIT_STATS[unitType].cost;

  if (canAfford(bot, cost)) {
    actions.train(bot.castleCoord.q, bot.castleCoord.r, unitType, 2);
  }
}

function tryExpandOrAttack(state: GameState, bot: Player, actions: BotActions) {
  // Ordusu olan hex'leri bul
  for (const coord of bot.territory) {
    const tile = state.map.get(hexKey(coord.q, coord.r));
    if (!tile?.army || tile.army.ownerId !== bot.id) continue;

    const neighbors = getNeighbors(coord);
    // Boş komşu hex → genişle
    const emptyNeighbor = neighbors.find(n => {
      const nt = state.map.get(hexKey(n.q, n.r));
      return nt && nt.ownerId === null;
    });

    if (emptyNeighbor) {
      actions.moveArmy(coord.q, coord.r, emptyNeighbor.q, emptyNeighbor.r);
      return;
    }

    // Düşman komşu → saldır (güç yeterliyse)
    const enemyNeighbor = neighbors.find(n => {
      const nt = state.map.get(hexKey(n.q, n.r));
      return nt && nt.ownerId !== null && nt.ownerId !== bot.id;
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
  // Terrain'e göre en uygun hex
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
