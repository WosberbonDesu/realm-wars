import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { useGameStore } from './src/store/gameStore';
import { MenuScreen } from './src/screens/MenuScreen';
import { GameScreen } from './src/screens/GameScreen';

export default function App() {
  const screen = useGameStore(s => s.screen);

  return (
    <>
      <StatusBar style="light" />
      {screen === 'menu' ? <MenuScreen /> : <GameScreen />}
    </>
  );
}
