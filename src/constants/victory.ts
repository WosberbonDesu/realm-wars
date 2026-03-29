export enum VictoryType {
  Military = 'military',
  Economic = 'economic',
  Technology = 'technology',
  Domination = 'domination',
}

export interface VictoryCondition {
  type: VictoryType;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export const VICTORY_CONDITIONS: Record<VictoryType, VictoryCondition> = {
  [VictoryType.Military]: {
    type: VictoryType.Military,
    name: 'Askeri Zafer',
    description: 'Tum dusman kalelerini ele gecir',
    icon: '⚔️',
    color: '#D94A4A',
  },
  [VictoryType.Economic]: {
    type: VictoryType.Economic,
    name: 'Ekonomik Zafer',
    description: '1000 altin biriktir ve 20+ toprak sahibi ol',
    icon: '💰',
    color: '#FFD700',
  },
  [VictoryType.Technology]: {
    type: VictoryType.Technology,
    name: 'Teknolojik Zafer',
    description: 'Tum teknolojileri arastir',
    icon: '🔬',
    color: '#6AADE6',
  },
  [VictoryType.Domination]: {
    type: VictoryType.Domination,
    name: 'Hakimiyet Zaferi',
    description: 'Haritanin %60\'indan fazlasina sahip ol',
    icon: '👑',
    color: '#8B4AD9',
  },
};

// Esik degerleri
export const ECONOMIC_GOLD_THRESHOLD = 1000;
export const ECONOMIC_TERRITORY_THRESHOLD = 20;
export const DOMINATION_TERRITORY_PERCENT = 0.6;
