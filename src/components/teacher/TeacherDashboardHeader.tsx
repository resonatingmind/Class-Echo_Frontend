import { StyleSheet, Text, View } from "react-native";

import { AppTheme } from "../../theme/AppTheme";

export function TeacherDashboardHeader() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Teacher Dashboard</Text>

      <Text style={styles.subtitle}>
        Manage your classes, lessons and recordings.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: AppTheme.colors.textPrimary,
  },

  subtitle: {
    marginTop: 6,
    color: AppTheme.colors.textSecondary,
    fontSize: 15,
  },
});
