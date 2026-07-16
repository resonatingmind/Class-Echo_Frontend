import { View, Text, StyleSheet } from "react-native";

export function PlannerTableHeader() {
  return (
    <View style={styles.header}>
      <Text style={[styles.heading, { flex: 1.1 }]}>Class</Text>

      <Text style={[styles.heading, { flex: 1.1 }]}>Section</Text>

      <Text style={[styles.heading, { flex: 1.5 }]}>Subject</Text>

      <Text style={[styles.heading, { flex: 1.6 }]}>Teacher</Text>

      <Text style={[styles.heading, { flex: 0.9 }]}>Chapters</Text>

      <Text style={[styles.heading, { flex: 1.1 }]}>Recordings</Text>

      <Text style={[styles.heading, { flex: 0.8 }]}>Action</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
