import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { DaySelector } from "../components/teacher/timetable/DaySelector";
import { PeriodCard } from "../components/teacher/timetable/PeriodCard";
import { InfoState } from "../components/InfoState";

import { useAuth } from "../context/AuthContext";
import { getTeacherTimetable } from "../lib/api";
import { TIMETABLE_DAYS, TimetableEntryOut } from "../types/api";
import { AppTheme } from "../theme/AppTheme";
import { AdminNavbar } from "../components/common/AdminNavbar";

function StatChip({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <View style={statStyles.chip}>
      <Ionicons name={icon as any} size={14} color="rgba(255,255,255,0.85)" />
      <View>
        <Text style={statStyles.chipValue}>{value}</Text>
        <Text style={statStyles.chipLabel}>{label}</Text>
      </View>
    </View>
  );
}

const statStyles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  chipValue: { fontSize: 15, fontWeight: "800", color: "#FFFFFF", lineHeight: 20 },
  chipLabel: { fontSize: 10, color: "rgba(255,255,255,0.75)", fontWeight: "500", letterSpacing: 0.3 },
});

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
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

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
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <AdminNavbar title="Teacher" />

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
        <View style={styles.centerContainer}>
          <View style={styles.body}>

            {/* ── Hero Banner ─────────────────────────────────────── */}
            <LinearGradient
              colors={["#1D8EF5", "#156FD6", "#0D4FAA"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroBanner}
            >
              <View style={styles.heroCircle1} />
              <View style={styles.heroCircle2} />

              <View style={[styles.heroTopRow, isMobile && styles.heroTopRowMobile]}>
                <View style={isMobile ? { width: "100%", marginBottom: 12 } : { flex: 1 }}>
                  <View style={styles.heroLabelRow}>
                    <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.heroLabel}>TEACHER TIMETABLE</Text>
                  </View>
                  <Text style={styles.heroTitle}>My Timetable</Text>
                  <Text style={styles.heroSubtitle}>
                    {subtitleText}
                  </Text>
                </View>

                <View style={[styles.heroActions, isMobile && styles.heroActionsMobile]}>
                  <View style={styles.heroGlassBtn}>
                    <Ionicons name="eye-outline" size={13} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.heroGlassBtnText}>View Only</Text>
                  </View>
                </View>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.heroStats}>
                <StatChip icon="today-outline" label="Classes Today" value={todayCount} />
                <StatChip icon="calendar-outline" label="This Week" value={weeklyCount} />
                <StatChip icon="grid-outline" label="Active Days" value={daysWithEntries.size} />
              </ScrollView>
            </LinearGradient>

            {/* ── Day Selector ────────────────────────────────────── */}
            <View style={styles.daySelectorWrap}>
              <DaySelector
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
                daysWithEntries={daysWithEntries}
              />
            </View>
            <View style={styles.periodsContainer}>
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
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppTheme.colors.background,
  },

  // ── Hero Banner Styles ──
  heroBanner: {
    marginHorizontal: AppTheme.spacing.l,
    borderRadius: AppTheme.radius.large,
    padding: 18,
    overflow: "hidden",
    gap: 14,
  },
  heroCircle1: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255,255,255,0.07)",
    top: -40,
    right: -30,
  },
  heroCircle2: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,255,255,0.05)",
    bottom: -20,
    left: 60,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
    flexWrap: "wrap",
  },
  heroTopRowMobile: {
    flexDirection: "column",
  },
  heroLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 3,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.75)",
    letterSpacing: 1.2,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  heroActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  heroActionsMobile: {
    justifyContent: "flex-start",
    width: "100%",
  },
  heroGlassBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: AppTheme.radius.pill,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  heroGlassBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  heroStats: {
    gap: 8,
    paddingRight: 4,
  },

  // ── Other Styles ──
  daySelectorWrap: {
    paddingHorizontal: AppTheme.spacing.l,
    paddingTop: AppTheme.spacing.s,
    paddingBottom: AppTheme.spacing.s,
  },
  periodsContainer: {
    paddingHorizontal: AppTheme.spacing.l,
  },

  listContent: {
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
    paddingTop: AppTheme.spacing.s,
    paddingBottom: AppTheme.spacing.xxxl,
  },
  body: {
    width: '100%',
    maxWidth: 800,
    gap: AppTheme.spacing.m,
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
