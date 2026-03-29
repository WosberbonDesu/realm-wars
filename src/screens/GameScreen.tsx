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
import TutorialModal from '../components/TutorialModal';
import GameOverScreen from '../components/GameOverScreen';
import FloatingFeedback, { FeedbackItem } from '../components/FloatingFeedback';
import ScreenFlash from '../components/ScreenFlash';
import { GamePhase } from '../types/game';
import { BattleResult } from '../engine/combat';
import { GAME_EVENTS, GameEvent } from '../constants/events';
import { playSound } from '../services/soundService';

interface Props {
  onBackToMenu: () => void;
}

export default function GameScreen({ onBackToMenu }: Props) {
  const turn = useGameStore(s => s.turn);
  const phase = useGameStore(s => s.phase);
  const currentPlayerId = useGameStore(s => s.currentPlayerId);
  const players = useGameStore(s => s.players);
  const selectedHex = useGameStore(s => s.selectedHex);
  const mapSeed = useGameStore(s => s.mapSeed);

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
  const [tutorialVisible, setTutorialVisible] = useState(false);
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

  // Animations
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  let feedbackCounter = useRef(0);

  const showFeedback = (icon: string, text: string, color: string) => {
    feedbackCounter.current++;
    const item: FeedbackItem = { id: `fb-${feedbackCounter.current}`, icon, text, color };
    setFeedbackItems(prev => [...prev, item]);
  };

  const removeFeedback = (id: string) => {
    setFeedbackItems(prev => prev.filter(f => f.id !== id));
  };

  // Ilk tur -> tutorial goster
  const tutorialShown = useRef(false);
  useEffect(() => {
    if (turn === 1 && !tutorialShown.current) {
      tutorialShown.current = true;
      setTutorialVisible(true);
    }
  }, [turn]);

  useEffect(() => {
    if (turn !== prevTurn.current) {
      prevTurn.current = turn;
      setShowTurnBanner(true);
      playSound('turnStart');
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
        playSound('event');
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
    return <GameOverScreen onBackToMenu={onBackToMenu} />;
  }

  // Toolbar aksiyonları
  const toolbarActions = [
    { icon: '💾', label: 'Kaydet', color: COLORS.gold, onPress: () => { playSound('click'); handleSave(); } },
    { icon: '🔬', label: 'Arastir', color: COLORS.primaryLight, onPress: () => { playSound('click'); setTechModalVisible(true); } },
    { icon: '⚔️', label: 'Kahraman', color: COLORS.orange, onPress: () => { playSound('click'); setHeroModalVisible(true); } },
    { icon: '🏳️', label: 'Diplo', color: COLORS.purple, onPress: () => { playSound('click'); setDiplomacyModalVisible(true); } },
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
        mapSeed={mapSeed}
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
            playSound('battle');
            setFlashColor('#FF4444');
            const won = result.winner === 'attacker';
            showFeedback(
              won ? '⚔️' : '💀',
              won ? 'Zafer!' : 'Maglup!',
              won ? COLORS.green : COLORS.red,
            );
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
          onPress={() => { playSound('turnStart'); useGameStore.getState().endTurn(); }}
          variant="primary"
        />
      </View>

      {/* Animasyon katmani */}
      <FloatingFeedback items={feedbackItems} onItemDone={removeFeedback} />
      <ScreenFlash
        visible={flashColor !== null}
        color={flashColor ?? '#FF4444'}
        onDone={() => setFlashColor(null)}
      />

      {/* Modaller */}
      <BuildModal
        visible={buildModalVisible}
        onClose={(built) => {
          setBuildModalVisible(false);
          if (built) {
            playSound('build');
            showFeedback('🏗️', 'Bina kuruldu!', COLORS.green);
          }
        }}
      />
      <TrainModal
        visible={trainModalVisible}
        onClose={(trained) => {
          setTrainModalVisible(false);
          if (trained) {
            playSound('train');
            showFeedback('⚔️', 'Birlik egitildi!', COLORS.primaryLight);
          }
        }}
      />
      <BattleResultModal visible={battleModalVisible} result={battleResult} onClose={() => setBattleModalVisible(false)} />
      <TechTreeModal visible={techModalVisible} onClose={() => setTechModalVisible(false)} />
      <EventModal visible={eventModalVisible} event={currentEvent} onClose={() => setEventModalVisible(false)} />
      <HeroModal visible={heroModalVisible} onClose={() => setHeroModalVisible(false)} />
      <DiplomacyModal visible={diplomacyModalVisible} onClose={() => setDiplomacyModalVisible(false)} />
      <WeatherInfoModal visible={weatherModalVisible} onClose={() => setWeatherModalVisible(false)} />
      <TutorialModal visible={tutorialVisible} onClose={() => setTutorialVisible(false)} />
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
});
