import { View, Text, Pressable, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { colors } from "../../theme/colors";

type Props = {
  onCreatePress: () => void;
};

export function PlannerHeader({ onCreatePress }: Props) {
  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.title}>Academic Planner</Text>

        <Text style={styles.subtitle}>
          Manage teaching assignments for the academic session.
        </Text>
      </View>

      <Pressable style={styles.button} onPress={onCreatePress}>
        <Ionicons name="add" size={18} color="#fff" />

        <Text style={styles.buttonText}>Quick assignment</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.textPrimary,
  },

  subtitle: {
    marginTop: 6,
    fontSize: 15,
    color: colors.textSecondary,
  },

  button: {
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: colors.accent,

    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
