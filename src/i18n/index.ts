/**
 * Lightweight i18n system — no external deps.
 *
 * Usage:
 *   import { t, setLanguage, getLanguage } from '../i18n';
 *   t('menu.newGame')  →  "Yeni Oyun" | "New Game" | ...
 *   t('turn.counter', { n: 5 })  →  "Tur 5"
 */

import { tr } from './tr';
import { en } from './en';
import { de } from './de';
import { es } from './es';

export type LangCode = 'tr' | 'en' | 'de' | 'es';

export const LANGUAGES: Record<LangCode, { name: string; flag: string }> = {
  tr: { name: 'Türkçe', flag: '🇹🇷' },
  en: { name: 'English', flag: '🇬🇧' },
  de: { name: 'Deutsch', flag: '🇩🇪' },
  es: { name: 'Español', flag: '🇪🇸' },
};

const packs: Record<LangCode, Record<string, string>> = { tr, en, de, es };

let _lang: LangCode = 'tr';
let _dict: Record<string, string> = tr;

// Listeners for language changes
type Listener = () => void;
const listeners: Listener[] = [];

export function setLanguage(code: LangCode) {
  _lang = code;
  _dict = packs[code] ?? tr;
  listeners.forEach(fn => fn());
}

export function getLanguage(): LangCode {
  return _lang;
}

export function onLanguageChange(fn: Listener): () => void {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

/**
 * Translate a key, with optional interpolation.
 *   t('battle.loss', { pct: 42 })  →  "Kayıp: %42"
 *
 * Interpolation tokens are {key} in the string.
 * Falls back to Turkish, then to the raw key.
 */
export function t(key: string, params?: Record<string, string | number>): string {
  let str = _dict[key] ?? tr[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return str;
}
