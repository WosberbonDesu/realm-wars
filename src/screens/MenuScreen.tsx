import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useGameStore } from '../store/gameStore';
import { COLORS, SPACING, RADIUS, FONT, SHADOW, SHARED } from '../constants/theme';
import { MapTemplate } from '../engine/voronoiMapGenerator';

const TEMPLATE_OPTIONS: { key: MapTemplate; label: string; icon: string }[] = [
  { key: 'highIsland', label: 'Ada', icon: '\u{1F3DD}' },
  { key: 'continent', label: 'Kita', icon: '\u{1F30D}' },
  { key: 'archipelago', label: 'Takimada', icon: '\u{1F30A}' },
  { key: 'pangaea', label: 'Pangaea', icon: '\u{1F5FA}' },
];

export const MenuScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const newGame = useGameStore(s => s.newGame);
  const [seedInput, setSeedInput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<MapTemplate>('highIsland');

  const handleNewGame = () => {
    const seed = seedInput.trim() ? parseInt(seedInput, 10) || hashSeed(seedInput) : undefined;
    newGame(seed, selectedTemplate);
  };

  const handleRandomGame = () => {
    newGame(undefined, selectedTemplate);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.titleMain}>REALM</Text>
        <Text style={styles.titleSub}>WARS</Text>
      </View>

      <Text style={styles.subtitle}>Fantezi Strateji Oyunu</Text>

      {/* Template selector */}
      <View style={styles.templateContainer}>
        <Text style={styles.seedLabel}>Harita Tipi</Text>
        <View style={styles.templateRow}>
          {TEMPLATE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.templateButton,
                selectedTemplate === opt.key && styles.templateButtonActive,
              ]}
              onPress={() => setSelectedTemplate(opt.key)}
            >
              <Text style={styles.templateIcon}>{opt.icon}</Text>
              <Text
                style={[
                  styles.templateLabel,
                  selectedTemplate === opt.key && styles.templateLabelActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

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

      {/* Primary Buttons */}
      <TouchableOpacity style={styles.primaryButton} onPress={handleNewGame}>
        <Text style={styles.primaryButtonText}>YENI OYUN</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={handleRandomGame}>
        <Text style={styles.secondaryButtonText}>RASTGELE HARITA</Text>
      </TouchableOpacity>

      {/* Navigation Buttons */}
      <View style={styles.navRow}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('SaveLoad')}
        >
          <Text style={styles.navButtonText}>Kayitli Haritalar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.navButtonText}>Ayarlar</Text>
        </TouchableOpacity>
      </View>

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
    </SafeAreaView>
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
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
    marginBottom: SPACING.xs,
  },
  titleMain: {
    color: COLORS.gold,
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 6,
  },
  titleSub: {
    color: COLORS.goldLight,
    fontSize: 48,
    fontWeight: '300',
    letterSpacing: 6,
  },
  subtitle: {
    color: COLORS.textMuted,
    ...FONT.body,
    marginBottom: 40,
    letterSpacing: 2,
  },
  templateContainer: {
    width: '100%',
    marginBottom: SPACING.lg,
  },
  templateRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  templateButton: {
    flex: 1,
    backgroundColor: COLORS.surfaceMid,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  templateButtonActive: {
    borderColor: COLORS.goldLight,
    backgroundColor: COLORS.gold,
    borderWidth: 2,
  },
  templateIcon: {
    fontSize: 20,
    marginBottom: SPACING.xs,
  },
  templateLabel: {
    color: COLORS.textMuted,
    ...FONT.small,
    fontWeight: '600',
  },
  templateLabelActive: {
    color: COLORS.textDark,
  },
  seedContainer: {
    width: '100%',
    marginBottom: SPACING.xl,
  },
  seedLabel: {
    color: COLORS.textSecondary,
    ...FONT.caption,
    marginBottom: SPACING.xs,
  },
  seedInput: {
    backgroundColor: COLORS.surfaceMid,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    color: COLORS.textPrimary,
    ...FONT.body,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.goldLight,
    ...SHADOW.button,
  },
  primaryButtonText: {
    color: COLORS.textDark,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: COLORS.surfaceMid,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.md + 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    ...FONT.h2,
    letterSpacing: 1,
  },
  navRow: {
    flexDirection: 'row',
    width: '100%',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  navButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  navButtonText: {
    color: COLORS.gold,
    ...FONT.caption,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  infoContainer: {
    width: '100%',
    backgroundColor: COLORS.surfaceMid,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.card,
  },
  infoText: {
    color: COLORS.textMuted,
    ...FONT.caption,
    textAlign: 'center',
    marginBottom: SPACING.md,
    lineHeight: 18,
  },
  featureList: {
    gap: 2,
  },
  featureItem: {
    color: COLORS.textSecondary,
    ...FONT.small,
    fontFamily: 'monospace',
  },
});
