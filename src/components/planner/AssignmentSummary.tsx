import { AppTheme } from '../../theme/AppTheme';
import { View, Text, StyleSheet } from "react-native";

type Props = {
  teacherExists: boolean | null;
  teacherName: string;

  classExists: boolean | null;
  className: string;
  section: string;

  subject: string;
};

export function AssignmentSummary({
  teacherExists,
  teacherName,
  classExists,
  className,
  section,
  subject,
}: Props) {
  if (!className || !section || !subject) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Assignment Summary</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Teacher</Text>

        <Text style={styles.value}>{teacherName || "-"}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Class</Text>

        <Text style={styles.value}>{className}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Section</Text>

        <Text style={styles.value}>{section}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Subject</Text>

        <Text style={styles.value}>{subject}</Text>
      </View>

      <View style={styles.divider} />

      <Text style={styles.action}>
        {teacherExists ? "✓ Existing Teacher" : "🟡 New Teacher"}
      </Text>

      <Text style={styles.action}>
        {classExists ? "✓ Existing Class" : "🟡 New Class"}
      </Text>

      <Text style={styles.action}>
        📝 Subject will be checked during assignment
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  title: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 14,
    color: "#0F172A",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  label: {
    fontWeight: "600",
    color: "#475569",
  },

  value: {
    color: "#0F172A",
  },

  divider: {
    marginVertical: 12,
    borderTopWidth: 1,
    borderColor: "#E2E8F0",
  },

  action: {
    fontSize: 14,
    marginBottom: 6,
    color: "#334155",
  },
});


