import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";

import { PlannerChapter, LearningPlanOut, RecordingWithReport } from "../../types/api";
import { AppTheme } from "../../theme/AppTheme";
import { CHAPTER_COLUMNS } from "./PlannerChapterTable";
import { useAuth } from "../../context/AuthContext";
import { getChapterRecordings, getSchoolLearningPlans, getSchoolSubjectRecordings } from "../../lib/api";
import { ExpandedChapterDetailView } from "../ExpandedChapterDetailView";

type Props = {
  chapter: PlannerChapter;
  subjectId?: number;
  subjectName?: string;
  isLast?: boolean;

  onOpenDocuments: () => void;
  onAddDocument: () => void;
  onOpenRecordings: () => void;
};

const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  Completed: { bg: "#E7F6EC", text: colors.success, icon: "checkmark-circle" },
  Processing: { bg: "#FDF3E3", text: colors.warning, icon: "time-outline" },
};

const DEFAULT_STATUS_STYLE = {
  bg: "#FBE7E7",
  text: "#DC2626",
  icon: "ellipse-outline" as keyof typeof Ionicons.glyphMap,
};

export function PlannerChapterRow({
  chapter,
  subjectId,
  subjectName = "",
  isLast,
  onOpenDocuments,
  onAddDocument,
  onOpenRecordings,
}: Props) {
  const { session } = useAuth();
  const navigation = useNavigation<any>();
  const statusStyle = STATUS_STYLES[chapter.status] ?? DEFAULT_STATUS_STYLE;

  const [isExpanded, setIsExpanded] = useState(false);
  const [recordings, setRecordings] = useState<RecordingWithReport[]>([]);
  const [learningPlans, setLearningPlans] = useState<LearningPlanOut[]>([]);
  const [loadingExpanded, setLoadingExpanded] = useState(false);

  const toggleExpand = async () => {
    const nextState = !isExpanded;
    setIsExpanded(nextState);

    if (nextState && session && subjectId) {
      setLoadingExpanded(true);
      try {
        const [recs, lps] = await Promise.all([
          getChapterRecordings(session.token, chapter.id),
          getSchoolLearningPlans(session.token, subjectId, chapter.id),
        ]);
        let chapterRecs = recs || [];
        if (chapterRecs.length === 0) {
          const allSubRecs = await getSchoolSubjectRecordings(session.token, subjectId);
          chapterRecs = allSubRecs.filter(
            (r) =>
              r.chapter_id === chapter.id ||
              (r.chapter_name && r.chapter_name.toLowerCase().trim() === chapter.name.toLowerCase().trim())
          );
        }
        setRecordings(chapterRecs);
        setLearningPlans(lps);
      } catch (err) {
        console.error("Error loading expanded planner row details", err);
      } finally {
        setLoadingExpanded(false);
      }
    }
  };

  return (
    <View style={!isLast ? styles.rowDivider : undefined}>
      <View style={[styles.row, isExpanded && { backgroundColor: "#F0F9FF" }]}>
        <Pressable
          style={[{ width: CHAPTER_COLUMNS.chapter, flexDirection: "row", alignItems: "center", gap: 6 }]}
          onPress={() => void toggleExpand()}
        >
          <Ionicons
            name={isExpanded ? "chevron-down" : "chevron-forward"}
            size={16}
            color="#0284C7"
          />
          <Text
            style={[styles.chapterName, { flex: 1, color: isExpanded ? "#0284C7" : AppTheme.colors.textPrimary }]}
            numberOfLines={2}
          >
            {chapter.name}
          </Text>
        </Pressable>

        <View style={[styles.cell, { width: CHAPTER_COLUMNS.material }]}>
          <Pressable onPress={onOpenDocuments} style={styles.countChip}>
            <Ionicons name="document-text-outline" size={14} color="#7C3AED" />
            <Text style={[styles.countChipText, { color: "#7C3AED" }]}>
              {chapter.document_count}
            </Text>
          </Pressable>

          <Pressable
            onPress={onAddDocument}
            style={styles.addButton}
            hitSlop={6}
            accessibilityLabel={`Add material to ${chapter.name}`}
          >
            <Ionicons name="add" size={14} color={AppTheme.colors.primaryDark} />
          </Pressable>
        </View>

        <View style={[styles.cell, { width: CHAPTER_COLUMNS.recordings }]}>
          <Pressable onPress={() => void toggleExpand()} style={styles.countChip}>
            <Ionicons name="videocam-outline" size={14} color="#EA580C" />
            <Text style={[styles.countChipText, { color: "#EA580C" }]}>
              {chapter.recording_count}
            </Text>
          </Pressable>
        </View>

        <View style={{ width: CHAPTER_COLUMNS.score }}>
          <Text
            style={[
              styles.scoreText,
              chapter.average_score == null && styles.scoreTextMuted,
            ]}
          >
            {chapter.average_score == null ? "—" : `${chapter.average_score}%`}
          </Text>
        </View>

        <View style={{ width: CHAPTER_COLUMNS.status, alignItems: "flex-end" }}>
          <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
            <Ionicons name={statusStyle.icon} size={12} color={statusStyle.text} />
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {chapter.status}
            </Text>
          </View>
        </View>
      </View>

      {isExpanded ? (
        <View style={{ paddingHorizontal: 12, paddingBottom: 10 }}>
          <ExpandedChapterDetailView
            chapterId={chapter.id}
            chapterName={chapter.name}
            subjectId={subjectId || 0}
            subjectName={subjectName}
            recordings={recordings}
            learningPlans={learningPlans}
            loading={loadingExpanded}
            role="school_admin"
            onAddDocument={onAddDocument}
            onOpenChapterDetail={onOpenDocuments}
            onViewRecordingReport={(rec) => {
              navigation.navigate("RecordingDetail", {
                recording: rec,
                subjectName,
              });
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.border,
  },

  chapterName: {
    fontSize: 13,
    fontWeight: "600",
    color: AppTheme.colors.textPrimary,
    paddingRight: 12,
  },

  cell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  countChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: AppTheme.colors.surfaceMuted,
  },

  countChipText: {
    fontSize: 12,
    fontWeight: "700",
  },

  addButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: AppTheme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  scoreText: {
    fontSize: 13,
    fontWeight: "700",
    color: AppTheme.colors.textPrimary,
  },

  scoreTextMuted: {
    fontWeight: "400",
    color: AppTheme.colors.textSecondary,
  },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
