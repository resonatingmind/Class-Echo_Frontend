import { StyleSheet, Text, View } from "react-native";

import { PlannerItemOut } from "../../types/api";
import { AppTheme } from "../../theme/AppTheme";
import { PlannerSubjectRow } from "./PlannerSubjectRow";

type Props = {
  className: string;
  section: string;
  items: PlannerItemOut[];
  onView: (item: PlannerItemOut) => void;
  onAssignTeacher: (item: PlannerItemOut) => void;
  onTeacherPress: (item: PlannerItemOut) => void;
};

export function PlannerClassGroup({
  className,
  section,
  items,
  onView,
  onAssignTeacher,
  onTeacherPress,
}: Props) {
  const staffedCount = items.filter((item) => item.teacher_id).length;
  const total = items.length;
  const fullyStaffed = total > 0 && staffedCount === total;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.className}>{className}</Text>
          <Text style={styles.section}>Section {section}</Text>
        </View>

        <View
          style={[
            styles.badge,
            fullyStaffed ? styles.badgeSuccess : styles.badgeWarning,
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              fullyStaffed ? styles.badgeTextSuccess : styles.badgeTextWarning,
            ]}
          >
            {staffedCount}/{total} staffed
          </Text>
        </View>
      </View>

      {items.map((item) => (
        <PlannerSubjectRow
          key={item.subject_id}
          item={item}
          onView={() => onView(item)}
          onAssignTeacher={onAssignTeacher}
          onTeacherPress={onTeacherPress}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.large,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    overflow: "hidden",
    marginBottom: 12,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: AppTheme.colors.surfaceMuted,
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    flexShrink: 1,
  },

  className: {
    fontSize: 15,
    fontWeight: "700",
    color: AppTheme.colors.textPrimary,
  },

  section: {
    fontSize: 12,
    color: AppTheme.colors.textSecondary,
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    flexShrink: 0,
  },

  badgeSuccess: {
    backgroundColor: AppTheme.colors.successBg,
  },

  badgeWarning: {
    backgroundColor: AppTheme.colors.warningBg,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },

  badgeTextSuccess: {
    color: AppTheme.colors.success,
  },

  badgeTextWarning: {
    color: AppTheme.colors.warning,
  },
});

