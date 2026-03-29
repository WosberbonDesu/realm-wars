import { Resources } from '../types/game';

export enum HeroId {
  Warlord = 'warlord',
  Ranger = 'ranger',
  Marshal = 'marshal',
  Sage = 'sage',
  Blacksmith = 'blacksmith',
  Shadow = 'shadow',
}

export interface HeroDefinition {
  id: HeroId;
  name: string;
  title: string;
  icon: string;
  cost: Partial<Resources>;
  // Pasif bonuslar
  passives: HeroPassive[];
  // Aktif yetenek
  ability: HeroAbility;
  // Baslik statları
  attackBonus: number;
  defenseBonus: number;
  speedBonus: number;
  visibilityBonus: number;
}

export interface HeroPassive {
  description: string;
  type: 'attack_mult' | 'defense_mult' | 'speed_bonus' | 'visibility' | 'production' | 'heal';
  value: number;
}

export interface HeroAbility {
  name: string;
  description: string;
  icon: string;
  cooldown: number; // tur
}

export const HEROES: Record<HeroId, HeroDefinition> = {
  [HeroId.Warlord]: {
    id: HeroId.Warlord,
    name: 'Kagan',
    title: 'Savas Lordu',
    icon: '⚔️',
    cost: { gold: 150, iron: 30 },
    passives: [
      { description: 'Ordunun saldirisi %20 artar', type: 'attack_mult', value: 0.2 },
    ],
    ability: {
      name: 'Savas Naras',
      description: 'Bu tur tum birimlere +5 saldiri',
      icon: '📯',
      cooldown: 4,
    },
    attackBonus: 5,
    defenseBonus: 2,
    speedBonus: 0,
    visibilityBonus: 0,
  },
  [HeroId.Ranger]: {
    id: HeroId.Ranger,
    name: 'Yilmaz',
    title: 'Baskasif',
    icon: '🏹',
    cost: { gold: 100, wood: 30 },
    passives: [
      { description: 'Gorus menzili +3', type: 'visibility', value: 3 },
      { description: 'Ordu hizi +1', type: 'speed_bonus', value: 1 },
    ],
    ability: {
      name: 'Kesif Seferi',
      description: '5 hex menzilde tum sisi kaldir',
      icon: '👁️',
      cooldown: 3,
    },
    attackBonus: 3,
    defenseBonus: 1,
    speedBonus: 1,
    visibilityBonus: 3,
  },
  [HeroId.Marshal]: {
    id: HeroId.Marshal,
    name: 'Arslan',
    title: 'Buyuk Maresal',
    icon: '🛡️',
    cost: { gold: 150, iron: 20, stone: 20 },
    passives: [
      { description: 'Ordunun savunmasi %25 artar', type: 'defense_mult', value: 0.25 },
    ],
    ability: {
      name: 'Celik Kalkan',
      description: 'Bu tur hasar %50 azalir',
      icon: '🔰',
      cooldown: 5,
    },
    attackBonus: 2,
    defenseBonus: 6,
    speedBonus: 0,
    visibilityBonus: 0,
  },
  [HeroId.Sage]: {
    id: HeroId.Sage,
    name: 'Bilge',
    title: 'Buyucu',
    icon: '🔮',
    cost: { gold: 120, food: 30 },
    passives: [
      { description: 'Arastirma hizi %25 artar', type: 'production', value: 0.25 },
    ],
    ability: {
      name: 'Ates Yagmuru',
      description: 'Dusman ordusuna %15 hasar',
      icon: '🔥',
      cooldown: 4,
    },
    attackBonus: 1,
    defenseBonus: 1,
    speedBonus: 0,
    visibilityBonus: 1,
  },
  [HeroId.Blacksmith]: {
    id: HeroId.Blacksmith,
    name: 'Demirci Usta',
    title: 'Silah Ustasi',
    icon: '🔨',
    cost: { gold: 100, iron: 50 },
    passives: [
      { description: 'Birim egitim maliyeti %15 azalir', type: 'production', value: -0.15 },
      { description: 'Tum birimlere +2 saldiri', type: 'attack_mult', value: 0.1 },
    ],
    ability: {
      name: 'Efsanevi Silah',
      description: 'Secili birimin saldirisini 2x yap (1 tur)',
      icon: '⚡',
      cooldown: 5,
    },
    attackBonus: 3,
    defenseBonus: 3,
    speedBonus: 0,
    visibilityBonus: 0,
  },
  [HeroId.Shadow]: {
    id: HeroId.Shadow,
    name: 'Golge',
    title: 'Suikastci',
    icon: '🗡️',
    cost: { gold: 130, food: 20 },
    passives: [
      { description: 'Ordu hizi +2', type: 'speed_bonus', value: 2 },
    ],
    ability: {
      name: 'Suikast',
      description: 'Dusman kahramanini 1 tur devre disi birak',
      icon: '💀',
      cooldown: 6,
    },
    attackBonus: 4,
    defenseBonus: 0,
    speedBonus: 2,
    visibilityBonus: 1,
  },
};
