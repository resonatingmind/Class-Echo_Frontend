import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppTheme } from "../../theme/AppTheme";
import { TeacherDashboardSubject } from "../../types/api";

type Props = {
  row: TeacherDashboardSubject;
  onPress: () => void;
};

function formatAverageScore(score: number | null | undefined) {
  if (score === null || score === undefined) return "—";
  return score.toFixed(1);
}

export function TeacherAssignmentRow({ row, onPress }: Props) {
  const scoreColor = (() => {
    if (row.average_score === null || row.average_score === undefined) {
      return { bg: "#F3F4F6", text: "#6B7280" };
    }
    const score = row.average_score;
    if (score >= 8.0) return { bg: "#DCFCE7", text: "#15803D" };
    if (score >= 5.0) return { bg: "#FEF3C7", text: "#B45309" };
    return { bg: "#FEE2E2", text: "#B91C1C" };
  })();

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.subjectTitle} numberOfLines={1}>
            {row.subject_name}
          </Text>
          <Text style={styles.classSubtitle}>
            {row.class_name} • Sec {row.section}
          </Text>
        </View>
        <View style={[styles.scoreBadge, { backgroundColor: scoreColor.bg }]}>
          <Text style={[styles.scoreText, { color: scoreColor.text }]}>
            {formatAverageScore(row.average_score)}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="people-outline" size={16} color={AppTheme.colors.textSecondary} />
          <Text style={styles.statText}>{row.student_count} Students</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="mic-outline" size={16} color={AppTheme.colors.textSecondary} />
          <Text style={styles.statText}>{row.recording_count} Recordings</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.large,
    padding: AppTheme.spacing.l,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  titleWrap: {
    flex: 1,
    marginRight: AppTheme.spacing.m,
  },
  subjectTitle: {
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.heading3,
  },
  classSubtitle: {
    marginTop: 2,
    color: AppTheme.colors.textSecondary,
    ...AppTheme.typography.body,
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: AppTheme.radius.medium,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: "800",
  },
  divider: {
    height: 1,
    backgroundColor: AppTheme.colors.border,
    marginVertical: AppTheme.spacing.m,
  },
  statsRow: {
    flexDirection: "row",
    gap: AppTheme.spacing.l,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statText: {
    color: AppTheme.colors.textSecondary,
    fontSize: 13,
    fontWeight: "500",
  },
});

