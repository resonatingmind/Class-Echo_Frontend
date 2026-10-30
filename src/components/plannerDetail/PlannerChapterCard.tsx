import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";

import { PlannerChapter, LearningPlanOut } from "../../types/api";
import { AppTheme } from "../../theme/AppTheme";
import { useAuth } from "../../context/AuthContext";
import { getChapterRecordings, getSchoolLearningPlans, getSchoolSubjectRecordings } from "../../lib/api";
import { ExpandedChapterDetailView } from "../ExpandedChapterDetailView";

type Props = {
  chapter: PlannerChapter;
  subjectId?: number;
  subjectName?: string;

  onOpenDocuments: () => void;
  onAddDocument: () => void;
  onOpenRecordings: () => void;
};

const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  Completed: { bg: AppTheme.colors.successBg, text: AppTheme.colors.success, icon: "checkmark-circle" },
  Processing: { bg: AppTheme.colors.warningBg, text: AppTheme.colors.warning, icon: "time-outline" },
};

const DEFAULT_STATUS_STYLE = {
  bg: "#FBE7E7",
  text: AppTheme.colors.danger,
  icon: "ellipse-outline" as keyof typeof Ionicons.glyphMap,
};

export function PlannerChapterCard({
  chapter,
  subjectId,
  subjectName = "",
  onOpenDocuments,
  onAddDocument,
}: Props) {
  const { session } = useAuth();
  const navigation = useNavigation<any>();
  const statusStyle = STATUS_STYLES[chapter.status] ?? DEFAULT_STATUS_STYLE;

  const [isExpanded, setIsExpanded] = useState(false);
  const [recordings, setRecordings] = useState<any[]>([]);
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
        let chapterRecs: any[] = recs || [];
        if (chapterRecs.length === 0) {
          const allSubRecs = await getSchoolSubjectRecordings(session.token, subjectId);
          chapterRecs = allSubRecs.filter(
            (r) =>
              r.chapter_id === chapter.id ||
              (r.chapter_name && r.chapter_name.toLowerCase().trim() === chapter.name.toLowerCase().trim())
          );
        }
        setRecordings(chapterRecs as any);
        setLearningPlans(lps);
      } catch (err) {
        console.error("Error loading expanded planner row details", err);
      } finally {
        setLoadingExpanded(false);
      }
    }
  };

  return (
    <View style={[styles.card, isExpanded && styles.cardExpanded]}>
      <Pressable accessibilityRole="button" style={styles.header} onPress={() => void toggleExpand()}>
        <Text
          style={[styles.chapterName, { color: isExpanded ? AppTheme.colors.primaryDark : AppTheme.colors.textPrimary }]}
          numberOfLines={2}
        >
          {chapter.name}
        </Text>
        <View style={styles.headerRight}>
          <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
            <Ionicons name={statusStyle.icon} size={12} color={statusStyle.text} />
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {chapter.status}
            </Text>
          </View>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={20}
            color={AppTheme.colors.textSecondary}
          />
        </View>
      </Pressable>

      <View style={styles.metricsContainer}>
        <View style={styles.metricGroup}>
          <Text style={styles.metricLabel}>Material</Text>
          <View style={styles.metricActionRow}>
            <Pressable accessibilityRole="button" onPress={onOpenDocuments} style={styles.countChip}>
              <Ionicons name="document-text-outline" size={14} color={AppTheme.colors.violet} />
              <Text style={[styles.countChipText, { color: AppTheme.colors.violet }]}>
                {chapter.document_count}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add document"
              onPress={onAddDocument}
              style={styles.addButton}
              hitSlop={8}
            >
              <Ionicons name="add" size={14} color={AppTheme.colors.primaryDark} />
            </Pressable>
          </View>
        </View>

        <View style={styles.metricGroup}>
          <Text style={styles.metricLabel}>Recordings</Text>
          <Pressable accessibilityRole="button" onPress={() => void toggleExpand()} style={styles.countChip}>
            <Ionicons name="videocam-outline" size={14} color={AppTheme.colors.orange} />
            <Text style={[styles.countChipText, { color: AppTheme.colors.orangeText }]}>
              {chapter.recording_count}
            </Text>
          </Pressable>
        </View>

        <View style={styles.metricGroup}>
          <Text style={styles.metricLabel}>AI Score</Text>
          <Text
            style={[
              styles.scoreText,
              chapter.average_score == null && styles.scoreTextMuted,
            ]}
          >
            {chapter.average_score == null ? "—" : `${chapter.average_score}%`}
          </Text>
        </View>
      </View>

      {isExpanded && (
        <View style={styles.expandedContent}>
          <View style={styles.divider} />
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.large,
    ...AppTheme.shadows.subtle,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "transparent",
    overflow: "hidden",
  },
  cardExpanded: {
    borderColor: AppTheme.colors.primaryLight,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 16,
    gap: 12,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chapterName: {
    flex: 1,
    fontSize: 15,
    fontFamily: AppTheme.typography.family.semibold,
    lineHeight: 22,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: AppTheme.radius.pill,
  },
  statusText: {
    fontSize: 11,
    fontFamily: AppTheme.typography.family.bold,
  },
  metricsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  metricGroup: {
    flex: 1,
    gap: 6,
  },
  metricLabel: {
    fontSize: 12,
    fontFamily: AppTheme.typography.family.medium,
    color: AppTheme.colors.textSecondary,
  },
  metricActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  countChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: AppTheme.radius.pill,
    backgroundColor: AppTheme.colors.surfaceMuted,
  },
  countChipText: {
    fontSize: 12,
    fontFamily: AppTheme.typography.family.bold,
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: AppTheme.radius.pill,
    backgroundColor: AppTheme.colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreText: {
    fontSize: 15,
    fontFamily: AppTheme.typography.family.bold,
    color: AppTheme.colors.textPrimary,
    marginTop: 4,
  },
  scoreTextMuted: {
    color: AppTheme.colors.hint,
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: AppTheme.colors.divider,
    marginBottom: 16,
  },
});
