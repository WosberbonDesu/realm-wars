import AsyncStorage from '@react-native-async-storage/async-storage';

const SAVE_PREFIX = '@realm_wars_save_';
const SAVE_INDEX_KEY = '@realm_wars_save_index';
const SETTINGS_KEY = '@realm_wars_settings';

export interface SaveMeta {
  id: string;
  name: string;
  seed: number;
  template: string;
  timestamp: number;
  burgCount: number;
  stateCount: number;
}

export interface SaveData {
  version: number;
  meta: SaveMeta;
  state: Record<string, unknown>;
}

// Tüm kayıtları listele
export async function listSaves(): Promise<SaveMeta[]> {
  const raw = await AsyncStorage.getItem(SAVE_INDEX_KEY);
  if (!raw) return [];
  try {
    const index: SaveMeta[] = JSON.parse(raw);
    return index.sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
}

// Yeni kayıt oluştur
export async function saveGame(
  state: Record<string, unknown>,
  meta: Omit<SaveMeta, 'id' | 'timestamp'>,
): Promise<string> {
  const id = `save_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
  const fullMeta: SaveMeta = { ...meta, id, timestamp: Date.now() };

  const data: SaveData = {
    version: 2,
    meta: fullMeta,
    state,
  };

  await AsyncStorage.setItem(SAVE_PREFIX + id, JSON.stringify(data));

  const saves = await listSaves();
  saves.unshift(fullMeta);
  await AsyncStorage.setItem(SAVE_INDEX_KEY, JSON.stringify(saves));

  return id;
}

// Kayıt yükle
export async function loadGame(id: string): Promise<SaveData | null> {
  const raw = await AsyncStorage.getItem(SAVE_PREFIX + id);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SaveData;
  } catch {
    return null;
  }
}

// Kayıt sil
export async function deleteSave(id: string): Promise<void> {
  await AsyncStorage.removeItem(SAVE_PREFIX + id);

  const saves = await listSaves();
  const filtered = saves.filter(s => s.id !== id);
  await AsyncStorage.setItem(SAVE_INDEX_KEY, JSON.stringify(filtered));
}

// Kayıt var mı?
export async function hasSave(): Promise<boolean> {
  const saves = await listSaves();
  return saves.length > 0;
}

// Kayıt adını değiştir
export async function renameSave(id: string, newName: string): Promise<void> {
  const saves = await listSaves();
  const updated = saves.map(s => s.id === id ? { ...s, name: newName } : s);
  await AsyncStorage.setItem(SAVE_INDEX_KEY, JSON.stringify(updated));
}

// Ayarları kaydet
export async function saveSettings(settings: Record<string, unknown>): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// Ayarları yükle
export async function loadSettings(): Promise<Record<string, unknown> | null> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
