/**
 * Sound & Haptic Service
 *
 * Vibration: works on all platforms, zero extra deps.
 * expo-av: add "expo-av" to package.json and drop MP3/WAV files into
 *          assets/sounds/ then uncomment the relevant sections below.
 *
 * To add real sounds later:
 *   1. npm install expo-av
 *   2. Put sound files in assets/sounds/ (e.g. click.wav, battle.wav, ...)
 *   3. Uncomment the expo-av imports and ASSET_MAP entries
 */

import { Vibration } from 'react-native';

// ── Sound keys ────────────────────────────────────────────────────────────────

export type SoundKey =
  | 'click'      // UI tap / menu button
  | 'build'      // Building placed
  | 'train'      // Units trained
  | 'move'       // Army moved (no battle)
  | 'battle'     // Battle started / result
  | 'victory'    // Player wins
  | 'defeat'     // Player loses
  | 'turnStart'  // New turn begins
  | 'error'      // Invalid action
  | 'research'   // Tech research started
  | 'event';     // Random event triggered

// ── Vibration patterns (ms) ───────────────────────────────────────────────────

// [wait, vibrate, wait, vibrate, ...]  (first entry is always wait)
const PATTERNS: Record<SoundKey, number | number[]> = {
  click:     [0, 25],
  build:     [0, 40, 30, 40],
  train:     [0, 50],
  move:      [0, 30],
  battle:    [0, 80, 40, 150],
  victory:   [0, 100, 50, 100, 50, 200],
  defeat:    [0, 300],
  turnStart: [0, 60, 30, 60],
  error:     [0, 40, 20, 40, 20, 40],
  research:  [0, 50, 30, 80],
  event:     [0, 70, 40, 70],
};

// ── Settings ─────────────────────────────────────────────────────────────────

let _hapticEnabled = true;
let _soundEnabled  = true; // reserved for expo-av integration

export const soundService = {
  setHapticEnabled(enabled: boolean) {
    _hapticEnabled = enabled;
  },
  setSoundEnabled(enabled: boolean) {
    _soundEnabled = enabled;
  },
  isHapticEnabled: () => _hapticEnabled,
  isSoundEnabled:  () => _soundEnabled,

  /**
   * Play a sound and/or haptic pattern for the given key.
   * Silent no-op if both are disabled or vibration is not supported.
   */
  play(key: SoundKey) {
    if (_hapticEnabled) {
      const pattern = PATTERNS[key];
      if (typeof pattern === 'number') {
        Vibration.vibrate(pattern);
      } else {
        Vibration.vibrate(pattern);
      }
    }

    // expo-av placeholder — uncomment when real sound files are added:
    // if (_soundEnabled && _sounds[key]) {
    //   _sounds[key]?.replayAsync().catch(() => {});
    // }
  },

  /** Stop all ongoing vibration */
  cancel() {
    Vibration.cancel();
  },
};

// ── Convenience hook-friendly wrapper ────────────────────────────────────────

export function playSound(key: SoundKey) {
  soundService.play(key);
}
