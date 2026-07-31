import { View, Text, StyleSheet, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { AppTheme } from "../../theme/AppTheme";

type Props = {
  subjectName: string;
  className: string;
  teacherName: string | null;
  academicYear: string;
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
}: Props) {
  return (
    <View style={styles.container}>
        <Text style={styles.subject}>{toTitleCase(subjectName)}</Text>

        <View style={styles.infoRow}>
          <InfoPill value={className} />
          <InfoPill value={teacherName ?? "No teacher assigned"} />
          <InfoPill value={academicYear} />
        </View>
      </View>
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
  container: {
    marginBottom: 16,
  },

  subject: {
    fontSize: 24,
    fontFamily: AppTheme.typography.family.bold,
    color: AppTheme.colors.textPrimary,
    marginBottom: 10,
  },

  infoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  pill: {
    backgroundColor: AppTheme.colors.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  pillText: {
    fontSize: 12,
    fontFamily: AppTheme.typography.family.semibold,
    color: AppTheme.colors.textSecondary,
  },
});
