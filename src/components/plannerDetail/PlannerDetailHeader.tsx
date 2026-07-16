import { View, Text, StyleSheet, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { colors } from "../../theme/colors";

type Props = {
  subjectName: string;
  className: string;
  teacherName: string | null;
  academicYear: string;

  onBack: () => void;
};

export function PlannerDetailHeader({
  subjectName,
  className,
  teacherName,
  academicYear,
  onBack,
}: Props) {
  return (
    <>
      <Pressable onPress={onBack} style={styles.backButton}>
        <Ionicons name="arrow-back" size={22} color={colors.primary} />

        <Text style={styles.backText}>Academic Planner</Text>
      </Pressable>

      <View style={styles.container}>
        <Text style={styles.subject}>{subjectName}</Text>

        <View style={styles.infoRow}>
          <InfoItem title="Class" value={className} />

          <InfoItem title="Teacher" value={teacherName ?? "--"} />

          <InfoItem title="Academic Year" value={academicYear} />
        </View>
      </View>
    </>
  );
}

function InfoItem({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoTitle}>{title}</Text>

      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },

  backText: {
    marginLeft: 8,
    color: colors.primary,
    fontSize: 16,
    fontWeight: "600",
  },

  container: {
    marginBottom: 24,
  },

  subject: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 20,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },

  infoCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  infoTitle: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 8,
  },

  infoValue: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
});
