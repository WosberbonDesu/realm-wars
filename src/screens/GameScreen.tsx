import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { MapRenderer } from '../components/MapRenderer';
import { GestureHandler } from '../components/GestureHandler';
import { HUD } from '../components/HUD';
import { TileInfoPanel } from '../components/TileInfoPanel';
import { BuildMenu } from '../components/BuildMenu';
import { BattleDialog } from '../components/BattleDialog';
import { useGameStore } from '../store/gameStore';
import { COLORS } from '../constants/theme';
import { GamePhase } from '../types/game';

export const GameScreen: React.FC = () => {
  const game = useGameStore(s => s.game);
  const rivers = useGameStore(s => s.rivers);
  const cameraX = useGameStore(s => s.cameraX);
  const cameraY = useGameStore(s => s.cameraY);
  const cameraZoom = useGameStore(s => s.cameraZoom);
  const selectedHex = useGameStore(s => s.selectedHex);
  const setScreen = useGameStore(s => s.setScreen);

  if (!game) return null;

  // Game over ekranı
  if (game.phase === GamePhase.GameOver) {
    const winner = game.players.find(p => p.territory.length > 0);
    return (
      <View style={styles.gameOverContainer}>
        <Text style={styles.gameOverTitle}>OYUN BITTI</Text>
        <Text style={styles.gameOverWinner}>
          {winner ? (winner.isBot ? `${winner.name} kazandi!` : 'ZAFER! Kazandiniz!') : 'Berabere'}
        </Text>
        <Text style={styles.gameOverStats}>
          Tur: {game.turn} | Seed: {game.seed}
        </Text>
        <Text style={styles.menuLink} onPress={() => setScreen('menu')}>
          Ana Menuye Don
        </Text>
      </View>
    );
  }

  const players = game.players.map(p => ({ id: p.id, color: p.color }));

  return (
    <View style={styles.container}>
      <GestureHandler>
        <MapRenderer
          tiles={game.map}
          rivers={rivers}
          cameraX={cameraX}
          cameraY={cameraY}
          zoom={cameraZoom}
          selectedHex={selectedHex}
          players={players}
        />
      </GestureHandler>

      {/* UI Overlays */}
      <HUD />
      <TileInfoPanel />
      <BuildMenu />
      <BattleDialog />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  gameOverContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  gameOverTitle: {
    color: COLORS.gold,
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: 16,
  },
  gameOverWinner: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  gameOverStats: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginBottom: 30,
  },
  menuLink: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
