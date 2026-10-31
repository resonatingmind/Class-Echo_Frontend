import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppTheme } from "../../theme/AppTheme";

type Props = {
  label: string;
  value?: string;
  onPress: () => void;
};

export function TeacherFilterSelect({ label, value, onPress }: Props) {
  return (
    <Pressable accessibilityRole="button" style={styles.container} onPress={onPress}>
      <View>
        <Text style={styles.label}>{label}</Text>

        <Text style={styles.value}>{value || "All"}</Text>
      </View>

      <Ionicons name="chevron-down" size={18} color={AppTheme.colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "48%",
    height: 56,
    borderRadius: AppTheme.radius.medium,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    backgroundColor: AppTheme.colors.white,
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  label: {
    fontSize: 11,
    color: AppTheme.colors.textSecondary,
    marginBottom: 2,
  },

  value: {
    fontSize: 15,
    fontWeight: "600",
    color: AppTheme.colors.textPrimary,
  },
});
