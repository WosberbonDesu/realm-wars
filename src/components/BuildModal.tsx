import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView,
} from 'react-native';
import { useGameStore } from '../store/gameStore';
import { BuildingType, HexCoord, Resources } from '../types/game';
import { COLORS, RESOURCE_COLORS, RESOURCE_ICONS } from '../constants/theme';
import {
  BUILDING_ICONS, BUILDING_COSTS, BUILDING_HEALTH, BUILDING_PRODUCTION,
} from '../constants/game';
import { TERRAIN_BUILDABLE } from '../constants/terrain';

interface Props {
  visible: boolean;
  onClose: (built?: boolean) => void;
}

const BUILDING_NAMES: Record<BuildingType, string> = {
  [BuildingType.Castle]: 'Kale',
  [BuildingType.Barracks]: 'Kisla',
  [BuildingType.Mine]: 'Maden',
  [BuildingType.Farm]: 'Ciftlik',
  [BuildingType.Lumbermill]: 'Kereste',
  [BuildingType.Tower]: 'Kule',
  [BuildingType.Market]: 'Pazar',
};

export default function BuildModal({ visible, onClose }: Props) {
  const selectedHex = useGameStore(s => s.selectedHex);
  const getBuildableTypes = useGameStore(s => s.getBuildableTypes);
  const buildStructure = useGameStore(s => s.buildStructure);
  const currentPlayerId = useGameStore(s => s.currentPlayerId);
  const players = useGameStore(s => s.players);

  if (!selectedHex) return null;

  const buildable = getBuildableTypes(selectedHex);
  const player = players.find(p => p.id === currentPlayerId);

  const handleBuild = (type: BuildingType) => {
    const success = buildStructure(selectedHex, type);
    if (success) onClose(true);
  };

  const canAfford = (cost: Partial<Resources>): boolean => {
    if (!player) return false;
    const r = player.resources;
    return (
      r.gold >= (cost.gold ?? 0) &&
      r.iron >= (cost.iron ?? 0) &&
      r.food >= (cost.food ?? 0) &&
      r.wood >= (cost.wood ?? 0) &&
      r.stone >= (cost.stone ?? 0)
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <View style={styles.header}>
            <Text style={styles.title}>Bina Kur</Text>
            <TouchableOpacity onPress={() => onClose()}>
              <Text style={styles.closeText}>Kapat</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.list}>
            {buildable.length === 0 ? (
              <Text style={styles.emptyText}>Bu hex'e bina kurulamaz</Text>
            ) : (
              buildable.map(type => {
                const cost = BUILDING_COSTS[type];
                const production = BUILDING_PRODUCTION[type];
                const affordable = canAfford(cost);

                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.item, !affordable && styles.itemDisabled]}
                    onPress={() => handleBuild(type)}
                    disabled={!affordable}
                  >
                    <Text style={styles.itemIcon}>{BUILDING_ICONS[type]}</Text>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{BUILDING_NAMES[type]}</Text>

                      {/* Maliyet */}
                      <View style={styles.costRow}>
                        {Object.entries(cost).map(([res, val]) => (
                          <Text
                            key={res}
                            style={[
                              styles.costText,
                              { color: RESOURCE_COLORS[res as keyof typeof RESOURCE_COLORS] },
                              player && player.resources[res as keyof Resources] < (val as number)
                                ? styles.costInsufficient
                                : null,
                            ]}
                          >
                            {RESOURCE_ICONS[res as keyof typeof RESOURCE_ICONS]} {val}
                          </Text>
                        ))}
                      </View>

                      {/* Uretim */}
                      {Object.keys(production).length > 0 && (
                        <View style={styles.prodRow}>
                          <Text style={styles.prodLabel}>Uretim: </Text>
                          {Object.entries(production).map(([res, val]) => (
                            <Text key={res} style={styles.prodText}>
                              {RESOURCE_ICONS[res as keyof typeof RESOURCE_ICONS]} +{val}/tur
                            </Text>
                          ))}
                        </View>
                      )}
                    </View>

                    <Text style={styles.hpText}>
                      HP {BUILDING_HEALTH[type]}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.bgOverlay,
    justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: COLORS.bgLight,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 36,
    maxHeight: '60%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    color: COLORS.gold,
    fontSize: 18,
    fontWeight: '800',
  },
  closeText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  emptyText: {
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  itemDisabled: {
    opacity: 0.4,
  },
  itemIcon: {
    fontSize: 28,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  costRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 2,
  },
  costText: {
    fontSize: 11,
    fontWeight: '600',
  },
  costInsufficient: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  prodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  prodLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  prodText: {
    color: COLORS.green,
    fontSize: 10,
    fontWeight: '600',
    marginRight: 6,
  },
  hpText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
});
