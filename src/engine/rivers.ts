// Nehir üretimi - Azgaar'ın flux accumulation yaklaşımı
// Her hex'ten en alçak komşuya su akışı simüle edilir
import { HexCoord, hexKey } from '../types/game';
import { getNeighbors, isInMapBounds } from './hexUtils';
import { SEA_LEVEL } from './biomes';

export interface RiverSegment {
  id: number;
  path: HexCoord[];   // kaynak → deniz/göl
  flux: number;        // toplam su miktarı
  name: string;
}

interface CellData {
  key: string;
  q: number;
  r: number;
  elevation: number;
  moisture: number;
  flux: number;
  downhill: string | null; // en alçak komşunun key'i
}

export interface RiverResult {
  rivers: RiverSegment[];
  fluxMap: Map<string, number>;     // key → flux value
  riverCells: Set<string>;          // nehir geçen hücreler
  lakeCells: Set<string>;           // göl oluşan hücreler
}

export function generateRivers(
  elevationMap: Map<string, number>,
  moistureMap: Map<string, number>,
  radius: number,
  minFlux: number = 3,
): RiverResult {
  // 1. Hücre verilerini hazırla
  const cells = new Map<string, CellData>();

  for (const [key, elev] of elevationMap) {
    const [q, r] = key.split(',').map(Number);
    cells.set(key, {
      key,
      q,
      r,
      elevation: elev,
      moisture: moistureMap.get(key) || 0,
      flux: 0,
      downhill: null,
    });
  }

  // 2. Depression filling - çukurları doldur
  fillDepressions(cells, radius);

  // 3. Downhill flow direction hesapla
  for (const [key, cell] of cells) {
    if (cell.elevation < SEA_LEVEL) continue; // su hücreleri atla

    const neighbors = getNeighbors({ q: cell.q, r: cell.r });
    let lowestKey: string | null = null;
    let lowestElev = cell.elevation;

    for (const n of neighbors) {
      if (!isInMapBounds(n.q, n.r, radius)) continue;
      const nKey = hexKey(n.q, n.r);
      const nCell = cells.get(nKey);
      if (nCell && nCell.elevation < lowestElev) {
        lowestElev = nCell.elevation;
        lowestKey = nKey;
      }
    }
    cell.downhill = lowestKey;
  }

  // 4. Flux accumulation (yüksekten alçağa sırala, su akıt)
  const sorted = [...cells.values()]
    .filter(c => c.elevation >= SEA_LEVEL)
    .sort((a, b) => b.elevation - a.elevation);

  for (const cell of sorted) {
    // Başlangıç flux = moisture (yağış)
    cell.flux += cell.moisture;

    if (cell.downhill) {
      const downstream = cells.get(cell.downhill);
      if (downstream) {
        downstream.flux += cell.flux;
      }
    }
  }

  // 5. Nehir path'lerini oluştur
  const fluxMap = new Map<string, number>();
  const riverCells = new Set<string>();
  const lakeCells = new Set<string>();
  const rivers: RiverSegment[] = [];

  // Flux eşiğini aşan hücrelerden nehir başlat
  const visited = new Set<string>();
  let riverId = 0;

  // Yüksek flux'lu hücreleri kaynak olarak bul
  const sources = sorted
    .filter(c => c.flux >= minFlux && !visited.has(c.key))
    .sort((a, b) => b.flux - a.flux);

  for (const source of sources) {
    if (visited.has(source.key)) continue;

    const path: HexCoord[] = [];
    let current: CellData | undefined = source;

    // Nehri kaynaktan denize/göle kadar takip et
    while (current && !visited.has(current.key)) {
      path.push({ q: current.q, r: current.r });
      visited.add(current.key);
      riverCells.add(current.key);
      fluxMap.set(current.key, current.flux);

      if (current.downhill) {
        const next = cells.get(current.downhill);
        if (next && next.elevation < SEA_LEVEL) {
          // Denize ulaştı
          break;
        }
        if (next && next.downhill === current.key) {
          // Çift yönlü referans → göl oluştur
          lakeCells.add(current.key);
          lakeCells.add(next.key);
          break;
        }
        current = next;
      } else {
        // Çıkmaz → göl
        lakeCells.add(current.key);
        break;
      }
    }

    if (path.length >= 2) {
      rivers.push({
        id: riverId++,
        path,
        flux: source.flux,
        name: '', // nameGenerator tarafından doldurulacak
      });
    }
  }

  return { rivers, fluxMap, riverCells, lakeCells };
}

// Basit depression filling: çukurdaki hücreleri komşuların minumum seviyesine çıkar
function fillDepressions(cells: Map<string, CellData>, radius: number): void {
  let changed = true;
  let iterations = 0;
  const maxIterations = 50;

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;

    for (const [, cell] of cells) {
      if (cell.elevation < SEA_LEVEL) continue;

      const neighbors = getNeighbors({ q: cell.q, r: cell.r });
      let hasLowerNeighbor = false;

      for (const n of neighbors) {
        if (!isInMapBounds(n.q, n.r, radius)) continue;
        const nCell = cells.get(hexKey(n.q, n.r));
        if (nCell && nCell.elevation < cell.elevation) {
          hasLowerNeighbor = true;
          break;
        }
      }

      // Çukurda kalan hücre: en alçak komşudan biraz yükselt
      if (!hasLowerNeighbor) {
        let minNeighborElev = 1;
        for (const n of neighbors) {
          if (!isInMapBounds(n.q, n.r, radius)) continue;
          const nCell = cells.get(hexKey(n.q, n.r));
          if (nCell && nCell.elevation < minNeighborElev) {
            minNeighborElev = nCell.elevation;
          }
        }
        if (minNeighborElev < cell.elevation) continue;
        cell.elevation = minNeighborElev + 0.001;
        changed = true;
      }
    }
  }
}
