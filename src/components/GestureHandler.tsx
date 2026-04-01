import React, { useRef, useEffect } from 'react';
import { View, Dimensions, PanResponder, Platform } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { findCellAtPoint } from '../engine/voronoiGrid';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Momentum / inertia ayarları
const FRICTION = 0.92;         // her frame sürtünme (1=sonsuz, 0=anında dur)
const MIN_VELOCITY = 0.5;      // bu hızın altında dur
const ZOOM_SMOOTH = 0.12;      // zoom interpolasyon hızı

interface GestureHandlerProps {
  children: React.ReactNode;
}

export const GestureHandler: React.FC<GestureHandlerProps> = ({ children }) => {
  const savedCamera = useRef({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const lastPinchDist = useRef(0);

  // Momentum state
  const velocityRef = useRef({ vx: 0, vy: 0 });
  const lastMoveTime = useRef(0);
  const lastDx = useRef(0);
  const lastDy = useRef(0);
  const momentumRaf = useRef(0);

  // Smooth zoom state
  const targetZoomRef = useRef(1);
  const zoomRafRef = useRef(0);
  const containerRef = useRef<View>(null);

  // Momentum animasyonu
  const startMomentum = () => {
    cancelAnimationFrame(momentumRaf.current);

    const animate = () => {
      const v = velocityRef.current;
      if (Math.abs(v.vx) < MIN_VELOCITY && Math.abs(v.vy) < MIN_VELOCITY) return;

      v.vx *= FRICTION;
      v.vy *= FRICTION;

      const s = useGameStore.getState();
      const zoom = s.cameraZoom;
      s.setCameraPos(s.cameraX + v.vx / zoom, s.cameraY + v.vy / zoom);

      momentumRaf.current = requestAnimationFrame(animate);
    };

    momentumRaf.current = requestAnimationFrame(animate);
  };

  // Smooth zoom animasyonu
  const startSmoothZoom = () => {
    cancelAnimationFrame(zoomRafRef.current);

    const animate = () => {
      const s = useGameStore.getState();
      const diff = targetZoomRef.current - s.cameraZoom;
      if (Math.abs(diff) < 0.001) {
        s.setCameraZoom(targetZoomRef.current);
        return;
      }
      s.setCameraZoom(s.cameraZoom + diff * ZOOM_SMOOTH);
      zoomRafRef.current = requestAnimationFrame(animate);
    };

    zoomRafRef.current = requestAnimationFrame(animate);
  };

  // Mouse wheel zoom (web)
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleWheel = (e: Event) => {
      const we = e as WheelEvent;
      we.preventDefault();
      const s = useGameStore.getState();
      const delta = we.deltaY > 0 ? 0.9 : 1.1;
      targetZoomRef.current = Math.max(0.3, Math.min(4, (targetZoomRef.current || s.cameraZoom) * delta));
      startSmoothZoom();
    };

    const el = document.querySelector('[data-gesture-container]') || document.body;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 5 || Math.abs(gs.dy) > 5,

      onPanResponderGrant: () => {
        // Momentum'u durdur
        cancelAnimationFrame(momentumRaf.current);
        velocityRef.current = { vx: 0, vy: 0 };

        const s = useGameStore.getState();
        savedCamera.current = { x: s.cameraX, y: s.cameraY };
        targetZoomRef.current = s.cameraZoom;
        isPanning.current = false;
        lastMoveTime.current = Date.now();
        lastDx.current = 0;
        lastDy.current = 0;
      },

      onPanResponderMove: (evt, gs) => {
        const touches = evt.nativeEvent.touches || [];
        if (touches.length >= 2) {
          // Pinch zoom
          const dx = (touches[0] as any).pageX - (touches[1] as any).pageX;
          const dy = (touches[0] as any).pageY - (touches[1] as any).pageY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (lastPinchDist.current > 0) {
            const s = useGameStore.getState();
            const newZoom = s.cameraZoom * (dist / lastPinchDist.current);
            targetZoomRef.current = Math.max(0.3, Math.min(4, newZoom));
            s.setCameraZoom(targetZoomRef.current);
          }
          lastPinchDist.current = dist;
          return;
        }

        lastPinchDist.current = 0;

        if (Math.abs(gs.dx) > 5 || Math.abs(gs.dy) > 5) {
          isPanning.current = true;

          // Velocity hesapla (momentum için)
          const now = Date.now();
          const dt = Math.max(1, now - lastMoveTime.current);
          velocityRef.current = {
            vx: (gs.dx - lastDx.current) / dt * 16, // 16ms frame'e normalize
            vy: (gs.dy - lastDy.current) / dt * 16,
          };
          lastMoveTime.current = now;
          lastDx.current = gs.dx;
          lastDy.current = gs.dy;

          const zoom = useGameStore.getState().cameraZoom;
          useGameStore.getState().setCameraPos(
            savedCamera.current.x + gs.dx / zoom,
            savedCamera.current.y + gs.dy / zoom,
          );
        }
      },

      onPanResponderRelease: (evt, gs) => {
        lastPinchDist.current = 0;

        if (!isPanning.current && Math.abs(gs.dx) < 10 && Math.abs(gs.dy) < 10) {
          handleTap(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
        } else {
          // Momentum başlat
          startMomentum();
        }
      },
    })
  ).current;

  return (
    <View
      ref={containerRef}
      style={{ flex: 1 }}
      // @ts-ignore - web data attribute
      dataSet={{ gestureContainer: true }}
      {...panResponder.panHandlers}
    >
      {children}
    </View>
  );
};

function handleTap(tapX: number, tapY: number): void {
  const s = useGameStore.getState();
  if (!s.voronoiGraph) return;

  const zoom = s.cameraZoom;
  const ox = SCREEN_W / 2 - s.mapWidth / 2 * zoom + s.cameraX * zoom;
  const oy = SCREEN_H / 2 - s.mapHeight / 2 * zoom + s.cameraY * zoom;

  // Screen → world coords
  const worldX = (tapX - ox) / zoom;
  const worldY = (tapY - oy) / zoom;

  const cellIdx = findCellAtPoint(s.voronoiGraph, worldX, worldY);
  if (cellIdx >= 0) {
    s.selectCell(cellIdx);
  } else {
    s.selectCell(null);
  }
}
