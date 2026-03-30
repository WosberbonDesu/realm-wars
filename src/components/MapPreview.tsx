/**
 * MapPreview — küçük harita önizleme kartı.
 * Galeri ve editör için kullanılır.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, FONT, SPACE, RADIUS } from '../constants/theme';
import { MapTemplate } from '../types/mapEditor';

interface Props {
  template: MapTemplate;
  selected?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}

export default function MapPreview({ template, selected, onPress, onLongPress }: Props) {
  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      {/* Icon + isim */}
      <View style={styles.iconRow}>
        <Text style={styles.icon}>{template.icon}</Text>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{template.name}</Text>
          <Text style={styles.author}>
            {template.author === 'system' ? 'Hazir' : template.author}
          </Text>
        </View>
      </View>

      {/* Açıklama */}
      <Text style={styles.desc} numberOfLines={2}>{template.description}</Text>

      {/* Detaylar */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{template.radius * 2}</Text>
          <Text style={styles.statLabel}>Boyut</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{template.playerCount}</Text>
          <Text style={styles.statLabel}>Oyuncu</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {template.generatorType === 'custom' ? '✏️' : '🎲'}
          </Text>
          <Text style={styles.statLabel}>
            {template.generatorType === 'custom' ? 'Ozel' : 'Uretim'}
          </Text>
        </View>
      </View>

      {/* Tags */}
      {template.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {template.tags.slice(0, 3).map((tag, i) => (
            <View key={i} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACE.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    width: '48%' as any,
    marginBottom: SPACE.md,
  },
  cardSelected: {
    borderColor: COLORS.gold,
    borderWidth: 2,
    backgroundColor: COLORS.primaryDark,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    marginBottom: SPACE.sm,
  },
  icon: {
    fontSize: 28,
  },
  info: {
    flex: 1,
  },
  name: {
    color: COLORS.textPrimary,
    fontSize: FONT.body,
    fontWeight: '700' as any,
  },
  author: {
    color: COLORS.textMuted,
    fontSize: FONT.tiny,
  },
  desc: {
    color: COLORS.textSecondary,
    fontSize: FONT.tiny,
    lineHeight: 14,
    marginBottom: SPACE.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACE.sm,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    color: COLORS.textPrimary,
    fontSize: FONT.caption,
    fontWeight: '700' as any,
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 8,
    marginTop: 1,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: SPACE.xs,
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: COLORS.bgLight,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACE.sm,
    paddingVertical: 2,
  },
  tagText: {
    color: COLORS.textMuted,
    fontSize: 8,
    fontWeight: '600' as any,
  },
});
