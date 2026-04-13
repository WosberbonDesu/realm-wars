import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Platform, Dimensions } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { SEA_LEVEL } from '../engine/biomes';
import { COLORS, RADIUS, SHADOW } from '../constants/theme';

const MINI_W = 180;
const MINI_H = 120;
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export const Minimap: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const graph = useGameStore(s => s.voronoiGraph);
  const cellTiles = useGameStore(s => s.cellTiles);
  const mapWidth = useGameStore(s => s.mapWidth);
  const mapHeight = useGameStore(s => s.mapHeight);
  const cameraX = useGameStore(s => s.cameraX);
  const cameraY = useGameStore(s => s.cameraY);
  const zoom = useGameStore(s => s.cameraZoom);

  useEffect(() => {
    if (Platform.OS !== 'web' || !graph) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = MINI_W;
    canvas.height = MINI_H;

    const sx = MINI_W / mapWidth;
    const sy = MINI_H / mapHeight;

    // Arka plan
    ctx.fillStyle = '#0a1520';
    ctx.fillRect(0, 0, MINI_W, MINI_H);

    // Basitleştirilmiş harita (her hücre bir piksel)
    for (let i = 0; i < graph.cells.length; i++) {
      const tile = cellTiles[i];
      if (!tile) continue;
      const c = graph.cells[i].center;
      const px = c.x * sx;
      const py = c.y * sy;

      if (tile.elevation < SEA_LEVEL) {
        ctx.fillStyle = '#1a3050';
      } else if (tile.elevation > 0.7) {
        ctx.fillStyle = '#8a7a6a';
      } else {
        ctx.fillStyle = '#4a7a3a';
      }
      ctx.fillRect(px - 1, py - 1, 2, 2);
    }

    // Viewport dikdörtgeni
    const vpW = SCREEN_W / zoom;
    const vpH = SCREEN_H / zoom;
    const vpX = (mapWidth / 2 - cameraX - vpW / 2) * sx;
    const vpY = (mapHeight / 2 - cameraY - vpH / 2) * sy;

    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(vpX, vpY, vpW * sx, vpH * sy);

    // Pusula (sağ üst köşe)
    const cx = MINI_W - 15;
    const cy = 15;
    ctx.strokeStyle = '#8aa0b8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 10);
    ctx.lineTo(cx, cy + 10);
    ctx.moveTo(cx - 10, cy);
    ctx.lineTo(cx + 10, cy);
    ctx.stroke();
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFD700';
    ctx.fillText('K', cx, cy - 11);
    ctx.fillStyle = '#607080';
    ctx.fillText('G', cx, cy + 16);
    ctx.fillText('B', cx - 13, cy + 3);
    ctx.fillText('D', cx + 13, cy + 3);
  }, [graph, cellTiles, mapWidth, mapHeight, cameraX, cameraY, zoom]);

  if (Platform.OS !== 'web') return null;

  return (
    <View style={styles.container}>
      <canvas
        ref={canvasRef as any}
        width={MINI_W}
        height={MINI_H}
        style={{ width: MINI_W, height: MINI_H, borderRadius: 8 } as any}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 70,
    right: 8,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSolid,
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceOverlay,
    ...SHADOW.card,
  },
});
