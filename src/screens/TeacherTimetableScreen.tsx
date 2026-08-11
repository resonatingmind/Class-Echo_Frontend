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
const TODAY = jsDayToName;
const DEFAULT_DAY = (WEEKDAYS as readonly string[]).includes(jsDayToName)
  ? jsDayToName
  : "Monday";

/** Parse "HH:MM" into total minutes since midnight */
function toMinutes(time: string): number {
  const [h = 0, m = 0] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Returns the current time as minutes since midnight */
function nowMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

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
      void load();
    }, [load]),
  );

  /** Periods for the selected day, sorted by period number */
  const periods = useMemo(() => {
    return entries
      .filter((item) => item.day_of_week === selectedDay)
      .sort((a, b) => a.period_number - b.period_number);
  }, [entries, selectedDay]);

  /** Days that have at least one entry — used by DaySelector dots */
  const daysWithEntries = useMemo(
    () => new Set(entries.map((e) => e.day_of_week)),
    [entries],
  );

  /** Find the "next" upcoming period on today's schedule */
  const nextPeriodId = useMemo(() => {
    if (selectedDay !== TODAY) return null;
    const now = nowMinutes();
    // Find the first period whose start_time is still in the future
    const upcoming = periods.find((p) => toMinutes(p.start_time) > now);
    return upcoming?.id ?? null;
  }, [periods, selectedDay]);

  /** Find a period that is currently ongoing (start ≤ now < end) */
  const nowPeriodId = useMemo(() => {
    if (selectedDay !== TODAY) return null;
    const now = nowMinutes();
    const ongoing = periods.find(
      (p) => toMinutes(p.start_time) <= now && now < toMinutes(p.end_time),
    );
    return ongoing?.id ?? null;
  }, [periods, selectedDay]);

  const weeklyCount = entries.length;
  const todayCount  = useMemo(
    () => entries.filter((e) => e.day_of_week === TODAY).length,
    [entries],
  );

  const subtitleText = loading
    ? "Loading…"
    : weeklyCount > 0
      ? `${todayCount} class${todayCount === 1 ? "" : "es"} today · ${weeklyCount} this week`
      : "Set by your school admin";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader
        variant="large"
        title="My Timetable"
        subtitle={subtitleText}
        rightActions={
          <View style={styles.viewOnlyPill}>
            <Ionicons name="eye-outline" size={14} color={AppTheme.colors.primaryDark} />
            <Text style={styles.viewOnlyText}>View only</Text>
          </View>
        }
      />

      <View style={styles.daySelectorWrap}>
        <DaySelector
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          daysWithEntries={daysWithEntries}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={AppTheme.colors.primary}
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
            <PeriodCard
              key={period.id}
              period={period}
              isNow={period.id === nowPeriodId}
              isNext={period.id === nextPeriodId}
            />
          ))
        ) : (
          <View style={styles.empty}>
            <Ionicons
              name="calendar-clear-outline"
              size={40}
              color={AppTheme.colors.hint}
            />
            <Text style={styles.emptyTitle}>No classes scheduled</Text>
            <Text style={styles.emptyText}>
              {selectedDay === TODAY
                ? "Nothing on the timetable for today."
                : `Nothing on the timetable for ${selectedDay} yet.`}
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
    backgroundColor: AppTheme.colors.primaryLight,
    paddingHorizontal: AppTheme.spacing.m,
    paddingVertical: 6,
    borderRadius: AppTheme.radius.pill,
  },

  viewOnlyText: {
    fontSize: 12,
    fontWeight: "700",
    color: AppTheme.colors.primaryDark,
  },

  daySelectorWrap: {
    paddingHorizontal: AppTheme.spacing.xl,
    paddingBottom: AppTheme.spacing.s,
  },

  listContent: {
    paddingHorizontal: AppTheme.spacing.xl,
    paddingTop: AppTheme.spacing.s,
    paddingBottom: AppTheme.spacing.xxxl,
    flexGrow: 1,
  },

  loading: {
    paddingTop: 60,
    alignItems: "center",
  },

  empty: {
    marginTop: AppTheme.spacing.huge,
    alignItems: "center",
    gap: AppTheme.spacing.s,
    paddingHorizontal: AppTheme.spacing.xxl,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: AppTheme.colors.textPrimary,
    marginTop: AppTheme.spacing.s,
  },

  emptyText: {
    fontSize: 13,
    color: AppTheme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
