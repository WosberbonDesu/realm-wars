import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { loadSettings, saveSettings } from '../services/saveService';
import { COLORS, SPACING, RADIUS, FONT, SHADOW, SHARED } from '../constants/theme';
import { MapTemplate } from '../engine/voronoiMapGenerator';

const CELL_COUNT_OPTIONS = [2000, 3000, 4000, 5000];

const TEMPLATE_OPTIONS: { key: MapTemplate; label: string }[] = [
  { key: 'highIsland', label: 'Ada' },
  { key: 'continent', label: 'Kita' },
  { key: 'archipelago', label: 'Takimada' },
  { key: 'pangaea', label: 'Pangaea' },
];

interface AppSettings {
  cellCount: number;
  defaultTemplate: MapTemplate;
  showCoordinates: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  cellCount: 4000,
  defaultTemplate: 'highIsland',
  showCoordinates: false,
};

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await loadSettings();
      if (saved) {
        setSettings({
          cellCount: (saved.cellCount as number) ?? DEFAULT_SETTINGS.cellCount,
          defaultTemplate: (saved.defaultTemplate as MapTemplate) ?? DEFAULT_SETTINGS.defaultTemplate,
          showCoordinates: (saved.showCoordinates as boolean) ?? DEFAULT_SETTINGS.showCoordinates,
        });
      }
      setLoaded(true);
    })();
  }, []);

  const update = (patch: Partial<AppSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next as unknown as Record<string, unknown>);
  };

  if (!loaded) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={SHARED.closeBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={SHARED.closeTxt}>X</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Ayarlar</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={SHARED.divider} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Cell Count */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Harita Kalitesi</Text>
          <Text style={styles.sectionDesc}>
            Hucre sayisi arttikca harita detayi artar ama uretim suresi uzar.
          </Text>
          <View style={styles.optionRow}>
            {CELL_COUNT_OPTIONS.map((count) => (
              <TouchableOpacity
                key={count}
                style={[
                  styles.optionButton,
                  settings.cellCount === count && styles.optionButtonActive,
                ]}
                onPress={() => update({ cellCount: count })}
              >
                <Text
                  style={[
                    styles.optionText,
                    settings.cellCount === count && styles.optionTextActive,
                  ]}
                >
                  {count}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={SHARED.divider} />

        {/* Default Template */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Varsayilan Sablon</Text>
          <Text style={styles.sectionDesc}>
            Yeni oyun baslatirken kullanilacak harita sablonu.
          </Text>
          <View style={styles.optionRow}>
            {TEMPLATE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.optionButton,
                  settings.defaultTemplate === opt.key && styles.optionButtonActive,
                ]}
                onPress={() => update({ defaultTemplate: opt.key })}
              >
                <Text
                  style={[
                    styles.optionText,
                    settings.defaultTemplate === opt.key && styles.optionTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={SHARED.divider} />

        {/* Show Coordinates Toggle */}
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Koordinatlari Goster</Text>
              <Text style={styles.sectionDesc}>
                Harita uzerinde hucre koordinatlarini goruntule.
              </Text>
            </View>
            <Switch
              value={settings.showCoordinates}
              onValueChange={(val) => update({ showCoordinates: val })}
              trackColor={{ false: COLORS.borderSolid, true: COLORS.gold }}
              thumbColor={settings.showCoordinates ? COLORS.goldLight : COLORS.textMuted}
            />
          </View>
        </View>

        <View style={SHARED.divider} />

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hakkinda</Text>
          <View style={styles.aboutCard}>
            <Text style={styles.aboutTitle}>Realm Wars</Text>
            <Text style={styles.aboutVersion}>v1.0.0</Text>
            <View style={{ height: SPACING.sm }} />
            <Text style={styles.aboutText}>
              Fantezi strateji oyunu. Azgaar Fantasy Map Generator ilhamli
              prosedural harita uretimi.
            </Text>
            <View style={{ height: SPACING.sm }} />
            <Text style={styles.aboutText}>
              Whittaker biome sistemi, nehir uretimi, kita & ada tespiti,
              fantezi isim ureteci.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  title: {
    color: COLORS.gold,
    ...FONT.h1,
    letterSpacing: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl + 20,
  },
  section: {
    paddingVertical: SPACING.sm,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    ...FONT.h2,
    marginBottom: SPACING.xs,
  },
  sectionDesc: {
    color: COLORS.textMuted,
    ...FONT.caption,
    marginBottom: SPACING.md,
  },
  optionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  optionButton: {
    flex: 1,
    backgroundColor: COLORS.surfaceMid,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionButtonActive: {
    borderColor: COLORS.gold,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 2,
  },
  optionText: {
    color: COLORS.textMuted,
    ...FONT.caption,
  },
  optionTextActive: {
    color: COLORS.gold,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aboutCard: {
    backgroundColor: COLORS.surfaceMid,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.card,
  },
  aboutTitle: {
    color: COLORS.gold,
    ...FONT.h1,
  },
  aboutVersion: {
    color: COLORS.textMuted,
    ...FONT.caption,
    marginTop: 2,
  },
  aboutText: {
    color: COLORS.textSecondary,
    ...FONT.body,
    lineHeight: 20,
  },
});
