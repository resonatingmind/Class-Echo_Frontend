import { AppTheme } from '../../../theme/AppTheme';
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

type Props = {
  selectedDay: string;
  onSelectDay: (day: string) => void;
  /** Optional: set of days that have at least one entry (shows a dot indicator) */
  daysWithEntries?: Set<string>;
};

export function DaySelector({ selectedDay, onSelectDay, daysWithEntries }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {DAYS.map((day) => {
        const active = day === selectedDay;
        const hasEntries = daysWithEntries?.has(day) ?? false;

        return (
          <Pressable
            accessibilityRole="button"
            key={day}
            onPress={() => onSelectDay(day)}
            style={({ pressed }) => [
              styles.dayButton,
              active && styles.activeButton,
              pressed && styles.pressedButton,
            ]}
          >
            {/* Day abbreviation */}
            <Text style={[styles.dayText, active && styles.activeText]}>
              {day.slice(0, 3)}
            </Text>

            {/* Active underline OR entry dot */}
            <View style={styles.indicatorRow}>
              {active ? (
                <View style={styles.activeUnderline} />
              ) : hasEntries ? (
                <View style={styles.entryDot} />
              ) : (
                <View style={styles.emptyIndicator} />
              )}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 6,
    gap: 6,
    paddingHorizontal: 2,
  },

  dayButton: {
    minWidth: 62,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: AppTheme.radius.medium,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: AppTheme.colors.background,
    borderWidth: 1.5,
    borderColor: "transparent",
    gap: 4,
  },

  activeButton: {
    backgroundColor: AppTheme.colors.primaryLight,
    borderColor: AppTheme.colors.primary,
  },

  pressedButton: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },

  dayText: {
    fontSize: 13,
    fontWeight: "700",
    color: AppTheme.colors.textSecondary,
    letterSpacing: 0.3,
  },

  activeText: {
    color: AppTheme.colors.primaryText,
  },

  indicatorRow: {
    height: 5,
    justifyContent: "center",
    alignItems: "center",
  },

  activeUnderline: {
    width: 20,
    height: 3,
    borderRadius: 2,
    backgroundColor: AppTheme.colors.primary,
  },

  entryDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: AppTheme.colors.textSecondary,
    opacity: 0.5,
  },

  emptyIndicator: {
    width: 5,
    height: 5,
  },
});
