import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { hexKey, HexTile } from '../types/game';
import { COLORS, RESOURCE_COLORS, RESOURCE_ICONS, FONT, SPACE, RADIUS } from '../constants/theme';
import {
  TERRAIN_COLORS, BUILDING_ICONS, UNIT_ICONS,
  MAX_BUILDING_LEVEL, LEVEL_NAMES,
} from '../constants/game';
import { TERRAIN_NAMES, TERRAIN_DEFENSE_BONUS } from '../constants/terrain';
import { useI18n } from '../i18n/useI18n';

interface Props {
  onBuild: () => void;
  onTrain: () => void;
  onMove: () => void;
}

export default function HexInfoPanel({ onBuild, onTrain, onMove }: Props) {
  const { t } = useI18n();
  const selectedHex = useGameStore(s => s.selectedHex);
  const map = useGameStore(s => s.map);
  const currentPlayerId = useGameStore(s => s.currentPlayerId);
  const players = useGameStore(s => s.players);
  const getBuildableTypes = useGameStore(s => s.getBuildableTypes);
  const upgradeBuilding = useGameStore(s => s.upgradeBuilding);
  const getUpgradeCost = useGameStore(s => s.getUpgradeCost);

  if (!selectedHex) return null;

  const key = hexKey(selectedHex.q, selectedHex.r);
  const tile = map.get(key);
  if (!tile || !tile.visible) return null;

  const owner = tile.ownerId ? players.find(p => p.id === tile.ownerId) : null;
  const isMine = tile.ownerId === currentPlayerId;
  const canBuild = isMine && !tile.building && getBuildableTypes(selectedHex).length > 0;
  const canTrain = isMine && tile.building?.type === 'castle';
  const upgradeCost = isMine && tile.building ? getUpgradeCost(selectedHex) : null;
  const canUpgrade = upgradeCost !== null;
  const canMove = isMine && tile.army !== null && tile.army.ownerId === currentPlayerId;
  const defBonus = TERRAIN_DEFENSE_BONUS[tile.terrain];

  return (
    <View style={styles.container}>
      {/* Baslik: Terrain */}
      <View style={styles.header}>
        <View style={[styles.terrainDot, { backgroundColor: TERRAIN_COLORS[tile.terrain] }]} />
        <Text style={styles.terrainName}>{TERRAIN_NAMES[tile.terrain]}</Text>
        <Text style={styles.coordText}>({selectedHex.q}, {selectedHex.r})</Text>
        {defBonus !== 0 && (
          <Text style={[styles.bonusText, { color: defBonus > 0 ? COLORS.green : COLORS.red }]}>
            {defBonus > 0 ? '+' : ''}{Math.round(defBonus * 100)}% def
          </Text>
        )}
      </View>

      {/* Sahiplik */}
      {owner && (
        <View style={styles.ownerRow}>
          <View style={[styles.ownerDot, { backgroundColor: owner.color }]} />
          <Text style={styles.ownerText}>{owner.name}</Text>
        </View>
      )}

      {/* Bina */}
      {tile.building && (
        <View style={styles.section}>
          <Text style={styles.sectionIcon}>{BUILDING_ICONS[tile.building.type]}</Text>
          <View style={styles.sectionInfo}>
            <View style={styles.buildingHeader}>
              <Text style={styles.sectionTitle}>
                {tile.building.type.charAt(0).toUpperCase() + tile.building.type.slice(1)}
                {' '}Lv.{tile.building.level}
              </Text>
              {tile.building.level < MAX_BUILDING_LEVEL && (
                <Text style={styles.levelBadge}>
                  {LEVEL_NAMES[tile.building.level]} → {LEVEL_NAMES[tile.building.level + 1]}
                </Text>
              )}
              {tile.building.level >= MAX_BUILDING_LEVEL && (
                <Text style={styles.maxBadge}>{t('hex.max')}</Text>
              )}
            </View>
            <View style={styles.healthBar}>
              <View style={[
                styles.healthFill,
                { width: `${(tile.building.health / tile.building.maxHealth) * 100}%` },
              ]} />
            </View>
            {/* Üretim bilgisi */}
            {Object.keys(tile.building.productionPerTick).length > 0 && (
              <View style={styles.prodRow}>
                {Object.entries(tile.building.productionPerTick).map(([res, val]) => (
                  val ? <Text key={res} style={styles.prodText}>
                    {RESOURCE_ICONS[res as keyof typeof RESOURCE_ICONS]} +{val}/tur
                  </Text> : null
                ))}
              </View>
            )}
          </View>
        </View>
      )}

      {/* Ordu */}
      {tile.army && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('hex.army')}</Text>
          <View style={styles.unitList}>
            {tile.army.units.map((unit, i) => (
              <View key={i} style={styles.unitRow}>
                <Text style={styles.unitIcon}>{UNIT_ICONS[unit.type]}</Text>
                <Text style={styles.unitCount}>x{unit.count}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.powerText}>{t('hex.power', { val: tile.army.totalPower })}</Text>
        </View>
      )}

      {/* Hex Kaynaklari */}
      <View style={styles.resRow}>
        {(['gold', 'iron', 'food', 'wood', 'stone'] as const).map(res => {
          if (!tile.resources[res]) return null;
          return (
            <Text key={res} style={[styles.resText, { color: RESOURCE_COLORS[res] }]}>
              {RESOURCE_ICONS[res]} {tile.resources[res]}
            </Text>
          );
        })}
      </View>

      {/* Aksiyon Butonlari */}
      {isMine && (
        <View style={styles.actions}>
          {canBuild && (
            <TouchableOpacity style={styles.actionBtn} onPress={onBuild}>
              <Text style={styles.actionText}>{t('hex.build')}</Text>
            </TouchableOpacity>
          )}
          {canTrain && (
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnTrain]} onPress={onTrain}>
              <Text style={styles.actionText}>{t('hex.train')}</Text>
            </TouchableOpacity>
          )}
          {canUpgrade && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnUpgrade]}
              onPress={() => upgradeBuilding(selectedHex)}
            >
              <Text style={styles.actionText}>{t('hex.upgrade')}</Text>
              <View style={styles.upgradeCostRow}>
                {Object.entries(upgradeCost!).map(([res, val]) => (
                  <Text key={res} style={styles.upgradeCostText}>
                    {RESOURCE_ICONS[res as keyof typeof RESOURCE_ICONS]}{val}
                  </Text>
                ))}
              </View>
            </TouchableOpacity>
          )}
          {canMove && (
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnMove]} onPress={onMove}>
              <Text style={styles.actionText}>{t('hex.move')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 140,
    left: 12,
    right: 12,
    backgroundColor: COLORS.bgPanel,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  terrainDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  terrainName: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  coordText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  bonusText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 'auto',
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  ownerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  ownerText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  sectionIcon: {
    fontSize: 22,
  },
  sectionInfo: {
    flex: 1,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginRight: 8,
  },
  healthBar: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
  },
  healthFill: {
    height: 4,
    backgroundColor: COLORS.green,
    borderRadius: 2,
  },
  unitList: {
    flexDirection: 'row',
    gap: 10,
  },
  unitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  unitIcon: {
    fontSize: 14,
  },
  unitCount: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  powerText: {
    color: COLORS.gold,
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 'auto',
  },
  resRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  resText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: COLORS.actionBuild,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnTrain: {
    backgroundColor: COLORS.actionTrain,
    borderWidth: 1,
    borderColor: COLORS.actionTrainBorder,
  },
  actionBtnUpgrade: {
    backgroundColor: COLORS.actionUpgrade,
    borderWidth: 1,
    borderColor: COLORS.actionUpgradeBorder,
  },
  actionBtnMove: {
    backgroundColor: COLORS.actionMove,
    borderWidth: 1,
    borderColor: COLORS.actionMoveBorder,
  },
  upgradeCostRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 2,
  },
  upgradeCostText: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '600',
  },
  buildingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  levelBadge: {
    color: COLORS.gold,
    fontSize: 9,
    fontWeight: '700',
  },
  maxBadge: {
    color: COLORS.green,
    fontSize: 9,
    fontWeight: '800',
    backgroundColor: '#1a2e1a',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  prodRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  prodText: {
    color: COLORS.green,
    fontSize: 10,
    fontWeight: '600',
  },
  actionText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
});
