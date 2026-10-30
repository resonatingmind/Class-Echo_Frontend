import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppTheme } from "../../theme/AppTheme";

type Chip = {
  label: string;
  value: string;
  onRemove: () => void;
};

type Props = {
  chips: Chip[];
  onClearAll: () => void;
};

export function ActiveFilterChips({ chips, onClearAll }: Props) {
  if (chips.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.chips}>
        {chips.map((chip) => (
          <Pressable
            accessibilityRole="button"
            key={chip.label}
            style={styles.chip}
            onPress={chip.onRemove}
          >
            <Text style={styles.text}>{chip.value}</Text>

            <Ionicons name="close" size={14} color={AppTheme.colors.primary} />
          </Pressable>
        ))}
      </View>

      <Pressable accessibilityRole="button" onPress={onClearAll}>
        <Text style={styles.clear}>Clear All</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 18,
  },

  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppTheme.colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
  },

  text: {
    color: AppTheme.colors.primaryText,
    fontWeight: "600",
  },

  clear: {
    color: AppTheme.colors.dangerText,
    fontWeight: "700",
  },
});

