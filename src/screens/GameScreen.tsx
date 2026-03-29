import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { COLORS, FONT, SPACE, RADIUS } from '../constants/theme';
import { useGameStore } from '../store/gameStore';
import HexMapRenderer, { HexMapRef } from '../components/HexMapRenderer';
import HexInfoPanel from '../components/HexInfoPanel';
import BuildModal from '../components/BuildModal';
import TrainModal from '../components/TrainModal';
import BattleResultModal from '../components/BattleResultModal';
import Minimap from '../components/Minimap';
import TurnBanner from '../components/TurnBanner';
import ActionLog from '../components/ActionLog';
import AnimatedButton from '../components/AnimatedButton';
import ResourceBar from '../components/ResourceBar';
import TechTreeModal from '../components/TechTreeModal';
import EventModal from '../components/EventModal';
import HeroModal from '../components/HeroModal';
import DiplomacyModal from '../components/DiplomacyModal';
import WeatherBadge from '../components/WeatherBadge';
import WeatherInfoModal from '../components/WeatherInfoModal';
import VictoryProgress from '../components/VictoryProgress';
import GameToolbar from '../components/GameToolbar';
import { GamePhase } from '../types/game';
import { BattleResult } from '../engine/combat';
import { GAME_EVENTS, GameEvent } from '../constants/events';
import { VICTORY_CONDITIONS, VictoryType } from '../constants/victory';

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
  const [techModalVisible, setTechModalVisible] = useState(false);
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [heroModalVisible, setHeroModalVisible] = useState(false);
  const [diplomacyModalVisible, setDiplomacyModalVisible] = useState(false);
  const [weatherModalVisible, setWeatherModalVisible] = useState(false);
  const [victoryExpanded, setVictoryExpanded] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<GameEvent | null>(null);
  const pendingEvent = useGameStore(s => s.pendingEvent);

  const enterMoveMode = useGameStore(s => s.enterMoveMode);
  const moveMode = useGameStore(s => s.moveMode);
  const saveCurrentGame = useGameStore(s => s.saveCurrentGame);
  const calculateIncome = useGameStore(s => s.calculateIncome);
  const actionLog = useGameStore(s => s.actionLog);
  const clearActionLog = useGameStore(s => s.clearActionLog);

  const mapRef = useRef<HexMapRef>(null);
  const [showTurnBanner, setShowTurnBanner] = useState(false);
  const prevTurn = useRef(turn);

  useEffect(() => {
    if (turn !== prevTurn.current) {
      prevTurn.current = turn;
      setShowTurnBanner(true);
      const timer = setTimeout(() => clearActionLog(), 5000);
      return () => clearTimeout(timer);
    }
  }, [turn]);

  useEffect(() => {
    if (pendingEvent) {
      const event = GAME_EVENTS[pendingEvent.type as keyof typeof GAME_EVENTS];
      if (event) {
        setCurrentEvent(event);
        setEventModalVisible(true);
      }
      useGameStore.setState({ pendingEvent: null });
    }
  }, [pendingEvent]);

  const currentPlayer = players.find(p => p.id === currentPlayerId);

  const handleBackToMenu = () => {
    Alert.alert(
      'Oyundan Cik',
      'Kaydedilmemis ilerleme kaybolacak. Emin misin?',
      [
        { text: 'Iptal', style: 'cancel' },
        { text: 'Kaydet ve Cik', onPress: async () => { await saveCurrentGame(); onBackToMenu(); } },
        { text: 'Cik', style: 'destructive', onPress: onBackToMenu },
      ]
    );
  };

  const income = useMemo(() => {
    if (!currentPlayerId) return null;
    return calculateIncome(currentPlayerId);
  }, [currentPlayerId, players, calculateIncome]);

  const handleSave = async () => {
    await saveCurrentGame();
    Alert.alert('Kaydedildi', 'Oyun basariyla kaydedildi.');
  };

  // Oyun bitti mi
  const victoryInfo = useGameStore(s => s.victoryInfo);

  if (phase === GamePhase.GameOver) {
    const winner = victoryInfo
      ? players.find(p => p.id === victoryInfo.winnerId)
      : players.find(p => p.castleCoord !== null);
    const victory = victoryInfo
      ? VICTORY_CONDITIONS[victoryInfo.victoryType as VictoryType]
      : null;

    return (
      <View style={styles.gameOverContainer}>
        {victory && <Text style={styles.victoryIcon}>{victory.icon}</Text>}
        <Text style={[styles.gameOverTitle, victory && { color: victory.color }]}>
          {victory ? victory.name : 'Oyun Bitti!'}
        </Text>
        <Text style={styles.gameOverWinner}>
          {winner ? `${winner.name} Kazandi!` : 'Berabere!'}
        </Text>
        {victory && <Text style={styles.victoryDesc}>{victory.description}</Text>}
        <Text style={styles.gameOverStats}>
          Tur: {turn} | Toprak: {winner?.territory.length ?? 0}
        </Text>
        <AnimatedButton
          label="Ana Menu"
          onPress={onBackToMenu}
          variant="primary"
          style={{ paddingHorizontal: 40, marginTop: SPACE.xl }}
        />
      </View>
    );
  }

  // Toolbar aksiyonları
  const toolbarActions = [
    { icon: '💾', label: 'Kaydet', color: COLORS.gold, onPress: handleSave },
    { icon: '🔬', label: 'Arastir', color: COLORS.primaryLight, onPress: () => setTechModalVisible(true) },
    { icon: '⚔️', label: 'Kahraman', color: COLORS.orange, onPress: () => setHeroModalVisible(true) },
    { icon: '🏳️', label: 'Diplo', color: COLORS.purple, onPress: () => setDiplomacyModalVisible(true) },
  ];

  return (
    <View style={styles.container}>
      {/* Toolbar */}
      <GameToolbar
        turn={turn}
        playerName={currentPlayer?.name ?? '---'}
        playerColor={currentPlayer?.color ?? COLORS.primary}
        actions={toolbarActions}
        onBackToMenu={handleBackToMenu}
      />

      {/* Hava durumu satiri */}
      <View style={styles.weatherRow}>
        <WeatherBadge onPress={() => setWeatherModalVisible(true)} />
      </View>

      {/* Hareket modu bilgisi */}
      {moveMode && (
        <View style={styles.moveBanner}>
          <Text style={styles.moveBannerText}>Hedef hex'e dokun</Text>
        </View>
      )}

      {/* Harita */}
      <View style={styles.mapContainer}>
        <HexMapRenderer
          ref={mapRef}
          onBattleResult={(result) => {
            setBattleResult(result);
            setBattleModalVisible(true);
          }}
        />
        <Minimap onTapHex={(q, r) => mapRef.current?.focusOnHex(q, r)} />

        <TurnBanner
          turn={turn}
          playerName={currentPlayer?.name ?? ''}
          playerColor={currentPlayer?.color ?? COLORS.primary}
          visible={showTurnBanner}
          onFinish={() => setShowTurnBanner(false)}
        />

        {actionLog.length > 0 && <ActionLog entries={actionLog} />}
      </View>

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
        <VictoryProgress
          expanded={victoryExpanded}
          onToggle={() => setVictoryExpanded(v => !v)}
        />

        {currentPlayer && (
          <ResourceBar resources={currentPlayer.resources} income={income} />
        )}

        <AnimatedButton
          label="Turu Bitir"
          onPress={() => useGameStore.getState().endTurn()}
          variant="primary"
        />
      </View>

      {/* Modaller */}
      <BuildModal visible={buildModalVisible} onClose={() => setBuildModalVisible(false)} />
      <TrainModal visible={trainModalVisible} onClose={() => setTrainModalVisible(false)} />
      <BattleResultModal visible={battleModalVisible} result={battleResult} onClose={() => setBattleModalVisible(false)} />
      <TechTreeModal visible={techModalVisible} onClose={() => setTechModalVisible(false)} />
      <EventModal visible={eventModalVisible} event={currentEvent} onClose={() => setEventModalVisible(false)} />
      <HeroModal visible={heroModalVisible} onClose={() => setHeroModalVisible(false)} />
      <DiplomacyModal visible={diplomacyModalVisible} onClose={() => setDiplomacyModalVisible(false)} />
      <WeatherInfoModal visible={weatherModalVisible} onClose={() => setWeatherModalVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  weatherRow: {
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.xs,
    backgroundColor: COLORS.bgLight,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    zIndex: 10,
  },
  moveBanner: {
    backgroundColor: COLORS.primaryDark,
    paddingVertical: SPACE.sm,
    alignItems: 'center',
    zIndex: 10,
  },
  moveBannerText: {
    color: COLORS.textPrimary,
    fontSize: FONT.caption,
    fontWeight: FONT.bold,
  },
  mapContainer: {
    flex: 1,
  },
  bottomBar: {
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.md,
    paddingBottom: 30,
    backgroundColor: COLORS.bgLight,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    zIndex: 10,
  },
  // Game Over
  gameOverContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACE.xxl,
  },
  victoryIcon: {
    fontSize: 56,
    marginBottom: SPACE.lg,
  },
  gameOverTitle: {
    fontSize: FONT.h1,
    fontWeight: FONT.black,
    color: COLORS.gold,
    marginBottom: SPACE.sm,
    textAlign: 'center',
  },
  gameOverWinner: {
    fontSize: FONT.h2,
    fontWeight: FONT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACE.sm,
  },
  victoryDesc: {
    color: COLORS.textSecondary,
    fontSize: FONT.body,
    textAlign: 'center',
    marginBottom: SPACE.sm,
  },
  gameOverStats: {
    color: COLORS.textMuted,
    fontSize: FONT.caption,
  },
});
