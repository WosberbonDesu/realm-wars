import { Army, Unit, HexTerrain, UnitType, Building } from '../types/game';
import { UNIT_ABILITIES } from '../constants/abilities';

export interface HeroCombatBonus {
  attackBonus: number;   // flat +ATK per unit
  defenseBonus: number;  // flat +DEF per unit
  attackMult: number;    // e.g. 0.2 = +20% attack
  defenseMult: number;   // e.g. 0.25 = +25% defense
}

export interface AbilityTrigger {
  unitType: UnitType;
  abilityName: string;
  icon: string;
  text: string;
}

export interface BattleResult {
  winner: 'attacker' | 'defender';
  attackerLosses: number;
  defenderLosses: number;
  attackerSurvivors: Unit[];
  defenderSurvivors: Unit[];
  buildingDamage: number;
  triggeredAbilities: AbilityTrigger[];
}

// Terrain savunma bonusları
const TERRAIN_DEFENSE_BONUS: Partial<Record<HexTerrain, number>> = {
  [HexTerrain.Mountain]: 0.3,
  [HexTerrain.Forest]: 0.15,
  [HexTerrain.River]: 0.2,
  [HexTerrain.Swamp]: -0.1,
};

export function calculateArmyPower(
  army: Army,
  isAttacker: boolean,
  heroBonus?: HeroCombatBonus,
): { attack: number; defense: number } {
  let totalAttack = 0;
  let totalDefense = 0;

  for (const unit of army.units) {
    let unitAttack = unit.attack * unit.count;
    let unitDefense = unit.defense * unit.count;

    // Hero flat bonuses (per unit)
    if (heroBonus) {
      unitAttack += heroBonus.attackBonus * unit.count;
      unitDefense += heroBonus.defenseBonus * unit.count;
    }

    const ability = UNIT_ABILITIES[unit.type];
    if (ability) {
      switch (ability.effect.kind) {
        case 'charge_bonus':
          if (isAttacker) {
            unitAttack += ability.effect.bonusAttack * unit.count;
          }
          break;
        case 'first_strike':
          unitAttack = Math.ceil(unitAttack * ability.effect.damageMultiplier);
          break;
        case 'ambush':
          if (isAttacker) {
            unitAttack += ability.effect.bonusAttack * unit.count;
          }
          break;
      }
    }

    totalAttack += unitAttack;
    totalDefense += unitDefense;
  }

  // Hero multiplier bonuses (applied to total)
  if (heroBonus) {
    totalAttack = Math.ceil(totalAttack * (1 + heroBonus.attackMult));
    totalDefense = Math.ceil(totalDefense * (1 + heroBonus.defenseMult));
  }

  return { attack: totalAttack, defense: totalDefense };
}

function calculateDamageReduction(army: Army): number {
  // Warrior kalkan duvarı: toplam birim oranına göre azaltma
  let reduction = 0;
  const totalUnits = army.units.reduce((s, u) => s + u.count, 0);

  for (const unit of army.units) {
    const ability = UNIT_ABILITIES[unit.type];
    if (ability?.effect.kind === 'damage_reduction') {
      // Savaşçı oranına göre ölçekle
      const ratio = unit.count / totalUnits;
      reduction += ability.effect.reduction * ratio;
    }
  }

  return reduction;
}

function calculateDodgeChance(army: Army): number {
  // Scout pusu: kaçınma şansı
  for (const unit of army.units) {
    const ability = UNIT_ABILITIES[unit.type];
    if (ability?.effect.kind === 'ambush' && unit.count > 0) {
      return ability.effect.dodgeChance * Math.min(1, unit.count / 5);
    }
  }
  return 0;
}

function calculateBuildingDamage(army: Army): number {
  // Mancınık bina hasarı
  let damage = 0;
  for (const unit of army.units) {
    const ability = UNIT_ABILITIES[unit.type];
    if (ability?.effect.kind === 'building_damage') {
      damage += unit.attack * unit.count * ability.effect.multiplier;
    }
  }
  return Math.round(damage);
}

function collectTriggeredAbilities(army: Army, isAttacker: boolean): AbilityTrigger[] {
  const triggers: AbilityTrigger[] = [];

  for (const unit of army.units) {
    if (unit.count <= 0) continue;
    const ability = UNIT_ABILITIES[unit.type];
    if (!ability) continue;

    switch (ability.effect.kind) {
      case 'first_strike':
        triggers.push({
          unitType: unit.type,
          abilityName: ability.name,
          icon: ability.icon,
          text: `${ability.icon} Okcular ilk atis yapti! (x${ability.effect.damageMultiplier})`,
        });
        break;
      case 'charge_bonus':
        if (isAttacker) {
          triggers.push({
            unitType: unit.type,
            abilityName: ability.name,
            icon: ability.icon,
            text: `${ability.icon} Suvariler sarj etti! (+${ability.effect.bonusAttack} ATK)`,
          });
        }
        break;
      case 'damage_reduction':
        if (!isAttacker) {
          triggers.push({
            unitType: unit.type,
            abilityName: ability.name,
            icon: ability.icon,
            text: `${ability.icon} Kalkan duvari aktif! (-%${Math.round(ability.effect.reduction * 100)} hasar)`,
          });
        }
        break;
      case 'ambush':
        if (isAttacker) {
          triggers.push({
            unitType: unit.type,
            abilityName: ability.name,
            icon: ability.icon,
            text: `${ability.icon} Kasifler pusu kurdu! (+${ability.effect.bonusAttack} ATK)`,
          });
        }
        break;
      case 'building_damage':
        if (isAttacker) {
          triggers.push({
            unitType: unit.type,
            abilityName: ability.name,
            icon: ability.icon,
            text: `${ability.icon} Mancniklar binalari dovuyor! (x${ability.effect.multiplier})`,
          });
        }
        break;
    }
  }

  return triggers;
}

export function simulateBattle(
  attacker: Army,
  defender: Army,
  terrain: HexTerrain,
  defenderBuilding?: Building | null,
  attackerHero?: HeroCombatBonus,
  defenderHero?: HeroCombatBonus,
): BattleResult {
  // Yetenek + kahraman bonuslariyla guc hesapla
  const atkStats = calculateArmyPower(attacker, true, attackerHero);
  const defStats = calculateArmyPower(defender, false, defenderHero);

  // Terrain bonusu savunmaciya
  const terrainBonus = TERRAIN_DEFENSE_BONUS[terrain] || 0;
  const adjustedDefense = defStats.defense * (1 + terrainBonus);

  // Warrior kalkan duvari: savunmaciya gelen hasari azaltir
  const defReduction = calculateDamageReduction(defender);
  // Scout pusu: saldirgana gelen hasari azaltir (kacinma)
  const atkDodge = calculateDodgeChance(attacker);

  // Guc orani
  const attackRatio = atkStats.attack / (adjustedDefense + 1);
  const defenseRatio = adjustedDefense / (atkStats.attack + 1);

  // Kayip hesapla
  const randomFactor = 0.8 + Math.random() * 0.4;
  // atkDodge: saldirgana gelen hasari azaltir (scout kacinma)
  const attackerLossRate = Math.min(0.9, defenseRatio * 0.4 * randomFactor * (1 - atkDodge));
  // defReduction: savunmaciya gelen hasari azaltir (warrior kalkan)
  const defenderLossRate = Math.min(0.9, attackRatio * 0.4 * randomFactor * (1 - defReduction));

  const attackerSurvivors = applyLosses(attacker.units, attackerLossRate);
  const defenderSurvivors = applyLosses(defender.units, defenderLossRate);

  const atkRemaining = attackerSurvivors.reduce((s, u) => s + u.count, 0);
  const defRemaining = defenderSurvivors.reduce((s, u) => s + u.count, 0);

  // Bina hasarı (mancınık)
  let buildingDamage = 0;
  if (defenderBuilding) {
    buildingDamage = calculateBuildingDamage(attacker);
  }

  // Tetiklenen yetenekler
  const triggeredAbilities = [
    ...collectTriggeredAbilities(attacker, true),
    ...collectTriggeredAbilities(defender, false),
  ];

  return {
    winner: atkRemaining > defRemaining ? 'attacker' : 'defender',
    attackerLosses: attackerLossRate,
    defenderLosses: defenderLossRate,
    attackerSurvivors,
    defenderSurvivors,
    buildingDamage,
    triggeredAbilities,
  };
}

function applyLosses(units: Unit[], lossRate: number): Unit[] {
  return units
    .map(u => ({
      ...u,
      count: Math.max(0, Math.round(u.count * (1 - lossRate))),
    }))
    .filter(u => u.count > 0);
}
