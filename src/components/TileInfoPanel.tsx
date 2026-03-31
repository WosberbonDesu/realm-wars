import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { hexKey, HexTerrain, UnitType } from '../types/game';
import { TERRAIN_ICONS, TERRAIN_COLORS, BUILDING_ICONS, UNIT_ICONS, UNIT_STATS } from '../constants/game';
import { TERRAIN_NAMES } from '../constants/terrain';
import { COLORS } from '../constants/theme';

export const TileInfoPanel: React.FC = () => {
  const selectedHex = useGameStore(s => s.selectedHex);
  const game = useGameStore(s => s.game);
  const toggleBuildMenu = useGameStore(s => s.toggleBuildMenu);
  const trainUnit = useGameStore(s => s.trainUnit);

  if (!selectedHex || !game) return null;

  const key = hexKey(selectedHex.q, selectedHex.r);
  const tile = game.map.get(key);
  if (!tile) return null;

  const isOwned = tile.ownerId === game.currentPlayerId;
  const player = game.players.find(p => p.id === game.currentPlayerId);

  return (
    <View style={styles.container}>
      <View style={styles.panel}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.icon}>{TERRAIN_ICONS[tile.terrain]}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>
              {tile.biomeName || TERRAIN_NAMES[tile.terrain]}
            </Text>
            {tile.regionName ? (
              <Text style={styles.subtitle}>{tile.regionName}</Text>
            ) : null}
          </View>
          <View style={[styles.terrainDot, { backgroundColor: TERRAIN_COLORS[tile.terrain] }]} />
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatItem label="Yukseklik" value={`${(tile.elevation * 100).toFixed(0)}m`} />
          <StatItem label="Sicaklik" value={`${(tile.temperature * 40).toFixed(0)}°`} />
          <StatItem label="Nem" value={`${(tile.moisture * 100).toFixed(0)}%`} />
          {tile.hasRiver && <StatItem label="Nehir" value="Var" color={COLORS.primary} />}
        </View>

        {/* Resources */}
        <View style={styles.resourceRow}>
          {tile.resources.gold > 0 && <ResItem icon="Au" val={tile.resources.gold} color="#FFD700" />}
          {tile.resources.iron > 0 && <ResItem icon="Fe" val={tile.resources.iron} color="#A0A0B0" />}
          {tile.resources.food > 0 && <ResItem icon="Fd" val={tile.resources.food} color="#7EC850" />}
          {tile.resources.wood > 0 && <ResItem icon="Wd" val={tile.resources.wood} color="#8B6914" />}
          {tile.resources.stone > 0 && <ResItem icon="St" val={tile.resources.stone} color="#9A9A9A" />}
        </View>

        {/* Building info */}
        {tile.building && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {BUILDING_ICONS[tile.building.type]} {tile.building.type.toUpperCase()}
            </Text>
            <Text style={styles.detailText}>
              HP: {tile.building.health}/{tile.building.maxHealth} | Seviye: {tile.building.level}
            </Text>
          </View>
        )}

        {/* Army info */}
        {tile.army && tile.visible && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ordu (Guc: {tile.army.totalPower})</Text>
            {tile.army.units.map((u, i) => (
              <Text key={i} style={styles.detailText}>
                {UNIT_ICONS[u.type]} {u.type} x{u.count}
              </Text>
            ))}
          </View>
        )}

        {/* Actions */}
        {isOwned && (
          <View style={styles.actions}>
            {!tile.building && (
              <ActionButton label="Bina Kur" onPress={toggleBuildMenu} />
            )}
            {tile.building?.type === 'castle' || tile.building?.type === 'barracks' ? (
              <ActionButton
                label="Asker Egit"
                onPress={() => trainUnit(UnitType.Warrior, 3)}
              />
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
};

const StatItem: React.FC<{ label: string; value: string; color?: string }> = ({
  label, value, color,
}) => (
  <View style={styles.statItem}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
  </View>
);

const ResItem: React.FC<{ icon: string; val: number; color: string }> = ({ icon, val, color }) => (
  <View style={[styles.resItem, { borderColor: color + '44' }]}>
    <Text style={[styles.resIcon, { color }]}>{icon}</Text>
    <Text style={styles.resVal}>{val}</Text>
  </View>
);

const ActionButton: React.FC<{ label: string; onPress: () => void }> = ({ label, onPress }) => (
  <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
    <Text style={styles.actionText}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100, left: 8, right: 8,
    pointerEvents: 'box-none',
  },
  panel: {
    backgroundColor: COLORS.bgPanel,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  icon: {
    fontSize: 28,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  terrainDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  statItem: {
    backgroundColor: COLORS.bgLight,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
  },
  statValue: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  resourceRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  resItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.bgLight,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
  },
  resIcon: {
    fontSize: 10,
    fontWeight: '700',
  },
  resVal: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginTop: 6,
    backgroundColor: COLORS.bgLight,
    borderRadius: 8,
    padding: 8,
  },
  sectionTitle: {
    color: COLORS.gold,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  detailText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
});
