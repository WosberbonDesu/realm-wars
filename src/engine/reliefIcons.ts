// Relief icons - Azgaar tarzı dağ/orman/çöl ikonları
// Poisson disc sampling ile doğal dağılım

import { HexCoord, hexKey, HexTerrain } from '../types/game';
import { hexToPixel } from './hexUtils';
import { SEA_LEVEL } from './biomes';
import { Alea } from './alea';

export interface ReliefIcon {
  x: number;           // pixel x
  y: number;           // pixel y
  type: ReliefType;
  size: number;        // 0.5 - 1.5
  rotation: number;    // 0-360
  icon: string;
}

export enum ReliefType {
  MountainPeak = 'mountain_peak',
  MountainRange = 'mountain_range',
  Hill = 'hill',
  Conifer = 'conifer',        // iğne yapraklı
  Deciduous = 'deciduous',    // yaprak döken
  Palm = 'palm',
  DeadTree = 'dead_tree',
  Cactus = 'cactus',
  Swamp = 'swamp',
  SnowPeak = 'snow_peak',
  Dune = 'dune',
  Rock = 'rock',
}

const RELIEF_ICONS: Record<ReliefType, string> = {
  [ReliefType.MountainPeak]: '▲',
  [ReliefType.MountainRange]: '⛰',
  [ReliefType.Hill]: '∧',
  [ReliefType.Conifer]: '🌲',
  [ReliefType.Deciduous]: '🌳',
  [ReliefType.Palm]: '🌴',
  [ReliefType.DeadTree]: '🌵',
  [ReliefType.Cactus]: '🌵',
  [ReliefType.Swamp]: '⌇',
  [ReliefType.SnowPeak]: '❄',
  [ReliefType.Dune]: '〰',
  [ReliefType.Rock]: '⬢',
};

// Terrain → uygun relief tipi ve yoğunluk
interface TerrainReliefConfig {
  types: { type: ReliefType; weight: number }[];
  density: number;  // hex başına ortalama ikon sayısı
  minSize: number;
  maxSize: number;
}

const TERRAIN_RELIEF: Record<string, TerrainReliefConfig> = {
  [HexTerrain.Mountain]: {
    types: [
      { type: ReliefType.MountainPeak, weight: 3 },
      { type: ReliefType.MountainRange, weight: 5 },
      { type: ReliefType.Rock, weight: 2 },
    ],
    density: 1.5, minSize: 0.8, maxSize: 1.4,
  },
  [HexTerrain.Snow]: {
    types: [
      { type: ReliefType.SnowPeak, weight: 4 },
      { type: ReliefType.MountainPeak, weight: 3 },
    ],
    density: 1.2, minSize: 0.7, maxSize: 1.3,
  },
  [HexTerrain.Forest]: {
    types: [
      { type: ReliefType.Conifer, weight: 4 },
      { type: ReliefType.Deciduous, weight: 4 },
    ],
    density: 2.0, minSize: 0.6, maxSize: 1.2,
  },
  [HexTerrain.Desert]: {
    types: [
      { type: ReliefType.Dune, weight: 4 },
      { type: ReliefType.Cactus, weight: 3 },
      { type: ReliefType.Rock, weight: 1 },
    ],
    density: 0.8, minSize: 0.5, maxSize: 1.0,
  },
  [HexTerrain.Swamp]: {
    types: [
      { type: ReliefType.Swamp, weight: 4 },
      { type: ReliefType.DeadTree, weight: 3 },
    ],
    density: 1.0, minSize: 0.5, maxSize: 0.9,
  },
  [HexTerrain.Tundra]: {
    types: [
      { type: ReliefType.Rock, weight: 3 },
      { type: ReliefType.Hill, weight: 2 },
    ],
    density: 0.5, minSize: 0.4, maxSize: 0.8,
  },
  [HexTerrain.Plains]: {
    types: [
      { type: ReliefType.Hill, weight: 2 },
    ],
    density: 0.15, minSize: 0.4, maxSize: 0.7,
  },
};

export function generateReliefIcons(
  elevationMap: Map<string, number>,
  terrainMap: Map<string, HexTerrain>,
  temperatureMap: Map<string, number>,
  radius: number,
  rng: Alea,
  hexSize: number = 32,
): ReliefIcon[] {
  const icons: ReliefIcon[] = [];

  for (const [key, terrain] of terrainMap) {
    const elev = elevationMap.get(key);
    if (elev === undefined || elev < SEA_LEVEL) continue;

    const config = TERRAIN_RELIEF[terrain];
    if (!config) continue;

    const [q, r] = key.split(',').map(Number);
    const { x: cx, y: cy } = hexToPixel(q, r);
    const temp = temperatureMap.get(key) || 0.5;

    // Sıcaklığa göre ağaç tipi ayarla
    let adjustedTypes = config.types;
    if (terrain === HexTerrain.Forest) {
      if (temp > 0.7) {
        // Tropik: palm ağırlıklı
        adjustedTypes = [
          { type: ReliefType.Palm, weight: 4 },
          { type: ReliefType.Deciduous, weight: 3 },
        ];
      } else if (temp < 0.3) {
        // Soğuk: sadece iğne yapraklı
        adjustedTypes = [
          { type: ReliefType.Conifer, weight: 6 },
        ];
      }
    }

    // Weighted random type picker
    const totalWeight = adjustedTypes.reduce((s, t) => s + t.weight, 0);

    // Poisson disc benzeri: hex içinde rastgele noktalara ikon yerleştir
    const count = Math.round(config.density + (rng.next() - 0.5) * config.density);

    for (let i = 0; i < count; i++) {
      // Hex içinde rastgele pozisyon (merkezden hexSize/2 uzaklıkta)
      const angle = rng.nextFloat(0, Math.PI * 2);
      const dist = rng.nextFloat(0, hexSize * 0.35);
      const px = cx + Math.cos(angle) * dist;
      const py = cy + Math.sin(angle) * dist;

      // Poisson disc: yakın ikon var mı? (basit kontrol)
      const minDist = hexSize * 0.2;
      const tooClose = icons.some(ic => {
        const dx = ic.x - px;
        const dy = ic.y - py;
        return (dx * dx + dy * dy) < minDist * minDist;
      });
      if (tooClose) continue;

      // Weighted pick
      let rand = rng.nextFloat(0, totalWeight);
      let selectedType = adjustedTypes[0].type;
      for (const t of adjustedTypes) {
        rand -= t.weight;
        if (rand <= 0) {
          selectedType = t.type;
          break;
        }
      }

      icons.push({
        x: px,
        y: py,
        type: selectedType,
        size: rng.nextFloat(config.minSize, config.maxSize),
        rotation: rng.nextFloat(-15, 15),
        icon: RELIEF_ICONS[selectedType],
      });
    }
  }

  return icons;
}

// Canvas'a relief ikonlarını çiz
export function drawReliefIcons(
  ctx: CanvasRenderingContext2D,
  icons: ReliefIcon[],
): void {
  for (const icon of icons) {
    ctx.save();
    ctx.translate(icon.x, icon.y);
    ctx.rotate((icon.rotation * Math.PI) / 180);

    const fontSize = 10 * icon.size;

    if (icon.type === ReliefType.MountainPeak || icon.type === ReliefType.MountainRange ||
        icon.type === ReliefType.Hill || icon.type === ReliefType.SnowPeak) {
      // Metin bazlı ikonlar
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = icon.type === ReliefType.SnowPeak ? '#C0C8D0' : '#6B5B4A';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icon.icon, 0, 0);
    } else if (icon.type === ReliefType.Swamp) {
      // Çizgi bazlı
      ctx.strokeStyle = '#5B6B4A';
      ctx.lineWidth = 1;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 3, -fontSize * 0.3);
        ctx.lineTo(i * 3, fontSize * 0.3);
        ctx.stroke();
      }
    } else if (icon.type === ReliefType.Dune) {
      // Dalga çizgi
      ctx.strokeStyle = '#C4985A';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-fontSize * 0.5, 0);
      ctx.quadraticCurveTo(-fontSize * 0.25, -fontSize * 0.3, 0, 0);
      ctx.quadraticCurveTo(fontSize * 0.25, fontSize * 0.3, fontSize * 0.5, 0);
      ctx.stroke();
    } else {
      // Emoji ikonlar
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icon.icon, 0, 0);
    }

    ctx.restore();
  }
}
