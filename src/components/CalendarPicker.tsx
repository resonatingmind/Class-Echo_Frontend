import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { FilterSelector } from "./FilterSelector";
import { Ionicons } from "@expo/vector-icons";

import { AppTheme } from "../theme/AppTheme";

type Props = {
  visible: boolean;
  value?: Date;
  onClose: () => void;
  onSelect: (date: Date) => void;
};

const WEEK_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function CalendarPicker({ visible, value, onClose, onSelect }: Props) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(() => value ?? today);

  const [monthModalVisible, setMonthModalVisible] = useState(false);

  const [yearModalVisible, setYearModalVisible] = useState(false);

  const currentYear = currentMonth.getFullYear();
  const currentMonthIndex = currentMonth.getMonth();

  const monthName = currentMonth.toLocaleDateString(undefined, {
  month: "long",
  year: "numeric",
});

  useEffect(() => {
    if (visible) {
      setCurrentMonth(value ?? new Date());
    }
  }, [visible, value]);
  
  const days = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonthIndex, 1);
    const lastDay = new Date(currentYear, currentMonthIndex + 1, 0);
    const start = firstDay.getDay();
    const total = lastDay.getDate();

    const arr: (Date | null)[] = [];
    for (let i = 0; i < start; i++) {
      arr.push(null);
    }
    for (let i = 1; i <= total; i++) {
      arr.push(new Date(currentYear, currentMonthIndex, i));
    }
    while (arr.length < 42) {
      arr.push(null);
    }
    return arr;
  }, [currentYear, currentMonthIndex]);
  const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const years = Array.from(
    { length: 15 },
    (_, i) => today.getFullYear() - 5 + i,
  );

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Pressable
              onPress={() =>
                setCurrentMonth(new Date(currentYear, currentMonthIndex - 1, 1))
              }
            >
              <Ionicons
                name="chevron-back"
                size={22}
                color={AppTheme.colors.textPrimary}
              />
            </Pressable>

            <View
              style={{
                flexDirection: "row",
                gap: 10,
              }}
            >
              <Pressable
                style={styles.dropdownButton}
                onPress={() => setMonthModalVisible(true)}
              >
                <Text style={styles.dropdownText}>
                  {months[currentMonthIndex]}
                </Text>

                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={AppTheme.colors.textPrimary}
                />
              </Pressable>

              <Pressable
                style={styles.dropdownButton}
                onPress={() => setYearModalVisible(true)}
              >
                <Text style={styles.dropdownText}>{currentYear}</Text>

                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={AppTheme.colors.textPrimary}
                />
              </Pressable>
            </View>

            <Pressable
              onPress={() =>
                setCurrentMonth(new Date(currentYear, currentMonthIndex + 1, 1))
              }
            >
              <Ionicons
                name="chevron-forward"
                size={22}
                color={AppTheme.colors.textPrimary}
              />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {WEEK_DAYS.map((d) => (
              <Text key={d} style={styles.weekDay}>
                {d}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {days.map((date, index) =>
              date ? (
                <Pressable
                  key={index}
                  style={[
                    styles.day,
                    value &&
                      date.toDateString() === value.toDateString() &&
                      styles.selectedDay,
                    date.toDateString() === today.toDateString() &&
                      styles.today,
                  ]}
                  onPress={() => {
                    onSelect(date);
                    onClose();
                  }}
                >
                  <Text
                    style={[
                      styles.dayText,
                      value &&
                        date.toDateString() === value.toDateString() &&
                        styles.selectedDayText,
                      date.toDateString() === today.toDateString() &&
                        styles.todayText,
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                </Pressable>
              ) : (
                <View key={index} style={styles.day} />
              ),
            )}
          </View>

          <Pressable style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>

      <FilterSelector
        title="Month"
        placeholder=""
        value={currentMonthIndex}
        visible={monthModalVisible}
        onClose={() => setMonthModalVisible(false)}
        onSelect={(value) => {
          setCurrentMonth(new Date(currentYear, Number(value), 1));
        }}
        options={months.map((month, index) => ({
          label: month,
          value: index,
        }))}
      />
      <FilterSelector
        title="Year"
        placeholder=""
        value={currentYear}
        visible={yearModalVisible}
        onClose={() => setYearModalVisible(false)}
        onSelect={(value) => {
          setCurrentMonth(new Date(Number(value), currentMonthIndex, 1));
        }}
        options={years.map((year) => ({
          label: String(year),
          value: year,
        }))}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: 340,
    backgroundColor: AppTheme.colors.background,
    borderRadius: 18,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: AppTheme.colors.textPrimary,
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  weekDay: {
    width: 40,
    textAlign: "center",
    fontWeight: "700",
    color: AppTheme.colors.textSecondary,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  day: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  dayText: {
    fontSize: 16,
    color: AppTheme.colors.textPrimary,
  },
  cancel: {
    marginTop: 16,
    alignSelf: "flex-end",
  },
  cancelText: {
    color: AppTheme.colors.primary,
    fontWeight: "700",
    fontSize: 16,
  },
  selectedDay: {
    backgroundColor: AppTheme.colors.primary,
    borderRadius: 20,
  },
  selectedDayText: {
    color: AppTheme.colors.white,
    fontWeight: "700",
  },
  today: {
    borderWidth: 2,
    borderColor: AppTheme.colors.primary,
    borderRadius: 20,
  },
  todayText: {
    fontWeight: "700",
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: AppTheme.radius.small,
    backgroundColor: AppTheme.colors.gray100,
  },

  dropdownText: {
    fontWeight: "600",
    color: AppTheme.colors.textPrimary,
  },
});
