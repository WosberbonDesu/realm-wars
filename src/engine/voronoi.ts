/**
 * Voronoi tessellation + Poisson disk sampling
 * Hex grid yerine organik bölgeler oluşturur.
 */

import { MapPoint } from '../types/region';

// ═══ JITTERED GRID (Azgaar yaklaşımı) ═══
// Düzenli grid + rastgele offset → daha uniform Voronoi hücreleri

export function jitteredGrid(
  width: number,
  height: number,
  spacing: number,
  seed: number,
  jitter: number = 0.5, // 0=düzenli grid, 1=tamamen rastgele
): MapPoint[] {
  const rng = seedRng(seed);
  const points: MapPoint[] = [];
  const cols = Math.floor(width / spacing);
  const rows = Math.floor(height / spacing);
  const marginX = (width - cols * spacing) / 2;
  const marginY = (height - rows * spacing) / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = marginX + c * spacing + spacing * 0.5 + (rng() - 0.5) * spacing * jitter;
      const y = marginY + r * spacing + spacing * 0.5 + (rng() - 0.5) * spacing * jitter;
      if (x > 0 && x < width && y > 0 && y < height) {
        points.push({ x, y });
      }
    }
  }
  return points;
}

// ═══ LLOYD RELAXATION ═══
// Voronoi hücrelerini daha düzenli hale getirir (1-2 iterasyon yeterli)

export function lloydRelaxation(
  points: MapPoint[],
  width: number,
  height: number,
  iterations: number = 2,
): MapPoint[] {
  let current = [...points];

  for (let iter = 0; iter < iterations; iter++) {
    const cells = computeVoronoi(current, width, height);
    const relaxed: MapPoint[] = [];

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      if (cell.vertices.length < 3) {
        relaxed.push(current[i]);
        continue;
      }
      // Hücrenin centroid'ine taşı
      let cx = 0, cy = 0;
      for (const v of cell.vertices) { cx += v.x; cy += v.y; }
      cx /= cell.vertices.length;
      cy /= cell.vertices.length;
      // Sınırlar içinde tut
      relaxed.push({
        x: Math.max(1, Math.min(width - 1, cx)),
        y: Math.max(1, Math.min(height - 1, cy)),
      });
    }

    current = relaxed;
  }

  return current;
}

// ═══ POISSON DISK SAMPLING ═══
// Rastgele ama eşit dağılmış noktalar üretir (birbirine çok yakın olmayan)

export function poissonDiskSampling(
  width: number,
  height: number,
  minDist: number,
  seed: number,
  maxAttempts: number = 30,
): MapPoint[] {
  const rng = seedRng(seed);
  const cellSize = minDist / Math.SQRT2;
  const gridW = Math.ceil(width / cellSize);
  const gridH = Math.ceil(height / cellSize);
  const grid: (MapPoint | null)[] = new Array(gridW * gridH).fill(null);
  const points: MapPoint[] = [];
  const active: MapPoint[] = [];

  const gridIdx = (x: number, y: number) => {
    const gx = Math.floor(x / cellSize);
    const gy = Math.floor(y / cellSize);
    if (gx < 0 || gx >= gridW || gy < 0 || gy >= gridH) return -1;
    return gy * gridW + gx;
  };

  // İlk nokta
  const first: MapPoint = { x: width * 0.5 + (rng() - 0.5) * width * 0.3, y: height * 0.5 + (rng() - 0.5) * height * 0.3 };
  points.push(first);
  active.push(first);
  const fi = gridIdx(first.x, first.y);
  if (fi >= 0) grid[fi] = first;

  while (active.length > 0) {
    const idx = Math.floor(rng() * active.length);
    const point = active[idx];
    let found = false;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const angle = rng() * Math.PI * 2;
      const dist = minDist + rng() * minDist;
      const nx = point.x + Math.cos(angle) * dist;
      const ny = point.y + Math.sin(angle) * dist;

      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

      const gi = gridIdx(nx, ny);
      if (gi < 0) continue;

      // Komşu hücreleri kontrol et
      let tooClose = false;
      const gx = Math.floor(nx / cellSize);
      const gy = Math.floor(ny / cellSize);
      for (let dy = -2; dy <= 2 && !tooClose; dy++) {
        for (let dx = -2; dx <= 2 && !tooClose; dx++) {
          const cx = gx + dx;
          const cy = gy + dy;
          if (cx < 0 || cx >= gridW || cy < 0 || cy >= gridH) continue;
          const neighbor = grid[cy * gridW + cx];
          if (neighbor) {
            const ddx = neighbor.x - nx;
            const ddy = neighbor.y - ny;
            if (ddx * ddx + ddy * ddy < minDist * minDist) {
              tooClose = true;
            }
          }
        }
      }

      if (!tooClose) {
        const np: MapPoint = { x: nx, y: ny };
        points.push(np);
        active.push(np);
        grid[gi] = np;
        found = true;
        break;
      }
    }

    if (!found) {
      active.splice(idx, 1);
    }
  }

  return points;
}

// ═══ VORONOI TESSELLATION ═══
// Her nokta için en yakın komşu bölgesini hesaplar

export interface VoronoiCell {
  center: MapPoint;
  vertices: MapPoint[];
  neighborIndices: number[];
}

/**
 * Basit Voronoi: her nokta için hücre köşelerini hesaplar.
 * Fortune's algorithm yerine brute-force Delaunay → dual Voronoi.
 * Küçük haritalar (< 1000 nokta) için yeterli performans.
 */
export function computeVoronoi(
  points: MapPoint[],
  width: number,
  height: number,
): VoronoiCell[] {
  const n = points.length;
  const cells: VoronoiCell[] = points.map(p => ({
    center: p,
    vertices: [],
    neighborIndices: [],
  }));

  // Delaunay triangulation (Bowyer-Watson)
  const triangles = delaunayTriangulation(points, width, height);

  // Her üçgenin circumcenter'ı = Voronoi köşesi
  const circumcenters: MapPoint[] = triangles.map(tri => {
    return circumcenter(points[tri[0]], points[tri[1]], points[tri[2]]);
  });

  // Her nokta için hangi üçgenlerde yer aldığını bul
  const pointTriangles: number[][] = Array.from({ length: n }, () => []);
  for (let ti = 0; ti < triangles.length; ti++) {
    const [a, b, c] = triangles[ti];
    if (a < n) pointTriangles[a].push(ti);
    if (b < n) pointTriangles[b].push(ti);
    if (c < n) pointTriangles[c].push(ti);
  }

  // Voronoi hücreleri oluştur
  for (let pi = 0; pi < n; pi++) {
    const triIndices = pointTriangles[pi];
    if (triIndices.length < 3) continue;

    // Circumcenter'ları merkez etrafında saat yönünde sırala
    const center = points[pi];
    const ccs = triIndices.map(ti => circumcenters[ti]);
    ccs.sort((a, b) => {
      const aa = Math.atan2(a.y - center.y, a.x - center.x);
      const ba = Math.atan2(b.y - center.y, b.x - center.x);
      return aa - ba;
    });

    // Harita sınırlarına kırp
    cells[pi].vertices = clipPolygonToRect(ccs, 0, 0, width, height);

    // Komşuları bul (ortak üçgen paylaşan noktalar)
    const neighborSet = new Set<number>();
    for (const ti of triIndices) {
      const [a, b, c] = triangles[ti];
      if (a !== pi && a < n) neighborSet.add(a);
      if (b !== pi && b < n) neighborSet.add(b);
      if (c !== pi && c < n) neighborSet.add(c);
    }
    cells[pi].neighborIndices = [...neighborSet];
  }

  return cells;
}

// ═══ DELAUNAY TRIANGULATION (Bowyer-Watson) ═══

function delaunayTriangulation(
  points: MapPoint[],
  width: number,
  height: number,
): [number, number, number][] {
  const n = points.length;
  // Super-triangle (haritayı tamamen kaplar)
  const margin = Math.max(width, height) * 2;
  const superPoints: MapPoint[] = [
    { x: -margin, y: -margin },
    { x: width + margin * 2, y: -margin },
    { x: width / 2, y: height + margin * 2 },
  ];
  const allPoints = [...points, ...superPoints];
  const si = n; // super triangle indices: n, n+1, n+2

  let triangles: [number, number, number][] = [[si, si + 1, si + 2]];

  for (let pi = 0; pi < n; pi++) {
    const p = allPoints[pi];
    const badTriangles: number[] = [];

    // Bu noktayı içeren (circumcircle'ında olan) üçgenleri bul
    for (let ti = 0; ti < triangles.length; ti++) {
      const [a, b, c] = triangles[ti];
      if (inCircumcircle(p, allPoints[a], allPoints[b], allPoints[c])) {
        badTriangles.push(ti);
      }
    }

    // Bad triangle'ların dış kenarlarını bul (polygon hole)
    const edges: [number, number][] = [];
    for (const ti of badTriangles) {
      const [a, b, c] = triangles[ti];
      edges.push([a, b], [b, c], [c, a]);
    }

    // Sadece bir kez görünen kenarlar (paylaşılmayan)
    const uniqueEdges: [number, number][] = [];
    for (let i = 0; i < edges.length; i++) {
      let shared = false;
      for (let j = 0; j < edges.length; j++) {
        if (i === j) continue;
        if ((edges[i][0] === edges[j][1] && edges[i][1] === edges[j][0]) ||
            (edges[i][0] === edges[j][0] && edges[i][1] === edges[j][1])) {
          shared = true;
          break;
        }
      }
      if (!shared) uniqueEdges.push(edges[i]);
    }

    // Bad triangle'ları sil (sondan başlayarak)
    badTriangles.sort((a, b) => b - a);
    for (const ti of badTriangles) {
      triangles.splice(ti, 1);
    }

    // Yeni üçgenler oluştur
    for (const [a, b] of uniqueEdges) {
      triangles.push([pi, a, b]);
    }
  }

  // Super-triangle noktalarını içeren üçgenleri temizle
  triangles = triangles.filter(([a, b, c]) => a < n && b < n && c < n);

  return triangles;
}

function inCircumcircle(p: MapPoint, a: MapPoint, b: MapPoint, c: MapPoint): boolean {
  const ax = a.x - p.x, ay = a.y - p.y;
  const bx = b.x - p.x, by = b.y - p.y;
  const cx = c.x - p.x, cy = c.y - p.y;
  const det = (ax * ax + ay * ay) * (bx * cy - cx * by)
            - (bx * bx + by * by) * (ax * cy - cx * ay)
            + (cx * cx + cy * cy) * (ax * by - bx * ay);
  return det > 0;
}

function circumcenter(a: MapPoint, b: MapPoint, c: MapPoint): MapPoint {
  const D = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(D) < 1e-10) return { x: (a.x + b.x + c.x) / 3, y: (a.y + b.y + c.y) / 3 };
  const ux = ((a.x * a.x + a.y * a.y) * (b.y - c.y) + (b.x * b.x + b.y * b.y) * (c.y - a.y) + (c.x * c.x + c.y * c.y) * (a.y - b.y)) / D;
  const uy = ((a.x * a.x + a.y * a.y) * (c.x - b.x) + (b.x * b.x + b.y * b.y) * (a.x - c.x) + (c.x * c.x + c.y * c.y) * (b.x - a.x)) / D;
  return { x: ux, y: uy };
}

// ═══ POLYGON CLIPPING ═══

function clipPolygonToRect(
  poly: MapPoint[],
  minX: number, minY: number,
  maxX: number, maxY: number,
): MapPoint[] {
  if (poly.length === 0) return [];
  let output = [...poly];

  // Sutherland-Hodgman clipping
  const edges: [(p: MapPoint) => boolean, (a: MapPoint, b: MapPoint) => MapPoint][] = [
    [p => p.x >= minX, (a, b) => ({ x: minX, y: a.y + (b.y - a.y) * (minX - a.x) / (b.x - a.x) })],
    [p => p.x <= maxX, (a, b) => ({ x: maxX, y: a.y + (b.y - a.y) * (maxX - a.x) / (b.x - a.x) })],
    [p => p.y >= minY, (a, b) => ({ x: a.x + (b.x - a.x) * (minY - a.y) / (b.y - a.y), y: minY })],
    [p => p.y <= maxY, (a, b) => ({ x: a.x + (b.x - a.x) * (maxY - a.y) / (b.y - a.y), y: maxY })],
  ];

  for (const [inside, intersect] of edges) {
    if (output.length === 0) break;
    const input = output;
    output = [];
    for (let i = 0; i < input.length; i++) {
      const curr = input[i];
      const prev = input[(i + input.length - 1) % input.length];
      if (inside(curr)) {
        if (!inside(prev)) output.push(intersect(prev, curr));
        output.push(curr);
      } else if (inside(prev)) {
        output.push(intersect(prev, curr));
      }
    }
  }

  return output;
}

// ═══ BEZIER SMOOTHING ═══
// Voronoi köşelerini yumuşatarak organik sınırlar oluştur

export function smoothPolygon(
  vertices: MapPoint[],
  tension: number = 0.3,
): { smoothed: MapPoint[]; controls: [MapPoint, MapPoint][] } {
  const n = vertices.length;
  if (n < 3) return { smoothed: vertices, controls: [] };

  const smoothed: MapPoint[] = [];
  const controls: [MapPoint, MapPoint][] = [];

  for (let i = 0; i < n; i++) {
    const prev = vertices[(i - 1 + n) % n];
    const curr = vertices[i];
    const next = vertices[(i + 1) % n];

    // Catmull-Rom → Bezier kontrol noktaları
    const cp1: MapPoint = {
      x: curr.x + (next.x - prev.x) * tension,
      y: curr.y + (next.y - prev.y) * tension,
    };
    const cp2: MapPoint = {
      x: next.x - (vertices[(i + 2) % n].x - curr.x) * tension,
      y: next.y - (vertices[(i + 2) % n].y - curr.y) * tension,
    };

    smoothed.push(curr);
    controls.push([cp1, cp2]);
  }

  return { smoothed, controls };
}

// ═══ HELPERS ═══

function seedRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return (s % 10000) / 10000;
  };
}

export function pointDistance(a: MapPoint, b: MapPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function polygonArea(vertices: MapPoint[]): number {
  let area = 0;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  return Math.abs(area) / 2;
}
