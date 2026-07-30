import { View, Pressable, Text, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { AppTheme } from "../../theme/AppTheme";

type Props = {
  onQuickAssignment: () => void;
};

export function PlannerToolbar({ onQuickAssignment }: Props) {
  return (
    <View style={styles.container}>
      <Pressable style={styles.button} onPress={onQuickAssignment}>
        <Ionicons name="person-add" size={18} color="#5e5a5a" />

        <Text style={styles.text}>Quick Assignment</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    marginBottom: 16,

    alignItems: "flex-end",
  },

  button: {
    flexDirection: "row",

    alignItems: "center",

    backgroundColor: colors.primary,

    paddingHorizontal: 18,
    paddingVertical: 12,

    borderRadius: AppTheme.radius.medium,
  },

  text: {
    color: "#5e5a5a",

    marginLeft: 8,

    fontWeight: "600",

    fontSize: 15,
  },
});
