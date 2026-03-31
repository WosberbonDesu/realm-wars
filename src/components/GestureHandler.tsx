import React, { useRef, useCallback } from 'react';
import { View, Dimensions, PanResponder } from 'react-native';
import { pixelToHex } from '../engine/hexUtils';
import { useGameStore } from '../store/gameStore';
import { hexKey } from '../types/game';

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
      onMoveShouldSetPanResponder: (_, gs) => {
        return Math.abs(gs.dx) > 5 || Math.abs(gs.dy) > 5;
      },

      onPanResponderGrant: () => {
        const state = useGameStore.getState();
        savedCamera.current = { x: state.cameraX, y: state.cameraY };
        isPanning.current = false;
      },

      onPanResponderMove: (evt, gs) => {
        const touches = evt.nativeEvent.touches || [];

        // Pinch zoom (2 parmak)
        if (touches.length >= 2) {
          const dx = (touches[0] as any).pageX - (touches[1] as any).pageX;
          const dy = (touches[0] as any).pageY - (touches[1] as any).pageY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (lastPinchDist.current > 0) {
            const scale = dist / lastPinchDist.current;
            const state = useGameStore.getState();
            state.setCameraZoom(state.cameraZoom * scale);
          }
          lastPinchDist.current = dist;
          return;
        }

        lastPinchDist.current = 0;

        // Pan
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

        // Tap (no significant movement)
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
  const state = useGameStore.getState();
  if (!state.game) return;

  const zoom = state.cameraZoom;
  const offsetX = SCREEN_W / 2 + state.cameraX * zoom;
  const offsetY = SCREEN_H / 2 + state.cameraY * zoom;

  const worldX = (tapX - offsetX) / zoom;
  const worldY = (tapY - offsetY) / zoom;

  const hex = pixelToHex(worldX, worldY);
  const key = hexKey(hex.q, hex.r);
  const tile = state.game.map.get(key);

  if (tile) {
    // Army movement: seçili hex'ten komşuya tıklama
    if (state.selectedHex && state.game) {
      const selectedKey = hexKey(state.selectedHex.q, state.selectedHex.r);
      const selectedTile = state.game.map.get(selectedKey);

      if (selectedTile?.army &&
          selectedTile.army.ownerId === state.game.currentPlayerId &&
          !(hex.q === state.selectedHex.q && hex.r === state.selectedHex.r)) {
        const dq = Math.abs(hex.q - state.selectedHex.q);
        const dr = Math.abs(hex.r - state.selectedHex.r);
        const ds = Math.abs((-hex.q - hex.r) - (-state.selectedHex.q - state.selectedHex.r));
        const isNeighbor = Math.max(dq, dr, ds) === 1;

        if (isNeighbor) {
          state.moveArmy(state.selectedHex, hex);
          return;
        }
      }
    }
    state.selectHex(hex);
  } else {
    state.selectHex(null);
  }
}
