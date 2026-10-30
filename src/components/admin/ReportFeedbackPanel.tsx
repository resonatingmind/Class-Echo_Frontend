import { StyleSheet, Text, View } from "react-native";

import { DIMENSION_LABELS, reasonLabel } from "../../lib/reportFindings";
import { AppTheme } from "../../theme/AppTheme";
import { ReportFeedbackSummary } from "../../types/api";

const BAD = "#B42318";

function percent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

/**
 * Where teachers push back on their reports. A dimension that more than the
 * alert rate of teachers disagree with is the rubric's problem, not theirs:
 * this is the main signal for tuning the scoring prompt.
 */
export function ReportFeedbackPanel({ summary }: { summary: ReportFeedbackSummary }) {
  const maxReason = Math.max(1, ...summary.by_reason.map((r) => r.count));

  const a = summary.adoption;

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Are teachers using it?</Text>
        <AdoptionRow
          detail={`${a.reports_opened} of ${summary.reports_total} reports${
            a.median_hours_to_open != null ? ` · median ${a.median_hours_to_open} h after ready` : ''
          }`}
          label="Reports opened"
          rate={a.open_rate}
          target={0.7}
        />
        <AdoptionRow
          detail={`${a.try_this_useful} 👍 of ${a.try_this_total} try-this suggestions`}
          label="Try-this found useful"
          rate={a.try_this_useful_rate}
          target={0.5}
        />
        <AdoptionRow
          detail={`${a.reports_with_clip_play} of ${a.reports_opened} opened reports`}
          label="Played a clip"
          rate={a.clip_play_rate}
          target={0.4}
        />
        <AdoptionRow
          detail={`${a.self_ratings_given} rated · ${a.self_ratings_skipped} skipped`}
          label="Self-rating completed"
          rate={a.self_rating_completion}
          target={0.5}
        />
        <AdoptionRow
          detail={`${a.brief_opens} of ${a.brief_classes} timetabled classes, holidays included`}
          label="Brief opened before class"
          rate={a.brief_open_rate}
          target={0.4}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Teacher feedback · {summary.rubric_version ? `rubric ${summary.rubric_version}` : "all rubrics"}
        </Text>
        <View style={styles.statsRow}>
          <Stat label="Reports" value={summary.reports_total} />
          <Stat label="Teachers" value={summary.teachers_total} />
          <Stat label="Reactions" value={summary.feedback_total} />
          <Stat label="Disagreed" value={summary.disagree_total} bad />
        </View>
        <Text style={styles.cardNote}>
          A disagreement never changes a score. Areas where more than {percent(summary.alert_rate)} of
          teachers disagree are flagged for a rubric review.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>By area</Text>
        <Text style={styles.cardMeta}>Teachers who disagreed with at least one finding in the area</Text>
        {summary.by_area.map((a) => (
          <View key={a.area} style={styles.areaRow}>
            <View style={styles.areaTop}>
              <Text style={styles.areaLabel} numberOfLines={1}>
                {DIMENSION_LABELS[a.area] ?? a.area}
              </Text>
              {a.flagged ? (
                <View style={styles.flag}>
                  <Text style={styles.flagText}>Review</Text>
                </View>
              ) : null}
              <Text style={[styles.areaValue, a.flagged && { color: BAD }]}>
                {a.teachers_disagreeing}/{summary.teachers_total} · {percent(a.teacher_rate)}
              </Text>
            </View>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { width: `${Math.min(100, a.teacher_rate * 100)}%` },
                  a.flagged && { backgroundColor: BAD },
                ]}
              />
            </View>
            <Text style={styles.cardMeta}>
              👍 {a.agree} · 👎 {a.disagree}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Reasons given</Text>
        {summary.by_reason.length === 0 ? (
          <Text style={styles.cardMeta}>No reasons picked yet.</Text>
        ) : (
          summary.by_reason.map((r) => (
            <View key={r.reason} style={styles.areaRow}>
              <View style={styles.areaTop}>
                <Text style={styles.areaLabel}>{reasonLabel(r.reason)}</Text>
                <Text style={styles.areaValue}>{r.count}</Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${(r.count / maxReason) * 100}%` }]} />
              </View>
            </View>
          ))
        )}
      </View>

      <Text style={styles.sectionLabel}>Recent disagreements</Text>
      {summary.recent.length === 0 ? (
        <Text style={styles.emptyText}>
          No disagreements yet. They appear here when a teacher taps 👎 on a finding in their report.
        </Text>
      ) : (
        summary.recent.map((r, i) => (
          <View key={`${r.recording_id}-${i}`} style={styles.row}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {r.area ? DIMENSION_LABELS[r.area] ?? r.area : r.target_type} · {r.lecture_title || `Recording ${r.recording_id}`}
            </Text>
            <Text style={styles.cardMeta} numberOfLines={1}>
              {[r.teacher_name, r.school_name].filter(Boolean).join(" · ")}
            </Text>
            {r.reasons.length ? (
              <Text style={styles.rowText}>{r.reasons.map(reasonLabel).join(" · ")}</Text>
            ) : null}
            {r.comment ? <Text style={styles.rowText}>“{r.comment}”</Text> : null}
          </View>
        ))
      )}
    </>
  );
}

/** One roadmap success number against its target; grey until there is data. */
function AdoptionRow({ label, rate, target, detail }: {
  label: string;
  rate: number | null;
  target: number;
  detail: string;
}) {
  const met = rate != null && rate >= target;
  return (
    <View style={styles.areaRow}>
      <View style={styles.areaTop}>
        <Text style={styles.areaLabel}>{label}</Text>
        <Text style={[styles.areaValue, rate != null && { color: met ? "#127A40" : "#B45309" }]}>
          {rate != null ? percent(rate) : "—"} · target {percent(target)}
        </Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${Math.min(100, (rate ?? 0) * 100)}%` },
            { backgroundColor: met ? "#127A40" : AppTheme.colors.primary },
          ]}
        />
      </View>
      <Text style={styles.cardMeta}>{detail}</Text>
    </View>
  );
}

function Stat({ label, value, bad }: { label: string; value: number; bad?: boolean }) {
  return (
    <View style={styles.statTile}>
      <Text style={[styles.statValue, bad && value > 0 && { color: BAD }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: AppTheme.spacing.l,
    gap: AppTheme.spacing.s,
  },
  cardTitle: { fontSize: 14, fontWeight: "800", color: AppTheme.colors.textPrimary },
  cardMeta: { fontSize: 12, color: AppTheme.colors.textSecondary },
  cardNote: { fontSize: 12, color: AppTheme.colors.textSecondary, lineHeight: 17 },
  statsRow: { flexDirection: "row", gap: AppTheme.spacing.s },
  statTile: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: AppTheme.colors.surfaceSoft,
    paddingVertical: AppTheme.spacing.m,
    alignItems: "center",
  },
  statValue: { fontSize: 20, fontWeight: "800", color: AppTheme.colors.textPrimary },
  statLabel: { fontSize: 11, color: AppTheme.colors.textSecondary, marginTop: 2 },
  areaRow: { gap: 4, paddingVertical: 4 },
  areaTop: { flexDirection: "row", alignItems: "center", gap: AppTheme.spacing.s },
  areaLabel: { flex: 1, fontSize: 13, fontWeight: "700", color: AppTheme.colors.textPrimary },
  areaValue: { fontSize: 12, fontWeight: "700", color: AppTheme.colors.textSecondary },
  flag: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999, backgroundColor: "#FEE4E2" },
  flagText: { fontSize: 11, fontWeight: "800", color: BAD },
  track: { height: 6, borderRadius: 3, backgroundColor: AppTheme.colors.surfaceMuted, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3, backgroundColor: AppTheme.colors.primary },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: AppTheme.colors.textSecondary,
    textTransform: "uppercase",
    marginTop: AppTheme.spacing.s,
  },
  row: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: AppTheme.spacing.m,
    gap: 4,
  },
  rowTitle: { fontSize: 14, fontWeight: "700", color: AppTheme.colors.textPrimary },
  rowText: { fontSize: 13, color: AppTheme.colors.textPrimary, lineHeight: 18 },
  emptyText: {
    fontSize: 13,
    color: AppTheme.colors.textSecondary,
    lineHeight: 19,
    textAlign: "center",
    paddingVertical: 24,
    paddingHorizontal: AppTheme.spacing.l,
  },
});
