import { AppTheme } from '../theme/AppTheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';
import {
  AccuracyAnalysis,
  ChapterInfo,
  CurriculumCoverage,
  LearningObjectiveStatus,
} from '../types/api';

// ── Color helpers ─────────────────────────────────────────────────────────────

function coverageColor(pct: number): string {
  if (pct >= 80) return AppTheme.colors.successText;
  if (pct >= 60) return AppTheme.colors.primary;
  if (pct >= 40) return AppTheme.colors.warningStrong;
  return AppTheme.colors.dangerText;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; icon: string; label: string }> = {
  achieved: { bg: AppTheme.colors.successBg, text: AppTheme.colors.successText, icon: 'checkmark-circle', label: 'Achieved' },
  partial:  { bg: AppTheme.colors.warningBg, text: AppTheme.colors.warningStrong, icon: 'ellipse-outline',  label: 'Partial' },
  missing:  { bg: AppTheme.colors.dangerBg, text: AppTheme.colors.dangerText, icon: 'close-circle',     label: 'Missing' },
};

// ── Chapter Info Banner ───────────────────────────────────────────────────────

export function ChapterInfoBanner({ data }: { data: ChapterInfo }) {
  return (
    <View style={ci.card}>
      <View style={ci.header}>
        <View style={ci.iconWrap}>
          <Ionicons color={AppTheme.colors.primary} name="book-outline" size={16} />
        </View>
        <Text style={ci.title}>Chapter Reference</Text>
      </View>
      <View style={ci.body}>
        {data.chapter_name ? (
          <View style={ci.infoRow}>
            <Ionicons color={AppTheme.colors.textSecondary} name="bookmark-outline" size={14} />
            <Text style={ci.label}>Chapter</Text>
            <Text style={ci.value} numberOfLines={1}>{data.chapter_name}</Text>
          </View>
        ) : null}
        <View style={ci.infoRow}>
          <Ionicons color={AppTheme.colors.textSecondary} name="document-text-outline" size={14} />
          <Text style={ci.label}>Reference Documents</Text>
          <View style={ci.countBadge}>
            <Text style={ci.countText}>{data.document_count}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const ci = StyleSheet.create({
  card: {
    borderRadius: 16, borderWidth: 1, borderColor: AppTheme.colors.primary + '30',
    backgroundColor: AppTheme.colors.primary + '08', padding: 16, gap: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 32, height: 32, borderRadius: AppTheme.radius.medium, backgroundColor: AppTheme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 14, fontWeight: '700', color: AppTheme.colors.textPrimary },
  body: { gap: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { flex: 1, fontSize: 13, color: AppTheme.colors.textSecondary, fontWeight: '600' },
  value: { fontSize: 13, fontWeight: '700', color: AppTheme.colors.textPrimary, maxWidth: '50%' as any },
  countBadge: {
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999,
    backgroundColor: AppTheme.colors.primary + '18',
  },
  countText: { fontSize: 13, fontWeight: '800', color: AppTheme.colors.primaryText },
});

// ── Learning Plan Info Card ──────────────────────────────────────────────────

export function LearningPlanInfoCard({ data }: { data: any }) {
  if (!data || (!data.topic_name && !data.sub_topic)) return null;

  return (
    <View style={lpic.card}>
      <View style={lpic.header}>
        <View style={lpic.iconWrap}>
          <Ionicons color={AppTheme.colors.info} name="calendar-outline" size={16} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={lpic.title}>Lesson Plan</Text>
          <Text style={lpic.subtitle}>
            {data.topic_name} {data.sub_topic ? `• ${data.sub_topic}` : ""}
          </Text>
        </View>
        {data.date ? (
          <View style={lpic.dateBadge}>
            <Text style={lpic.dateText}>{data.date}</Text>
          </View>
        ) : null}
      </View>

      <View style={lpic.body}>
        {data.classwork_activities ? (
          <View style={lpic.itemRow}>
            <Text style={lpic.itemLabel}>Classwork & Activities:</Text>
            <Text style={lpic.itemVal}>{data.classwork_activities}</Text>
          </View>
        ) : null}

        {data.learning_outcomes ? (
          <View style={lpic.itemRow}>
            <Text style={lpic.itemLabel}>Target Outcomes:</Text>
            <Text style={lpic.itemVal}>{data.learning_outcomes}</Text>
          </View>
        ) : null}

        {data.assessment_task ? (
          <View style={lpic.itemRow}>
            <Text style={lpic.itemLabel}>Assessment / Extension:</Text>
            <Text style={lpic.itemVal}>{data.assessment_task}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const lpic = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppTheme.colors.info + "30",
    backgroundColor: AppTheme.colors.info + "08",
    padding: 16,
    gap: 12,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.infoBg,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 14, fontWeight: "800", color: AppTheme.colors.slate900 },
  subtitle: { fontSize: 13, fontWeight: "600", color: AppTheme.colors.infoStrong },
  dateBadge: {
    backgroundColor: AppTheme.colors.infoBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dateText: { fontSize: 12, fontWeight: "700", color: AppTheme.colors.infoStrong },
  body: { gap: 6, marginTop: 4 },
  itemRow: { gap: 2 },
  itemLabel: { fontSize: 12, fontWeight: "700", color: AppTheme.colors.slate700 },
  itemVal: { fontSize: 13, color: AppTheme.colors.slate600, lineHeight: 18 },
});

// ── Curriculum Coverage Card ──────────────────────────────────────────────────

export function CurriculumCoverageCard({ data }: { data: CurriculumCoverage }) {
  const pct = Math.round(data.coverage_percentage);
  const col = coverageColor(pct);
  const totalConcepts = data.covered_concepts.length + data.missing_concepts.length;

  return (
    <View style={cc.card}>
      <View style={cc.header}>
        <View style={cc.iconWrap}>
          <Ionicons color={col} name="pie-chart-outline" size={16} />
        </View>
        <Text style={cc.title}>Curriculum Coverage</Text>
      </View>

      {/* Coverage meter */}
      <View style={cc.meterWrap}>
        <View style={cc.meterRow}>
          <Text style={[cc.pctText, { color: col }]}>{pct}%</Text>
          <Text style={cc.pctLabel}>of concepts covered</Text>
        </View>
        <View style={cc.barTrack}>
          <View style={[cc.barFill, { width: `${Math.min(pct, 100)}%` as any, backgroundColor: col }]} />
        </View>
        <Text style={cc.conceptCount}>
          {data.covered_concepts.length} of {totalConcepts} concepts
        </Text>
      </View>

      {/* Covered concepts */}
      {data.covered_concepts.length > 0 ? (
        <View style={cc.conceptSection}>
          <View style={cc.sectionHeader}>
            <Ionicons color={AppTheme.colors.successText} name="checkmark-circle" size={14} />
            <Text style={[cc.sectionTitle, { color: AppTheme.colors.successText }]}>
              Covered ({data.covered_concepts.length})
            </Text>
          </View>
          <View style={cc.chipWrap}>
            {data.covered_concepts.map((concept, i) => (
              <View key={i} style={[cc.chip, cc.chipCovered]}>
                <Text style={[cc.chipText, { color: AppTheme.colors.successText }]}>{concept}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Missing concepts */}
      {data.missing_concepts.length > 0 ? (
        <View style={cc.conceptSection}>
          <View style={cc.sectionHeader}>
            <Ionicons color={AppTheme.colors.dangerText} name="close-circle" size={14} />
            <Text style={[cc.sectionTitle, { color: AppTheme.colors.dangerText }]}>
              Missing ({data.missing_concepts.length})
            </Text>
          </View>
          <View style={cc.chipWrap}>
            {data.missing_concepts.map((concept, i) => (
              <View key={i} style={[cc.chip, cc.chipMissing]}>
                <Text style={[cc.chipText, { color: AppTheme.colors.dangerText }]}>{concept}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const cc = StyleSheet.create({
  card: {
    borderRadius: 16, borderWidth: 1, borderColor: AppTheme.colors.border,
    backgroundColor: AppTheme.colors.surface, padding: 16, gap: 14,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 32, height: 32, borderRadius: AppTheme.radius.medium, backgroundColor: AppTheme.colors.surfaceSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { flex: 1, fontSize: 14, fontWeight: '700', color: AppTheme.colors.textPrimary },
  meterWrap: { gap: 6 },
  meterRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  pctText: { fontSize: 28, fontWeight: '800' },
  pctLabel: { fontSize: 13, color: AppTheme.colors.textSecondary, fontWeight: '600' },
  barTrack: {
    height: 8, borderRadius: 4, backgroundColor: AppTheme.colors.surfaceMuted, overflow: 'hidden',
  },
  barFill: { height: 8, borderRadius: 4 },
  conceptCount: { fontSize: 11, color: AppTheme.colors.textSecondary, fontWeight: '600', letterSpacing: 0.3 },
  conceptSection: { gap: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 12, fontWeight: '700' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1,
  },
  chipCovered: { backgroundColor: AppTheme.colors.successBg, borderColor: AppTheme.colors.successText + '30' },
  chipMissing: { backgroundColor: AppTheme.colors.dangerBg, borderColor: AppTheme.colors.dangerText + '30' },
  chipText: { fontSize: 12, fontWeight: '600' },
});

// ── Reference Alignment Card ──────────────────────────────────────────────────

export function ReferenceAlignmentCard({ data }: { data: AccuracyAnalysis }) {
  if (!data.correct_explanations.length && !data.potential_inaccuracies.length) {
    return null;
  }

  return (
    <View style={ra.card}>
      <View style={ra.header}>
        <View style={ra.iconWrap}>
          <Ionicons color={AppTheme.colors.primary} name="shield-checkmark-outline" size={16} />
        </View>
        <Text style={ra.title}>Accuracy Check</Text>
      </View>

      {/* Correct explanations */}
      {data.correct_explanations.length > 0 ? (
        <View style={ra.section}>
          <View style={ra.sectionHeader}>
            <Ionicons color={AppTheme.colors.successText} name="checkmark-circle-outline" size={15} />
            <Text style={[ra.sectionTitle, { color: AppTheme.colors.successText }]}>Correctly Explained</Text>
          </View>
          {data.correct_explanations.map((item, i) => (
            <View key={i} style={ra.itemRow}>
              <View style={[ra.dot, { backgroundColor: AppTheme.colors.successText }]} />
              <Text style={ra.itemText}>{item}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Potential inaccuracies */}
      {data.potential_inaccuracies.length > 0 ? (
        <View style={ra.section}>
          <View style={ra.sectionHeader}>
            <Ionicons color={AppTheme.colors.dangerText} name="alert-circle-outline" size={15} />
            <Text style={[ra.sectionTitle, { color: AppTheme.colors.dangerText }]}>Potential Inaccuracies</Text>
          </View>
          {data.potential_inaccuracies.map((item, i) => (
            <View key={i} style={[ra.inaccuracyRow]}>
              <Ionicons color={AppTheme.colors.dangerText} name="warning-outline" size={13} style={{ marginTop: 2 }} />
              <Text style={ra.inaccuracyText}>{item}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const ra = StyleSheet.create({
  card: {
    borderRadius: 16, borderWidth: 1, borderColor: AppTheme.colors.border,
    backgroundColor: AppTheme.colors.surface, padding: 16, gap: 14,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 32, height: 32, borderRadius: AppTheme.radius.medium, backgroundColor: AppTheme.colors.surfaceSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { flex: 1, fontSize: 14, fontWeight: '700', color: AppTheme.colors.textPrimary },
  section: { gap: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 13, fontWeight: '700' },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 7 },
  itemText: { flex: 1, fontSize: 13, lineHeight: 20, color: AppTheme.colors.textSecondary },
  inaccuracyRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    padding: 10, borderRadius: AppTheme.radius.medium, backgroundColor: AppTheme.colors.dangerBg,
  },
  inaccuracyText: { flex: 1, fontSize: 13, lineHeight: 20, color: AppTheme.colors.dangerText },
});

// ── Learning Objectives Card ──────────────────────────────────────────────────

export function LearningObjectivesCard({ data }: { data: LearningObjectiveStatus[] }) {
  if (!data.length) return null;

  const achieved = data.filter(d => d.status === 'achieved').length;
  const partial = data.filter(d => d.status === 'partial').length;
  const missing = data.filter(d => d.status === 'missing').length;

  return (
    <View style={lo.card}>
      <View style={lo.header}>
        <View style={lo.iconWrap}>
          <Ionicons color={AppTheme.colors.violet} name="trophy-outline" size={16} />
        </View>
        <Text style={lo.title}>Learning Objectives</Text>
      </View>

      {/* Summary pills */}
      <View style={lo.summaryRow}>
        {achieved > 0 ? (
          <View style={[lo.summaryPill, { backgroundColor: AppTheme.colors.successBg }]}>
            <Ionicons color={AppTheme.colors.successText} name="checkmark-circle" size={12} />
            <Text style={[lo.summaryText, { color: AppTheme.colors.successText }]}>{achieved} Achieved</Text>
          </View>
        ) : null}
        {partial > 0 ? (
          <View style={[lo.summaryPill, { backgroundColor: AppTheme.colors.warningBg }]}>
            <Ionicons color={AppTheme.colors.warningStrong} name="ellipse-outline" size={12} />
            <Text style={[lo.summaryText, { color: AppTheme.colors.warningStrong }]}>{partial} Partial</Text>
          </View>
        ) : null}
        {missing > 0 ? (
          <View style={[lo.summaryPill, { backgroundColor: AppTheme.colors.dangerBg }]}>
            <Ionicons color={AppTheme.colors.dangerText} name="close-circle" size={12} />
            <Text style={[lo.summaryText, { color: AppTheme.colors.dangerText }]}>{missing} Missing</Text>
          </View>
        ) : null}
      </View>

      {/* Objectives list */}
      {data.map((item, i) => {
        const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.missing;
        return (
          <View key={i} style={[lo.objectiveRow, { backgroundColor: cfg.bg }]}>
            <Ionicons color={cfg.text} name={cfg.icon as any} size={18} />
            <Text style={lo.objectiveText}>{item.objective}</Text>
            <View style={[lo.statusBadge, { borderColor: cfg.text + '40' }]}>
              <Text style={[lo.statusText, { color: cfg.text }]}>{cfg.label}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const lo = StyleSheet.create({
  card: {
    borderRadius: 16, borderWidth: 1, borderColor: AppTheme.colors.border,
    backgroundColor: AppTheme.colors.surface, padding: 16, gap: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 32, height: 32, borderRadius: AppTheme.radius.medium, backgroundColor: '#F3E8FF',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { flex: 1, fontSize: 14, fontWeight: '700', color: AppTheme.colors.textPrimary },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  summaryPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
  },
  summaryText: { fontSize: 12, fontWeight: '700' },
  objectiveRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: AppTheme.radius.medium,
  },
  objectiveText: { flex: 1, fontSize: 13, lineHeight: 19, color: AppTheme.colors.textPrimary, fontWeight: '500' },
  statusBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
});



