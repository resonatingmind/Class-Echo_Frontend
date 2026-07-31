import { View, Text, Pressable, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { AppTheme } from "../../theme/AppTheme";

type Props = {
  onCreatePress: () => void;
};

export function PlannerHeader({ onCreatePress }: Props) {
  return (
    <View style={styles.pageHeading}>
      <View style={styles.titleRow}>
        <Text style={styles.pageTitle}>Academic Planner</Text>
        <Pressable style={styles.addBtn} onPress={onCreatePress}>
          <Ionicons name="add" size={14} color="#fff" />
          <Text style={styles.addText}>Quick assignment</Text>
        </Pressable>
      </View>
      <Text style={styles.pageSubtitle}>
        Manage teaching assignments for the academic session.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pageHeading: {
    gap: AppTheme.spacing.s,
    marginBottom: AppTheme.spacing.m,
  },
  pageTitle: {
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.heading1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 4,
  },
  pageSubtitle: {
    color: AppTheme.colors.textSecondary,
    ...AppTheme.typography.body,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.primary,
    paddingHorizontal: AppTheme.spacing.m,
    paddingVertical: AppTheme.spacing.s,
  },
  addText: {
    color: "#fff",
    ...AppTheme.typography.button,
  },
});
