import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppTheme } from "../../theme/AppTheme";
import { LearningPlanOut } from "../../types/api";
import { LearningPlanCard } from "./LearningPlanCard";

type Props = {
  items: LearningPlanOut[];
  onEditItem?: (item: LearningPlanOut) => void;
  onDeleteItem?: (item: LearningPlanOut) => void;
  onSelectItem?: (item: LearningPlanOut) => void;
  selectedItemId?: number | null;
  readOnly?: boolean;
};

export function LearningPlanList({
  items,
  onEditItem,
  onDeleteItem,
  onSelectItem,
  selectedItemId,
  readOnly = false,
}: Props) {
  if (items.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="journal-outline" size={40} color={AppTheme.colors.slate400} />
        <Text style={styles.emptyTitle}>No Lecture Planner Entries</Text>
        <Text style={styles.emptySubtitle}>
          Add entries to the Lecture Planner for this chapter to align lecture recordings with planned learning outcomes.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {items.map((item) => (
        <LearningPlanCard
          key={item.id}
          item={item}
          onEdit={() => onEditItem?.(item)}
          onDelete={() => onDeleteItem?.(item)}
          onSelect={() => onSelectItem?.(item)}
          isSelected={selectedItemId === item.id}
          readOnly={readOnly}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  emptyState: {
    alignItems: "center",
    padding: 32,
    gap: 12,
    borderWidth: 1.5,
    borderColor: AppTheme.colors.border,
    borderStyle: "dashed",
    borderRadius: 16,
    backgroundColor: AppTheme.colors.surface,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: AppTheme.typography.family.bold,
    color: AppTheme.colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: AppTheme.colors.textSecondary,
    textAlign: "center",
    maxWidth: 400,
  },
});
