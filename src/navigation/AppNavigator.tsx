import React, { useState, useCallback } from 'react';
import MainMenuScreen from '../screens/MainMenuScreen';
import GameScreen from '../screens/GameScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { useGameStore } from '../store/gameStore';
import { GamePhase } from '../types/game';

export type Screen = 'menu' | 'game' | 'settings';

export default function AppNavigator() {
  const [screen, setScreen] = useState<Screen>('menu');
  const phase = useGameStore(s => s.phase);

  const navigateTo = useCallback((s: Screen) => setScreen(s), []);

  switch (screen) {
    case 'menu':
      return (
        <MainMenuScreen
          onStartGame={() => navigateTo('game')}
          onSettings={() => navigateTo('settings')}
        />
      );
    case 'game':
      return (
        <GameScreen
          onBackToMenu={() => navigateTo('menu')}
        />
      );
    case 'settings':
      return (
        <SettingsScreen
          onBack={() => navigateTo('menu')}
        />
      );
    default:
      return <MainMenuScreen onStartGame={() => navigateTo('game')} onSettings={() => navigateTo('settings')} />;
  }
}
