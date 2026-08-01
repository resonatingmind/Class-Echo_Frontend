import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  Animated,
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

// ─── Subject colour palette (cycles through based on subject name hash) ───────
const SUBJECT_COLORS = [
  { bg: "#EFF6FF", accent: "#3B82F6", text: "#1D4ED8" }, // blue
  { bg: "#F0FDF4", accent: "#22C55E", text: "#15803D" }, // green
  { bg: "#FFF7ED", accent: "#F97316", text: "#C2410C" }, // orange
  { bg: "#FDF4FF", accent: "#A855F7", text: "#7E22CE" }, // purple
  { bg: "#FFF1F2", accent: "#F43F5E", text: "#BE123C" }, // rose
  { bg: "#ECFEFF", accent: "#06B6D4", text: "#0E7490" }, // cyan
  { bg: "#FEFCE8", accent: "#EAB308", text: "#854D0E" }, // yellow
  { bg: "#F0FDFA", accent: "#14B8A6", text: "#0F766E" }, // teal
];

function subjectColorIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % SUBJECT_COLORS.length;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTeacherName(
  entry: TimetableEntryOut,
  teachers: TeacherOut[],
): string {
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
function StatChip({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string | number;
}) {
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  chipValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 20,
  },
  chipLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "500",
    letterSpacing: 0.3,
  },
});

// ─── Screen ──────────────────────────────────────────────────────────────────

export function SchoolAdminTimetableScreen({ navigation }: Props) {
  const { session } = useAuth();
  const token = session?.token as string;

  const [classes, setClasses] = useState<ClassOut[]>([]);
  const [teachers, setTeachers] = useState<TeacherOut[]>([]);
  const [entries, setEntries] = useState<TimetableEntryOut[]>([]);

  // subjects cache: classId → SubjectOut[]
  const [subjectsCache, setSubjectsCache] = useState<
    Record<number, SubjectOut[]>
  >({});
  // subjects currently shown in modal
  const [modalSubjects, setModalSubjects] = useState<SubjectOut[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  const [selectedDay, setSelectedDay] = useState<string>(WEEKDAYS[0]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showEntryModal, setShowEntryModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntryOut | null>(
    null,
  );
  const [modalClassId, setModalClassId] = useState<number>(0);
  const [modalPeriodNumber, setModalPeriodNumber] = useState<number>(1);
  const [savingEntry, setSavingEntry] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);

  const [showImportModal, setShowImportModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TimetableEntryOut | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  // ─── Period slots (configured once, reused for every entry) ─────
  const [periodSlots, setPeriodSlots] = useState<PeriodSlot[]>([]);
  const [showPeriodSetup, setShowPeriodSetup] = useState(false);

  // FAB pulse animation
  const fabPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(fabPulse, {
          toValue: 1.18,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(fabPulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [fabPulse]);

  // ─── Load subjects for a class (with cache) ─────────────────────────────
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

  // ─── Load base data ──────────────────────────────────────────────────────
  const loadBase = useCallback(async () => {
    try {
      const [classList, teacherList] = await Promise.all([
        getSchoolAdminClasses(token),
        getSchoolAdminTeachers(token),
      ]);
      setClasses(classList);
      setTeachers(teacherList);
    } catch {
      /* timetable error shown separately */
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
        setError(
          err instanceof Error ? err.message : "Couldn't load the timetable.",
        );
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
      // Load saved period slot configuration
      loadPeriodSlots().then(setPeriodSlots);
    }, [loadBase, loadTimetable]),
  );

  // ─── Derived ─────────────────────────────────────────────────────────────
  const periodNumbers = useMemo(() => {
    const nums = entries
      .filter((e) => e.day_of_week === selectedDay)
      .map((e) => e.period_number);
    return [...new Set(nums)].sort((a, b) => a - b);
  }, [entries, selectedDay]);

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

  /** Set of days that have at least one timetable entry */
  const daysWithEntries = useMemo(() => {
    const s = new Set<string>();
    for (const e of entries) s.add(e.day_of_week);
    return s;
  }, [entries]);

  /** Total periods on selected day across all classes */
  const totalPeriodsToday = useMemo(
    () => entries.filter((e) => e.day_of_week === selectedDay).length,
    [entries, selectedDay],
  );

  const periodLabel = (n: number) => {
    const configured = periodSlots.find((s) => s.number === n);
    if (configured) {
      const fmt12 = (t: string) => {
        const [h, m] = t.split(":").map(Number);
        const ampm = h >= 12 ? "PM" : "AM";
        const hour = h % 12 || 12;
        return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
      };
      return `${fmt12(configured.startTime)} – ${fmt12(configured.endTime)}`;
    }
    // Fallback: simple hour offset
    const startH = 7 + n;
    const endH = startH + 1;
    const fmt = (h: number) =>
      h >= 12 ? `${h === 12 ? 12 : h - 12}:00 PM` : `${h}:00 AM`;
    return `${fmt(startH)} – ${fmt(endH)}`;
  };

  // ─── Open cell (edit existing or add new) ────────────────────────────────
  const handleCellPress = useCallback(
    async (classId: number, periodNumber: number) => {
      const existing = entryMap[classId]?.[periodNumber];

      setEditingEntry(existing ?? null);
      setModalClassId(classId);
      setModalPeriodNumber(periodNumber);
      setEntryError(null);

      const subjects = await fetchSubjectsForClass(classId);
      setModalSubjects(subjects);

      setShowEntryModal(true);
    },
    [entryMap, fetchSubjectsForClass],
  );

  // ─── Open add (FAB) ──────────────────────────────────────────────────────
  const handleOpenAdd = useCallback(async () => {
    const firstClassId = classes[0]?.id ?? 0;
    setEditingEntry(null);
    setModalClassId(firstClassId);
    setModalPeriodNumber(periodNumbers[0] ?? 1);
    setEntryError(null);

    if (firstClassId) {
      const subjects = await fetchSubjectsForClass(firstClassId);
      setModalSubjects(subjects);
    } else {
      setModalSubjects([]);
    }

    setShowEntryModal(true);
  }, [classes, periodNumbers, fetchSubjectsForClass]);

  // ─── Submit (create / update) ────────────────────────────────────────────
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
      setEntryError(
        err instanceof Error ? err.message : "Couldn't save the period.",
      );
    } finally {
      setSavingEntry(false);
    }
  };

  // ─── Delete ──────────────────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTimetableEntry(token, deleteTarget.id);
      setDeleteTarget(null);
      await loadTimetable(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't delete the period.",
      );
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  // ─── Render a single data cell ───────────────────────────────────────────
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
            {/* Colored left accent bar */}
            <View style={[styles.cellAccentBar, { backgroundColor: palette.accent }]} />

            <View style={styles.cellInner}>
              {/* Subject name */}
              <Text
                style={[styles.cellSubject, { color: palette.text }]}
                numberOfLines={2}
              >
                {subjectName}
              </Text>

              {/* Teacher */}
              <View style={styles.cellTeacherRow}>
                <Ionicons
                  name="person-outline"
                  size={9}
                  color={AppTheme.colors.textSecondary}
                />
                <Text style={styles.cellTeacher} numberOfLines={1}>
                  {teacherName}
                </Text>
              </View>

              {/* Quick actions */}
              <View style={styles.cellActions}>
                <Pressable
                  style={[styles.cellActionBtn, { borderColor: palette.accent + "44" }]}
                  hitSlop={6}
                  onPress={() => handleCellPress(classId, periodNumber)}
                >
                  <Ionicons
                    name="pencil-outline"
                    size={10}
                    color={palette.text}
                  />
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

  // ─── UI ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <AdminNavbar title="Timetable" />

      <View style={styles.flex}>
        <View style={styles.centerContainer}>
          <View style={styles.body}>

            {/* ── Hero Banner ───────────────────────────────────────── */}
            <LinearGradient
              colors={["#1D8EF5", "#156FD6", "#0D4FAA"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroBanner}
            >
              {/* Decorative circles */}
              <View style={styles.heroCircle1} />
              <View style={styles.heroCircle2} />

              <View style={styles.heroTopRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.heroLabelRow}>
                    <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.heroLabel}>SCHOOL TIMETABLE</Text>
                  </View>
                  <Text style={styles.heroTitle}>Class Schedules</Text>
                  <Text style={styles.heroSubtitle}>
                    Manage your weekly class timetables
                  </Text>
                </View>

                {/* Top action buttons */}
                <View style={styles.heroActions}>
                  {/* Add Period */}
                  {classes.length > 0 && (
                    <Pressable
                      style={({ pressed }) => [
                        styles.heroAddBtn,
                        pressed && { opacity: 0.85 },
                      ]}
                      onPress={handleOpenAdd}
                    >
                      {loadingSubjects ? (
                        <ActivityIndicator color={AppTheme.colors.primary} size="small" />
                      ) : (
                        <>
                          <Ionicons name="add" size={14} color={AppTheme.colors.primary} />
                          <Text style={styles.heroAddText}>Add Period</Text>
                        </>
                      )}
                    </Pressable>
                  )}

                  {/* Period Setup */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.heroSetupBtn,
                      pressed && { opacity: 0.8 },
                    ]}
                    onPress={() => setShowPeriodSetup(true)}
                  >
                    <Ionicons name="settings-outline" size={13} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.heroSetupText}>
                      {periodSlots.length > 0 ? `${periodSlots.length} Periods` : "Set Up Periods"}
                    </Text>
                  </Pressable>

                  {/* Import button */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.heroImportBtn,
                      pressed && { opacity: 0.8 },
                    ]}
                    onPress={() => setShowImportModal(true)}
                  >
                    <Ionicons
                      name="cloud-upload-outline"
                      size={13}
                      color="rgba(255,255,255,0.9)"
                    />
                    <Text style={styles.heroImportText}>Import</Text>
                  </Pressable>
                </View>
              </View>

              {/* Stats chips */}
              <View style={styles.heroStats}>
                <StatChip
                  icon="school-outline"
                  label="Classes"
                  value={classes.length}
                />
                <StatChip
                  icon="today-outline"
                  label="Periods Today"
                  value={totalPeriodsToday}
                />
                <StatChip
                  icon="grid-outline"
                  label="Total Entries"
                  value={entries.length}
                />
              </View>
            </LinearGradient>

            {/* ── Day Selector ──────────────────────────────────────── */}
            <View style={styles.daySection}>
              <Text style={styles.daySectionLabel}>SELECT DAY</Text>
              <DaySelector
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
                daysWithEntries={daysWithEntries}
              />
            </View>

            {/* ── Body ──────────────────────────────────────────────── */}
            {loading ? (
              <View style={styles.centered}>
                <ActivityIndicator color={AppTheme.colors.primary} size="large" />
                <Text style={styles.loadingText}>Loading timetable…</Text>
              </View>
            ) : error ? (
              <View style={styles.padded}>
                <InfoState title="Something went wrong" body={error} />
              </View>
            ) : classes.length === 0 ? (
              <View style={styles.padded}>
                <InfoState
                  title="Add a class first"
                  body="Create at least one class before building its timetable."
                />
              </View>
            ) : (
              <ScrollView
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => loadTimetable(true)}
                    colors={[AppTheme.colors.primary]}
                    tintColor={AppTheme.colors.primary}
                  />
                }
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}
              >
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.table}>
                    {/* ── Header row ───────────────────────────────── */}
                    <View style={[styles.row, { backgroundColor: HEADER_BG }]}>
                      {/* Corner */}
                      <View
                        style={[
                          styles.cornerCell,
                          {
                            width: CLASS_GRADE_COL_WIDTH + CLASS_SECTION_COL_WIDTH,
                            height: HEADER_HEIGHT,
                          },
                        ]}
                      >
                        <Text style={styles.cornerLabelTop}>Period</Text>
                        <View style={styles.cornerLine} />
                        <Text style={styles.cornerLabelBottom}>Class</Text>
                      </View>

                      {/* Period headers */}
                      {periodNumbers.length === 0 ? (
                        <View
                          style={[
                            styles.headerCell,
                            {
                              width: PERIOD_COL_WIDTH * 3,
                              height: HEADER_HEIGHT,
                            },
                          ]}
                        >
                          <Ionicons
                            name="calendar-outline"
                            size={16}
                            color={AppTheme.colors.textSecondary}
                          />
                          <Text style={styles.noPeriodText}>
                            No periods on {selectedDay}
                          </Text>
                        </View>
                      ) : (
                        periodNumbers.map((n) => (
                          <View
                            key={n}
                            style={[
                              styles.headerCell,
                              { width: PERIOD_COL_WIDTH, height: HEADER_HEIGHT },
                            ]}
                          >
                            <View style={styles.periodBadge}>
                              <Text style={styles.periodBadgeText}>{n}</Text>
                            </View>
                            <Text style={styles.headerPeriodTime}>
                              {periodLabel(n)}
                            </Text>
                          </View>
                        ))
                      )}
                    </View>

                    {/* ── Data rows ────────────────────────────────── */}
                    {classGroups.map(([grade, sections], groupIdx) => (
                      <View key={grade}>
                        {sections.map((cls, sectionIdx) => (
                          <View key={cls.id} style={styles.row}>
                            {/* Grade */}
                            <View
                              style={[
                                styles.gradeCell,
                                {
                                  width: CLASS_GRADE_COL_WIDTH,
                                  height: ROW_HEIGHT,
                                },
                              ]}
                            >
                              {sectionIdx === 0 && (
                                <View style={styles.gradeBadge}>
                                  <Text style={styles.gradeBadgeText}>
                                    {grade}
                                  </Text>
                                </View>
                              )}
                            </View>

                            {/* Section */}
                            <View
                              style={[
                                styles.sectionCell,
                                {
                                  width: CLASS_SECTION_COL_WIDTH,
                                  height: ROW_HEIGHT,
                                },
                              ]}
                            >
                              <Text style={styles.sectionCellText}>
                                {sectionOf(cls)}
                              </Text>
                            </View>

                            {/* Period cells */}
                            {periodNumbers.length === 0 ? (
                              <View
                                style={[
                                  styles.cell,
                                  {
                                    width: PERIOD_COL_WIDTH * 3,
                                    height: ROW_HEIGHT,
                                  },
                                ]}
                              >
                                <Text style={styles.cellEmpty}>—</Text>
                              </View>
                            ) : (
                              periodNumbers.map((n) => (
                                <View key={n}>
                                  {renderCell(cls.id, n)}
                                </View>
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
                <View style={{ height: 110 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </View>

      {/* ── FAB ──────────────────────────────────────────────────────── */}
      {!loading && !error && classes.length > 0 && (
        <View style={styles.fabContainer}>
          {/* Pulse ring */}
          <Animated.View
            style={[
              styles.fabPulse,
              { transform: [{ scale: fabPulse }] },
            ]}
          />
          <Pressable
            style={({ pressed }) => [
              styles.fab,
              pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
            ]}
            onPress={handleOpenAdd}
          >
            {loadingSubjects ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="add" size={24} color="#FFFFFF" />
                <Text style={styles.fabText}>Add Period</Text>
              </>
            )}
          </Pressable>
        </View>
      )}

      {/* Entry Modal */}
      <TimetableEntryModal
        visible={showEntryModal}
        onClose={() => setShowEntryModal(false)}
        onSubmit={handleSubmitEntry}
        classId={modalClassId}
        dayOfWeek={selectedDay}
        subjects={modalSubjects}
        teachers={teachers}
        initialEntry={editingEntry}
        submitting={savingEntry || loadingSubjects}
        errorMessage={entryError}
        periodSlots={periodSlots}
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
  container: { flex: 1, backgroundColor: AppTheme.colors.background },
  flex: { flex: 1 },
  centerContainer: {
    flex: 1,
    alignItems: "center",
  },
  body: {
    width: "100%",
    maxWidth: 900,
    flex: 1,
  },

  // ── Hero ───────────────────────────────────────────────────────────
  heroBanner: {
    marginHorizontal: AppTheme.spacing.l,
    marginTop: AppTheme.spacing.l,
    borderRadius: AppTheme.radius.large,
    padding: 20,
    overflow: "hidden",
    gap: 16,
  },
  heroCircle1: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.07)",
    top: -40,
    right: -30,
  },
  heroCircle2: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
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
  heroLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.75)",
    letterSpacing: 1.2,
  },
  heroTitle: {
    fontSize: 22,
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
    marginTop: 4,
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
  heroSetupBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: AppTheme.radius.pill,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  heroSetupText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  heroImportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: AppTheme.radius.pill,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  heroImportText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  heroStats: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },

  // ── Day selector ───────────────────────────────────────────────────
  daySection: {
    marginHorizontal: AppTheme.spacing.l,
    marginTop: AppTheme.spacing.m,
    gap: 4,
  },
  daySectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: AppTheme.colors.textSecondary,
    letterSpacing: 1,
  },

  // ── Loading ────────────────────────────────────────────────────────
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 13,
    color: AppTheme.colors.textSecondary,
  },
  padded: { paddingVertical: 20, paddingHorizontal: AppTheme.spacing.l },

  // ── Table ──────────────────────────────────────────────────────────
  table: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    margin: AppTheme.spacing.l,
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
  periodBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
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
    paddingHorizontal: 6,
    paddingVertical: 4,
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
  cellPressed: {
    opacity: 0.85,
  },

  cellContent: {
    flex: 1,
    flexDirection: "row",
  },
  cellAccentBar: {
    width: 4,
    alignSelf: "stretch",
    opacity: 0.85,
  },
  cellInner: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
    justifyContent: "space-between",
  },
  cellSubject: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  cellTeacherRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  cellTeacher: {
    fontSize: 10,
    color: AppTheme.colors.textSecondary,
    flex: 1,
  },
  cellActions: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  cellActionBtn: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderWidth: 1,
  },
  cellEmpty: { fontSize: 14, color: "#C5CDD6" },

  emptyCellInner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
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

  // ── FAB ────────────────────────────────────────────────────────────
  fabContainer: {
    position: "absolute",
    right: 20,
    bottom: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  fabPulse: {
    position: "absolute",
    width: 72,
    height: 52,
    borderRadius: 26,
    backgroundColor: AppTheme.colors.primary + "22",
  },
  fab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: AppTheme.colors.primary,
    paddingHorizontal: 20,
    height: 52,
    borderRadius: 26,
    shadowColor: AppTheme.colors.primaryDark,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  fabText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
