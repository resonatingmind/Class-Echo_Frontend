import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppTheme } from "../../theme/AppTheme";

type Props = {
  totalCount: number;
  unassignedCount: number;
  showOnlyUnassigned: boolean;
  onShowAll: () => void;
  onShowUnassigned: () => void;
};

export function PlannerStatusChips({
  totalCount,
  unassignedCount,
  showOnlyUnassigned,
  onShowAll,
  onShowUnassigned,
}: Props) {
  return (
    <View style={styles.row}>
      <Pressable
        style={[styles.chip, !showOnlyUnassigned && styles.chipActive]}
        onPress={onShowAll}
      >
        <Text
          style={[
            styles.chipText,
            !showOnlyUnassigned && styles.chipTextActive,
          ]}
        >
          All subjects · {totalCount}
        </Text>
      </Pressable>

      {unassignedCount > 0 ? (
        <Pressable
          style={[
            styles.chip,
            styles.warningChip,
            showOnlyUnassigned && styles.warningChipActive,
          ]}
          onPress={onShowUnassigned}
        >
          <Ionicons
            name="alert-circle-outline"
            size={14}
            color={colors.warning}
          />
          <Text style={styles.warningChipText}>
            Needs teacher · {unassignedCount}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },

  chip: {
    height: 30,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: AppTheme.colors.surfaceMuted,
    justifyContent: "center",
    alignItems: "center",
  },

  chipActive: {
    backgroundColor: AppTheme.colors.textPrimary,
  },

  chipText: {
    fontSize: 12,
    fontWeight: "700",
    color: AppTheme.colors.textSecondary,
  },

  chipTextActive: {
    color: "#FFFFFF",
  },

  warningChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FDF3E3",
  },

  warningChipActive: {
    borderWidth: 1.5,
    borderColor: colors.warning,
  },

  warningChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.warning,
  },
});
