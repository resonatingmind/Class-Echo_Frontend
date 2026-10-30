import { ReactNode, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Alert, StyleSheet, Switch, Text, View } from 'react-native';

import { getMyGrowth, setMilestoneShared } from '../../lib/api';
import { describeMilestone } from '../../lib/milestones';
import { DIMENSION_LABELS } from '../../lib/reportFindings';
import { AppTheme } from '../../theme/AppTheme';
import { AreaTrend, GrowthOut, Milestone, Streak } from '../../types/api';
import { MonthlySummaryButton } from './MonthlySummary';

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

/** Your focus, with a dot per recent lecture that beat the earlier average. */
export function FocusProgressCard({ focus, label = 'YOUR FOCUS' }: { focus: NonNullable<GrowthOut['focus']>; label?: string }) {
  return (
    <View style={styles.focusCard}>
      <Text style={styles.focusLabel}>{label} · {areaLabel(focus.area).toUpperCase()}</Text>
      <Text style={styles.focusText}>{focus.try_this}</Text>
      {focus.recent > 0 ? (
        <View style={styles.progressRow}>
          <View style={styles.dots}>
            {Array.from({ length: focus.recent }, (_, i) => (
              <View key={i} style={[styles.dot, i < focus.improved && styles.dotOn]} />
            ))}
          </View>
          <Text style={styles.progressText}>
            {focus.improved} of the last {focus.recent} lectures beat the earlier average
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** Weeks in a row, and how this week is going. */
export function StreakCard({ streak, own = true }: { streak: Streak; own?: boolean }) {
  const left = Math.max(0, streak.threshold - streak.this_week);
  return (
    <View accessible style={styles.streakCard}>
      <Ionicons color={streak.weeks > 0 ? '#C2410C' : AppTheme.colors.hint} name="flame-outline" size={22} />
      <View style={styles.streakBody}>
        <Text style={styles.streakTitle}>
          {streak.weeks > 0 ? `${streak.weeks}-week streak` : own ? 'Start a streak this week' : 'No streak yet'}
        </Text>
        <Text style={styles.streakSub}>
          {!own
            ? `${streak.this_week} of ${streak.threshold} recordings this week.`
            : left > 0
              ? `${left} more recording${left === 1 ? '' : 's'} this week keeps it going.`
              : 'This week counts.'}
          {streak.best > streak.weeks ? ` Best: ${streak.best} weeks.` : ''}
        </Text>
      </View>
    </View>
  );
}

/** Milestones, newest first. The teacher can show each one to their admin; the admin sees only shared ones. */
export function MilestoneList({ milestones, onToggleShare }: {
  milestones: Milestone[];
  /** Teacher only. */
  onToggleShare?: (m: Milestone) => void;
}) {
  if (milestones.length === 0) return null;
  return (
    <View style={styles.card}>
      {milestones.map((m) => {
        const text = describeMilestone(m);
        return (
          <View key={m.id} style={styles.milestone}>
            <Ionicons color={AppTheme.colors.primaryDark} name={text.icon as any} size={20} />
            <View style={styles.rowBody}>
              <Text style={styles.rowLabel}>{text.title}</Text>
              <Text style={styles.rowSub}>
                {text.detail} {new Date(m.achieved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            </View>
            {onToggleShare ? (
              <View style={styles.shareSwitch}>
                <Text style={styles.shareLabel}>{m.shared ? 'Shown to admin' : 'Private'}</Text>
                <Switch
                  accessibilityLabel={`Show ${text.title} to your admin`}
                  onValueChange={() => onToggleShare(m)}
                  value={m.shared}
                />
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

/**
 * Trends, focus progress, streak and milestones. Only ever compared with the
 * teacher's own past, and only within one scoring rubric. The admin sees the
 * same view with shared milestones only.
 */
export function GrowthView({ growth, audience, onToggleShare, actions }: {
  growth: GrowthOut;
  audience: 'teacher' | 'admin';
  onToggleShare?: (m: Milestone) => void;
  /** Shown under the heading, e.g. the monthly summary button. */
  actions?: ReactNode;
}) {
  const own = audience === 'teacher';
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

  const milestones = growth.milestones ?? [];

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.title}>{own ? "How you're growing" : 'Growth'}</Text>
        <Text style={styles.subtitle}>
          {own ? 'Your' : 'The'} last {growth.window} lectures compared with the {growth.window} before. Only ever
          compared with {own ? 'your' : 'their'} own past.
        </Text>
        {actions}
      </View>

      {growth.streak ? <StreakCard own={own} streak={growth.streak} /> : null}

      {growth.lecture_count === 0 ? (
        <View style={[styles.card, styles.emptyCard]}>
          <Ionicons name="trending-up-outline" size={28} color={AppTheme.colors.hint} />
          <Text style={styles.emptyTitle}>
            {own ? 'Your trends start with your next report' : 'No scored lectures yet'}
          </Text>
          <Text style={styles.emptyBody}>
            {own
              ? "Record a few lectures and you'll see how each area is moving."
              : 'Trends appear once this teacher has a few reports.'}
          </Text>
        </View>
      ) : (
        <>
          {focus ? <FocusProgressCard focus={focus} label={own ? 'YOUR FOCUS' : 'CURRENT FOCUS'} /> : null}

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

      {milestones.length > 0 ? (
        <>
          <View style={styles.head}>
            <Text style={styles.title}>Milestones</Text>
            <Text style={styles.subtitle}>
              {own ? 'Private unless you choose to show one to your admin.' : 'Only the milestones this teacher chose to share.'}
            </Text>
          </View>
          <MilestoneList milestones={milestones} onToggleShare={onToggleShare} />
        </>
      ) : null}
    </View>
  );
}

/** The top of My Growth: loads the teacher's growth and lets them share milestones. */
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

  const toggleShare = async (m: Milestone) => {
    const flip = (shared: boolean) =>
      setGrowth((g) => g && {
        ...g,
        milestones: g.milestones?.map((x) => (x.id === m.id ? { ...x, shared } : x)),
      });
    flip(!m.shared);
    try {
      await setMilestoneShared(token, m.id, !m.shared);
    } catch (e) {
      flip(m.shared);
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Please try again.');
    }
  };

  // Trends are extra; the lesson list below still works without them.
  if (failed) return null;
  if (!growth) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={AppTheme.colors.hint} />
      </View>
    );
  }
  return (
    <GrowthView
      actions={<MonthlySummaryButton growth={growth} />}
      audience="teacher"
      growth={growth}
      onToggleShare={(m) => void toggleShare(m)}
    />
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
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppTheme.spacing.m,
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.large,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: AppTheme.spacing.l,
  },
  streakBody: { flex: 1, gap: 2 },
  streakTitle: { fontSize: 15, fontWeight: '800', color: AppTheme.colors.textPrimary },
  streakSub: { fontSize: 13, lineHeight: 18, color: AppTheme.colors.textSecondary },
  milestone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppTheme.spacing.m,
    paddingVertical: AppTheme.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.divider,
  },
  shareSwitch: { alignItems: 'center', gap: 2, minWidth: 88 },
  shareLabel: { fontSize: 11, fontWeight: '600', color: AppTheme.colors.textSecondary },
});
