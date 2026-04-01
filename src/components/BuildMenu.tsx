import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { COLORS } from '../constants/theme';

export const BuildMenu: React.FC = () => {
  const showBuildMenu = useGameStore(s => s.showBuildMenu);
  const toggleBuildMenu = useGameStore(s => s.toggleBuildMenu);

  if (!showBuildMenu) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.panel}>
        <View style={styles.header}>
          <Text style={styles.title}>Bina Insaasi</Text>
          <TouchableOpacity onPress={toggleBuildMenu}>
            <Text style={styles.closeBtn}>X</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.emptyText}>Voronoi sistemde yapi modu henuz aktif degil</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  panel: { width: '85%', backgroundColor: '#1A2332', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#2A3A4A' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { color: '#D4A843', fontSize: 18, fontWeight: '800' },
  closeBtn: { color: '#607080', fontSize: 20, fontWeight: '700', padding: 4 },
  emptyText: { color: '#607080', fontSize: 14, textAlign: 'center', padding: 20 },
});
