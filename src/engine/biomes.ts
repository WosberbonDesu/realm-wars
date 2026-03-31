// Whittaker Diyagramı bazlı biome sınıflandırma
// Azgaar'ın yaklaşımı: (elevation, temperature, moisture) → biome
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
    return { terrain: HexTerrain.Ocean, name: 'Derin Deniz' };
  }
  if (elevation < SEA_LEVEL) {
    return { terrain: HexTerrain.Coast, name: 'Sığ Kıyı' };
  }

  // --- Yüksek dağlar ---
  if (elevation >= HIGH_MOUNTAIN) {
    if (temperature < 0.3) {
      return { terrain: HexTerrain.Snow, name: 'Karli Zirve' };
    }
    return { terrain: HexTerrain.Mountain, name: 'Yuce Dag' };
  }

  if (elevation >= MOUNTAIN_LEVEL) {
    if (temperature < 0.25) {
      return { terrain: HexTerrain.Snow, name: 'Buzul Dag' };
    }
    return { terrain: HexTerrain.Mountain, name: 'Dag' };
  }

  // --- Kara bölgeleri (Whittaker grid) ---
  // Sıcaklık azaldıkça: tundra/snow
  if (temperature < 0.15) {
    return { terrain: HexTerrain.Tundra, name: 'Buz Colu' };
  }
  if (temperature < 0.25) {
    if (moisture > 0.5) return { terrain: HexTerrain.Tundra, name: 'Soguk Bozkir' };
    return { terrain: HexTerrain.Tundra, name: 'Tundra' };
  }

  // Sıcaklık orta-yüksek: nem belirleyici
  if (temperature < 0.5) {
    // Ilıman bölge
    if (moisture > 0.65) return { terrain: HexTerrain.Forest, name: 'Kozalakli Orman' };
    if (moisture > 0.4) return { terrain: HexTerrain.Forest, name: 'Karisik Orman' };
    if (moisture > 0.2) return { terrain: HexTerrain.Plains, name: 'Cayirlik' };
    return { terrain: HexTerrain.Plains, name: 'Bozkir' };
  }

  if (temperature < 0.7) {
    // Sıcak ılıman
    if (moisture > 0.7) return { terrain: HexTerrain.Swamp, name: 'Bataklik' };
    if (moisture > 0.5) return { terrain: HexTerrain.Forest, name: 'Yaprak Doken Orman' };
    if (moisture > 0.3) return { terrain: HexTerrain.Plains, name: 'Verimli Ova' };
    if (moisture > 0.15) return { terrain: HexTerrain.Plains, name: 'Kurak Ova' };
    return { terrain: HexTerrain.Desert, name: 'Yarikurak Col' };
  }

  // Tropik / çok sıcak
  if (moisture > 0.7) return { terrain: HexTerrain.Swamp, name: 'Tropik Bataklik' };
  if (moisture > 0.5) return { terrain: HexTerrain.Forest, name: 'Yagmur Ormani' };
  if (moisture > 0.3) return { terrain: HexTerrain.Plains, name: 'Savan' };
  if (moisture > 0.1) return { terrain: HexTerrain.Desert, name: 'Sicak Col' };
  return { terrain: HexTerrain.Desert, name: 'Kavurucu Col' };
}

// Enlem bazlı baz sıcaklık (harita merkezinden uzaklık)
export function baseTemperature(q: number, r: number, radius: number): number {
  const dist = Math.sqrt(q * q + r * r + q * r) / radius;
  // Merkez sıcak, kenarlar soğuk (küresel enlem simülasyonu)
  return Math.max(0, Math.min(1, 1 - dist * 0.8));
}

// Yükseklik sıcaklık düşüşü (lapse rate)
export function applyLapseRate(baseTemp: number, elevation: number): number {
  if (elevation <= SEA_LEVEL) return baseTemp;
  // Her 0.1 elevation artışı → 0.12 derece düşüş
  const landElevation = (elevation - SEA_LEVEL) / (1 - SEA_LEVEL);
  return Math.max(0, baseTemp - landElevation * 0.45);
}
