/**
 * MapControls — Zoom in/out buttons overlaid on the map.
 * Positioned bottom-right of the map area.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, RADIUS } from '../constants/theme';

interface Props {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCenterCastle: () => void;
}

export default function MapControls({ onZoomIn, onZoomOut, onCenterCastle }: Props) {
  return (
    <View style={styles.container} pointerEvents="box-none">
      <TouchableOpacity style={styles.btn} onPress={onCenterCastle} activeOpacity={0.7}>
        <Text style={styles.btnText}>🏰</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btn} onPress={onZoomIn} activeOpacity={0.7}>
        <Text style={styles.btnText}>+</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btn} onPress={onZoomOut} activeOpacity={0.7}>
        <Text style={styles.btnText}>−</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 10,
    bottom: 12,
    gap: 8,
    zIndex: 20,
  },
  btn: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bgLight + 'E8',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  btnText: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
});
