import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

import { colors } from "../../../theme/colors";

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
};

export function DaySelector({ selectedDay, onSelectDay }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {DAYS.map((day) => {
        const active = day === selectedDay;

        return (
          <Pressable
            key={day}
            onPress={() => onSelectDay(day)}
            style={[styles.dayButton, active && styles.activeButton]}
          >
            <Text style={[styles.dayText, active && styles.activeText]}>
              {day.slice(0, 3)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 14,
    gap: 10,
  },

  dayButton: {
    minWidth: 70,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  activeButton: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },

  dayText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },

  activeText: {
    color: "#FFFFFF",
  },
});
