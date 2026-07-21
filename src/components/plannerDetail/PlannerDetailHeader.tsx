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

function toTitleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

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
        <Ionicons name="arrow-back" size={20} color={colors.accentDark} />

        <Text style={styles.backText}>Academic Planner</Text>
      </Pressable>

      <View style={styles.container}>
        <Text style={styles.subject}>{toTitleCase(subjectName)}</Text>

        <View style={styles.infoRow}>
          <InfoPill value={className} />
          <InfoPill value={teacherName ?? "No teacher assigned"} />
          <InfoPill value={academicYear} />
        </View>
      </View>
    </>
  );
}

function InfoPill({ value }: { value: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  backText: {
    marginLeft: 6,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },

  container: {
    marginBottom: 16,
  },

  subject: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 10,
  },

  infoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  pill: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  pillText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
});
