import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { DaySelector } from "../components/teacher/timetable/DaySelector";
import { PeriodCard } from "../components/teacher/timetable/PeriodCard";
import { InfoState } from "../components/InfoState";

import { useAuth } from "../context/AuthContext";
import { getTeacherTimetable } from "../lib/api";
import { TIMETABLE_DAYS, TimetableEntryOut } from "../types/api";
import { ScreenHeader } from "../components/common/ScreenHeader";
import { AppTheme } from "../theme/AppTheme";

const WEEKDAYS = TIMETABLE_DAYS;
const ALL_DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const jsDayToName = ALL_DAY_NAMES[new Date().getDay()];
const DEFAULT_DAY = (WEEKDAYS as readonly string[]).includes(jsDayToName)
  ? jsDayToName
  : "Monday";

export function TeacherTimetableScreen() {
  const { session } = useAuth();

  const [selectedDay, setSelectedDay] = useState<string>(DEFAULT_DAY);
  const [entries, setEntries] = useState<TimetableEntryOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!session?.token) return;
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        const data = await getTeacherTimetable(session.token);
        setEntries(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Couldn't load your timetable. Pull down to try again.",
        );
      } finally {
        isRefresh ? setRefreshing(false) : setLoading(false);
      }
    },
    [session?.token],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const periods = useMemo(() => {
    return entries
      .filter((item) => item.day_of_week === selectedDay)
      .sort((a, b) => a.period_number - b.period_number);
  }, [entries, selectedDay]);

  const weeklyCount = entries.length;

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScreenHeader
        variant="large"
        title="My Timetable"
        subtitle={
          weeklyCount > 0
            ? `${weeklyCount} period${weeklyCount === 1 ? "" : "s"} this week`
            : "Set by your school admin"
        }
        rightActions={
          <View style={styles.viewOnlyPill}>
            <Ionicons name="eye-outline" size={14} color={AppTheme.colors.primaryDark} />
            <Text style={styles.viewOnlyText}>View only</Text>
          </View>
        }
      />

      <View style={styles.daySelectorWrap}>
        <DaySelector selectedDay={selectedDay} onSelectDay={setSelectedDay} />
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={AppTheme.colors.primaryDark} />
          </View>
        ) : error ? (
          <InfoState title="Something went wrong" body={error} />
        ) : periods.length > 0 ? (
          periods.map((period) => (
            <PeriodCard key={period.id} period={period} />
          ))
        ) : (
          <View style={styles.empty}>
            <Ionicons
              name="calendar-clear-outline"
              size={30}
              color={AppTheme.colors.textSecondary}
            />
            <Text style={styles.emptyTitle}>No classes scheduled</Text>
            <Text style={styles.emptyText}>
              Nothing on the timetable for {selectedDay} yet.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppTheme.colors.background,
  },

  viewOnlyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: AppTheme.colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  viewOnlyText: {
    fontSize: 12,
    fontWeight: "700",
    color: AppTheme.colors.primaryDark,
  },

  daySelectorWrap: {
    paddingHorizontal: 20,
  },

  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    flexGrow: 1,
  },

  loading: {
    paddingTop: 60,
    alignItems: "center",
  },

  empty: {
    marginTop: 40,
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: AppTheme.colors.textPrimary,
  },

  emptyText: {
    fontSize: 13,
    color: AppTheme.colors.textSecondary,
    textAlign: "center",
  },
});
