import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { COLORS } from '../constants/theme';
import {
  Season, WeatherType, SEASONS, WEATHER_TYPES, TURNS_PER_SEASON,
} from '../constants/weather';

interface Props {
  onPress?: () => void;
}

export default function WeatherBadge({ onPress }: Props) {
  const currentSeason = useGameStore(s => s.currentSeason) as Season;
  const currentWeather = useGameStore(s => s.currentWeather) as WeatherType;
  const seasonTurnCounter = useGameStore(s => s.seasonTurnCounter);

  const season = SEASONS[currentSeason];
  const weather = WEATHER_TYPES[currentWeather];
  const turnsLeft = TURNS_PER_SEASON - seasonTurnCounter;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.seasonIcon}>{season.icon}</Text>
      <View>
        <View style={styles.row}>
          <Text style={[styles.seasonText, { color: season.color }]}>{season.name}</Text>
          <Text style={styles.weatherIcon}>{weather.icon}</Text>
        </View>
        <Text style={styles.turnsText}>{turnsLeft} tur kaldi</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  seasonIcon: { fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  seasonText: { fontSize: 11, fontWeight: '700' },
  weatherIcon: { fontSize: 12 },
  turnsText: { color: COLORS.textMuted, fontSize: 8 },
});
