import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { COLORS, FONT, SPACE, RADIUS } from '../constants/theme';
import { VICTORY_CONDITIONS, VictoryType } from '../constants/victory';
import AnimatedButton from './AnimatedButton';
import { useI18n } from '../i18n/useI18n';

interface Props {
  onBackToMenu: () => void;
}

export default function GameOverScreen({ onBackToMenu }: Props) {
  const { t } = useI18n();
  const turn = useGameStore(s => s.turn);
  const players = useGameStore(s => s.players);
  const victoryInfo = useGameStore(s => s.victoryInfo);
  const map = useGameStore(s => s.map);

  const winner = victoryInfo
    ? players.find(p => p.id === victoryInfo.winnerId)
    : players.find(p => p.castleCoord !== null);
  const victory = victoryInfo
    ? VICTORY_CONDITIONS[victoryInfo.victoryType as VictoryType]
    : null;
  const isPlayerWin = winner && !winner.isBot;

  // Oyuncu istatistikleri
  const stats = useMemo(() => {
    return players.map(p => {
      // Bina sayilari
      let buildingCount = 0;
      let totalProduction = 0;
      for (const coord of p.territory) {
        const tile = map.get(`${coord.q},${coord.r}`);
        if (tile?.building && tile.building.ownerId === p.id) {
          buildingCount++;
          const prod = tile.building.productionPerTick;
          totalProduction += (prod.gold ?? 0) + (prod.iron ?? 0) + (prod.food ?? 0) + (prod.wood ?? 0) + (prod.stone ?? 0);
        }
      }

      // Ordu gucu
      let armyPower = 0;
      let totalUnits = 0;
      for (const [, tile] of map) {
        if (tile.army?.ownerId === p.id) {
          armyPower += tile.army.totalPower;
          totalUnits += tile.army.units.reduce((s, u) => s + u.count, 0);
        }
      }

      // Toplam kaynak
      const totalResources = p.resources.gold + p.resources.iron + p.resources.food + p.resources.wood + p.resources.stone;

      return {
        player: p,
        territory: p.territory.length,
        buildings: buildingCount,
        production: totalProduction,
        armyPower,
        totalUnits,
        totalResources,
        techs: p.researchedTechs.length,
        heroes: p.heroes.length,
        alive: p.castleCoord !== null,
      };
    }).sort((a, b) => {
      // Kazanan en uste
      if (a.player.id === winner?.id) return -1;
      if (b.player.id === winner?.id) return 1;
      // Sonra toprak buyuklugu
      return b.territory - a.territory;
    });
  }, [players, map, winner]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Zafer baslik */}
        {victory && <Text style={styles.victoryIcon}>{victory.icon}</Text>}
        <Text style={[styles.title, victory && { color: victory.color }]}>
          {isPlayerWin ? t('gameover.victory') : victory ? victory.name : t('gameover.victory')}
        </Text>
        <Text style={styles.winnerName}>
          {winner ? t('gameover.winner', { name: winner.name }) : t('gameover.draw')}
        </Text>
        {victory && <Text style={styles.victoryDesc}>{victory.description}</Text>}

        {/* Genel istatistikler */}
        <View style={styles.summaryRow}>
          <StatBox label={t('gameover.totalTurns')} value={`${turn}`} icon="🕐" />
          <StatBox label={t('gameover.players')} value={`${players.length}`} icon="👥" />
          <StatBox label={t('gameover.map')} value={`${map.size} hex`} icon="🗺️" />
        </View>

        {/* Oyuncu siralama */}
        <Text style={styles.sectionTitle}>{t('gameover.rankings')}</Text>
        {stats.map((s, rank) => (
          <View
            key={s.player.id}
            style={[
              styles.playerCard,
              s.player.id === winner?.id && styles.winnerCard,
              !s.alive && styles.eliminatedCard,
            ]}
          >
            <View style={styles.playerHeader}>
              <Text style={styles.rankText}>#{rank + 1}</Text>
              <View style={[styles.playerDot, { backgroundColor: s.player.color }]} />
              <Text style={[styles.playerName, !s.alive && styles.deadText]}>
                {s.player.name}
              </Text>
              {s.player.isBot && <Text style={styles.botBadge}>{t('gameover.bot')}</Text>}
              {!s.alive && <Text style={styles.elimBadge}>{t('gameover.eliminated')}</Text>}
              {s.player.id === winner?.id && <Text style={styles.winBadge}>{t('gameover.winnerBadge')}</Text>}
            </View>

            <View style={styles.statsGrid}>
              <MiniStat icon="🏠" label={t('gameover.territory')} value={s.territory} />
              <MiniStat icon="🏗️" label={t('gameover.buildings')} value={s.buildings} />
              <MiniStat icon="⚔️" label={t('gameover.units')} value={s.totalUnits} />
              <MiniStat icon="💪" label={t('gameover.power')} value={s.armyPower} />
              <MiniStat icon="💰" label={t('gameover.resources')} value={s.totalResources} />
              <MiniStat icon="🔬" label={t('gameover.techStat')} value={s.techs} />
              <MiniStat icon="📈" label={t('gameover.production')} value={`${s.production}/t`} />
              <MiniStat icon="🦸" label={t('gameover.heroes')} value={s.heroes} />
            </View>
          </View>
        ))}

        <AnimatedButton
          label={t('gameover.mainMenu')}
          onPress={onBackToMenu}
          variant="primary"
          style={{ marginTop: SPACE.xl }}
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function StatBox({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MiniStat({ icon, label, value }: { icon: string; label: string; value: number | string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniIcon}>{icon}</Text>
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    paddingHorizontal: SPACE.lg,
    paddingTop: 60,
    alignItems: 'center',
  },
  victoryIcon: { fontSize: 64, marginBottom: SPACE.md },
  title: {
    fontSize: 32,
    fontWeight: FONT.black,
    color: COLORS.gold,
    textAlign: 'center',
  },
  winnerName: {
    fontSize: FONT.h2,
    fontWeight: FONT.bold,
    color: COLORS.textPrimary,
    marginTop: SPACE.sm,
  },
  victoryDesc: {
    color: COLORS.textSecondary,
    fontSize: FONT.body,
    textAlign: 'center',
    marginTop: SPACE.xs,
    marginBottom: SPACE.lg,
  },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    gap: SPACE.md,
    marginVertical: SPACE.lg,
    width: '100%',
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md,
    padding: SPACE.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statIcon: { fontSize: 20, marginBottom: SPACE.xs },
  statValue: { color: COLORS.textPrimary, fontSize: FONT.h3, fontWeight: FONT.black },
  statLabel: { color: COLORS.textMuted, fontSize: FONT.tiny, marginTop: 2 },

  // Section
  sectionTitle: {
    color: COLORS.textMuted,
    fontSize: FONT.tiny,
    fontWeight: FONT.bold,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    alignSelf: 'flex-start',
    marginBottom: SPACE.sm,
  },

  // Player cards
  playerCard: {
    width: '100%',
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACE.lg,
    marginBottom: SPACE.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  winnerCard: {
    borderColor: COLORS.gold,
    borderWidth: 2,
  },
  eliminatedCard: {
    opacity: 0.5,
  },
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    marginBottom: SPACE.md,
  },
  rankText: {
    color: COLORS.textMuted,
    fontSize: FONT.h3,
    fontWeight: FONT.black,
    width: 28,
  },
  playerDot: { width: 12, height: 12, borderRadius: 6 },
  playerName: { color: COLORS.textPrimary, fontSize: FONT.body, fontWeight: FONT.bold, flex: 1 },
  deadText: { color: COLORS.textMuted, textDecorationLine: 'line-through' },
  botBadge: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: FONT.bold,
    backgroundColor: COLORS.bgElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  elimBadge: {
    color: COLORS.red,
    fontSize: 9,
    fontWeight: FONT.bold,
    backgroundColor: COLORS.redMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  winBadge: {
    color: COLORS.gold,
    fontSize: 9,
    fontWeight: FONT.bold,
    backgroundColor: COLORS.goldMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.sm,
  },
  miniStat: {
    width: '22%',
    alignItems: 'center',
    paddingVertical: SPACE.xs,
  },
  miniIcon: { fontSize: 14 },
  miniValue: { color: COLORS.textPrimary, fontSize: FONT.caption, fontWeight: FONT.bold, marginTop: 2 },
  miniLabel: { color: COLORS.textMuted, fontSize: 8, marginTop: 1 },
});
