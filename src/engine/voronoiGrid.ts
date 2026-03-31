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
  const jitterAmount = spacing * config.jitter * 0.5;

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

// Tam Voronoi harita verisi oluştur
export function createVoronoiMap(config: Partial<VoronoiMapConfig> = {}): VoronoiMapData {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // 1. Jittered noktalar
  const points = generateJitteredPoints(cfg);

  // 2. Voronoi graph
  const graph = createVoronoiGraph(points, cfg.width, cfg.height);

  // 3. Paralel veri dizileri
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

// Kıyı kenarlarını bul ve Chaikin ile yumuşat
export function findCoastEdges(
  graph: VoronoiGraph,
  isLand: (cellIndex: number) => boolean,
  smoothIterations: number = 2,
): { from: number; to: number; smoothPath: Point[] }[] {
  const coastEdges: { from: number; to: number; smoothPath: Point[] }[] = [];

  for (const [a, b] of graph.edges) {
    const aLand = isLand(a);
    const bLand = isLand(b);
    if (aLand === bLand) continue;

    // Bu bir kıyı kenarı
    // İki hücrenin ortak Voronoi kenarını bul
    const sharedVertices = findSharedEdgeVertices(graph.cells[a], graph.cells[b]);
    if (sharedVertices.length >= 2) {
      const smoothPath = chaikinSmooth(sharedVertices, smoothIterations, false);
      coastEdges.push({ from: a, to: b, smoothPath });
    }
  }

  return coastEdges;
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

// Pixel koordinatından en yakın cell'i bul
export function findCellAtPoint(graph: VoronoiGraph, px: number, py: number): number {
  // Brute force en yakın merkez (küçük haritalar için yeterli)
  // Büyük haritalar için spatial hash eklenebilir
  let closest = -1;
  let minDist = Infinity;

  for (let i = 0; i < graph.cells.length; i++) {
    const c = graph.cells[i].center;
    const dx = c.x - px;
    const dy = c.y - py;
    const dist = dx * dx + dy * dy;
    if (dist < minDist) {
      minDist = dist;
      closest = i;
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
