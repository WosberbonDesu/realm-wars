import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert,
} from 'react-native';
import { useGameStore } from '../store/gameStore';
import { Resources } from '../types/game';
import { COLORS, RESOURCE_COLORS, RESOURCE_ICONS } from '../constants/theme';
import {
  RelationType, RELATION_NAMES, RELATION_ICONS, RELATION_COLORS,
} from '../constants/diplomacy';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function DiplomacyModal({ visible, onClose }: Props) {
  const currentPlayerId = useGameStore(s => s.currentPlayerId);
  const players = useGameStore(s => s.players);
  const proposals = useGameStore(s => s.proposals);
  const getRelation = useGameStore(s => s.getRelation);
  const proposeNonAggression = useGameStore(s => s.proposeNonAggression);
  const proposeAlliance = useGameStore(s => s.proposeAlliance);
  const declareWar = useGameStore(s => s.declareWar);
  const offerTribute = useGameStore(s => s.offerTribute);
  const acceptProposal = useGameStore(s => s.acceptProposal);
  const rejectProposal = useGameStore(s => s.rejectProposal);
  const relations = useGameStore(s => s.relations);

  const otherPlayers = players.filter(p => p.id !== currentPlayerId && p.castleCoord !== null);
  const myProposals = proposals.filter(p => p.toId === currentPlayerId);

  const handleDeclareWar = (targetId: string, name: string) => {
    Alert.alert(
      'Savas Ilani',
      `${name}'a savas ilan etmek istediginize emin misiniz?`,
      [
        { text: 'Iptal', style: 'cancel' },
        { text: 'Savas!', style: 'destructive', onPress: () => declareWar(targetId) },
      ]
    );
  };

  const handleTribute = (targetId: string) => {
    offerTribute(targetId, { gold: 50 });
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <View style={styles.header}>
            <Text style={styles.title}>Diplomasi</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeText}>Kapat</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Gelen teklifler */}
            {myProposals.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Gelen Teklifler</Text>
                {myProposals.map(prop => {
                  const from = players.find(p => p.id === prop.fromId);
                  const actionText = prop.action === 'propose_alliance' ? 'Ittifak' : 'Saldirmazlik';
                  return (
                    <View key={prop.id} style={styles.proposalCard}>
                      <View style={styles.proposalInfo}>
                        <View style={[styles.dot, { backgroundColor: from?.color }]} />
                        <Text style={styles.proposalText}>
                          {from?.name} {actionText} teklif ediyor
                        </Text>
                        <Text style={styles.turnsLeft}>{prop.turnsLeft} tur</Text>
                      </View>
                      <View style={styles.proposalActions}>
                        <TouchableOpacity
                          style={styles.acceptBtn}
                          onPress={() => acceptProposal(prop.id)}
                        >
                          <Text style={styles.acceptText}>Kabul</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.rejectBtn}
                          onPress={() => rejectProposal(prop.id)}
                        >
                          <Text style={styles.rejectText}>Reddet</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </>
            )}

            {/* Oyuncu ilişkileri */}
            <Text style={styles.sectionTitle}>Iliskiler</Text>
            {otherPlayers.map(target => {
              const rel = getRelation(currentPlayerId, target.id) as RelationType;
              const relName = RELATION_NAMES[rel] ?? 'Tarafsiz';
              const relIcon = RELATION_ICONS[rel] ?? '😐';
              const relColor = RELATION_COLORS[rel] ?? '#A0B0C0';

              // Aktif ilişki süresi
              const activeRel = relations.find(
                r => r.playerId === currentPlayerId && r.targetId === target.id
              );
              const turnsLeft = activeRel?.turnsRemaining ?? 0;

              const isNeutral = rel === RelationType.Neutral;
              const isNonAgg = rel === RelationType.NonAggression;
              const isAlliance = rel === RelationType.Alliance;
              const isWar = rel === RelationType.War;

              return (
                <View key={target.id} style={styles.playerCard}>
                  {/* Oyuncu bilgisi */}
                  <View style={styles.playerTop}>
                    <View style={[styles.playerDot, { backgroundColor: target.color }]} />
                    <View style={styles.playerInfo}>
                      <Text style={styles.playerName}>{target.name}</Text>
                      <View style={styles.relBadge}>
                        <Text style={styles.relIcon}>{relIcon}</Text>
                        <Text style={[styles.relText, { color: relColor }]}>{relName}</Text>
                        {turnsLeft > 0 && (
                          <Text style={styles.relTurns}>({turnsLeft} tur)</Text>
                        )}
                      </View>
                    </View>
                    <Text style={styles.territoryText}>
                      {target.territory.length} hex
                    </Text>
                  </View>

                  {/* Aksiyon butonları */}
                  <View style={styles.actionRow}>
                    {isNeutral && (
                      <TouchableOpacity
                        style={[styles.actionBtn, { borderColor: '#4AD97A' }]}
                        onPress={() => proposeNonAggression(target.id)}
                      >
                        <Text style={[styles.actionText, { color: '#4AD97A' }]}>Saldirmazlik</Text>
                      </TouchableOpacity>
                    )}
                    {isNonAgg && (
                      <TouchableOpacity
                        style={[styles.actionBtn, { borderColor: '#FFD700' }]}
                        onPress={() => proposeAlliance(target.id)}
                      >
                        <Text style={[styles.actionText, { color: '#FFD700' }]}>Ittifak</Text>
                      </TouchableOpacity>
                    )}
                    {!isWar && (
                      <TouchableOpacity
                        style={[styles.actionBtn, { borderColor: '#D94A4A' }]}
                        onPress={() => handleDeclareWar(target.id, target.name)}
                      >
                        <Text style={[styles.actionText, { color: '#D94A4A' }]}>Savas</Text>
                      </TouchableOpacity>
                    )}
                    {!isWar && (
                      <TouchableOpacity
                        style={[styles.actionBtn, { borderColor: '#D4A843' }]}
                        onPress={() => handleTribute(target.id)}
                      >
                        <Text style={[styles.actionText, { color: '#D4A843' }]}>Harac (50g)</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}

            {otherPlayers.length === 0 && (
              <Text style={styles.emptyText}>Hic rakip kalmadi.</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: COLORS.bgOverlay, justifyContent: 'flex-end' },
  panel: {
    backgroundColor: COLORS.bgLight,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 36,
    maxHeight: '80%',
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
  title: { color: COLORS.gold, fontSize: 18, fontWeight: '800' },
  closeText: { color: COLORS.textMuted, fontSize: 14 },
  content: { paddingHorizontal: 16, paddingTop: 4 },
  sectionTitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 14,
    marginBottom: 8,
  },
  // Teklifler
  proposalCard: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  proposalInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  proposalText: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '600', flex: 1 },
  turnsLeft: { color: COLORS.textMuted, fontSize: 10 },
  proposalActions: { flexDirection: 'row', gap: 10 },
  acceptBtn: {
    flex: 1,
    backgroundColor: '#1a2e1a',
    borderWidth: 1,
    borderColor: '#4AD97A',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptText: { color: '#4AD97A', fontSize: 13, fontWeight: '700' },
  rejectBtn: {
    flex: 1,
    backgroundColor: '#2e1a1a',
    borderWidth: 1,
    borderColor: '#D94A4A',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectText: { color: '#D94A4A', fontSize: 13, fontWeight: '700' },
  // Oyuncu kartları
  playerCard: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  playerTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  playerDot: { width: 12, height: 12, borderRadius: 6 },
  playerInfo: { flex: 1 },
  playerName: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
  relBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  relIcon: { fontSize: 12 },
  relText: { fontSize: 11, fontWeight: '600' },
  relTurns: { color: COLORS.textMuted, fontSize: 9 },
  territoryText: { color: COLORS.textMuted, fontSize: 11 },
  actionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: COLORS.bgLight,
  },
  actionText: { fontSize: 11, fontWeight: '700' },
  emptyText: { color: COLORS.textMuted, textAlign: 'center', paddingVertical: 20 },
});
