import { StyleSheet, Text, View } from "react-native";

import { TeacherDashboardSubject } from "../../types/api";
import { colors } from "../../theme/colors";

import { TeacherAssignmentRow } from "./TeacherAssignmentRow";
import { TABLE_COLUMNS } from "./tableColumns";
// import { TeacherSubjectWorkspace } from "../../navigation/AppNavigator"


type Props = {
  rows: TeacherDashboardSubject[];
  onOpenSubject: (row: TeacherDashboardSubject) => void;
  onOpenWorkspace: (row: TeacherDashboardSubject) => void;
};

export function TeacherAssignmentTable({
  rows,
  onOpenSubject,
  onOpenWorkspace,
}: Props) {
  return (
    <View>
      <View style={styles.header}>
        <Text style={[styles.headerText, { flex: TABLE_COLUMNS.class }]}>
          Class
        </Text>

        <Text
          style={[
            styles.headerText,
            {
              flex: TABLE_COLUMNS.section,
              textAlign: "center",
            },
          ]}
        >
          Sec
        </Text>

        <Text style={[styles.headerText, { flex: TABLE_COLUMNS.subject }]}>
          Subject
        </Text>

        <Text
          style={[
            styles.headerText,
            {
              flex: TABLE_COLUMNS.students,
              textAlign: "center",
            },
          ]}
        >
          Students
        </Text>

        <Text
          style={[
            styles.headerText,
            {
              flex: TABLE_COLUMNS.recordings,
              textAlign: "center",
            },
          ]}
        >
          Recordings
        </Text>

        <Text
          style={[
            styles.headerText,
            {
              flex: TABLE_COLUMNS.aiStatus,
              textAlign: "center",
            },
          ]}
        >
          Status
        </Text>

        <Text
          style={[
            styles.headerText,
            {
              flex: TABLE_COLUMNS.action,
              textAlign: "center",
            },
          ]}
        >
          Action
        </Text>
      </View>

      {rows.map((row) => (
        <TeacherAssignmentRow
          key={row.subject_id}
          row={row}
          onPress={() => onOpenSubject(row)}
          //   onViewPress={() => onOpenDetails(row)}
          onViewPress={() => onOpenWorkspace(row)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    marginBottom: 10,
    paddingHorizontal: 14,
  },

  headerText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
  },
});
