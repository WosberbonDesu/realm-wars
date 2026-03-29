import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { ClipboardService } from '../services/clipboard';
import { COLORS, FONT, SPACE, RADIUS } from '../constants/theme';
import { t } from '../i18n';

interface ToolbarAction {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
}

interface Props {
  turn: number;
  playerName: string;
  playerColor: string;
  actions: ToolbarAction[];
  onBackToMenu: () => void;
  mapSeed?: number;
}

export default function GameToolbar({
  turn, playerName, playerColor, actions, onBackToMenu, mapSeed,
}: Props) {
  const handleCopySeed = () => {
    if (!mapSeed) return;
    ClipboardService.setString(String(mapSeed));
    Alert.alert(t('toolbar.seedCopied'), t('toolbar.seedCopiedMsg', { seed: mapSeed }));
  };

  return (
    <View style={styles.container}>
      {/* Sol: geri + oyuncu */}
      <View style={styles.leftSection}>
        <TouchableOpacity onPress={onBackToMenu} style={styles.backBtn}>
          <Text style={styles.backIcon}>{'‹'}</Text>
        </TouchableOpacity>
        <View style={[styles.playerDot, { backgroundColor: playerColor }]} />
        <Text style={styles.playerName} numberOfLines={1}>{playerName}</Text>
      </View>

      {/* Orta: tur + seed */}
      <View style={styles.centerSection}>
        <View style={styles.turnBadge}>
          <Text style={styles.turnLabel}>{t('toolbar.turn')}</Text>
          <Text style={styles.turnNumber}>{turn}</Text>
        </View>
        {mapSeed != null && (
          <TouchableOpacity style={styles.seedBadge} onPress={handleCopySeed} activeOpacity={0.7}>
            <Text style={styles.seedLabel}>{t('toolbar.seed')}</Text>
            <Text style={styles.seedValue} numberOfLines={1}>
              {String(mapSeed).slice(-6)}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Sag: aksiyonlar */}
      <View style={styles.actionRow}>
        {actions.map((action, i) => (
          <TouchableOpacity
            key={i}
            style={styles.actionBtn}
            onPress={action.onPress}
            activeOpacity={0.6}
          >
            <Text style={styles.actionIcon}>{action.icon}</Text>
            <Text style={[styles.actionLabel, { color: action.color }]} numberOfLines={1}>
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACE.md,
    paddingTop: 48,
    paddingBottom: SPACE.sm,
    backgroundColor: COLORS.bgLight,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    zIndex: 10,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    flex: 1,
  },
  backBtn: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    color: COLORS.textSecondary,
    fontSize: 18,
    fontWeight: '700',
    marginTop: -1,
  },
  playerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  playerName: {
    color: COLORS.textPrimary,
    fontSize: FONT.caption,
    fontWeight: FONT.semi,
    maxWidth: 70,
  },
  centerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
    marginHorizontal: SPACE.xs,
  },
  turnBadge: {
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACE.md,
    paddingVertical: 2,
  },
  turnLabel: {
    color: COLORS.textMuted,
    fontSize: 7,
    fontWeight: FONT.bold,
    letterSpacing: 2,
  },
  turnNumber: {
    color: COLORS.gold,
    fontSize: FONT.h3,
    fontWeight: FONT.black,
    marginTop: -2,
  },
  seedBadge: {
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACE.sm,
    paddingVertical: 2,
  },
  seedLabel: {
    color: COLORS.textMuted,
    fontSize: 6,
    fontWeight: FONT.bold,
    letterSpacing: 1.5,
  },
  seedValue: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: FONT.bold,
    marginTop: -1,
    maxWidth: 50,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 2,
    flex: 1,
    justifyContent: 'flex-end',
  },
  actionBtn: {
    alignItems: 'center',
    paddingHorizontal: SPACE.sm,
    paddingVertical: SPACE.xs,
    borderRadius: RADIUS.sm,
  },
  actionIcon: {
    fontSize: 16,
  },
  actionLabel: {
    fontSize: 8,
    fontWeight: FONT.bold,
    marginTop: 1,
  },
});
