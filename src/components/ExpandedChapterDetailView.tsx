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
  onAddRecording?: () => void;
  onAddLearningPlan?: () => void;
  onAddDocument?: () => void;
  onViewRecordingReport?: (rec: RecordingWithReport) => void;
  onOpenChapterDetail?: () => void;
};

function getScoreColor(score: number | undefined | null) {
  if (score == null) return "#64748B";
  if (score >= 80) return "#127A40";
  if (score >= 60) return AppTheme.colors.primary;
  if (score >= 40) return "#92400E";
  return "#B42318";
}

function getStatusStyle(status: string) {
  const norm = status.toLowerCase();
  if (norm === "completed" || norm === "analysed") {
    return { bg: "#E8F7EE", text: "#127A40", label: "Analysed" };
  } else if (norm === "processing") {
    return { bg: "#FFF4E0", text: "#92400E", label: "Processing" };
  } else if (norm === "pending") {
    return { bg: AppTheme.colors.surfaceMuted, text: AppTheme.colors.textSecondary, label: "Pending" };
  } else {
    return { bg: "#FFF1F1", text: "#B42318", label: "No Audio" };
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
  onAddDocument,
  onViewRecordingReport,
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

  // Match recordings to Lecture Planner topics
  const assignedRecordingIds = new Set<number>();

  const titleRows = learningPlans.map((lp) => {
    const matchingRecs = recordings.filter((r) => {
      if (r.learning_plan_id === lp.id) return true;
      if (
        r.lecture_title &&
        lp.sub_topic &&
        r.lecture_title.toLowerCase().trim() === lp.sub_topic.toLowerCase().trim()
      ) {
        return true;
      }
      return false;
    });

    matchingRecs.forEach((r) => assignedRecordingIds.add(r.id));

    return {
      learningPlan: lp,
      recording: matchingRecs[0] ?? null,
      additionalRecordings: matchingRecs.slice(1),
    };
  });

  // Remaining recordings unassigned to a specific learning plan topic
  const unassignedRecordings = recordings.filter(
    (r) => !assignedRecordingIds.has(r.id)
  );

  return (
    <View style={styles.container}>

      {/* NESTED LECTURE TABLE */}
      {titleRows.length === 0 && unassignedRecordings.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="folder-open-outline" size={32} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No Lecture Titles Added Yet</Text>
          <Text style={styles.emptyText}>
            Add a chapter entry or display title to populate this lecture table.
          </Text>
          <View style={styles.emptyBtnRow}>
            {role === "teacher" && onAddRecording ? (
              <Pressable style={styles.inlineAddBtn} onPress={onAddRecording}>
                <Ionicons name="mic-outline" size={14} color="#0284C7" />
                <Text style={styles.inlineAddText}>Record First Lecture</Text>
              </Pressable>
            ) : null}
            {onOpenChapterDetail ? (
              <Pressable style={styles.inlineAddBtn} onPress={onOpenChapterDetail}>
                <Ionicons name="calendar-outline" size={14} color="#0284C7" />
                <Text style={styles.inlineAddText}>Create Lecture Title</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : (
          <View style={[styles.subTableWrapper, { width: "100%" }]}>
          {/* Sub-Table Header */}
          <View style={styles.subTableHeader}>
            <Text style={[styles.subHeaderCell, { flex: 2.2 }]}>LECTURE TITLE</Text>
            <Text style={[styles.subHeaderCell, { flex: 1.8 }]}>RECORDING AUDIO</Text>
            <Text style={[styles.subHeaderCell, { flex: 0.8, textAlign: "center" }]}>SCORE</Text>
            <Text style={[styles.subHeaderCell, { flex: 1.1, textAlign: "center" }]}>STATUS</Text>
          </View>

          {/* Sub-Table Rows */}
          {titleRows.map((row, idx) => {
            const lp = row.learningPlan;
            const rec = row.recording;
            const actualTitle = rec?.lecture_title?.trim();
            const activeTitle = actualTitle || lp.sub_topic || lp.topic_name;
            const statusStyle = getStatusStyle(rec?.status ?? "no_video");
            const score = rec?.report?.overall_score;
            const scoreCol = getScoreColor(score);

             return (
              <View key={lp.id || idx} style={styles.subTableRow}>
                {/* Column 1: Lecture Title / Display Title */}
                <View style={[{ flex: 2.2 }, styles.cellCol]}>
                  <Text style={styles.subTopicTitle} numberOfLines={2}>
                    {activeTitle}
                  </Text>
                  <View style={styles.titleMetaBadgeRow}>
                    <Text style={styles.titleTypeBadge}>
                      {actualTitle ? "Recorded Title" : "Display Title"}
                    </Text>
                    {lp.date ? <Text style={styles.subDateText}>📅 {lp.date}</Text> : null}
                  </View>
                </View>

                {/* Column 2: Recording Audio */}
                <View style={[{ flex: 1.8 }, styles.cellCol]}>
                  {rec ? (
                    <Pressable
                      style={styles.videoMetaWrap}
                      onPress={() => onViewRecordingReport?.(rec)}
                    >
                      <Ionicons name="volume-medium" size={16} color="#0284C7" />
                      <Text style={styles.videoTitleText} numberOfLines={1}>
                        {formatAudioTime(rec.duration_seconds)}
                      </Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={styles.attachVideoSmallBtn}
                      onPress={onAddRecording}
                    >
                      <Ionicons name="mic-outline" size={13} color="#0284C7" />
                      <Text style={styles.attachVideoSmallText}>+ Audio</Text>
                    </Pressable>
                  )}
                </View>

                {/* Column 3: Score */}
                <View style={[{ flex: 0.8, alignItems: "center" }, styles.cellCol]}>
                  <Text style={[styles.subScoreText, { color: scoreCol }]}>
                    {score != null ? `${Math.round(score)}%` : "—"}
                  </Text>
                </View>

                {/* Column 4: Status */}
                <View style={[{ flex: 1.1, alignItems: "center" }, styles.cellCol]}>
                  {rec && onViewRecordingReport ? (
                    <Pressable
                      onPress={() => onViewRecordingReport(rec)}
                      style={[styles.badgePill, { backgroundColor: statusStyle.bg }]}
                    >
                      <Text style={[styles.badgePillText, { color: statusStyle.text }]}>
                        {statusStyle.label}
                      </Text>
                    </Pressable>
                  ) : (
                    <View style={[styles.badgePill, { backgroundColor: statusStyle.bg }]}>
                      <Text style={[styles.badgePillText, { color: statusStyle.text }]}>
                        {statusStyle.label}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}

          {/* Unassigned recordings */}
          {unassignedRecordings.map((rec) => {
            const statusStyle = getStatusStyle(rec.status);
            const score = rec.report?.overall_score;
            const scoreCol = getScoreColor(score);
            const displayTitle = rec.lecture_title?.trim() || `Lecture Video #${rec.id}`;
            return (
              <View key={rec.id} style={styles.subTableRow}>
                <View style={[{ flex: 2.2 }, styles.cellCol]}>
                  <Text style={styles.subTopicTitle} numberOfLines={2}>
                    {displayTitle}
                  </Text>
                  <Text style={styles.titleTypeBadge}>Recorded Lecture</Text>
                </View>

                <View style={[{ flex: 1.8 }, styles.cellCol]}>
                  <View style={styles.videoMetaWrap}>
                    <Ionicons name="volume-medium" size={16} color="#0284C7" />
                    <Text style={styles.videoTitleText} numberOfLines={1}>
                      {formatAudioTime(rec.duration_seconds)}
                    </Text>
                  </View>
                </View>

                <View style={[{ flex: 0.8, alignItems: "center" }, styles.cellCol]}>
                  <Text style={[styles.subScoreText, { color: scoreCol }]}>
                    {score != null ? `${Math.round(score)}%` : "—"}
                  </Text>
                </View>

                <View style={[{ flex: 1.1, alignItems: "center" }, styles.cellCol]}>
                  {onViewRecordingReport ? (
                    <Pressable
                      onPress={() => onViewRecordingReport(rec)}
                      style={[styles.badgePill, { backgroundColor: statusStyle.bg }]}
                    >
                      <Text style={[styles.badgePillText, { color: statusStyle.text }]}>
                        {statusStyle.label}
                      </Text>
                    </Pressable>
                  ) : (
                    <View style={[styles.badgePill, { backgroundColor: statusStyle.bg }]}>
                      <Text style={[styles.badgePillText, { color: statusStyle.text }]}>
                        {statusStyle.label}
                      </Text>
                    </View>
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
  subTopicTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
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
});
