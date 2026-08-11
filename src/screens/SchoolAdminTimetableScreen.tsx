import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  Pressable,
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

import { AdminNavbar } from "../components/common/AdminNavbar";
import { RootStackParamList } from "../navigation/AppNavigator";
import { AppTheme } from "../theme/AppTheme";
import { useAuth } from "../context/AuthContext";

import { DaySelector } from "../components/teacher/timetable/DaySelector";
import { TimetableEntryModal, PeriodSlot } from "../components/schoolAdmin/timetable/TimetableEntryModal";
import { ImportTimetableModal } from "../components/schoolAdmin/timetable/ImportTimetableModal";
import { PeriodSetupModal, loadPeriodSlots } from "../components/schoolAdmin/timetable/PeriodSetupModal";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { InfoState } from "../components/InfoState";

import {
  getSchoolAdminClasses,
  getSchoolAdminTeachers,
  getClassSubjects,
  getSchoolAdminTimetable,
  createTimetableEntry,
  updateTimetableEntry,
  deleteTimetableEntry,
} from "../lib/api";
import {
  ClassOut,
  SubjectOut,
  TeacherOut,
  TIMETABLE_DAYS,
  TimetableEntryOut,
  TimetableEntryPayload,
} from "../types/api";

type Props = NativeStackScreenProps<RootStackParamList, "SchoolAdminTimetable">;

const WEEKDAYS = TIMETABLE_DAYS.slice(0, 6);

const CLASS_GRADE_COL_WIDTH = 52;
const CLASS_SECTION_COL_WIDTH = 42;
const PERIOD_COL_WIDTH = 140;
const ROW_HEIGHT = 90;
const HEADER_HEIGHT = 64;

const BORDER_COLOR = "#E4EAF0";
const HEADER_BG = "#F0F5FF";
const CELL_BG = "#FFFFFF";
const GRADE_BG = "#F7F9FF";

// ─── Subject colour palette ───────────────────────────────────────────────────
const SUBJECT_COLORS = [
  { bg: "#EFF6FF", accent: "#3B82F6", text: "#1D4ED8" },
  { bg: "#F0FDF4", accent: "#22C55E", text: "#15803D" },
  { bg: "#FFF7ED", accent: "#F97316", text: "#C2410C" },
  { bg: "#FDF4FF", accent: "#A855F7", text: "#7E22CE" },
  { bg: "#FFF1F2", accent: "#F43F5E", text: "#BE123C" },
  { bg: "#ECFEFF", accent: "#06B6D4", text: "#0E7490" },
  { bg: "#FEFCE8", accent: "#EAB308", text: "#854D0E" },
  { bg: "#F0FDFA", accent: "#14B8A6", text: "#0F766E" },
];

function subjectColorIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % SUBJECT_COLORS.length;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTeacherName(entry: TimetableEntryOut, teachers: TeacherOut[]): string {
  const e = entry as any;
  const fromEntry =
    e.teacher?.user?.full_name ||
    e.teacher?.full_name ||
    e.teacher_name ||
    e.teacher?.name ||
    null;
  if (fromEntry) return fromEntry;

  const teacherId = e.teacher_id ?? e.teacher?.id;
  if (teacherId) {
    const found = teachers.find((t) => t.id === teacherId);
    if (found) {
      const f = found as any;
      return f.user?.full_name || f.full_name || f.name || "—";
    }
  }
  return "—";
}

function getSubjectName(entry: TimetableEntryOut): string {
  const e = entry as any;
  return e.subject?.name || e.subject_name || e.subject?.title || "—";
}

function gradeOf(cls: ClassOut): string {
  if ((cls as any).grade) return String((cls as any).grade);
  return cls.name.replace(/\s+[A-Za-z]$/, "").trim();
}

function sectionOf(cls: ClassOut): string {
  if ((cls as any).section) return String((cls as any).section);
  const last = cls.name.trim().slice(-1);
  return /^[A-Za-z]$/.test(last) ? last.toUpperCase() : cls.name;
}

// ─── Stat Chip ───────────────────────────────────────────────────────────────
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

// ─── Screen ──────────────────────────────────────────────────────────────────

export function SchoolAdminTimetableScreen({ navigation }: Props) {
  const { session } = useAuth();
  const token = session?.token as string;
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [classes, setClasses] = useState<ClassOut[]>([]);
  const [teachers, setTeachers] = useState<TeacherOut[]>([]);
  const [entries, setEntries] = useState<TimetableEntryOut[]>([]);

  // subjects cache: classId → SubjectOut[]
  const [subjectsCache, setSubjectsCache] = useState<Record<number, SubjectOut[]>>({});
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  const [selectedDay, setSelectedDay] = useState<string>(WEEKDAYS[0]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Entry modal state
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntryOut | null>(null);
  const [savingEntry, setSavingEntry] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);

  const [showImportModal, setShowImportModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TimetableEntryOut | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Period slots
  const [periodSlots, setPeriodSlots] = useState<PeriodSlot[]>([]);
  const [showPeriodSetup, setShowPeriodSetup] = useState(false);

  // ─── Fetch subjects (cached) ──────────────────────────────────────────────
  const fetchSubjectsForClass = useCallback(
    async (classId: number): Promise<SubjectOut[]> => {
      if (subjectsCache[classId]) return subjectsCache[classId];
      try {
        setLoadingSubjects(true);
        const list = await getClassSubjects(token, classId);
        setSubjectsCache((prev) => ({ ...prev, [classId]: list }));
        return list;
      } catch {
        return [];
      } finally {
        setLoadingSubjects(false);
      }
    },
    [token, subjectsCache],
  );

  // ─── Load ─────────────────────────────────────────────────────────────────
  const loadBase = useCallback(async () => {
    try {
      const [classList, teacherList] = await Promise.all([
        getSchoolAdminClasses(token),
        getSchoolAdminTeachers(token),
      ]);
      setClasses(classList);
      setTeachers(teacherList);
    } catch {
      /* ignore; timetable error shown separately */
    }
  }, [token]);

  const loadTimetable = useCallback(
    async (isRefresh = false) => {
      if (!token) return;
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        const entryList = await getSchoolAdminTimetable(token, {});
        setEntries(entryList);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't load the timetable.");
      } finally {
        isRefresh ? setRefreshing(false) : setLoading(false);
      }
    },
    [token],
  );

  useFocusEffect(
    useCallback(() => {
      loadBase();
      loadTimetable();
      loadPeriodSlots().then(setPeriodSlots);
    }, [loadBase, loadTimetable]),
  );

  // ─── Derived ──────────────────────────────────────────────────────────────
  const periodNumbers = useMemo(() => {
    const configuredNums = periodSlots.map((s) => s.number);
    const entryNums = entries.filter((e) => e.day_of_week === selectedDay).map((e) => e.period_number);
    return [...new Set([...configuredNums, ...entryNums])].sort((a, b) => a - b);
  }, [entries, selectedDay, periodSlots]);

  const classGroups = useMemo((): [string, ClassOut[]][] => {
    const map = new Map<string, ClassOut[]>();
    for (const cls of classes) {
      const grade = gradeOf(cls);
      if (!map.has(grade)) map.set(grade, []);
      map.get(grade)!.push(cls);
    }
    return [...map.entries()];
  }, [classes]);

  const entryMap = useMemo(() => {
    const map: Record<number, Record<number, TimetableEntryOut>> = {};
    for (const e of entries) {
      if (e.day_of_week !== selectedDay) continue;
      if (!map[e.class_id]) map[e.class_id] = {};
      map[e.class_id][e.period_number] = e;
    }
    return map;
  }, [entries, selectedDay]);

  const daysWithEntries = useMemo(() => {
    const s = new Set<string>();
    for (const e of entries) s.add(e.day_of_week);
    return s;
  }, [entries]);

  const totalPeriodsToday = useMemo(
    () => entries.filter((e) => e.day_of_week === selectedDay).length,
    [entries, selectedDay],
  );

  const periodLabel = (n: number) => {
    const configured = periodSlots.find((s) => s.number === n);
    if (configured) {
      const fmt = (t: string) => {
        const [h, m] = t.split(":").map(Number);
        const ampm = h >= 12 ? "PM" : "AM";
        const hour = h % 12 || 12;
        return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
      };
      return `${fmt(configured.startTime)} – ${fmt(configured.endTime)}`;
    }
    const startH = 7 + n;
    const endH = startH + 1;
    const fmt = (h: number) => (h >= 12 ? `${h === 12 ? 12 : h - 12}:00 PM` : `${h}:00 AM`);
    return `${fmt(startH)} – ${fmt(endH)}`;
  };

  // ─── Open cell (edit/add for a specific class+period) ─────────────────────
  const handleCellPress = useCallback(
    async (classId: number, periodNumber: number) => {
      const existing = entryMap[classId]?.[periodNumber];
      setEditingEntry(existing ?? null);
      setEntryError(null);

      // Pre-warm the subjects cache for this class
      await fetchSubjectsForClass(classId);

      setShowEntryModal(true);
    },
    [entryMap, fetchSubjectsForClass],
  );

  // ─── Open add (from top button — no preset class/period) ──────────────────
  const handleOpenAdd = useCallback(() => {
    setEditingEntry(null);
    setEntryError(null);
    setShowEntryModal(true);
  }, []);

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmitEntry = async (payload: TimetableEntryPayload) => {
    setSavingEntry(true);
    setEntryError(null);
    try {
      if (editingEntry) {
        await updateTimetableEntry(token, editingEntry.id, payload);
      } else {
        await createTimetableEntry(token, payload);
      }
      setShowEntryModal(false);
      await loadTimetable(true);
    } catch (err) {
      setEntryError(err instanceof Error ? err.message : "Couldn't save the period.");
    } finally {
      setSavingEntry(false);
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTimetableEntry(token, deleteTarget.id);
      setDeleteTarget(null);
      await loadTimetable(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete the period.");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  // ─── Render a single data cell ────────────────────────────────────────────
  const renderCell = (classId: number, periodNumber: number) => {
    const entry = entryMap[classId]?.[periodNumber];
    const subjectName = entry ? getSubjectName(entry) : "";
    const colorIdx = entry ? subjectColorIndex(subjectName) : 0;
    const palette = SUBJECT_COLORS[colorIdx];
    const teacherName = entry ? getTeacherName(entry, teachers) : "";

    return (
      <Pressable
        style={({ pressed }) => [
          styles.cell,
          { width: PERIOD_COL_WIDTH, height: ROW_HEIGHT },
          entry && { backgroundColor: palette.bg },
          pressed && styles.cellPressed,
        ]}
        onPress={() => handleCellPress(classId, periodNumber)}
        onLongPress={() => entry && setDeleteTarget(entry)}
        delayLongPress={400}
      >
        {entry ? (
          <View style={styles.cellContent}>
            <View style={[styles.cellAccentBar, { backgroundColor: palette.accent }]} />
            <View style={styles.cellInner}>
              <Text style={[styles.cellSubject, { color: palette.text }]} numberOfLines={2}>
                {subjectName}
              </Text>
              <View style={styles.cellTeacherRow}>
                <Ionicons name="person-outline" size={9} color={AppTheme.colors.textSecondary} />
                <Text style={styles.cellTeacher} numberOfLines={1}>{teacherName}</Text>
              </View>
              <View style={styles.cellActions}>
                <Pressable
                  style={[styles.cellActionBtn, { borderColor: palette.accent + "44" }]}
                  hitSlop={6}
                  onPress={() => handleCellPress(classId, periodNumber)}
                >
                  <Ionicons name="pencil-outline" size={10} color={palette.text} />
                </Pressable>
                <Pressable
                  style={[styles.cellActionBtn, { borderColor: "#EF444444" }]}
                  hitSlop={6}
                  onPress={() => setDeleteTarget(entry)}
                >
                  <Ionicons name="trash-outline" size={10} color="#EF4444" />
                </Pressable>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.emptyCellInner}>
            <View style={styles.emptyAddIcon}>
              <Ionicons name="add" size={16} color={AppTheme.colors.primary} />
            </View>
          </View>
        )}
      </Pressable>
    );
  };

  const renderMobileCell = (classId: number, periodNumber: number) => {
    const entry = entryMap[classId]?.[periodNumber];
    const subjectName = entry ? getSubjectName(entry) : "";
    const colorIdx = entry ? subjectColorIndex(subjectName) : 0;
    const palette = SUBJECT_COLORS[colorIdx];
    const teacherName = entry ? getTeacherName(entry, teachers) : "";

    return (
      <View key={periodNumber} style={styles.mobilePeriodWrapper}>
        <View style={styles.mobilePeriodHeader}>
          <Text style={styles.mobilePeriodLabel}>Period {periodNumber}</Text>
          <Text style={styles.mobilePeriodTime}>{periodLabel(periodNumber)}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.mobileCell,
            entry && { backgroundColor: palette.bg, borderColor: palette.accent + "44" },
            pressed && styles.cellPressed,
          ]}
          onPress={() => handleCellPress(classId, periodNumber)}
          onLongPress={() => entry && setDeleteTarget(entry)}
          delayLongPress={400}
        >
          {entry ? (
            <View style={styles.cellContent}>
              <View style={[styles.cellAccentBar, { backgroundColor: palette.accent }]} />
              <View style={styles.cellInner}>
                <Text style={[styles.cellSubject, { color: palette.text, fontSize: 13 }]} numberOfLines={2}>
                  {subjectName}
                </Text>
                <View style={styles.cellTeacherRow}>
                  <Ionicons name="person-outline" size={11} color={AppTheme.colors.textSecondary} />
                  <Text style={[styles.cellTeacher, { fontSize: 11 }]} numberOfLines={1}>
                    {teacherName}
                  </Text>
                </View>
                <View style={styles.cellActions}>
                  <Pressable
                    style={[styles.cellActionBtn, { borderColor: palette.accent + "44" }]}
                    hitSlop={10}
                    onPress={() => handleCellPress(classId, periodNumber)}
                  >
                    <Ionicons name="pencil-outline" size={12} color={palette.text} />
                  </Pressable>
                  <Pressable
                    style={[styles.cellActionBtn, { borderColor: "#EF444444" }]}
                    hitSlop={10}
                    onPress={() => setDeleteTarget(entry)}
                  >
                    <Ionicons name="trash-outline" size={12} color="#EF4444" />
                  </Pressable>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.mobileEmptyCell}>
              <View style={styles.emptyAddIcon}>
                <Ionicons name="add" size={18} color={AppTheme.colors.primary} />
              </View>
              <Text style={styles.mobileEmptyText}>Add</Text>
            </View>
          )}
        </Pressable>
      </View>
    );
  };

  // ─── UI ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AdminNavbar title="Timetable" />

      {/* Outer vertical scroll — whole page scrolls */}
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadTimetable(true)}
            colors={[AppTheme.colors.primary]}
            tintColor={AppTheme.colors.primary}
          />
        }
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

              {/* Title + action buttons */}
              <View style={[styles.heroTopRow, isMobile && styles.heroTopRowMobile]}>
                <View style={isMobile ? { width: "100%", marginBottom: 12 } : { flex: 1 }}>
                  <View style={styles.heroLabelRow}>
                    <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.heroLabel}>SCHOOL TIMETABLE</Text>
                  </View>
                  <Text style={styles.heroTitle}>Class Schedules</Text>
                  <Text style={styles.heroSubtitle}>Manage weekly class timetables</Text>
                </View>

                <View style={[styles.heroActions, isMobile && styles.heroActionsMobile]}>
                  {/* Add Period */}
                  {!loading && classes.length > 0 && (
                    <Pressable
                      style={({ pressed }) => [styles.heroAddBtn, pressed && { opacity: 0.85 }]}
                      onPress={handleOpenAdd}
                    >
                      <Ionicons name="add" size={14} color={AppTheme.colors.primary} />
                      <Text style={styles.heroAddText}>Add Period</Text>
                    </Pressable>
                  )}

                  {/* Period Setup */}
                  <Pressable
                    style={({ pressed }) => [styles.heroGlassBtn, pressed && { opacity: 0.8 }]}
                    onPress={() => setShowPeriodSetup(true)}
                  >
                    <Ionicons name="settings-outline" size={13} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.heroGlassBtnText}>
                      {periodSlots.length > 0 ? `${periodSlots.length} Periods` : "Set Up Periods"}
                    </Text>
                  </Pressable>

                  {/* Import */}
                  <Pressable
                    style={({ pressed }) => [styles.heroGlassBtn, pressed && { opacity: 0.8 }]}
                    onPress={() => setShowImportModal(true)}
                  >
                    <Ionicons name="cloud-upload-outline" size={13} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.heroGlassBtnText}>Import</Text>
                  </Pressable>
                </View>
              </View>

              {/* Stats */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.heroStats}>
                <StatChip icon="school-outline" label="Classes" value={classes.length} />
                <StatChip icon="today-outline" label="Periods Today" value={totalPeriodsToday} />
                <StatChip icon="grid-outline" label="Total Entries" value={entries.length} />
                {periodSlots.length > 0 && (
                  <StatChip icon="time-outline" label="Period Slots" value={periodSlots.length} />
                )}
              </ScrollView>
            </LinearGradient>

            {/* ── Day Selector ──────────────────────────────────── */}
            <View style={styles.daySection}>
              <Text style={styles.daySectionLabel}>SELECT DAY</Text>
              <DaySelector
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
                daysWithEntries={daysWithEntries}
              />
            </View>

            {/* ── Timetable Table ───────────────────────────────── */}
            {loading ? (
              <View style={styles.centered}>
                <ActivityIndicator color={AppTheme.colors.primary} size="large" />
                <Text style={styles.loadingText}>Loading timetable…</Text>
              </View>
            ) : error ? (
              <InfoState title="Something went wrong" body={error} />
            ) : classes.length === 0 ? (
              <InfoState
                title="Add a class first"
                body="Create at least one class before building its timetable."
              />
            ) : isMobile ? (
              <View style={styles.mobileListWrapper}>
                {classGroups.map(([grade, sections]) => (
                  <View key={grade} style={styles.mobileGradeSection}>
                    <View style={styles.mobileGradeHeader}>
                      <Text style={styles.mobileGradeTitle}>Grade {grade}</Text>
                    </View>
                    {sections.map((cls) => (
                      <View key={cls.id} style={styles.mobileClassCard}>
                        <View style={styles.mobileClassHeader}>
                          <View style={styles.mobileClassTitleRow}>
                            <Ionicons name="people-circle-outline" size={20} color={AppTheme.colors.primary} />
                            <Text style={styles.mobileClassTitle}>Section {sectionOf(cls)}</Text>
                          </View>
                        </View>
                        <View style={styles.mobileClassPeriods}>
                          {periodNumbers.length === 0 ? (
                            <View style={styles.mobileNoPeriodContainer}>
                              <Ionicons name="calendar-outline" size={24} color={AppTheme.colors.textSecondary} style={{marginBottom: 8}} />
                              <Text style={styles.noPeriodText}>No periods on {selectedDay}</Text>
                            </View>
                          ) : (
                            <ScrollView
                              horizontal
                              showsHorizontalScrollIndicator={false}
                              contentContainerStyle={styles.mobilePeriodsScroll}
                            >
                              {periodNumbers.map((n) => renderMobileCell(cls.id, n))}
                            </ScrollView>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            ) : (
              /* Horizontal-only scroll wrapper for the table */
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={true}
                style={styles.tableWrapper}
                contentContainerStyle={styles.tableContent}
              >
                <View style={styles.table}>
                  {/* Header row */}
                  <View style={[styles.row, { backgroundColor: HEADER_BG }]}>
                    {/* Corner */}
                    <View
                      style={[
                        styles.cornerCell,
                        { width: CLASS_GRADE_COL_WIDTH + CLASS_SECTION_COL_WIDTH, height: HEADER_HEIGHT },
                      ]}
                    >
                      <Text style={styles.cornerLabelTop}>Period</Text>
                      <View style={styles.cornerLine} />
                      <Text style={styles.cornerLabelBottom}>Class</Text>
                    </View>

                    {/* Period headers */}
                    {periodNumbers.length === 0 ? (
                      <View style={[styles.headerCell, { width: PERIOD_COL_WIDTH * 3, height: HEADER_HEIGHT }]}>
                        <Ionicons name="calendar-outline" size={16} color={AppTheme.colors.textSecondary} />
                        <Text style={styles.noPeriodText}>No periods on {selectedDay}</Text>
                      </View>
                    ) : (
                      periodNumbers.map((n) => (
                        <View
                          key={n}
                          style={[styles.headerCell, { width: PERIOD_COL_WIDTH, height: HEADER_HEIGHT }]}
                        >
                          <View style={styles.periodBadge}>
                            <Text style={styles.periodBadgeText}>{n}</Text>
                          </View>
                          <Text style={styles.headerPeriodTime}>{periodLabel(n)}</Text>
                        </View>
                      ))
                    )}
                  </View>

                  {/* Data rows */}
                  {classGroups.map(([grade, sections], groupIdx) => (
                    <View key={grade}>
                      {sections.map((cls, sectionIdx) => (
                        <View key={cls.id} style={styles.row}>
                          {/* Grade */}
                          <View style={[styles.gradeCell, { width: CLASS_GRADE_COL_WIDTH, height: ROW_HEIGHT }]}>
                            {sectionIdx === 0 && (
                              <View style={styles.gradeBadge}>
                                <Text style={styles.gradeBadgeText}>{grade}</Text>
                              </View>
                            )}
                          </View>

                          {/* Section */}
                          <View style={[styles.sectionCell, { width: CLASS_SECTION_COL_WIDTH, height: ROW_HEIGHT }]}>
                            <Text style={styles.sectionCellText}>{sectionOf(cls)}</Text>
                          </View>

                          {/* Period cells */}
                          {periodNumbers.length === 0 ? (
                            <View style={[styles.cell, { width: PERIOD_COL_WIDTH * 3, height: ROW_HEIGHT }]}>
                              <Text style={styles.cellEmpty}>—</Text>
                            </View>
                          ) : (
                            periodNumbers.map((n) => (
                              <View key={n}>{renderCell(cls.id, n)}</View>
                            ))
                          )}
                        </View>
                      ))}

                      {groupIdx < classGroups.length - 1 && (
                        <View style={styles.groupDivider} />
                      )}
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}

            {/* Bottom padding */}
            <View style={{ height: 32 }} />
          </View>
        </View>
      </ScrollView>

      {/* Entry Modal — now receives all classes & subjectsCache for internal class picking */}
      <TimetableEntryModal
        visible={showEntryModal}
        onClose={() => setShowEntryModal(false)}
        onSubmit={handleSubmitEntry}
        classes={classes}
        dayOfWeek={selectedDay}
        teachers={teachers}
        initialEntry={editingEntry}
        submitting={savingEntry}
        errorMessage={entryError}
        periodSlots={periodSlots}
        subjectsCache={subjectsCache}
        onFetchSubjects={fetchSubjectsForClass}
      />

      {/* Period Setup Modal */}
      <PeriodSetupModal
        visible={showPeriodSetup}
        onClose={() => setShowPeriodSetup(false)}
        onSave={setPeriodSlots}
        initialSlots={periodSlots}
      />

      {/* Import Modal */}
      <ImportTimetableModal
        visible={showImportModal}
        onClose={() => setShowImportModal(false)}
        token={token}
        onImported={() => loadTimetable(true)}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        visible={Boolean(deleteTarget)}
        title="Remove this period?"
        message={
          deleteTarget
            ? `Remove ${getSubjectName(deleteTarget)} (${getTeacherName(deleteTarget, teachers)}) from the timetable?`
            : ""
        }
        confirmText="Remove"
        destructive
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppTheme.colors.background },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  centerContainer: {
    alignItems: "center",
    paddingVertical: AppTheme.spacing.l,
  },
  body: {
    width: "100%",
    maxWidth: 900,
    gap: AppTheme.spacing.l,
  },

  // ── Hero ─────────────────────────────────────────────────────────
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
  heroAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: AppTheme.radius.pill,
  },
  heroAddText: {
    fontSize: 12,
    fontWeight: "700",
    color: AppTheme.colors.primary,
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

  // ── Day selector ──────────────────────────────────────────────────
  daySection: {
    marginHorizontal: AppTheme.spacing.l,
    gap: 4,
  },
  daySectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: AppTheme.colors.textSecondary,
    letterSpacing: 1,
  },

  // ── Loading / Error ───────────────────────────────────────────────
  centered: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 13,
    color: AppTheme.colors.textSecondary,
  },

  // ── Table ─────────────────────────────────────────────────────────
  tableWrapper: {
    marginHorizontal: AppTheme.spacing.l,
  },
  tableContent: {
    paddingBottom: 4,
  },
  table: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: AppTheme.radius.large,
    overflow: "hidden",
    ...AppTheme.shadows.card,
  },

  row: { flexDirection: "row" },

  cornerCell: {
    backgroundColor: HEADER_BG,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER_COLOR,
    overflow: "hidden",
    position: "relative",
  },
  cornerLabelTop: {
    position: "absolute",
    top: 8,
    right: 8,
    fontSize: 9,
    fontWeight: "800",
    color: AppTheme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  cornerLabelBottom: {
    position: "absolute",
    bottom: 8,
    left: 8,
    fontSize: 9,
    fontWeight: "800",
    color: AppTheme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  cornerLine: {
    position: "absolute",
    width: "160%",
    height: 1,
    backgroundColor: BORDER_COLOR,
    top: "50%",
    left: "-30%",
    transform: [{ rotate: "22deg" }],
  },

  headerCell: {
    backgroundColor: HEADER_BG,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER_COLOR,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
    gap: 4,
  },
  periodBadge: {
    backgroundColor: AppTheme.colors.primary,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  periodBadgeText: { fontSize: 12, fontWeight: "800", color: "#FFFFFF" },
  headerPeriodTime: {
    fontSize: 10,
    color: AppTheme.colors.textSecondary,
    fontWeight: "500",
    textAlign: "center",
  },
  noPeriodText: {
    fontSize: 11,
    color: AppTheme.colors.textSecondary,
    textAlign: "center",
    marginTop: 6,
  },

  gradeCell: {
    backgroundColor: GRADE_BG,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER_COLOR,
    justifyContent: "center",
    alignItems: "center",
  },
  gradeBadge: {
    backgroundColor: AppTheme.colors.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: AppTheme.colors.primary + "33",
  },
  gradeBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: AppTheme.colors.primaryDark,
    textAlign: "center",
  },

  sectionCell: {
    backgroundColor: GRADE_BG,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER_COLOR,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionCellText: {
    fontSize: 14,
    fontWeight: "800",
    color: AppTheme.colors.primaryDark,
  },

  cell: {
    backgroundColor: CELL_BG,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER_COLOR,
    overflow: "hidden",
  },
  cellPressed: { opacity: 0.85 },

  cellContent: { flex: 1, flexDirection: "row" },
  cellAccentBar: { width: 4, alignSelf: "stretch", opacity: 0.85 },
  cellInner: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
    justifyContent: "space-between",
  },
  cellSubject: { fontSize: 12, fontWeight: "700", lineHeight: 16 },
  cellTeacherRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  cellTeacher: { fontSize: 10, color: AppTheme.colors.textSecondary, flex: 1 },
  cellActions: { flexDirection: "row", gap: 6, marginTop: 4 },
  cellActionBtn: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderWidth: 1,
  },
  cellEmpty: { fontSize: 14, color: "#C5CDD6" },

  emptyCellInner: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyAddIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: AppTheme.colors.primary + "55",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: AppTheme.colors.primaryLight + "88",
  },

  groupDivider: {
    height: 3,
    backgroundColor: AppTheme.colors.primaryLight,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: AppTheme.colors.primary + "22",
  },

  // ── Mobile Layout ───────────────────────────────────────────────
  mobileListWrapper: {
    paddingHorizontal: AppTheme.spacing.l,
    gap: 20,
  },
  mobileGradeSection: {
    gap: 12,
  },
  mobileGradeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  mobileGradeTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: AppTheme.colors.text,
  },
  mobileClassCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: AppTheme.radius.large,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    overflow: "hidden",
    ...AppTheme.shadows.small,
  },
  mobileClassHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: GRADE_BG,
    borderBottomWidth: 1,
    borderColor: BORDER_COLOR,
  },
  mobileClassTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mobileClassTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: AppTheme.colors.primaryDark,
  },
  mobileClassPeriods: {
    paddingVertical: 12,
    backgroundColor: "#FAFCFF",
  },
  mobileNoPeriodContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  mobilePeriodsScroll: {
    paddingHorizontal: 12,
    gap: 12,
  },
  mobilePeriodWrapper: {
    width: 150,
    gap: 8,
  },
  mobilePeriodHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  mobilePeriodLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: AppTheme.colors.primary,
  },
  mobilePeriodTime: {
    fontSize: 10,
    color: AppTheme.colors.textSecondary,
    fontWeight: "600",
  },
  mobileCell: {
    backgroundColor: CELL_BG,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 12,
    height: 100,
    overflow: "hidden",
    ...AppTheme.shadows.small,
  },
  mobileEmptyCell: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F9FAFB",
  },
  mobileEmptyText: {
    fontSize: 12,
    fontWeight: "600",
    color: AppTheme.colors.textSecondary,
  },
});
