import { AppTheme } from '../../../theme/AppTheme';
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { TimetableEntryOut } from "../../../types/api";

type Props = {
  period: TimetableEntryOut;
  /** True when this period is currently in progress */
  isNow?: boolean;
  /** True when this is the next upcoming period today */
  isNext?: boolean;
  /** Called when the teacher taps "Record" on this period */
  onRecord?: () => void;
};

const ACCENTS = [
  { bg: AppTheme.colors.primaryLight, border: "#CFE3FF", chip: AppTheme.colors.primaryDark },
  { bg: "#EAFBF1", border: "#CBEFDA", chip: AppTheme.colors.successText },
  { bg: "#FFF6E8", border: "#FBE3B8", chip: AppTheme.colors.warningStrong },
  { bg: AppTheme.colors.purpleBg, border: "#E2D3FA", chip: AppTheme.colors.purple },
  { bg: "#FFEEF2", border: "#F9C7D3", chip: AppTheme.colors.rose },
];

export function PeriodCard({ period, isNow, isNext, onRecord }: Props) {
  const accent = ACCENTS[(period.period_number - 1) % ACCENTS.length];
  const subjectLabel = period.subject?.name ?? "Subject";
  const className = period.class_
    ? `${period.class_.name} · Section ${period.class_.section}`
    : null;

  return (
    <View
      style={[
        styles.card,
        { borderColor: isNow ? AppTheme.colors.primary : accent.border },
        isNow && styles.cardNow,
      ]}
    >
      {/* "NOW" / "NEXT" ribbon */}
      {(isNow || isNext) && (
        <View style={[styles.ribbon, isNow ? styles.ribbonNow : styles.ribbonNext]}>
          <Text style={styles.ribbonText}>{isNow ? "NOW" : "NEXT"}</Text>
        </View>
      )}

      {/* Period badge */}
      <View style={[styles.periodBadge, { backgroundColor: isNow ? AppTheme.colors.primaryLight : accent.bg }]}>
        <Text style={[styles.periodBadgeText, { color: isNow ? AppTheme.colors.primary : accent.chip }]}>
          P{period.period_number}
        </Text>
      </View>

      {/* Body */}
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.subject} numberOfLines={1}>
            {subjectLabel}
          </Text>
          <Text style={[styles.time, isNow && styles.timeNow]}>
            {period.start_time} – {period.end_time}
          </Text>
        </View>

        {className ? <Text style={styles.info}>{className}</Text> : null}

        <View style={styles.footer}>
          {period.room ? (
            <View style={styles.roomRow}>
              <Ionicons
                name="location-outline"
                size={13}
                color={AppTheme.colors.textSecondary}
              />
              <Text style={styles.room}>Room {period.room}</Text>
            </View>
          ) : <View />}

          {/* Record CTA — shown on current/next period */}
          {(isNow || isNext) && (
            <Pressable
              accessibilityRole="button"
              style={[styles.recordBtn, isNow && styles.recordBtnNow]}
              onPress={onRecord}
              disabled={!onRecord}
            >
              <Ionicons
                name="mic"
                size={13}
                color={isNow ? AppTheme.colors.surface : AppTheme.colors.primary}
              />
              <Text style={[styles.recordText, isNow && styles.recordTextNow]}>
                Record
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.large,
    marginBottom: AppTheme.spacing.m,
    borderWidth: 1.5,
    overflow: "hidden",
    position: "relative",
  },

  cardNow: {
    backgroundColor: AppTheme.colors.primaryLight,
    ...AppTheme.shadows.subtle,
  },

  // "NOW" / "NEXT" top ribbon
  ribbon: {
    position: "absolute",
    top: 0,
    right: 0,
    paddingHorizontal: AppTheme.spacing.s,
    paddingVertical: 3,
    borderBottomLeftRadius: AppTheme.radius.small,
  },
  ribbonNow: {
    backgroundColor: AppTheme.colors.primary,
  },
  ribbonNext: {
    backgroundColor: AppTheme.colors.warning,
  },
  ribbonText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: AppTheme.colors.surface,
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
    paddingVertical: AppTheme.spacing.m,
    paddingHorizontal: AppTheme.spacing.l,
    paddingRight: AppTheme.spacing.l,
    gap: 3,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: AppTheme.spacing.s,
  },

  subject: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: AppTheme.colors.textPrimary,
  },

  time: {
    fontSize: 12,
    fontWeight: "600",
    color: AppTheme.colors.textSecondary,
  },

  timeNow: {
    color: AppTheme.colors.primaryText,
    fontWeight: "700",
  },

  info: {
    fontSize: 12,
    color: AppTheme.colors.textSecondary,
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: AppTheme.spacing.xs,
  },

  roomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },

  room: {
    fontSize: 12,
    color: AppTheme.colors.textSecondary,
  },

  // Record CTA
  recordBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: AppTheme.spacing.m,
    paddingVertical: 5,
    borderRadius: AppTheme.radius.pill,
    borderWidth: 1.5,
    borderColor: AppTheme.colors.primary,
    backgroundColor: "transparent",
  },
  recordBtnNow: {
    backgroundColor: AppTheme.colors.primary,
    borderColor: AppTheme.colors.primary,
  },
  recordText: {
    fontSize: 12,
    fontWeight: "700",
    color: AppTheme.colors.primaryText,
  },
  recordTextNow: {
    color: AppTheme.colors.surface,
  },
});
