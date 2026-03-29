import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView,
} from 'react-native';
import { COLORS, FONT, SPACE, RADIUS } from '../constants/theme';
import { saveSettings, loadSettings, deleteSave, hasSave } from '../services/saveService';
import { soundService } from '../services/soundService';
import { playSound } from '../services/soundService';
import AnimatedButton from '../components/AnimatedButton';

export interface GameSettings {
  mapRadius: number;
  botDifficulty: 'easy' | 'normal' | 'hard';
  showGrid: boolean;
  showFogOfWar: boolean;
  autoEndTurn: boolean;
  animationSpeed: 'slow' | 'normal' | 'fast';
  hapticEnabled: boolean;
  soundEnabled: boolean;
}

const DEFAULT_SETTINGS: GameSettings = {
  mapRadius: 18,
  botDifficulty: 'normal',
  showGrid: true,
  showFogOfWar: true,
  autoEndTurn: false,
  animationSpeed: 'normal',
  hapticEnabled: true,
  soundEnabled: true,
};

interface Props {
  onBack: () => void;
}

export default function SettingsScreen({ onBack }: Props) {
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [savedExists, setSavedExists] = useState(false);

  useEffect(() => {
    loadSettings().then(saved => {
      if (saved) {
        const merged = { ...DEFAULT_SETTINGS, ...saved } as GameSettings;
        setSettings(merged);
        soundService.setHapticEnabled(merged.hapticEnabled);
        soundService.setSoundEnabled(merged.soundEnabled);
      }
    });
    hasSave().then(setSavedExists);
  }, []);

  const updateSetting = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    playSound('click');
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    saveSettings(updated as unknown as Record<string, unknown>);

    // Apply immediately
    if (key === 'hapticEnabled') soundService.setHapticEnabled(value as boolean);
    if (key === 'soundEnabled') soundService.setSoundEnabled(value as boolean);
  };

  const handleDeleteSave = async () => {
    await deleteSave();
    setSavedExists(false);
  };

  const difficultyInfo = {
    easy:   { color: COLORS.green, desc: 'Yeni baslayanlar icin' },
    normal: { color: COLORS.primaryLight, desc: 'Dengeli bir macera' },
    hard:   { color: COLORS.red, desc: 'Deneyimliler icin' },
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>{'‹ Geri'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Ayarlar</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── SES & TİTRESİM ── */}
        <Text style={styles.sectionTitle}>Ses & Titresim</Text>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Titresim</Text>
              <Text style={styles.toggleDesc}>Buton ve aksiyon geri bildirimi</Text>
            </View>
            <Switch
              value={settings.hapticEnabled}
              onValueChange={(v) => updateSetting('hapticEnabled', v)}
              trackColor={{ false: COLORS.border, true: COLORS.primaryDark }}
              thumbColor={settings.hapticEnabled ? COLORS.primary : COLORS.textMuted}
            />
          </View>

          <View style={[styles.toggleRow, { borderTopWidth: 1 }]}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Ses Efektleri</Text>
              <Text style={styles.toggleDesc}>Savas, bina kurma, tur sesleri</Text>
            </View>
            <Switch
              value={settings.soundEnabled}
              onValueChange={(v) => updateSetting('soundEnabled', v)}
              trackColor={{ false: COLORS.border, true: COLORS.primaryDark }}
              thumbColor={settings.soundEnabled ? COLORS.primary : COLORS.textMuted}
            />
          </View>
        </View>

        {/* ── HARİTA ── */}
        <Text style={styles.sectionTitle}>Harita</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Varsayilan Boyut</Text>
          <View style={styles.optionRow}>
            {([
              { value: 12, label: 'Kucuk', desc: '~200 hex' },
              { value: 18, label: 'Orta', desc: '~600 hex' },
              { value: 24, label: 'Buyuk', desc: '~1200 hex' },
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
                <Text style={styles.optionSubText}>{opt.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── ZORLUK ── */}
        <Text style={styles.sectionTitle}>Zorluk</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Varsayilan Bot Zorlugu</Text>
          <View style={styles.optionRow}>
            {(['easy', 'normal', 'hard'] as const).map(d => (
              <TouchableOpacity
                key={d}
                style={[
                  styles.optionBtn,
                  settings.botDifficulty === d && {
                    ...styles.optionBtnActive,
                    borderColor: difficultyInfo[d].color,
                  },
                ]}
                onPress={() => updateSetting('botDifficulty', d)}
              >
                <Text style={[
                  styles.optionText,
                  settings.botDifficulty === d && { color: difficultyInfo[d].color },
                ]}>
                  {d === 'easy' ? 'Kolay' : d === 'normal' ? 'Normal' : 'Zor'}
                </Text>
                <Text style={styles.optionSubText}>{difficultyInfo[d].desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── GÖRSEL ── */}
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

          <View style={[styles.toggleRow, { marginTop: SPACE.md }]}>
            <View style={styles.toggleInfo}>
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

          <View style={[styles.toggleRow, { borderTopWidth: 1 }]}>
            <View style={styles.toggleInfo}>
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

        {/* ── OYUN ── */}
        <Text style={styles.sectionTitle}>Oyun</Text>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
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

        {/* ── VERİ YÖNETİMİ ── */}
        <Text style={styles.sectionTitle}>Veri</Text>
        <View style={styles.card}>
          <View style={styles.dataRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Kayitli Oyun</Text>
              <Text style={styles.toggleDesc}>
                {savedExists ? 'Kayitli bir oyun mevcut' : 'Kayit bulunamadi'}
              </Text>
            </View>
            {savedExists && (
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteSave}>
                <Text style={styles.deleteBtnText}>Sil</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Sıfırla */}
        <AnimatedButton
          label="Tum Ayarlari Sifirla"
          onPress={() => {
            const reset = { ...DEFAULT_SETTINGS };
            setSettings(reset);
            saveSettings(reset as unknown as Record<string, unknown>);
            soundService.setHapticEnabled(reset.hapticEnabled);
            soundService.setSoundEnabled(reset.soundEnabled);
          }}
          variant="danger"
          style={{ marginTop: SPACE.xl }}
        />

        {/* Versiyon */}
        <Text style={styles.versionText}>Realm Wars v1.0.0</Text>

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
    paddingHorizontal: SPACE.lg,
    paddingTop: 48,
    paddingBottom: 14,
    backgroundColor: COLORS.bgLight,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    paddingVertical: SPACE.xs,
    paddingRight: SPACE.md,
  },
  backText: {
    color: COLORS.textSecondary,
    fontSize: FONT.body,
    fontWeight: FONT.semi,
  },
  title: {
    color: COLORS.gold,
    fontSize: FONT.h2,
    fontWeight: FONT.black,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACE.lg,
  },
  sectionTitle: {
    color: COLORS.textMuted,
    fontSize: FONT.tiny,
    fontWeight: FONT.bold,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: SPACE.xl,
    marginBottom: SPACE.sm,
    marginLeft: SPACE.xs,
  },
  card: {
    backgroundColor: COLORS.bgLight,
    borderRadius: RADIUS.lg,
    padding: SPACE.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  label: {
    color: COLORS.textPrimary,
    fontSize: FONT.body,
    fontWeight: FONT.semi,
    marginBottom: SPACE.md,
  },
  optionRow: {
    flexDirection: 'row',
    gap: SPACE.sm,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: SPACE.md,
    borderRadius: RADIUS.md,
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
    fontSize: FONT.caption,
    fontWeight: FONT.bold,
  },
  optionTextActive: {
    color: COLORS.textPrimary,
  },
  optionSubText: {
    color: COLORS.textMuted,
    fontSize: FONT.tiny,
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACE.md,
    borderTopColor: COLORS.border,
  },
  toggleInfo: {
    flex: 1,
    marginRight: SPACE.md,
  },
  toggleLabel: {
    color: COLORS.textPrimary,
    fontSize: FONT.body,
    fontWeight: FONT.semi,
  },
  toggleDesc: {
    color: COLORS.textMuted,
    fontSize: FONT.tiny,
    marginTop: 2,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deleteBtn: {
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.red,
  },
  deleteBtnText: {
    color: COLORS.red,
    fontSize: FONT.caption,
    fontWeight: FONT.bold,
  },
  versionText: {
    color: COLORS.textMuted,
    fontSize: FONT.tiny,
    textAlign: 'center',
    marginTop: SPACE.xl,
  },
});
