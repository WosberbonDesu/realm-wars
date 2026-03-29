import { create } from 'zustand';
import {
  GameState, GamePhase, Player, HexTile, HexCoord,
  BuildingType, UnitType, Building, Army, Unit, Resources,
  TechId, HeroState,
  hexKey,
} from '../types/game';
import { generateMap, findStartPositions } from '../engine/mapGenerator';
import { simulateBattle, BattleResult } from '../engine/combat';
import { botTakeTurn, BotActions } from '../engine/botAI';
import { hexesInRange, getNeighbors } from '../engine/hexUtils';
import {
  MAP_RADIUS, STARTING_RESOURCES, PLAYER_COLORS, BOT_NAMES,
  BUILDING_COSTS, BUILDING_HEALTH, BUILDING_PRODUCTION,
  UNIT_STATS, VISIBILITY_RANGE, SCOUT_VISIBILITY_RANGE,
  MAX_BUILDING_LEVEL, UPGRADE_COST_MULTIPLIER,
  UPGRADE_PRODUCTION_MULTIPLIER, UPGRADE_HEALTH_MULTIPLIER,
} from '../constants/game';
import { TERRAIN_BUILDABLE } from '../constants/terrain';
import { saveGame, loadGame } from '../services/saveService';
import { TECH_TREE, BASE_UNITS } from '../constants/tech';
import { rollEvent, applyEvent } from '../engine/events';
import { GameEvent } from '../constants/events';
import { HEROES, HeroId } from '../constants/heroes';

// ===== HELPER FUNCTIONS =====

function cloneResources(r: Resources): Resources {
  return { gold: r.gold, iron: r.iron, food: r.food, wood: r.wood, stone: r.stone };
}

function subtractResources(player: Resources, cost: Partial<Resources>): Resources {
  return {
    gold: player.gold - (cost.gold ?? 0),
    iron: player.iron - (cost.iron ?? 0),
    food: player.food - (cost.food ?? 0),
    wood: player.wood - (cost.wood ?? 0),
    stone: player.stone - (cost.stone ?? 0),
  };
}

function canAfford(player: Resources, cost: Partial<Resources>): boolean {
  return (
    player.gold >= (cost.gold ?? 0) &&
    player.iron >= (cost.iron ?? 0) &&
    player.food >= (cost.food ?? 0) &&
    player.wood >= (cost.wood ?? 0) &&
    player.stone >= (cost.stone ?? 0)
  );
}

function addResources(base: Resources, add: Partial<Resources>): Resources {
  return {
    gold: base.gold + (add.gold ?? 0),
    iron: base.iron + (add.iron ?? 0),
    food: base.food + (add.food ?? 0),
    wood: base.wood + (add.wood ?? 0),
    stone: base.stone + (add.stone ?? 0),
  };
}

function calculateTotalPower(units: Unit[]): number {
  return units.reduce((sum, u) => sum + (u.attack + u.defense) * u.count, 0);
}

// ===== STORE ACTIONS INTERFACE =====

export interface GameActions {
  // Oyun başlatma
  initGame: (playerName: string, botCount: number) => void;

  // Hex seçimi
  selectHex: (coord: HexCoord | null) => void;

  // Bina inşa
  buildStructure: (coord: HexCoord, type: BuildingType) => boolean;

  // Bina yükselt
  upgradeBuilding: (coord: HexCoord) => boolean;
  getUpgradeCost: (coord: HexCoord) => Partial<Resources> | null;

  // Birim eğit
  trainUnit: (castleCoord: HexCoord, type: UnitType, count: number) => boolean;

  // Ordu hareketi
  moveArmy: (from: HexCoord, to: HexCoord) => BattleResult | null;

  // Tur bitir
  endTurn: () => void;

  // Fog of war güncelle
  updateVisibility: (playerId: string) => void;

  // Oyun durumu
  pauseGame: () => void;
  resumeGame: () => void;

  // Mevcut oyuncu bilgisi
  getCurrentPlayer: () => Player | undefined;

  // Hex'te yapılabilecek binaları getir
  getBuildableTypes: (coord: HexCoord) => BuildingType[];

  // Ordu hareketi modu
  enterMoveMode: (from: HexCoord) => void;
  exitMoveMode: () => void;

  // Save/Load
  saveCurrentGame: () => Promise<void>;
  loadSavedGame: () => Promise<boolean>;

  // Gelir hesapla
  calculateIncome: (playerId: string) => Resources;

  // Aksiyon logu
  actionLog: { id: string; text: string; color: string; icon: string }[];
  clearActionLog: () => void;

  // Teknoloji
  startResearch: (techId: TechId) => boolean;
  getAvailableTechs: (playerId: string) => TechId[];
  getUnlockedUnits: (playerId: string) => UnitType[];

  // Kahramanlar
  hireHero: (heroId: HeroId) => boolean;
  assignHero: (heroId: string, hexCoord: HexCoord | null) => void;
}

export type GameStore = GameState & GameActions;

// ===== INITIAL STATE =====

const initialState: GameState = {
  map: new Map(),
  mapRadius: MAP_RADIUS,
  players: [],
  currentPlayerId: '',
  turn: 1,
  phase: GamePhase.Setup,
  selectedHex: null,
  isPaused: false,
  moveMode: false,
  moveFrom: null,
  moveTargets: [],
  actionLog: [],
  pendingEvent: null,
};

// ===== STORE =====

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  // ─── OYUN BAŞLATMA ───
  initGame: (playerName: string, botCount: number) => {
    const seed = Date.now();
    const map = generateMap(seed, MAP_RADIUS);
    const totalPlayers = 1 + botCount;
    const startPositions = findStartPositions(map, totalPlayers, MAP_RADIUS);

    // Oyuncuları oluştur
    const players: Player[] = [];

    // İnsan oyuncu
    const humanPlayer: Player = {
      id: 'player-0',
      name: playerName,
      color: PLAYER_COLORS[0],
      isBot: false,
      resources: cloneResources(STARTING_RESOURCES),
      territory: [],
      castleCoord: null,
      researchedTechs: [],
      currentResearch: null,
      heroes: [],
    };
    players.push(humanPlayer);

    // Bot oyuncular
    for (let i = 0; i < botCount; i++) {
      const botPlayer: Player = {
        id: `bot-${i + 1}`,
        name: BOT_NAMES[i] || `Bot ${i + 1}`,
        color: PLAYER_COLORS[i + 1] || '#888888',
        isBot: true,
        resources: cloneResources(STARTING_RESOURCES),
        territory: [],
        castleCoord: null,
        researchedTechs: [],
        currentResearch: null,
        heroes: [],
      };
      players.push(botPlayer);
    }

    // Her oyuncuya başlangıç kalesi ve toprak ver
    for (let i = 0; i < players.length; i++) {
      const pos = startPositions[i];
      const key = hexKey(pos.q, pos.r);
      const tile = map.get(key);
      if (!tile) continue;

      // Kale yerleştir
      const castle: Building = {
        type: BuildingType.Castle,
        level: 1,
        ownerId: players[i].id,
        health: BUILDING_HEALTH[BuildingType.Castle],
        maxHealth: BUILDING_HEALTH[BuildingType.Castle],
        productionPerTick: BUILDING_PRODUCTION[BuildingType.Castle],
      };
      tile.building = castle;
      tile.ownerId = players[i].id;
      players[i].castleCoord = { q: pos.q, r: pos.r };
      players[i].territory.push({ q: pos.q, r: pos.r });

      // Başlangıç ordusu
      const startArmy: Army = {
        ownerId: players[i].id,
        units: [
          {
            type: UnitType.Warrior,
            count: 5,
            attack: UNIT_STATS[UnitType.Warrior].attack,
            defense: UNIT_STATS[UnitType.Warrior].defense,
            health: UNIT_STATS[UnitType.Warrior].health,
            speed: UNIT_STATS[UnitType.Warrior].speed,
          },
          {
            type: UnitType.Scout,
            count: 2,
            attack: UNIT_STATS[UnitType.Scout].attack,
            defense: UNIT_STATS[UnitType.Scout].defense,
            health: UNIT_STATS[UnitType.Scout].health,
            speed: UNIT_STATS[UnitType.Scout].speed,
          },
        ],
        totalPower: 0,
      };
      startArmy.totalPower = calculateTotalPower(startArmy.units);
      tile.army = startArmy;

      // Komşu hex'leri de toprak olarak ekle
      const neighbors = getNeighbors({ q: pos.q, r: pos.r });
      for (const n of neighbors) {
        const nKey = hexKey(n.q, n.r);
        const nTile = map.get(nKey);
        if (nTile && nTile.ownerId === null) {
          nTile.ownerId = players[i].id;
          players[i].territory.push({ q: n.q, r: n.r });
        }
      }
    }

    // State güncelle
    set({
      map: new Map(map),
      mapRadius: MAP_RADIUS,
      players,
      currentPlayerId: players[0].id,
      turn: 1,
      phase: GamePhase.Playing,
      selectedHex: null,
      isPaused: false,
      moveMode: false,
      moveFrom: null,
      moveTargets: [],
      actionLog: [],
      pendingEvent: null,
    });

    // İnsan oyuncu için görünürlük aç
    get().updateVisibility(players[0].id);
  },

  // ─── HEX SEÇİMİ ───
  selectHex: (coord: HexCoord | null) => {
    set({ selectedHex: coord });
  },

  // ─── BİNA İNŞA ───
  buildStructure: (coord: HexCoord, type: BuildingType): boolean => {
    const state = get();
    const key = hexKey(coord.q, coord.r);
    const tile = state.map.get(key);
    const player = state.players.find(p => p.id === state.currentPlayerId);

    if (!tile || !player) return false;
    if (tile.ownerId !== player.id) return false;
    if (tile.building !== null) return false;

    // Terrain kontrolü
    const allowed = TERRAIN_BUILDABLE[tile.terrain];
    if (!allowed.includes(type)) return false;

    // Maliyet kontrolü
    const cost = BUILDING_COSTS[type];
    if (!canAfford(player.resources, cost)) return false;

    // Bina oluştur
    const building: Building = {
      type,
      level: 1,
      ownerId: player.id,
      health: BUILDING_HEALTH[type],
      maxHealth: BUILDING_HEALTH[type],
      productionPerTick: BUILDING_PRODUCTION[type],
    };

    // Map güncelle
    const newMap = new Map(state.map);
    const newTile = { ...tile, building };
    newMap.set(key, newTile);

    // Kaynak düş
    const newPlayers = state.players.map(p =>
      p.id === player.id
        ? { ...p, resources: subtractResources(p.resources, cost) }
        : p
    );

    set({ map: newMap, players: newPlayers });
    return true;
  },

  // ─── BİNA YÜKSELT ───
  upgradeBuilding: (coord: HexCoord): boolean => {
    const state = get();
    const key = hexKey(coord.q, coord.r);
    const tile = state.map.get(key);
    const player = state.players.find(p => p.id === state.currentPlayerId);

    if (!tile || !player || !tile.building) return false;
    if (tile.building.ownerId !== player.id) return false;
    if (tile.building.level >= MAX_BUILDING_LEVEL) return false;

    const nextLevel = tile.building.level + 1;
    const baseCost = BUILDING_COSTS[tile.building.type];
    const multiplier = UPGRADE_COST_MULTIPLIER[nextLevel] ?? 2;

    // Yükseltme maliyeti
    const cost: Partial<Resources> = {};
    for (const [res, val] of Object.entries(baseCost)) {
      cost[res as keyof Resources] = Math.ceil((val as number) * multiplier);
    }

    if (!canAfford(player.resources, cost)) return false;

    // Yeni üretim değerleri
    const baseProduction = BUILDING_PRODUCTION[tile.building.type];
    const prodMultiplier = UPGRADE_PRODUCTION_MULTIPLIER[nextLevel] ?? 1;
    const newProduction: Partial<Resources> = {};
    for (const [res, val] of Object.entries(baseProduction)) {
      newProduction[res as keyof Resources] = Math.ceil((val as number) * prodMultiplier);
    }

    // Yeni HP
    const healthMultiplier = UPGRADE_HEALTH_MULTIPLIER[nextLevel] ?? 1;
    const newMaxHealth = Math.ceil(BUILDING_HEALTH[tile.building.type] * healthMultiplier);

    // Bina güncelle
    const upgradedBuilding: Building = {
      ...tile.building,
      level: nextLevel,
      health: newMaxHealth,
      maxHealth: newMaxHealth,
      productionPerTick: newProduction,
    };

    const newMap = new Map(state.map);
    newMap.set(key, { ...tile, building: upgradedBuilding });

    const newPlayers = state.players.map(p =>
      p.id === player.id
        ? { ...p, resources: subtractResources(p.resources, cost) }
        : p
    );

    set({ map: newMap, players: newPlayers });
    return true;
  },

  getUpgradeCost: (coord: HexCoord): Partial<Resources> | null => {
    const state = get();
    const key = hexKey(coord.q, coord.r);
    const tile = state.map.get(key);

    if (!tile?.building) return null;
    if (tile.building.level >= MAX_BUILDING_LEVEL) return null;

    const nextLevel = tile.building.level + 1;
    const baseCost = BUILDING_COSTS[tile.building.type];
    const multiplier = UPGRADE_COST_MULTIPLIER[nextLevel] ?? 2;

    const cost: Partial<Resources> = {};
    for (const [res, val] of Object.entries(baseCost)) {
      cost[res as keyof Resources] = Math.ceil((val as number) * multiplier);
    }
    return cost;
  },

  // ─── BİRİM EĞİT ───
  trainUnit: (castleCoord: HexCoord, type: UnitType, count: number): boolean => {
    const state = get();
    const key = hexKey(castleCoord.q, castleCoord.r);
    const tile = state.map.get(key);
    const player = state.players.find(p => p.id === state.currentPlayerId);

    if (!tile || !player) return false;
    if (!tile.building || tile.building.type !== BuildingType.Castle) return false;
    if (tile.building.ownerId !== player.id) return false;

    // Maliyet hesapla (birim başına × adet)
    const unitCost = UNIT_STATS[type].cost;
    const totalCost: Partial<Resources> = {};
    for (const [res, val] of Object.entries(unitCost)) {
      totalCost[res as keyof Resources] = (val as number) * count;
    }

    if (!canAfford(player.resources, totalCost)) return false;

    // Yeni birim oluştur
    const stats = UNIT_STATS[type];
    const newUnit: Unit = {
      type,
      count,
      attack: stats.attack,
      defense: stats.defense,
      health: stats.health,
      speed: stats.speed,
    };

    // Mevcut orduya ekle veya yeni ordu oluştur
    const newMap = new Map(state.map);
    const newTile = { ...tile };

    if (newTile.army && newTile.army.ownerId === player.id) {
      const existingUnit = newTile.army.units.find(u => u.type === type);
      let newUnits: Unit[];
      if (existingUnit) {
        newUnits = newTile.army.units.map(u =>
          u.type === type ? { ...u, count: u.count + count } : u
        );
      } else {
        newUnits = [...newTile.army.units, newUnit];
      }
      newTile.army = {
        ownerId: player.id,
        units: newUnits,
        totalPower: calculateTotalPower(newUnits),
      };
    } else {
      newTile.army = {
        ownerId: player.id,
        units: [newUnit],
        totalPower: calculateTotalPower([newUnit]),
      };
    }

    newMap.set(key, newTile);

    const newPlayers = state.players.map(p =>
      p.id === player.id
        ? { ...p, resources: subtractResources(p.resources, totalCost) }
        : p
    );

    set({ map: newMap, players: newPlayers });
    return true;
  },

  // ─── ORDU HAREKETİ ───
  moveArmy: (from: HexCoord, to: HexCoord): BattleResult | null => {
    const state = get();
    const fromKey = hexKey(from.q, from.r);
    const toKey = hexKey(to.q, to.r);
    const fromTile = state.map.get(fromKey);
    const toTile = state.map.get(toKey);

    if (!fromTile?.army || !toTile) return null;
    if (fromTile.army.ownerId !== state.currentPlayerId) return null;

    // Komşu mu kontrol et
    const neighbors = getNeighbors(from);
    const isNeighbor = neighbors.some(n => n.q === to.q && n.r === to.r);
    if (!isNeighbor) return null;

    const newMap = new Map(state.map);
    const newFromTile = { ...fromTile, army: null as Army | null };
    const newToTile = { ...toTile };
    let battleResult: BattleResult | null = null;

    // Hedefte düşman ordusu var mı?
    if (newToTile.army && newToTile.army.ownerId !== state.currentPlayerId) {
      // SAVAŞ!
      battleResult = simulateBattle(fromTile.army, newToTile.army, newToTile.terrain);

      if (battleResult.winner === 'attacker') {
        // Saldırgan kazandı → hex'i ele geçir
        const survivorArmy: Army = {
          ownerId: state.currentPlayerId,
          units: battleResult.attackerSurvivors,
          totalPower: calculateTotalPower(battleResult.attackerSurvivors),
        };
        newToTile.army = survivorArmy;

        // Toprak el değiştirsin
        const oldOwner = newToTile.ownerId;
        newToTile.ownerId = state.currentPlayerId;

        // Bina yıkılsın
        if (newToTile.building && newToTile.building.ownerId !== state.currentPlayerId) {
          newToTile.building = null;
        }

        // Oyuncu territory güncelle
        const newPlayers = state.players.map(p => {
          if (p.id === state.currentPlayerId) {
            return {
              ...p,
              territory: [...p.territory, { q: to.q, r: to.r }],
            };
          }
          if (p.id === oldOwner) {
            return {
              ...p,
              territory: p.territory.filter(t => !(t.q === to.q && t.r === to.r)),
              // Kale düştüyse oyuncu elenir
              castleCoord:
                p.castleCoord?.q === to.q && p.castleCoord?.r === to.r
                  ? null
                  : p.castleCoord,
            };
          }
          return p;
        });

        set({ players: newPlayers });
      } else {
        // Savunmacı kazandı → saldırgan ordusu yok olur
        newToTile.army = {
          ownerId: newToTile.army.ownerId,
          units: battleResult.defenderSurvivors,
          totalPower: calculateTotalPower(battleResult.defenderSurvivors),
        };
      }
    } else if (newToTile.army && newToTile.army.ownerId === state.currentPlayerId) {
      // Kendi ordumuzla birleş
      const mergedUnits: Unit[] = [...newToTile.army.units];
      for (const unit of fromTile.army.units) {
        const existing = mergedUnits.find(u => u.type === unit.type);
        if (existing) {
          existing.count += unit.count;
        } else {
          mergedUnits.push({ ...unit });
        }
      }
      newToTile.army = {
        ownerId: state.currentPlayerId,
        units: mergedUnits,
        totalPower: calculateTotalPower(mergedUnits),
      };
    } else {
      // Boş hex → orduyu taşı
      newToTile.army = { ...fromTile.army };

      // Sahipsiz hex'i ele geçir
      if (newToTile.ownerId === null) {
        newToTile.ownerId = state.currentPlayerId;
        const newPlayers = state.players.map(p =>
          p.id === state.currentPlayerId
            ? { ...p, territory: [...p.territory, { q: to.q, r: to.r }] }
            : p
        );
        set({ players: newPlayers });
      }
    }

    newMap.set(fromKey, newFromTile);
    newMap.set(toKey, newToTile);
    set({ map: newMap });

    // Görünürlük güncelle
    get().updateVisibility(state.currentPlayerId);

    // Oyun bitti mi kontrol et
    checkGameOver(get, set);

    return battleResult;
  },

  // ─── TUR BİTİR ───
  endTurn: () => {
    const state = get();
    if (state.phase !== GamePhase.Playing) return;

    // 1. Mevcut oyuncunun kaynak üretimi
    collectResources(state, set);

    // 1.5 Araştırma ilerlet
    tickResearch(get, set);

    // 1.6 Rastgele olay
    triggerRandomEvent(get, set);

    // 2. Sıradaki oyuncuyu bul
    const currentIndex = state.players.findIndex(p => p.id === state.currentPlayerId);
    let nextIndex = (currentIndex + 1) % state.players.length;

    // Elenmiş oyuncuları atla (kalesi olmayan)
    let attempts = 0;
    while (attempts < state.players.length) {
      const nextPlayer = state.players[nextIndex];
      if (nextPlayer.castleCoord !== null) break;
      nextIndex = (nextIndex + 1) % state.players.length;
      attempts++;
    }

    const isNewRound = nextIndex <= currentIndex;
    const newTurn = isNewRound ? state.turn + 1 : state.turn;

    set({
      currentPlayerId: state.players[nextIndex].id,
      turn: newTurn,
      selectedHex: null,
      moveMode: false,
      moveFrom: null,
      moveTargets: [],
    });

    // 3. Eğer sıradaki bot ise, bot turunu oyna
    const nextPlayer = get().players[nextIndex];
    if (nextPlayer.isBot && nextPlayer.castleCoord !== null) {
      executeBotTurn(get, set);
      // Bot turunu bitir, bir sonrakine geç
      get().endTurn();
    } else {
      // İnsan oyuncunun görünürlüğünü güncelle
      get().updateVisibility(nextPlayer.id);
    }
  },

  // ─── FOG OF WAR ───
  updateVisibility: (playerId: string) => {
    const state = get();
    const player = state.players.find(p => p.id === playerId);
    if (!player) return;

    const newMap = new Map(state.map);

    // Önce tüm hex'lerin visible'ını false yap (explored kalır)
    for (const [key, tile] of newMap) {
      newMap.set(key, { ...tile, visible: false });
    }

    // Oyuncunun toprakları ve ordularından görünürlük aç
    const visibleKeys = new Set<string>();

    for (const coord of player.territory) {
      const range = VISIBILITY_RANGE;
      const hexes = hexesInRange(coord, range);
      for (const h of hexes) {
        visibleKeys.add(hexKey(h.q, h.r));
      }
    }

    // Ordulardan ekstra görüş (scout bonus)
    for (const [key, tile] of newMap) {
      if (tile.army?.ownerId === playerId) {
        const hasScout = tile.army.units.some(u => u.type === UnitType.Scout);
        const range = hasScout ? SCOUT_VISIBILITY_RANGE : VISIBILITY_RANGE;
        const hexes = hexesInRange(tile.coord, range);
        for (const h of hexes) {
          visibleKeys.add(hexKey(h.q, h.r));
        }
      }
    }

    // Görünür hex'leri işaretle
    for (const key of visibleKeys) {
      const tile = newMap.get(key);
      if (tile) {
        newMap.set(key, { ...tile, visible: true, explored: true });
      }
    }

    set({ map: newMap });
  },

  // ─── PAUSE/RESUME ───
  pauseGame: () => set({ isPaused: true }),
  resumeGame: () => set({ isPaused: false }),

  // ─── YARDIMCI ───
  getCurrentPlayer: () => {
    const state = get();
    return state.players.find(p => p.id === state.currentPlayerId);
  },

  getBuildableTypes: (coord: HexCoord): BuildingType[] => {
    const state = get();
    const key = hexKey(coord.q, coord.r);
    const tile = state.map.get(key);
    const player = state.players.find(p => p.id === state.currentPlayerId);

    if (!tile || !player) return [];
    if (tile.ownerId !== player.id) return [];
    if (tile.building !== null) return [];

    const allowed = TERRAIN_BUILDABLE[tile.terrain];
    // Castle sadece bir tane olabilir (zaten var)
    return allowed.filter(type => {
      if (type === BuildingType.Castle) return false;
      return canAfford(player.resources, BUILDING_COSTS[type]);
    });
  },

  // ─── ORDU HAREKETİ MODU ───
  enterMoveMode: (from: HexCoord) => {
    const state = get();
    const key = hexKey(from.q, from.r);
    const tile = state.map.get(key);

    if (!tile?.army || tile.army.ownerId !== state.currentPlayerId) return;

    // Komşu hex'leri hareket hedefi olarak belirle
    const neighbors = getNeighbors(from);
    const targets = neighbors.filter(n => {
      const nKey = hexKey(n.q, n.r);
      const nTile = state.map.get(nKey);
      if (!nTile) return false;
      // Kendi binamız olan (ordusu olmayan) veya boş veya düşman hex'e gidilebilir
      if (nTile.army && nTile.army.ownerId === state.currentPlayerId) return true; // birleşme
      return true;
    });

    set({ moveMode: true, moveFrom: from, moveTargets: targets });
  },

  exitMoveMode: () => {
    set({ moveMode: false, moveFrom: null, moveTargets: [] });
  },

  // ─── AKSIYON LOGU ───
  actionLog: [],
  clearActionLog: () => set({ actionLog: [] }),

  // ─── SAVE / LOAD ───
  saveCurrentGame: async () => {
    const state = get();
    await saveGame(state);
  },

  loadSavedGame: async (): Promise<boolean> => {
    const loaded = await loadGame();
    if (!loaded) return false;
    set(loaded);
    // Gorunurluk guncelle
    get().updateVisibility(loaded.currentPlayerId);
    return true;
  },

  // ─── GELİR HESAPLA ───
  calculateIncome: (playerId: string): Resources => {
    const state = get();
    const player = state.players.find(p => p.id === playerId);
    if (!player) return { gold: 0, iron: 0, food: 0, wood: 0, stone: 0 };

    const income: Resources = { gold: 0, iron: 0, food: 0, wood: 0, stone: 0 };
    for (const coord of player.territory) {
      const tile = state.map.get(hexKey(coord.q, coord.r));
      if (tile?.building && tile.building.ownerId === playerId) {
        income.gold += tile.building.productionPerTick.gold ?? 0;
        income.iron += tile.building.productionPerTick.iron ?? 0;
        income.food += tile.building.productionPerTick.food ?? 0;
        income.wood += tile.building.productionPerTick.wood ?? 0;
        income.stone += tile.building.productionPerTick.stone ?? 0;
      }
    }
    return income;
  },

  // ─── TEKNOLOJİ ───
  startResearch: (techId: TechId): boolean => {
    const state = get();
    const player = state.players.find(p => p.id === state.currentPlayerId);
    if (!player) return false;

    // Zaten araştırılmış mı?
    if (player.researchedTechs.includes(techId)) return false;

    // Zaten araştırma var mı?
    if (player.currentResearch) return false;

    const tech = TECH_TREE[techId];
    if (!tech) return false;

    // Ön koşullar karşılanmış mı?
    for (const prereq of tech.prerequisites) {
      if (!player.researchedTechs.includes(prereq)) return false;
    }

    // Maliyet kontrolü
    if (!canAfford(player.resources, tech.cost)) return false;

    // Kaynağı düş ve araştırmayı başlat
    const newPlayers = state.players.map(p =>
      p.id === player.id
        ? {
            ...p,
            resources: subtractResources(p.resources, tech.cost),
            currentResearch: { techId, turnsLeft: tech.researchTurns },
          }
        : p
    );
    set({ players: newPlayers });
    return true;
  },

  getAvailableTechs: (playerId: string): TechId[] => {
    const state = get();
    const player = state.players.find(p => p.id === playerId);
    if (!player) return [];

    return Object.values(TechId).filter(techId => {
      if (player.researchedTechs.includes(techId)) return false;
      if (player.currentResearch?.techId === techId) return false;
      const tech = TECH_TREE[techId];
      return tech.prerequisites.every(p => player.researchedTechs.includes(p));
    });
  },

  getUnlockedUnits: (playerId: string): UnitType[] => {
    const state = get();
    const player = state.players.find(p => p.id === playerId);
    if (!player) return [...BASE_UNITS];

    const unlocked = new Set<UnitType>(BASE_UNITS);
    for (const techId of player.researchedTechs) {
      const tech = TECH_TREE[techId];
      if (tech.unlocks.units) {
        for (const u of tech.unlocks.units) unlocked.add(u);
      }
    }
    return Array.from(unlocked);
  },

  // ─── KAHRAMANLAR ───
  hireHero: (heroId: HeroId): boolean => {
    const state = get();
    const player = state.players.find(p => p.id === state.currentPlayerId);
    if (!player) return false;

    const hero = HEROES[heroId];
    if (!hero) return false;

    // Zaten var mı?
    if (player.heroes.some(h => h.heroId === heroId)) return false;

    // Maliyet kontrolü
    if (!canAfford(player.resources, hero.cost)) return false;

    const newHero: HeroState = {
      heroId,
      assignedArmyHex: null,
      abilityCooldown: 0,
      isDisabled: false,
    };

    const newPlayers = state.players.map(p =>
      p.id === player.id
        ? {
            ...p,
            resources: subtractResources(p.resources, hero.cost),
            heroes: [...p.heroes, newHero],
          }
        : p
    );
    set({ players: newPlayers });
    return true;
  },

  assignHero: (heroId: string, hexCoord: HexCoord | null) => {
    const state = get();
    const player = state.players.find(p => p.id === state.currentPlayerId);
    if (!player) return;

    // Hedef hex'te ordu var mı kontrol et
    if (hexCoord) {
      const key = hexKey(hexCoord.q, hexCoord.r);
      const tile = state.map.get(key);
      if (!tile?.army || tile.army.ownerId !== player.id) return;
    }

    const newPlayers = state.players.map(p =>
      p.id === player.id
        ? {
            ...p,
            heroes: p.heroes.map(h =>
              h.heroId === heroId
                ? { ...h, assignedArmyHex: hexCoord }
                : h
            ),
          }
        : p
    );
    set({ players: newPlayers });
  },
}));

// ===== ARAŞTIRMA İLERLET =====

function tickResearch(
  get: () => GameStore,
  set: (partial: Partial<GameState>) => void
) {
  const state = get();
  const player = state.players.find(p => p.id === state.currentPlayerId);
  if (!player?.currentResearch) return;

  const { techId, turnsLeft } = player.currentResearch;

  if (turnsLeft <= 1) {
    // Araştırma tamamlandı
    const newPlayers = state.players.map(p =>
      p.id === player.id
        ? {
            ...p,
            researchedTechs: [...p.researchedTechs, techId],
            currentResearch: null,
          }
        : p
    );
    set({ players: newPlayers });

    // Log ekle
    const tech = TECH_TREE[techId];
    const currentLogs = get().actionLog;
    set({
      actionLog: [...currentLogs, {
        id: `research-${Date.now()}`,
        text: `${tech.name} arastirmasi tamamlandi!`,
        color: player.color,
        icon: tech.icon,
      }],
    });
  } else {
    // Bir tur ilerlet
    const newPlayers = state.players.map(p =>
      p.id === player.id
        ? {
            ...p,
            currentResearch: { techId, turnsLeft: turnsLeft - 1 },
          }
        : p
    );
    set({ players: newPlayers });
  }
}

// ===== KAYNAK TOPLAMA =====

function collectResources(
  state: GameState,
  set: (partial: Partial<GameState>) => void
) {
  const player = state.players.find(p => p.id === state.currentPlayerId);
  if (!player) return;

  let income: Partial<Resources> = {};

  // Binalardan üretim
  for (const coord of player.territory) {
    const tile = state.map.get(hexKey(coord.q, coord.r));
    if (tile?.building && tile.building.ownerId === player.id) {
      income = {
        gold: (income.gold ?? 0) + (tile.building.productionPerTick.gold ?? 0),
        iron: (income.iron ?? 0) + (tile.building.productionPerTick.iron ?? 0),
        food: (income.food ?? 0) + (tile.building.productionPerTick.food ?? 0),
        wood: (income.wood ?? 0) + (tile.building.productionPerTick.wood ?? 0),
        stone: (income.stone ?? 0) + (tile.building.productionPerTick.stone ?? 0),
      };
    }
  }

  const newPlayers = state.players.map(p =>
    p.id === player.id
      ? { ...p, resources: addResources(p.resources, income) }
      : p
  );

  set({ players: newPlayers });
}

// ===== BOT TURU =====

function executeBotTurn(
  get: () => GameStore,
  set: (partial: Partial<GameState>) => void
) {
  const state = get();
  const bot = state.players.find(p => p.id === state.currentPlayerId);
  if (!bot || !bot.isBot) return;

  // Önce bot'un kaynaklarını topla
  collectResources(state, set);

  const logs: { id: string; text: string; color: string; icon: string }[] = [];
  let logId = 0;

  const actions: BotActions = {
    build: (q, r, type) => {
      get().buildStructure({ q, r }, type);
      logs.push({
        id: `${bot.id}-${logId++}`,
        text: `${bot.name} ${type} insa etti`,
        color: bot.color,
        icon: '🏗️',
      });
    },
    train: (castleQ, castleR, type, count) => {
      get().trainUnit({ q: castleQ, r: castleR }, type, count);
      logs.push({
        id: `${bot.id}-${logId++}`,
        text: `${bot.name} ${count}x ${type} egitti`,
        color: bot.color,
        icon: '⚔️',
      });
    },
    moveArmy: (fromQ, fromR, toQ, toR) => {
      const result = get().moveArmy({ q: fromQ, r: fromR }, { q: toQ, r: toR });
      if (result) {
        logs.push({
          id: `${bot.id}-${logId++}`,
          text: `${bot.name} saldirdi! ${result.winner === 'attacker' ? 'Kazandi' : 'Kaybetti'}`,
          color: bot.color,
          icon: '💥',
        });
      } else {
        logs.push({
          id: `${bot.id}-${logId++}`,
          text: `${bot.name} ordusunu tasidi`,
          color: bot.color,
          icon: '🚩',
        });
      }
    },
  };

  botTakeTurn(get(), bot, actions);

  // Logları mevcut loglara ekle
  const currentLogs = get().actionLog;
  set({ actionLog: [...currentLogs, ...logs] });
}

// ===== OYUN BİTTİ Mİ KONTROL =====

function checkGameOver(
  get: () => GameStore,
  set: (partial: Partial<GameState>) => void
) {
  const state = get();
  const alivePlayers = state.players.filter(p => p.castleCoord !== null);

  if (alivePlayers.length <= 1) {
    set({ phase: GamePhase.GameOver });
  }
}

// ===== RASTGELE OLAY =====

function triggerRandomEvent(
  get: () => GameStore,
  set: (partial: Partial<GameState>) => void
) {
  const state = get();
  const player = state.players.find(p => p.id === state.currentPlayerId);
  if (!player || player.isBot) return; // Sadece insan oyuncuya olay gelsin

  const event = rollEvent();
  if (!event) return;

  // Oyuncunun ordularını topla (unit_loss için)
  const armyTiles: { key: string; army: import('../types/game').Army }[] = [];
  for (const coord of player.territory) {
    const k = hexKey(coord.q, coord.r);
    const tile = state.map.get(k);
    if (tile?.army && tile.army.ownerId === player.id) {
      armyTiles.push({ key: k, army: tile.army });
    }
  }

  const { updatedPlayer, updatedArmies } = applyEvent(player, event, armyTiles);

  // Oyuncuyu güncelle
  const newPlayers = state.players.map(p =>
    p.id === player.id ? updatedPlayer : p
  );

  // Orduları güncelle
  const newMap = new Map(state.map);
  for (const { key: k, army } of updatedArmies) {
    const tile = newMap.get(k);
    if (tile) {
      newMap.set(k, { ...tile, army });
    }
  }

  set({
    players: newPlayers,
    map: updatedArmies.length > 0 ? newMap : state.map,
    pendingEvent: {
      type: event.type,
      name: event.name,
      icon: event.icon,
      positive: event.positive,
    },
  });
}
