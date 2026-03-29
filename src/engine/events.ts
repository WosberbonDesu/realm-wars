import { Player, Resources, Army, Unit, hexKey } from '../types/game';
import {
  GAME_EVENTS, GameEvent, EventType, EVENT_CHANCE,
} from '../constants/events';

// Ağırlıklı rastgele olay seç
export function rollEvent(): GameEvent | null {
  if (Math.random() > EVENT_CHANCE) return null;

  const events = Object.values(GAME_EVENTS);
  const totalWeight = events.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const event of events) {
    roll -= event.weight;
    if (roll <= 0) return event;
  }

  return events[0];
}

// Olayı oyuncuya uygula
export function applyEvent(
  player: Player,
  event: GameEvent,
  armyTiles: { key: string; army: Army }[],
): {
  updatedPlayer: Player;
  updatedArmies: { key: string; army: Army | null }[];
} {
  let updatedPlayer = { ...player };
  const updatedArmies: { key: string; army: Army | null }[] = [];

  switch (event.effect.kind) {
    case 'resource_gain': {
      const res = event.effect.resources;
      updatedPlayer = {
        ...updatedPlayer,
        resources: {
          gold: Math.max(0, updatedPlayer.resources.gold + (res.gold ?? 0)),
          iron: Math.max(0, updatedPlayer.resources.iron + (res.iron ?? 0)),
          food: Math.max(0, updatedPlayer.resources.food + (res.food ?? 0)),
          wood: Math.max(0, updatedPlayer.resources.wood + (res.wood ?? 0)),
          stone: Math.max(0, updatedPlayer.resources.stone + (res.stone ?? 0)),
        },
      };
      break;
    }

    case 'resource_loss': {
      const res = event.effect.resources;
      updatedPlayer = {
        ...updatedPlayer,
        resources: {
          gold: Math.max(0, updatedPlayer.resources.gold - (res.gold ?? 0)),
          iron: Math.max(0, updatedPlayer.resources.iron - (res.iron ?? 0)),
          food: Math.max(0, updatedPlayer.resources.food - (res.food ?? 0)),
          wood: Math.max(0, updatedPlayer.resources.wood - (res.wood ?? 0)),
          stone: Math.max(0, updatedPlayer.resources.stone - (res.stone ?? 0)),
        },
      };
      break;
    }

    case 'unit_loss': {
      const pct = event.effect.percentage;
      for (const { key, army } of armyTiles) {
        const newUnits = army.units
          .map(u => ({
            ...u,
            count: Math.max(1, Math.round(u.count * (1 - pct))),
          }))
          .filter(u => u.count > 0);

        if (newUnits.length === 0) {
          updatedArmies.push({ key, army: null });
        } else {
          updatedArmies.push({
            key,
            army: {
              ...army,
              units: newUnits,
              totalPower: newUnits.reduce((s, u) => s + (u.attack + u.defense) * u.count, 0),
            },
          });
        }
      }
      break;
    }

    case 'production_boost': {
      // Uretim artisi: multiplier kadar kaynak bonusu (anlik)
      const boost = event.effect.multiplier;
      updatedPlayer = {
        ...updatedPlayer,
        resources: {
          gold: updatedPlayer.resources.gold + Math.round(20 * boost),
          iron: updatedPlayer.resources.iron + Math.round(10 * boost),
          food: updatedPlayer.resources.food + Math.round(15 * boost),
          wood: updatedPlayer.resources.wood + Math.round(15 * boost),
          stone: updatedPlayer.resources.stone + Math.round(10 * boost),
        },
      };
      break;
    }

    case 'army_boost': {
      // Ordu guclendirmesi: tum birimlerin saldiri gucunu artir
      const bonus = event.effect.attackBonus;
      for (const { key, army } of armyTiles) {
        const boostedUnits = army.units.map(u => ({
          ...u,
          attack: u.attack + bonus,
        }));
        updatedArmies.push({
          key,
          army: {
            ...army,
            units: boostedUnits,
            totalPower: boostedUnits.reduce((s, u) => s + (u.attack + u.defense) * u.count, 0),
          },
        });
      }
      break;
    }
  }

  return { updatedPlayer, updatedArmies };
}
