import React, { useState, useCallback } from 'react';
import MainMenuScreen from '../screens/MainMenuScreen';
import GameScreen from '../screens/GameScreen';
import { useGameStore } from '../store/gameStore';
import { GamePhase } from '../types/game';

export type Screen = 'menu' | 'game';

export default function AppNavigator() {
  const [screen, setScreen] = useState<Screen>('menu');
  const phase = useGameStore(s => s.phase);

  const navigateTo = useCallback((s: Screen) => setScreen(s), []);

  switch (screen) {
    case 'menu':
      return <MainMenuScreen onStartGame={() => navigateTo('game')} />;
    case 'game':
      return (
        <GameScreen
          onBackToMenu={() => navigateTo('menu')}
        />
      );
    default:
      return <MainMenuScreen onStartGame={() => navigateTo('game')} />;
  }
}
