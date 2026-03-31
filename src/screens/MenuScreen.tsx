import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { COLORS } from '../constants/theme';

export const MenuScreen: React.FC = () => {
  const newGame = useGameStore(s => s.newGame);
  const [seedInput, setSeedInput] = useState('');

  const handleNewGame = () => {
    const seed = seedInput.trim() ? parseInt(seedInput, 10) || hashSeed(seedInput) : undefined;
    newGame(seed);
  };

  const handleRandomGame = () => {
    newGame();
  };

  return (
    <View style={styles.container}>
      {/* Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.titleMain}>REALM</Text>
        <Text style={styles.titleSub}>WARS</Text>
      </View>

      <Text style={styles.subtitle}>Fantezi Strateji Oyunu</Text>

      {/* Seed input */}
      <View style={styles.seedContainer}>
        <Text style={styles.seedLabel}>Harita Seed (istege bagli)</Text>
        <TextInput
          style={styles.seedInput}
          value={seedInput}
          onChangeText={setSeedInput}
          placeholder="ornek: 42 veya bir kelime"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="default"
        />
      </View>

      {/* Buttons */}
      <TouchableOpacity style={styles.primaryButton} onPress={handleNewGame}>
        <Text style={styles.primaryButtonText}>YENI OYUN</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={handleRandomGame}>
        <Text style={styles.secondaryButtonText}>RASTGELE HARITA</Text>
      </TouchableOpacity>

      {/* Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          Azgaar Fantasy Map Generator ilhamli{'\n'}
          prosedural harita uretimi
        </Text>
        <View style={styles.featureList}>
          <FeatureItem text="Whittaker biome sistemi" />
          <FeatureItem text="Nehir uretimi (flux accumulation)" />
          <FeatureItem text="Kita & ada tespiti" />
          <FeatureItem text="Fantezi isim ureteci" />
          <FeatureItem text="10 farkli arazi tipi" />
        </View>
      </View>
    </View>
  );
};

const FeatureItem: React.FC<{ text: string }> = ({ text }) => (
  <Text style={styles.featureItem}>{'  >'} {text}</Text>
);

function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
    marginBottom: 4,
  },
  titleMain: {
    color: COLORS.gold,
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 6,
  },
  titleSub: {
    color: COLORS.primaryLight,
    fontSize: 48,
    fontWeight: '300',
    letterSpacing: 6,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginBottom: 40,
    letterSpacing: 2,
  },
  seedContainer: {
    width: '100%',
    marginBottom: 20,
  },
  seedLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 6,
  },
  seedInput: {
    backgroundColor: COLORS.bgLight,
    borderRadius: 12,
    padding: 14,
    color: COLORS.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
  },
  primaryButtonText: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: COLORS.bgLight,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 30,
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  infoContainer: {
    width: '100%',
    backgroundColor: COLORS.bgLight,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoText: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 18,
  },
  featureList: {
    gap: 2,
  },
  featureItem: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontFamily: 'monospace',
  },
});
