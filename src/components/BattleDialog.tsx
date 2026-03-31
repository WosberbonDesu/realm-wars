import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { COLORS } from '../constants/theme';

export const BattleDialog: React.FC = () => {
  const showBattleResult = useGameStore(s => s.showBattleResult);
  const lastBattle = useGameStore(s => s.lastBattle);
  const dismissBattle = useGameStore(s => s.dismissBattle);

  if (!showBattleResult || !lastBattle) return null;

  const won = lastBattle.winner === 'attacker';

  return (
    <View style={styles.overlay}>
      <View style={styles.panel}>
        <Text style={[styles.title, { color: won ? COLORS.green : COLORS.red }]}>
          {won ? 'ZAFER!' : 'BOZGUN!'}
        </Text>

        <View style={styles.statsContainer}>
          <View style={styles.side}>
            <Text style={styles.sideTitle}>Saldiran</Text>
            <Text style={styles.lossText}>
              Kayip: %{(lastBattle.attackerLosses * 100).toFixed(0)}
            </Text>
            <Text style={styles.survivorText}>
              Kalan: {lastBattle.attackerSurvivors.reduce((s, u) => s + u.count, 0)} birim
            </Text>
          </View>

          <Text style={styles.vs}>VS</Text>

          <View style={styles.side}>
            <Text style={styles.sideTitle}>Savunan</Text>
            <Text style={styles.lossText}>
              Kayip: %{(lastBattle.defenderLosses * 100).toFixed(0)}
            </Text>
            <Text style={styles.survivorText}>
              Kalan: {lastBattle.defenderSurvivors.reduce((s, u) => s + u.count, 0)} birim
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.button} onPress={dismissBattle}>
          <Text style={styles.buttonText}>TAMAM</Text>
        </TouchableOpacity>
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
    width: '80%',
    backgroundColor: COLORS.bgLight,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.gold,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 16,
    letterSpacing: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  side: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.bgPanel,
    borderRadius: 12,
    padding: 12,
  },
  sideTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  lossText: {
    color: COLORS.red,
    fontSize: 13,
    fontWeight: '600',
  },
  survivorText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  vs: {
    color: COLORS.gold,
    fontSize: 20,
    fontWeight: '900',
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
});
