import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput, Dimensions,
} from 'react-native';
import { COLORS } from '../constants/theme';
import { useGameStore } from '../store/gameStore';
import { hasSave, getSaveInfo, loadSettings } from '../services/saveService';
import AnimatedButton from '../components/AnimatedButton';

interface Props {
  onStartGame: () => void;
  onSettings: () => void;
}

export default function MainMenuScreen({ onStartGame, onSettings }: Props) {
  const [playerName, setPlayerName] = useState('Komutan');
  const [botCount, setBotCount] = useState(2);
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
    setShowSetup(true);
  };

  const handleContinue = async () => {
    const success = await loadSavedGame();
    if (success) onStartGame();
  };

  const handleStartGame = () => {
    initGame(playerName, botCount);
    onStartGame();
  };

  if (showSetup) {
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
          <View style={styles.botSelector}>
            {[1, 2, 3].map(n => (
              <TouchableOpacity
                key={n}
                style={[
                  styles.botOption,
                  botCount === n && styles.botOptionActive,
                ]}
                onPress={() => setBotCount(n)}
              >
                <Text style={[
                  styles.botOptionText,
                  botCount === n && styles.botOptionTextActive,
                ]}>
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Basla */}
          <AnimatedButton
            label="Sefere Basla"
            onPress={handleStartGame}
            variant="gold"
            style={{ marginBottom: 12 }}
          />

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setShowSetup(false)}
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
        <Text style={styles.titleIcon}>{'   '}</Text>
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
              {saveInfo.playerName} - Tur {saveInfo.turn}
            </Text>
          )}
        </View>

        <AnimatedButton label="Ayarlar" onPress={onSettings} variant="secondary" />
      </View>

      {/* Versiyon */}
      <Text style={styles.version}>v1.0.0</Text>
    </View>
  );
}

const { width, height } = Dimensions.get('window');

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
    maxWidth: 320,
    backgroundColor: COLORS.bgLight,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  setupTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.gold,
    textAlign: 'center',
    marginBottom: 24,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: COLORS.textPrimary,
    fontSize: 16,
    marginBottom: 20,
  },

  // Bot Selector
  botSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  botOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
  botOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryDark,
  },
  botOptionText: {
    color: COLORS.textMuted,
    fontSize: 18,
    fontWeight: '700',
  },
  botOptionTextActive: {
    color: COLORS.textPrimary,
  },

  backButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  backButtonText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
});
