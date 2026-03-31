/**
 * RegionInfoPanel — seçili bölge bilgi paneli.
 * HexInfoPanel'in region-bazlı karşılığı.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { COLORS, FONT, SPACE, RADIUS } from '../constants/theme';
import { BUILDING_ICONS, UNIT_ICONS, BUILDING_COSTS } from '../constants/game';
import { REGION_TERRAIN_COLORS, REGION_TERRAIN_PROPS, RegionTerrain } from '../types/region';
import { BuildingType } from '../types/game';
import { useI18n } from '../i18n/useI18n';

const TERRAIN_DISPLAY: Record<string, string> = {
  deep_sea: 'Derin Deniz', sea: 'Deniz', coast: 'Kiyi', beach: 'Sahil',
  plains: 'Ova', grassland: 'Cayir', forest: 'Orman', dense_forest: 'Yogun Orman',
  hills: 'Tepe', mountain: 'Dag', snow_peak: 'Karlı Zirve', desert: 'Col',
  savanna: 'Savan', swamp: 'Bataklik', tundra: 'Tundra', river: 'Nehir',
  lake: 'Gol', fertile: 'Verimli',
};

interface Props {
  onBuild: () => void;
  onTrain: () => void;
  onMove: () => void;
}

export default function RegionInfoPanel({ onBuild, onTrain, onMove }: Props) {
  const { t } = useI18n();
  const selectedRegionId = useGameStore(s => s.selectedRegionId);
  const worldMap = useGameStore(s => s.worldMap);
  const currentPlayerId = useGameStore(s => s.currentPlayerId);
  const players = useGameStore(s => s.players);

  if (!selectedRegionId || !worldMap) return null;
  const region = worldMap.regions.get(selectedRegionId);
  if (!region) return null;

  const owner = region.ownerId ? players.find(p => p.id === region.ownerId) : null;
  const isMine = region.ownerId === currentPlayerId;
  const terrainProps = REGION_TERRAIN_PROPS[region.terrain];
  const terrainColors = REGION_TERRAIN_COLORS[region.terrain];
  const canBuild = isMine && !region.building && terrainProps.buildable;
  const canTrain = isMine && region.building?.type === 'castle';
  const canMove = isMine && region.army !== null;

  return (
    <View style={styles.container}>
      {/* Başlık */}
      <View style={styles.header}>
        <View style={[styles.terrainDot, { backgroundColor: terrainColors.fill }]} />
        <Text style={styles.terrainName}>{TERRAIN_DISPLAY[region.terrain] ?? region.terrain}</Text>
        {terrainProps.defenseBonus !== 0 && (
          <Text style={[styles.bonus, { color: terrainProps.defenseBonus > 0 ? COLORS.green : COLORS.red }]}>
            {terrainProps.defenseBonus > 0 ? '+' : ''}{Math.round(terrainProps.defenseBonus * 100)}% def
          </Text>
        )}
      </View>

      {/* Sahip */}
      {owner && (
        <View style={styles.ownerRow}>
          <View style={[styles.ownerDot, { backgroundColor: owner.color }]} />
          <Text style={styles.ownerText}>{owner.name}</Text>
        </View>
      )}

      {/* Bina */}
      {region.building && (
        <View style={styles.section}>
          <Text style={styles.sectionIcon}>{BUILDING_ICONS[region.building.type]}</Text>
          <Text style={styles.sectionTitle}>
            {region.building.type} Lv.{region.building.level}
          </Text>
        </View>
      )}

      {/* Ordu */}
      {region.army && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('hex.army')}</Text>
          <View style={styles.unitList}>
            {region.army.units.map((unit, i) => (
              <View key={i} style={styles.unitRow}>
                <Text style={styles.unitIcon}>{UNIT_ICONS[unit.type]}</Text>
                <Text style={styles.unitCount}>x{unit.count}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.powerText}>{t('hex.power', { val: region.army.totalPower })}</Text>
        </View>
      )}

      {/* Kaynaklar */}
      <View style={styles.resRow}>
        {region.resources.food > 0 && <Text style={styles.resText}>🌾 {region.resources.food}</Text>}
        {region.resources.gold > 0 && <Text style={styles.resText}>💰 {region.resources.gold}</Text>}
        {region.resources.wood > 0 && <Text style={styles.resText}>🪵 {region.resources.wood}</Text>}
        {region.resources.iron > 0 && <Text style={styles.resText}>⛏️ {region.resources.iron}</Text>}
        {region.resources.stone > 0 && <Text style={styles.resText}>🪨 {region.resources.stone}</Text>}
      </View>

      {/* Aksiyonlar */}
      {isMine && (
        <View style={styles.actions}>
          {canBuild && (
            <TouchableOpacity style={styles.actionBtn} onPress={onBuild}>
              <Text style={styles.actionText}>{t('hex.build')}</Text>
            </TouchableOpacity>
          )}
          {canTrain && (
            <TouchableOpacity style={[styles.actionBtn, styles.trainBtn]} onPress={onTrain}>
              <Text style={styles.actionText}>{t('hex.train')}</Text>
            </TouchableOpacity>
          )}
          {canMove && (
            <TouchableOpacity style={[styles.actionBtn, styles.moveBtn]} onPress={onMove}>
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
    backgroundColor: COLORS.bgPanel,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  terrainDot: { width: 10, height: 10, borderRadius: 5 },
  terrainName: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
  bonus: { fontSize: 11, fontWeight: '600', marginLeft: 'auto' },
  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  ownerDot: { width: 8, height: 8, borderRadius: 4 },
  ownerText: { color: COLORS.textSecondary, fontSize: 12 },
  section: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8,
    paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  sectionIcon: { fontSize: 22 },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '600' },
  sectionLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', marginRight: 8 },
  unitList: { flexDirection: 'row', gap: 10 },
  unitRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  unitIcon: { fontSize: 14 },
  unitCount: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '600' },
  powerText: { color: COLORS.gold, fontSize: 11, fontWeight: '700', marginLeft: 'auto' },
  resRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  resText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  actions: {
    flexDirection: 'row', gap: 8, marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  actionBtn: {
    flex: 1, backgroundColor: COLORS.actionBuild, paddingVertical: 14,
    borderRadius: RADIUS.md, alignItems: 'center', minHeight: 48,
  },
  trainBtn: { backgroundColor: COLORS.actionTrain },
  moveBtn: { backgroundColor: COLORS.actionMove },
  actionText: { color: COLORS.textPrimary, fontSize: FONT.body, fontWeight: '700' as any },
});
