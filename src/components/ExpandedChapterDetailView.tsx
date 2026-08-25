import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppTheme } from "../theme/AppTheme";
import { LearningPlanOut, RecordingWithReport } from "../types/api";
import { formatAudioTime } from "../lib/audio";

type Props = {
  chapterId: number;
  chapterName: string;
  subjectId: number;
  subjectName: string;
  recordings: RecordingWithReport[];
  learningPlans: LearningPlanOut[];
  loading?: boolean;
  role?: "teacher" | "school_admin";
  onAddRecording?: (learningPlanId?: number, lectureTitle?: string, replaceRecordingId?: number) => void;
  onAddLearningPlan?: () => void;
  onEditLearningPlan?: (lp: LearningPlanOut) => void;
  onAddDocument?: () => void;
  onViewRecordingReport?: (rec: RecordingWithReport) => void;
  onSelectLearningPlan?: (lp: LearningPlanOut) => void;
  onRetryRecording?: (rec: RecordingWithReport) => void;
  onOpenChapterDetail?: () => void;
};

function getScoreColor(score: number | undefined | null) {
  if (score == null) return "#64748B";
  if (score >= 80) return "#127A40";
  if (score >= 60) return AppTheme.colors.primary;
  if (score >= 40) return "#92400E";
  return "#B42318";
}

function getStatusStyle(status?: string | null) {
  const norm = (status || "").toLowerCase();
  if (norm === "completed" || norm === "analysed") {
    return { bg: "#E8F7EE", text: "#127A40", label: "Analysed" };
  } else if (norm === "processing") {
    return { bg: "#FFF4E0", text: "#92400E", label: "Processing" };
  } else if (norm === "pending") {
    return { bg: AppTheme.colors.surfaceMuted, text: AppTheme.colors.textSecondary, label: "Pending" };
  } else if (norm === "failed") {
    return { bg: "#FFF1F1", text: "#B42318", label: "Failed" };
  } else {
    return { bg: "#F1F5F9", text: "#64748B", label: "No Audio" };
  }
}

export function ExpandedChapterDetailView({
  chapterName,
  subjectName,
  recordings,
  learningPlans,
  loading = false,
  role = "teacher",
  onAddRecording,
  onAddLearningPlan,
  onEditLearningPlan,
  onAddDocument,
  onViewRecordingReport,
  onSelectLearningPlan,
  onRetryRecording,
  onOpenChapterDetail,
}: Props) {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#0284C7" />
        <Text style={styles.loadingText}>
          Loading lecture table for {chapterName}...
        </Text>
      </View>
    );
  }

  // Match recordings to lectures (Lecture Planner sub-topics).
  // A recording bound to a lecture via learning_plan_id belongs to that lecture only;
  // title matching is a fallback for older recordings that were never bound.
  const assignedRecordingIds = new Set<number>();

  const titleRows = learningPlans.map((lp) => {
    const matchingRecs = recordings.filter((r) => {
      if (assignedRecordingIds.has(r.id)) return false;
      if (r.learning_plan_id != null) return r.learning_plan_id === lp.id;
      return Boolean(
        r.lecture_title &&
          lp.sub_topic &&
          r.lecture_title.toLowerCase().trim() === lp.sub_topic.toLowerCase().trim()
      );
    });

    matchingRecs.forEach((r) => assignedRecordingIds.add(r.id));

    return {
      learningPlan: lp,
      recordings: matchingRecs,
    };
  });

  // Remaining recordings unassigned to a specific learning plan topic
  const unassignedRecordings = recordings.filter(
    (r) => !assignedRecordingIds.has(r.id)
  );

  // Calculate stats
  const getRecScore = (r: RecordingWithReport) => r.report?.overall_score ?? (r as any).overall_score;
  const gradedRecordings = recordings.filter(r => getRecScore(r) != null);
  const averageScore = gradedRecordings.length > 0
    ? Math.round(gradedRecordings.reduce((sum, r) => sum + (getRecScore(r) || 0), 0) / gradedRecordings.length)
    : null;

  return (
    <View style={styles.container}>
      <View style={[styles.statsBar, { justifyContent: "space-between" }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <View style={styles.statItem}>
            <Ionicons name="mic-outline" size={14} color="#64748B" />
            <Text style={styles.statLabel}>Total Lectures:</Text>
            <Text style={styles.statValue}>{titleRows.length + unassignedRecordings.length}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="analytics-outline" size={14} color={getScoreColor(averageScore)} />
            <Text style={styles.statLabel}>Avg Chapter Score:</Text>
            <Text style={[styles.statValue, { color: getScoreColor(averageScore) }]}>
              {averageScore != null ? `${averageScore}%` : "—"}
            </Text>
          </View>
        </View>
        {role === "teacher" && onAddLearningPlan ? (
          <Pressable style={styles.secondaryActionBtn} onPress={onAddLearningPlan}>
            <Ionicons name="add" size={13} color="#0284C7" />
            <Text style={styles.secondaryActionText}>Add lecture</Text>
          </Pressable>
        ) : null}
      </View>

      {/* NESTED LECTURE TABLE */}
      {titleRows.length === 0 && unassignedRecordings.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="folder-open-outline" size={32} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No Lecture Titles Added Yet</Text>
          <Text style={styles.emptyText}>
            Add a lecture title to populate this lecture table.
          </Text>
          <View style={styles.emptyBtnRow}>
            {/* Audio belongs to a lecture, so a lecture has to exist first. */}
            {role === "teacher" && onAddLearningPlan ? (
              <Pressable style={styles.inlineAddBtn} onPress={onAddLearningPlan}>
                <Ionicons name="add-circle-outline" size={14} color="#0284C7" />
                <Text style={styles.inlineAddText}>Create Lecture Title</Text>
              </Pressable>
            ) : null}
            {onOpenChapterDetail ? (
              <Pressable style={styles.inlineAddBtn} onPress={onOpenChapterDetail}>
                <Ionicons name="calendar-outline" size={14} color="#0284C7" />
                <Text style={styles.inlineAddText}>Open Lecture Planner</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : (
          <View style={[styles.subTableWrapper, { width: "100%" }]}>
          {/* Sub-Table Header */}
          <View style={styles.subTableHeader}>
            <Text style={[styles.subHeaderCell, { flex: 2.8 }]}>LECTURE TITLE</Text>
            <Text style={[styles.subHeaderCell, { flex: 0.8, textAlign: "center" }]}>SCORE</Text>
            <Text style={[styles.subHeaderCell, { flex: 1.1, textAlign: "center" }]}>STATUS</Text>
            <Text style={[styles.subHeaderCell, { flex: 0.8, textAlign: "center" }]}>ACTION</Text>
          </View>

          {/* Sub-Table Rows */}
          {titleRows.map((row, idx) => {
            const lp = row.learningPlan;
            const lectureName = lp.sub_topic || lp.topic_name;
            const recs = row.recordings;

            if (recs.length === 0) {
              const statusStyle = getStatusStyle("no_video");
              const canClick = Boolean(
                onSelectLearningPlan ||
                (role === "teacher" && onAddRecording)
              );

              const handlePress = () => {
                if (onSelectLearningPlan) {
                  onSelectLearningPlan(lp);
                } else if (role === "teacher" && onAddRecording) {
                  onAddRecording(lp.id, lectureName);
                }
              };

              return (
                <View key={lp.id || idx} style={styles.subTableRow}>
                  <Pressable
                    style={[{ flex: 2.8 }, styles.cellCol, canClick && styles.clickableCell]}
                    onPress={canClick ? handlePress : undefined}
                    disabled={!canClick}
                  >
                    <Text
                      style={[styles.subTopicTitle, canClick && styles.clickableTitle]}
                      numberOfLines={2}
                    >
                      {lectureName}
                    </Text>
                    {lp.date ? (
                      <View style={styles.titleMetaBadgeRow}>
                        <Text style={styles.subDateText}>📅 {lp.date}</Text>
                      </View>
                    ) : null}
                  </Pressable>

                  <View style={[{ flex: 0.8, alignItems: "center" }, styles.cellCol]}>
                    <Text style={[styles.subScoreText, { color: getScoreColor(null) }]}>—</Text>
                  </View>

                  <View style={[{ flex: 1.1, alignItems: "center" }, styles.cellCol]}>
                    <View style={[styles.badgePill, { backgroundColor: statusStyle.bg }]}>
                      <Text style={[styles.badgePillText, { color: statusStyle.text }]}>
                        {statusStyle.label}
                      </Text>
                    </View>
                  </View>

                  <View style={[{ flex: 0.8, alignItems: "center", justifyContent: "center" }, styles.cellCol]}>
                    {onEditLearningPlan ? (
                      <Pressable
                        style={styles.actionIconBtn}
                        onPress={() => onEditLearningPlan(lp)}
                        hitSlop={8}
                      >
                        <Ionicons name="create-outline" size={15} color="#0284C7" />
                      </Pressable>
                    ) : role === "teacher" && onAddRecording ? (
                      <Pressable
                        style={styles.subRecordBtn}
                        onPress={() => onAddRecording(lp.id, lectureName)}
                      >
                        <Ionicons name="mic-outline" size={12} color="#ffffff" />
                        <Text style={styles.subRecordText}>+ Audio</Text>
                      </Pressable>
                    ) : (
                      <Text style={styles.emptyActionText}>—</Text>
                    )}
                  </View>
                </View>
              );
            }

            /* One row per recording of this lecture */
            return recs.map((rec, recIdx) => {
              const statusStyle = getStatusStyle(rec.status);
              const score = rec.report?.overall_score ?? (rec as any).overall_score;
              const scoreCol = getScoreColor(score);
              const recTitle = rec.lecture_title?.trim();
              const canClick = Boolean(onViewRecordingReport);

              const handlePress = () => {
                if (onViewRecordingReport) {
                  onViewRecordingReport(rec);
                }
              };

              return (
                <View key={`${lp.id || idx}-${rec.id}`} style={styles.subTableRow}>
                  <Pressable
                    style={[{ flex: 2.8 }, styles.cellCol, canClick && styles.clickableCell]}
                    onPress={canClick ? handlePress : undefined}
                    disabled={!canClick}
                  >
                    <Text
                      style={[styles.subTopicTitle, canClick && styles.clickableTitle]}
                      numberOfLines={2}
                    >
                      {recIdx === 0 ? lectureName : `↳ ${recTitle || `Audio #${rec.id}`}`}
                    </Text>
                    {recIdx === 0 && lp.date ? (
                      <View style={styles.titleMetaBadgeRow}>
                        <Text style={styles.subDateText}>📅 {lp.date}</Text>
                      </View>
                    ) : null}
                  </Pressable>

                  <View style={[{ flex: 0.8, alignItems: "center" }, styles.cellCol]}>
                    <Text style={[styles.subScoreText, { color: scoreCol }]}>
                      {score != null ? `${Math.round(score)}%` : "—"}
                    </Text>
                  </View>

                  <View style={[{ flex: 1.1, alignItems: "center" }, styles.cellCol]}>
                    <View style={[styles.badgePill, { backgroundColor: statusStyle.bg }]}>
                      <Text style={[styles.badgePillText, { color: statusStyle.text }]}>
                        {statusStyle.label}
                      </Text>
                    </View>
                  </View>

                  <View style={[{ flex: 0.8, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 4 }, styles.cellCol]}>
                    {onViewRecordingReport ? (
                      <Pressable
                        style={styles.subReportBtn}
                        onPress={() => onViewRecordingReport(rec)}
                        hitSlop={6}
                      >
                        <Ionicons name="document-text-outline" size={12} color="#0284C7" />
                        <Text style={styles.subReportText}>Report</Text>
                      </Pressable>
                    ) : recIdx === 0 && onEditLearningPlan ? (
                      <Pressable
                        style={styles.actionIconBtn}
                        onPress={() => onEditLearningPlan(lp)}
                        hitSlop={8}
                      >
                        <Ionicons name="create-outline" size={15} color="#0284C7" />
                      </Pressable>
                    ) : (
                      <Text style={styles.emptyActionText}>—</Text>
                    )}
                  </View>
                </View>
              );
            });
          })}

          {/* Unassigned recordings */}
          {unassignedRecordings.map((rec) => {
            const statusStyle = getStatusStyle(rec.status);
            const score = rec.report?.overall_score ?? (rec as any).overall_score;
            const scoreCol = getScoreColor(score);
            const displayTitle = rec.lecture_title?.trim() || `Lecture Audio #${rec.id}`;
            const canClick = Boolean(onViewRecordingReport);

            return (
              <View key={rec.id} style={styles.subTableRow}>
                <Pressable
                  style={[{ flex: 2.8 }, styles.cellCol, canClick && styles.clickableCell]}
                  onPress={canClick ? () => onViewRecordingReport!(rec) : undefined}
                  disabled={!canClick}
                >
                  <Text
                    style={[styles.subTopicTitle, canClick && styles.clickableTitle]}
                    numberOfLines={2}
                  >
                    {displayTitle}
                  </Text>
                </Pressable>

                <View style={[{ flex: 0.8, alignItems: "center" }, styles.cellCol]}>
                  <Text style={[styles.subScoreText, { color: scoreCol }]}>
                    {score != null ? `${Math.round(score)}%` : "—"}
                  </Text>
                </View>

                <View style={[{ flex: 1.1, alignItems: "center" }, styles.cellCol]}>
                  <View style={[styles.badgePill, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.badgePillText, { color: statusStyle.text }]}>
                      {statusStyle.label}
                    </Text>
                  </View>
                </View>

                <View style={[{ flex: 0.8, alignItems: "center", justifyContent: "center" }, styles.cellCol]}>
                  {onViewRecordingReport ? (
                    <Pressable
                      style={styles.subReportBtn}
                      onPress={() => onViewRecordingReport(rec)}
                      hitSlop={6}
                    >
                      <Ionicons name="document-text-outline" size={12} color="#0284C7" />
                      <Text style={styles.subReportText}>Report</Text>
                    </Pressable>
                  ) : (
                    <Text style={styles.emptyActionText}>—</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Footer Row */}
      <View style={styles.footerRow}>
        {onAddDocument ? (
          <Pressable style={styles.footerBtn} onPress={onAddDocument}>
            <Ionicons name="document-attach-outline" size={15} color="#0284C7" />
            <Text style={styles.footerBtnText}>Chapter PDF Materials</Text>
          </Pressable>
        ) : null}

        {onOpenChapterDetail ? (
          <Pressable style={styles.footerBtn} onPress={onOpenChapterDetail}>
            <Ionicons name="easel-outline" size={15} color="#475569" />
            <Text style={styles.footerBtnTextMuted}>Open Chapter Details →</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    paddingTop: 8,
  },
  titleWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  dropdownTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  loadingContainer: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F8FAFC",
    borderRadius: AppTheme.radius.small,
  },
  loadingText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  breadcrumbBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: AppTheme.radius.small,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  breadcrumbLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  breadcrumbSubject: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
  },
  breadcrumbChapter: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0F172A",
  },
  breadcrumbTitleCount: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0284C7",
  },
  topActionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0284C7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  actionBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  secondaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  secondaryActionText: {
    color: "#0284C7",
    fontSize: 11,
    fontWeight: "700",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: AppTheme.radius.medium,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 4,
  },
  emptyText: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
  },
  emptyBtnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  inlineAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F0F9FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  inlineAddText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0284C7",
  },

  /* Sub-Table Styles */
  subTableWrapper: {
    backgroundColor: "#FFFFFF",
    borderRadius: AppTheme.radius.medium,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    overflow: "hidden",
  },
  subTableHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#CBD5E1",
  },

  subHeaderCell: {
    fontSize: 10,
    fontWeight: "800",
    color: "#475569",
    letterSpacing: 0.5,
  },
  subTableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  cellCol: {
    paddingRight: 6,
  },
  clickableCell: {
    // @ts-ignore
    cursor: "pointer",
  },
  subTopicTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  clickableTitle: {
    color: "#0284C7",
  },
  titleMetaBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  titleTypeBadge: {
    fontSize: 9,
    fontWeight: "700",
    color: "#0284C7",
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  subDateText: {
    fontSize: 10,
    color: "#64748B",
  },
  teachingPlanText: {
    fontSize: 11,
    color: "#334155",
    lineHeight: 15,
  },
  mutedPlaceholder: {
    fontSize: 11,
    color: "#94A3B8",
    fontStyle: "italic",
  },
  addPlanSmallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  addPlanSmallText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0284C7",
  },
  videoMetaWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  videoTitleText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0F172A",
  },
  attachVideoSmallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  attachVideoSmallText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0284C7",
  },
  subScoreText: {
    fontSize: 12,
    fontWeight: "800",
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: "700",
  },
  actionIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    alignItems: "center",
    justifyContent: "center",
    // @ts-ignore
    cursor: "pointer",
  },
  emptyActionText: {
    fontSize: 12,
    color: "#94A3B8",
  },
  subReportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  subReportText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0284C7",
  },
  subRecordBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#0284C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  subRecordText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ffffff",
  },

  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 10,
    marginTop: 2,
  },
  footerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footerBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0284C7",
  },
  footerBtnTextMuted: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  statsBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 16,
    marginBottom: 8,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  statValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  statDivider: {
    width: 1,
    height: 14,
    backgroundColor: "#CBD5E1",
  },
});
