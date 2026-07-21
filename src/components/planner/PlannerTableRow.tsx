import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { PlannerItemOut } from "../../types/api";
import { colors } from "../../theme/colors";
import {
  getAvatarColors,
  getInitials,
  getSubjectDotColor,
} from "./plannerUtils";
import { PLANNER_COLUMNS } from "./PlannerTableHeader";

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
    <View style={[styles.row, isUnassigned && styles.rowUnassigned]}>
      <Text
        style={[styles.cellText, { flex: PLANNER_COLUMNS.class }]}
        numberOfLines={1}
      >
        {item.class_name}
      </Text>

      <Text
        style={[styles.cellText, { flex: PLANNER_COLUMNS.section }]}
        numberOfLines={1}
      >
        {item.section}
      </Text>

      <View style={[styles.subjectCell, { flex: PLANNER_COLUMNS.subject }]}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <Text style={styles.cellText} numberOfLines={1}>
          {item.subject_name}
        </Text>
      </View>

      <View style={{ flex: PLANNER_COLUMNS.teacher }}>
        {isUnassigned ? (
          <Pressable
            style={styles.assignPill}
            onPress={() => onAssignTeacher(item)}
          >
            <Ionicons
              name="alert-circle-outline"
              size={12}
              color={colors.warning}
            />
            <Text style={styles.assignPillText} numberOfLines={1}>
              Assign teacher
            </Text>
          </Pressable>
        ) : (
          <Pressable
            style={styles.teacherCell}
            onPress={() => onTeacherPress(item)}
          >
            <View
              style={[
                styles.avatar,
                { backgroundColor: avatar?.bg ?? colors.accentSoft },
              ]}
            >
              <Text
                style={[
                  styles.avatarText,
                  { color: avatar?.text ?? colors.accentDark },
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

      <Text style={[styles.cellText, { flex: PLANNER_COLUMNS.chapters }]}>
        {item.chapter_count}
      </Text>

      <Text style={[styles.cellText, { flex: PLANNER_COLUMNS.recordings }]}>
        {item.recording_count}
      </Text>

      <View style={{ flex: PLANNER_COLUMNS.action, alignItems: "flex-end" }}>
        <Pressable
          style={styles.viewButton}
          onPress={onView}
          hitSlop={8}
          accessibilityLabel={`View ${item.subject_name}`}
        >
          <Ionicons name="eye-outline" size={16} color={colors.accentDark} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  rowUnassigned: {
    backgroundColor: "#FDF3E3",
  },

  cellText: {
    fontSize: 13,
    color: colors.textPrimary,
    paddingRight: 6,
  },

  subjectCell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingRight: 6,
  },

  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    flexShrink: 0,
  },

  teacherCell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingRight: 6,
  },

  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  avatarText: {
    fontSize: 9,
    fontWeight: "700",
  },

  teacherName: {
    fontSize: 13,
    color: colors.textPrimary,
    flexShrink: 1,
  },

  assignPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    height: 24,
    borderRadius: 999,
    backgroundColor: "#FBE7C6",
  },

  assignPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.warning,
  },

  viewButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
});
