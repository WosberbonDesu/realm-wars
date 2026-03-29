/**
 * useSettings — reads game settings from AsyncStorage and keeps them in sync.
 * Components use this to get the CURRENT settings (not stale save data).
 */
import { useState, useEffect } from 'react';
import { loadSettings, saveSettings } from './saveService';
import type { GameSettings } from '../screens/SettingsScreen';

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

let _cached: GameSettings | null = null;
const _listeners: (() => void)[] = [];

/** Load settings once (cached after first call) */
export async function getSettings(): Promise<GameSettings> {
  if (_cached) return _cached;
  const saved = await loadSettings();
  _cached = saved ? { ...DEFAULT_SETTINGS, ...saved } as GameSettings : { ...DEFAULT_SETTINGS };
  return _cached;
}

/** Update a single setting and notify listeners */
export async function updateSettingValue<K extends keyof GameSettings>(
  key: K,
  value: GameSettings[K],
) {
  const current = await getSettings();
  const updated = { ...current, [key]: value };
  _cached = updated;
  await saveSettings(updated as unknown as Record<string, unknown>);
  _listeners.forEach(fn => fn());
}

/** React hook — re-renders when settings change */
export function useSettings(): GameSettings {
  const [settings, setSettings] = useState<GameSettings>(_cached ?? DEFAULT_SETTINGS);

  useEffect(() => {
    // Load on mount
    getSettings().then(s => setSettings(s));
    // Listen for changes
    const listener = () => {
      if (_cached) setSettings({ ..._cached });
    };
    _listeners.push(listener);
    return () => {
      const idx = _listeners.indexOf(listener);
      if (idx >= 0) _listeners.splice(idx, 1);
    };
  }, []);

  return settings;
}
