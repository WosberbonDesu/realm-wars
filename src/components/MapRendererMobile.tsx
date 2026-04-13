import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Polygon, Circle, Text as SvgText, Line, G } from 'react-native-svg';
import { HexTile } from '../types/game';
import { VoronoiGraph } from '../engine/voronoi';
import { VoronoiBurg, VoronoiState, VoronoiRiver } from '../engine/voronoiMapGenerator';
import { SEA_LEVEL } from '../engine/biomes';
import { cellKey } from '../engine/voronoiGrid';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Simplified biome colors
const BIOME_SIMPLE: Record<string, string> = {
  ocean: '#3870a4',
  coast: '#6fa8c4',
  plains: '#8db858',
  forest: '#2b8a3e',
  desert: '#e8c77b',
  mountain: '#8a7a6a',
  snow: '#c8d5d8',
  tundra: '#8a7252',
  swamp: '#2d7a45',
  lake: '#6db8d4',
};

// State overlay colors
const STATE_COLORS = [
  '#dababf', '#fb8072', '#80b1d3', '#fdb462', '#b3de69',
  '#fccde5', '#c6b9c1', '#bc80bd', '#ccebc5', '#ffed6f',
];

interface Props {
  graph: VoronoiGraph | null;
  cellTiles: HexTile[];
  burgs: VoronoiBurg[];
  rivers: VoronoiRiver[];
  states: VoronoiState[];
  stateMap: Map<string, number>;
  mapWidth: number;
  mapHeight: number;
  cameraX: number;
  cameraY: number;
  zoom: number;
  showBiomes: boolean;
  showBorders: boolean;
  showRivers: boolean;
  showBurgs: boolean;
}

export const MapRendererMobile: React.FC<Props> = ({
  graph, cellTiles, burgs, rivers, states, stateMap,
  mapWidth, mapHeight, cameraX, cameraY, zoom,
  showBiomes, showBorders, showRivers, showBurgs,
}) => {
  // Compute viewBox based on camera
  const vbX = mapWidth / 2 - cameraX - SCREEN_W / (2 * zoom);
  const vbY = mapHeight / 2 - cameraY - SCREEN_H / (2 * zoom);
  const vbW = SCREEN_W / zoom;
  const vbH = SCREEN_H / zoom;

  // Memoize cell polygons (expensive)
  const cellPolygons = useMemo(() => {
    if (!graph || !cellTiles.length) return [];
    return graph.cells.map((cell, i) => {
      if (cell.vertices.length < 3) return null;
      const tile = cellTiles[i];
      if (!tile) return null;

      const points = cell.vertices.map(v => `${v.x},${v.y}`).join(' ');

      // Determine color
      let color: string;
      if (tile.elevation < SEA_LEVEL) {
        color = tile.elevation < 0.18 ? '#3870a4' : '#6fa8c4';
      } else {
        color = showBiomes ? (BIOME_SIMPLE[tile.terrain] || '#8db858') : '#8db858';
      }

      // State overlay
      if (showBorders && tile.elevation >= SEA_LEVEL) {
        const sId = stateMap.get(cellKey(i));
        if (sId !== undefined && sId >= 0) {
          const stateColor = STATE_COLORS[sId % STATE_COLORS.length];
          // Blend state color with biome
          return { points, color, stateColor, index: i };
        }
      }

      return { points, color, stateColor: null, index: i };
    }).filter(Boolean);
  }, [graph, cellTiles, showBiomes, showBorders, stateMap]);

  // River paths
  const riverPaths = useMemo(() => {
    if (!graph || !showRivers) return [];
    return rivers.map(river => {
      if (river.path.length < 2) return null;
      const pts = river.path
        .map(ci => graph.cells[ci]?.center)
        .filter(Boolean);
      if (pts.length < 2) return null;
      return {
        points: pts.map(p => `${p!.x},${p!.y}`).join(' '),
        width: Math.min(3, 0.3 + Math.sqrt(river.flux) * 0.05),
      };
    }).filter(Boolean);
  }, [graph, rivers, showRivers]);

  if (!graph) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <Svg
        width={SCREEN_W}
        height={SCREEN_H}
        viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
      >
        {/* Biome cells */}
        {cellPolygons.map((cell: any) => (
          <React.Fragment key={cell.index}>
            <Polygon points={cell.points} fill={cell.color} stroke="none" />
            {cell.stateColor && (
              <Polygon points={cell.points} fill={cell.stateColor} opacity={0.3} stroke="none" />
            )}
          </React.Fragment>
        ))}

        {/* Rivers */}
        {riverPaths.map((rp: any, i: number) => (
          <Line
            key={`r${i}`}
            x1={0} y1={0} x2={0} y2={0}
            stroke="#5d97bb"
            strokeWidth={rp.width}
            strokeLinecap="round"
          />
        ))}

        {/* Burgs */}
        {showBurgs && burgs.map(burg => {
          const cell = graph.cells[burg.cellIndex];
          if (!cell) return null;
          const { x, y } = cell.center;
          const r = burg.isCapital ? 5 : burg.population > 3000 ? 3 : 2;
          return (
            <G key={`b${burg.id}`}>
              <Circle cx={x} cy={y} r={r} fill={burg.isCapital ? '#FFD700' : '#FFF'} stroke="#333" strokeWidth={0.5} />
              {(burg.isCapital || burg.population > 2000) && (
                <SvgText x={x} y={y - r - 3} fontSize={burg.isCapital ? 8 : 6} fill="#333" textAnchor="middle" fontWeight={burg.isCapital ? 'bold' : 'normal'}>
                  {burg.name}
                </SvgText>
              )}
            </G>
          );
        })}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a1520' },
});
