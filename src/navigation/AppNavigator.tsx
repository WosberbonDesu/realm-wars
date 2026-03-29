import React, { useState, useCallback, useEffect } from 'react';
import MainMenuScreen from '../screens/MainMenuScreen';
import GameScreen from '../screens/GameScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { useGameStore } from '../store/gameStore';
import { GamePhase } from '../types/game';
import { loadSettings } from '../services/saveService';
import { setLanguage, LangCode } from '../i18n';

export type Screen = 'menu' | 'game' | 'settings';

export default function AppNavigator() {
  const [screen, setScreen] = useState<Screen>('menu');
  const phase = useGameStore(s => s.phase);

  // Restore saved language on app start
  useEffect(() => {
    loadSettings().then(saved => {
      if (saved && (saved as any).language) {
        setLanguage((saved as any).language as LangCode);
      }
    });
  }, []);

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
