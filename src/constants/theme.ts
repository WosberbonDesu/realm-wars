import { StyleSheet } from 'react-native';

// === COLOR PALETTE ===
export const COLORS = {
  // Backgrounds
  bg: '#0F1923',
  bgLight: '#1A2332',
  bgPanel: '#1A2332E6',
  bgOverlay: '#00000088',

  // Primary
  primary: '#4A90D9',
  primaryLight: '#6AADE6',
  primaryDark: '#2E6BAD',

  // Accent
  gold: '#D4A843',
  goldLight: '#F0C866',
  red: '#D94A4A',
  green: '#4AD97A',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A0B0C0',
  textMuted: '#607080',

  // Borders
  border: '#2A3A4A',
  borderLight: '#3A4A5A',

  // Selection
  selection: '#FFD700',
  selectionFill: '#FFD70033',

  // Move/Attack highlights
  moveHighlight: '#4AD97A44',
  attackHighlight: '#D94A4A44',

  // Fog
  fog: '#0F1923',
  fogExplored: '#0F1923AA',
} as const;

// === RESOURCE COLORS ===
export const RESOURCE_COLORS = {
  gold: '#FFD700',
  iron: '#A0A0B0',
  food: '#7EC850',
  wood: '#8B6914',
  stone: '#9A9A9A',
} as const;

// === RESOURCE ICONS (text-based for now) ===
export const RESOURCE_ICONS = {
  gold: '\u{1FA99}',
  iron: '\u{2699}',
  food: '\u{1F33E}',
  wood: '\u{1FAB5}',
  stone: '\u{1FAA8}',
} as const;

// === COMMON STYLES ===
export const SHARED = StyleSheet.create({
  panelBg: {
    backgroundColor: COLORS.bgPanel,
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  centerAll: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  textTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  textBody: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  textSmall: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
});
