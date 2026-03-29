import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput,
  Clipboard, Alert,
} from 'react-native';
import { COLORS, FONT, SPACE, RADIUS } from '../constants/theme';
import { useGameStore } from '../store/gameStore';
import { hasSave, getSaveInfo } from '../services/saveService';
import AnimatedButton from '../components/AnimatedButton';
import { BotDifficulty } from '../types/game';
import { playSound } from '../services/soundService';

interface Props {
  onStartGame: () => void;
  onSettings: () => void;
}

const DIFFICULTY_LABELS: Record<BotDifficulty, { label: string; color: string; desc: string }> = {
  easy:   { label: 'Kolay',    color: COLORS.green,         desc: 'Yeni baslayanlar icin' },
  normal: { label: 'Normal',   color: COLORS.primaryLight,  desc: 'Dengeli bir macera' },
  hard:   { label: 'Zor',      color: COLORS.red,           desc: 'Deneyimliler icin' },
};

export default function MainMenuScreen({ onStartGame, onSettings }: Props) {
  const [playerName, setPlayerName] = useState('Komutan');
  const [botCount, setBotCount] = useState(2);
  const [difficulty, setDifficulty] = useState<BotDifficulty>('normal');
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
    const parsedSeed = seedInput.trim() ? parseInt(seedInput.trim(), 10) : undefined;
    if (seedInput.trim() && (isNaN(parsedSeed!) || parsedSeed! < 1)) {
      Alert.alert('Gecersiz Seed', 'Seed pozitif bir sayi olmalidir.');
      return;
    }
    initGame(playerName || 'Komutan', botCount, parsedSeed, difficulty);
    onStartGame();
  };

  const handlePasteSeed = async () => {
    try {
      const text = await Clipboard.getString();
      const num = parseInt(text.trim(), 10);
      if (!isNaN(num) && num > 0) {
        setSeedInput(String(num));
      }
    } catch {
      // ignore
    }
  };

  if (showSetup) {
    const diffInfo = DIFFICULTY_LABELS[difficulty];
    return (
      <View style={styles.container}>
        <View style={styles.setupPanel}>
          <Text style={styles.setupTitle}>Yeni Oyun</Text>

          {/* Oyuncu Adi */}
          <Text style={styles.label}>Komutan Adi</Text>
          <TextInput
            style={styles.input}
            value={playerName}
            onChangeText={setPlayerName}
            placeholder="Adinizi girin..."
            placeholderTextColor={COLORS.textMuted}
            maxLength={16}
          />

          {/* Bot Sayisi */}
          <Text style={styles.label}>Rakip Sayisi</Text>
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

          {/* Zorluk */}
          <Text style={styles.label}>Zorluk</Text>
          <View style={styles.rowSelector}>
            {(Object.keys(DIFFICULTY_LABELS) as BotDifficulty[]).map(d => (
              <TouchableOpacity
                key={d}
                style={[
                  styles.selectorOption,
                  difficulty === d && { ...styles.selectorActive, borderColor: DIFFICULTY_LABELS[d].color },
                ]}
                onPress={() => { playSound('click'); setDifficulty(d); }}
              >
                <Text style={[
                  styles.selectorText,
                  difficulty === d && { color: DIFFICULTY_LABELS[d].color, fontWeight: FONT.bold },
                ]}>
                  {DIFFICULTY_LABELS[d].label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.diffDesc, { color: diffInfo.color }]}>{diffInfo.desc}</Text>

          {/* Seed */}
          <Text style={styles.label}>Harita Kodu (Opsiyonel)</Text>
          <View style={styles.seedRow}>
            <TextInput
              style={[styles.input, styles.seedInput]}
              value={seedInput}
              onChangeText={setSeedInput}
              placeholder="Bos birak = rastgele"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              maxLength={12}
            />
            <TouchableOpacity style={styles.pasteBtn} onPress={handlePasteSeed}>
              <Text style={styles.pasteBtnText}>Yapistir</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.seedHint}>
            Ayni kodu kullanan oyuncular ayni haritayi görür.
          </Text>

          {/* Basla */}
          <AnimatedButton
            label="Sefere Basla"
            onPress={handleStartGame}
            variant="gold"
            style={{ marginBottom: 12 }}
          />

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => { playSound('click'); setShowSetup(false); }}
          >
            <Text style={styles.backButtonText}>Geri</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Baslik */}
      <View style={styles.titleContainer}>
        <Text style={styles.titleIcon}>{'⚔️'}</Text>
        <Text style={styles.title}>REALM WARS</Text>
        <Text style={styles.subtitle}>Kralliklarin Savasi</Text>
      </View>

      {/* Menu Butonlari */}
      <View style={styles.menuButtons}>
        <AnimatedButton label="Yeni Oyun" onPress={handleNewGame} variant="primary" />

        <View>
          <AnimatedButton
            label="Devam Et"
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
          label="Ayarlar"
          onPress={() => { playSound('click'); onSettings(); }}
          variant="secondary"
        />
      </View>

      {/* Versiyon */}
      <Text style={styles.version}>v1.0.0</Text>
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

  // Title
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

  // Menu Buttons
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

  // Version
  version: {
    position: 'absolute',
    bottom: 24,
    color: COLORS.textMuted,
    fontSize: 12,
  },

  // Setup Panel
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

  // Row selector (bot count + difficulty)
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
  diffDesc: {
    fontSize: FONT.tiny,
    marginBottom: SPACE.lg,
    marginTop: 2,
  },

  // Seed row
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
