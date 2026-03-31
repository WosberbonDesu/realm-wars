import React, { useRef } from 'react';
import { View, Dimensions } from 'react-native';
import {
  GestureDetector, Gesture, GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { pixelToHex } from '../engine/hexUtils';
import { useGameStore } from '../store/gameStore';
import { hexKey } from '../types/game';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface GestureHandlerProps {
  children: React.ReactNode;
}

export const GestureHandler: React.FC<GestureHandlerProps> = ({ children }) => {
  const {
    cameraX, cameraY, cameraZoom,
    setCameraPos, setCameraZoom,
    selectHex, game,
  } = useGameStore();

  const savedCamera = useRef({ x: cameraX, y: cameraY, zoom: cameraZoom });

  // Pan gesture
  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedCamera.current = {
        x: useGameStore.getState().cameraX,
        y: useGameStore.getState().cameraY,
        zoom: useGameStore.getState().cameraZoom,
      };
    })
    .onUpdate((e) => {
      const zoom = useGameStore.getState().cameraZoom;
      setCameraPos(
        savedCamera.current.x + e.translationX / zoom,
        savedCamera.current.y + e.translationY / zoom,
      );
    })
    .minDistance(10);

  // Pinch zoom
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedCamera.current.zoom = useGameStore.getState().cameraZoom;
    })
    .onUpdate((e) => {
      setCameraZoom(savedCamera.current.zoom * e.scale);
    });

  // Tap to select hex
  const tapGesture = Gesture.Tap()
    .onEnd((e) => {
      const state = useGameStore.getState();
      if (!state.game) return;

      const zoom = state.cameraZoom;
      const offsetX = SCREEN_W / 2 + state.cameraX * zoom;
      const offsetY = SCREEN_H / 2 + state.cameraY * zoom;

      // Screen coords → world coords → hex coords
      const worldX = (e.x - offsetX) / zoom;
      const worldY = (e.y - offsetY) / zoom;

      const hex = pixelToHex(worldX, worldY);
      const key = hexKey(hex.q, hex.r);
      const tile = state.game.map.get(key);

      if (tile) {
        // Eğer zaten seçili hex'e komşu bir hex'e tıklanırsa ve ordu varsa → hareket
        if (state.selectedHex && state.game) {
          const selectedKey = hexKey(state.selectedHex.q, state.selectedHex.r);
          const selectedTile = state.game.map.get(selectedKey);

          if (selectedTile?.army &&
              selectedTile.army.ownerId === state.game.currentPlayerId &&
              !(hex.q === state.selectedHex.q && hex.r === state.selectedHex.r)) {
            // Check if neighbor
            const dq = Math.abs(hex.q - state.selectedHex.q);
            const dr = Math.abs(hex.r - state.selectedHex.r);
            const ds = Math.abs((-hex.q - hex.r) - (-state.selectedHex.q - state.selectedHex.r));
            const isNeighbor = Math.max(dq, dr, ds) === 1;

            if (isNeighbor) {
              useGameStore.getState().moveArmy(state.selectedHex, hex);
              return;
            }
          }
        }

        selectHex(hex);
      } else {
        selectHex(null);
      }
    });

  const composed = Gesture.Simultaneous(
    panGesture,
    pinchGesture,
  );

  const allGestures = Gesture.Exclusive(tapGesture, composed);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GestureDetector gesture={allGestures}>
        <View style={{ flex: 1 }}>
          {children}
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};
