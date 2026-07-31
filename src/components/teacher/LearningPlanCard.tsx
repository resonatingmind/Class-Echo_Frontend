import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppTheme } from "../../theme/AppTheme";
import { LearningPlanOut } from "../../types/api";

type Props = {
  item: LearningPlanOut;
  onEdit?: () => void;
  onDelete?: () => void;
  onSelect?: () => void;
  isSelected?: boolean;
  readOnly?: boolean;
};

export function LearningPlanCard({
  item,
  onEdit,
  onDelete,
  onSelect,
  isSelected,
  readOnly,
}: Props) {
  return (
    <Pressable
      style={[styles.card, isSelected && styles.selectedCard]}
      onPress={onSelect}
    >
      <View style={styles.header}>
        <View style={styles.dateBadge}>
          <Ionicons name="calendar-outline" size={14} color={AppTheme.colors.primaryDark} />
          <Text style={styles.dateText}>{item.date || "No Date"}</Text>
        </View>

        {!readOnly && (
          <View style={styles.actions}>
            {onEdit && (
              <Pressable style={styles.actionBtn} onPress={onEdit} hitSlop={8}>
                <Ionicons name="pencil" size={16} color={AppTheme.colors.primary} />
              </Pressable>
            )}
            {onDelete && (
              <Pressable style={[styles.actionBtn, styles.deleteBtn]} onPress={onDelete} hitSlop={8}>
                <Ionicons name="trash-outline" size={16} color={AppTheme.colors.error} />
              </Pressable>
            )}
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.topicName}>{item.topic_name}</Text>
        <Text style={styles.subTopic}>{item.sub_topic}</Text>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Activities & Classwork</Text>
          <Text style={styles.detailText}>{item.classwork_activities || "None"}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Assessment Task</Text>
          <Text style={[styles.detailText, !item.assessment_task && styles.mutedText]}>
            {item.assessment_task || "None"}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Teaching Aids</Text>
          <Text style={[styles.detailText, !item.teaching_aids && styles.mutedText]}>
            {item.teaching_aids || "None"}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Learning Outcomes</Text>
          <Text style={styles.detailText}>{item.learning_outcomes || "None"}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.large,
    ...AppTheme.shadows.subtle,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    overflow: "hidden",
  },
  selectedCard: {
    borderColor: AppTheme.colors.primary,
    backgroundColor: AppTheme.colors.primaryLight,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.border,
    backgroundColor: AppTheme.colors.surfaceMuted,
  },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: AppTheme.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: AppTheme.radius.pill,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  dateText: {
    fontSize: 12,
    fontFamily: AppTheme.typography.family.bold,
    color: AppTheme.colors.primaryDark,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  deleteBtn: {
    backgroundColor: "#FFF1F1",
    borderColor: "#FECACA",
  },
  content: {
    padding: 16,
    gap: 8,
  },
  topicName: {
    fontSize: 16,
    fontFamily: AppTheme.typography.family.bold,
    color: AppTheme.colors.textPrimary,
  },
  subTopic: {
    fontSize: 14,
    color: AppTheme.colors.textSecondary,
    marginBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: AppTheme.colors.border,
    marginVertical: 4,
  },
  detailRow: {
    gap: 4,
    marginTop: 4,
  },
  detailLabel: {
    fontSize: 11,
    fontFamily: AppTheme.typography.family.bold,
    color: AppTheme.colors.textPlaceholder,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailText: {
    fontSize: 13,
    color: AppTheme.colors.textPrimary,
    lineHeight: 18,
  },
  mutedText: {
    color: AppTheme.colors.textPlaceholder,
    fontStyle: "italic",
  },
});
