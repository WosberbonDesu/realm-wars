import React, { useRef } from 'react';
import { View, Dimensions, PanResponder } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { findCellAtPoint } from '../engine/voronoiGrid';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface GestureHandlerProps {
  children: React.ReactNode;
}

export const GestureHandler: React.FC<GestureHandlerProps> = ({ children }) => {
  const savedCamera = useRef({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const lastPinchDist = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 5 || Math.abs(gs.dy) > 5,

      onPanResponderGrant: () => {
        const s = useGameStore.getState();
        savedCamera.current = { x: s.cameraX, y: s.cameraY };
        isPanning.current = false;
      },

      onPanResponderMove: (evt, gs) => {
        const touches = evt.nativeEvent.touches || [];
        if (touches.length >= 2) {
          const dx = (touches[0] as any).pageX - (touches[1] as any).pageX;
          const dy = (touches[0] as any).pageY - (touches[1] as any).pageY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (lastPinchDist.current > 0) {
            const s = useGameStore.getState();
            s.setCameraZoom(s.cameraZoom * (dist / lastPinchDist.current));
          }
          lastPinchDist.current = dist;
          return;
        }
        lastPinchDist.current = 0;
        if (Math.abs(gs.dx) > 5 || Math.abs(gs.dy) > 5) {
          isPanning.current = true;
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
        }
      },
    })
  ).current;

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
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
