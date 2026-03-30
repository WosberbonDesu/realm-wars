import { UnitType } from '../types/game';

export enum AbilityType {
  RangedAttack = 'ranged_attack',
  Charge = 'charge',
  SiegeBreaker = 'siege_breaker',
  Stealth = 'stealth',
  ShieldWall = 'shield_wall',
}

export interface UnitAbility {
  id: AbilityType;
  name: string;
  description: string;
  icon: string;
  // Pasif mi yoksa aktif mi
  passive: boolean;
  // Efekt detaylari
  effect:
    | { kind: 'first_strike'; damageMultiplier: number }
    | { kind: 'charge_bonus'; bonusAttack: number; condition: string }
    | { kind: 'building_damage'; multiplier: number }
    | { kind: 'ambush'; dodgeChance: number; bonusAttack: number }
    | { kind: 'damage_reduction'; reduction: number };
}

export const UNIT_ABILITIES: Record<UnitType, UnitAbility> = {
  [UnitType.Warrior]: {
    id: AbilityType.ShieldWall,
    name: 'Kalkan Duvari',
    description: 'Savunmada %20 hasar azaltma',
    icon: '🛡️',
    passive: true,
    effect: { kind: 'damage_reduction', reduction: 0.2 },
  },
  [UnitType.Archer]: {
    id: AbilityType.RangedAttack,
    name: 'Ilk Atis',
    description: 'Savasta ilk vurarak 1.3x hasar verir',
    icon: '🏹',
    passive: true,
    effect: { kind: 'first_strike', damageMultiplier: 1.3 },
  },
  [UnitType.Cavalry]: {
    id: AbilityType.Charge,
    name: 'Suvari Sarji',
    description: 'Saldiri baslatiginda +8 saldiri bonusu',
    icon: '🐴',
    passive: true,
    effect: { kind: 'charge_bonus', bonusAttack: 8, condition: 'on_attack' },
  },
  [UnitType.Catapult]: {
    id: AbilityType.SiegeBreaker,
    name: 'Kusatma Uzmanı',
    description: 'Binalara 3x hasar verir',
    icon: '💥',
    passive: true,
    effect: { kind: 'building_damage', multiplier: 3.0 },
  },
  [UnitType.Scout]: {
    id: AbilityType.Stealth,
    name: 'Pusu',
    description: '%30 saldiridan kacinma, pusu saldirisi +5',
    icon: '👁️',
    passive: true,
    effect: { kind: 'ambush', dodgeChance: 0.3, bonusAttack: 5 },
  },
  [UnitType.Galley]: {
    id: AbilityType.Charge,
    name: 'Deniz Tasimaciligi',
    description: 'Deniz hex\'lerinde hareket edebilir, kara birimleri tasir',
    icon: '⛵',
    passive: true,
    effect: { kind: 'charge_bonus', bonusAttack: 0, condition: 'naval' },
  },
  [UnitType.Warship]: {
    id: AbilityType.SiegeBreaker,
    name: 'Deniz Bombardimani',
    description: 'Kiyidaki binalara 2x hasar, denizde guclu savunma',
    icon: '🚢',
    passive: true,
    effect: { kind: 'building_damage', multiplier: 2.0 },
  },
};

// Savas raporunda yetenek efektlerini gostermek icin
export function getAbilityBattleText(unitType: UnitType, isAttacker: boolean): string | null {
  const ability = UNIT_ABILITIES[unitType];
  switch (ability.effect.kind) {
    case 'first_strike':
      return `${ability.icon} ${ability.name}: Ilk atis ile 1.3x hasar!`;
    case 'charge_bonus':
      return isAttacker ? `${ability.icon} ${ability.name}: +${ability.effect.bonusAttack} saldiri!` : null;
    case 'damage_reduction':
      return !isAttacker ? `${ability.icon} ${ability.name}: %${ability.effect.reduction * 100} hasar azaltma` : null;
    case 'ambush':
      return `${ability.icon} ${ability.name}: Pusu pozisyonunda!`;
    case 'building_damage':
      return null; // Bina hasari savasta gosterilmez
    default:
      return null;
  }
}
