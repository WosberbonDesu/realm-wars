export enum Season {
  Spring = 'spring',
  Summer = 'summer',
  Autumn = 'autumn',
  Winter = 'winter',
}

export enum WeatherType {
  Clear = 'clear',
  Rain = 'rain',
  Storm = 'storm',
  Snow = 'snow',
  Fog = 'fog',
  Drought = 'drought',
}

export interface SeasonDefinition {
  id: Season;
  name: string;
  icon: string;
  color: string;
  // Mevsim etkileri
  moveCostMultiplier: number;      // hareket maliyeti carpani
  foodProductionMultiplier: number; // yiyecek uretim carpani
  attackModifier: number;           // saldiri bonusu/cezasi
  defenseModifier: number;          // savunma bonusu/cezasi
  visibilityModifier: number;       // gorus menzili degisimi
  description: string;
}

export interface WeatherDefinition {
  id: WeatherType;
  name: string;
  icon: string;
  // Hava etkileri (mevsim ustune eklenir)
  moveCostBonus: number;
  attackBonus: number;
  defenseBonus: number;
  visibilityBonus: number;
  description: string;
}

export const SEASONS: Record<Season, SeasonDefinition> = {
  [Season.Spring]: {
    id: Season.Spring,
    name: 'Ilkbahar',
    icon: '🌸',
    color: '#7EC850',
    moveCostMultiplier: 1.0,
    foodProductionMultiplier: 1.3,
    attackModifier: 0,
    defenseModifier: 0,
    visibilityModifier: 0,
    description: 'Bereketli donem. Yiyecek uretimi %30 artar.',
  },
  [Season.Summer]: {
    id: Season.Summer,
    name: 'Yaz',
    icon: '☀️',
    color: '#D4A843',
    moveCostMultiplier: 0.9,
    foodProductionMultiplier: 1.0,
    attackModifier: 0.05,
    defenseModifier: 0,
    visibilityModifier: 1,
    description: 'Sicak gunler. Hizli hareket, gorus +1.',
  },
  [Season.Autumn]: {
    id: Season.Autumn,
    name: 'Sonbahar',
    icon: '🍂',
    color: '#D9884A',
    moveCostMultiplier: 1.1,
    foodProductionMultiplier: 1.5,
    attackModifier: 0,
    defenseModifier: 0.05,
    visibilityModifier: 0,
    description: 'Hasat zamani! Yiyecek uretimi %50 artar.',
  },
  [Season.Winter]: {
    id: Season.Winter,
    name: 'Kis',
    icon: '❄️',
    color: '#6AADE6',
    moveCostMultiplier: 1.5,
    foodProductionMultiplier: 0.5,
    attackModifier: -0.1,
    defenseModifier: 0.1,
    visibilityModifier: -1,
    description: 'Sert kis. Hareket yavas, yiyecek %50 azalir, savunma artar.',
  },
};

export const WEATHER_TYPES: Record<WeatherType, WeatherDefinition> = {
  [WeatherType.Clear]: {
    id: WeatherType.Clear,
    name: 'Acik',
    icon: '☀️',
    moveCostBonus: 0,
    attackBonus: 0,
    defenseBonus: 0,
    visibilityBonus: 0,
    description: 'Normal kosullar.',
  },
  [WeatherType.Rain]: {
    id: WeatherType.Rain,
    name: 'Yagmurlu',
    icon: '🌧️',
    moveCostBonus: 0.2,
    attackBonus: -0.05,
    defenseBonus: 0.1,
    visibilityBonus: -1,
    description: 'Hareket zorlasiyor, savunma artiyor.',
  },
  [WeatherType.Storm]: {
    id: WeatherType.Storm,
    name: 'Firtina',
    icon: '⛈️',
    moveCostBonus: 0.5,
    attackBonus: -0.15,
    defenseBonus: 0.15,
    visibilityBonus: -2,
    description: 'Siddetli firtina! Hareket cok zor, savas tehlikeli.',
  },
  [WeatherType.Snow]: {
    id: WeatherType.Snow,
    name: 'Kar',
    icon: '🌨️',
    moveCostBonus: 0.3,
    attackBonus: -0.1,
    defenseBonus: 0.05,
    visibilityBonus: -1,
    description: 'Kar yagisi. Hareket yavasliyor.',
  },
  [WeatherType.Fog]: {
    id: WeatherType.Fog,
    name: 'Sisli',
    icon: '🌫️',
    moveCostBonus: 0.1,
    attackBonus: 0,
    defenseBonus: 0,
    visibilityBonus: -2,
    description: 'Yogun sis. Gorus menzili cok azaliyor.',
  },
  [WeatherType.Drought]: {
    id: WeatherType.Drought,
    name: 'Kuraklik',
    icon: '🏜️',
    moveCostBonus: 0,
    attackBonus: 0,
    defenseBonus: -0.05,
    visibilityBonus: 1,
    description: 'Kurak hava. Yiyecek uretimi duser, gorus artar.',
  },
};

// Mevsim degisim suresi (her X turda mevsim degisir)
export const TURNS_PER_SEASON = 8;

// Mevsim sirasi
export const SEASON_ORDER: Season[] = [
  Season.Spring, Season.Summer, Season.Autumn, Season.Winter,
];

// Her mevsimde olusabilecek hava durumlari + olasilik
export const SEASON_WEATHER_CHANCES: Record<Season, { type: WeatherType; weight: number }[]> = {
  [Season.Spring]: [
    { type: WeatherType.Clear, weight: 40 },
    { type: WeatherType.Rain, weight: 35 },
    { type: WeatherType.Fog, weight: 15 },
    { type: WeatherType.Storm, weight: 10 },
  ],
  [Season.Summer]: [
    { type: WeatherType.Clear, weight: 55 },
    { type: WeatherType.Drought, weight: 25 },
    { type: WeatherType.Storm, weight: 10 },
    { type: WeatherType.Rain, weight: 10 },
  ],
  [Season.Autumn]: [
    { type: WeatherType.Clear, weight: 30 },
    { type: WeatherType.Rain, weight: 30 },
    { type: WeatherType.Fog, weight: 25 },
    { type: WeatherType.Storm, weight: 15 },
  ],
  [Season.Winter]: [
    { type: WeatherType.Snow, weight: 40 },
    { type: WeatherType.Clear, weight: 25 },
    { type: WeatherType.Storm, weight: 20 },
    { type: WeatherType.Fog, weight: 15 },
  ],
};
