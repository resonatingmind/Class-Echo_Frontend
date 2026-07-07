import { Ionicons } from '@expo/vector-icons';
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
  if (pct >= 80) return '#127A40';
  if (pct >= 60) return colors.accent;
  if (pct >= 40) return '#92400E';
  return '#B42318';
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; icon: string; label: string }> = {
  achieved: { bg: '#E8F7EE', text: '#127A40', icon: 'checkmark-circle', label: 'Achieved' },
  partial:  { bg: '#FFF4E0', text: '#92400E', icon: 'ellipse-outline',  label: 'Partial' },
  missing:  { bg: '#FFF1F1', text: '#B42318', icon: 'close-circle',     label: 'Missing' },
};

// ── Chapter Info Banner ───────────────────────────────────────────────────────

export function ChapterInfoBanner({ data }: { data: ChapterInfo }) {
  return (
    <View style={ci.card}>
      <View style={ci.header}>
        <View style={ci.iconWrap}>
          <Ionicons color={colors.accent} name="book-outline" size={16} />
        </View>
        <Text style={ci.title}>Chapter Reference</Text>
      </View>
      <View style={ci.body}>
        {data.chapter_name ? (
          <View style={ci.infoRow}>
            <Ionicons color={colors.textMuted} name="bookmark-outline" size={14} />
            <Text style={ci.label}>Chapter</Text>
            <Text style={ci.value} numberOfLines={1}>{data.chapter_name}</Text>
          </View>
        ) : null}
        <View style={ci.infoRow}>
          <Ionicons color={colors.textMuted} name="document-text-outline" size={14} />
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
    borderRadius: 16, borderWidth: 1, borderColor: colors.accent + '30',
    backgroundColor: colors.accent + '08', padding: 16, gap: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: colors.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  body: { gap: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { flex: 1, fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  value: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, maxWidth: '50%' as any },
  countBadge: {
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999,
    backgroundColor: colors.accent + '18',
  },
  countText: { fontSize: 13, fontWeight: '800', color: colors.accent },
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
            <Ionicons color="#127A40" name="checkmark-circle" size={14} />
            <Text style={[cc.sectionTitle, { color: '#127A40' }]}>
              Covered ({data.covered_concepts.length})
            </Text>
          </View>
          <View style={cc.chipWrap}>
            {data.covered_concepts.map((concept, i) => (
              <View key={i} style={[cc.chip, cc.chipCovered]}>
                <Text style={[cc.chipText, { color: '#127A40' }]}>{concept}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Missing concepts */}
      {data.missing_concepts.length > 0 ? (
        <View style={cc.conceptSection}>
          <View style={cc.sectionHeader}>
            <Ionicons color="#B42318" name="close-circle" size={14} />
            <Text style={[cc.sectionTitle, { color: '#B42318' }]}>
              Missing ({data.missing_concepts.length})
            </Text>
          </View>
          <View style={cc.chipWrap}>
            {data.missing_concepts.map((concept, i) => (
              <View key={i} style={[cc.chip, cc.chipMissing]}>
                <Text style={[cc.chipText, { color: '#B42318' }]}>{concept}</Text>
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
    borderRadius: 16, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, padding: 16, gap: 14,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: colors.surfaceSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  meterWrap: { gap: 6 },
  meterRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  pctText: { fontSize: 28, fontWeight: '800' },
  pctLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  barTrack: {
    height: 8, borderRadius: 4, backgroundColor: colors.surfaceMuted, overflow: 'hidden',
  },
  barFill: { height: 8, borderRadius: 4 },
  conceptCount: { fontSize: 11, color: colors.textMuted, fontWeight: '600', letterSpacing: 0.3 },
  conceptSection: { gap: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 12, fontWeight: '700' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1,
  },
  chipCovered: { backgroundColor: '#E8F7EE', borderColor: '#127A40' + '30' },
  chipMissing: { backgroundColor: '#FFF1F1', borderColor: '#B42318' + '30' },
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
          <Ionicons color={colors.accent} name="shield-checkmark-outline" size={16} />
        </View>
        <Text style={ra.title}>Reference Alignment</Text>
      </View>

      {/* Correct explanations */}
      {data.correct_explanations.length > 0 ? (
        <View style={ra.section}>
          <View style={ra.sectionHeader}>
            <Ionicons color="#127A40" name="checkmark-circle-outline" size={15} />
            <Text style={[ra.sectionTitle, { color: '#127A40' }]}>Correctly Explained</Text>
          </View>
          {data.correct_explanations.map((item, i) => (
            <View key={i} style={ra.itemRow}>
              <View style={[ra.dot, { backgroundColor: '#127A40' }]} />
              <Text style={ra.itemText}>{item}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Potential inaccuracies */}
      {data.potential_inaccuracies.length > 0 ? (
        <View style={ra.section}>
          <View style={ra.sectionHeader}>
            <Ionicons color="#B42318" name="alert-circle-outline" size={15} />
            <Text style={[ra.sectionTitle, { color: '#B42318' }]}>Potential Inaccuracies</Text>
          </View>
          {data.potential_inaccuracies.map((item, i) => (
            <View key={i} style={[ra.inaccuracyRow]}>
              <Ionicons color="#B42318" name="warning-outline" size={13} style={{ marginTop: 2 }} />
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
    borderRadius: 16, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, padding: 16, gap: 14,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: colors.surfaceSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  section: { gap: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 13, fontWeight: '700' },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 7 },
  itemText: { flex: 1, fontSize: 13, lineHeight: 20, color: colors.textSecondary },
  inaccuracyRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    padding: 10, borderRadius: 12, backgroundColor: '#FFF1F1',
  },
  inaccuracyText: { flex: 1, fontSize: 13, lineHeight: 20, color: '#B42318' },
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
          <Ionicons color="#7C3AED" name="trophy-outline" size={16} />
        </View>
        <Text style={lo.title}>Learning Objectives</Text>
      </View>

      {/* Summary pills */}
      <View style={lo.summaryRow}>
        {achieved > 0 ? (
          <View style={[lo.summaryPill, { backgroundColor: '#E8F7EE' }]}>
            <Ionicons color="#127A40" name="checkmark-circle" size={12} />
            <Text style={[lo.summaryText, { color: '#127A40' }]}>{achieved} Achieved</Text>
          </View>
        ) : null}
        {partial > 0 ? (
          <View style={[lo.summaryPill, { backgroundColor: '#FFF4E0' }]}>
            <Ionicons color="#92400E" name="ellipse-outline" size={12} />
            <Text style={[lo.summaryText, { color: '#92400E' }]}>{partial} Partial</Text>
          </View>
        ) : null}
        {missing > 0 ? (
          <View style={[lo.summaryPill, { backgroundColor: '#FFF1F1' }]}>
            <Ionicons color="#B42318" name="close-circle" size={12} />
            <Text style={[lo.summaryText, { color: '#B42318' }]}>{missing} Missing</Text>
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
    borderRadius: 16, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, padding: 16, gap: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: '#F3E8FF',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  summaryPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
  },
  summaryText: { fontSize: 12, fontWeight: '700' },
  objectiveRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: 12,
  },
  objectiveText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.textPrimary, fontWeight: '500' },
  statusBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
});
