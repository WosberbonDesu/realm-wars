import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { COLORS } from '../constants/theme';
import { t } from '../i18n';
import {
  Season, WeatherType, SEASONS, WEATHER_TYPES, TURNS_PER_SEASON,
} from '../constants/weather';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function WeatherInfoModal({ visible, onClose }: Props) {
  const currentSeason = useGameStore(s => s.currentSeason) as Season;
  const currentWeather = useGameStore(s => s.currentWeather) as WeatherType;
  const seasonTurnCounter = useGameStore(s => s.seasonTurnCounter);

  const season = SEASONS[currentSeason];
  const weather = WEATHER_TYPES[currentWeather];
  const turnsLeft = TURNS_PER_SEASON - seasonTurnCounter;

  // Toplam etkiler
  const totalMove = season.moveCostMultiplier + weather.moveCostBonus;
  const totalAtk = season.attackModifier + weather.attackBonus;
  const totalDef = season.defenseModifier + weather.defenseBonus;
  const totalVis = season.visibilityModifier + weather.visibilityBonus;
  const totalFood = season.foodProductionMultiplier;

  const formatMod = (val: number, suffix = '') => {
    if (val > 0) return `+${Math.round(val * 100)}%${suffix}`;
    if (val < 0) return `${Math.round(val * 100)}%${suffix}`;
    return `0%${suffix}`;
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.panel}>
          {/* Mevsim */}
          <View style={styles.seasonHeader}>
            <Text style={styles.bigIcon}>{season.icon}</Text>
            <Text style={[styles.seasonName, { color: season.color }]}>{season.name}</Text>
            <Text style={styles.turnsLeft}>{t('weather.turnsLeft', { n: turnsLeft })}</Text>
          </View>
          <Text style={styles.desc}>{season.description}</Text>

          {/* Hava durumu */}
          <View style={styles.weatherRow}>
            <Text style={styles.weatherIcon}>{weather.icon}</Text>
            <Text style={styles.weatherName}>{weather.name}</Text>
          </View>
          <Text style={styles.descSmall}>{weather.description}</Text>

          {/* Toplam etkiler */}
          <View style={styles.effectsGrid}>
            <EffectRow label={t('weather.moveCost')} value={`x${totalMove.toFixed(1)}`} bad={totalMove > 1} />
            <EffectRow label={t('weather.attack')} value={formatMod(totalAtk)} bad={totalAtk < 0} />
            <EffectRow label={t('weather.defense')} value={formatMod(totalDef)} bad={totalDef < 0} />
            <EffectRow label={t('weather.visibility')} value={`${totalVis >= 0 ? '+' : ''}${totalVis}`} bad={totalVis < 0} />
            <EffectRow label={t('weather.foodProd')} value={`x${totalFood.toFixed(1)}`} bad={totalFood < 1} />
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>{t('weather.ok')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function EffectRow({ label, value, bad }: { label: string; value: string; bad: boolean }) {
  return (
    <View style={styles.effectRow}>
      <Text style={styles.effectLabel}>{label}</Text>
      <Text style={[styles.effectValue, { color: bad ? COLORS.red : COLORS.green }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.bgOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  panel: {
    width: '100%',
    backgroundColor: COLORS.bgLight,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  seasonHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  bigIcon: { fontSize: 42, marginBottom: 4 },
  seasonName: { fontSize: 22, fontWeight: '900' },
  turnsLeft: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  desc: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 4,
  },
  weatherIcon: { fontSize: 20 },
  weatherName: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
  descSmall: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 16,
  },
  effectsGrid: {
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  effectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  effectLabel: { color: COLORS.textSecondary, fontSize: 12 },
  effectValue: { fontSize: 13, fontWeight: '700' },
  closeBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeBtnText: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
});
