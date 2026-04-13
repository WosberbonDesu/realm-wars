import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { COLORS, SPACING, RADIUS, SHADOW, FONT, SHARED } from '../constants/theme';

const BIOME_LEGEND = [
  { color: '#8fb8d4', label: 'Sığ Deniz' },
  { color: '#3870a4', label: 'Derin Deniz' },
  { color: '#6db8d4', label: 'Göl' },
  { color: '#e8c77b', label: 'Sıcak Çöl' },
  { color: '#b5a882', label: 'Soğuk Çöl' },
  { color: '#c9bf6b', label: 'Savan' },
  { color: '#8db858', label: 'Çayırlık' },
  { color: '#6da842', label: 'Tropik Orman' },
  { color: '#2b8a3e', label: 'Ilıman Orman' },
  { color: '#3da33a', label: 'Yağmur Ormanı' },
  { color: '#1e7a2e', label: 'Ilıman Yağmur Ormanı' },
  { color: '#3a5e28', label: 'Taiga' },
  { color: '#8a7252', label: 'Tundra' },
  { color: '#c8d5d8', label: 'Buzul' },
  { color: '#2d7a45', label: 'Bataklık' },
];

const ELEVATION_LEGEND = [
  { color: '#0f3268', label: 'Derin Okyanus' },
  { color: '#5087b4', label: 'Sığ Su' },
  { color: '#4a9a3a', label: 'Ova (0-200m)' },
  { color: '#b0c84a', label: 'Tepe (200-500m)' },
  { color: '#d4a050', label: 'Yayla (500-700m)' },
  { color: '#b47050', label: 'Dağ (700-850m)' },
  { color: '#e8e8f0', label: 'Zirve (850m+)' },
];

const SYMBOL_LEGEND = [
  { icon: '🏰', label: 'Başkent' },
  { icon: '🏘️', label: 'Büyük Şehir' },
  { icon: '🏠', label: 'Kasaba' },
  { icon: '🛖', label: 'Köy' },
  { icon: '⚓', label: 'Liman' },
  { icon: '🐉', label: 'Ejderha Yuvası' },
  { icon: '⚔️', label: 'Savaş Alanı' },
  { icon: '🧙', label: 'Büyücü Kulesi' },
  { icon: '▲', label: 'Dağ' },
  { icon: '🌲', label: 'Orman' },
];

export const LegendPanel: React.FC = () => {
  const showLegend = useGameStore(s => s.showLegend);
  const toggleLayer = useGameStore(s => s.toggleLayer);

  if (!showLegend) return null;

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => toggleLayer('showLegend')} />
      <View style={styles.modal}>
        <View style={styles.header}>
          <Text style={styles.title}>Harita Lejandi</Text>
          <TouchableOpacity style={SHARED.closeBtn} onPress={() => toggleLayer('showLegend')}>
            <Text style={SHARED.closeTxt}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
          <Text style={styles.sectionTitle}>Biyomlar</Text>
          <View style={styles.grid}>
            {BIOME_LEGEND.map((item, i) => (
              <View key={i} style={styles.legendRow}>
                <View style={[styles.colorBox, { backgroundColor: item.color }]} />
                <Text style={styles.legendText}>{item.label}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Yükseklik</Text>
          <View style={styles.grid}>
            {ELEVATION_LEGEND.map((item, i) => (
              <View key={i} style={styles.legendRow}>
                <View style={[styles.colorBox, { backgroundColor: item.color }]} />
                <Text style={styles.legendText}>{item.label}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Semboller</Text>
          <View style={styles.grid}>
            {SYMBOL_LEGEND.map((item, i) => (
              <View key={i} style={styles.legendRow}>
                <Text style={styles.symbolIcon}>{item.icon}</Text>
                <Text style={styles.legendText}>{item.label}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center', zIndex: 50,
  },
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: COLORS.bgOverlay,
  },
  modal: {
    width: 340, backgroundColor: COLORS.surfaceOverlay,
    borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.borderSolid,
    maxHeight: '85%',
    ...SHADOW.panel,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md,
  },
  title: { color: COLORS.gold, fontSize: 18, fontWeight: '800' },
  sectionTitle: {
    color: COLORS.gold, fontSize: 12, fontWeight: '700', marginTop: 10, marginBottom: 6,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderSolid, paddingBottom: SPACING.xs,
  },
  grid: { gap: 3 },
  legendRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 2,
  },
  colorBox: { width: 16, height: 12, borderRadius: 3, borderWidth: 1, borderColor: '#FFF2' },
  symbolIcon: { fontSize: 14, width: 18, textAlign: 'center' },
  legendText: { color: COLORS.textSecondary, fontSize: 11 },
});
