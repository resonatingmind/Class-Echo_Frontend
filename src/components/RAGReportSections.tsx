import { useState } from 'react';
import { AppTheme } from '../theme/AppTheme';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View, Pressable } from 'react-native';

import { colors } from '../theme/colors';
import {
  AccuracyAnalysis,
  ChapterInfo,
  CurriculumCoverage,
  LectureCoverage,
  ChapterCoverage,
  LearningObjectiveStatus,
} from '../types/api';


// ── Color helpers ─────────────────────────────────────────────────────────────

function coverageColor(pct: number): string {
  if (pct >= 80) return '#127A40';
  if (pct >= 60) return AppTheme.colors.primary;
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
  countText: { fontSize: 13, fontWeight: '800', color: AppTheme.colors.primary },
});

// ── Learning Plan Info Card ──────────────────────────────────────────────────

export function LearningPlanInfoCard({ data }: { data: any }) {
  if (!data || (!data.topic_name && !data.sub_topic)) return null;

  return (
    <View style={lpic.card}>
      <View style={lpic.header}>
        <View style={lpic.iconWrap}>
          <Ionicons color="#0284C7" name="calendar-outline" size={16} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={lpic.title}>Selected Learning Plan (Lecture Planner)</Text>
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
    borderColor: "#0284C7" + "30",
    backgroundColor: "#0284C7" + "08",
    padding: 16,
    gap: 12,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 14, fontWeight: "800", color: "#0F172A" },
  subtitle: { fontSize: 13, fontWeight: "600", color: "#0284C7" },
  dateBadge: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dateText: { fontSize: 12, fontWeight: "700", color: "#0369A1" },
  body: { gap: 6, marginTop: 4 },
  itemRow: { gap: 2 },
  itemLabel: { fontSize: 12, fontWeight: "700", color: "#334155" },
  itemVal: { fontSize: 13, color: "#475569", lineHeight: 18 },
});

// ── Curriculum & Lecture Dual-Angle Coverage Card ─────────────────────────────

interface CurriculumCoverageCardProps {
  data?: CurriculumCoverage | null;
  lectureCoverage?: LectureCoverage | null;
  chapterCoverage?: ChapterCoverage | null;
  learningPlan?: any | null;
  chapterInfo?: ChapterInfo | null;
}

export function CurriculumCoverageCard({
  data,
  lectureCoverage,
  chapterCoverage,
  learningPlan,
  chapterInfo,
}: CurriculumCoverageCardProps) {
  const [activeAngle, setActiveAngle] = useState<'lecture' | 'chapter'>('lecture');

  // Resolve Lecture Angle data
  const lectureTopic = lectureCoverage?.topic || learningPlan?.topic_name || chapterInfo?.chapter_name || "Lecture Plan";
  const lectureSubTopic = lectureCoverage?.sub_topic || learningPlan?.sub_topic || "Scheduled Class";
  const lectureCovered = lectureCoverage?.covered_concepts?.length
    ? lectureCoverage.covered_concepts
    : (data?.covered_concepts || []);
  const lectureMissed = lectureCoverage?.missed_concepts || [];
  const lectureTotal = lectureCovered.length + lectureMissed.length;
  const lecturePct = Math.round(
    lectureCoverage?.coverage_percentage ?? (data?.coverage_percentage ?? (lectureTotal > 0 ? (lectureCovered.length / lectureTotal) * 100 : 100))
  );

  // Resolve Chapter Angle data
  const chapterName = chapterCoverage?.chapter_name || chapterInfo?.chapter_name || "Full Chapter Scope";
  const chapterCovered = chapterCoverage?.covered_in_lecture?.length
    ? chapterCoverage.covered_in_lecture
    : (data?.covered_concepts || []);
  const chapterRemaining = chapterCoverage?.remaining_chapter_concepts?.length
    ? chapterCoverage.remaining_chapter_concepts
    : (data?.missing_concepts || []);
  const chapterTotal = chapterCoverage?.total_concepts_count || (chapterCovered.length + chapterRemaining.length);
  const chapterPct = Math.round(
    chapterCoverage?.chapter_coverage_percentage ??
    (chapterTotal > 0 ? (chapterCovered.length / chapterTotal) * 100 : 0)
  );

  const lectureCol = coverageColor(lecturePct);
  const chapterCol = '#0284C7';

  return (
    <View style={cc.card}>
      {/* Header */}
      <View style={cc.header}>
        <View style={cc.iconWrap}>
          <Ionicons color={AppTheme.colors.primary} name="analytics-outline" size={18} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={cc.title}>Curriculum & Lecture Evaluation</Text>
          <Text style={cc.headerSubtitle}>Dual-angle RAG analysis against syllabus and micro-planner</Text>
        </View>
      </View>

      {/* Quick Summary Strip (Both Angles at a Glance) */}
      <View style={cc.summaryStrip}>
        <Pressable
          onPress={() => setActiveAngle('lecture')}
          style={[cc.summaryBox, activeAngle === 'lecture' && cc.summaryBoxActive]}
        >
          <View style={cc.summaryBoxTop}>
            <Ionicons color="#127A40" name="calendar-outline" size={14} />
            <Text style={cc.summaryBoxLabel}>Lecture Plan</Text>
          </View>
          <View style={cc.summaryBoxBottom}>
            <Text style={[cc.summaryBoxValue, { color: '#127A40' }]}>{lecturePct}%</Text>
            <Text style={cc.summaryBoxSub}>{lectureCovered.length}/{lectureTotal || lectureCovered.length} taught</Text>
          </View>
        </Pressable>

        <View style={cc.stripDivider} />

        <Pressable
          onPress={() => setActiveAngle('chapter')}
          style={[cc.summaryBox, activeAngle === 'chapter' && cc.summaryBoxActive]}
        >
          <View style={cc.summaryBoxTop}>
            <Ionicons color="#0284C7" name="book-outline" size={14} />
            <Text style={cc.summaryBoxLabel}>Chapter Scope</Text>
          </View>
          <View style={cc.summaryBoxBottom}>
            <Text style={[cc.summaryBoxValue, { color: '#0284C7' }]}>{chapterPct}%</Text>
            <Text style={cc.summaryBoxSub}>{chapterCovered.length}/{chapterTotal} total</Text>
          </View>
        </Pressable>
      </View>

      {/* Perspective Segmented Switcher */}
      <View style={cc.tabContainer}>
        <Pressable
          onPress={() => setActiveAngle('lecture')}
          style={[cc.tabBtn, activeAngle === 'lecture' && cc.tabBtnActive]}
        >
          <Ionicons
            color={activeAngle === 'lecture' ? AppTheme.colors.surface : AppTheme.colors.textSecondary}
            name="calendar"
            size={14}
          />
          <Text style={[cc.tabText, activeAngle === 'lecture' && cc.tabTextActive]}>
            Particular Lecture (Micro-Planner)
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveAngle('chapter')}
          style={[cc.tabBtn, activeAngle === 'chapter' && cc.tabBtnActive]}
        >
          <Ionicons
            color={activeAngle === 'chapter' ? AppTheme.colors.surface : AppTheme.colors.textSecondary}
            name="book"
            size={14}
          />
          <Text style={[cc.tabText, activeAngle === 'chapter' && cc.tabTextActive]}>
            Full Chapter Scope
          </Text>
        </Pressable>
      </View>

      {/* ── PERSPECTIVE 1: PARTICULAR LECTURE VIEW (MICRO-PLANNER) ── */}
      {activeAngle === 'lecture' ? (
        <View style={cc.perspectiveBody}>
          {/* Lecture Info Banner */}
          <View style={cc.lectureContextCard}>
            <View style={cc.lectureContextTop}>
              <View style={cc.tagPill}>
                <Text style={cc.tagPillText}>Micro-Planner Target</Text>
              </View>
              {learningPlan?.date ? (
                <View style={cc.dateBadge}>
                  <Text style={cc.dateText}>{learningPlan.date}</Text>
                </View>
              ) : null}
            </View>
            <Text style={cc.lectureTopicTitle}>{lectureTopic}</Text>
            {lectureSubTopic ? (
              <Text style={cc.lectureSubTopicTitle}>Lecture Focus: {lectureSubTopic}</Text>
            ) : null}

            {learningPlan?.classwork_activities ? (
              <View style={cc.microPlanSnippet}>
                <Text style={cc.microPlanLabel}>Classwork & Activities:</Text>
                <Text style={cc.microPlanValue}>{learningPlan.classwork_activities}</Text>
              </View>
            ) : null}

            {learningPlan?.learning_outcomes ? (
              <View style={cc.microPlanSnippet}>
                <Text style={cc.microPlanLabel}>Planned Outcome:</Text>
                <Text style={cc.microPlanValue}>{learningPlan.learning_outcomes}</Text>
              </View>
            ) : null}
          </View>

          {/* Lecture Coverage Meter */}
          <View style={cc.meterWrap}>
            <View style={cc.meterRow}>
              <Text style={[cc.pctText, { color: lectureCol }]}>{lecturePct}%</Text>
              <Text style={cc.pctLabel}>of Micro-Planner Lecture Plan Covered</Text>
            </View>
            <View style={cc.barTrack}>
              <View
                style={[
                  cc.barFill,
                  { width: `${Math.min(lecturePct, 100)}%` as any, backgroundColor: lectureCol },
                ]}
              />
            </View>
            <Text style={cc.conceptCount}>
              {lectureCovered.length} of {lectureTotal || lectureCovered.length} planned concepts covered in this class
            </Text>
          </View>

          {/* Concepts covered in this lecture */}
          {lectureCovered.length > 0 ? (
            <View style={cc.conceptSection}>
              <View style={cc.sectionHeader}>
                <Ionicons color="#127A40" name="checkmark-circle" size={15} />
                <Text style={[cc.sectionTitle, { color: '#127A40' }]}>
                  Delivered in this Lecture ({lectureCovered.length})
                </Text>
              </View>
              <View style={cc.chipWrap}>
                {lectureCovered.map((concept, i) => (
                  <View key={i} style={[cc.chip, cc.chipCovered]}>
                    <Ionicons color="#127A40" name="checkmark" size={12} style={{ marginRight: 4 }} />
                    <Text style={[cc.chipText, { color: '#127A40' }]}>{concept}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Concepts missed from lecture plan */}
          {lectureMissed.length > 0 ? (
            <View style={cc.conceptSection}>
              <View style={cc.sectionHeader}>
                <Ionicons color="#B42318" name="close-circle" size={15} />
                <Text style={[cc.sectionTitle, { color: '#B42318' }]}>
                  Omitted from Planned Lecture ({lectureMissed.length})
                </Text>
              </View>
              <View style={cc.chipWrap}>
                {lectureMissed.map((concept, i) => (
                  <View key={i} style={[cc.chip, cc.chipMissing]}>
                    <Ionicons color="#B42318" name="close" size={12} style={{ marginRight: 4 }} />
                    <Text style={[cc.chipText, { color: '#B42318' }]}>{concept}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={cc.perfectAdherenceBox}>
              <Ionicons color="#127A40" name="checkmark-done-circle" size={18} />
              <View style={{ flex: 1 }}>
                <Text style={cc.perfectAdherenceTitle}>Complete Lecture Plan Adherence</Text>
                <Text style={cc.perfectAdherenceText}>
                  All concepts planned for this specific lecture in the micro-planner were successfully covered.
                </Text>
              </View>
            </View>
          )}
        </View>
      ) : null}

      {/* ── PERSPECTIVE 2: FULL CHAPTER SCOPE VIEW (OVERALL SYLLABUS) ── */}
      {activeAngle === 'chapter' ? (
        <View style={cc.perspectiveBody}>
          {/* Chapter Context Banner */}
          <View style={cc.chapterContextCard}>
            <View style={cc.chapterContextTop}>
              <View style={[cc.tagPill, { backgroundColor: '#E0F2FE' }]}>
                <Text style={[cc.tagPillText, { color: '#0369A1' }]}>Uploaded Chapter Material</Text>
              </View>
              {chapterInfo?.document_count ? (
                <View style={cc.docCountBadge}>
                  <Ionicons color="#0284C7" name="document-text-outline" size={12} />
                  <Text style={cc.docCountText}>{chapterInfo.document_count} reference docs</Text>
                </View>
              ) : null}
            </View>
            <Text style={cc.chapterNameTitle}>{chapterName}</Text>
            <Text style={cc.chapterScopeSubtitle}>
              Total syllabus scope: {chapterTotal} core concepts across all lectures of this chapter
            </Text>
          </View>

          {/* Chapter Progress Meter */}
          <View style={cc.meterWrap}>
            <View style={cc.meterRow}>
              <Text style={[cc.pctText, { color: chapterCol }]}>{chapterPct}%</Text>
              <Text style={cc.pctLabel}>of Full Chapter Syllabus Addressed in this Class</Text>
            </View>
            <View style={cc.barTrack}>
              <View
                style={[
                  cc.barFill,
                  { width: `${Math.min(chapterPct, 100)}%` as any, backgroundColor: chapterCol },
                ]}
              />
            </View>
            <Text style={cc.conceptCount}>
              {chapterCovered.length} of {chapterTotal} concepts in this chapter covered
            </Text>
          </View>

          {/* Concepts taught in this class */}
          {chapterCovered.length > 0 ? (
            <View style={cc.conceptSection}>
              <View style={cc.sectionHeader}>
                <Ionicons color="#0284C7" name="checkmark-circle" size={15} />
                <Text style={[cc.sectionTitle, { color: '#0284C7' }]}>
                  Taught in this Class ({chapterCovered.length})
                </Text>
              </View>
              <View style={cc.chipWrap}>
                {chapterCovered.map((concept, i) => (
                  <View key={i} style={[cc.chip, cc.chipChapterCovered]}>
                    <Ionicons color="#0284C7" name="checkmark" size={12} style={{ marginRight: 4 }} />
                    <Text style={[cc.chipText, { color: '#0284C7' }]}>{concept}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Remaining chapter concepts for other lectures */}
          {chapterRemaining.length > 0 ? (
            <View style={cc.conceptSection}>
              <View style={cc.sectionHeader}>
                <Ionicons color="#64748B" name="time-outline" size={15} />
                <Text style={[cc.sectionTitle, { color: '#334155' }]}>
                  Remaining Chapter Syllabus ({chapterRemaining.length})
                </Text>
              </View>

              {/* Informative Note: These are for upcoming lectures, not teacher errors! */}
              <View style={cc.remainingNoteBox}>
                <Ionicons color="#0284C7" name="information-circle-outline" size={16} style={{ marginTop: 2 }} />
                <Text style={cc.remainingNoteText}>
                  These {chapterRemaining.length} concepts belong to other lectures across this chapter's syllabus. They are scheduled for upcoming classes according to the micro-planner.
                </Text>
              </View>

              <View style={cc.chipWrap}>
                {chapterRemaining.map((concept, i) => (
                  <View key={i} style={[cc.chip, cc.chipChapterRemaining]}>
                    <Ionicons color="#64748B" name="ellipse-outline" size={10} style={{ marginRight: 5 }} />
                    <Text style={[cc.chipText, { color: '#475569' }]}>{concept}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const cc = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    backgroundColor: AppTheme.colors.surface,
    padding: 18,
    gap: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '800', color: AppTheme.colors.textPrimary },
  headerSubtitle: { fontSize: 12, color: AppTheme.colors.textSecondary, marginTop: 1 },

  // Summary strip
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppTheme.colors.surfaceSoft,
    borderRadius: 12,
    padding: 6,
    gap: 8,
  },
  summaryBox: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 4,
  },
  summaryBoxActive: {
    backgroundColor: AppTheme.colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  summaryBoxTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryBoxLabel: { fontSize: 12, fontWeight: '700', color: AppTheme.colors.textSecondary },
  summaryBoxBottom: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  summaryBoxValue: { fontSize: 20, fontWeight: '800' },
  summaryBoxSub: { fontSize: 11, color: AppTheme.colors.textSecondary, fontWeight: '600' },
  stripDivider: { width: 1, height: 28, backgroundColor: AppTheme.colors.border },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: AppTheme.colors.surfaceMuted,
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: AppTheme.colors.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: AppTheme.colors.textSecondary,
  },
  tabTextActive: {
    color: AppTheme.colors.surface,
  },

  // Perspective body
  perspectiveBody: {
    gap: 16,
  },

  // Context Cards
  lectureContextCard: {
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    padding: 14,
    gap: 6,
  },
  lectureContextTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tagPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagPillText: { fontSize: 11, fontWeight: '800', color: '#15803D' },
  dateBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dateText: { fontSize: 11, fontWeight: '700', color: '#0369A1' },
  lectureTopicTitle: { fontSize: 14, fontWeight: '800', color: '#166534' },
  lectureSubTopicTitle: { fontSize: 13, fontWeight: '600', color: '#15803D' },
  microPlanSnippet: { flexDirection: 'row', gap: 4, marginTop: 2, flexWrap: 'wrap' },
  microPlanLabel: { fontSize: 11, fontWeight: '700', color: '#166534' },
  microPlanValue: { fontSize: 11, color: '#14532D', flex: 1 },

  chapterContextCard: {
    borderRadius: 12,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#E0F2FE',
    padding: 14,
    gap: 6,
  },
  chapterContextTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  docCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  docCountText: { fontSize: 11, fontWeight: '700', color: '#0369A1' },
  chapterNameTitle: { fontSize: 15, fontWeight: '800', color: '#0C4A6E' },
  chapterScopeSubtitle: { fontSize: 12, color: '#0369A1', fontWeight: '500' },

  // Meters
  meterWrap: { gap: 6 },
  meterRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  pctText: { fontSize: 28, fontWeight: '800' },
  pctLabel: { fontSize: 13, color: AppTheme.colors.textSecondary, fontWeight: '600' },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: AppTheme.colors.surfaceMuted,
    overflow: 'hidden',
  },
  barFill: { height: 8, borderRadius: 4 },
  conceptCount: { fontSize: 11, color: AppTheme.colors.textSecondary, fontWeight: '600', letterSpacing: 0.3 },

  // Concepts sections
  conceptSection: { gap: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 13, fontWeight: '700' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipCovered: { backgroundColor: '#E8F7EE', borderColor: '#127A40' + '30' },
  chipMissing: { backgroundColor: '#FFF1F1', borderColor: '#B42318' + '30' },
  chipChapterCovered: { backgroundColor: '#F0F9FF', borderColor: '#0284C7' + '30' },
  chipChapterRemaining: { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1' },
  chipText: { fontSize: 12, fontWeight: '600' },

  // Status boxes
  perfectAdherenceBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 12,
    borderRadius: 10,
  },
  perfectAdherenceTitle: { fontSize: 13, fontWeight: '700', color: '#166534' },
  perfectAdherenceText: { fontSize: 12, color: '#15803D', lineHeight: 17 },

  remainingNoteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    borderRadius: 10,
    marginBottom: 4,
  },
  remainingNoteText: { fontSize: 12, color: '#475569', lineHeight: 17, flex: 1 },
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
    padding: 10, borderRadius: AppTheme.radius.medium, backgroundColor: '#FFF1F1',
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



