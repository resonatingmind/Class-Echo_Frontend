import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { TimetableEntryOut } from "../../../types/api";
import { colors } from "../../../theme/colors";

type Props = {
  period: TimetableEntryOut;
};

const ACCENTS = [
  { bg: "#EAF3FF", border: "#CFE3FF", chip: AppTheme.colors.primaryDark },
  { bg: "#EAFBF1", border: "#CBEFDA", chip: "#127A40" },
  { bg: "#FFF6E8", border: "#FBE3B8", chip: "#92400E" },
  { bg: "#F6F0FF", border: "#E2D3FA", chip: "#6B21A8" },
  { bg: "#FFEEF2", border: "#F9C7D3", chip: "#9B1239" },
];

export function PeriodCard({ period }: Props) {
  const accent = ACCENTS[(period.period_number - 1) % ACCENTS.length];
  const subjectLabel = period.subject?.name ?? "Subject";
  const className = period.class_
    ? `${period.class_.name} • Section ${period.class_.section}`
    : null;

  return (
    <View style={[styles.card, { borderColor: accent.border }]}>
      <View style={[styles.periodBadge, { backgroundColor: accent.bg }]}>
        <Text style={[styles.periodBadgeText, { color: accent.chip }]}>
          P{period.period_number}
        </Text>
      </View>

      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.subject} numberOfLines={1}>
            {subjectLabel}
          </Text>

          <Text style={styles.time}>
            {period.start_time} - {period.end_time}
          </Text>
        </View>

        {className ? <Text style={styles.info}>{className}</Text> : null}

        {period.room ? (
          <View style={styles.roomRow}>
            <Ionicons
              name="location-outline"
              size={14}
              color={AppTheme.colors.textSecondary}
            />
            <Text style={styles.room}>Room {period.room}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    overflow: "hidden",
  },

  periodBadge: {
    width: 56,
    alignItems: "center",
    justifyContent: "center",
  },

  periodBadgeText: {
    fontSize: 13,
    fontWeight: "800",
  },

  body: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 4,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  subject: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: AppTheme.colors.textPrimary,
  },

  time: {
    fontSize: 13,
    fontWeight: "600",
    color: AppTheme.colors.textSecondary,
  },

  info: {
    fontSize: 13,
    color: AppTheme.colors.textSecondary,
  },

  roomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },

  room: {
    fontSize: 12,
    color: AppTheme.colors.textSecondary,
  },
});
