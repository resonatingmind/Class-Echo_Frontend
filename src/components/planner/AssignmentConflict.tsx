import { View, Text, Pressable, StyleSheet } from "react-native";

import { AppTheme } from "../../theme/AppTheme";

type Props = {
  subjectName: string;

  currentTeacherName: string;

  currentTeacherEmail: string;

  loading: boolean;

  onCancel: () => void;

  onReplace: () => void;
};

export function AssignmentConflict({
  subjectName,
  currentTeacherName,
  currentTeacherEmail,
  loading,
  onCancel,
  onReplace,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Assignment Conflict</Text>

      <Text style={styles.message}>This subject is already assigned.</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Subject</Text>

        <Text style={styles.value}>{subjectName}</Text>

        <View style={styles.divider} />

        <Text style={styles.label}>Current Teacher</Text>

        <Text style={styles.value}>{currentTeacherName}</Text>

        <Text style={styles.email}>{currentTeacherEmail}</Text>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.cancel} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>

        <Pressable
          style={[styles.replace, loading && { opacity: 0.6 }]}
          onPress={onReplace}
          disabled={loading}
        >
          <Text style={styles.replaceText}>
            {loading ? "Replacing..." : "Replace Teacher"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
  },

  message: {
    marginTop: 8,
    marginBottom: 20,
    color: "#64748B",
  },

  card: {
    backgroundColor: "#F8FAFC",
    borderRadius: AppTheme.radius.medium,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  label: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 4,
  },

  value: {
    fontSize: 17,
    fontWeight: "600",
    color: "#0F172A",
  },

  email: {
    marginTop: 4,
    color: "#64748B",
  },

  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 16,
  },

  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 24,
  },

  cancel: {
    justifyContent: "center",
    paddingHorizontal: 18,
  },

  cancelText: {
    color: "#64748B",
    fontWeight: "600",
  },

  replace: {
    backgroundColor: AppTheme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: AppTheme.radius.medium,
    marginLeft: 12,
  },

  replaceText: {
    color: "#fff",
    fontWeight: "700",
  },
});
