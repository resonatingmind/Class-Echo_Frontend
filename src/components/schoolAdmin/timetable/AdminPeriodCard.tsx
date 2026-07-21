import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../../../theme/colors";
import { TimetableEntryOut } from "../../../types/api";

type Props = {
  entry: TimetableEntryOut;
  onEdit: (entry: TimetableEntryOut) => void;
  onDelete: (entry: TimetableEntryOut) => void;
};

export function AdminPeriodCard({ entry, onEdit, onDelete }: Props) {
  const subjectLabel = entry.subject?.name ?? "Subject";

  return (
    <View style={styles.card}>
      <View style={styles.periodBadge}>
        <Text style={styles.periodBadgeText}>P{entry.period_number}</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.subject} numberOfLines={1}>
            {subjectLabel}
          </Text>
          <Text style={styles.time}>
            {entry.start_time} - {entry.end_time}
          </Text>
        </View>

        <View style={styles.metaRow}>
          {entry.teacher ? (
            <View style={styles.metaItem}>
              <Ionicons name="person-outline" size={13} color={colors.textMuted} />
              <Text style={styles.metaText}>{entry.teacher.name}</Text>
            </View>
          ) : null}

          {entry.room ? (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={13} color={colors.textMuted} />
              <Text style={styles.metaText}>Room {entry.room}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.actionButton} onPress={() => onEdit(entry)} hitSlop={8}>
          <Ionicons name="create-outline" size={18} color={colors.accentDark} />
        </Pressable>
        <Pressable
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => onDelete(entry)}
          hitSlop={8}
        >
          <Ionicons name="trash-outline" size={18} color="#DC2626" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },

  periodBadge: {
    width: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentSoft,
  },

  periodBadgeText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.accentDark,
  },

  body: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 6,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  subject: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },

  time: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },

  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },

  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  metaMuted: {
    color: colors.textPlaceholder,
  },

  actions: {
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },

  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentSoft,
  },

  deleteButton: {
    backgroundColor: "#FEE2E2",
  },
});
