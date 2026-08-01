import { View, Text, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { PlannerStatistics as PlannerStatisticsType } from "../../types/api";
import { AppTheme } from "../../theme/AppTheme";

type Props = {
  statistics: PlannerStatisticsType;
};

export function PlannerStatistics({ statistics }: Props) {
  return (
    <View style={styles.container}>
      <StatCard
        icon="book-outline"
        color={AppTheme.colors.primaryDark}
        value={statistics.total_chapters.toString()}
        title="Chapters"
      />

      <StatCard
        icon="document-text-outline"
        color="#7C3AED"
        value={statistics.total_documents.toString()}
        title="Reference material"
      />

      <StatCard
        icon="videocam-outline"
        color="#EA580C"
        value={statistics.total_recordings.toString()}
        title="Recordings"
      />

      <StatCard
        icon="sparkles-outline"
        color={AppTheme.colors.success}
        value={
          statistics.average_score == null
            ? "--"
            : `${statistics.average_score}%`
        }
        title="Avg AI score"
      />
    </View>
  );
}

type CardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  value: string;
  title: string;
};

function StatCard({ icon, color, value, title }: CardProps) {
  return (
    <View style={styles.card}>
      <Ionicons name={icon} size={18} color={color} />

      <Text style={styles.value}>{value}</Text>

      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },

  card: {
    flexGrow: 1,
    flexBasis: "22%",
    minWidth: 130,
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.large,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    paddingVertical: 14,
    paddingHorizontal: 14,
    ...AppTheme.shadows.subtle,
  },

  value: {
    marginTop: 6,
    fontSize: 20,
    fontFamily: AppTheme.typography.family.bold,
    color: AppTheme.colors.textPrimary,
  },

  title: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: AppTheme.typography.family.medium,
    color: AppTheme.colors.textSecondary,
  },
});

