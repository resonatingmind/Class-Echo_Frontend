import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { TimetablePeriod } from "./timetableData";
import { colors } from "../../../theme/colors";

type Props = {
  period: TimetablePeriod;
  onEdit?: (period: TimetablePeriod) => void;
};

export function PeriodCard({ period, onEdit }: Props) {
  return (
    <View style={styles.card}>
      {/* Top Row */}
      <View style={styles.header}>
        <View>
          <Text style={styles.time}>
            {period.startTime} - {period.endTime}
          </Text>

          <Text style={styles.period}>Period {period.period}</Text>
        </View>

        <Pressable style={styles.editButton} onPress={() => onEdit?.(period)}>
          <Ionicons name="create-outline" size={18} color={colors.accent} />

          <Text style={styles.editText}>Edit</Text>
        </Pressable>
      </View>

      {/* Subject */}
      <Text style={styles.subject}>{period.subject}</Text>

      {/* Class */}
      <Text style={styles.info}>
        {period.className} • Section {period.section}
      </Text>

      {/* Room */}
      <View style={styles.roomRow}>
        <Ionicons name="location-outline" size={16} color="#6B7280" />

        <Text style={styles.room}>Room {period.room}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  time: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },

  period: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textSecondary,
  },

  subject: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
  },

  info: {
    marginTop: 6,
    fontSize: 15,
    color: colors.textSecondary,
  },

  roomRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },

  room: {
    marginLeft: 6,
    fontSize: 14,
    color: colors.textSecondary,
  },

  editButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },

  editText: {
    marginLeft: 6,
    color: colors.accent,
    fontWeight: "600",
  },
});
