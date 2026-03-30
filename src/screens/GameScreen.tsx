import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
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
import TutorialModal from '../components/TutorialModal';
import GameOverScreen from '../components/GameOverScreen';
import FloatingFeedback, { FeedbackItem } from '../components/FloatingFeedback';
import ScreenFlash from '../components/ScreenFlash';
import MapControls from '../components/MapControls';
import GameToast, { ToastItem } from '../components/GameToast';
import { GamePhase } from '../types/game';
import { BattleResult } from '../engine/combat';
import { GAME_EVENTS, GameEvent } from '../constants/events';
import { playSound } from '../services/soundService';
import { useI18n } from '../i18n/useI18n';
import { useSettings } from '../services/useSettings';

interface Props {
  onBackToMenu: () => void;
}

export default function GameScreen({ onBackToMenu }: Props) {
  const { t } = useI18n();
  const settings = useSettings();
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
  const exitMoveMode = useGameStore(s => s.exitMoveMode);
  const gameSpeed = useGameStore(s => s.gameSpeed);
  const dayPhase = useGameStore(s => s.dayPhase);
  const dayTick = useGameStore(s => s.dayTick);
  const gameTick = useGameStore(s => s.gameTick);
  const setGameSpeed = useGameStore(s => s.setGameSpeed);
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

  // Toast notifications
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  let toastCounter = useRef(0);

  const showToast = (icon: string, text: string, color: string, type: ToastItem['type'] = 'info') => {
    toastCounter.current++;
    setToasts(prev => [...prev, { id: `t-${toastCounter.current}`, icon, text, color, type }]);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const showFeedback = (icon: string, text: string, color: string) => {
    feedbackCounter.current++;
    const item: FeedbackItem = { id: `fb-${feedbackCounter.current}`, icon, text, color };
    setFeedbackItems(prev => [...prev, item]);
  };

  const removeFeedback = (id: string) => {
    setFeedbackItems(prev => prev.filter(f => f.id !== id));
  };

  // ═══ REAL-TIME TICK TIMER ═══
  useEffect(() => {
    if (gameSpeed === 0 || phase !== GamePhase.Playing) return;
    // Tick araligi: speed 1=3s, 2=1.5s, 3=0.75s
    const intervals = [0, 3000, 1500, 750];
    const ms = intervals[gameSpeed] ?? 3000;
    const timer = setInterval(() => {
      gameTick();
    }, ms);
    return () => clearInterval(timer);
  }, [gameSpeed, phase, gameTick]);

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
        showToast(event.icon, event.name, event.positive ? COLORS.green : COLORS.red, event.positive ? 'success' : 'warning');
      }
      useGameStore.setState({ pendingEvent: null });
    }
  }, [pendingEvent]);

  const currentPlayer = players.find(p => p.id === currentPlayerId);

  const handleBackToMenu = () => {
    Alert.alert(
      t('game.exitTitle'),
      t('game.exitMsg'),
      [
        { text: t('game.cancel'), style: 'cancel' },
        { text: t('game.saveAndExit'), onPress: async () => { await saveCurrentGame(); onBackToMenu(); } },
        { text: t('game.exit'), style: 'destructive', onPress: onBackToMenu },
      ]
    );
  };

  const income = useMemo(() => {
    if (!currentPlayerId) return null;
    return calculateIncome(currentPlayerId);
  }, [currentPlayerId, players, calculateIncome]);

  const handleSave = async () => {
    await saveCurrentGame();
    Alert.alert(t('game.saved'), t('game.savedMsg'));
  };

  // Oyun bitti mi
  const victoryInfo = useGameStore(s => s.victoryInfo);

  if (phase === GamePhase.GameOver) {
    return <GameOverScreen onBackToMenu={onBackToMenu} />;
  }

  const handleCenterCastle = () => {
    if (currentPlayer?.castleCoord) {
      mapRef.current?.focusOnHex(currentPlayer.castleCoord.q, currentPlayer.castleCoord.r);
    }
  };

  return (
    <View style={styles.container}>
      {/* ═══ TOP BAR: geri + oyuncu + tur + aksiyonlar ═══ */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBackToMenu} style={styles.backBtn}>
          <Text style={styles.backIcon}>{'‹'}</Text>
        </TouchableOpacity>

        <View style={[styles.playerDot, { backgroundColor: currentPlayer?.color ?? COLORS.primary }]} />
        <Text style={styles.playerName} numberOfLines={1}>{currentPlayer?.name ?? '---'}</Text>

        <View style={styles.turnBadge}>
          <Text style={styles.turnLabel}>{t('toolbar.turn')}</Text>
          <Text style={styles.turnNumber}>{turn}</Text>
        </View>

        {/* Seed */}
        <Text style={styles.seedText}>#{String(mapSeed).slice(-5)}</Text>

        <View style={{ flex: 1 }} />

        {/* Top-right actions — bigger touch targets */}
        <TouchableOpacity style={styles.topAction} onPress={() => { playSound('click'); handleSave(); }}>
          <Text style={styles.topActionIcon}>💾</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.topAction} onPress={() => { playSound('click'); setTechModalVisible(true); }}>
          <Text style={styles.topActionIcon}>🔬</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.topAction} onPress={() => { playSound('click'); setHeroModalVisible(true); }}>
          <Text style={styles.topActionIcon}>🦸</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.topAction} onPress={() => { playSound('click'); setDiplomacyModalVisible(true); }}>
          <Text style={styles.topActionIcon}>🏳️</Text>
        </TouchableOpacity>
      </View>

      {/* ═══ WEATHER + MOVE BANNER ═══ */}
      <View style={styles.subBar}>
        <WeatherBadge onPress={() => setWeatherModalVisible(true)} />
        {moveMode && (
          <View style={styles.moveBanner}>
            <Text style={styles.moveBannerText}>{t('game.moveHint')}</Text>
            <TouchableOpacity onPress={() => exitMoveMode()} style={styles.cancelMoveBtn}>
              <Text style={styles.cancelMoveText}>{t('game.cancel')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ═══ MAP AREA ═══ */}
      <View style={styles.mapContainer}>
        <HexMapRenderer
          ref={mapRef}
          showGrid={settings.showGrid}
          showFogOfWar={settings.showFogOfWar}
          dayPhase={dayPhase}
          onBattleResult={(result) => {
            setBattleResult(result);
            setBattleModalVisible(true);
            playSound('battle');
            setFlashColor('#FF4444');
            const won = result.winner === 'attacker';
            showFeedback(
              won ? '⚔️' : '💀',
              won ? t('feedback.victory') : t('feedback.defeat'),
              won ? COLORS.green : COLORS.red,
            );
            showToast(
              won ? '⚔️' : '💀',
              won ? t('feedback.victory') : t('feedback.defeat'),
              won ? COLORS.green : COLORS.red,
              won ? 'success' : 'danger',
            );
          }}
        />

        {/* Minimap */}
        <Minimap onTapHex={(q, r) => mapRef.current?.focusOnHex(q, r)} />

        {/* Zoom controls */}
        <MapControls
          onZoomIn={() => mapRef.current?.zoomIn()}
          onZoomOut={() => mapRef.current?.zoomOut()}
          onCenterCastle={handleCenterCastle}
        />

        {/* Turn banner overlay */}
        <TurnBanner
          turn={turn}
          playerName={currentPlayer?.name ?? ''}
          playerColor={currentPlayer?.color ?? COLORS.primary}
          visible={showTurnBanner}
          onFinish={() => setShowTurnBanner(false)}
          animationSpeed={settings.animationSpeed}
        />

        {actionLog.length > 0 && <ActionLog entries={actionLog} />}
      </View>

      {/* ═══ HEX INFO PANEL — positioned above bottom bar ═══ */}
      {selectedHex && !moveMode && (
        <HexInfoPanel
          onBuild={() => setBuildModalVisible(true)}
          onTrain={() => setTrainModalVisible(true)}
          onMove={() => enterMoveMode(selectedHex)}
        />
      )}

      {/* ═══ BOTTOM BAR: resources + time controls ═══ */}
      <View style={styles.bottomBar}>
        <VictoryProgress
          expanded={victoryExpanded}
          onToggle={() => setVictoryExpanded(v => !v)}
        />

        {currentPlayer && (
          <ResourceBar resources={currentPlayer.resources} income={income} />
        )}

        {/* Zaman kontrolleri */}
        <View style={styles.timeBar}>
          <View style={styles.dayInfo}>
            <Text style={styles.dayIcon}>{dayPhase === 'night' ? '🌙' : dayPhase === 'dawn' ? '🌅' : dayPhase === 'dusk' ? '🌇' : '☀️'}</Text>
            <View>
              <Text style={styles.dayText}>
                {dayPhase === 'night' ? 'Gece' : dayPhase === 'dawn' ? 'Safak' : dayPhase === 'dusk' ? 'Aksam' : 'Gunduz'}
              </Text>
              <Text style={styles.turnText}>Gun {turn} • {String(dayTick).padStart(2, '0')}:00</Text>
            </View>
          </View>

          <View style={styles.speedControls}>
            {[0, 1, 2, 3].map(spd => (
              <TouchableOpacity
                key={spd}
                style={[styles.speedBtn, gameSpeed === spd && styles.speedBtnActive]}
                onPress={() => { playSound('click'); setGameSpeed(spd); }}
              >
                <Text style={[styles.speedBtnText, gameSpeed === spd && styles.speedBtnTextActive]}>
                  {spd === 0 ? '⏸' : spd === 1 ? '▶' : spd === 2 ? '▶▶' : '▶▶▶'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* ═══ TOAST NOTIFICATIONS ═══ */}
      <GameToast toasts={toasts} onDismiss={dismissToast} />

      {/* ═══ ANIMATION LAYERS ═══ */}
      <FloatingFeedback items={feedbackItems} onItemDone={removeFeedback} />
      <ScreenFlash
        visible={flashColor !== null}
        color={flashColor ?? '#FF4444'}
        onDone={() => setFlashColor(null)}
      />

      {/* ═══ MODALS ═══ */}
      <BuildModal
        visible={buildModalVisible}
        onClose={(built) => {
          setBuildModalVisible(false);
          if (built) {
            playSound('build');
            showFeedback('🏗️', t('feedback.built'), COLORS.green);
          }
        }}
      />
      <TrainModal
        visible={trainModalVisible}
        onClose={(trained) => {
          setTrainModalVisible(false);
          if (trained) {
            playSound('train');
            showFeedback('⚔️', t('feedback.trained'), COLORS.primaryLight);
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

  // ═══ TOP BAR ═══
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACE.md,
    paddingTop: 50,
    paddingBottom: SPACE.sm,
    backgroundColor: COLORS.bgLight,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACE.sm,
    zIndex: 20,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    color: COLORS.textSecondary,
    fontSize: 20,
    fontWeight: '700',
    marginTop: -1,
  },
  playerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  playerName: {
    color: COLORS.textPrimary,
    fontSize: FONT.caption,
    fontWeight: '700' as any,
    maxWidth: 60,
  },
  turnBadge: {
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACE.sm,
    paddingVertical: 2,
  },
  turnLabel: {
    color: COLORS.textMuted,
    fontSize: 7,
    fontWeight: '700' as any,
    letterSpacing: 1.5,
  },
  turnNumber: {
    color: COLORS.gold,
    fontSize: FONT.body,
    fontWeight: '900' as any,
    marginTop: -1,
  },
  seedText: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '600' as any,
  },
  topAction: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topActionIcon: {
    fontSize: 18,
  },

  // ═══ SUB BAR ═══
  subBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.xs,
    backgroundColor: COLORS.bgLight,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACE.md,
    zIndex: 15,
  },
  moveBanner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryDark,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACE.xs,
    paddingHorizontal: SPACE.md,
    gap: SPACE.md,
  },
  moveBannerText: {
    color: COLORS.textPrimary,
    fontSize: FONT.caption,
    fontWeight: '700' as any,
  },
  cancelMoveBtn: {
    backgroundColor: COLORS.red + '30',
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.xs,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.red + '60',
  },
  cancelMoveText: {
    color: COLORS.red,
    fontSize: FONT.tiny,
    fontWeight: '700' as any,
  },

  // ═══ MAP ═══
  mapContainer: {
    flex: 1,
  },

  // ═══ BOTTOM BAR ═══
  bottomBar: {
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.sm,
    paddingBottom: 28,
    backgroundColor: COLORS.bgLight,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    zIndex: 10,
  },
  timeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACE.sm,
  },
  dayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
  },
  dayIcon: {
    fontSize: 22,
  },
  dayText: {
    color: COLORS.textPrimary,
    fontSize: FONT.caption,
    fontWeight: '700' as any,
  },
  turnText: {
    color: COLORS.textMuted,
    fontSize: FONT.tiny,
    marginTop: 1,
  },
  speedControls: {
    flexDirection: 'row',
    gap: SPACE.xs,
  },
  speedBtn: {
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.sm,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 42,
    alignItems: 'center',
  },
  speedBtnActive: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primary,
  },
  speedBtnText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700' as any,
  },
  speedBtnTextActive: {
    color: COLORS.gold,
  },
});
