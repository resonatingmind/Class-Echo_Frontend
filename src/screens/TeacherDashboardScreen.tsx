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
import { AdminNavbar } from "../components/common/AdminNavbar";
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
import { reportHighlight } from "../lib/reportHighlight";
import { NextClassBrief } from "../components/teacher/NextClassBrief";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type RecentRecording = RecordingWithReport & { subject_name: string };

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

/* Read on every load, not once at import: the app can stay open past midnight. */
function todayName(): string {
  return [
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
  ][new Date().getDay()] ?? "Monday";
}

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatTime(time: string): string {
  const [h = 0, m = 0] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

// ── Main component ────────────────────────────────────────────────────────────

export function TeacherDashboardScreen() {
  const navigation  = useNavigation<Nav>();
  const { session } = useAuth();

  const [profile,    setProfile]    = useState<TeacherOut | null>(null);
  const [subjects,   setSubjects]   = useState<TeacherDashboardSubject[]>([]);
  const [timetable,  setTimetable]  = useState<TimetableEntryOut[]>([]);
  const [latestReport, setLatestReport] = useState<RecentRecording | null>(null);
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

      // Only subjects with a recording can hold the latest report.
      const withRecordings = dashboard.subjects.filter((s) => s.recording_count > 0);
      const results = await Promise.allSettled(
        withRecordings.map((s) => getTeacherSubjectRecordings(session.token!, s.subject_id))
      );

      const flat: RecentRecording[] = [];
      results.forEach((res, i) => {
        if (res.status === "fulfilled") {
          const subjectName = withRecordings[i]!.subject_name;
          res.value.forEach((r) => flat.push({ ...r, subject_name: subjectName }));
        }
      });

      flat.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
      setLatestReport(
        flat.find((r) => r.status === "completed" && !r.is_archived && r.report) ?? null,
      );
    } finally {
      silent ? setRefreshing(false) : setLoading(false);
    }
  }, [session?.token]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  // ── Derived data ──────────────────────────────────────────────────────────

  /** Today's periods sorted by time */
  const todayPeriods = useMemo(() => {
    const today = todayName();
    if (!(WEEKDAYS as string[]).includes(today)) return [];
    return timetable
      .filter((e) => e.day_of_week === today)
      .sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));
  }, [timetable]);

  /** The next class that has not started yet, shown even while another is on */
  const nextPeriod = useMemo(() => {
    const now = nowMinutes();
    return todayPeriods.find((p) => toMinutes(p.start_time) > now) ?? null;
  }, [todayPeriods]);

  const currentPeriod = useMemo(() => {
    const now = nowMinutes();
    return todayPeriods.find(
      (p) => toMinutes(p.start_time) <= now && now < toMinutes(p.end_time),
    ) ?? null;
  }, [todayPeriods]);

  const subjectFor = (period: TimetableEntryOut) => ({
    subjectId:   period.subject_id,
    subjectName: period.subject?.name ?? "Subject",
  });

  const openSubject = (period: TimetableEntryOut) =>
    navigation.navigate("TeacherSubjectWorkspace", {
      ...subjectFor(period),
      className: period.class_?.name ?? "",
      section:   period.class_?.section ?? "",
    });

  // Recording starts straight away; chapter and lecture are confirmed after Stop.
  const recordPeriod = (period: TimetableEntryOut) =>
    navigation.navigate("TeacherRecording", { ...subjectFor(period), fromTimetable: true });

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
      <AdminNavbar title="Teacher" onProfilePress={() => navigation.navigate("TeacherProfile" as never)} />
      <View style={styles.flex}>
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
          <View style={styles.centerContainer}>
            <View style={styles.body}>
              {/* Page heading */}
        <View style={styles.pageHeading}>
          <Text style={styles.pageTitle}>{greeting()} 👋</Text>
          <Text style={styles.pageSubtitle}>
            Welcome back, {firstName}
          </Text>
          {profile?.school_name ? (
            <Text style={styles.pageSubtitleSchool}>{profile.school_name}</Text>
          ) : null}
        </View>

        {/* ── What to do next: the class on now, else the next one today ── */}
        {currentPeriod ? (
          <View style={[styles.heroCard, styles.heroCardNow]}>
            <View style={styles.heroTag}>
              <View style={styles.heroLiveDot} />
              <Text style={styles.heroTagText}>
                NOW · until {formatTime(currentPeriod.end_time)}
              </Text>
            </View>
            <Text style={styles.heroSubject}>{currentPeriod.subject?.name ?? "Class"}</Text>
            <Text style={styles.heroMeta}>
              {currentPeriod.class_ ? `${currentPeriod.class_.name} · Section ${currentPeriod.class_.section}` : ""}
              {currentPeriod.room ? ` · Room ${currentPeriod.room}` : ""}
            </Text>
            <Pressable
              accessibilityLabel={`Record ${currentPeriod.subject?.name ?? "this class"}`}
              accessibilityRole="button"
              onPress={() => recordPeriod(currentPeriod)}
              style={({ pressed }) => [styles.recordNowBtn, pressed && { opacity: 0.85 }]}
            >
              <View style={styles.recordNowDot} />
              <Text style={styles.recordNowText}>Record</Text>
            </Pressable>
            <NextClassBrief token={session!.token} entryId={currentPeriod.id} collapsed />
          </View>
        ) : nextPeriod ? (
          <View style={styles.heroCard}>
            <View style={styles.heroTag}>
              <Text style={[styles.heroTagText, styles.heroTagTextNext]}>
                NEXT · {formatTime(nextPeriod.start_time)}
              </Text>
            </View>
            <Text style={styles.heroSubject}>{nextPeriod.subject?.name ?? "Class"}</Text>
            <Text style={styles.heroMeta}>
              {nextPeriod.class_ ? `${nextPeriod.class_.name} · Section ${nextPeriod.class_.section}` : ""}
              {nextPeriod.room ? ` · Room ${nextPeriod.room}` : ""}
            </Text>
            <NextClassBrief token={session!.token} entryId={nextPeriod.id} />
            <Pressable
              accessibilityRole="button"
              onPress={() => openSubject(nextPeriod)}
              style={({ pressed }) => [styles.prepareBtn, pressed && { opacity: 0.85 }]}
            >
              <Ionicons name="book-outline" size={16} color={AppTheme.colors.primaryDark} />
              <Text style={styles.prepareText}>Prepare</Text>
            </Pressable>
          </View>
        ) : null}

        {/* ── Latest report ── */}
        {latestReport ? (
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              navigation.navigate("RecordingDetail", {
                recording: latestReport,
                subjectName: latestReport.subject_name,
              })
            }
            style={({ pressed }) => [styles.reportCard, pressed && { opacity: 0.88 }]}
          >
            <View style={styles.reportTop}>
              <Text style={styles.reportLabel}>LATEST REPORT</Text>
              <Text style={styles.reportDate}>
                {new Date(latestReport.uploaded_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </Text>
            </View>
            <Text style={styles.reportTitle} numberOfLines={2}>
              {latestReport.lecture_title || latestReport.chapter_name || `Recording #${latestReport.id}`}
            </Text>
            <Text style={styles.reportSub} numberOfLines={1}>
              {latestReport.subject_name}
              {latestReport.chapter_name ? ` · ${latestReport.chapter_name}` : ""}
            </Text>
            {reportHighlight(latestReport.report) ? (
              <Text style={styles.reportHighlight} numberOfLines={2}>
                {reportHighlight(latestReport.report)}
              </Text>
            ) : null}
            <View style={styles.reportFooter}>
              <Text style={styles.reportView}>View report</Text>
              <Ionicons name="chevron-forward" size={16} color={AppTheme.colors.primary} />
            </View>
          </Pressable>
        ) : null}

        {/* ── Today's Schedule ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Schedule</Text>
            <Text style={styles.sectionSub}>{todayName()}</Text>
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
                const isNext = nextPeriod?.id === period.id;
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
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => openSubject(period)}
                      style={({ pressed }) => [
                        styles.periodCard,
                        isNow && styles.periodCardNow,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
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
                    </Pressable>
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
            <Pressable onPress={() => navigation.navigate("TeacherTabs", { screen: "TeacherClasses", params: { view: "subjects" } } as never)}>
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


            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppTheme.colors.background },
  flex: { flex: 1 },
  loadingCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: {
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: AppTheme.spacing.l,
    paddingVertical: AppTheme.spacing.xl,
  },
  body: {
    width: "100%",
    maxWidth: 800,
    gap: AppTheme.spacing.l,
  },

  // ── Page Header ──
  pageHeading: {
    gap: AppTheme.spacing.s,
    marginBottom: AppTheme.spacing.xs,
  },
  pageTitle: {
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.heading1,
  },
  pageSubtitle: {
    color: AppTheme.colors.textSecondary,
    ...AppTheme.typography.body,
  },
  pageSubtitleSchool: {
    fontSize: 12,
    fontWeight: "600",
    color: AppTheme.colors.textSecondary,
  },


  // ── Sections ──
  section: {
    gap: AppTheme.spacing.m,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.heading3,
    marginTop: AppTheme.spacing.s,
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

  // ── Now / Next card ──
  heroCard: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.large,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: AppTheme.spacing.l,
    gap: 4,
    ...AppTheme.shadows.subtle,
  },
  heroCardNow: { borderColor: AppTheme.colors.primary, backgroundColor: AppTheme.colors.primaryLight },
  heroTag: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  heroLiveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#DC2626" },
  heroTagText: { fontSize: 12, fontWeight: "800", letterSpacing: 0.6, color: AppTheme.colors.primaryDark },
  heroTagTextNext: { color: "#B45309" },
  heroSubject: { fontSize: 22, fontWeight: "800", color: AppTheme.colors.textPrimary },
  heroMeta: { fontSize: 13, color: AppTheme.colors.textSecondary },

  // ── Latest report ──
  reportCard: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.large,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: AppTheme.spacing.l,
    gap: 4,
  },
  reportTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  reportLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 1, color: AppTheme.colors.textSecondary },
  reportDate: { fontSize: 12, color: AppTheme.colors.textSecondary },
  reportTitle: { fontSize: 17, fontWeight: "800", color: AppTheme.colors.textPrimary, marginTop: 2 },
  reportSub: { fontSize: 12, color: AppTheme.colors.textSecondary },
  reportHighlight: { fontSize: 14, lineHeight: 20, color: AppTheme.colors.textPrimary, marginTop: 6 },
  reportFooter: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 6, minHeight: 28 },
  reportView: { fontSize: 14, fontWeight: "700", color: AppTheme.colors.primary },

  recordNowBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: AppTheme.spacing.s,
    marginTop: AppTheme.spacing.s,
    minHeight: 48,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: "#DC2626",
  },
  recordNowDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#FFFFFF" },
  recordNowText: { fontSize: 16, fontWeight: "800", color: "#FFFFFF" },
  prepareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: AppTheme.spacing.s,
    minHeight: 44,
    borderRadius: AppTheme.radius.medium,
    borderWidth: 1,
    borderColor: AppTheme.colors.primary,
    backgroundColor: AppTheme.colors.primaryLight,
  },
  prepareText: { fontSize: 14, fontWeight: "700", color: AppTheme.colors.primaryDark },

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
