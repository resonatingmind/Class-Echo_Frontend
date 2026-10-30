import { AppTheme } from '../../../theme/AppTheme';
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

import { colors } from "../../../theme/colors";
import { ClassOut } from "../../../types/api";

type Props = {
  classes: ClassOut[];
  selectedClassId: number | null;
  onSelect: (classId: number) => void;
};

export function ClassChipSelector({ classes, selectedClassId, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {classes.map((item) => {
        const active = item.id === selectedClassId;
        return (
          <Pressable
            key={item.id}
            onPress={() => onSelect(item.id)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {item.name} • {item.section}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    paddingVertical: 4,
  },

  chip: {
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: AppTheme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },

  chipActive: {
    backgroundColor: AppTheme.colors.textPrimary,
    borderColor: AppTheme.colors.textPrimary,
  },

  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: AppTheme.colors.textSecondary,
  },

  chipTextActive: {
    color: AppTheme.colors.white,
  },
});


