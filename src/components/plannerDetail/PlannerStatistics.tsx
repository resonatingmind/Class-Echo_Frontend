import { View, Text, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { PlannerStatistics as PlannerStatisticsType } from "../../types/api";
import { colors } from "../../theme/colors";

type Props = {
  statistics: PlannerStatisticsType;
};

export function PlannerStatistics({ statistics }: Props) {
  return (
    <View style={styles.container}>
      <StatCard
        icon="book-outline"
        color="#2563EB"
        value={statistics.total_chapters.toString()}
        title="Chapters"
      />

      <StatCard
        icon="document-text-outline"
        color="#7C3AED"
        value={statistics.total_documents.toString()}
        title="Reference Material"
      />

      <StatCard
        icon="videocam-outline"
        color="#EA580C"
        value={statistics.total_recordings.toString()}
        title="Lecture Recordings"
      />

      <StatCard
        icon="sparkles-outline"
        color="#16A34A"
        value={
          statistics.average_score == null
            ? "--"
            : `${statistics.average_score}%`
        }
        title="Average AI Score"
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
      <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>

      <Text style={styles.value}>{value}</Text>

      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 28,
  },

  card: {
    width: "46%",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 16,

    borderWidth: 1,
    borderColor: "#E5E7EB",

    alignItems: "center",

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },

    elevation: 3,
  },

  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,

    justifyContent: "center",
    alignItems: "center",

    marginBottom: 10,
  },

  value: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.textPrimary,
  },

  title: {
    marginTop: 8,
    textAlign: "center",

    fontSize: 13,

    color: "#64748B",

    fontWeight: "600",
  },
});
