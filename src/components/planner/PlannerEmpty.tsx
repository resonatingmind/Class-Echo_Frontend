import { View, Text, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { colors } from "../../theme/colors";

export function PlannerEmpty() {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="search-outline" size={42} color={colors.accent} />
      </View>

      <Text style={styles.title}>No matching assignments</Text>

      <Text style={styles.subtitle}>
        Try changing your search or filters to find planner assignments.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",

    paddingVertical: 70,
    paddingHorizontal: 24,
  },

  iconCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,

    backgroundColor: "#EFF6FF",

    justifyContent: "center",
    alignItems: "center",

    marginBottom: 20,
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
  },

  subtitle: {
    marginTop: 10,

    textAlign: "center",

    color: "#64748B",

    fontSize: 15,

    lineHeight: 22,

    maxWidth: 320,
  },
});
