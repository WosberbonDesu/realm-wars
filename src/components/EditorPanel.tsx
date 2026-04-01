import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, Modal } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { VoronoiBurg, VoronoiState } from '../engine/voronoiMapGenerator';

type EditorTool = 'none' | 'addBurg' | 'addMarker' | 'rename' | 'info';

const MARKER_OPTIONS = [
  { icon: '🐉', name: 'Ejderha Yuvasi' },
  { icon: '👹', name: 'Ork Kampi' },
  { icon: '🧙', name: 'Buyucu Kulesi' },
  { icon: '💀', name: 'Lanetli Topraklar' },
  { icon: '🏛️', name: 'Kadim Tapinak' },
  { icon: '🌋', name: 'Ates Dagi' },
  { icon: '🕳️', name: 'Karanlik Portal' },
  { icon: '🧝', name: 'Elf Ormani' },
  { icon: '⛏️', name: 'Cuceler Madeni' },
  { icon: '🏰', name: 'Terk Edilmis Kale' },
  { icon: '🦑', name: 'Deniz Canavari' },
  { icon: '🌊', name: 'Cthulhu Tapinagi' },
  { icon: '⚔️', name: 'Savas Alani' },
  { icon: '🐺', name: 'Kurt Adam Bolgesi' },
  { icon: '👻', name: 'Hayalet Sehir' },
];

export const EditorPanel: React.FC = () => {
  const [activeTool, setActiveTool] = useState<EditorTool>('none');
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ type: 'burg' | 'state'; id: number } | null>(null);
  const [newName, setNewName] = useState('');
  const [showMarkerPicker, setShowMarkerPicker] = useState(false);
  const [selectedMarkerIcon, setSelectedMarkerIcon] = useState('🐉');

  const selectedCell = useGameStore(s => s.selectedCell);
  const cellTiles = useGameStore(s => s.cellTiles);
  const burgs = useGameStore(s => s.burgs);
  const states = useGameStore(s => s.states);
  const stateMap = useGameStore(s => s.stateMap);

  const store = useGameStore;

  // Seçili hücre bilgisi
  const selectedTile = selectedCell !== null && selectedCell >= 0 ? cellTiles[selectedCell] : null;
  const selectedBurg = burgs.find(b => b.cellIndex === selectedCell);
  const selectedStateId = selectedCell !== null ? stateMap.get(`v${selectedCell}`) : undefined;
  const selectedState = selectedStateId !== undefined ? states[selectedStateId] : undefined;

  const handleAddBurg = () => {
    if (selectedCell === null || !selectedTile || selectedTile.elevation < 0.2) return;
    if (selectedBurg) return; // zaten burg var

    const newBurg: VoronoiBurg = {
      id: burgs.length,
      cellIndex: selectedCell,
      name: `Yeni Sehir ${burgs.length + 1}`,
      population: 1000,
      isCapital: false,
      stateId: selectedStateId ?? -1,
      port: selectedTile.isCoast,
      score: 5,
    };

    // Store'u güncelle
    useGameStore.setState({ burgs: [...burgs, newBurg] });
  };

  const handleRename = () => {
    if (!renameTarget || !newName.trim()) return;

    if (renameTarget.type === 'burg') {
      const updated = burgs.map(b =>
        b.id === renameTarget.id ? { ...b, name: newName.trim() } : b
      );
      useGameStore.setState({ burgs: updated });
    } else if (renameTarget.type === 'state') {
      const updated = states.map(s =>
        s.id === renameTarget.id ? { ...s, name: newName.trim() } : s
      );
      useGameStore.setState({ states: updated });
    }

    setShowRenameModal(false);
    setRenameTarget(null);
    setNewName('');
  };

  const handleAddMarker = () => {
    if (selectedCell === null) return;
    const customMarkers = useGameStore.getState().customMarkers;
    const marker = {
      cellIndex: selectedCell,
      icon: selectedMarkerIcon,
      name: MARKER_OPTIONS.find(m => m.icon === selectedMarkerIcon)?.name || 'Bilinmeyen',
    };
    useGameStore.setState({ customMarkers: [...customMarkers, marker] });
    setShowMarkerPicker(false);
  };

  return (
    <View style={styles.container}>
      {/* Araç çubuğu */}
      <View style={styles.toolbar}>
        <Text style={styles.toolbarTitle}>Duzenleyici</Text>

        <ToolBtn
          icon="🏘️" label="Sehir Ekle"
          active={activeTool === 'addBurg'}
          onPress={() => {
            if (activeTool === 'addBurg') { setActiveTool('none'); }
            else { setActiveTool('addBurg'); handleAddBurg(); }
          }}
        />

        <ToolBtn
          icon="📍" label="Marker Ekle"
          active={activeTool === 'addMarker'}
          onPress={() => {
            setActiveTool('addMarker');
            setShowMarkerPicker(true);
          }}
        />

        {selectedBurg && (
          <ToolBtn
            icon="✏️" label="Sehir Adini Degistir"
            onPress={() => {
              setRenameTarget({ type: 'burg', id: selectedBurg.id });
              setNewName(selectedBurg.name);
              setShowRenameModal(true);
            }}
          />
        )}

        {selectedState && (
          <ToolBtn
            icon="🏴" label="Devlet Adini Degistir"
            onPress={() => {
              setRenameTarget({ type: 'state', id: selectedState.id });
              setNewName(selectedState.name);
              setShowRenameModal(true);
            }}
          />
        )}
      </View>

      {/* Seçili hücre bilgisi */}
      {selectedTile && (
        <View style={styles.infoBox}>
          {selectedBurg && (
            <Text style={styles.infoTitle}>🏘️ {selectedBurg.name} {selectedBurg.isCapital ? '(Baskent)' : ''}</Text>
          )}
          {selectedState && (
            <Text style={styles.infoState}>🏴 {selectedState.name}</Text>
          )}
          <Text style={styles.infoText}>
            Biome: {selectedTile.biomeName} | Yukseklik: {(selectedTile.elevation * 100).toFixed(0)}m
          </Text>
          <Text style={styles.infoText}>
            Sicaklik: {(selectedTile.temperature * 40).toFixed(0)}° | Nem: {(selectedTile.moisture * 100).toFixed(0)}%
            {selectedTile.hasRiver ? ' | 🌊 Nehir' : ''}
          </Text>
        </View>
      )}

      {/* İsimlendirme modalı */}
      {showRenameModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {renameTarget?.type === 'burg' ? 'Sehir Adini Degistir' : 'Devlet Adini Degistir'}
            </Text>
            <TextInput
              style={styles.input}
              value={newName}
              onChangeText={setNewName}
              placeholder="Yeni isim girin..."
              placeholderTextColor="#607080"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowRenameModal(false)}>
                <Text style={styles.cancelText}>Iptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleRename}>
                <Text style={styles.confirmText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Marker seçici */}
      {showMarkerPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Marker Sec</Text>
            <View style={styles.markerGrid}>
              {MARKER_OPTIONS.map((m, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.markerOption, selectedMarkerIcon === m.icon && styles.markerOptionActive]}
                  onPress={() => setSelectedMarkerIcon(m.icon)}
                >
                  <Text style={styles.markerIcon}>{m.icon}</Text>
                  <Text style={styles.markerName}>{m.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowMarkerPicker(false)}>
                <Text style={styles.cancelText}>Iptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleAddMarker}>
                <Text style={styles.confirmText}>Ekle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const ToolBtn: React.FC<{ icon: string; label: string; active?: boolean; onPress: () => void }> = ({
  icon, label, active, onPress,
}) => (
  <TouchableOpacity style={[styles.toolBtn, active && styles.toolBtnActive]} onPress={onPress}>
    <Text style={styles.toolIcon}>{icon}</Text>
    <Text style={[styles.toolLabel, active && styles.toolLabelActive]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    pointerEvents: 'box-none',
  },
  toolbar: {
    position: 'absolute', bottom: 8, left: 8,
    backgroundColor: 'rgba(15,25,40,0.92)', borderRadius: 12,
    padding: 8, flexDirection: 'row', gap: 6, alignItems: 'center',
    borderWidth: 1, borderColor: '#2a3a4a',
  },
  toolbarTitle: {
    color: '#8aa0b8', fontSize: 10, fontWeight: '700', marginRight: 4,
  },
  toolBtn: {
    backgroundColor: '#1a2a3a', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 5,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#2a3a4a',
  },
  toolBtnActive: {
    backgroundColor: '#2a4a6a', borderColor: '#4a90d9',
  },
  toolIcon: { fontSize: 14 },
  toolLabel: { color: '#607080', fontSize: 10, fontWeight: '600' },
  toolLabelActive: { color: '#8ac4ff' },
  infoBox: {
    position: 'absolute', bottom: 55, left: 8, right: 200,
    backgroundColor: 'rgba(15,25,40,0.92)', borderRadius: 12,
    padding: 10, borderWidth: 1, borderColor: '#2a3a4a',
  },
  infoTitle: { color: '#FFD700', fontSize: 13, fontWeight: '700' },
  infoState: { color: '#8aa0b8', fontSize: 11, fontWeight: '600' },
  infoText: { color: '#607080', fontSize: 10 },
  modalOverlay: {
    position: 'absolute', top: -500, left: 0, right: 0, bottom: 0,
    height: 1000, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center',
  },
  modal: {
    width: 320, backgroundColor: '#1a2a3a', borderRadius: 16,
    padding: 20, borderWidth: 1, borderColor: '#3a5a7a',
  },
  modalTitle: { color: '#FFD700', fontSize: 16, fontWeight: '800', marginBottom: 12 },
  input: {
    backgroundColor: '#0f1f2f', borderRadius: 10, padding: 12,
    color: '#fff', fontSize: 14, borderWidth: 1, borderColor: '#2a4a6a',
    marginBottom: 12,
  },
  modalButtons: { flexDirection: 'row', gap: 8 },
  cancelBtn: {
    flex: 1, backgroundColor: '#2a3a4a', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  cancelText: { color: '#8aa0b8', fontSize: 13, fontWeight: '600' },
  confirmBtn: {
    flex: 1, backgroundColor: '#4a90d9', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  confirmText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  markerGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12,
  },
  markerOption: {
    backgroundColor: '#0f1f2f', borderRadius: 8, padding: 6,
    alignItems: 'center', width: 70, borderWidth: 1, borderColor: '#2a3a4a',
  },
  markerOptionActive: { borderColor: '#FFD700', backgroundColor: '#1a2a4a' },
  markerIcon: { fontSize: 20 },
  markerName: { color: '#607080', fontSize: 7, textAlign: 'center' },
});
