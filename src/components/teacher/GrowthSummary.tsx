import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { getMyGrowth } from '../../lib/api';
import { DIMENSION_LABELS } from '../../lib/reportFindings';
import { AppTheme } from '../../theme/AppTheme';
import { AreaTrend, GrowthOut } from '../../types/api';

type Props = {
  token: string;
  /** Bump to load again (the screen's pull-to-refresh). */
  reloadKey: number;
};

const areaLabel = (area: string | null) => (area ? DIMENSION_LABELS[area] ?? area : 'Your focus');

/** Small bars, one per recent lecture, 0-100. */
function Spark({ series }: { series: AreaTrend['series'] }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.spark}>
      {series.map((p) => (
        <View key={p.recording_id} style={[styles.sparkBar, { height: Math.max(3, (p.value / 100) * 28) }]} />
      ))}
    </View>
  );
}

function ChangeChip({ trend }: { trend: AreaTrend }) {
  if (trend.direction == null || trend.change == null) {
    return <Text style={styles.chipWaiting}>Not enough lectures yet</Text>;
  }
  const points = Math.round(Math.abs(trend.change));
  if (trend.direction === 'steady') {
    return (
      <View style={[styles.chip, styles.chipSteady]}>
        <Ionicons name="remove" size={12} color={AppTheme.colors.textSecondary} />
        <Text style={styles.chipSteadyText}>Steady</Text>
      </View>
    );
  }
  const up = trend.direction === 'improving';
  return (
    <View style={[styles.chip, up ? styles.chipUp : styles.chipDown]}>
      <Ionicons name={up ? 'arrow-up' : 'arrow-down'} size={12} color={AppTheme.colors.textPrimary} />
      <Text style={styles.chipText}>{points} pts</Text>
    </View>
  );
}

function TrendRow({ trend, label, isFocus }: { trend: AreaTrend; label: string; isFocus?: boolean }) {
  const a11y =
    trend.change == null
      ? `${label}: average ${trend.recent_avg ?? 'not available'} out of 100`
      : `${label}: ${trend.direction}, ${trend.change > 0 ? 'up' : 'down'} ${Math.abs(Math.round(trend.change))} points`;
  return (
    <View accessible accessibilityLabel={a11y} style={styles.row}>
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel} numberOfLines={2}>
          {label}
          {isFocus ? <Text style={styles.focusTag}>  · focus</Text> : null}
        </Text>
        <Text style={styles.rowSub}>
          {trend.recent_avg != null ? `${Math.round(trend.recent_avg)} / 100 lately` : 'No scores yet'}
        </Text>
      </View>
      <Spark series={trend.series} />
      <View style={styles.rowChange}>
        <ChangeChip trend={trend} />
      </View>
    </View>
  );
}

/**
 * The top of My Growth: how each area is moving (last lectures vs the ones
 * before), and progress on the current focus. Only ever compared with the
 * teacher's own past, and only within one scoring rubric.
 */
export function GrowthSummary({ token, reloadKey }: Props) {
  const [growth, setGrowth] = useState<GrowthOut | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    setFailed(false);
    getMyGrowth(token)
      .then((g) => live && setGrowth(g))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [token, reloadKey]);

  // Trends are extra; the lesson list below still works without them.
  if (failed) return null;
  if (!growth) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={AppTheme.colors.hint} />
      </View>
    );
  }

  const notes: string[] = [];
  if (growth.older_rubric_count > 0) {
    notes.push(
      `${growth.older_rubric_count} earlier lecture${growth.older_rubric_count === 1 ? ' was' : 's were'} scored before the scoring was updated, so ${growth.older_rubric_count === 1 ? "it isn't" : "they aren't"} compared here.`,
    );
  }
  if (growth.excluded_count > 0) {
    notes.push(
      `${growth.excluded_count} lecture${growth.excluded_count === 1 ? '' : 's'} left out because ${growth.excluded_count === 1 ? "it didn't" : "they didn't"} fit the type of class.`,
    );
  }

  const focus = growth.focus;
  // The focus area first, then the rest in rubric order.
  const areas = [...growth.areas].sort(
    (a, b) => Number(b.area === focus?.area) - Number(a.area === focus?.area),
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.title}>How you're growing</Text>
        <Text style={styles.subtitle}>
          Your last {growth.window} lectures compared with the {growth.window} before. Only ever compared with your own past.
        </Text>
      </View>

      {growth.lecture_count === 0 ? (
        <View style={[styles.card, styles.emptyCard]}>
          <Ionicons name="trending-up-outline" size={28} color={AppTheme.colors.hint} />
          <Text style={styles.emptyTitle}>Your trends start with your next report</Text>
          <Text style={styles.emptyBody}>Record a few lectures and you'll see how each area is moving.</Text>
        </View>
      ) : (
        <>
          {focus ? (
            <View style={styles.focusCard}>
              <Text style={styles.focusLabel}>YOUR FOCUS · {areaLabel(focus.area).toUpperCase()}</Text>
              <Text style={styles.focusText}>{focus.try_this}</Text>
              {focus.recent > 0 ? (
                <View style={styles.progressRow}>
                  <View style={styles.dots}>
                    {Array.from({ length: focus.recent }, (_, i) => (
                      <View key={i} style={[styles.dot, i < focus.improved && styles.dotOn]} />
                    ))}
                  </View>
                  <Text style={styles.progressText}>
                    {focus.improved} of your last {focus.recent} lectures beat your earlier average
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={styles.card}>
            <TrendRow label="Overall score" trend={growth.overall} />
            {areas.map((t) => (
              <TrendRow isFocus={t.area === focus?.area} key={t.area} label={areaLabel(t.area)} trend={t} />
            ))}
          </View>
        </>
      )}

      {notes.map((n) => (
        <Text key={n} style={styles.note}>{n}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: AppTheme.spacing.xl },
  wrap: { gap: AppTheme.spacing.m, marginHorizontal: AppTheme.spacing.l },
  head: { gap: 2 },
  title: { color: AppTheme.colors.textPrimary, ...AppTheme.typography.heading3 },
  subtitle: { fontSize: 13, lineHeight: 18, color: AppTheme.colors.textSecondary },
  card: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.large,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    paddingHorizontal: AppTheme.spacing.l,
    paddingVertical: AppTheme.spacing.s,
    alignItems: 'stretch',
  },
  emptyCard: { alignItems: 'center', gap: AppTheme.spacing.s, paddingVertical: AppTheme.spacing.xl },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: AppTheme.colors.textPrimary, textAlign: 'center' },
  emptyBody: { fontSize: 13, color: AppTheme.colors.textSecondary, textAlign: 'center', marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppTheme.spacing.m,
    paddingVertical: AppTheme.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.divider,
  },
  rowBody: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 14, fontWeight: '700', color: AppTheme.colors.textPrimary },
  rowSub: { fontSize: 12, color: AppTheme.colors.textSecondary },
  focusTag: { fontSize: 12, fontWeight: '700', color: AppTheme.colors.primaryDark },
  spark: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 28, width: 60 },
  sparkBar: { width: 4, borderRadius: 2, backgroundColor: AppTheme.colors.primary, opacity: 0.7 },
  rowChange: { width: 96, alignItems: 'flex-end' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: AppTheme.radius.pill,
  },
  chipUp: { backgroundColor: '#DCFCE7' },
  chipDown: { backgroundColor: '#FEF3C7' },
  chipSteady: { backgroundColor: AppTheme.colors.surfaceMuted },
  chipText: { fontSize: 12, fontWeight: '800', color: AppTheme.colors.textPrimary },
  chipSteadyText: { fontSize: 12, fontWeight: '700', color: AppTheme.colors.textSecondary },
  chipWaiting: { fontSize: 11, color: AppTheme.colors.hint, textAlign: 'right' },
  focusCard: {
    backgroundColor: AppTheme.colors.primaryLight,
    borderRadius: AppTheme.radius.large,
    padding: AppTheme.spacing.l,
    gap: 6,
  },
  focusLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, color: AppTheme.colors.primaryDark },
  focusText: { fontSize: 15, lineHeight: 21, color: AppTheme.colors.textPrimary },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: AppTheme.spacing.s, marginTop: 4 },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: AppTheme.colors.border },
  dotOn: { backgroundColor: AppTheme.colors.primary },
  progressText: { flex: 1, fontSize: 13, color: AppTheme.colors.textSecondary },
  note: { fontSize: 12, lineHeight: 17, color: AppTheme.colors.textSecondary },
});
