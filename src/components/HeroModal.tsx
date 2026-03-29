import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView,
} from 'react-native';
import { useGameStore } from '../store/gameStore';
import { HeroState, Resources } from '../types/game';
import { COLORS, RESOURCE_COLORS, RESOURCE_ICONS } from '../constants/theme';
import { HEROES, HeroId, HeroDefinition } from '../constants/heroes';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function HeroModal({ visible, onClose }: Props) {
  const currentPlayerId = useGameStore(s => s.currentPlayerId);
  const players = useGameStore(s => s.players);
  const hireHero = useGameStore(s => s.hireHero);
  const selectedHex = useGameStore(s => s.selectedHex);
  const assignHero = useGameStore(s => s.assignHero);

  const player = players.find(p => p.id === currentPlayerId);
  if (!player) return null;

  const ownedHeroIds = player.heroes.map(h => h.heroId);

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

  const handleHire = (heroId: HeroId) => {
    hireHero(heroId);
  };

  const handleAssign = (heroId: string) => {
    if (selectedHex) {
      assignHero(heroId, selectedHex);
    }
  };

  const handleUnassign = (heroId: string) => {
    assignHero(heroId, null);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <View style={styles.header}>
            <Text style={styles.title}>Kahramanlar</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeText}>Kapat</Text>
            </TouchableOpacity>
          </View>

          {/* Sahip olunan kahramanlar */}
          {player.heroes.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Kahramanlarim</Text>
              <ScrollView horizontal style={styles.ownedList} showsHorizontalScrollIndicator={false}>
                {player.heroes.map(hero => {
                  const def = HEROES[hero.heroId as HeroId];
                  if (!def) return null;
                  return (
                    <View key={hero.heroId} style={styles.ownedCard}>
                      <Text style={styles.ownedIcon}>{def.icon}</Text>
                      <Text style={styles.ownedName}>{def.name}</Text>
                      <Text style={styles.ownedTitle}>{def.title}</Text>
                      {hero.assignedArmyHex ? (
                        <View>
                          <Text style={styles.assignedText}>
                            ({hero.assignedArmyHex.q},{hero.assignedArmyHex.r})
                          </Text>
                          <TouchableOpacity
                            style={styles.unassignBtn}
                            onPress={() => handleUnassign(hero.heroId)}
                          >
                            <Text style={styles.unassignText}>Geri Cek</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[styles.assignBtn, !selectedHex && styles.btnDisabled]}
                          onPress={() => handleAssign(hero.heroId)}
                          disabled={!selectedHex}
                        >
                          <Text style={styles.assignText}>Ata</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            </>
          )}

          {/* Kiralanabilir kahramanlar */}
          <Text style={styles.sectionTitle}>Kirala</Text>
          <ScrollView style={styles.hireList}>
            {Object.values(HEROES).map(hero => {
              const owned = ownedHeroIds.includes(hero.id);
              const affordable = canAfford(hero.cost);

              return (
                <View key={hero.id} style={[styles.hireCard, owned && styles.hireCardOwned]}>
                  <View style={styles.hireTop}>
                    <Text style={styles.hireIcon}>{hero.icon}</Text>
                    <View style={styles.hireInfo}>
                      <Text style={styles.hireName}>{hero.name}</Text>
                      <Text style={styles.hireTitle}>{hero.title}</Text>
                    </View>
                    {owned ? (
                      <Text style={styles.ownedBadge}>Sahip</Text>
                    ) : (
                      <TouchableOpacity
                        style={[styles.hireBuyBtn, !affordable && styles.btnDisabled]}
                        onPress={() => handleHire(hero.id)}
                        disabled={!affordable}
                      >
                        <Text style={styles.hireBuyText}>Kirala</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Statlar */}
                  <View style={styles.statsRow}>
                    {hero.attackBonus > 0 && <Text style={styles.statText}>ATK +{hero.attackBonus}</Text>}
                    {hero.defenseBonus > 0 && <Text style={styles.statText}>DEF +{hero.defenseBonus}</Text>}
                    {hero.speedBonus > 0 && <Text style={styles.statText}>SPD +{hero.speedBonus}</Text>}
                    {hero.visibilityBonus > 0 && <Text style={styles.statText}>VIS +{hero.visibilityBonus}</Text>}
                  </View>

                  {/* Pasifler */}
                  {hero.passives.map((p, i) => (
                    <Text key={i} style={styles.passiveText}>{p.description}</Text>
                  ))}

                  {/* Yetenek */}
                  <View style={styles.abilityRow}>
                    <Text style={styles.abilityIcon}>{hero.ability.icon}</Text>
                    <View>
                      <Text style={styles.abilityName}>{hero.ability.name}</Text>
                      <Text style={styles.abilityDesc}>{hero.ability.description}</Text>
                    </View>
                    <Text style={styles.cooldownText}>{hero.ability.cooldown} tur</Text>
                  </View>

                  {/* Maliyet */}
                  {!owned && (
                    <View style={styles.costRow}>
                      {Object.entries(hero.cost).map(([res, val]) => (
                        <Text
                          key={res}
                          style={[styles.costText, { color: RESOURCE_COLORS[res as keyof typeof RESOURCE_COLORS] }]}
                        >
                          {RESOURCE_ICONS[res as keyof typeof RESOURCE_ICONS]} {val}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
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
  sectionTitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 8,
    marginLeft: 16,
  },
  // Sahip olunan
  ownedList: {
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  ownedCard: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 12,
    marginRight: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gold,
    width: 110,
  },
  ownedIcon: { fontSize: 28, marginBottom: 4 },
  ownedName: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '700' },
  ownedTitle: { color: COLORS.textMuted, fontSize: 9, marginBottom: 6 },
  assignedText: { color: COLORS.green, fontSize: 9, fontWeight: '600', textAlign: 'center' },
  assignBtn: {
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 6,
    marginTop: 4,
  },
  assignText: { color: COLORS.textPrimary, fontSize: 10, fontWeight: '700' },
  unassignBtn: {
    paddingVertical: 4,
    marginTop: 2,
  },
  unassignText: { color: COLORS.textMuted, fontSize: 9 },
  btnDisabled: { opacity: 0.4 },
  // Kiralama listesi
  hireList: {
    paddingHorizontal: 16,
  },
  hireCard: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  hireCardOwned: {
    borderColor: COLORS.green,
    opacity: 0.7,
  },
  hireTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  hireIcon: { fontSize: 28 },
  hireInfo: { flex: 1 },
  hireName: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
  hireTitle: { color: COLORS.textMuted, fontSize: 11 },
  ownedBadge: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: '#1a2e1a',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  hireBuyBtn: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  hireBuyText: { color: COLORS.bg, fontSize: 12, fontWeight: '800' },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 6,
  },
  statText: { color: COLORS.primaryLight, fontSize: 11, fontWeight: '600' },
  passiveText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginBottom: 3,
  },
  abilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.bgLight,
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
    marginBottom: 6,
  },
  abilityIcon: { fontSize: 18 },
  abilityName: { color: COLORS.gold, fontSize: 11, fontWeight: '700' },
  abilityDesc: { color: COLORS.textMuted, fontSize: 9 },
  cooldownText: { color: COLORS.textMuted, fontSize: 9, marginLeft: 'auto' },
  costRow: {
    flexDirection: 'row',
    gap: 10,
  },
  costText: { fontSize: 11, fontWeight: '600' },
});
