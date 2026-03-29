import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView,
} from 'react-native';
import { useGameStore } from '../store/gameStore';
import { TechId, Resources } from '../types/game';
import { COLORS, RESOURCE_COLORS, RESOURCE_ICONS } from '../constants/theme';
import { TECH_TREE, TECH_TIERS } from '../constants/tech';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function TechTreeModal({ visible, onClose }: Props) {
  const currentPlayerId = useGameStore(s => s.currentPlayerId);
  const players = useGameStore(s => s.players);
  const startResearch = useGameStore(s => s.startResearch);
  const getAvailableTechs = useGameStore(s => s.getAvailableTechs);

  const player = players.find(p => p.id === currentPlayerId);
  if (!player) return null;

  const available = getAvailableTechs(currentPlayerId);
  const researched = player.researchedTechs;
  const currentResearch = player.currentResearch;

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

  const handleResearch = (techId: TechId) => {
    const success = startResearch(techId);
    if (success) onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <View style={styles.header}>
            <Text style={styles.title}>Teknoloji Agaci</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeText}>Kapat</Text>
            </TouchableOpacity>
          </View>

          {/* Aktif arastirma */}
          {currentResearch && (
            <View style={styles.activeResearch}>
              <Text style={styles.activeIcon}>{TECH_TREE[currentResearch.techId].icon}</Text>
              <View style={styles.activeInfo}>
                <Text style={styles.activeName}>
                  {TECH_TREE[currentResearch.techId].name}
                </Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, {
                    width: `${((TECH_TREE[currentResearch.techId].researchTurns - currentResearch.turnsLeft) / TECH_TREE[currentResearch.techId].researchTurns) * 100}%`,
                  }]} />
                </View>
                <Text style={styles.turnsText}>{currentResearch.turnsLeft} tur kaldi</Text>
              </View>
            </View>
          )}

          <ScrollView style={styles.treeContainer}>
            {TECH_TIERS.map((tier, tierIndex) => (
              <View key={tierIndex}>
                <Text style={styles.tierLabel}>Seviye {tierIndex + 1}</Text>
                <View style={styles.tierRow}>
                  {tier.map(techId => {
                    const tech = TECH_TREE[techId];
                    const isResearched = researched.includes(techId);
                    const isAvailable = available.includes(techId);
                    const isActive = currentResearch?.techId === techId;
                    const affordable = canAfford(tech.cost);
                    const canStart = isAvailable && !currentResearch && affordable;

                    return (
                      <TouchableOpacity
                        key={techId}
                        style={[
                          styles.techCard,
                          isResearched && styles.techResearched,
                          isActive && styles.techActive,
                          !isResearched && !isAvailable && styles.techLocked,
                        ]}
                        onPress={() => canStart && handleResearch(techId)}
                        disabled={!canStart}
                      >
                        <Text style={styles.techIcon}>{tech.icon}</Text>
                        <Text style={[
                          styles.techName,
                          isResearched && styles.techNameResearched,
                        ]}>
                          {tech.name}
                        </Text>

                        {isResearched ? (
                          <Text style={styles.completedText}>Tamamlandi</Text>
                        ) : isActive ? (
                          <Text style={styles.activeText}>{currentResearch!.turnsLeft} tur</Text>
                        ) : (
                          <>
                            <Text style={styles.techDesc} numberOfLines={2}>{tech.description}</Text>
                            <View style={styles.costRow}>
                              {Object.entries(tech.cost).map(([res, val]) => (
                                <Text
                                  key={res}
                                  style={[
                                    styles.costText,
                                    { color: RESOURCE_COLORS[res as keyof typeof RESOURCE_COLORS] },
                                  ]}
                                >
                                  {RESOURCE_ICONS[res as keyof typeof RESOURCE_ICONS]} {val}
                                </Text>
                              ))}
                            </View>
                            <Text style={styles.turnsNeeded}>{tech.researchTurns} tur</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
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
    maxHeight: '85%',
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
  activeResearch: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: COLORS.primaryDark,
    borderRadius: 12,
    gap: 10,
  },
  activeIcon: {
    fontSize: 24,
  },
  activeInfo: {
    flex: 1,
  },
  activeName: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginTop: 6,
  },
  progressFill: {
    height: 4,
    backgroundColor: COLORS.gold,
    borderRadius: 2,
  },
  turnsText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: 4,
  },
  treeContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  tierLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 8,
  },
  tierRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  techCard: {
    width: '47%',
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  techResearched: {
    borderColor: COLORS.green,
    backgroundColor: '#1a2e1a',
  },
  techActive: {
    borderColor: COLORS.gold,
    backgroundColor: '#2e2a1a',
  },
  techLocked: {
    opacity: 0.4,
  },
  techIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  techName: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  techNameResearched: {
    color: COLORS.green,
  },
  techDesc: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginBottom: 6,
  },
  completedText: {
    color: COLORS.green,
    fontSize: 10,
    fontWeight: '700',
  },
  activeText: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: '700',
  },
  costRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  costText: {
    fontSize: 10,
    fontWeight: '600',
  },
  turnsNeeded: {
    color: COLORS.textMuted,
    fontSize: 9,
  },
});
