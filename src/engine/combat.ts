import { Army, Unit, HexTerrain, HexTile } from '../types/game';
import { TERRAIN_DEFENSE_BONUS, RIVER_DEFENSE_BONUS } from '../constants/terrain';

export interface BattleResult {
  winner: 'attacker' | 'defender';
  attackerLosses: number; // yüzde
  defenderLosses: number;
  attackerSurvivors: Unit[];
  defenderSurvivors: Unit[];
}

export function calculateArmyPower(army: Army): { attack: number; defense: number } {
  let totalAttack = 0;
  let totalDefense = 0;
  for (const unit of army.units) {
    totalAttack += unit.attack * unit.count;
    totalDefense += unit.defense * unit.count;
  }
  return { attack: totalAttack, defense: totalDefense };
}

export function simulateBattle(
  attacker: Army,
  defender: Army,
  tile: HexTile,
): BattleResult {
  const atkStats = calculateArmyPower(attacker);
  const defStats = calculateArmyPower(defender);

  // Terrain bonusu savunmacıya
  let terrainBonus = TERRAIN_DEFENSE_BONUS[tile.terrain] || 0;

  // Nehir geçişi ek bonus
  if (tile.hasRiver) {
    terrainBonus += RIVER_DEFENSE_BONUS;
  }

  const adjustedDefense = defStats.defense * (1 + terrainBonus);

  // Güç oranı
  const attackRatio = atkStats.attack / (adjustedDefense + 1);
  const defenseRatio = adjustedDefense / (atkStats.attack + 1);

  // Kayıp hesapla (rastgelelik ekle)
  const randomFactor = 0.8 + Math.random() * 0.4; // 0.8 - 1.2
  const attackerLossRate = Math.min(0.9, defenseRatio * 0.4 * randomFactor);
  const defenderLossRate = Math.min(0.9, attackRatio * 0.4 * randomFactor);

  const attackerSurvivors = applyLosses(attacker.units, attackerLossRate);
  const defenderSurvivors = applyLosses(defender.units, defenderLossRate);

  const atkRemaining = attackerSurvivors.reduce((s, u) => s + u.count, 0);
  const defRemaining = defenderSurvivors.reduce((s, u) => s + u.count, 0);

  return {
    winner: atkRemaining > defRemaining ? 'attacker' : 'defender',
    attackerLosses: attackerLossRate,
    defenderLosses: defenderLossRate,
    attackerSurvivors,
    defenderSurvivors,
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
