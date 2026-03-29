import { Resources } from '../types/game';

export enum RelationType {
  Neutral = 'neutral',
  NonAggression = 'non_aggression',
  Alliance = 'alliance',
  War = 'war',
}

export enum DiplomacyAction {
  ProposeNonAggression = 'propose_non_aggression',
  ProposeAlliance = 'propose_alliance',
  DeclareWar = 'declare_war',
  OfferTribute = 'offer_tribute',
  BreakAgreement = 'break_agreement',
}

export interface DiplomacyRelation {
  playerId: string;
  targetId: string;
  type: RelationType;
  turnsRemaining: number; // 0 = suersiz, >0 = gecici
  tributePerTurn: Partial<Resources> | null;
}

export interface DiplomacyProposal {
  id: string;
  fromId: string;
  toId: string;
  action: DiplomacyAction;
  tribute?: Partial<Resources>;
  turnsLeft: number; // kabul icin kalan tur
}

export const RELATION_NAMES: Record<RelationType, string> = {
  [RelationType.Neutral]: 'Tarafsiz',
  [RelationType.NonAggression]: 'Saldirmazlik',
  [RelationType.Alliance]: 'Ittifak',
  [RelationType.War]: 'Savas',
};

export const RELATION_ICONS: Record<RelationType, string> = {
  [RelationType.Neutral]: '😐',
  [RelationType.NonAggression]: '🤝',
  [RelationType.Alliance]: '⭐',
  [RelationType.War]: '⚔️',
};

export const RELATION_COLORS: Record<RelationType, string> = {
  [RelationType.Neutral]: '#A0B0C0',
  [RelationType.NonAggression]: '#4AD97A',
  [RelationType.Alliance]: '#FFD700',
  [RelationType.War]: '#D94A4A',
};

// Ittifak ve pakt sureleri
export const NON_AGGRESSION_DURATION = 10; // tur
export const ALLIANCE_DURATION = 15; // tur
export const PROPOSAL_EXPIRE_TURNS = 2; // kabul icin sure

// Bot diplomasi esikleri
export const BOT_ACCEPT_NON_AGGRESSION_CHANCE = 0.6;
export const BOT_ACCEPT_ALLIANCE_CHANCE = 0.35;
export const BOT_DECLARE_WAR_CHANCE = 0.15;
