import { Pressable, StyleSheet, Text, View } from "react-native";

import { PlannerItemOut } from "../../types/api";
import { colors } from "../../theme/colors";

type Props = {
  item: PlannerItemOut;

  onView: () => void;
  onTeacherPress?: (item: PlannerItemOut) => void;
};

export function PlannerTableRow({ item, onView, onTeacherPress }: Props) {
  return (
    <View style={styles.row}>
      <Text style={[styles.value, { flex: 1.1 }]}>{item.class_name}</Text>

      <Text style={[styles.value, { flex: 1.1 }]}>{item.section}</Text>

      <Text style={[styles.value, { flex: 1.5 }]}>{item.subject_name}</Text>

      <Text numberOfLines={1} style={[styles.value, { flex: 1.6 }]}>
        {/* {item.teacher_name ?? "-"} */}
        {item.teacher_id ? (
          <Pressable onPress={() => onTeacherPress?.(item)}>
            <Text style={styles.teacherLink}>{item.teacher_name}</Text>
          </Pressable>
        ) : (
          <Text style={styles.unassignedTeacher}>Not Assigned</Text>
        )}
      </Text>

      <Text style={[styles.value, { flex: 0.9 }]}>{item.chapter_count}</Text>

      <Text style={[styles.value, { flex: 1.1 }]}>{item.recording_count}</Text>

      <Pressable style={styles.button} onPress={onView}>
        <Text style={styles.buttonText}>View</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 60,

    borderBottomWidth: 1,

    borderBottomColor: "#F1F5F9",

    flexDirection: "row",

    alignItems: "center",

    paddingHorizontal: 16,
  },

  value: {
    fontSize: 14,

    color: "#0F172A",
  },

  button: {
    backgroundColor: "#2563EB",

    borderRadius: 8,

    paddingHorizontal: 14,

    paddingVertical: 8,
  },

  buttonText: {
    color: "#fff",

    fontWeight: "700",

    fontSize: 13,
  },
  teacherLink: {
    color: colors.primary,
    fontWeight: "700",
  },

  unassignedTeacher: {
    color: "#94A3B8",
  },
});
