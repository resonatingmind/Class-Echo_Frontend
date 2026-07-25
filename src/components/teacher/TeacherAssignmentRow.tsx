import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../theme/colors";
import { TABLE_COLUMNS } from "./tableColumns";
import { TeacherDashboardSubject } from "../../types/api";

type Props = {
  row: TeacherDashboardSubject;
  onPress: () => void;
  onViewPress: () => void;
};

// Helper function to dynamically color code the AI statuses
function getStatusStyle(status: TeacherDashboardSubject["ai_status"]) {
  switch (status) {
    case "Completed":
      return { bg: "#E8F7EE", text: "#127A40" }; // Mint Green
    case "Processing":
      return { bg: "#FFF4E0", text: "#92400E" }; // Soft Amber
    case "Failed":
      return { bg: "#FFF1F1", text: "#B42318" }; // Soft Red
    case "No Recording":
    default:
      return { bg: "#F1F5F9", text: "#64748B" }; // Slate Gray
  }
}

export function TeacherAssignmentRow({ row, onPress, onViewPress}: Props) {
  const badgeStyle = getStatusStyle(row.ai_status);

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
            {row.average_score !== null && row.average_score !== undefined
              ? row.average_score.toFixed(1)
              : "—"}
          </Text>
        </View>
      </View>

      {/* View Action Container (Transformed to View so the whole row click catches seamlessly) */}
      {/* <View
        style={{
          flex: TABLE_COLUMNS.action,
          alignItems: "center",
        }}
      >
        <View style={styles.viewButton}>
          <Text style={styles.viewText}>View</Text>
        </View>
      </View> */}

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
  aiBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 95, // Keeps the badges perfectly uniform across status length variations
  },
  aiText: {
    fontSize: 11,
    fontWeight: "700",
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
