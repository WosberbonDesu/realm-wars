import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { COLORS, FONT, SPACE, RADIUS } from '../constants/theme';
import { MapTemplate } from '../types/mapEditor';
import { PRESET_MAPS } from '../constants/mapTemplates';
import { loadCustomMaps, deleteCustomMap } from '../services/mapStorage';
import MapPreview from '../components/MapPreview';
import AnimatedButton from '../components/AnimatedButton';
import { playSound } from '../services/soundService';
import { useI18n } from '../i18n/useI18n';

interface Props {
  onSelectMap: (template: MapTemplate) => void;
  onCreateMap: () => void;
  onBack: () => void;
}

export default function MapGalleryScreen({ onSelectMap, onCreateMap, onBack }: Props) {
  const { t } = useI18n();
  const [tab, setTab] = useState<'preset' | 'custom'>('preset');
  const [customMaps, setCustomMaps] = useState<MapTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string>('random');

  useEffect(() => {
    loadCustomMaps().then(setCustomMaps);
  }, []);

  const handleSelect = (template: MapTemplate) => {
    playSound('click');
    setSelectedId(template.id);
  };

  const handleConfirm = () => {
    const allMaps = [...PRESET_MAPS, ...customMaps];
    const selected = allMaps.find(m => m.id === selectedId);
    if (selected) {
      playSound('click');
      onSelectMap(selected);
    }
  };

  const handleDeleteCustom = (id: string, name: string) => {
    Alert.alert(
      'Haritayi Sil',
      `"${name}" haritasini silmek istediginize emin misiniz?`,
      [
        { text: 'Iptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            await deleteCustomMap(id);
            setCustomMaps(prev => prev.filter(m => m.id !== id));
            if (selectedId === id) setSelectedId('random');
          },
        },
      ],
    );
  };

  const maps = tab === 'preset' ? PRESET_MAPS : customMaps;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>{'‹ Geri'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Harita Sec</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, tab === 'preset' && styles.tabActive]}
          onPress={() => setTab('preset')}
        >
          <Text style={[styles.tabText, tab === 'preset' && styles.tabTextActive]}>
            🗺️ Hazir Haritalar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'custom' && styles.tabActive]}
          onPress={() => setTab('custom')}
        >
          <Text style={[styles.tabText, tab === 'custom' && styles.tabTextActive]}>
            ✏️ Benim Haritalarim ({customMaps.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Map grid */}
      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.grid}>
        {maps.map(m => (
          <MapPreview
            key={m.id}
            template={m}
            selected={selectedId === m.id}
            onPress={() => handleSelect(m)}
            onLongPress={tab === 'custom' ? () => handleDeleteCustom(m.id, m.name) : undefined}
          />
        ))}

        {tab === 'custom' && maps.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎨</Text>
            <Text style={styles.emptyTitle}>Henuz harita yok</Text>
            <Text style={styles.emptyDesc}>
              Kendi fantastik haritani olustur! Terrain boyama, dag zincirleri, nehirler ve daha fazlasi.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom actions */}
      <View style={styles.bottomBar}>
        {tab === 'custom' && (
          <AnimatedButton
            label="+ Yeni Harita Olustur"
            onPress={() => { playSound('click'); onCreateMap(); }}
            variant="gold"
            style={{ marginBottom: SPACE.sm }}
          />
        )}
        <AnimatedButton
          label="Bu Haritayla Oyna"
          onPress={handleConfirm}
          variant="primary"
          disabled={!selectedId}
        />
      </View>
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
    paddingTop: 50,
    paddingBottom: SPACE.md,
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
    fontWeight: '600' as any,
  },
  title: {
    color: COLORS.gold,
    fontSize: FONT.h2,
    fontWeight: '900' as any,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.sm,
    gap: SPACE.sm,
    backgroundColor: COLORS.bgLight,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACE.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.textMuted,
    fontSize: FONT.caption,
    fontWeight: '700' as any,
  },
  tabTextActive: {
    color: COLORS.textPrimary,
  },
  scrollArea: {
    flex: 1,
    paddingHorizontal: SPACE.lg,
    paddingTop: SPACE.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  emptyState: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: SPACE.md,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT.h3,
    fontWeight: '700' as any,
    marginBottom: SPACE.sm,
  },
  emptyDesc: {
    color: COLORS.textSecondary,
    fontSize: FONT.caption,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
  bottomBar: {
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.md,
    paddingBottom: 30,
    backgroundColor: COLORS.bgLight,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});
