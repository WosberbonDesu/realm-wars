import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView,
} from 'react-native';
import { COLORS, FONT, SPACE, RADIUS } from '../constants/theme';
import { saveSettings, loadSettings, deleteSave, hasSave } from '../services/saveService';
import { soundService } from '../services/soundService';
import { playSound } from '../services/soundService';
import AnimatedButton from '../components/AnimatedButton';
import { useI18n } from '../i18n/useI18n';
import { LANGUAGES, LangCode, setLanguage, getLanguage } from '../i18n';

export interface GameSettings {
  mapRadius: number;
  botDifficulty: 'easy' | 'normal' | 'hard';
  showGrid: boolean;
  showFogOfWar: boolean;
  autoEndTurn: boolean;
  animationSpeed: 'slow' | 'normal' | 'fast';
  hapticEnabled: boolean;
  soundEnabled: boolean;
  language: LangCode;
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
  language: 'tr',
};

interface Props {
  onBack: () => void;
}

export default function SettingsScreen({ onBack }: Props) {
  const { t } = useI18n();
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [savedExists, setSavedExists] = useState(false);

  useEffect(() => {
    loadSettings().then(saved => {
      if (saved) {
        const merged = { ...DEFAULT_SETTINGS, ...saved } as GameSettings;
        setSettings(merged);
        soundService.setHapticEnabled(merged.hapticEnabled);
        soundService.setSoundEnabled(merged.soundEnabled);
        if (merged.language) setLanguage(merged.language);
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
    if (key === 'language') setLanguage(value as LangCode);
  };

  const handleDeleteSave = async () => {
    await deleteSave();
    setSavedExists(false);
  };

  const difficultyInfo = {
    easy:   { color: COLORS.green, descKey: 'setup.easyDesc' },
    normal: { color: COLORS.primaryLight, descKey: 'setup.normalDesc' },
    hard:   { color: COLORS.red, descKey: 'setup.hardDesc' },
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>{'‹ '}{t('settings.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('settings.title')}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── DİL ── */}
        <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
        <View style={styles.card}>
          <Text style={styles.label}>{t('settings.selectLang')}</Text>
          <View style={styles.langGrid}>
            {(Object.keys(LANGUAGES) as LangCode[]).map(code => {
              const lang = LANGUAGES[code];
              const isActive = settings.language === code;
              return (
                <TouchableOpacity
                  key={code}
                  style={[styles.langBtn, isActive && styles.langBtnActive]}
                  onPress={() => updateSetting('language', code)}
                >
                  <Text style={styles.langFlag}>{lang.flag}</Text>
                  <Text style={[styles.langName, isActive && styles.langNameActive]}>
                    {lang.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── SES & TİTRESİM ── */}
        <Text style={styles.sectionTitle}>{t('settings.sound')}</Text>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>{t('settings.haptic')}</Text>
              <Text style={styles.toggleDesc}>{t('settings.hapticDesc')}</Text>
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
              <Text style={styles.toggleLabel}>{t('settings.soundFx')}</Text>
              <Text style={styles.toggleDesc}>{t('settings.soundFxDesc')}</Text>
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
        <Text style={styles.sectionTitle}>{t('settings.map')}</Text>
        <View style={styles.card}>
          <Text style={styles.label}>{t('settings.defaultSize')}</Text>
          <View style={styles.optionRow}>
            {([
              { value: 12, key: 'setup.mapSmall', desc: '~200 hex' },
              { value: 18, key: 'setup.mapMedium', desc: '~600 hex' },
              { value: 24, key: 'setup.mapLarge', desc: '~1200 hex' },
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
                  {t(opt.key)}
                </Text>
                <Text style={styles.optionSubText}>{opt.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── ZORLUK ── */}
        <Text style={styles.sectionTitle}>{t('settings.difficultySection')}</Text>
        <View style={styles.card}>
          <Text style={styles.label}>{t('settings.defaultDifficulty')}</Text>
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
                  {t(`setup.${d}`)}
                </Text>
                <Text style={styles.optionSubText}>{t(difficultyInfo[d].descKey)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── GÖRSEL ── */}
        <Text style={styles.sectionTitle}>{t('settings.visual')}</Text>
        <View style={styles.card}>
          <Text style={styles.label}>{t('settings.animSpeed')}</Text>
          <View style={styles.optionRow}>
            {([
              { value: 'slow' as const, key: 'settings.slow' },
              { value: 'normal' as const, key: 'setup.normal' },
              { value: 'fast' as const, key: 'settings.fast' },
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
                  {t(opt.key)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.toggleRow, { marginTop: SPACE.md }]}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>{t('settings.hexGrid')}</Text>
              <Text style={styles.toggleDesc}>{t('settings.hexGridDesc')}</Text>
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
              <Text style={styles.toggleLabel}>{t('settings.fogOfWar')}</Text>
              <Text style={styles.toggleDesc}>{t('settings.fogOfWarDesc')}</Text>
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
        <Text style={styles.sectionTitle}>{t('settings.gameSection')}</Text>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>{t('settings.autoEndTurn')}</Text>
              <Text style={styles.toggleDesc}>{t('settings.autoEndTurnDesc')}</Text>
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
        <Text style={styles.sectionTitle}>{t('settings.dataSection')}</Text>
        <View style={styles.card}>
          <View style={styles.dataRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>{t('settings.savedGame')}</Text>
              <Text style={styles.toggleDesc}>
                {savedExists ? t('settings.saveExists') : t('settings.noSave')}
              </Text>
            </View>
            {savedExists && (
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteSave}>
                <Text style={styles.deleteBtnText}>{t('settings.delete')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Sıfırla */}
        <AnimatedButton
          label={t('settings.resetAll')}
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
  langGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.sm,
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    paddingVertical: SPACE.md,
    paddingHorizontal: SPACE.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
    minWidth: '45%' as any,
  },
  langBtnActive: {
    borderColor: COLORS.gold,
    backgroundColor: COLORS.primaryDark,
  },
  langFlag: {
    fontSize: 22,
  },
  langName: {
    color: COLORS.textMuted,
    fontSize: FONT.body,
    fontWeight: FONT.semi,
  },
  langNameActive: {
    color: COLORS.gold,
  },
  versionText: {
    color: COLORS.textMuted,
    fontSize: FONT.tiny,
    textAlign: 'center',
    marginTop: SPACE.xl,
  },
});
