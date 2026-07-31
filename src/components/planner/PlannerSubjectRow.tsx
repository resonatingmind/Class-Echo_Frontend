import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { PlannerItemOut } from "../../types/api";
import { AppTheme } from "../../theme/AppTheme";
import { getAvatarColors, getInitials, getSubjectDotColor } from "./plannerUtils";

type Props = {
  item: PlannerItemOut;
  onView: () => void;
  onAssignTeacher?: (item: PlannerItemOut) => void;
  onTeacherPress?: (item: PlannerItemOut) => void;
};

export function PlannerSubjectRow({
  item,
  onView,
  onAssignTeacher,
  onTeacherPress,
}: Props) {
  const dotColor = getSubjectDotColor(item.subject_name);
  const isUnassigned = !item.teacher_id;
  const avatar = item.teacher_name ? getAvatarColors(item.teacher_name) : null;

  return (
    <View style={[styles.row, isUnassigned && styles.rowUnassigned]}>
      <View style={styles.topLine}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />

        <Text style={styles.subjectName} numberOfLines={1}>
          {item.subject_name}
        </Text>

        <Text style={styles.counts} numberOfLines={1}>
          {item.chapter_count} ch · {item.recording_count} rec
        </Text>

        <Pressable
          style={styles.viewButton}
          onPress={onView}
          hitSlop={8}
          accessibilityLabel={`View ${item.subject_name}`}
        >
          <Ionicons name="eye-outline" size={16} color={AppTheme.colors.primaryDark} />
        </Pressable>
      </View>

      <View style={styles.bottomLine}>
        {isUnassigned ? (
          <>
            <Ionicons name="alert-circle-outline" size={14} color={AppTheme.colors.warning} />
            <Text style={styles.unassignedText}>Needs teacher</Text>
            <Pressable
              style={styles.assignButton}
              onPress={() => onAssignTeacher?.(item)}
            >
              <Text style={styles.assignButtonText}>Assign</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            style={styles.teacherRow}
            onPress={() => onTeacherPress?.(item)}
          >
            <View
              style={[
                styles.avatar,
                { backgroundColor: avatar?.bg ?? AppTheme.colors.primaryLight },
              ]}
            >
              <Text style={[styles.avatarText, { color: avatar?.text ?? AppTheme.colors.primaryDark }]}>
                {getInitials(item.teacher_name)}
              </Text>
            </View>

            <Text style={styles.teacherName} numberOfLines={1}>
              {item.teacher_name}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: AppTheme.colors.border,
    gap: 6,
  },

  rowUnassigned: {
    backgroundColor: "#FDF3E3",
  },

  topLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },

  subjectName: {
    flex: 1,
    fontFamily: AppTheme.typography.family.semibold,
    fontSize: 14,
    color: AppTheme.colors.textPrimary,
  },

  counts: {
    fontFamily: AppTheme.typography.family.regular,
    fontSize: 12,
    color: AppTheme.colors.textSecondary,
    flexShrink: 0,
  },

  viewButton: {
    width: 28,
    height: 28,
    borderRadius: AppTheme.radius.large,
    backgroundColor: AppTheme.colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  bottomLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 18,
  },

  unassignedText: {
    fontFamily: AppTheme.typography.family.semibold,
    fontSize: 12,
    color: AppTheme.colors.warning,
    flex: 1,
  },

  assignButton: {
    height: 24,
    paddingHorizontal: 10,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.warning,
    alignItems: "center",
    justifyContent: "center",
  },

  assignButtonText: {
    fontFamily: AppTheme.typography.family.bold,
    fontSize: 11,
    color: "#412402",
  },

  teacherRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  avatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontFamily: AppTheme.typography.family.bold,
    fontSize: 9,
  },

  teacherName: {
    fontFamily: AppTheme.typography.family.regular,
    fontSize: 12,
    color: AppTheme.colors.textSecondary,
  },
});

