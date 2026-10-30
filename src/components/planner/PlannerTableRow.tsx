import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { PlannerItemOut } from "../../types/api";
import { AppTheme } from "../../theme/AppTheme";
import {
  getAvatarColors,
  getInitials,
  getSubjectDotColor,
} from "./plannerUtils";

type Props = {
  item: PlannerItemOut;
  onView: () => void;
  onAssignTeacher: (item: PlannerItemOut) => void;
  onTeacherPress: (item: PlannerItemOut) => void;
};

export function PlannerTableRow({
  item,
  onView,
  onAssignTeacher,
  onTeacherPress,
}: Props) {
  const dotColor = getSubjectDotColor(item.subject_name);
  const isUnassigned = !item.teacher_id;
  const avatar = item.teacher_name ? getAvatarColors(item.teacher_name) : null;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        isUnassigned && styles.cardUnassigned,
        pressed && styles.cardPressed
      ]}
      onPress={onView}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.dot, { backgroundColor: dotColor }]} />
          <Text style={styles.subjectName} numberOfLines={1}>
            {item.subject_name}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={AppTheme.colors.textPlaceholder} />
      </View>

      <Text style={styles.classSection}>
        {item.class_name} • Section {item.section}
      </Text>

      <View style={styles.divider} />

      <View style={styles.footer}>
        <View style={styles.teacherSection}>
          {isUnassigned ? (
            <Pressable
              style={({ pressed }) => [
                styles.assignButton,
                pressed && { opacity: 0.7 }
              ]}
              onPress={(e) => {
                e.stopPropagation();
                onAssignTeacher(item);
              }}
            >
              <Ionicons
                name="alert-circle-outline"
                size={14}
                color={AppTheme.colors.warning}
              />
              <Text style={styles.assignText}>Needs Teacher</Text>
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.teacherBadge,
                pressed && { opacity: 0.7 }
              ]}
              onPress={(e) => {
                e.stopPropagation();
                onTeacherPress(item);
              }}
            >
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: avatar?.bg ?? AppTheme.colors.primaryLight },
                ]}
              >
                <Text
                  style={[
                    styles.avatarText,
                    { color: avatar?.text ?? AppTheme.colors.primaryDark },
                  ]}
                >
                  {getInitials(item.teacher_name)}
                </Text>
              </View>
              <Text style={styles.teacherName} numberOfLines={1}>
                {item.teacher_name}
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.metrics}>
          <View style={styles.metricItem}>
            <Ionicons name="document-text-outline" size={12} color={AppTheme.colors.textSecondary} />
            <Text style={styles.metricText}>{item.chapter_count}</Text>
          </View>
          <View style={styles.metricItem}>
            <Ionicons name="videocam-outline" size={12} color={AppTheme.colors.textSecondary} />
            <Text style={styles.metricText}>{item.recording_count}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.large,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    ...AppTheme.shadows.subtle,
  },
  cardUnassigned: {
    borderColor: "#FBE7C6",
    backgroundColor: "#FFFCF8",
  },
  cardPressed: {
    opacity: 0.9,
    backgroundColor: AppTheme.colors.surfaceSoft,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    paddingRight: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  subjectName: {
    fontFamily: AppTheme.typography.family.semibold,
    fontSize: 16,
    color: AppTheme.colors.textPrimary,
  },
  classSection: {
    fontFamily: AppTheme.typography.family.regular,
    fontSize: 14,
    color: AppTheme.colors.textSecondary,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: AppTheme.colors.divider,
    marginBottom: 12,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  teacherSection: {
    flex: 1,
    paddingRight: 12,
  },
  assignButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: AppTheme.colors.warningBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: AppTheme.radius.medium,
    borderWidth: 1,
    borderColor: "#FBE7C6",
  },
  assignText: {
    fontFamily: AppTheme.typography.family.semibold,
    fontSize: 12,
    color: AppTheme.colors.warning,
  },
  teacherBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: AppTheme.typography.family.bold,
    fontSize: 10,
  },
  teacherName: {
    fontFamily: AppTheme.typography.family.medium,
    fontSize: 13,
    color: AppTheme.colors.textPrimary,
    flexShrink: 1,
  },
  metrics: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  metricItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: AppTheme.colors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: AppTheme.radius.small,
  },
  metricText: {
    fontFamily: AppTheme.typography.family.medium,
    fontSize: 12,
    color: AppTheme.colors.textSecondary,
  },
});


