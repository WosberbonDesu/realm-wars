import React, { useMemo, useCallback, useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { View, StyleSheet, Dimensions, LayoutChangeEvent } from 'react-native';
import {
  Canvas, Path, Skia, Group, Circle, Line, vec,
  LinearGradient, RadialGradient,
} from '@shopify/react-native-skia';
import {
  Gesture, GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withDecay, withTiming,
  runOnJS, type SharedValue,
} from 'react-native-reanimated';
import { useGameStore } from '../store/gameStore';
import { hexToPixel, getHexCorners, pixelToHex } from '../engine/hexUtils';
import { HexTile, HexCoord, HexTerrain, hexKey } from '../types/game';
import { HEX_SIZE, TERRAIN_PALETTE, BUILDING_ICONS, UNIT_ICONS } from '../constants/game';
import { COLORS } from '../constants/theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const S = HEX_SIZE;
// Canvas 2000x2000, left:-1000 top:-1000. Hex'leri canvas ortasina cizmek icin offset:
const CC = 1000;

// ===== HEX PATH HELPERS =====

function makeHexPath(cx: number, cy: number, size: number) {
  const path = Skia.Path.Make();
  const corners = getHexCorners(cx, cy, size);
  path.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < corners.length; i++) {
    path.lineTo(corners[i].x, corners[i].y);
  }
  path.close();
  return path;
}

// Inset hex (golge/derinlik icin)
function makeHexPathInset(cx: number, cy: number, size: number, inset: number) {
  return makeHexPath(cx, cy, size - inset);
}

// ===== TERRAIN DECORATION PATHS =====
// Organik/gercekci fantazi harita dekorasyonlari — bezier egrileri ile dogal formlar

function makeTreePaths(cx: number, cy: number, seed: number) {
  const paths: { path: ReturnType<typeof Skia.Path.Make>; color: string }[] = [];
  const rng = simpleRng(seed);
  const count = 3 + Math.floor(rng() * 3);

  for (let i = 0; i < count; i++) {
    const ox = (rng() - 0.5) * S * 0.8;
    const oy = (rng() - 0.5) * S * 0.55;
    const tx = cx + ox;
    const ty = cy + oy;
    const size = 3.5 + rng() * 4;
    const shade = rng();

    // Govde — ince organik cizgi
    const trunk = Skia.Path.Make();
    trunk.moveTo(tx, ty + size * 0.3);
    trunk.cubicTo(tx + rng() * 1.5, ty + size * 0.1, tx - rng() * 1, ty - size * 0.2, tx + (rng() - 0.5) * 0.8, ty - size * 0.15);
    paths.push({ path: trunk, color: '#3D2B1A' + (shade > 0.5 ? 'CC' : 'AA') });

    // Yaprak kubbeleri — 2-3 ust uste binmis organik blob
    const blobCount = 2 + Math.floor(rng() * 2);
    for (let j = 0; j < blobCount; j++) {
      const bx = tx + (rng() - 0.5) * size * 0.6;
      const by = ty - size * 0.15 - j * size * 0.22 + (rng() - 0.5) * 1.5;
      const br = size * (0.35 + rng() * 0.3);
      const blob = Skia.Path.Make();

      // Organik blob: 4 noktali bezier daire degil, yamukluk ekle
      const pts = 6;
      const angles: number[] = [];
      const radii: number[] = [];
      for (let k = 0; k < pts; k++) {
        angles.push((k / pts) * Math.PI * 2);
        radii.push(br * (0.75 + rng() * 0.5));
      }

      blob.moveTo(bx + radii[0] * Math.cos(angles[0]), by + radii[0] * Math.sin(angles[0]));
      for (let k = 0; k < pts; k++) {
        const next = (k + 1) % pts;
        const midAngle = (angles[k] + angles[next]) / 2;
        const cpR = (radii[k] + radii[next]) * 0.55;
        blob.quadTo(
          bx + cpR * Math.cos(midAngle) + (rng() - 0.5) * br * 0.3,
          by + cpR * Math.sin(midAngle) + (rng() - 0.5) * br * 0.3,
          bx + radii[next] * Math.cos(angles[next]),
          by + radii[next] * Math.sin(angles[next]),
        );
      }
      blob.close();

      const greens = ['#1B5E20', '#2E7D32', '#388E3C', '#1A4A1A', '#2D6B2D', '#245C24'];
      paths.push({ path: blob, color: greens[Math.floor(rng() * greens.length)] + (j === 0 ? 'DD' : 'BB') });
    }

    // Yaprak highlight — ust kisimda acik ton
    if (rng() > 0.4) {
      const hl = Skia.Path.Make();
      const hx = tx + (rng() - 0.5) * size * 0.3;
      const hy = ty - size * 0.5 + (rng() - 0.5) * 2;
      const hr = size * 0.2;
      hl.addCircle(hx, hy, hr);
      paths.push({ path: hl, color: '#4CAF5060' });
    }
  }
  return paths;
}

function makeMountainPaths(cx: number, cy: number, seed: number) {
  const paths: { path: ReturnType<typeof Skia.Path.Make>; color: string }[] = [];
  const rng = simpleRng(seed);

  // Ana dag — organik coklu nokta silueti
  const bw = S * 0.65;
  const bh = S * 0.6;

  // Arka dag (daha kucuk, hafif ofset)
  if (rng() > 0.3) {
    const bg = Skia.Path.Make();
    const bOx = (rng() - 0.5) * bw * 0.4;
    const bOy = bh * 0.05;
    bg.moveTo(cx - bw * 0.45 + bOx, cy + bh * 0.15 + bOy);
    bg.cubicTo(cx - bw * 0.2 + bOx, cy - bh * 0.2 + bOy, cx - bw * 0.05 + bOx, cy - bh * 0.35 + bOy, cx + bOx, cy - bh * 0.4 + bOy);
    bg.cubicTo(cx + bw * 0.1 + bOx, cy - bh * 0.3 + bOy, cx + bw * 0.3 + bOx, cy - bh * 0.1 + bOy, cx + bw * 0.4 + bOx, cy + bh * 0.15 + bOy);
    bg.close();
    paths.push({ path: bg, color: '#5A4A3899' });
  }

  // On dag — ana siluet
  const p = Skia.Path.Make();
  p.moveTo(cx - bw * 0.5, cy + bh * 0.2);
  p.cubicTo(
    cx - bw * 0.35, cy - bh * 0.1 + rng() * bh * 0.1,
    cx - bw * 0.15, cy - bh * 0.4 + rng() * bh * 0.05,
    cx + (rng() - 0.5) * 3, cy - bh * 0.55,
  );
  p.cubicTo(
    cx + bw * 0.15, cy - bh * 0.4 + rng() * bh * 0.1,
    cx + bw * 0.35, cy - bh * 0.1 + rng() * bh * 0.1,
    cx + bw * 0.5, cy + bh * 0.2,
  );
  p.close();
  paths.push({ path: p, color: '#6E5D4B' });

  // Kaya dokusu — birkaç koyu cizgi
  for (let i = 0; i < 2; i++) {
    const rx = cx + (rng() - 0.5) * bw * 0.5;
    const ry = cy - bh * 0.1 + rng() * bh * 0.2;
    const crack = Skia.Path.Make();
    crack.moveTo(rx, ry);
    crack.cubicTo(rx + rng() * 4, ry - rng() * 5, rx - rng() * 3, ry - rng() * 6, rx + (rng() - 0.5) * 5, ry - 4 - rng() * 4);
    paths.push({ path: crack, color: '#4A3A2860' });
  }

  // Kar kapagi — organik blob
  const snow = Skia.Path.Make();
  const sx = cx + (rng() - 0.5) * 2;
  const sy = cy - bh * 0.55;
  snow.moveTo(sx - bw * 0.08, sy + bh * 0.12);
  snow.cubicTo(sx - bw * 0.1, sy - bh * 0.02, sx - bw * 0.02, sy - bh * 0.08, sx + bw * 0.02, sy);
  snow.cubicTo(sx + bw * 0.06, sy + bh * 0.02, sx + bw * 0.12, sy + bh * 0.08, sx + bw * 0.15, sy + bh * 0.15);
  snow.cubicTo(sx + bw * 0.05, sy + bh * 0.12, sx - bw * 0.05, sy + bh * 0.14, sx - bw * 0.08, sy + bh * 0.12);
  snow.close();
  paths.push({ path: snow, color: '#E8EFF8E0' });

  return paths;
}

function makeWavePaths(cx: number, cy: number, seed: number) {
  const paths: { path: ReturnType<typeof Skia.Path.Make>; color: string }[] = [];
  const rng = simpleRng(seed);

  // Su dokusu — coklu katman organik dalgalar
  const waveCount = 4 + Math.floor(rng() * 2);
  for (let i = 0; i < waveCount; i++) {
    const wy = cy - S * 0.3 + i * S * 0.15 + (rng() - 0.5) * 3;
    const wx = cx - S * 0.4 + rng() * 3;
    const wave = Skia.Path.Make();
    const amp = 2 + rng() * 2;
    const len = S * (0.4 + rng() * 0.25);

    wave.moveTo(wx, wy);
    wave.cubicTo(wx + len * 0.25, wy - amp, wx + len * 0.5, wy + amp, wx + len * 0.75, wy - amp * 0.5);
    wave.cubicTo(wx + len * 0.88, wy + amp * 0.3, wx + len, wy, wx + len + 2, wy + 0.5);

    const alpha = Math.round(40 + rng() * 50).toString(16).padStart(2, '0');
    paths.push({ path: wave, color: i % 2 === 0 ? `#6BB8E8${alpha}` : `#4A9DD8${alpha}` });
  }

  // Isik yansimasi
  if (rng() > 0.3) {
    const shimmer = Skia.Path.Make();
    const sx = cx + (rng() - 0.5) * S * 0.3;
    const sy = cy + (rng() - 0.5) * S * 0.2;
    shimmer.moveTo(sx - 3, sy);
    shimmer.cubicTo(sx - 1, sy - 1.5, sx + 1, sy - 1.5, sx + 3, sy);
    paths.push({ path: shimmer, color: '#FFFFFF40' });
  }

  return paths;
}

function makeDesertPaths(cx: number, cy: number, seed: number) {
  const paths: { path: ReturnType<typeof Skia.Path.Make>; color: string }[] = [];
  const rng = simpleRng(seed);

  // Kum tepeleri — 2-3 katman yumusak egri
  const duneCount = 2 + Math.floor(rng() * 2);
  for (let i = 0; i < duneCount; i++) {
    const dune = Skia.Path.Make();
    const dy = cy + S * 0.05 + i * S * 0.12 + (rng() - 0.5) * 3;
    const dx = cx + (rng() - 0.5) * S * 0.15;
    const w = S * (0.45 + rng() * 0.2);
    const h = S * (0.12 + rng() * 0.08);

    dune.moveTo(dx - w, dy);
    dune.cubicTo(dx - w * 0.4, dy - h, dx + w * 0.3, dy - h * 0.8, dx + w, dy);

    const alpha = Math.round(30 + i * 15 + rng() * 20).toString(16).padStart(2, '0');
    paths.push({ path: dune, color: `#D4A843${alpha}` });
  }

  // Ruzgar cizgileri — ince dalgali paralel hatlar
  for (let i = 0; i < 3; i++) {
    const wind = Skia.Path.Make();
    const wy = cy + (rng() - 0.5) * S * 0.4;
    const wx = cx - S * 0.25 + rng() * 4;
    wind.moveTo(wx, wy);
    wind.cubicTo(wx + S * 0.1, wy - 1, wx + S * 0.2, wy + 0.5, wx + S * 0.3, wy - 0.5);
    paths.push({ path: wind, color: '#F0D888' + (20 + Math.floor(rng() * 25)).toString(16) });
  }

  // Kucuk taslar
  if (rng() > 0.5) {
    for (let i = 0; i < 2; i++) {
      const rock = Skia.Path.Make();
      const rx = cx + (rng() - 0.5) * S * 0.5;
      const ry = cy + (rng() - 0.5) * S * 0.3;
      const rs = 1 + rng() * 1.5;
      rock.addOval(Skia.XYWHRect(rx - rs, ry - rs * 0.6, rs * 2, rs * 1.2));
      paths.push({ path: rock, color: '#A08060' + (40 + Math.floor(rng() * 30)).toString(16) });
    }
  }

  return paths;
}

function makeSwampPaths(cx: number, cy: number, seed: number) {
  const paths: { path: ReturnType<typeof Skia.Path.Make>; color: string }[] = [];
  const rng = simpleRng(seed);

  // Su birikintileri — organik blob'lar
  const poolCount = 2 + Math.floor(rng() * 2);
  for (let i = 0; i < poolCount; i++) {
    const pool = Skia.Path.Make();
    const px = cx + (rng() - 0.5) * S * 0.5;
    const py = cy + (rng() - 0.5) * S * 0.4;
    const pr = 3 + rng() * 3;
    const pts = 5;
    const startAngle = rng() * Math.PI * 2;

    pool.moveTo(px + pr * Math.cos(startAngle), py + pr * 0.5 * Math.sin(startAngle));
    for (let k = 1; k <= pts; k++) {
      const a = startAngle + (k / pts) * Math.PI * 2;
      const r = pr * (0.7 + rng() * 0.5);
      pool.quadTo(
        px + r * 1.1 * Math.cos(a - 0.3) + (rng() - 0.5) * 2,
        py + r * 0.55 * Math.sin(a - 0.3) + (rng() - 0.5),
        px + r * Math.cos(a),
        py + r * 0.5 * Math.sin(a),
      );
    }
    pool.close();

    const alpha = Math.round(40 + rng() * 35).toString(16).padStart(2, '0');
    paths.push({ path: pool, color: `#2A5040${alpha}` });
  }

  // Nilufer yapragi benzeri yuvarlaklar
  if (rng() > 0.4) {
    const lily = Skia.Path.Make();
    const lx = cx + (rng() - 0.5) * S * 0.3;
    const ly = cy + (rng() - 0.5) * S * 0.25;
    lily.addCircle(lx, ly, 1.5 + rng());
    paths.push({ path: lily, color: '#4A8A4080' });
  }

  // Saz/kamis — organik egriler
  const reedCount = 3 + Math.floor(rng() * 3);
  for (let i = 0; i < reedCount; i++) {
    const reed = Skia.Path.Make();
    const rx = cx + (rng() - 0.5) * S * 0.6;
    const ry = cy + (rng() - 0.5) * S * 0.35;
    const rh = 5 + rng() * 5;
    const curve = (rng() - 0.5) * 4;

    reed.moveTo(rx, ry);
    reed.cubicTo(rx + curve * 0.3, ry - rh * 0.3, rx + curve * 0.7, ry - rh * 0.6, rx + curve, ry - rh);

    const greens = ['#506838', '#607848', '#5A7040', '#4A6030'];
    paths.push({ path: reed, color: greens[Math.floor(rng() * greens.length)] + 'CC' });
  }

  return paths;
}

function makePlainsPaths(cx: number, cy: number, seed: number) {
  const paths: { path: ReturnType<typeof Skia.Path.Make>; color: string }[] = [];
  const rng = simpleRng(seed);

  // Cimen kumesi — kucuk organik gruplar
  const clumpCount = 3 + Math.floor(rng() * 3);
  for (let i = 0; i < clumpCount; i++) {
    const gx = cx + (rng() - 0.5) * S * 0.7;
    const gy = cy + (rng() - 0.5) * S * 0.5;
    const bladeCount = 2 + Math.floor(rng() * 3);

    for (let j = 0; j < bladeCount; j++) {
      const blade = Skia.Path.Make();
      const bx = gx + (rng() - 0.5) * 3;
      const by = gy;
      const bh = 3 + rng() * 3.5;
      const curve = (rng() - 0.5) * 3;

      blade.moveTo(bx, by);
      blade.cubicTo(bx + curve * 0.4, by - bh * 0.4, bx + curve * 0.8, by - bh * 0.7, bx + curve, by - bh);

      const alpha = Math.round(40 + rng() * 50).toString(16).padStart(2, '0');
      paths.push({ path: blade, color: `#7EC850${alpha}` });
    }
  }

  // Kucuk cicek noktalari
  if (rng() > 0.5) {
    const flowerCount = 1 + Math.floor(rng() * 2);
    for (let i = 0; i < flowerCount; i++) {
      const flower = Skia.Path.Make();
      const fx = cx + (rng() - 0.5) * S * 0.5;
      const fy = cy + (rng() - 0.5) * S * 0.35;
      flower.addCircle(fx, fy, 1 + rng() * 0.5);
      const flowerColors = ['#FFD54F60', '#E8B84060', '#FF8A6560', '#CE93D860'];
      paths.push({ path: flower, color: flowerColors[Math.floor(rng() * flowerColors.length)] });
    }
  }

  return paths;
}

// Basit deterministik RNG (seed bazli)
function simpleRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return (s % 10000) / 10000;
  };
}

function makeSeaPaths(cx: number, cy: number, seed: number) {
  const paths: { path: ReturnType<typeof Skia.Path.Make>; color: string }[] = [];
  const rng = simpleRng(seed);

  // Derin su dalgaları — yumuşak, geniş, çok saydam
  for (let i = 0; i < 3; i++) {
    const wave = Skia.Path.Make();
    const wy = cy - S * 0.25 + i * S * 0.18 + (rng() - 0.5) * 4;
    const wx = cx - S * 0.4;
    const amp = 1.5 + rng() * 1.5;
    wave.moveTo(wx, wy);
    wave.cubicTo(wx + S * 0.2, wy - amp, wx + S * 0.45, wy + amp, wx + S * 0.7, wy);
    const alpha = Math.round(15 + rng() * 20).toString(16).padStart(2, '0');
    paths.push({ path: wave, color: `#6090C0${alpha}` });
  }
  return paths;
}

function makeCoastPaths(cx: number, cy: number, seed: number) {
  const paths: { path: ReturnType<typeof Skia.Path.Make>; color: string }[] = [];
  const rng = simpleRng(seed);

  // Sığ su dalgacıkları
  for (let i = 0; i < 2; i++) {
    const wave = Skia.Path.Make();
    const wy = cy + (rng() - 0.5) * S * 0.3;
    const wx = cx - S * 0.3 + rng() * 3;
    wave.moveTo(wx, wy);
    wave.cubicTo(wx + S * 0.15, wy - 2, wx + S * 0.35, wy + 1.5, wx + S * 0.5, wy);
    paths.push({ path: wave, color: '#80C8F830' });
  }

  // Köpük noktaları
  for (let i = 0; i < 3; i++) {
    const foam = Skia.Path.Make();
    foam.addCircle(cx + (rng() - 0.5) * S * 0.5, cy + (rng() - 0.5) * S * 0.4, 0.8 + rng() * 0.6);
    paths.push({ path: foam, color: '#FFFFFF20' });
  }
  return paths;
}

function makeLakePaths(cx: number, cy: number, seed: number) {
  const paths: { path: ReturnType<typeof Skia.Path.Make>; color: string }[] = [];
  const rng = simpleRng(seed);

  // Sakin su — küçük ışık parıltıları
  for (let i = 0; i < 2; i++) {
    const shimmer = Skia.Path.Make();
    const sx = cx + (rng() - 0.5) * S * 0.4;
    const sy = cy + (rng() - 0.5) * S * 0.3;
    shimmer.moveTo(sx - 2, sy);
    shimmer.cubicTo(sx - 1, sy - 1, sx + 1, sy - 1, sx + 2, sy);
    paths.push({ path: shimmer, color: '#FFFFFF25' });
  }

  // Suyun yüzeyinde hafif dalga
  const ripple = Skia.Path.Make();
  const rx = cx + (rng() - 0.5) * S * 0.3;
  const ry = cy + (rng() - 0.5) * S * 0.2;
  ripple.addOval(Skia.XYWHRect(rx - 3, ry - 1.2, 6, 2.4));
  paths.push({ path: ripple, color: '#80B0D820' });

  return paths;
}

function makeShorePaths(cx: number, cy: number, seed: number) {
  const paths: { path: ReturnType<typeof Skia.Path.Make>; color: string }[] = [];
  const rng = simpleRng(seed);

  // Kumsal çizgileri
  for (let i = 0; i < 2; i++) {
    const sand = Skia.Path.Make();
    const sy = cy + S * 0.05 + i * S * 0.15 + (rng() - 0.5) * 2;
    const sx = cx - S * 0.35;
    sand.moveTo(sx, sy);
    sand.cubicTo(sx + S * 0.2, sy - 1.5, sx + S * 0.5, sy + 1, sx + S * 0.7, sy - 0.5);
    paths.push({ path: sand, color: '#D4C09830' });
  }

  // Küçük çimen tutamları
  for (let i = 0; i < 3; i++) {
    const grass = Skia.Path.Make();
    const gx = cx + (rng() - 0.5) * S * 0.5;
    const gy = cy + (rng() - 0.5) * S * 0.35;
    grass.moveTo(gx, gy);
    grass.cubicTo(gx + (rng() - 0.5) * 2, gy - 2.5, gx + (rng() - 0.5) * 1.5, gy - 3.5, gx + (rng() - 0.5) * 3, gy - 4);
    paths.push({ path: grass, color: '#70A85060' });
  }

  return paths;
}

function getTerrainDecorations(terrain: HexTerrain, cx: number, cy: number, q: number, r: number) {
  const seed = q * 1000 + r * 31 + 7919;
  switch (terrain) {
    case HexTerrain.Sea: return makeSeaPaths(cx, cy, seed);
    case HexTerrain.Coast: return makeCoastPaths(cx, cy, seed);
    case HexTerrain.Forest: return makeTreePaths(cx, cy, seed);
    case HexTerrain.Mountain: return makeMountainPaths(cx, cy, seed);
    case HexTerrain.River: return makeWavePaths(cx, cy, seed);
    case HexTerrain.Desert: return makeDesertPaths(cx, cy, seed);
    case HexTerrain.Swamp: return makeSwampPaths(cx, cy, seed);
    case HexTerrain.Plains: return makePlainsPaths(cx, cy, seed);
    case HexTerrain.Lake: return makeLakePaths(cx, cy, seed);
    case HexTerrain.Shore: return makeShorePaths(cx, cy, seed);
    case HexTerrain.Hills: return makeHillsPaths(cx, cy, seed);
    case HexTerrain.Fertile: return makeFertilePaths(cx, cy, seed);
    default: return [];
  }
}

function makeHillsPaths(cx: number, cy: number, seed: number) {
  const paths: { path: ReturnType<typeof Skia.Path.Make>; color: string }[] = [];
  const rng = simpleRng(seed);

  // Yumusak tepe siluetleri — 2-3 katman
  const hillCount = 2 + Math.floor(rng() * 2);
  for (let i = 0; i < hillCount; i++) {
    const hill = Skia.Path.Make();
    const hx = cx + (rng() - 0.5) * S * 0.4;
    const hy = cy + S * 0.05 + i * S * 0.08;
    const hw = S * (0.3 + rng() * 0.2);
    const hh = S * (0.15 + rng() * 0.1);
    hill.moveTo(hx - hw, hy);
    hill.cubicTo(hx - hw * 0.3, hy - hh, hx + hw * 0.3, hy - hh * 0.8, hx + hw, hy);
    const alpha = Math.round(25 + rng() * 30).toString(16).padStart(2, '0');
    paths.push({ path: hill, color: `#5A7A38${alpha}` });
  }

  // Kucuk cimen
  for (let i = 0; i < 3; i++) {
    const g = Skia.Path.Make();
    const gx = cx + (rng() - 0.5) * S * 0.6;
    const gy = cy + (rng() - 0.5) * S * 0.4;
    g.moveTo(gx, gy);
    g.cubicTo(gx + (rng() - 0.5) * 2, gy - 2.5, gx + (rng() - 0.5) * 1.5, gy - 3.5, gx + (rng() - 0.5) * 2, gy - 4);
    paths.push({ path: g, color: '#90B06050' });
  }
  return paths;
}

function makeFertilePaths(cx: number, cy: number, seed: number) {
  const paths: { path: ReturnType<typeof Skia.Path.Make>; color: string }[] = [];
  const rng = simpleRng(seed);

  // Yesil cimen kumesi — yogun
  const clumpCount = 4 + Math.floor(rng() * 3);
  for (let i = 0; i < clumpCount; i++) {
    const gx = cx + (rng() - 0.5) * S * 0.7;
    const gy = cy + (rng() - 0.5) * S * 0.5;
    for (let j = 0; j < 3; j++) {
      const blade = Skia.Path.Make();
      const bx = gx + (rng() - 0.5) * 2.5;
      const bh = 3 + rng() * 4;
      blade.moveTo(bx, gy);
      blade.cubicTo(bx + (rng() - 0.5) * 2.5, gy - bh * 0.5, bx + (rng() - 0.5) * 2, gy - bh * 0.8, bx + (rng() - 0.5) * 3, gy - bh);
      paths.push({ path: blade, color: '#50A83060' });
    }
  }

  // Cicekler — daha renkli
  const flowerCount = 2 + Math.floor(rng() * 2);
  for (let i = 0; i < flowerCount; i++) {
    const flower = Skia.Path.Make();
    const fx = cx + (rng() - 0.5) * S * 0.5;
    const fy = cy + (rng() - 0.5) * S * 0.35;
    flower.addCircle(fx, fy, 1.2 + rng() * 0.8);
    const colors = ['#FFD54F80', '#FF8A6580', '#CE93D880', '#80DEEA80'];
    paths.push({ path: flower, color: colors[Math.floor(rng() * colors.length)] });
  }
  return paths;
}

// ===== COMPONENT =====

export interface HexMapRef {
  focusOnHex: (q: number, r: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

interface Props {
  onBattleResult?: (result: import('../engine/combat').BattleResult) => void;
  showGrid?: boolean;
  showFogOfWar?: boolean;
  dayPhase?: 'dawn' | 'day' | 'dusk' | 'night';
}

const DAY_TINT: Record<string, string> = {
  dawn: '#FF880015',
  day: '#00000000',
  dusk: '#FF440020',
  night: '#0A0A3040',
};

const HexMapRenderer = forwardRef<HexMapRef, Props>(function HexMapRenderer({
  onBattleResult, showGrid = true, showFogOfWar = true, dayPhase = 'day',
}, ref) {
  const map = useGameStore(s => s.map);
  const selectedHex = useGameStore(s => s.selectedHex);
  const selectHex = useGameStore(s => s.selectHex);
  const currentPlayerId = useGameStore(s => s.currentPlayerId);
  const players = useGameStore(s => s.players);
  const moveMode = useGameStore(s => s.moveMode);
  const moveFrom = useGameStore(s => s.moveFrom);
  const moveTargets = useGameStore(s => s.moveTargets);
  const moveArmy = useGameStore(s => s.moveArmy);
  const exitMoveMode = useGameStore(s => s.exitMoveMode);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const canvasWidth = useSharedValue(SCREEN_W);
  const canvasHeight = useSharedValue(SCREEN_H - 160);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    canvasWidth.value = e.nativeEvent.layout.width;
    canvasHeight.value = e.nativeEvent.layout.height;
  }, []);

  useImperativeHandle(ref, () => ({
    focusOnHex: (q: number, r: number) => {
      const { x, y } = hexToPixel(q, r);
      translateX.value = withTiming(-x, { duration: 400 });
      translateY.value = withTiming(-y, { duration: 400 });
      scale.value = withTiming(1.2, { duration: 400 });
    },
    zoomIn: () => {
      scale.value = withTiming(Math.min(3, scale.value * 1.4), { duration: 250 });
    },
    zoomOut: () => {
      scale.value = withTiming(Math.max(0.3, scale.value / 1.4), { duration: 250 });
    },
  }));

  const currentPlayer = players.find(p => p.id === currentPlayerId);
  const hasFocused = useRef(false);
  useEffect(() => {
    if (currentPlayer?.castleCoord && !hasFocused.current) {
      hasFocused.current = true;
      const { q, r } = currentPlayer.castleCoord;
      const { x, y } = hexToPixel(q, r);
      translateX.value = -x;
      translateY.value = -y;
      scale.value = 1.2;
    }
  }, [currentPlayer?.castleCoord]);

  // Gestures
  const panGesture = Gesture.Pan()
    .onStart(() => { savedTranslateX.value = translateX.value; savedTranslateY.value = translateY.value; })
    .onUpdate((e) => { translateX.value = savedTranslateX.value + e.translationX; translateY.value = savedTranslateY.value + e.translationY; })
    .onEnd((e) => { translateX.value = withDecay({ velocity: e.velocityX, deceleration: 0.997 }); translateY.value = withDecay({ velocity: e.velocityY, deceleration: 0.997 }); });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => { savedScale.value = scale.value; })
    .onUpdate((e) => { scale.value = Math.max(0.3, Math.min(3, savedScale.value * e.scale)); });

  const handleTap = useCallback((x: number, y: number) => {
    const cx = canvasWidth.value / 2;
    const cy = canvasHeight.value / 2;
    const mapX = (x - cx - translateX.value) / scale.value;
    const mapY = (y - cy - translateY.value) / scale.value;
    const hexCoord = pixelToHex(mapX, mapY);
    const key = hexKey(hexCoord.q, hexCoord.r);
    if (!map.has(key)) return;

    if (moveMode && moveFrom) {
      const isTarget = moveTargets.some(t => t.q === hexCoord.q && t.r === hexCoord.r);
      if (isTarget) {
        const result = moveArmy(moveFrom, hexCoord);
        exitMoveMode();
        if (result && onBattleResult) onBattleResult(result);
      } else {
        exitMoveMode();
      }
      return;
    }
    selectHex(hexCoord);
  }, [map, moveMode, moveFrom, moveTargets, moveArmy, exitMoveMode, onBattleResult, selectHex]);

  const tapGesture = Gesture.Tap()
    .onEnd((e) => {
      'worklet';
      runOnJS(handleTap)(e.x, e.y);
    });

  const composed = Gesture.Simultaneous(panGesture, pinchGesture);
  const allGestures = Gesture.Exclusive(tapGesture, composed);

  // ===== RENDER DATA =====
  const hexRenderData = useMemo(() => {
    const data: {
      key: string;
      cx: number; cy: number;
      tile: HexTile;
      palette: typeof TERRAIN_PALETTE[HexTerrain.Plains];
      isExploredOnly: boolean;
      ownerColor: string | null;
      buildingIcon: string | null;
      armyIcon: string | null;
      armyCount: number;
      isMoveTarget: boolean;
      isAttackTarget: boolean;
      isSelected: boolean;
      decorations: { path: ReturnType<typeof Skia.Path.Make>; color: string }[];
    }[] = [];

    const playerColorMap = new Map<string, string>();
    for (const p of players) playerColorMap.set(p.id, p.color);

    for (const [key, tile] of map) {
      const isVisible = showFogOfWar ? tile.visible : true;
      const isExplored = showFogOfWar ? tile.explored : true;
      if (!isExplored && !isVisible) continue;

      const { x: rawX, y: rawY } = hexToPixel(tile.coord.q, tile.coord.r);
      const cx = rawX + CC;
      const cy = rawY + CC;
      const palette = TERRAIN_PALETTE[tile.terrain];
      const isExploredOnly = !isVisible && isExplored;

      const isMoveTarget = moveMode && moveTargets.some(t => t.q === tile.coord.q && t.r === tile.coord.r);
      const isAttackTarget = isMoveTarget && tile.army !== null && tile.army.ownerId !== currentPlayerId;
      const isSelected = !!(selectedHex && selectedHex.q === tile.coord.q && selectedHex.r === tile.coord.r);

      const ownerColor = tile.ownerId ? (playerColorMap.get(tile.ownerId) ?? null) : null;
      const buildingIcon = tile.building && isVisible ? BUILDING_ICONS[tile.building.type] : null;

      let armyIcon: string | null = null;
      let armyCount = 0;
      if (tile.army && isVisible) {
        const mainUnit = tile.army.units.reduce((best, u) => u.count > best.count ? u : best, tile.army.units[0]);
        armyIcon = UNIT_ICONS[mainUnit.type];
        armyCount = tile.army.units.reduce((s, u) => s + u.count, 0);
      }

      // Terrain dekorasyonlari (sadece gorunur hex'ler icin)
      const decorations = isVisible
        ? getTerrainDecorations(tile.terrain, cx, cy, tile.coord.q, tile.coord.r)
        : [];

      data.push({
        key, cx, cy, tile, palette, isExploredOnly, ownerColor,
        buildingIcon, armyIcon, armyCount, isMoveTarget, isAttackTarget,
        isSelected, decorations,
      });
    }
    return data;
  }, [map, selectedHex, players, moveMode, moveTargets, currentPlayerId]);

  // Fog hexleri
  const fogHexPaths = useMemo(() => {
    if (!showFogOfWar) return [];
    const paths: ReturnType<typeof Skia.Path.Make>[] = [];
    for (const [, tile] of map) {
      if (!tile.explored && !tile.visible) {
        const { x: rx, y: ry } = hexToPixel(tile.coord.q, tile.coord.r);
        paths.push(makeHexPath(rx + CC, ry + CC, HEX_SIZE));
      }
    }
    return paths;
  }, [map, showFogOfWar]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: canvasWidth.value / 2 + translateX.value },
      { translateY: canvasHeight.value / 2 + translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={styles.container} onLayout={onLayout}>
      <GestureDetector gesture={allGestures}>
        <Animated.View style={[styles.canvasWrapper, animatedStyle]}>
          <Canvas style={styles.canvas}>
            {hexRenderData.map((hex) => {
              const { cx, cy, palette, isExploredOnly, tile } = hex;
              const outerPath = makeHexPath(cx, cy, S - 1);
              const innerPath = makeHexPathInset(cx, cy, S, 3);
              const highlightPath = makeHexPathInset(cx, cy, S, 5);

              // Kesfedilmis ama gorunmuyor -> koyulastir
              const fogAlpha = isExploredOnly ? '60' : 'FF';

              return (
                <Group key={hex.key}>
                  {/* 1. Golge (3D derinlik) */}
                  <Path
                    path={makeHexPath(cx + 1.5, cy + 2, S - 1)}
                    color={palette.shadow + '40'}
                    style="fill"
                  />

                  {/* 2. Ana hex dolgu - gradient */}
                  <Group clip={outerPath}>
                    <Path path={outerPath} color={palette.base + fogAlpha} style="fill" />
                    {/* Ust highlight (isik geliyor) */}
                    <Path
                      path={highlightPath}
                      style="fill"
                    >
                      <LinearGradient
                        start={vec(cx, cy - S)}
                        end={vec(cx, cy + S * 0.3)}
                        colors={[palette.light + '50', 'transparent']}
                      />
                    </Path>
                    {/* Alt golge */}
                    <Path
                      path={innerPath}
                      style="fill"
                    >
                      <LinearGradient
                        start={vec(cx, cy + S * 0.2)}
                        end={vec(cx, cy + S)}
                        colors={['transparent', palette.dark + '40']}
                      />
                    </Path>
                  </Group>

                  {/* 3. Terrain dekorasyonlari */}
                  {!isExploredOnly && hex.decorations.map((dec, i) => (
                    <Path
                      key={`dec-${i}`}
                      path={dec.path}
                      color={dec.color}
                      style={dec.path.getBounds().width > 2 ? 'fill' : 'stroke'}
                      strokeWidth={1.2}
                      strokeCap="round"
                    />
                  ))}

                  {/* 4. Sahiplik overlay — yumusak renk yikama + ince kenar */}
                  {hex.ownerColor && (showFogOfWar ? tile.visible : true) && (
                    <>
                      <Path
                        path={outerPath}
                        color={hex.ownerColor + '14'}
                        style="fill"
                      />
                      <Path
                        path={makeHexPathInset(cx, cy, S, 1)}
                        color={hex.ownerColor + '35'}
                        style="stroke"
                        strokeWidth={1.2}
                      />
                    </>
                  )}

                  {/* 5. Hareket/saldiri hedef */}
                  {hex.isMoveTarget && (
                    <>
                      <Path
                        path={outerPath}
                        color={hex.isAttackTarget ? COLORS.attackHighlight : COLORS.moveHighlight}
                        style="fill"
                      />
                      <Path
                        path={outerPath}
                        color={hex.isAttackTarget ? COLORS.red + '80' : COLORS.green + '80'}
                        style="stroke"
                        strokeWidth={2}
                      />
                    </>
                  )}

                  {/* 6. Secili hex - parlayan kenar */}
                  {hex.isSelected && (
                    <>
                      <Path
                        path={outerPath}
                        color={COLORS.selectionFill}
                        style="fill"
                      />
                      <Path
                        path={makeHexPath(cx, cy, S + 1)}
                        color={COLORS.selection + 'AA'}
                        style="stroke"
                        strokeWidth={2.5}
                      />
                      <Path
                        path={makeHexPath(cx, cy, S + 3)}
                        color={COLORS.selection + '30'}
                        style="stroke"
                        strokeWidth={2}
                      />
                    </>
                  )}

                  {/* 7. Yumusak hex siniri — sadece koyu ince golge */}
                  {showGrid && !hex.isSelected && !hex.isMoveTarget && (
                    <Path
                      path={outerPath}
                      color={isExploredOnly ? '#0A101830' : '#0A101815'}
                      style="stroke"
                      strokeWidth={0.4}
                    />
                  )}
                </Group>
              );
            })}

            {/* Fog hexleri - koyu arka plan */}
            {fogHexPaths.map((path, i) => (
              <Group key={`fog-${i}`}>
                <Path path={path} color="#0A1018" style="fill" />
                <Path path={path} color="#0A1018" style="stroke" strokeWidth={0.5} />
              </Group>
            ))}
          </Canvas>
        </Animated.View>
      </GestureDetector>

      {/* Day/night tint */}
      {dayPhase !== 'day' && (
        <View style={[styles.dayNightOverlay, { backgroundColor: DAY_TINT[dayPhase] }]} pointerEvents="none" />
      )}

      {/* Emoji overlay */}
      <EmojiOverlay
        hexRenderData={hexRenderData}
        translateX={translateX}
        translateY={translateY}
        scale={scale}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
      />
    </View>
  );
});

export default HexMapRenderer;

// ===== EMOJI OVERLAY =====

function EmojiOverlay({
  hexRenderData, translateX, translateY, scale, canvasWidth, canvasHeight,
}: {
  hexRenderData: { cx: number; cy: number; buildingIcon: string | null; armyIcon: string | null; armyCount: number; ownerColor: string | null; tile: HexTile }[];
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  scale: SharedValue<number>;
  canvasWidth: SharedValue<number>;
  canvasHeight: SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: canvasWidth.value / 2 + translateX.value },
      { translateY: canvasHeight.value / 2 + translateY.value },
      { scale: scale.value },
    ],
  }));

  const icons = useMemo(() => hexRenderData.filter(h => h.buildingIcon || h.armyIcon), [hexRenderData]);

  if (icons.length === 0) return null;

  return (
    <Animated.View style={[styles.emojiOverlay, animatedStyle]} pointerEvents="none">
      {icons.map((hex, i) => (
        <View key={i} style={[styles.emojiContainer, { left: hex.cx - 14, top: hex.cy - 16 }]}>
          {hex.buildingIcon && (
            <Animated.Text style={styles.emojiText}>{hex.buildingIcon}</Animated.Text>
          )}
          {hex.armyIcon && (
            <View style={[styles.armyBadge, hex.ownerColor ? { borderColor: hex.ownerColor + '80', borderWidth: 1.5 } : undefined]}>
              <Animated.Text style={styles.emojiTextSmall}>{hex.armyIcon}</Animated.Text>
              <View style={styles.armyCountBg}>
                <Animated.Text style={styles.armyCountText}>{hex.armyCount}</Animated.Text>
              </View>
              {hex.tile.army && (
                <View style={styles.armyPowerBg}>
                  <Animated.Text style={styles.armyPowerText}>⚔{hex.tile.army.totalPower}</Animated.Text>
                </View>
              )}
            </View>
          )}
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080E14',
    overflow: 'hidden',
  },
  canvasWrapper: {
    position: 'absolute',
    width: 2000,
    height: 2000,
    left: -1000,
    top: -1000,
  },
  canvas: { flex: 1 },
  dayNightOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  emojiOverlay: {
    position: 'absolute',
    width: 2000,
    height: 2000,
    left: -1000,
    top: -1000,
  },
  emojiContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 34,
  },
  emojiText: {
    fontSize: 16,
    textShadowColor: '#00000090',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1.5 },
  },
  emojiTextSmall: { fontSize: 12 },
  armyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#00000050',
    borderRadius: 6,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  armyCountBg: {
    backgroundColor: '#D4382C',
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingVertical: 0.5,
    minWidth: 14,
    alignItems: 'center' as const,
  },
  armyCountText: {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  armyPowerBg: {
    backgroundColor: '#1A1A2ECC',
    borderRadius: 3,
    paddingHorizontal: 2,
    paddingVertical: 0.5,
  },
  armyPowerText: {
    color: '#FFD700',
    fontSize: 6,
    fontWeight: '800',
  },
});
