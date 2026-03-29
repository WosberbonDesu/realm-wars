import { Resources } from '../types/game';

export enum EventType {
  Treasure = 'treasure',
  Storm = 'storm',
  Rebellion = 'rebellion',
  Caravan = 'caravan',
  Plague = 'plague',
  GoldVein = 'gold_vein',
  Harvest = 'harvest',
  Bandits = 'bandits',
  Refugees = 'refugees',
  IronDeposit = 'iron_deposit',
}

export interface GameEvent {
  type: EventType;
  name: string;
  description: string;
  icon: string;
  // Efekt turleri
  effect:
    | { kind: 'resource_gain'; resources: Partial<Resources> }
    | { kind: 'resource_loss'; resources: Partial<Resources> }
    | { kind: 'unit_loss'; percentage: number }
    | { kind: 'production_boost'; multiplier: number; duration: number }
    | { kind: 'army_boost'; attackBonus: number; duration: number };
  // Olasılık ağırlığı (yüksek = daha sık)
  weight: number;
  // Pozitif mi negatif mi
  positive: boolean;
}

export const GAME_EVENTS: Record<EventType, GameEvent> = {
  [EventType.Treasure]: {
    type: EventType.Treasure,
    name: 'Gizli Hazine',
    description: 'Kasiflerin eski bir hazine buldular!',
    icon: '💎',
    effect: { kind: 'resource_gain', resources: { gold: 80, iron: 20 } },
    weight: 8,
    positive: true,
  },
  [EventType.Storm]: {
    type: EventType.Storm,
    name: 'Siddetli Firtina',
    description: 'Firtina ciftliklere hasar verdi.',
    icon: '🌩️',
    effect: { kind: 'resource_loss', resources: { food: 30, wood: 15 } },
    weight: 10,
    positive: false,
  },
  [EventType.Rebellion]: {
    type: EventType.Rebellion,
    name: 'Halk Isyani',
    description: 'Huzursuz halk isyan etti! Ordunun %10\'u kayboldu.',
    icon: '🔥',
    effect: { kind: 'unit_loss', percentage: 0.1 },
    weight: 5,
    positive: false,
  },
  [EventType.Caravan]: {
    type: EventType.Caravan,
    name: 'Ticaret Kervani',
    description: 'Gezgin tuccarlar krallginiza ulasti.',
    icon: '🐪',
    effect: { kind: 'resource_gain', resources: { gold: 50, food: 25, wood: 20 } },
    weight: 12,
    positive: true,
  },
  [EventType.Plague]: {
    type: EventType.Plague,
    name: 'Veba Salgini',
    description: 'Hastalik yayildi. Yiyecek stoklar azaldi.',
    icon: '☠️',
    effect: { kind: 'resource_loss', resources: { food: 50, gold: 20 } },
    weight: 4,
    positive: false,
  },
  [EventType.GoldVein]: {
    type: EventType.GoldVein,
    name: 'Altin Damari',
    description: 'Madenciler zengin bir altin damari kesfetti!',
    icon: '🪙',
    effect: { kind: 'resource_gain', resources: { gold: 120 } },
    weight: 6,
    positive: true,
  },
  [EventType.Harvest]: {
    type: EventType.Harvest,
    name: 'Bereketli Hasat',
    description: 'Bu sezon hasat muhtesem oldu!',
    icon: '🌽',
    effect: { kind: 'resource_gain', resources: { food: 60, wood: 15 } },
    weight: 10,
    positive: true,
  },
  [EventType.Bandits]: {
    type: EventType.Bandits,
    name: 'Eskiya Baskini',
    description: 'Eskiyalar kervanlarinizi yagmaladi!',
    icon: '🗡️',
    effect: { kind: 'resource_loss', resources: { gold: 40, iron: 15 } },
    weight: 8,
    positive: false,
  },
  [EventType.Refugees]: {
    type: EventType.Refugees,
    name: 'Multeciler',
    description: 'Savas kackinlari krallginiza sigindi. Yeni isciler!',
    icon: '👥',
    effect: { kind: 'resource_gain', resources: { food: -20, gold: 30, stone: 25 } },
    weight: 7,
    positive: true,
  },
  [EventType.IronDeposit]: {
    type: EventType.IronDeposit,
    name: 'Demir Yatagi',
    description: 'Yeni bir demir yatagi bulundu!',
    icon: '⚒️',
    effect: { kind: 'resource_gain', resources: { iron: 50, stone: 30 } },
    weight: 6,
    positive: true,
  },
};

// Olay tetiklenme sansi (her tur basi)
export const EVENT_CHANCE = 0.25; // %25 sans
