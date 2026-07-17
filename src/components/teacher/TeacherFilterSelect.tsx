import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../theme/colors";

type Props = {
  label: string;
  value?: string;
  onPress: () => void;
};

export function TeacherFilterSelect({ label, value, onPress }: Props) {
  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View>
        <Text style={styles.label}>{label}</Text>

        <Text style={styles.value}>{value || "All"}</Text>
      </View>

      <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "48%",
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  label: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
  },

  value: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
});
