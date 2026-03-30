/**
 * Region-based map system — Voronoi tabanlı organik harita
 *
 * Hex grid yerine rastgele noktalardan oluşan Voronoi bölgeleri.
 * Her bölge bir "il/eyalet" — organik sınırlar, gerçek harita görünümü.
 */

// ===== REGION (Bölge) =====

export interface MapPoint {
  x: number;
  y: number;
}

/** Voronoi bölgesi — haritadaki tek birim */
export interface Region {
  id: string;
  /** Bölge merkez noktası */
  center: MapPoint;
  /** Voronoi hücre köşeleri (saat yönünde sıralı) */
  vertices: MapPoint[];
  /** Bezier ile yumuşatılmış sınır noktaları (render için) */
  smoothVertices: MapPoint[];
  /** Kontrol noktaları (bezier için, her kenar için 2 adet) */
  controlPoints: [MapPoint, MapPoint][];
  /** Komşu bölge ID'leri */
  neighborIds: string[];
  /** Arazi tipi */
  terrain: RegionTerrain;
  /** Sahip oyuncu ID'si (null = sahipsiz) */
  ownerId: string | null;
  /** Bina */
  building: import('./game').Building | null;
  /** Ordu */
  army: import('./game').Army | null;
  /** Doğal kaynaklar */
  resources: import('./game').Resources;
  /** Fog of war */
  visible: boolean;
  explored: boolean;
  /** Elevation (yükseklik, 0-1) */
  elevation: number;
  /** Moisture (nem, 0-1) */
  moisture: number;
  /** Kara mı deniz mi */
  isLand: boolean;
  /** Kıyı bölgesi mi (komşusunda deniz var) */
  isCoast: boolean;
  /** Nehir kenarı mı */
  hasRiver: boolean;
  /** Bölge alanı (piksel kare) */
  area: number;
}

// ===== TERRAIN =====

export enum RegionTerrain {
  DeepSea = 'deep_sea',
  Sea = 'sea',
  Coast = 'coast',
  Beach = 'beach',
  Plains = 'plains',
  Grassland = 'grassland',
  Forest = 'forest',
  DenseForest = 'dense_forest',
  Hills = 'hills',
  Mountain = 'mountain',
  SnowPeak = 'snow_peak',
  Desert = 'desert',
  Savanna = 'savanna',
  Swamp = 'swamp',
  Tundra = 'tundra',
  River = 'river',
  Lake = 'lake',
  Fertile = 'fertile',
}

// ===== MAP DATA =====

export interface WorldMap {
  /** Tüm bölgeler */
  regions: Map<string, Region>;
  /** Harita boyutu (piksel) */
  width: number;
  height: number;
  /** Nehir segmentleri (render için) */
  rivers: RiverSegment[];
  /** Harita seed'i */
  seed: number;
}

export interface RiverSegment {
  points: MapPoint[];
  width: number;
}

// ===== COLORS =====

export const REGION_TERRAIN_COLORS: Record<RegionTerrain, {
  fill: string;
  stroke: string;
  light: string;
  dark: string;
}> = {
  [RegionTerrain.DeepSea]:     { fill: '#0F2847', stroke: '#0A1C35', light: '#1A3868', dark: '#081430' },
  [RegionTerrain.Sea]:         { fill: '#1A4A78', stroke: '#12365A', light: '#2A6A9A', dark: '#0E2848' },
  [RegionTerrain.Coast]:       { fill: '#2878A8', stroke: '#1E6090', light: '#3898C8', dark: '#185878' },
  [RegionTerrain.Beach]:       { fill: '#D4C898', stroke: '#B8A878', light: '#E8DEB0', dark: '#C0B080' },
  [RegionTerrain.Plains]:      { fill: '#7BB840', stroke: '#5A9828', light: '#98D860', dark: '#4A8020' },
  [RegionTerrain.Grassland]:   { fill: '#6AAF3D', stroke: '#4A8A28', light: '#8FD462', dark: '#2E5E15' },
  [RegionTerrain.Forest]:      { fill: '#2D6E22', stroke: '#1A4A14', light: '#3D8A30', dark: '#0E3008' },
  [RegionTerrain.DenseForest]: { fill: '#1A4A12', stroke: '#0E3008', light: '#2A6A1A', dark: '#082004' },
  [RegionTerrain.Hills]:       { fill: '#8A9A58', stroke: '#6A7A40', light: '#A8B870', dark: '#5A6A30' },
  [RegionTerrain.Mountain]:    { fill: '#7A6850', stroke: '#5A4A38', light: '#A89880', dark: '#3A2A1A' },
  [RegionTerrain.SnowPeak]:    { fill: '#C8D0D8', stroke: '#A0A8B0', light: '#E0E8F0', dark: '#8890A0' },
  [RegionTerrain.Desert]:      { fill: '#D4A843', stroke: '#B88A28', light: '#E8C060', dark: '#A07020' },
  [RegionTerrain.Savanna]:     { fill: '#B8A848', stroke: '#988830', light: '#D0C060', dark: '#887020' },
  [RegionTerrain.Swamp]:       { fill: '#4A5E3A', stroke: '#2A3820', light: '#607848', dark: '#1A2810' },
  [RegionTerrain.Tundra]:      { fill: '#8898A0', stroke: '#6878A0', light: '#A0B0B8', dark: '#586880' },
  [RegionTerrain.River]:       { fill: '#3A80C8', stroke: '#2060A0', light: '#5AAAE8', dark: '#103860' },
  [RegionTerrain.Lake]:        { fill: '#2A6098', stroke: '#1A4070', light: '#4080B8', dark: '#0E2848' },
  [RegionTerrain.Fertile]:     { fill: '#4AA830', stroke: '#308A18', light: '#68C848', dark: '#1A6008' },
};

// Terrain özellikleri
export const REGION_TERRAIN_PROPS: Record<RegionTerrain, {
  moveCost: number;        // 1=normal, Infinity=geçilemez
  defenseBonus: number;    // 0-0.3
  isWater: boolean;
  buildable: boolean;
  resourceYield: Partial<import('./game').Resources>;
}> = {
  [RegionTerrain.DeepSea]:     { moveCost: Infinity, defenseBonus: 0,    isWater: true,  buildable: false, resourceYield: {} },
  [RegionTerrain.Sea]:         { moveCost: Infinity, defenseBonus: 0,    isWater: true,  buildable: false, resourceYield: {} },
  [RegionTerrain.Coast]:       { moveCost: 1.5,      defenseBonus: 0.05, isWater: true,  buildable: false, resourceYield: { food: 2, gold: 1 } },
  [RegionTerrain.Beach]:       { moveCost: 1,        defenseBonus: 0,    isWater: false, buildable: true,  resourceYield: { food: 1, gold: 2 } },
  [RegionTerrain.Plains]:      { moveCost: 1,        defenseBonus: 0,    isWater: false, buildable: true,  resourceYield: { food: 3, gold: 1 } },
  [RegionTerrain.Grassland]:   { moveCost: 1,        defenseBonus: 0,    isWater: false, buildable: true,  resourceYield: { food: 4 } },
  [RegionTerrain.Forest]:      { moveCost: 1.5,      defenseBonus: 0.15, isWater: false, buildable: true,  resourceYield: { wood: 3, food: 1 } },
  [RegionTerrain.DenseForest]: { moveCost: 2,        defenseBonus: 0.25, isWater: false, buildable: true,  resourceYield: { wood: 5 } },
  [RegionTerrain.Hills]:       { moveCost: 1.5,      defenseBonus: 0.20, isWater: false, buildable: true,  resourceYield: { stone: 2, iron: 1, food: 1 } },
  [RegionTerrain.Mountain]:    { moveCost: 3,        defenseBonus: 0.30, isWater: false, buildable: true,  resourceYield: { iron: 3, stone: 2 } },
  [RegionTerrain.SnowPeak]:    { moveCost: Infinity, defenseBonus: 0,    isWater: false, buildable: false, resourceYield: {} },
  [RegionTerrain.Desert]:      { moveCost: 2,        defenseBonus: -0.05,isWater: false, buildable: true,  resourceYield: { gold: 3, stone: 1 } },
  [RegionTerrain.Savanna]:     { moveCost: 1,        defenseBonus: 0,    isWater: false, buildable: true,  resourceYield: { food: 2, gold: 1 } },
  [RegionTerrain.Swamp]:       { moveCost: 2.5,      defenseBonus: -0.10,isWater: false, buildable: true,  resourceYield: { food: 1, wood: 1 } },
  [RegionTerrain.Tundra]:      { moveCost: 2,        defenseBonus: 0.05, isWater: false, buildable: true,  resourceYield: { iron: 1, stone: 1 } },
  [RegionTerrain.River]:       { moveCost: 1.5,      defenseBonus: 0.10, isWater: true,  buildable: false, resourceYield: { food: 2, gold: 2 } },
  [RegionTerrain.Lake]:        { moveCost: Infinity, defenseBonus: 0,    isWater: true,  buildable: false, resourceYield: { food: 2 } },
  [RegionTerrain.Fertile]:     { moveCost: 1,        defenseBonus: 0,    isWater: false, buildable: true,  resourceYield: { food: 5, gold: 1 } },
};
