import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// === DESIGN SYSTEM ===
// Inspired by Inkarnate, Wonderdraft, Azgaar, Civ VI Mobile
// Dark chrome + gold accents + parchment readability

// ───── COLOR PALETTE ─────
export const COLORS = {
  // Surfaces (dark navy, like Civ VI chrome panels)
  surface: '#1A1A2E',
  surfaceMid: '#16213E',
  surfaceLight: '#0F3460',
  surfaceOverlay: 'rgba(26,26,46,0.94)',

  // Map background
  mapBg: '#0a1520',

  // Accents
  gold: '#D4A843',
  goldLight: '#E8C66A',
  goldDim: 'rgba(212,168,67,0.15)',
  warm: '#C17F3E',

  // Text (warm off-white, parchment-like)
  textPrimary: '#E8E0D2',
  textSecondary: '#B0A898',
  textMuted: '#8A8A9A',
  textDark: '#1A1A2E',

  // Semantic
  danger: '#B44040',
  success: '#4A9A5A',
  info: '#4A7FB5',

  // Borders
  border: 'rgba(212,168,67,0.15)',
  borderSolid: '#2A2A4E',
  borderActive: '#D4A843',

  // Legacy compat
  bg: '#1A1A2E',
  bgLight: '#16213E',
  bgPanel: 'rgba(26,26,46,0.94)',
  bgOverlay: 'rgba(0,0,0,0.6)',
  primary: '#D4A843',
  primaryLight: '#E8C66A',
  primaryDark: '#B8912E',
  red: '#B44040',
  green: '#4A9A5A',
  selection: '#FFD700',
  selectionFill: '#FFD70033',
  moveHighlight: '#4AD97A44',
  attackHighlight: '#D94A4A44',
  fog: '#0F1923',
  fogExplored: '#0F1923AA',
} as const;

// ───── SPACING ─────
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

// ───── RADIUS ─────
export const RADIUS = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  round: 999,
} as const;

// ───── TYPOGRAPHY ─────
export const FONT = {
  // Display (screen titles)
  display: { fontSize: 28, fontWeight: '800' as const, letterSpacing: 2 },
  // H1 (section headers)
  h1: { fontSize: 20, fontWeight: '700' as const },
  // H2 (card titles, panel headers)
  h2: { fontSize: 16, fontWeight: '600' as const },
  // Body
  body: { fontSize: 14, fontWeight: '400' as const },
  // Caption
  caption: { fontSize: 12, fontWeight: '500' as const },
  // Small
  small: { fontSize: 10, fontWeight: '500' as const },
} as const;

// ───── SHADOWS ─────
export const SHADOW = {
  panel: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  button: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
} as const;

// ───── RESOURCE COLORS ─────
export const RESOURCE_COLORS = {
  gold: '#FFD700',
  iron: '#A0A0B0',
  food: '#7EC850',
  wood: '#8B6914',
  stone: '#9A9A9A',
} as const;

export const RESOURCE_ICONS = {
  gold: '🪙',
  iron: '⚙',
  food: '🌾',
  wood: '🪵',
  stone: '🪨',
} as const;

// ───── RESPONSIVE ─────
export const isSmallScreen = SCREEN_W < 380;
export const isMediumScreen = SCREEN_W >= 380 && SCREEN_W < 768;
export const isLargeScreen = SCREEN_W >= 768;

// ───── SHARED STYLES ─────
export const SHARED = StyleSheet.create({
  // Panels
  panel: {
    backgroundColor: COLORS.surfaceOverlay,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.panel,
  },
  card: {
    backgroundColor: COLORS.surfaceMid,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    ...SHADOW.card,
  },

  // Buttons
  buttonPrimary: {
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    ...SHADOW.button,
  },
  buttonPrimaryText: {
    color: COLORS.textDark,
    ...FONT.h2,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  buttonSecondaryText: {
    color: COLORS.gold,
    ...FONT.h2,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  buttonGhostText: {
    color: COLORS.textPrimary,
    ...FONT.body,
  },
  buttonDanger: {
    backgroundColor: COLORS.danger,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    minHeight: 44,
  },

  // Text
  textTitle: {
    color: COLORS.gold,
    ...FONT.h1,
  },
  textHeading: {
    color: COLORS.textPrimary,
    ...FONT.h2,
  },
  textBody: {
    color: COLORS.textSecondary,
    ...FONT.body,
  },
  textCaption: {
    color: COLORS.textMuted,
    ...FONT.caption,
  },

  // Layout
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  centerAll: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  flex1: {
    flex: 1,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: COLORS.borderSolid,
    marginVertical: SPACING.md,
  },

  // Input
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    color: COLORS.textPrimary,
    ...FONT.body,
    borderWidth: 1,
    borderColor: COLORS.borderSolid,
    minHeight: 44,
  },

  // Close button
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeTxt: {
    color: COLORS.textMuted,
    fontSize: 18,
    fontWeight: '700',
  },
});
