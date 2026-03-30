import { Resources } from '../types/game';

/**
 * Faction/Uygarlık sistemi
 * Her uygarlığın kendine özgü bonusları, birim isimleri ve hikayesi var.
 */

export type FactionId = 'turkic' | 'norse' | 'arab' | 'slavic';

export interface FactionBonus {
  description: string;
  type: 'attack' | 'defense' | 'production' | 'movement' | 'research' | 'income';
  value: number; // +0.15 = %15 bonus
}

export interface FactionDefinition {
  id: FactionId;
  name: string;
  title: string;
  icon: string;
  color: string;
  description: string;
  bonuses: FactionBonus[];
  // Özgün birim isimleri
  unitNames: {
    warrior: string;
    archer: string;
    cavalry: string;
    catapult: string;
    scout: string;
  };
  // Özgün bina isimleri
  buildingNames: {
    castle: string;
    barracks: string;
  };
  // Lider unvanları
  leaderTitle: string;
  // Başlangıç kaynak bonusu
  startBonus: Partial<Resources>;
}

export const FACTIONS: Record<FactionId, FactionDefinition> = {
  turkic: {
    id: 'turkic',
    name: 'Turan',
    title: 'Türk Kağanlığı',
    icon: '🐺',
    color: '#C0392B',
    description: 'Bozkırın çocukları. Süvari ustası, hızlı fetih ve göçebe savaş stratejileri.',
    bonuses: [
      { description: 'Süvari saldırısı %20 artış', type: 'attack', value: 0.2 },
      { description: 'Ordu hareket hızı %15 artış', type: 'movement', value: 0.15 },
      { description: 'At yetiştirme: Süvari maliyeti %10 düşer', type: 'production', value: -0.1 },
    ],
    unitNames: {
      warrior: 'Alp',
      archer: 'Okcu',
      cavalry: 'Akıncı',
      catapult: 'Mancınık',
      scout: 'Yelme',
    },
    buildingNames: {
      castle: 'Otağ',
      barracks: 'Kışlak',
    },
    leaderTitle: 'Kağan',
    startBonus: { gold: 20, food: 30 },
  },

  norse: {
    id: 'norse',
    name: 'Nordheim',
    title: 'Viking İmparatorluğu',
    icon: '⚡',
    color: '#2980B9',
    description: 'Kuzey denizlerinin fatihleri. Güçlü piyade, deniz ticareti ve yağma ustası.',
    bonuses: [
      { description: 'Piyade savunması %20 artış', type: 'defense', value: 0.2 },
      { description: 'Kıyı/sahil geliri %25 artış', type: 'income', value: 0.25 },
      { description: 'Bina inşa hızı %10 artış', type: 'production', value: 0.1 },
    ],
    unitNames: {
      warrior: 'Huskarl',
      archer: 'Bowman',
      cavalry: 'Ridder',
      catapult: 'Onager',
      scout: 'Ulfhednar',
    },
    buildingNames: {
      castle: 'Halı',
      barracks: 'Longhouse',
    },
    leaderTitle: 'Jarl',
    startBonus: { gold: 30, iron: 20 },
  },

  arab: {
    id: 'arab',
    name: 'Al-Rashid',
    title: 'Arap Halifeliği',
    icon: '🌙',
    color: '#27AE60',
    description: 'Bilim ve ticaretin merkezi. Zengin ekonomi, güçlü okçular, hızlı araştırma.',
    bonuses: [
      { description: 'Araştırma hızı %25 artış', type: 'research', value: 0.25 },
      { description: 'Pazar geliri %20 artış', type: 'income', value: 0.2 },
      { description: 'Çöl arazisinde hareket %30 hızlı', type: 'movement', value: 0.3 },
    ],
    unitNames: {
      warrior: 'Muqatil',
      archer: 'Rami',
      cavalry: 'Faris',
      catapult: 'Manjaniq',
      scout: 'Tali\'a',
    },
    buildingNames: {
      castle: 'Kale',
      barracks: 'Ribat',
    },
    leaderTitle: 'Halife',
    startBonus: { gold: 50 },
  },

  slavic: {
    id: 'slavic',
    name: 'Kievan',
    title: 'Slav Knezliği',
    icon: '🐻',
    color: '#8E44AD',
    description: 'Geniş toprakların koruyucuları. Dayanıklı ordular, orman savaşı ve kış ustası.',
    bonuses: [
      { description: 'Orman arazisinde savunma %25 artış', type: 'defense', value: 0.25 },
      { description: 'Yiyecek üretimi %15 artış', type: 'production', value: 0.15 },
      { description: 'Kış mevsiminde bonus (hasar azaltma)', type: 'defense', value: 0.1 },
    ],
    unitNames: {
      warrior: 'Druzhina',
      archer: 'Strelets',
      cavalry: 'Boyar',
      catapult: 'Poroki',
      scout: 'Razvedchik',
    },
    buildingNames: {
      castle: 'Kreml',
      barracks: 'Kazarma',
    },
    leaderTitle: 'Knyaz',
    startBonus: { food: 30, wood: 30 },
  },
};

export const FACTION_IDS = Object.keys(FACTIONS) as FactionId[];
