import { useCallback, useEffect, useMemo, useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { RootStackParamList } from "../navigation/AppNavigator";
import { colors } from "../theme/colors";
import { useAuth } from "../context/AuthContext";

import { DaySelector } from "../components/teacher/timetable/DaySelector";
import { TimetableEntryModal } from "../components/schoolAdmin/timetable/TimetableEntryModal";
import { ImportTimetableModal } from "../components/schoolAdmin/timetable/ImportTimetableModal";
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

const CLASS_GRADE_COL_WIDTH = 58;
const CLASS_SECTION_COL_WIDTH = 38;
const PERIOD_COL_WIDTH = 130;
const ROW_HEIGHT = 80;
const HEADER_HEIGHT = 60;

const BORDER_COLOR = "#D1D9E0";
const HEADER_BG = "#EEF2FF";
const CELL_BG = "#FFFFFF";
const GRADE_BG = "#F8F9FF";

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

  const periodLabel = (n: number) => {
    const startH = 7 + n;
    const endH = startH + 1;
    const fmt = (h: number) => `${String(h).padStart(2, "0")}:00`;
    return `${fmt(startH)} – ${fmt(endH)}`;
  };

  // ─── Open cell (edit existing or add new) ────────────────────────────────
  const handleCellPress = useCallback(
    async (classId: number, periodNumber: number) => {
      const existing = entryMap[classId]?.[periodNumber];

      // Set state BEFORE opening modal
      setEditingEntry(existing ?? null);
      setModalClassId(classId);
      setModalPeriodNumber(periodNumber);
      setEntryError(null);

      // Fetch subjects for this class
      const subjects = await fetchSubjectsForClass(classId);
      setModalSubjects(subjects);

      setShowEntryModal(true);
    },
    [entryMap, fetchSubjectsForClass],
  );

  // ─── Open add (FAB) ──────────────────────────────────────────────────────
  const handleOpenAdd = useCallback(async () => {
    // Default to first class
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

    return (
      <Pressable
        style={({ pressed }) => [
          styles.cell,
          { width: PERIOD_COL_WIDTH, height: ROW_HEIGHT },
          pressed && styles.cellPressed,
          entry && styles.cellFilled,
        ]}
        onPress={() => handleCellPress(classId, periodNumber)}
        onLongPress={() => entry && setDeleteTarget(entry)}
        delayLongPress={400}
      >
        {entry ? (
          <>
            <Text style={styles.cellSubject} numberOfLines={2}>
              {getSubjectName(entry)}
            </Text>
            <Text style={styles.cellTeacher} numberOfLines={1}>
              ({getTeacherName(entry, teachers)})
            </Text>

            {/* Edit / Delete quick actions */}
            <View style={styles.cellActions}>
              <Pressable
                style={styles.cellActionBtn}
                hitSlop={6}
                onPress={() => handleCellPress(classId, periodNumber)}
              >
                <Ionicons
                  name="pencil-outline"
                  size={11}
                  color={colors.accentDark}
                />
              </Pressable>
              <Pressable
                style={styles.cellActionBtn}
                hitSlop={6}
                onPress={() => setDeleteTarget(entry)}
              >
                <Ionicons name="trash-outline" size={11} color="#EF4444" />
              </Pressable>
            </View>
          </>
        ) : (
          <Ionicons name="add-circle-outline" size={20} color="#C5CDD6" />
        )}
      </Pressable>
    );
  };

  // ─── UI ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.title}>Timetable</Text>
          <Text style={styles.subtitle}>Day-wise class schedule</Text>
        </View>
        <Pressable
          style={styles.importButton}
          onPress={() => setShowImportModal(true)}
        >
          <Ionicons
            name="cloud-upload-outline"
            size={16}
            color={colors.accentDark}
          />
          <Text style={styles.importButtonText}>Import</Text>
        </Pressable>
      </View>

      {/* Day Selector */}
      <View style={styles.daySelectorWrap}>
        <DaySelector selectedDay={selectedDay} onSelectDay={setSelectedDay} />
      </View>

      {/* Body */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accentDark} size="large" />
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
            />
          }
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.table}>
              {/* Header row */}
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
                  <Text style={styles.cornerLabelTop}>Time</Text>
                  <View style={styles.cornerLine} />
                  <Text style={styles.cornerLabelBottom}>Classes</Text>
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
                      <Text style={styles.headerPeriodNum}>Period {n}</Text>
                      <Text style={styles.headerPeriodTime}>
                        {periodLabel(n)}
                      </Text>
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
                          <Text style={styles.gradeCellText}>{grade}</Text>
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
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* FAB */}
      {!loading && !error && classes.length > 0 && (
        <Pressable style={styles.fab} onPress={handleOpenAdd}>
          {loadingSubjects ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="add" size={26} color="#FFFFFF" />
              <Text style={styles.fabText}>Add Period</Text>
            </>
          )}
        </Pressable>
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
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: { fontSize: 22, fontWeight: "800", color: colors.textPrimary },
  subtitle: { marginTop: 2, fontSize: 12, color: colors.textSecondary },

  importButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  importButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.accentDark,
  },

  daySelectorWrap: { paddingHorizontal: 20, marginBottom: 4 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  padded: { padding: 20 },

  table: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    margin: 12,
    borderRadius: 10,
    overflow: "hidden",
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
    fontSize: 10,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  cornerLabelBottom: {
    position: "absolute",
    bottom: 8,
    left: 8,
    fontSize: 10,
    fontWeight: "700",
    color: colors.textSecondary,
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
    paddingHorizontal: 6,
  },
  headerPeriodNum: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  headerPeriodTime: {
    marginTop: 3,
    fontSize: 10,
    color: colors.textSecondary,
  },
  noPeriodText: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: "center",
  },

  gradeCell: {
    backgroundColor: GRADE_BG,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER_COLOR,
    justifyContent: "center",
    alignItems: "center",
  },
  gradeCellText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.textPrimary,
    textAlign: "center",
    paddingHorizontal: 4,
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
    fontSize: 13,
    fontWeight: "700",
    color: colors.accentDark ?? colors.textPrimary,
  },

  cell: {
    backgroundColor: CELL_BG,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER_COLOR,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  cellPressed: { backgroundColor: "#EEF2FF" },
  cellFilled: { backgroundColor: "#FAFBFF" },

  cellSubject: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
    lineHeight: 16,
  },
  cellTeacher: {
    marginTop: 2,
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: "center",
  },
  cellEmpty: { fontSize: 14, color: "#C5CDD6" },

  // small edit/delete icons inside filled cell
  cellActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  cellActionBtn: {
    padding: 3,
    borderRadius: 4,
    backgroundColor: "#F0F4FF",
  },

  groupDivider: { height: 3, backgroundColor: "#B0BEC5" },

  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.accent,
    paddingHorizontal: 18,
    height: 52,
    borderRadius: 26,
    shadowColor: colors.accentDark,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  fabText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
