import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView,
} from 'react-native';
import { COLORS } from '../constants/theme';
import { saveSettings, loadSettings } from '../services/saveService';

export interface GameSettings {
  mapRadius: number;
  botDifficulty: 'easy' | 'normal' | 'hard';
  showGrid: boolean;
  showFogOfWar: boolean;
  autoEndTurn: boolean;
  animationSpeed: 'slow' | 'normal' | 'fast';
}

const DEFAULT_SETTINGS: GameSettings = {
  mapRadius: 18,
  botDifficulty: 'normal',
  showGrid: true,
  showFogOfWar: true,
  autoEndTurn: false,
  animationSpeed: 'normal',
};

interface Props {
  onBack: () => void;
}

export default function SettingsScreen({ onBack }: Props) {
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    loadSettings().then(saved => {
      if (saved) setSettings({ ...DEFAULT_SETTINGS, ...saved } as GameSettings);
    });
  }, []);

  const updateSetting = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    saveSettings(updated as unknown as Record<string, unknown>);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backText}>Geri</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Ayarlar</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Harita Boyutu */}
        <Text style={styles.sectionTitle}>Harita</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Harita Boyutu</Text>
          <View style={styles.optionRow}>
            {([
              { value: 12, label: 'Kucuk' },
              { value: 18, label: 'Orta' },
              { value: 24, label: 'Buyuk' },
            ] as const).map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.optionBtn,
                  settings.mapRadius === opt.value && styles.optionBtnActive,
                ]}
                onPress={() => updateSetting('mapRadius', opt.value)}
              >
                <Text style={[
                  styles.optionText,
                  settings.mapRadius === opt.value && styles.optionTextActive,
                ]}>
                  {opt.label}
                </Text>
                <Text style={styles.optionSubText}>R:{opt.value}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Bot Zorluğu */}
        <Text style={styles.sectionTitle}>Zorluk</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Bot Zorlugu</Text>
          <View style={styles.optionRow}>
            {([
              { value: 'easy' as const, label: 'Kolay', desc: 'Yavas bot' },
              { value: 'normal' as const, label: 'Normal', desc: 'Dengeli' },
              { value: 'hard' as const, label: 'Zor', desc: 'Agresif bot' },
            ]).map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.optionBtn,
                  settings.botDifficulty === opt.value && styles.optionBtnActive,
                ]}
                onPress={() => updateSetting('botDifficulty', opt.value)}
              >
                <Text style={[
                  styles.optionText,
                  settings.botDifficulty === opt.value && styles.optionTextActive,
                ]}>
                  {opt.label}
                </Text>
                <Text style={styles.optionSubText}>{opt.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Animasyon Hızı */}
        <Text style={styles.sectionTitle}>Gorsel</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Animasyon Hizi</Text>
          <View style={styles.optionRow}>
            {([
              { value: 'slow' as const, label: 'Yavas' },
              { value: 'normal' as const, label: 'Normal' },
              { value: 'fast' as const, label: 'Hizli' },
            ]).map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.optionBtn,
                  settings.animationSpeed === opt.value && styles.optionBtnActive,
                ]}
                onPress={() => updateSetting('animationSpeed', opt.value)}
              >
                <Text style={[
                  styles.optionText,
                  settings.animationSpeed === opt.value && styles.optionTextActive,
                ]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Toggle'lar */}
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Hex Izgara</Text>
              <Text style={styles.toggleDesc}>Hex kenarlarini goster</Text>
            </View>
            <Switch
              value={settings.showGrid}
              onValueChange={(v) => updateSetting('showGrid', v)}
              trackColor={{ false: COLORS.border, true: COLORS.primaryDark }}
              thumbColor={settings.showGrid ? COLORS.primary : COLORS.textMuted}
            />
          </View>

          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Savas Sisi</Text>
              <Text style={styles.toggleDesc}>Fog of war acik/kapali</Text>
            </View>
            <Switch
              value={settings.showFogOfWar}
              onValueChange={(v) => updateSetting('showFogOfWar', v)}
              trackColor={{ false: COLORS.border, true: COLORS.primaryDark }}
              thumbColor={settings.showFogOfWar ? COLORS.primary : COLORS.textMuted}
            />
          </View>
        </View>

        {/* Oyun */}
        <Text style={styles.sectionTitle}>Oyun</Text>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Otomatik Tur Bitir</Text>
              <Text style={styles.toggleDesc}>Aksiyon kalmayinca turu bitir</Text>
            </View>
            <Switch
              value={settings.autoEndTurn}
              onValueChange={(v) => updateSetting('autoEndTurn', v)}
              trackColor={{ false: COLORS.border, true: COLORS.primaryDark }}
              thumbColor={settings.autoEndTurn ? COLORS.primary : COLORS.textMuted}
            />
          </View>
        </View>

        {/* Sıfırla */}
        <TouchableOpacity
          style={styles.resetBtn}
          onPress={() => {
            setSettings(DEFAULT_SETTINGS);
            saveSettings(DEFAULT_SETTINGS as unknown as Record<string, unknown>);
          }}
        >
          <Text style={styles.resetText}>Varsayilana Sifirla</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 14,
    backgroundColor: COLORS.bgLight,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  title: {
    color: COLORS.gold,
    fontSize: 20,
    fontWeight: '800',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: COLORS.bgLight,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  label: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
  optionBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryDark,
  },
  optionText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  optionTextActive: {
    color: COLORS.textPrimary,
  },
  optionSubText: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 8,
  },
  toggleLabel: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  toggleDesc: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  resetBtn: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.red,
    alignItems: 'center',
  },
  resetText: {
    color: COLORS.red,
    fontSize: 14,
    fontWeight: '600',
  },
});
