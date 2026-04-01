// Whittaker Diyagramı bazlı biome sınıflandırma
// Geliştirilmiş versiyon: enlem, nem, sıcaklık etkileşimleri
import { HexTerrain } from '../types/game';

export interface BiomeResult {
  terrain: HexTerrain;
  name: string;
}

// Su seviyesi eşiği (0-1 elevation skalasında)
export const SEA_LEVEL = 0.20;
export const COAST_DEPTH = 0.18; // coast → ocean sınırı
export const MOUNTAIN_LEVEL = 0.70;
export const HIGH_MOUNTAIN = 0.85;

export function classifyBiome(
  elevation: number,
  moisture: number,
  temperature: number,
): BiomeResult {
  // --- Su bölgeleri ---
  if (elevation < COAST_DEPTH) {
    if (temperature < 0.1) return { terrain: HexTerrain.Ocean, name: 'Buzul Denizi' };
    return { terrain: HexTerrain.Ocean, name: 'Derin Deniz' };
  }
  if (elevation < SEA_LEVEL) {
    if (temperature < 0.1) return { terrain: HexTerrain.Coast, name: 'Donmus Kıyı' };
    return { terrain: HexTerrain.Coast, name: 'Sığ Kıyı' };
  }

  // --- Yüksek dağlar (>0.85) ---
  if (elevation >= HIGH_MOUNTAIN) {
    if (temperature < 0.2) return { terrain: HexTerrain.Snow, name: 'Buzul Zirvesi' };
    if (temperature < 0.4) return { terrain: HexTerrain.Snow, name: 'Karli Doruk' };
    if (moisture > 0.5) return { terrain: HexTerrain.Mountain, name: 'Bulutlu Zirve' };
    return { terrain: HexTerrain.Mountain, name: 'Kayalik Doruk' };
  }

  // --- Dağlar (0.70-0.85) ---
  if (elevation >= MOUNTAIN_LEVEL) {
    if (temperature < 0.15) return { terrain: HexTerrain.Snow, name: 'Buzul Dag' };
    if (temperature < 0.3) {
      if (moisture > 0.4) return { terrain: HexTerrain.Snow, name: 'Karli Dag' };
      return { terrain: HexTerrain.Mountain, name: 'Sert Dag' };
    }
    if (temperature < 0.5) {
      if (moisture > 0.5) return { terrain: HexTerrain.Forest, name: 'Dag Ormani' };
      return { terrain: HexTerrain.Mountain, name: 'Dag' };
    }
    // Sıcak yüksek dağlar (tropik And dağları gibi)
    if (moisture > 0.6) return { terrain: HexTerrain.Forest, name: 'Bulut Ormani' };
    return { terrain: HexTerrain.Mountain, name: 'Volkanik Dag' };
  }

  // --- Yüksek tepeler (0.55-0.70) ---
  if (elevation >= 0.55) {
    if (temperature < 0.2) return { terrain: HexTerrain.Tundra, name: 'Dag Tundrasi' };
    if (temperature < 0.4) {
      if (moisture > 0.5) return { terrain: HexTerrain.Forest, name: 'Konifer Ormani' };
      return { terrain: HexTerrain.Plains, name: 'Alpin Cayir' };
    }
    if (moisture > 0.5) return { terrain: HexTerrain.Forest, name: 'Yayla Ormani' };
    if (moisture < 0.2) return { terrain: HexTerrain.Desert, name: 'Kayalik Yayla' };
    return { terrain: HexTerrain.Plains, name: 'Yesil Yayla' };
  }

  // --- Kıyı özel biyomları (elevation 0.20-0.25 ve kıyı yakını) ---
  if (elevation < 0.25) {
    if (temperature > 0.7 && moisture > 0.6) return { terrain: HexTerrain.Swamp, name: 'Mangrov Ormani' };
    if (temperature > 0.6 && moisture > 0.7) return { terrain: HexTerrain.Swamp, name: 'Tropik Bataklik' };
  }

  // --- Kutup/Soğuk bölgeler (temp < 0.15) ---
  if (temperature < 0.10) {
    if (moisture > 0.3) return { terrain: HexTerrain.Tundra, name: 'Buz Colu' };
    return { terrain: HexTerrain.Tundra, name: 'Kutup Colu' };
  }

  // --- Tundra/Taiga geçiş bölgesi (temp 0.10-0.25) ---
  if (temperature < 0.25) {
    if (moisture > 0.6) return { terrain: HexTerrain.Forest, name: 'Taiga' };
    if (moisture > 0.4) return { terrain: HexTerrain.Tundra, name: 'Soguk Bozkir' };
    if (moisture > 0.2) return { terrain: HexTerrain.Tundra, name: 'Tundra' };
    return { terrain: HexTerrain.Tundra, name: 'Kutup Stepi' };
  }

  // --- Ilıman bölge (temp 0.25-0.50) ---
  if (temperature < 0.50) {
    if (moisture > 0.70) return { terrain: HexTerrain.Forest, name: 'Iliman Yagmur Ormani' };
    if (moisture > 0.55) return { terrain: HexTerrain.Forest, name: 'Yaprak Doken Orman' };
    if (moisture > 0.40) return { terrain: HexTerrain.Forest, name: 'Karisik Orman' };
    if (moisture > 0.25) return { terrain: HexTerrain.Plains, name: 'Cayirlik' };
    if (moisture > 0.10) return { terrain: HexTerrain.Plains, name: 'Bozkir' };
    return { terrain: HexTerrain.Desert, name: 'Soguk Col' };
  }

  // --- Sıcak ılıman bölge (temp 0.50-0.70) ---
  if (temperature < 0.70) {
    if (moisture > 0.75) return { terrain: HexTerrain.Swamp, name: 'Iliman Bataklik' };
    if (moisture > 0.60) return { terrain: HexTerrain.Forest, name: 'Yaprak Doken Orman' };
    if (moisture > 0.40) return { terrain: HexTerrain.Forest, name: 'Mesetoprak Ormani' };
    if (moisture > 0.25) return { terrain: HexTerrain.Plains, name: 'Verimli Ova' };
    if (moisture > 0.15) return { terrain: HexTerrain.Plains, name: 'Kurak Cayir' };
    if (moisture > 0.08) return { terrain: HexTerrain.Desert, name: 'Maki/Chaparral' };
    return { terrain: HexTerrain.Desert, name: 'Yarikurak Col' };
  }

  // --- Tropik bölge (temp 0.70-0.85) ---
  if (temperature < 0.85) {
    if (moisture > 0.75) return { terrain: HexTerrain.Forest, name: 'Tropik Yagmur Ormani' };
    if (moisture > 0.55) return { terrain: HexTerrain.Forest, name: 'Muson Ormani' };
    if (moisture > 0.35) return { terrain: HexTerrain.Plains, name: 'Savan' };
    if (moisture > 0.15) return { terrain: HexTerrain.Plains, name: 'Tropik Cayir' };
    if (moisture > 0.05) return { terrain: HexTerrain.Desert, name: 'Sahel' };
    return { terrain: HexTerrain.Desert, name: 'Sicak Col' };
  }

  // --- Çok sıcak tropik (temp > 0.85) ---
  if (moisture > 0.70) return { terrain: HexTerrain.Swamp, name: 'Tropik Bataklik' };
  if (moisture > 0.50) return { terrain: HexTerrain.Forest, name: 'Yogun Yagmur Ormani' };
  if (moisture > 0.30) return { terrain: HexTerrain.Plains, name: 'Kurak Savan' };
  if (moisture > 0.10) return { terrain: HexTerrain.Desert, name: 'Kavurucu Col' };
  return { terrain: HexTerrain.Desert, name: 'Erg Colu' };
}

// Enlem bazlı baz sıcaklık (harita merkezinden uzaklık)
export function baseTemperature(q: number, r: number, radius: number): number {
  const dist = Math.sqrt(q * q + r * r + q * r) / radius;
  return Math.max(0, Math.min(1, 1 - dist * 0.8));
}

// Yükseklik sıcaklık düşüşü (lapse rate)
// Gerçekçi: ~6.5°C/1000m, elevation 0.2-1.0 aralığında 0-0.55 range
export function applyLapseRate(baseTemp: number, elevation: number): number {
  if (elevation <= SEA_LEVEL) return baseTemp;
  const landElevation = (elevation - SEA_LEVEL) / (1 - SEA_LEVEL);
  return Math.max(0, baseTemp - landElevation * 0.55);
}
