import { View, Text, StyleSheet } from "react-native";

import { PlannerItemOut } from "../../types/api";
import { PlannerTableRow } from "./PlannerTableRow";

type Props = {
  data: PlannerItemOut[];
  onView: (item: PlannerItemOut) => void;
  onTeacherPress?: (item: PlannerItemOut) => void;
};

export function PlannerTable({ data, onView, onTeacherPress }: Props) {
  return (
    <View style={styles.container}>
      {/* Header */}

      <View style={styles.header}>
        <Text style={[styles.heading, { flex: 1.1 }]}>Class</Text>

        <Text style={[styles.heading, { flex: 1.1 }]}>Section</Text>

        <Text style={[styles.heading, { flex: 1.5 }]}>Subject</Text>

        <Text style={[styles.heading, { flex: 1.6 }]}>Teacher</Text>

        <Text style={[styles.heading, { flex: 0.9 }]}>Chapters</Text>

        <Text style={[styles.heading, { flex: 1.1 }]}>Recordings</Text>

        <Text style={[styles.heading, { flex: 0.8 }]}>Action</Text>
      </View>

      {data.map((item) => (
        <PlannerTableRow
          key={item.subject_id}
          item={item}
          onView={() => onView(item)}
          onTeacherPress={onTeacherPress}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,

    backgroundColor: "#fff",

    borderRadius: 16,

    borderWidth: 1,

    borderColor: "#E2E8F0",

    overflow: "hidden",
  },

  header: {
    height: 52,

    backgroundColor: "#F8FAFC",

    borderBottomWidth: 1,

    borderBottomColor: "#E2E8F0",

    flexDirection: "row",

    alignItems: "center",

    paddingHorizontal: 16,
  },

  heading: {
    fontSize: 13,

    fontWeight: "700",

    color: "#64748B",
  },
});
