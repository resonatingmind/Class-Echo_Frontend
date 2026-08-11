import { StyleSheet, View } from "react-native";

import { TeacherDashboardSubject } from "../../types/api";
import { AppTheme } from "../../theme/AppTheme";

import { TeacherAssignmentRow } from "./TeacherAssignmentRow";
import { TABLE_COLUMNS } from "./tableColumns";
// import { TeacherSubjectWorkspace } from "../../navigation/AppNavigator"


type Props = {
  rows: TeacherDashboardSubject[];
  onOpenSubject: (row: TeacherDashboardSubject) => void;
};

export function TeacherAssignmentTable({
  rows,
  onOpenSubject,
}: Props) {
  return (
    <View style={styles.grid}>
      {rows.map((row) => (
        <TeacherAssignmentRow
          key={row.subject_id}
          row={row}
          onPress={() => onOpenSubject(row)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: AppTheme.spacing.m,
  },
});
