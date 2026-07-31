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
import { PlannerUnifiedFilterSheet, FilterState } from "../components/planner/PlannerUnifiedFilterSheet";
import { QuickAssignmentModal } from "../components/planner/QuickAssignmentModal";
import { AssignTeacherModal } from "../components/AssignTeacherModal";

import { PlannerItemOut, TeacherOut } from "../types/api";
import { getSchoolPlanner, getSchoolAdminTeachers } from "../lib/api";
import { useAuth } from "../context/AuthContext";

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
  const [activeFilters, setActiveFilters] = useState<FilterState>({
    class: null,
    section: null,
    subject: null,
    teacher: null,
    year: null,
  });
  const [showOnlyUnassigned, setShowOnlyUnassigned] = useState(false);

  const [filterVisible, setFilterVisible] = useState(false);
  const [quickAssignmentVisible, setQuickAssignmentVisible] = useState(false);

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

  const classOptions = [...new Set(planner.map((item) => item.class_name))].sort();
  const sectionOptions = [...new Set(planner.map((item) => item.section))].sort();
  const subjectOptions = [...new Set(planner.map((item) => item.subject_name))].sort();
  const teacherOptions = [...new Set(planner.map((item) => item.teacher_name).filter(Boolean))].sort() as string[];
  const yearOptions = [...new Set(planner.map((item) => item.academic_year))].sort();

  const totalUnassigned = planner.filter((item) => !item.teacher_id).length;

  const filteredPlanner = planner.filter((item) => {
    const matchesSearch =
      search.trim() === "" ||
      item.subject_name.toLowerCase().includes(search.toLowerCase()) ||
      item.class_name.toLowerCase().includes(search.toLowerCase()) ||
      (item.teacher_name ?? "").toLowerCase().includes(search.toLowerCase());

    const matchesClass =
      activeFilters.class == null || item.class_name === activeFilters.class;
    const matchesSection =
      activeFilters.section == null || item.section === activeFilters.section;
    const matchesSubject =
      activeFilters.subject == null || item.subject_name === activeFilters.subject;
    const matchesTeacher =
      activeFilters.teacher == null || item.teacher_name === activeFilters.teacher;
    const matchesYear =
      activeFilters.year == null || item.academic_year === activeFilters.year;
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

  const activeFilterCount = Object.values(activeFilters).filter((val) => val !== null).length;

  function renderHeader() {
    return (
      <View style={styles.headerContainer}>
        <PlannerHeader onCreatePress={() => setQuickAssignmentVisible(true)} />

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
          activeFilterCount={activeFilterCount}
          onFilterPress={() => setFilterVisible(true)}
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <AdminNavbar title="Planner" />
      <View style={styles.centerContainer}>
        <View style={styles.body}>
          {loading ? (
            <ActivityIndicator
              size="large"
              color={AppTheme.colors.primary}
              style={{ marginTop: 40 }}
            />
          ) : (
            <FlatList
              data={sortedPlanner}
              keyExtractor={(item) => String(item.subject_id)}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              ListHeaderComponent={renderHeader}
              ListEmptyComponent={<PlannerEmpty />}
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
          )}
        </View>
      </View>

      <PlannerUnifiedFilterSheet
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        options={{
          classOptions,
          sectionOptions,
          subjectOptions,
          teacherOptions,
          yearOptions,
        }}
        activeFilters={activeFilters}
        onApply={setActiveFilters}
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
  listContent: {
    paddingBottom: 40,
  },
});

