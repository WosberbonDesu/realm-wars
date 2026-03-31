import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { hexKey, BuildingType, HexTerrain } from '../types/game';
import { BUILDING_COSTS, BUILDING_ICONS, BUILDING_PRODUCTION, BUILDING_HEALTH } from '../constants/game';
import { TERRAIN_BUILDABLE } from '../constants/terrain';
import { COLORS } from '../constants/theme';

export const BuildMenu: React.FC = () => {
  const showBuildMenu = useGameStore(s => s.showBuildMenu);
  const selectedHex = useGameStore(s => s.selectedHex);
  const game = useGameStore(s => s.game);
  const buildStructure = useGameStore(s => s.buildStructure);
  const toggleBuildMenu = useGameStore(s => s.toggleBuildMenu);

  if (!showBuildMenu || !selectedHex || !game) return null;

  const key = hexKey(selectedHex.q, selectedHex.r);
  const tile = game.map.get(key);
  if (!tile || tile.building) return null;

  const player = game.players.find(p => p.id === game.currentPlayerId);
  if (!player) return null;

  const allowed = TERRAIN_BUILDABLE[tile.terrain];

  return (
    <View style={styles.overlay}>
      <View style={styles.panel}>
        <View style={styles.header}>
          <Text style={styles.title}>Bina Insaasi</Text>
          <TouchableOpacity onPress={toggleBuildMenu}>
            <Text style={styles.closeBtn}>X</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.list}>
          {allowed.map(type => {
            const cost = BUILDING_COSTS[type];
            const prod = BUILDING_PRODUCTION[type];
            const hp = BUILDING_HEALTH[type];
            const canBuild =
              (cost.gold ?? 0) <= player.resources.gold &&
              (cost.iron ?? 0) <= player.resources.iron &&
              (cost.food ?? 0) <= player.resources.food &&
              (cost.wood ?? 0) <= player.resources.wood &&
              (cost.stone ?? 0) <= player.resources.stone;

            return (
              <TouchableOpacity
                key={type}
                style={[styles.item, !canBuild && styles.itemDisabled]}
                onPress={() => canBuild && buildStructure(type)}
                disabled={!canBuild}
              >
                <Text style={styles.itemIcon}>{BUILDING_ICONS[type]}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{type.toUpperCase()}</Text>
                  <Text style={styles.itemCost}>
                    {Object.entries(cost)
                      .filter(([, v]) => v && v > 0)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(' | ')}
                  </Text>
                  <Text style={styles.itemProd}>
                    HP: {hp}
                    {Object.entries(prod).filter(([, v]) => v && v > 0).length > 0 &&
                      ' | Uretim: ' + Object.entries(prod)
                        .filter(([, v]) => v && v > 0)
                        .map(([k, v]) => `+${v} ${k}`)
                        .join(', ')}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
          {allowed.length === 0 && (
            <Text style={styles.emptyText}>Bu araziye bina kurulamaz</Text>
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: COLORS.bgOverlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  panel: {
    width: '85%',
    maxHeight: '70%',
    backgroundColor: COLORS.bgLight,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: COLORS.gold,
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    color: COLORS.textMuted,
    fontSize: 20,
    fontWeight: '700',
    padding: 4,
  },
  list: {
    maxHeight: 400,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgPanel,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  itemDisabled: {
    opacity: 0.4,
  },
  itemIcon: {
    fontSize: 28,
  },
  itemName: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  itemCost: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  itemProd: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
});
