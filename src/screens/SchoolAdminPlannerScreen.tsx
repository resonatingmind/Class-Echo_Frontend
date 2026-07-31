import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View, ActivityIndicator, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { AppTheme } from "../theme/AppTheme";
import { RootStackParamList } from "../navigation/AppNavigator";
import { AdminNavbar } from "../components/common/AdminNavbar";
import { PlannerHeader } from "../components/planner/PlannerHeader";
import { PlannerFilters } from "../components/planner/PlannerFilters";
import { PlannerStaffingSummary } from "../components/planner/PlannerStaffingSummary";
import { PlannerStatusChips } from "../components/planner/PlannerStatusChips";
import { PlannerTableRow } from "../components/planner/PlannerTableRow";
import { PlannerEmpty } from "../components/planner/PlannerEmpty";
import { SelectionBottomSheet } from "../components/common/SelectionBottomSheet";
import { QuickAssignmentModal } from "../components/planner/QuickAssignmentModal";
import { AssignTeacherModal } from "../components/AssignTeacherModal";

import { PlannerItemOut, TeacherOut } from "../types/api";
import { getSchoolPlanner, getSchoolAdminTeachers } from "../lib/api";
import { useAuth } from "../context/AuthContext";

type FilterType = "class" | "section" | "subject" | "teacher" | "year" | null;

export function SchoolAdminPlannerScreen() {
  const { session } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [planner, setPlanner] = useState<PlannerItemOut[]>([]);
  const [teachers, setTeachers] = useState<TeacherOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignTarget, setAssignTarget] = useState<{
    subjectId: number;
    subjectName: string;
    teacherId: number | null;
  } | null>(null);

  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [showOnlyUnassigned, setShowOnlyUnassigned] = useState(false);

  const [filterVisible, setFilterVisible] = useState(false);
  const [quickAssignmentVisible, setQuickAssignmentVisible] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>(null);

  useEffect(() => {
    loadPlanner();
    if (session?.token) {
      getSchoolAdminTeachers(session.token).then(setTeachers).catch(() => {});
    }
  }, [session]);

  async function loadPlanner() {
    if (!session?.token) return;

    try {
      setLoading(true);
      const data = await getSchoolPlanner(session.token);
      setPlanner(data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  const classOptions = [...new Set(planner.map((item) => item.class_name))].sort().map(c => ({ id: c, label: c }));
  const sectionOptions = [...new Set(planner.map((item) => item.section))].sort().map(s => ({ id: s, label: `Section ${s}` }));
  const subjectOptions = [...new Set(planner.map((item) => item.subject_name))].sort().map(s => ({ id: s, label: s }));
  const teacherOptions = [...new Set(planner.map((item) => item.teacher_name).filter(Boolean))].sort().map(t => ({ id: t as string, label: t as string }));
  const yearOptions = [...new Set(planner.map((item) => item.academic_year))].sort().map(y => ({ id: y, label: y }));

  const totalUnassigned = planner.filter((item) => !item.teacher_id).length;

  const filteredPlanner = planner.filter((item) => {
    const matchesSearch =
      search.trim() === "" ||
      item.subject_name.toLowerCase().includes(search.toLowerCase()) ||
      item.class_name.toLowerCase().includes(search.toLowerCase()) ||
      (item.teacher_name ?? "").toLowerCase().includes(search.toLowerCase());

    const matchesClass =
      selectedClass == null || item.class_name === selectedClass;
    const matchesSection =
      selectedSection == null || item.section === selectedSection;
    const matchesSubject =
      selectedSubject == null || item.subject_name === selectedSubject;
    const matchesTeacher =
      selectedTeacher == null || item.teacher_name === selectedTeacher;
    const matchesYear =
      selectedYear == null || item.academic_year === selectedYear;
    const matchesUnassigned = !showOnlyUnassigned || !item.teacher_id;

    return (
      matchesSearch &&
      matchesClass &&
      matchesSection &&
      matchesSubject &&
      matchesTeacher &&
      matchesYear &&
      matchesUnassigned
    );
  });

  const sortedPlanner = useMemo(() => {
    return [...filteredPlanner].sort((a, b) => {
      const classCompare = a.class_name.localeCompare(b.class_name, undefined, {
        numeric: true,
      });
      if (classCompare !== 0) return classCompare;
      const sectionCompare = a.section.localeCompare(b.section);
      if (sectionCompare !== 0) return sectionCompare;
      return a.subject_name.localeCompare(b.subject_name);
    });
  }, [filteredPlanner]);

  function clearAllFilters() {
    setSelectedClass(null);
    setSelectedSection(null);
    setSelectedSubject(null);
    setSelectedTeacher(null);
    setSelectedYear(null);
  }

  function openQuickAssignment() {
    setQuickAssignmentVisible(true);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <AdminNavbar title="Planner" />
      <View style={styles.centerContainer}>
        <View style={styles.body}>
          <View style={styles.headerContainer}>
            <PlannerHeader onCreatePress={() => openQuickAssignment()} />

            <PlannerStaffingSummary
              staffed={planner.length - totalUnassigned}
              total={planner.length}
            />

            <PlannerStatusChips
              totalCount={planner.length}
              unassignedCount={totalUnassigned}
              showOnlyUnassigned={showOnlyUnassigned}
              onShowAll={() => setShowOnlyUnassigned(false)}
              onShowUnassigned={() => setShowOnlyUnassigned(true)}
            />

            <PlannerFilters
              search={search}
              onSearchChange={setSearch}
              selectedClass={selectedClass}
              selectedSection={selectedSection}
              selectedSubject={selectedSubject}
              selectedTeacher={selectedTeacher}
              selectedYear={selectedYear}
              onClassPress={() => {
                setFilterType("class");
                setFilterVisible(true);
              }}
              onSectionPress={() => {
                setFilterType("section");
                setFilterVisible(true);
              }}
              onSubjectPress={() => {
                setFilterType("subject");
                setFilterVisible(true);
              }}
              onTeacherPress={() => {
                setFilterType("teacher");
                setFilterVisible(true);
              }}
              onYearPress={() => {
                setFilterType("year");
                setFilterVisible(true);
              }}
              onSelectedClassClear={() => setSelectedClass(null)}
              onSelectedSectionClear={() => setSelectedSection(null)}
              onSelectedSubjectClear={() => setSelectedSubject(null)}
              onSelectedTeacherClear={() => setSelectedTeacher(null)}
              onSelectedYearClear={() => setSelectedYear(null)}
              onClearAll={clearAllFilters}
            />
          </View>

          <View style={styles.listContainer}>
            {loading ? (
              <ActivityIndicator
                size="large"
                color={AppTheme.colors.primary}
                style={{ marginTop: 40 }}
              />
            ) : sortedPlanner.length === 0 ? (
              <PlannerEmpty />
            ) : (
              <View style={styles.listContainerInner}>
                <FlatList
                  data={sortedPlanner}
                  keyExtractor={(item) => String(item.subject_id)}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.listContent}
                  renderItem={({ item }) => (
                    <PlannerTableRow
                      item={item}
                      onView={() =>
                        navigation.navigate("SchoolAdminPlannerDetail", {
                          subjectId: item.subject_id,
                        })
                      }
                      onAssignTeacher={(assignItem) =>
                        setAssignTarget({
                          subjectId: assignItem.subject_id,
                          subjectName: assignItem.subject_name,
                          teacherId: assignItem.teacher_id,
                        })
                      }
                      onTeacherPress={(pressedItem) => {
                        if (!pressedItem.teacher_id) return;

                        navigation.navigate("SchoolAdminTeacherDetail", {
                          teacherId: pressedItem.teacher_id,
                        });
                      }}
                    />
                  )}
                />
              </View>
            )}
          </View>
        </View>
      </View>

      <SelectionBottomSheet
        visible={filterVisible}
        title={
          filterType === "class"
            ? "Select Class"
            : filterType === "section"
              ? "Select Section"
              : filterType === "subject"
                ? "Select Subject"
                : filterType === "teacher"
                  ? "Select Teacher"
                  : "Select Academic Year"
        }
        items={
          filterType === "class"
            ? classOptions
            : filterType === "section"
              ? sectionOptions
              : filterType === "subject"
                ? subjectOptions
                : filterType === "teacher"
                  ? teacherOptions
                  : yearOptions
        }
        selectedId={
          (filterType === "class"
            ? selectedClass
            : filterType === "section"
              ? selectedSection
              : filterType === "subject"
                ? selectedSubject
                : filterType === "teacher"
                  ? selectedTeacher
                  : selectedYear) ?? undefined
        }
        onClose={() => setFilterVisible(false)}
        onSelect={(item) => {
          switch (filterType) {
            case "class":
              setSelectedClass(item.id);
              break;
            case "section":
              setSelectedSection(item.id);
              break;
            case "subject":
              setSelectedSubject(item.id);
              break;
            case "teacher":
              setSelectedTeacher(item.id);
              break;
            case "year":
              setSelectedYear(item.id);
              break;
          }
        }}
      />

      <QuickAssignmentModal
        visible={quickAssignmentVisible}
        onClose={() => setQuickAssignmentVisible(false)}
        token={session?.token ?? ""}
        onSuccess={loadPlanner}
      />

      <AssignTeacherModal
        visible={assignTarget !== null}
        subjectId={assignTarget?.subjectId ?? null}
        subjectName={assignTarget?.subjectName ?? ""}
        currentTeacherId={assignTarget?.teacherId ?? null}
        teachers={teachers}
        onClose={() => setAssignTarget(null)}
        onAssigned={() => {
          setAssignTarget(null);
          void loadPlanner();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppTheme.colors.background,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: AppTheme.spacing.l,
    paddingTop: AppTheme.spacing.xl,
  },
  body: {
    flex: 1,
    width: "100%",
    maxWidth: 800,
  },
  headerContainer: {
    paddingBottom: 4,
  },
  listContainer: {
    flex: 1,
  },
  listContainerInner: {
    flex: 1,
    marginTop: 8,
  },
  listContent: {
    paddingBottom: 40,
  },
});

