import { StyleSheet, Text, View } from "react-native";

import { AppTheme } from "../../theme/AppTheme";

export const PLANNER_COLUMNS = {
  class: 0.9,
  section: 0.6,
  subject: 1.3,
  teacher: 1.6,
  chapters: 0.7,
  recordings: 0.8,
  action: 0.6,
};

export function PlannerTableHeader() {
  return (
    <View style={styles.row}>
      <Text style={[styles.text, { flex: PLANNER_COLUMNS.class }]}>Class</Text>
      <Text style={[styles.text, { flex: PLANNER_COLUMNS.section }]}>
        Section
      </Text>
      <Text style={[styles.text, { flex: PLANNER_COLUMNS.subject }]}>
        Subject
      </Text>
      <Text style={[styles.text, { flex: PLANNER_COLUMNS.teacher }]}>
        Teacher
      </Text>
      <Text style={[styles.text, { flex: PLANNER_COLUMNS.chapters }]}>
        Chapters
      </Text>
      <Text style={[styles.text, { flex: PLANNER_COLUMNS.recordings }]}>
        Recordings
      </Text>
      <Text
        style={[
          styles.text,
          { flex: PLANNER_COLUMNS.action, textAlign: "right" },
        ]}
      >
        Action
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppTheme.colors.surfaceMuted,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.border,
  },

  text: {
    fontSize: 11,
    fontWeight: "700",
    color: AppTheme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
});
