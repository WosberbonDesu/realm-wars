import AsyncStorage from '@react-native-async-storage/async-storage';

const SAVE_KEY = '@realm_wars_save';
const SETTINGS_KEY = '@realm_wars_settings';

export interface SaveData {
  version: number;
  timestamp: number;
  state: Record<string, unknown>;
}

export async function saveGame(state: Record<string, unknown>): Promise<void> {
  const data: SaveData = {
    version: 1,
    timestamp: Date.now(),
    state,
  };
  await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

export async function loadGame(): Promise<SaveData | null> {
  const raw = await AsyncStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SaveData;
  } catch {
    return null;
  }
}

export async function deleteSave(): Promise<void> {
  await AsyncStorage.removeItem(SAVE_KEY);
}

export async function hasSave(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(SAVE_KEY);
  return raw !== null;
}

export async function saveSettings(settings: Record<string, unknown>): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function loadSettings(): Promise<Record<string, unknown> | null> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
