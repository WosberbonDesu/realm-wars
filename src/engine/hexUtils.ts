import { HexCoord } from '../types/game';
import { HEX_SIZE } from '../constants/game';

// Axial hex → pixel koordinat (pointy-top hexagon)
export function hexToPixel(q: number, r: number): { x: number; y: number } {
  const x = HEX_SIZE * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
  const y = HEX_SIZE * ((3 / 2) * r);
  return { x, y };
}

// Pixel → axial hex koordinat (tıklama için)
export function pixelToHex(px: number, py: number): HexCoord {
  const q = ((Math.sqrt(3) / 3) * px - (1 / 3) * py) / HEX_SIZE;
  const r = ((2 / 3) * py) / HEX_SIZE;
  return hexRound(q, r);
}

// Hex yuvarla (fractional → integer axial)
function hexRound(q: number, r: number): HexCoord {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);

  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);

  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;

  return { q: rq, r: rr };
}

// Komşu hex'ler (6 yön)
const DIRECTIONS: HexCoord[] = [
  { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
  { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
];

export function getNeighbors(coord: HexCoord): HexCoord[] {
  return DIRECTIONS.map(d => ({ q: coord.q + d.q, r: coord.r + d.r }));
}

// İki hex arası mesafe
export function hexDistance(a: HexCoord, b: HexCoord): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

// Belirli mesafedeki tüm hex'ler (görüş alanı vb.)
export function hexesInRange(center: HexCoord, range: number): HexCoord[] {
  const results: HexCoord[] = [];
  for (let q = -range; q <= range; q++) {
    for (let r = Math.max(-range, -q - range); r <= Math.min(range, -q + range); r++) {
      results.push({ q: center.q + q, r: center.r + r });
    }
  }
  return results;
}

// Pointy-top hexagon köşe noktaları (Skia Path için)
export function getHexCorners(cx: number, cy: number, size: number = HEX_SIZE): { x: number; y: number }[] {
  const corners: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    corners.push({
      x: cx + size * Math.cos(angle),
      y: cy + size * Math.sin(angle),
    });
  }
  return corners;
}

// Harita sınırları içinde mi
export function isInMapBounds(q: number, r: number, radius: number): boolean {
  const s = -q - r;
  return Math.abs(q) <= radius && Math.abs(r) <= radius && Math.abs(s) <= radius;
}
