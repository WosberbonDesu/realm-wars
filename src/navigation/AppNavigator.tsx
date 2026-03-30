import React, { useState, useCallback, useEffect } from 'react';
import MainMenuScreen from '../screens/MainMenuScreen';
import GameScreen from '../screens/GameScreen';
import SettingsScreen from '../screens/SettingsScreen';
import MapGalleryScreen from '../screens/MapGalleryScreen';
import MapEditorScreen from '../screens/MapEditorScreen';
import { useGameStore } from '../store/gameStore';
import { GamePhase } from '../types/game';
import { MapTemplate } from '../types/mapEditor';
import { loadSettings } from '../services/saveService';
import { setLanguage, LangCode } from '../i18n';

export type Screen = 'menu' | 'game' | 'settings' | 'mapGallery' | 'mapEditor';

export default function AppNavigator() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [selectedMap, setSelectedMap] = useState<MapTemplate | null>(null);
  const [editingMap, setEditingMap] = useState<MapTemplate | null>(null);
  const phase = useGameStore(s => s.phase);

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
          onMapGallery={() => navigateTo('mapGallery')}
          selectedMap={selectedMap}
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
    case 'mapGallery':
      return (
        <MapGalleryScreen
          onSelectMap={(template) => {
            setSelectedMap(template);
            navigateTo('menu');
          }}
          onCreateMap={() => {
            setEditingMap(null);
            navigateTo('mapEditor');
          }}
          onBack={() => navigateTo('menu')}
        />
      );
    case 'mapEditor':
      return (
        <MapEditorScreen
          editTemplate={editingMap}
          onSave={(template) => {
            setSelectedMap(template);
            navigateTo('mapGallery');
          }}
          onBack={() => navigateTo('mapGallery')}
        />
      );
    default:
      return <MainMenuScreen onStartGame={() => navigateTo('game')} onSettings={() => navigateTo('settings')} onMapGallery={() => navigateTo('mapGallery')} selectedMap={null} />;
  }
}
