import { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useAuth } from "../context/AuthContext";
import {
  getTeacherDashboard,
  getTeacherMe,
  getTeacherSubjectRecordings,
  getTeacherTimetable,
} from "../lib/api";
import {
  RecordingWithReport,
  TeacherDashboardSubject,
  TeacherOut,
  TimetableEntryOut,
} from "../types/api";
import { AppTheme } from "../theme/AppTheme";
import { RootStackParamList } from "../navigation/AppNavigator";

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function toMinutes(time: string): number {
  const [h = 0, m = 0] = time.split(":").map(Number);
  return h * 60 + m;
}

function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

const TODAY_NAME = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
][new Date().getDay()] ?? "Monday";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatTime(time: string): string {
  const [h = 0, m = 0] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  completed:  { bg: "#ECFDF3", text: "#047857" },
  processing: { bg: "#FFF7ED", text: "#B45309" },
  pending:    { bg: "#F0F9FF", text: "#0369A1" },
  failed:     { bg: "#FEF2F2", text: "#B91C1C" },
};

// ── Main component ────────────────────────────────────────────────────────────

export function TeacherDashboardScreen() {
  const navigation  = useNavigation<Nav>();
  const { session } = useAuth();

  const [profile,    setProfile]    = useState<TeacherOut | null>(null);
  const [subjects,   setSubjects]   = useState<TeacherDashboardSubject[]>([]);
  const [timetable,  setTimetable]  = useState<TimetableEntryOut[]>([]);
  const [recentRecs, setRecentRecs] = useState<(RecordingWithReport & { subject_name: string })[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!session?.token) return;
    silent ? setRefreshing(true) : setLoading(true);
    try {
      const [profileData, dashboard, timetableData] = await Promise.all([
        getTeacherMe(session.token),
        getTeacherDashboard(session.token),
        getTeacherTimetable(session.token),
      ]);

      setProfile(profileData);
      setSubjects(dashboard.subjects);
      setTimetable(timetableData);

      // Grab the 3 most recent recordings across first 3 subjects (avoid too many requests)
      const topSubjects = dashboard.subjects.slice(0, 4);
      const results = await Promise.allSettled(
        topSubjects.map((s) => getTeacherSubjectRecordings(session.token!, s.subject_id))
      );

      const flat: (RecordingWithReport & { subject_name: string })[] = [];
      results.forEach((res, i) => {
        if (res.status === "fulfilled") {
          const subjectName = topSubjects[i]!.subject_name;
          res.value.forEach((r) => flat.push({ ...r, subject_name: subjectName }));
        }
      });

      flat.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
      setRecentRecs(flat.slice(0, 4));
    } finally {
      silent ? setRefreshing(false) : setLoading(false);
    }
  }, [session?.token]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  // ── Derived data ──────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    subjects:   subjects.length,
    recordings: subjects.reduce((s, r) => s + r.recording_count, 0),
    pending:    subjects.filter((s) => s.ai_status === "Processing" || s.ai_status === "Pending").length,
    avgScore:   (() => {
      const scored = subjects.filter((s) => s.average_score != null);
      if (!scored.length) return null;
      return Math.round(scored.reduce((s, r) => s + (r.average_score ?? 0), 0) / scored.length);
    })(),
  }), [subjects]);

  /** Today's periods sorted by time */
  const todayPeriods = useMemo(() => {
    if (!(WEEKDAYS as string[]).includes(TODAY_NAME)) return [];
    return timetable
      .filter((e) => e.day_of_week === TODAY_NAME)
      .sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));
  }, [timetable]);

  /** Next or current class */
  const upcomingPeriod = useMemo(() => {
    const now = nowMinutes();
    return (
      todayPeriods.find((p) => toMinutes(p.end_time) > now) ?? null
    );
  }, [todayPeriods]);

  const isOngoing = upcomingPeriod != null &&
    toMinutes(upcomingPeriod.start_time) <= nowMinutes() &&
    nowMinutes() < toMinutes(upcomingPeriod.end_time);

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={AppTheme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const firstName = profile?.name?.split(" ")[0] ?? "Teacher";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={AppTheme.colors.primary}
          />
        }
      >
        {/* ── Hero greeting banner ── */}
        <LinearGradient
          colors={[AppTheme.colors.primary, AppTheme.colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.greetingLabel}>{greeting()} 👋</Text>
              <Text style={styles.greetingName}>{firstName}</Text>
              {profile?.school_name ? (
                <Text style={styles.schoolName}>{profile.school_name}</Text>
              ) : null}
            </View>
            <Pressable
              style={styles.avatarCircle}
              onPress={() => navigation.navigate("TeacherTabs", { screen: "TeacherProfile" } as never)}
            >
              <Text style={styles.avatarInitials}>
                {firstName.slice(0, 2).toUpperCase()}
              </Text>
            </Pressable>
          </View>

          {/* Stats strip */}
          <View style={styles.statsStrip}>
            <View style={styles.stripStat}>
              <Text style={styles.stripNum}>{stats.subjects}</Text>
              <Text style={styles.stripLabel}>Subjects</Text>
            </View>
            <View style={styles.stripDivider} />
            <View style={styles.stripStat}>
              <Text style={styles.stripNum}>{stats.recordings}</Text>
              <Text style={styles.stripLabel}>Recordings</Text>
            </View>
            <View style={styles.stripDivider} />
            <View style={styles.stripStat}>
              <Text style={styles.stripNum}>{stats.pending}</Text>
              <Text style={styles.stripLabel}>Processing</Text>
            </View>
            <View style={styles.stripDivider} />
            <View style={styles.stripStat}>
              <Text style={styles.stripNum}>
                {stats.avgScore != null ? `${stats.avgScore}%` : "—"}
              </Text>
              <Text style={styles.stripLabel}>Avg Score</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── Quick Actions ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            <Pressable
              style={styles.actionCard}
              onPress={() => navigation.navigate("TeacherTabs", { screen: "TeacherHome" } as never)}
            >
              <View style={[styles.actionIcon, { backgroundColor: AppTheme.colors.primaryLight }]}>
                <Ionicons name="book" size={22} color={AppTheme.colors.primary} />
              </View>
              <Text style={styles.actionLabel}>My Subjects</Text>
            </Pressable>

            <Pressable
              style={styles.actionCard}
              onPress={() => navigation.navigate("TeacherTabs", { screen: "TeacherTimetable" } as never)}
            >
              <View style={[styles.actionIcon, { backgroundColor: "#EAF8F1" }]}>
                <Ionicons name="calendar" size={22} color="#16A34A" />
              </View>
              <Text style={styles.actionLabel}>Timetable</Text>
            </Pressable>

            <Pressable
              style={styles.actionCard}
              onPress={() => navigation.navigate("TeacherTabs", { screen: "TeacherRecordings" } as never)}
            >
              <View style={[styles.actionIcon, { backgroundColor: "#FFF4E0" }]}>
                <Ionicons name="mic" size={22} color="#D97706" />
              </View>
              <Text style={styles.actionLabel}>Recordings</Text>
            </Pressable>

            <Pressable
              style={styles.actionCard}
              onPress={() => navigation.navigate("TeacherTabs", { screen: "TeacherProfile" } as never)}
            >
              <View style={[styles.actionIcon, { backgroundColor: "#F5F0FF" }]}>
                <Ionicons name="person" size={22} color="#7C3AED" />
              </View>
              <Text style={styles.actionLabel}>Profile</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Today's Schedule ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Schedule</Text>
            <Text style={styles.sectionSub}>{TODAY_NAME}</Text>
          </View>

          {todayPeriods.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-clear-outline" size={32} color={AppTheme.colors.hint} />
              <Text style={styles.emptyTitle}>No classes today</Text>
              <Text style={styles.emptyBody}>Enjoy your day off!</Text>
            </View>
          ) : (
            <View style={styles.periodsCol}>
              {todayPeriods.map((period) => {
                const now    = nowMinutes();
                const start  = toMinutes(period.start_time);
                const end    = toMinutes(period.end_time);
                const isNow  = start <= now && now < end;
                const isNext = !isNow && start > now &&
                  upcomingPeriod?.id === period.id;
                const isDone = end <= now;

                return (
                  <View
                    key={period.id}
                    style={[
                      styles.periodRow,
                      isNow  && styles.periodRowNow,
                      isDone && styles.periodRowDone,
                    ]}
                  >
                    {/* Time column */}
                    <View style={styles.periodTime}>
                      <Text style={[styles.periodTimeText, isNow && styles.periodTimeTextNow]}>
                        {formatTime(period.start_time)}
                      </Text>
                      <Text style={styles.periodTimeSub}>
                        {formatTime(period.end_time)}
                      </Text>
                    </View>

                    {/* Divider dot */}
                    <View style={styles.periodDot}>
                      <View style={[
                        styles.dot,
                        isNow  && styles.dotNow,
                        isDone && styles.dotDone,
                      ]} />
                      <View style={styles.dotLine} />
                    </View>

                    {/* Content */}
                    <View style={[styles.periodCard, isNow && styles.periodCardNow]}>
                      <View style={styles.periodCardTop}>
                        <Text
                          style={[styles.periodSubject, isNow && styles.periodSubjectNow]}
                          numberOfLines={1}
                        >
                          {period.subject?.name ?? "Subject"}
                        </Text>
                        {(isNow || isNext) && (
                          <View style={[styles.ribbon, isNow ? styles.ribbonNow : styles.ribbonNext]}>
                            <Text style={styles.ribbonText}>{isNow ? "NOW" : "NEXT"}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.periodClass}>
                        {period.class_
                          ? `${period.class_.name} · Section ${period.class_.section}`
                          : ""}
                      </Text>
                      {period.room ? (
                        <Text style={styles.periodRoom}>Room {period.room}</Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ── My Subjects overview ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Subjects</Text>
            <Pressable onPress={() => navigation.navigate("TeacherTabs", { screen: "TeacherHome" } as never)}>
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          </View>

          {subjects.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="book-outline" size={32} color={AppTheme.colors.hint} />
              <Text style={styles.emptyTitle}>No subjects assigned</Text>
              <Text style={styles.emptyBody}>Contact your school admin to get assigned.</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.subjectScroll}
            >
              {subjects.map((sub) => (
                <Pressable
                  key={sub.subject_id}
                  style={styles.subjectCard}
                  onPress={() =>
                    navigation.navigate("TeacherSubjectWorkspace", {
                      subjectId:   sub.subject_id,
                      subjectName: sub.subject_name,
                      className:   sub.class_name,
                      section:     sub.section,
                    })
                  }
                >
                  <View style={styles.subjectIconWrap}>
                    <Ionicons name="book" size={20} color={AppTheme.colors.primary} />
                  </View>
                  <Text style={styles.subjectName} numberOfLines={2}>{sub.subject_name}</Text>
                  <Text style={styles.subjectClass}>
                    {sub.class_name} · {sub.section}
                  </Text>
                  <View style={styles.subjectStats}>
                    <View style={styles.subjectStat}>
                      <Ionicons name="mic-outline" size={11} color={AppTheme.colors.textSecondary} />
                      <Text style={styles.subjectStatText}>{sub.recording_count}</Text>
                    </View>
                    <View style={styles.subjectStat}>
                      <Ionicons name="people-outline" size={11} color={AppTheme.colors.textSecondary} />
                      <Text style={styles.subjectStatText}>{sub.student_count}</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        {/* ── Recent Recordings ── */}
        {recentRecs.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Recordings</Text>
              <Pressable onPress={() => navigation.navigate("TeacherTabs", { screen: "TeacherRecordings" } as never)}>
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            </View>
            <View style={styles.recList}>
              {recentRecs.map((rec) => {
                const sc = STATUS_COLORS[rec.status] ?? STATUS_COLORS.pending!;
                const score = rec.report?.overall_score;
                return (
                  <Pressable
                    key={rec.id}
                    style={({ pressed }) => [styles.recCard, pressed && { opacity: 0.85 }]}
                    onPress={() => navigation.navigate("RecordingDetail", { recording: rec, subjectName: rec.subject_name })}
                  >
                    <View style={styles.recIconWrap}>
                      <Ionicons name="mic" size={16} color={AppTheme.colors.primary} />
                    </View>
                    <View style={styles.recBody}>
                      <Text style={styles.recTitle} numberOfLines={1}>
                        {rec.lecture_title || rec.chapter_name || `Recording #${rec.id}`}
                      </Text>
                      <Text style={styles.recSub} numberOfLines={1}>{rec.subject_name}</Text>
                    </View>
                    <View style={[styles.statusDot, { backgroundColor: sc.bg }]}>
                      <Text style={[styles.statusDotText, { color: sc.text }]}>
                        {score != null ? `${score}%` : rec.status}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppTheme.colors.background },
  loadingCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: {
    paddingBottom: AppTheme.spacing.giant,
    gap: AppTheme.spacing.xs,
  },

  // ── Hero ──
  hero: {
    paddingHorizontal: AppTheme.spacing.xl,
    paddingTop: AppTheme.spacing.xl,
    paddingBottom: AppTheme.spacing.xxl,
    gap: AppTheme.spacing.xl,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  greetingLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
  },
  greetingName: {
    fontSize: 28,
    fontWeight: "800",
    color: AppTheme.colors.surface,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  schoolName: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.65)",
    marginTop: 4,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: "800",
    color: AppTheme.colors.surface,
  },

  // Stats strip
  statsStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: AppTheme.radius.large,
    paddingVertical: AppTheme.spacing.m,
    paddingHorizontal: AppTheme.spacing.l,
  },
  stripStat:    { flex: 1, alignItems: "center" },
  stripNum:     { fontSize: 20, fontWeight: "800", color: AppTheme.colors.surface },
  stripLabel:   { fontSize: 10, fontWeight: "600", color: "rgba(255,255,255,0.7)", marginTop: 2 },
  stripDivider: { width: 1, height: 30, backgroundColor: "rgba(255,255,255,0.25)" },

  // ── Sections ──
  section: {
    paddingHorizontal: AppTheme.spacing.xl,
    paddingTop: AppTheme.spacing.xl,
    gap: AppTheme.spacing.m,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: AppTheme.colors.textPrimary,
    letterSpacing: -0.2,
  },
  sectionSub: {
    fontSize: 12,
    fontWeight: "600",
    color: AppTheme.colors.textSecondary,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: "700",
    color: AppTheme.colors.primary,
  },

  // Quick actions
  actionsRow: {
    flexDirection: "row",
    gap: AppTheme.spacing.m,
  },
  actionCard: {
    flex: 1,
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.large,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    alignItems: "center",
    paddingVertical: AppTheme.spacing.l,
    gap: AppTheme.spacing.s,
    ...AppTheme.shadows.subtle,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: AppTheme.radius.medium,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: AppTheme.colors.textPrimary,
    textAlign: "center",
  },

  // ── Schedule ──
  periodsCol:  { gap: AppTheme.spacing.s },
  periodRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: AppTheme.spacing.s,
  },
  periodRowNow:  { },
  periodRowDone: { opacity: 0.5 },

  periodTime: {
    width: 64,
    alignItems: "flex-end",
    paddingTop: AppTheme.spacing.m,
  },
  periodTimeText: {
    fontSize: 12,
    fontWeight: "700",
    color: AppTheme.colors.textSecondary,
  },
  periodTimeTextNow: { color: AppTheme.colors.primary },
  periodTimeSub: {
    fontSize: 10,
    color: AppTheme.colors.hint,
    marginTop: 2,
  },

  periodDot: { alignItems: "center", paddingTop: AppTheme.spacing.l, width: 16 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: AppTheme.colors.border,
  },
  dotNow:  { backgroundColor: AppTheme.colors.primary },
  dotDone: { backgroundColor: AppTheme.colors.hint },
  dotLine: {
    width: 2,
    flex: 1,
    backgroundColor: AppTheme.colors.divider,
    marginTop: 3,
    minHeight: 16,
  },

  periodCard: {
    flex: 1,
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.medium,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: AppTheme.spacing.m,
    gap: 3,
    marginBottom: AppTheme.spacing.xs,
  },
  periodCardNow: {
    borderColor: AppTheme.colors.primary,
    backgroundColor: AppTheme.colors.primaryLight,
  },
  periodCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  periodSubject: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: AppTheme.colors.textPrimary,
  },
  periodSubjectNow: { color: AppTheme.colors.primaryDark },
  periodClass: { fontSize: 12, color: AppTheme.colors.textSecondary },
  periodRoom:  { fontSize: 11, color: AppTheme.colors.hint, marginTop: 1 },

  ribbon: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: AppTheme.radius.pill,
  },
  ribbonNow:  { backgroundColor: AppTheme.colors.primary },
  ribbonNext: { backgroundColor: AppTheme.colors.warning },
  ribbonText: { fontSize: 9, fontWeight: "800", color: AppTheme.colors.surface, letterSpacing: 0.5 },

  // ── Subjects horizontal scroll ──
  subjectScroll: { paddingBottom: AppTheme.spacing.xs, gap: AppTheme.spacing.m },
  subjectCard: {
    width: 150,
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.large,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: AppTheme.spacing.l,
    gap: AppTheme.spacing.s,
    ...AppTheme.shadows.subtle,
  },
  subjectIconWrap: {
    width: 36,
    height: 36,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  subjectName: {
    fontSize: 14,
    fontWeight: "700",
    color: AppTheme.colors.textPrimary,
    lineHeight: 19,
  },
  subjectClass: {
    fontSize: 11,
    color: AppTheme.colors.textSecondary,
    fontWeight: "500",
  },
  subjectStats: {
    flexDirection: "row",
    gap: AppTheme.spacing.m,
    marginTop: AppTheme.spacing.xs,
  },
  subjectStat: { flexDirection: "row", alignItems: "center", gap: 3 },
  subjectStatText: { fontSize: 11, color: AppTheme.colors.textSecondary, fontWeight: "600" },

  // ── Recent recordings ──
  recList: { gap: AppTheme.spacing.s },
  recCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.medium,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: AppTheme.spacing.m,
    gap: AppTheme.spacing.m,
  },
  recIconWrap: {
    width: 36,
    height: 36,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  recBody:  { flex: 1 },
  recTitle: { fontSize: 14, fontWeight: "700", color: AppTheme.colors.textPrimary },
  recSub:   { fontSize: 12, color: AppTheme.colors.textSecondary, marginTop: 2 },

  statusDot: {
    paddingHorizontal: AppTheme.spacing.s,
    paddingVertical: 4,
    borderRadius: AppTheme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  statusDotText: { fontSize: 11, fontWeight: "700" },

  // ── Empty states ──
  emptyCard: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.large,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    borderStyle: "dashed",
    padding: AppTheme.spacing.xxxl,
    alignItems: "center",
    gap: AppTheme.spacing.s,
  },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: AppTheme.colors.textPrimary },
  emptyBody:  { fontSize: 13, color: AppTheme.colors.textSecondary, textAlign: "center" },
});
