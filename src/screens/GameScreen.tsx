import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { COLORS, RESOURCE_COLORS, RESOURCE_ICONS } from '../constants/theme';
import { useGameStore } from '../store/gameStore';
import { Resources } from '../types/game';
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

  // Tur degistiginde banner goster
  useEffect(() => {
    if (turn !== prevTurn.current) {
      prevTurn.current = turn;
      setShowTurnBanner(true);
      const timer = setTimeout(() => clearActionLog(), 5000);
      return () => clearTimeout(timer);
    }
  }, [turn]);

  // Olay geldiginde modal goster
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

  // Gelir hesapla
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
        {victory && (
          <Text style={styles.victoryIcon}>{victory.icon}</Text>
        )}
        <Text style={[
          styles.gameOverTitle,
          victory && { color: victory.color },
        ]}>
          {victory ? victory.name : 'Oyun Bitti!'}
        </Text>
        <Text style={styles.gameOverWinner}>
          {winner ? `${winner.name} Kazandi!` : 'Berabere!'}
        </Text>
        {victory && (
          <Text style={styles.victoryDesc}>{victory.description}</Text>
        )}
        <Text style={styles.gameOverStats}>
          Tur: {turn} | Toprak: {winner?.territory.length ?? 0}
        </Text>
        <AnimatedButton
          label="Ana Menu"
          onPress={onBackToMenu}
          variant="primary"
          style={{ paddingHorizontal: 40, marginTop: 20 }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Ust bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBackToMenu}>
          <Text style={styles.backText}>Menu</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.saveText}>Kaydet</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTechModalVisible(true)}>
          <Text style={styles.techText}>Arastir</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setHeroModalVisible(true)}>
          <Text style={styles.heroText}>Kahramanlar</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setDiplomacyModalVisible(true)}>
          <Text style={styles.diploText}>Diplomasi</Text>
        </TouchableOpacity>
        <WeatherBadge onPress={() => setWeatherModalVisible(true)} />
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
      <View style={{ flex: 1 }}>
        <HexMapRenderer
          ref={mapRef}
          onBattleResult={(result) => {
            setBattleResult(result);
            setBattleModalVisible(true);
          }}
        />
        <Minimap onTapHex={(q, r) => mapRef.current?.focusOnHex(q, r)} />

        {/* Tur gecis banner */}
        <TurnBanner
          turn={turn}
          playerName={currentPlayer?.name ?? ''}
          playerColor={currentPlayer?.color ?? COLORS.primary}
          visible={showTurnBanner}
          onFinish={() => setShowTurnBanner(false)}
        />

        {/* Bot eylem loglari */}
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
      <TechTreeModal
        visible={techModalVisible}
        onClose={() => setTechModalVisible(false)}
      />
      <EventModal
        visible={eventModalVisible}
        event={currentEvent}
        onClose={() => setEventModalVisible(false)}
      />
      <HeroModal
        visible={heroModalVisible}
        onClose={() => setHeroModalVisible(false)}
      />
      <DiplomacyModal
        visible={diplomacyModalVisible}
        onClose={() => setDiplomacyModalVisible(false)}
      />
      <WeatherInfoModal
        visible={weatherModalVisible}
        onClose={() => setWeatherModalVisible(false)}
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
  saveText: {
    color: COLORS.gold,
    fontSize: 13,
    fontWeight: '600',
  },
  techText: {
    color: COLORS.primaryLight,
    fontSize: 13,
    fontWeight: '600',
  },
  heroText: {
    color: '#D9A84A',
    fontSize: 13,
    fontWeight: '600',
  },
  diploText: {
    color: '#8B4AD9',
    fontSize: 13,
    fontWeight: '600',
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
  // Game Over
  gameOverContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  victoryIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  gameOverTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.gold,
    marginBottom: 8,
    textAlign: 'center',
  },
  gameOverWinner: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  victoryDesc: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  gameOverStats: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
});
