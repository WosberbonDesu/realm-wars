import { HexTerrain, HexCoord } from './game';

/** Harita şablonu — hem preset hem custom haritalar için */
export interface MapTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  author: string;             // 'system' veya oyuncu adı
  createdAt: number;
  radius: number;
  playerCount: number;        // 2-4
  startPositions: HexCoord[];
  /** Terrain verisi: [q, r, terrain] üçlüleri */
  terrainData: [number, number, HexTerrain][];
  /** Prosedürel mi yoksa elle mi çizilmiş */
  generatorType: 'procedural' | 'custom';
  /** Prosedürel ise seed */
  generatorSeed?: number;
  tags: string[];
}

/** Editör araç tipleri */
export type EditorTool = 'single' | 'brush' | 'fill' | 'eraser' | 'startPos';

/** Editör state */
export interface EditorState {
  mapName: string;
  radius: number;
  selectedTerrain: HexTerrain;
  tool: EditorTool;
  brushSize: number;          // 1, 2, 3
  terrainMap: Map<string, HexTerrain>;
  startPositions: HexCoord[];
  undoStack: Map<string, HexTerrain>[];
  redoStack: Map<string, HexTerrain>[];
}
