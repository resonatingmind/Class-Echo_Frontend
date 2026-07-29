import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../theme/colors";
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

      {/* Average score */}
      <View
        style={{
          flex: TABLE_COLUMNS.aiStatus,
          alignItems: "center",
        }}
      >
        <Text
          style={[
            styles.scoreText,
            row.average_score == null && styles.scoreTextMuted,
          ]}
        >
          {formatAverageScore(row.average_score)}
        </Text>
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
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cell: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  scoreTextMuted: {
    fontWeight: "400",
    color: colors.textMuted,
  },
  viewButton: {
    width: 60,
    height: 34,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.accentSoft,
  },
  viewText: {
    color: colors.accentDark,
    fontSize: 13,
    fontWeight: "700",
  },
});
