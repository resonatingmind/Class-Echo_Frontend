import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppTheme } from "../../theme/AppTheme";
import { TABLE_COLUMNS } from "./tableColumns";
import { TeacherDashboardSubject } from "../../types/api";

type Props = {
  row: TeacherDashboardSubject;
  onPress: () => void;
  onViewPress: () => void;
};

function formatAverageScore(score: number | null | undefined) {
  if (score === null || score === undefined) {
    return "—";
  }

  return score.toFixed(1);
}

export function TeacherAssignmentRow({ row, onPress, onViewPress }: Props) {
  const scoreColor = (() => {
    if (row.average_score === null || row.average_score === undefined) {
      return {
        bg: "#F3F4F6",
        text: "#6B7280",
      };
    }
    const score = row.average_score;
    if (score >= 8.0) {
      return {
        bg: "#DCFCE7",
        text: "#15803D",
      };
    } else if (score >= 5.0) {
      return {
        bg: "#FEF3C7",
        text: "#B45309",
      };
    } else {
      return {
        bg: "#FEE2E2",
        text: "#B91C1C",
      };
    }
  })();
  return (
    <Pressable style={styles.row} onPress={onPress}>
      {/* Class */}
      <Text
        style={[styles.cell, { flex: TABLE_COLUMNS.class }]}
        numberOfLines={1}
      >
        {row.class_name ?? "-"}
      </Text>

      {/* Section */}
      <Text
        style={[
          styles.cell,
          {
            flex: TABLE_COLUMNS.section,
            textAlign: "center",
          },
        ]}
      >
        {row.section ?? "-"}
      </Text>

      {/* Subject */}
      <Text
        style={[
          styles.cell,
          {
            flex: TABLE_COLUMNS.subject,
            fontWeight: "600",
          },
        ]}
        numberOfLines={1}
      >
        {row.subject_name}
      </Text>

      {/* Students */}
      <View
        style={{
          flex: TABLE_COLUMNS.students,
          alignItems: "center",
        }}
      >
        <Text style={styles.cell}>{row.student_count}</Text>
      </View>

      {/* Recordings */}
      <View
        style={{
          flex: TABLE_COLUMNS.recordings,
          alignItems: "center",
        }}
      >
        <Text style={styles.cell}>{row.recording_count}</Text>
      </View>

      {/* Avg Score */}
      <View
        style={{
          flex: TABLE_COLUMNS.aiStatus,
          alignItems: "center",
        }}
      >
        <View style={[styles.aiBadge, { backgroundColor: scoreColor.bg }]}>
          <Text style={[styles.aiText, { color: scoreColor.text }]}>
            {formatAverageScore(row.average_score)}
          </Text>
        </View>
      </View>

      <View style={{ flex: TABLE_COLUMNS.action, alignItems: "center" }}>
        <Pressable
          style={styles.viewButton}
          onPress={(e) => {
            onViewPress();
          }}
        >
          <Text style={styles.viewText}>View</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: AppTheme.radius.medium,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  cell: {
    fontSize: 14,
    color: AppTheme.colors.textPrimary,
  },
  aiBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: AppTheme.radius.small,
  },
  aiText: {
    fontSize: 13,
    fontWeight: "700",
  },
  scoreText: {
    fontSize: 14,
    fontWeight: "700",
    color: AppTheme.colors.textPrimary,
  },
  scoreTextMuted: {
    fontWeight: "400",
    color: AppTheme.colors.textSecondary,
  },
  viewButton: {
    width: 60,
    height: 34,
    borderRadius: AppTheme.radius.small,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: AppTheme.colors.primaryLight,
  },
  viewText: {
    color: AppTheme.colors.primaryDark,
    fontSize: 13,
    fontWeight: "700",
  },
});

