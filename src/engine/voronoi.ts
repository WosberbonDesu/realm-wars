// Voronoi engine - Bowyer-Watson Delaunay triangulation + Voronoi dual graph
// Dependency-free implementasyon, Azgaar'ın delaunator yaklaşımından esinlenildi

export interface Point {
  x: number;
  y: number;
}

export interface Triangle {
  a: number;  // point index
  b: number;
  c: number;
}

export interface VoronoiCell {
  index: number;
  center: Point;
  vertices: Point[];    // polygon köşeleri (sıralı)
  neighbors: number[];  // komşu cell indeksleri
}

export interface VoronoiGraph {
  points: Point[];
  cells: VoronoiCell[];
  triangles: Triangle[];
  edges: [number, number][];  // [cellA, cellB] komşuluk çiftleri
}

// ===== Bowyer-Watson Delaunay Triangulation =====

interface CircumCircle {
  x: number;
  y: number;
  r2: number; // radius squared
}

function circumcircle(p1: Point, p2: Point, p3: Point): CircumCircle {
  const ax = p1.x, ay = p1.y;
  const bx = p2.x, by = p2.y;
  const cx = p3.x, cy = p3.y;

  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(d) < 1e-10) {
    // Degenerate: collinear noktalar
    return { x: (ax + bx + cx) / 3, y: (ay + by + cy) / 3, r2: Infinity };
  }

  const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
  const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;

  const r2 = (ax - ux) * (ax - ux) + (ay - uy) * (ay - uy);
  return { x: ux, y: uy, r2 };
}

function inCircumcircle(p: Point, cc: CircumCircle): boolean {
  const dx = p.x - cc.x;
  const dy = p.y - cc.y;
  return (dx * dx + dy * dy) < cc.r2;
}

export function delaunay(points: Point[], width: number, height: number): Triangle[] {
  // Super triangle (harita sınırlarını tamamen kapsar)
  const margin = Math.max(width, height) * 10;
  const superA: Point = { x: -margin, y: -margin };
  const superB: Point = { x: width + margin * 2, y: -margin };
  const superC: Point = { x: width / 2, y: height + margin * 2 };

  const allPoints = [...points, superA, superB, superC];
  const n = points.length;
  const superIndices = [n, n + 1, n + 2];

  let triangles: { a: number; b: number; c: number; cc: CircumCircle }[] = [
    { a: superIndices[0], b: superIndices[1], c: superIndices[2], cc: circumcircle(superA, superB, superC) },
  ];

  // Her noktayı sırayla ekle
  for (let i = 0; i < n; i++) {
    const p = allPoints[i];
    const badTriangles: number[] = [];

    // Bu noktanın circumcircle'ı içinde olan üçgenleri bul
    for (let j = 0; j < triangles.length; j++) {
      if (inCircumcircle(p, triangles[j].cc)) {
        badTriangles.push(j);
      }
    }

    // Boundary polygon (polygon hole) kenarlarını bul
    const edges: [number, number][] = [];
    for (const bi of badTriangles) {
      const t = triangles[bi];
      const triEdges: [number, number][] = [[t.a, t.b], [t.b, t.c], [t.c, t.a]];

      for (const [ea, eb] of triEdges) {
        // Bu kenar sadece bir bad triangle'a ait mi?
        let shared = false;
        for (const bj of badTriangles) {
          if (bi === bj) continue;
          const t2 = triangles[bj];
          const t2Edges: [number, number][] = [[t2.a, t2.b], [t2.b, t2.c], [t2.c, t2.a]];
          for (const [e2a, e2b] of t2Edges) {
            if ((ea === e2a && eb === e2b) || (ea === e2b && eb === e2a)) {
              shared = true;
              break;
            }
          }
          if (shared) break;
        }
        if (!shared) edges.push([ea, eb]);
      }
    }

    // Bad triangle'ları kaldır (büyükten küçüğe sil)
    badTriangles.sort((a, b) => b - a);
    for (const bi of badTriangles) {
      triangles.splice(bi, 1);
    }

    // Yeni üçgenleri ekle
    for (const [ea, eb] of edges) {
      const cc = circumcircle(allPoints[i], allPoints[ea], allPoints[eb]);
      triangles.push({ a: i, b: ea, c: eb, cc });
    }
  }

  // Super triangle noktalarını içeren üçgenleri kaldır
  const result: Triangle[] = [];
  for (const t of triangles) {
    if (superIndices.includes(t.a) || superIndices.includes(t.b) || superIndices.includes(t.c)) {
      continue;
    }
    result.push({ a: t.a, b: t.b, c: t.c });
  }

  return result;
}

// ===== Delaunay → Voronoi Dual Graph =====

export function buildVoronoi(points: Point[], triangles: Triangle[], width: number, height: number): VoronoiGraph {
  const n = points.length;
  const cells: VoronoiCell[] = [];
  const edgeSet = new Set<string>();
  const edges: [number, number][] = [];

  // Her nokta için komşuları bul (Delaunay adjacency)
  const neighbors: Set<number>[] = Array.from({ length: n }, () => new Set());
  for (const t of triangles) {
    neighbors[t.a].add(t.b); neighbors[t.a].add(t.c);
    neighbors[t.b].add(t.a); neighbors[t.b].add(t.c);
    neighbors[t.c].add(t.a); neighbors[t.c].add(t.b);
  }

  // Her üçgenin circumcenter'ını hesapla
  const circumcenters: Point[] = triangles.map(t => {
    const cc = circumcircle(points[t.a], points[t.b], points[t.c]);
    return { x: cc.x, y: cc.y };
  });

  // Her nokta için Voronoi hücre köşelerini bul
  for (let i = 0; i < n; i++) {
    // Bu noktayı içeren üçgenleri bul
    const cellTriangles: number[] = [];
    for (let ti = 0; ti < triangles.length; ti++) {
      const t = triangles[ti];
      if (t.a === i || t.b === i || t.c === i) {
        cellTriangles.push(ti);
      }
    }

    if (cellTriangles.length === 0) {
      cells.push({
        index: i,
        center: points[i],
        vertices: [],
        neighbors: [...neighbors[i]],
      });
      continue;
    }

    // Circumcenter'ları saat yönünde sırala
    const center = points[i];
    const verts = cellTriangles.map(ti => circumcenters[ti]);

    // Açıya göre sırala (merkeze göre)
    verts.sort((a, b) => {
      const angleA = Math.atan2(a.y - center.y, a.x - center.x);
      const angleB = Math.atan2(b.y - center.y, b.x - center.x);
      return angleA - angleB;
    });

    // Sınır dışı köşeleri kırp
    const clipped = clipPolygon(verts, 0, 0, width, height);

    cells.push({
      index: i,
      center: points[i],
      vertices: clipped,
      neighbors: [...neighbors[i]],
    });

    // Edge listesi
    for (const ni of neighbors[i]) {
      if (ni > i) {
        const eKey = `${i}-${ni}`;
        if (!edgeSet.has(eKey)) {
          edgeSet.add(eKey);
          edges.push([i, ni]);
        }
      }
    }
  }

  return { points, cells, triangles, edges };
}

// ===== Polygon clipping (Sutherland-Hodgman) =====

function clipPolygon(polygon: Point[], minX: number, minY: number, maxX: number, maxY: number): Point[] {
  let output = polygon;

  // Clip against each edge
  const clipEdges: { inside: (p: Point) => boolean; intersect: (a: Point, b: Point) => Point }[] = [
    { // Left
      inside: (p) => p.x >= minX,
      intersect: (a, b) => ({ x: minX, y: a.y + (b.y - a.y) * (minX - a.x) / (b.x - a.x) }),
    },
    { // Right
      inside: (p) => p.x <= maxX,
      intersect: (a, b) => ({ x: maxX, y: a.y + (b.y - a.y) * (maxX - a.x) / (b.x - a.x) }),
    },
    { // Top
      inside: (p) => p.y >= minY,
      intersect: (a, b) => ({ x: a.x + (b.x - a.x) * (minY - a.y) / (b.y - a.y), y: minY }),
    },
    { // Bottom
      inside: (p) => p.y <= maxY,
      intersect: (a, b) => ({ x: a.x + (b.x - a.x) * (maxY - a.y) / (b.y - a.y), y: maxY }),
    },
  ];

  for (const edge of clipEdges) {
    if (output.length === 0) break;
    const input = output;
    output = [];

    for (let i = 0; i < input.length; i++) {
      const current = input[i];
      const next = input[(i + 1) % input.length];
      const curInside = edge.inside(current);
      const nextInside = edge.inside(next);

      if (curInside) {
        output.push(current);
        if (!nextInside) {
          output.push(edge.intersect(current, next));
        }
      } else if (nextInside) {
        output.push(edge.intersect(current, next));
      }
    }
  }

  return output;
}

// ===== Kıyı yumuşatma: Chaikin subdivision =====

export function chaikinSmooth(points: Point[], iterations: number = 2, closed: boolean = true): Point[] {
  let result = points;

  for (let iter = 0; iter < iterations; iter++) {
    const smoothed: Point[] = [];
    const len = result.length;

    for (let i = 0; i < len; i++) {
      const next = closed ? (i + 1) % len : Math.min(i + 1, len - 1);
      if (i === len - 1 && !closed) {
        smoothed.push(result[i]);
        break;
      }

      const p1 = result[i];
      const p2 = result[next];

      smoothed.push({
        x: p1.x * 0.75 + p2.x * 0.25,
        y: p1.y * 0.75 + p2.y * 0.25,
      });
      smoothed.push({
        x: p1.x * 0.25 + p2.x * 0.75,
        y: p1.y * 0.25 + p2.y * 0.75,
      });
    }

    result = smoothed;
  }

  return result;
}

// ===== Point-in-polygon test (ray casting) =====

export function pointInPolygon(px: number, py: number, polygon: Point[]): boolean {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;

    if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// ===== Tam pipeline: points → Voronoi graph =====

export function createVoronoiGraph(points: Point[], width: number, height: number): VoronoiGraph {
  const tris = delaunay(points, width, height);
  return buildVoronoi(points, tris, width, height);
}
