import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, RESOURCE_COLORS, RESOURCE_ICONS } from '../constants/theme';
import { useGameStore } from '../store/gameStore';
import HexMapRenderer from '../components/HexMapRenderer';
import HexInfoPanel from '../components/HexInfoPanel';
import BuildModal from '../components/BuildModal';
import TrainModal from '../components/TrainModal';
import BattleResultModal from '../components/BattleResultModal';
import { GamePhase } from '../types/game';
import { BattleResult } from '../engine/combat';

interface Props {
  onBackToMenu: () => void;
}

export default function GameScreen({ onBackToMenu }: Props) {
  const turn = useGameStore(s => s.turn);
  const phase = useGameStore(s => s.phase);
  const currentPlayerId = useGameStore(s => s.currentPlayerId);
  const players = useGameStore(s => s.players);
  const selectedHex = useGameStore(s => s.selectedHex);

  const [buildModalVisible, setBuildModalVisible] = useState(false);
  const [trainModalVisible, setTrainModalVisible] = useState(false);
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
  const [battleModalVisible, setBattleModalVisible] = useState(false);

  const enterMoveMode = useGameStore(s => s.enterMoveMode);
  const moveMode = useGameStore(s => s.moveMode);

  const currentPlayer = players.find(p => p.id === currentPlayerId);

  // Oyun bitti mi
  if (phase === GamePhase.GameOver) {
    const winner = players.find(p => p.castleCoord !== null);
    return (
      <View style={styles.gameOverContainer}>
        <Text style={styles.gameOverTitle}>Oyun Bitti!</Text>
        <Text style={styles.gameOverWinner}>
          {winner ? `${winner.name} Kazandi!` : 'Berabere!'}
        </Text>
        <TouchableOpacity style={styles.menuBtn} onPress={onBackToMenu}>
          <Text style={styles.menuBtnText}>Ana Menu</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Ust bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBackToMenu}>
          <Text style={styles.backText}>Menu</Text>
        </TouchableOpacity>
        <Text style={styles.turnText}>Tur {turn}</Text>
        <View style={styles.playerBadge}>
          <View style={[styles.playerDot, { backgroundColor: currentPlayer?.color }]} />
          <Text style={styles.playerText}>
            {currentPlayer?.name ?? '---'}
          </Text>
        </View>
      </View>

      {/* Hareket modu bilgisi */}
      {moveMode && (
        <View style={styles.moveBanner}>
          <Text style={styles.moveBannerText}>Hedef hex'e dokun</Text>
        </View>
      )}

      {/* Harita */}
      <HexMapRenderer onBattleResult={(result) => {
        setBattleResult(result);
        setBattleModalVisible(true);
      }} />

      {/* Hex bilgi paneli */}
      {selectedHex && !moveMode && (
        <HexInfoPanel
          onBuild={() => setBuildModalVisible(true)}
          onTrain={() => setTrainModalVisible(true)}
          onMove={() => enterMoveMode(selectedHex)}
        />
      )}

      {/* Alt bar */}
      <View style={styles.bottomBar}>
        {currentPlayer && (
          <View style={styles.resourceRow}>
            {(['gold', 'iron', 'food', 'wood', 'stone'] as const).map(res => (
              <View key={res} style={styles.resItem}>
                <Text style={styles.resIcon}>{RESOURCE_ICONS[res]}</Text>
                <Text style={[styles.resText, { color: RESOURCE_COLORS[res] }]}>
                  {currentPlayer.resources[res]}
                </Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.endTurnButton}
          onPress={() => useGameStore.getState().endTurn()}
        >
          <Text style={styles.endTurnText}>Turu Bitir</Text>
        </TouchableOpacity>
      </View>

      {/* Modaller */}
      <BuildModal
        visible={buildModalVisible}
        onClose={() => setBuildModalVisible(false)}
      />
      <TrainModal
        visible={trainModalVisible}
        onClose={() => setTrainModalVisible(false)}
      />
      <BattleResultModal
        visible={battleModalVisible}
        result={battleResult}
        onClose={() => setBattleModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    backgroundColor: COLORS.bgLight,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    zIndex: 10,
  },
  backText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  turnText: {
    color: COLORS.gold,
    fontSize: 16,
    fontWeight: '700',
  },
  playerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  playerText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  moveBanner: {
    backgroundColor: COLORS.primaryDark,
    paddingVertical: 8,
    alignItems: 'center',
    zIndex: 10,
  },
  moveBannerText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 32,
    backgroundColor: COLORS.bgLight,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    zIndex: 10,
  },
  resourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  resItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  resIcon: {
    fontSize: 12,
  },
  resText: {
    fontSize: 12,
    fontWeight: '700',
  },
  endTurnButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  endTurnText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  // Game Over
  gameOverContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  gameOverTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.gold,
    marginBottom: 12,
  },
  gameOverWinner: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 32,
  },
  menuBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  menuBtnText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
});
