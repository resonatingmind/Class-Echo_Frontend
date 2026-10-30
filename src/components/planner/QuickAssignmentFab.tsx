import { Pressable, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { AppTheme } from "../../theme/AppTheme";

type Props = {
  onPress: () => void;
};

export function QuickAssignmentFab({ onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={styles.fab}>
      <Ionicons name="add" size={30} color={AppTheme.colors.white} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",

    right: 24,
    bottom: 30,

    width: 62,
    height: 62,

    borderRadius: 31,

    backgroundColor: AppTheme.colors.primary,

    justifyContent: "center",
    alignItems: "center",

    elevation: 8,

    shadowColor: AppTheme.colors.black,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },
});
