// Wind simulation - Azgaar tarzı rüzgar yönü ve yoğunluğu
// Harita genelinde prevailing wind + terrain etkisi

import { hexKey, HexTerrain } from '../types/game';
import { isInMapBounds } from './hexUtils';
import { SEA_LEVEL } from './biomes';
import { Alea } from './alea';

export interface WindCell {
  direction: number;    // 0-360 derece
  strength: number;     // 0-1
}

export interface WindResult {
  windMap: Map<string, WindCell>;
  prevailingDirection: number;  // harita geneli hakim rüzgar
  prevailingStrength: number;
}

export function generateWind(
  elevationMap: Map<string, number>,
  terrainMap: Map<string, HexTerrain>,
  radius: number,
  rng: Alea,
): WindResult {
  const windMap = new Map<string, WindCell>();

  // Hakim rüzgar yönü (trade winds benzeri)
  const prevailingDirection = rng.nextFloat(180, 300); // genelde batıdan
  const prevailingStrength = rng.nextFloat(0.3, 0.7);

  for (const [key, elev] of elevationMap) {
    const [q, r] = key.split(',').map(Number);
    const terrain = terrainMap.get(key);

    // Baz rüzgar: hakim + enlem etkisi
    const dist = Math.sqrt(q * q + r * r + q * r) / radius;
    let direction = prevailingDirection + dist * 30; // kutuplara doğru döner
    let strength = prevailingStrength;

    // Deniz üzerinde daha güçlü
    if (elev < SEA_LEVEL) {
      strength *= 1.3;
    }

    // Dağlar rüzgarı bloklar
    if (terrain === HexTerrain.Mountain || terrain === HexTerrain.Snow) {
      strength *= 0.3;
      direction += rng.nextFloat(-40, 40); // dağda dağınık
    }

    // Orman azaltır
    if (terrain === HexTerrain.Forest) {
      strength *= 0.6;
    }

    // Ova güçlendirir
    if (terrain === HexTerrain.Plains || terrain === HexTerrain.Desert) {
      strength *= 1.1;
    }

    // Rastgele varyasyon
    direction += rng.nextFloat(-15, 15);
    strength += rng.nextFloat(-0.1, 0.1);

    windMap.set(key, {
      direction: ((direction % 360) + 360) % 360,
      strength: Math.max(0, Math.min(1, strength)),
    });
  }

  return { windMap, prevailingDirection, prevailingStrength };
}
