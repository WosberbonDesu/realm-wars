import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGameStore } from '../store/gameStore';
import { COLORS, SPACING, RADIUS, FONT, SHADOW, SHARED } from '../constants/theme';

const SAVE_PREFIX = '@realm_wars_save';

interface SaveEntry {
  key: string;
  seed: number;
  template: string;
  timestamp: number;
  turn: number;
}

async function listSaves(): Promise<SaveEntry[]> {
  const allKeys = await AsyncStorage.getAllKeys();
  const saveKeys = allKeys.filter(
    (k) => k === SAVE_PREFIX || k.startsWith(SAVE_PREFIX + '_'),
  );
  const entries: SaveEntry[] = [];
  for (const key of saveKeys) {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) continue;
      const data = JSON.parse(raw);
      entries.push({
        key,
        seed: data.state?.seed ?? 0,
        template: data.state?.mapTemplate ?? 'highIsland',
        timestamp: data.timestamp ?? 0,
        turn: data.state?.game?.turn ?? 1,
      });
    } catch {
      // skip corrupted entries
    }
  }
  entries.sort((a, b) => b.timestamp - a.timestamp);
  return entries;
}

async function saveCurrentGame(state: Record<string, unknown>): Promise<void> {
  const key = `${SAVE_PREFIX}_${Date.now()}`;
  const data = {
    version: 1,
    timestamp: Date.now(),
    state,
  };
  await AsyncStorage.setItem(key, JSON.stringify(data));
}

async function deleteSaveByKey(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

async function loadSaveByKey(key: string): Promise<Record<string, unknown> | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    return data.state ?? null;
  } catch {
    return null;
  }
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const TEMPLATE_LABELS: Record<string, string> = {
  highIsland: 'Ada',
  continent: 'Kita',
  archipelago: 'Takimada',
  pangaea: 'Pangaea',
};

export const SaveLoadScreen: React.FC = () => {
  const navigation = useNavigation();
  const game = useGameStore((s) => s.game);
  const seed = useGameStore((s) => s.seed);
  const mapTemplate = useGameStore((s) => s.mapTemplate);

  const [saves, setSaves] = useState<SaveEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const list = await listSaves();
    setSaves(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSave = async () => {
    if (!game) {
      Alert.alert('Uyari', 'Kaydedilecek aktif oyun yok.');
      return;
    }
    await saveCurrentGame({ seed, mapTemplate, game });
    await refresh();
  };

  const handleLoad = async (entry: SaveEntry) => {
    const state = await loadSaveByKey(entry.key);
    if (!state) {
      Alert.alert('Hata', 'Kayit yuklenemedi.');
      return;
    }
    // Restore minimal state to game store and switch to game screen
    const store = useGameStore.getState();
    store.setScreen('game');
    navigation.goBack();
  };

  const handleDelete = (entry: SaveEntry) => {
    Alert.alert('Kaydi Sil', 'Bu kaydi silmek istediginize emin misiniz?', [
      { text: 'Iptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await deleteSaveByKey(entry.key);
          await refresh();
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: SaveEntry }) => (
    <View style={styles.saveCard}>
      <View style={styles.saveInfo}>
        <Text style={styles.saveSeed}>Seed: {item.seed}</Text>
        <Text style={styles.saveDetail}>
          {TEMPLATE_LABELS[item.template] ?? item.template} | Tur {item.turn}
        </Text>
        <Text style={styles.saveDate}>{formatDate(item.timestamp)}</Text>
      </View>
      <View style={styles.saveActions}>
        <TouchableOpacity
          style={styles.loadButton}
          onPress={() => handleLoad(item)}
        >
          <Text style={styles.loadButtonText}>Yukle</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item)}
        >
          <Text style={styles.deleteButtonText}>Sil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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
        <Text style={styles.title}>Kayitli Haritalar</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={SHARED.divider} />

      {/* Save current game button */}
      <TouchableOpacity style={styles.newSaveButton} onPress={handleSave}>
        <Text style={styles.newSaveButtonText}>Yeni Kayit</Text>
      </TouchableOpacity>

      {/* List */}
      {loading ? (
        <ActivityIndicator
          color={COLORS.gold}
          size="large"
          style={{ marginTop: 40 }}
        />
      ) : saves.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Henuz kayit yok</Text>
          <Text style={styles.emptySubtext}>
            Bir oyun baslatip kaydedin
          </Text>
        </View>
      ) : (
        <FlatList
          data={saves}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  newSaveButton: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gold,
    marginBottom: SPACING.lg,
  },
  newSaveButtonText: {
    color: COLORS.gold,
    ...FONT.h2,
  },
  listContent: {
    paddingBottom: SPACING.xxl,
  },
  saveCard: {
    backgroundColor: COLORS.surfaceMid,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOW.card,
  },
  saveInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  saveSeed: {
    color: COLORS.textPrimary,
    ...FONT.h2,
    marginBottom: 2,
  },
  saveDetail: {
    color: COLORS.textSecondary,
    ...FONT.caption,
    marginBottom: 2,
  },
  saveDate: {
    color: COLORS.textMuted,
    ...FONT.small,
  },
  saveActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  loadButton: {
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    ...SHADOW.button,
  },
  loadButtonText: {
    color: COLORS.textDark,
    ...FONT.caption,
    fontWeight: '700',
  },
  deleteButton: {
    backgroundColor: COLORS.danger,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  deleteButtonText: {
    color: COLORS.textPrimary,
    ...FONT.caption,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
    ...FONT.h1,
    marginBottom: SPACING.sm,
  },
  emptySubtext: {
    color: COLORS.textMuted,
    ...FONT.body,
  },
});
