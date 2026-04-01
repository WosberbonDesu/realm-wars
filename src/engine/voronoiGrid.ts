// Voronoi grid - Jittered noktalar + Voronoi graph oluşturma
// Azgaar'ın yaklaşımı: düzenli grid → jitter → Delaunay → Voronoi

import { Point, VoronoiGraph, VoronoiCell, createVoronoiGraph, chaikinSmooth } from './voronoi';
import { Alea } from './alea';

export interface VoronoiMapConfig {
  width: number;       // pixel genişlik
  height: number;      // pixel yükseklik
  cellCount: number;   // hedef hücre sayısı (~2000-5000)
  jitter: number;      // 0-1, noktaların grid'den sapma miktarı
  seed: number;
}

export interface VoronoiMapData {
  graph: VoronoiGraph;
  config: VoronoiMapConfig;
  // Hücre bazlı veri (paralel diziler)
  elevation: Float32Array;
  moisture: Float32Array;
  temperature: Float32Array;
  // Kıyı kenarları (smooth edilmiş)
  coastEdges: { from: number; to: number; smoothPath: Point[] }[];
}

const DEFAULT_CONFIG: VoronoiMapConfig = {
  width: 1200,
  height: 800,
  cellCount: 3000,
  jitter: 0.7,
  seed: 42,
};

// Jittered grid noktaları oluştur
export function generateJitteredPoints(config: VoronoiMapConfig): Point[] {
  const rng = new Alea(config.seed);
  const points: Point[] = [];

  // Grid spacing hesapla (yaklaşık cellCount noktaya ulaşmak için)
  const area = config.width * config.height;
  const cellArea = area / config.cellCount;
  const spacing = Math.sqrt(cellArea);

  const cols = Math.ceil(config.width / spacing);
  const rows = Math.ceil(config.height / spacing);
  const jitterAmount = spacing * config.jitter * 0.8; // Azgaar-level irregularity

  // Margin: kenar noktaları
  const margin = spacing * 0.5;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let x = margin + col * spacing + spacing * 0.5;
      let y = margin + row * spacing + spacing * 0.5;

      // Jitter
      x += rng.nextFloat(-jitterAmount, jitterAmount);
      y += rng.nextFloat(-jitterAmount, jitterAmount);

      // Sınır kontrolü
      x = Math.max(1, Math.min(config.width - 1, x));
      y = Math.max(1, Math.min(config.height - 1, y));

      points.push({ x, y });
    }
  }

  return points;
}

// Lloyd relaxation: hücre boyutlarını eşitlemek için noktaları centroid'lere taşı
function lloydRelax(points: Point[], width: number, height: number, iterations: number = 2): Point[] {
  let pts = points;
  for (let iter = 0; iter < iterations; iter++) {
    // Build temporary Voronoi
    const graph = createVoronoiGraph(pts, width, height);
    // Move each point to its cell centroid
    const newPts: Point[] = [];
    for (const cell of graph.cells) {
      if (cell.vertices.length < 3) {
        newPts.push(cell.center);
        continue;
      }
      // Compute centroid of polygon
      let cx = 0, cy = 0, area = 0;
      for (let i = 0; i < cell.vertices.length; i++) {
        const j = (i + 1) % cell.vertices.length;
        const cross = cell.vertices[i].x * cell.vertices[j].y - cell.vertices[j].x * cell.vertices[i].y;
        area += cross;
        cx += (cell.vertices[i].x + cell.vertices[j].x) * cross;
        cy += (cell.vertices[i].y + cell.vertices[j].y) * cross;
      }
      area /= 2;
      if (Math.abs(area) < 1e-6) {
        newPts.push(cell.center);
      } else {
        cx /= (6 * area);
        cy /= (6 * area);
        // Clamp to bounds
        newPts.push({
          x: Math.max(1, Math.min(width - 1, cx)),
          y: Math.max(1, Math.min(height - 1, cy)),
        });
      }
    }
    pts = newPts;
  }
  return pts;
}

// Tam Voronoi harita verisi oluştur
export function createVoronoiMap(config: Partial<VoronoiMapConfig> = {}): VoronoiMapData {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // 1. Jittered noktalar
  const points = generateJitteredPoints(cfg);

  // 2. Lloyd relaxation ile hücre boyutlarını eşitle
  const relaxed = lloydRelax(points, cfg.width, cfg.height, 2);

  // 3. Voronoi graph
  const graph = createVoronoiGraph(relaxed, cfg.width, cfg.height);

  // 4. Paralel veri dizileri
  const n = graph.cells.length;
  const elevation = new Float32Array(n);
  const moisture = new Float32Array(n);
  const temperature = new Float32Array(n);

  return {
    graph,
    config: cfg,
    elevation,
    moisture,
    temperature,
    coastEdges: [],
  };
}

// Voronoi hücre merkezini normalize et (0-1 aralığına)
export function normalizeCoord(cell: VoronoiCell, width: number, height: number): { nx: number; ny: number } {
  return {
    nx: cell.center.x / width,
    ny: cell.center.y / height,
  };
}

// Kıyı kenarlarını bul, fraktal detay ekle ve Chaikin ile yumuşat
export function findCoastEdges(
  graph: VoronoiGraph,
  isLand: (cellIndex: number) => boolean,
  smoothIterations: number = 2,
  fractalAmount: number = 3.5,
): { from: number; to: number; smoothPath: Point[] }[] {
  const coastEdges: { from: number; to: number; smoothPath: Point[] }[] = [];

  for (const [a, b] of graph.edges) {
    const aLand = isLand(a);
    const bLand = isLand(b);
    if (aLand === bLand) continue;

    const sharedVertices = findSharedEdgeVertices(graph.cells[a], graph.cells[b]);
    if (sharedVertices.length >= 2) {
      // Fraktal detay: kenar noktaları arasına midpoint displacement ekle
      const fractalized = addFractalDetail(sharedVertices, fractalAmount);
      const smoothPath = chaikinSmooth(fractalized, smoothIterations, false);
      coastEdges.push({ from: a, to: b, smoothPath });
    }
  }

  return coastEdges;
}

// Midpoint displacement ile fraktal kıyı detayı
function addFractalDetail(points: Point[], amount: number, depth: number = 3): Point[] {
  if (depth <= 0 || points.length < 2) return points;

  const result: Point[] = [points[0]];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];

    // Midpoint
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;

    // Normal direction (perpendicular to edge)
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.5) { result.push(b); continue; }

    const nx = -dy / len;
    const ny = dx / len;

    // Deterministic displacement based on position (seeded by coordinates)
    const seed = Math.sin(mx * 12.9898 + my * 78.233) * 43758.5453;
    const disp = ((seed - Math.floor(seed)) - 0.5) * 2 * amount;

    result.push({ x: mx + nx * disp, y: my + ny * disp });
    result.push(b);
  }

  // Recurse with reduced amplitude
  return addFractalDetail(result, amount * 0.5, depth - 1);
}

// İki Voronoi hücresinin ortak kenar köşelerini bul
function findSharedEdgeVertices(cellA: VoronoiCell, cellB: VoronoiCell): Point[] {
  const shared: Point[] = [];
  const tolerance = 0.5;

  for (const va of cellA.vertices) {
    for (const vb of cellB.vertices) {
      const dx = va.x - vb.x;
      const dy = va.y - vb.y;
      if (dx * dx + dy * dy < tolerance * tolerance) {
        shared.push(va);
        break;
      }
    }
  }

  return shared;
}

// Cell index'ten key oluştur (geriye uyumluluk)
export function cellKey(index: number): string {
  return `v${index}`;
}

// Spatial hash for fast cell lookup
let _spatialHash: { grid: Map<string, number[]>; cellSize: number; graph: VoronoiGraph } | null = null;

function buildSpatialHash(graph: VoronoiGraph, cellSize: number = 50): Map<string, number[]> {
  const grid = new Map<string, number[]>();
  for (let i = 0; i < graph.cells.length; i++) {
    const c = graph.cells[i].center;
    const gx = Math.floor(c.x / cellSize);
    const gy = Math.floor(c.y / cellSize);
    const key = `${gx},${gy}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key)!.push(i);
  }
  return grid;
}

// Pixel koordinatından en yakın cell'i bul (spatial hash ile O(1) amortized)
export function findCellAtPoint(graph: VoronoiGraph, px: number, py: number): number {
  // Build or reuse spatial hash
  if (!_spatialHash || _spatialHash.graph !== graph) {
    _spatialHash = { grid: buildSpatialHash(graph), cellSize: 50, graph };
  }

  const cs = _spatialHash.cellSize;
  const gx = Math.floor(px / cs);
  const gy = Math.floor(py / cs);

  // Search 3x3 neighborhood
  let closest = -1;
  let minDist = Infinity;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const bucket = _spatialHash.grid.get(`${gx+dx},${gy+dy}`);
      if (!bucket) continue;
      for (const i of bucket) {
        const c = graph.cells[i].center;
        const d = (c.x - px) ** 2 + (c.y - py) ** 2;
        if (d < minDist) { minDist = d; closest = i; }
      }
    }
  }

  return closest;
}

// İki cell arası mesafe (pixel)
export function cellDistance(graph: VoronoiGraph, a: number, b: number): number {
  const ca = graph.cells[a].center;
  const cb = graph.cells[b].center;
  return Math.sqrt((ca.x - cb.x) ** 2 + (ca.y - cb.y) ** 2);
}
