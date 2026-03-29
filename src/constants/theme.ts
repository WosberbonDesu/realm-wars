import { StyleSheet, Platform } from 'react-native';

// === COLOR PALETTE ===
export const COLORS = {
  // Backgrounds
  bg: '#0F1923',
  bgLight: '#1A2332',
  bgCard: '#182230',
  bgPanel: '#1A2332E6',
  bgOverlay: '#00000099',
  bgElevated: '#1E2D3D',

  // Primary
  primary: '#4A90D9',
  primaryLight: '#6AADE6',
  primaryDark: '#2E6BAD',
  primaryMuted: '#4A90D920',

  // Accent
  gold: '#D4A843',
  goldLight: '#F0C866',
  goldMuted: '#D4A84320',
  red: '#D94A4A',
  redMuted: '#D94A4A20',
  green: '#4AD97A',
  greenMuted: '#4AD97A20',
  purple: '#8B6AD9',
  purpleMuted: '#8B6AD920',
  orange: '#D9884A',

  // Text
  textPrimary: '#EAEEF2',
  textSecondary: '#8A9BB0',
  textMuted: '#506070',
  textInverse: '#0F1923',

  // Borders
  border: '#243040',
  borderLight: '#2E4050',
  borderAccent: '#3A5060',

  // Selection
  selection: '#FFD700',
  selectionFill: '#FFD70033',

  // Move/Attack highlights
  moveHighlight: '#4AD97A44',
  attackHighlight: '#D94A4A44',

  // Fog
  fog: '#0F1923',
  fogExplored: '#0F1923AA',

  // Action button semantic colors
  actionBuild: '#2A4A30',
  actionBuildBorder: '#3A6A40',
  actionTrain: '#2A3A4A',
  actionTrainBorder: '#3A5A7A',
  actionUpgrade: '#4A3A20',
  actionUpgradeBorder: '#6A5A30',
  actionMove: '#2A3050',
  actionMoveBorder: '#3A4A7A',
  actionDanger: '#3A2020',
  actionDangerBorder: '#6A3030',
} as const;

// === TYPOGRAPHY ===
export const FONT = {
  // Sizes
  h1: 28,
  h2: 20,
  h3: 16,
  body: 14,
  caption: 12,
  tiny: 10,

  // Weights
  black: '900' as const,
  bold: '700' as const,
  semi: '600' as const,
  regular: '400' as const,
} as const;

// === SPACING ===
export const SPACE = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

// === RADIUS ===
export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  full: 99,
} as const;

// === RESOURCE COLORS ===
export const RESOURCE_COLORS = {
  gold: '#FFD700',
  iron: '#A0A0B0',
  food: '#7EC850',
  wood: '#8B6914',
  stone: '#9A9A9A',
} as const;

// === RESOURCE ICONS ===
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
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACE.lg,
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
    fontSize: FONT.h3,
    fontWeight: FONT.bold,
  },
  textBody: {
    color: COLORS.textSecondary,
    fontSize: FONT.body,
  },
  textCaption: {
    color: COLORS.textSecondary,
    fontSize: FONT.caption,
    fontWeight: FONT.semi,
  },
  textSmall: {
    color: COLORS.textMuted,
    fontSize: FONT.tiny,
  },
  // Modal standart header
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.gold,
    fontSize: FONT.h2,
    fontWeight: FONT.black,
  },
  // Section label
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: FONT.tiny,
    fontWeight: FONT.bold,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: SPACE.lg,
    marginBottom: SPACE.sm,
    marginLeft: SPACE.xs,
  },
  // Divider
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACE.md,
  },
});
