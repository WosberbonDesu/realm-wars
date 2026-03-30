import AsyncStorage from '@react-native-async-storage/async-storage';
import { MapTemplate } from '../types/mapEditor';

const MAPS_KEY = '@realm_wars_custom_maps';

export async function saveCustomMap(template: MapTemplate): Promise<void> {
  const maps = await loadCustomMaps();
  const idx = maps.findIndex(m => m.id === template.id);
  if (idx >= 0) {
    maps[idx] = template;
  } else {
    maps.push(template);
  }
  await AsyncStorage.setItem(MAPS_KEY, JSON.stringify({ version: 1, maps }));
}

export async function loadCustomMaps(): Promise<MapTemplate[]> {
  try {
    const raw = await AsyncStorage.getItem(MAPS_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return data.maps ?? [];
  } catch {
    return [];
  }
}

export async function deleteCustomMap(id: string): Promise<void> {
  const maps = await loadCustomMaps();
  const filtered = maps.filter(m => m.id !== id);
  await AsyncStorage.setItem(MAPS_KEY, JSON.stringify({ version: 1, maps: filtered }));
}

export async function getMapById(id: string): Promise<MapTemplate | null> {
  const maps = await loadCustomMaps();
  return maps.find(m => m.id === id) ?? null;
}
