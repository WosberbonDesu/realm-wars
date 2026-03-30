import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, ScrollView,
} from 'react-native';
import { ClipboardService } from '../services/clipboard';
import { COLORS, FONT, SPACE, RADIUS } from '../constants/theme';
import { useGameStore } from '../store/gameStore';
import { hasSave, getSaveInfo } from '../services/saveService';
import AnimatedButton from '../components/AnimatedButton';
import { BotDifficulty } from '../types/game';
import { playSound } from '../services/soundService';
import { useI18n } from '../i18n/useI18n';
import { FACTIONS, FACTION_IDS, FactionId } from '../constants/factions';
import { MapTemplate } from '../types/mapEditor';

interface Props {
  onStartGame: () => void;
  onSettings: () => void;
  onMapGallery?: () => void;
  selectedMap?: MapTemplate | null;
}

export default function MainMenuScreen({ onStartGame, onSettings, onMapGallery, selectedMap }: Props) {
  const { t } = useI18n();
  const [playerName, setPlayerName] = useState('Komutan');
  const [botCount, setBotCount] = useState(2);
  const [difficulty, setDifficulty] = useState<BotDifficulty>('normal');
  const [mapSize, setMapSize] = useState<12 | 18 | 24>(18);
  const [faction, setFaction] = useState<FactionId>('turkic');
  const [seedInput, setSeedInput] = useState('');
  const [savedExists, setSavedExists] = useState(false);
  const [saveInfo, setSaveInfo] = useState<{ turn: number; playerName: string } | null>(null);
  const [showSetup, setShowSetup] = useState(false);

  const initGame = useGameStore(s => s.initGame);
  const loadSavedGame = useGameStore(s => s.loadSavedGame);

  useEffect(() => {
    hasSave().then(setSavedExists);
    getSaveInfo().then(info => {
      if (info) setSaveInfo(info);
    });
  }, []);

  const handleNewGame = () => {
    playSound('click');
    setShowSetup(true);
  };

  const handleContinue = async () => {
    playSound('click');
    const success = await loadSavedGame();
    if (success) onStartGame();
  };

  const handleStartGame = () => {
    playSound('click');

    // Custom harita secilmisse, onu store'a aktaracagiz
    if (selectedMap && selectedMap.generatorType === 'custom') {
      // Custom haritayi initGame'e seed olarak gecirebiliriz
      // ama aslinda terrainData'yi kullanmamiz lazim
      // Simdilik: selectedMap'in seed'ini kullan, radius'u al
      initGame(
        playerName || 'Komutan', botCount,
        selectedMap.generatorSeed ?? Date.now(),
        difficulty, selectedMap.radius, faction,
      );
      // Custom harita terrain verisini uygula
      if (selectedMap.terrainData.length > 0) {
        const store = useGameStore.getState();
        const newMap = new Map(store.map);
        for (const [q, r, terrain] of selectedMap.terrainData) {
          const key = `${q},${r}`;
          const tile = newMap.get(key);
          if (tile) {
            newMap.set(key, { ...tile, terrain });
          }
        }
        useGameStore.setState({ map: newMap });
      }
    } else {
      const parsedSeed = seedInput.trim() ? parseInt(seedInput.trim(), 10) : undefined;
      if (seedInput.trim() && (isNaN(parsedSeed!) || parsedSeed! < 1)) {
        Alert.alert(t('setup.invalidSeed'), t('setup.invalidSeedMsg'));
        return;
      }
      const seed = selectedMap?.generatorSeed ?? parsedSeed;
      const radius = selectedMap?.radius ?? mapSize;
      initGame(playerName || 'Komutan', botCount, seed, difficulty, radius, faction);
    }
    onStartGame();
  };

  const handlePasteSeed = async () => {
    try {
      const text = await ClipboardService.getString();
      const num = parseInt(text.trim(), 10);
      if (!isNaN(num) && num > 0) {
        setSeedInput(String(num));
      }
    } catch {
      // ignore
    }
  };

  const DIFF_COLORS: Record<BotDifficulty, string> = {
    easy: COLORS.green, normal: COLORS.primaryLight, hard: COLORS.red,
  };

  if (showSetup) {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.setupScroll} contentContainerStyle={styles.setupScrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.setupPanel}>
          <Text style={styles.setupTitle}>{t('setup.title')}</Text>

          {/* Oyuncu Adi */}
          <Text style={styles.label}>{t('setup.playerName')}</Text>
          <TextInput
            style={styles.input}
            value={playerName}
            onChangeText={setPlayerName}
            placeholder={t('setup.playerNamePlaceholder')}
            placeholderTextColor={COLORS.textMuted}
            maxLength={16}
          />

          {/* Bot Sayisi */}
          <Text style={styles.label}>{t('setup.botCount')}</Text>
          <View style={styles.rowSelector}>
            {[1, 2, 3].map(n => (
              <TouchableOpacity
                key={n}
                style={[styles.selectorOption, botCount === n && styles.selectorActive]}
                onPress={() => { playSound('click'); setBotCount(n); }}
              >
                <Text style={[styles.selectorText, botCount === n && styles.selectorTextActive]}>
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Harita Boyutu */}
          <Text style={styles.label}>{t('setup.mapSize')}</Text>
          <View style={styles.rowSelector}>
            {([
              { value: 12 as const, key: 'setup.mapSmall', sub: '~200' },
              { value: 18 as const, key: 'setup.mapMedium', sub: '~600' },
              { value: 24 as const, key: 'setup.mapLarge', sub: '~1200' },
            ]).map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.selectorOption, mapSize === opt.value && styles.selectorActive]}
                onPress={() => { playSound('click'); setMapSize(opt.value); }}
              >
                <Text style={[styles.selectorText, mapSize === opt.value && styles.selectorTextActive]}>
                  {t(opt.key)}
                </Text>
                <Text style={styles.mapSizeSub}>{opt.sub} hex</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Uygarlık Seçimi */}
          <Text style={styles.label}>UYGARLIK</Text>
          <View style={styles.factionGrid}>
            {FACTION_IDS.map(fid => {
              const f = FACTIONS[fid];
              const isActive = faction === fid;
              return (
                <TouchableOpacity
                  key={fid}
                  style={[styles.factionCard, isActive && { borderColor: f.color, borderWidth: 2 }]}
                  onPress={() => { playSound('click'); setFaction(fid); }}
                >
                  <Text style={styles.factionIcon}>{f.icon}</Text>
                  <Text style={[styles.factionName, isActive && { color: f.color }]}>{f.name}</Text>
                  <Text style={styles.factionTitle}>{f.title}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {/* Seçili faction detay */}
          <View style={styles.factionDetail}>
            <Text style={[styles.factionDetailName, { color: FACTIONS[faction].color }]}>
              {FACTIONS[faction].icon} {FACTIONS[faction].title}
            </Text>
            <Text style={styles.factionDesc}>{FACTIONS[faction].description}</Text>
            {FACTIONS[faction].bonuses.map((b, i) => (
              <Text key={i} style={styles.factionBonus}>• {b.description}</Text>
            ))}
          </View>

          {/* Zorluk */}
          <Text style={styles.label}>{t('setup.difficulty')}</Text>
          <View style={styles.rowSelector}>
            {(['easy', 'normal', 'hard'] as BotDifficulty[]).map(d => (
              <TouchableOpacity
                key={d}
                style={[
                  styles.selectorOption,
                  difficulty === d && { ...styles.selectorActive, borderColor: DIFF_COLORS[d] },
                ]}
                onPress={() => { playSound('click'); setDifficulty(d); }}
              >
                <Text style={[
                  styles.selectorText,
                  difficulty === d && { color: DIFF_COLORS[d], fontWeight: FONT.bold },
                ]}>
                  {t(`setup.${d}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.diffDesc, { color: DIFF_COLORS[difficulty] }]}>
            {t(`setup.${difficulty}Desc`)}
          </Text>

          {/* Harita Seçimi */}
          <Text style={styles.label}>HARITA</Text>
          <TouchableOpacity
            style={styles.mapSelectBtn}
            onPress={() => onMapGallery?.()}
          >
            <Text style={styles.mapSelectIcon}>{selectedMap?.icon ?? '🎲'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.mapSelectName}>{selectedMap?.name ?? 'Rastgele Dunya'}</Text>
              <Text style={styles.mapSelectDesc}>
                {selectedMap?.description ?? 'Prosedural uretilmis harita'}
              </Text>
            </View>
            <Text style={styles.mapSelectArrow}>{'›'}</Text>
          </TouchableOpacity>

          {/* Seed (sadece prosedürel haritada göster) */}
          {(!selectedMap || selectedMap.generatorType === 'procedural') && (<>
          <Text style={styles.label}>{t('setup.seedLabel')}</Text>
          <View style={styles.seedRow}>
            <TextInput
              style={[styles.input, styles.seedInput]}
              value={seedInput}
              onChangeText={setSeedInput}
              placeholder={t('setup.seedPlaceholder')}
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              maxLength={12}
            />
            <TouchableOpacity style={styles.pasteBtn} onPress={handlePasteSeed}>
              <Text style={styles.pasteBtnText}>{t('setup.paste')}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.seedHint}>{t('setup.seedHint')}</Text>
          </>)}

          {/* Basla */}
          <AnimatedButton
            label={t('setup.start')}
            onPress={handleStartGame}
            variant="gold"
            style={{ marginBottom: 12 }}
          />

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => { playSound('click'); setShowSetup(false); }}
          >
            <Text style={styles.backButtonText}>{t('menu.back')}</Text>
          </TouchableOpacity>
        </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Baslik */}
      <View style={styles.titleContainer}>
        <Text style={styles.titleIcon}>{'⚔️'}</Text>
        <Text style={styles.title}>{t('menu.title')}</Text>
        <Text style={styles.subtitle}>{t('menu.subtitle')}</Text>
      </View>

      {/* Menu Butonlari */}
      <View style={styles.menuButtons}>
        <AnimatedButton label={t('menu.newGame')} onPress={handleNewGame} variant="primary" />

        <View>
          <AnimatedButton
            label={t('menu.continue')}
            onPress={handleContinue}
            variant="primary"
            disabled={!savedExists}
          />
          {saveInfo && savedExists && (
            <Text style={styles.saveInfoText}>
              {saveInfo.playerName} — Tur {saveInfo.turn}
            </Text>
          )}
        </View>

        <AnimatedButton
          label={t('menu.settings')}
          onPress={() => { playSound('click'); onSettings(); }}
          variant="secondary"
        />
      </View>

      {/* Versiyon */}
      <Text style={styles.version}>{t('menu.version')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  titleIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.gold,
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    letterSpacing: 2,
  },
  menuButtons: {
    width: '100%',
    maxWidth: 300,
    gap: 16,
  },
  saveInfoText: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  version: {
    position: 'absolute',
    bottom: 24,
    color: COLORS.textMuted,
    fontSize: 12,
  },
  setupScroll: {
    flex: 1,
    width: '100%',
  },
  setupScrollContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  setupPanel: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: COLORS.bgLight,
    borderRadius: RADIUS.xl,
    padding: SPACE.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  setupTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.gold,
    textAlign: 'center',
    marginBottom: SPACE.lg,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: FONT.caption,
    fontWeight: FONT.bold,
    marginBottom: SPACE.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACE.md,
    paddingVertical: 11,
    color: COLORS.textPrimary,
    fontSize: FONT.body,
    marginBottom: SPACE.lg,
  },
  rowSelector: {
    flexDirection: 'row',
    gap: SPACE.sm,
    marginBottom: SPACE.sm,
  },
  selectorOption: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
  selectorActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryDark,
  },
  selectorText: {
    color: COLORS.textMuted,
    fontSize: FONT.caption,
    fontWeight: FONT.bold,
  },
  selectorTextActive: {
    color: COLORS.textPrimary,
  },
  mapSizeSub: {
    color: COLORS.textMuted,
    fontSize: 9,
    marginTop: 1,
  },
  diffDesc: {
    fontSize: FONT.tiny,
    marginBottom: SPACE.lg,
    marginTop: 2,
  },
  seedRow: {
    flexDirection: 'row',
    gap: SPACE.sm,
    marginBottom: SPACE.xs,
  },
  seedInput: {
    flex: 1,
    marginBottom: 0,
  },
  pasteBtn: {
    paddingHorizontal: SPACE.md,
    paddingVertical: 11,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
  },
  pasteBtnText: {
    color: COLORS.textSecondary,
    fontSize: FONT.caption,
    fontWeight: FONT.bold,
  },
  mapSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACE.md,
    marginBottom: SPACE.lg,
    gap: SPACE.md,
  },
  mapSelectIcon: { fontSize: 28 },
  mapSelectName: {
    color: COLORS.textPrimary,
    fontSize: FONT.body,
    fontWeight: '700' as any,
  },
  mapSelectDesc: {
    color: COLORS.textMuted,
    fontSize: FONT.tiny,
    marginTop: 1,
  },
  mapSelectArrow: {
    color: COLORS.textMuted,
    fontSize: 22,
    fontWeight: '300' as any,
  },
  factionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.sm,
    marginBottom: SPACE.sm,
  },
  factionCard: {
    width: '47%' as any,
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACE.sm,
    paddingHorizontal: SPACE.sm,
    alignItems: 'center',
  },
  factionIcon: {
    fontSize: 24,
    marginBottom: 2,
  },
  factionName: {
    color: COLORS.textPrimary,
    fontSize: FONT.caption,
    fontWeight: '700' as any,
  },
  factionTitle: {
    color: COLORS.textMuted,
    fontSize: 8,
  },
  factionDetail: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    padding: SPACE.md,
    marginBottom: SPACE.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  factionDetailName: {
    fontSize: FONT.body,
    fontWeight: '700' as any,
    marginBottom: SPACE.xs,
  },
  factionDesc: {
    color: COLORS.textSecondary,
    fontSize: FONT.tiny,
    marginBottom: SPACE.sm,
  },
  factionBonus: {
    color: COLORS.green,
    fontSize: FONT.tiny,
    marginBottom: 2,
  },
  seedHint: {
    color: COLORS.textMuted,
    fontSize: FONT.tiny,
    marginBottom: SPACE.xl,
  },
  backButton: {
    paddingVertical: SPACE.md,
    alignItems: 'center',
  },
  backButtonText: {
    color: COLORS.textMuted,
    fontSize: FONT.body,
  },
});
