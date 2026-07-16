import { useEffect, useState } from "react";
import { StyleSheet, View, ActivityIndicator, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { colors } from "../theme/colors";
import { RootStackParamList } from "../navigation/AppNavigator";
import { PlannerHeader } from "../components/planner/PlannerHeader";
import { PlannerFilters } from "../components/planner/PlannerFilters";
import { PlannerTableHeader } from "../components/planner/PlannerTableHeader";
import { PlannerTableRow } from "../components/planner/PlannerTableRow";
import { PlannerEmpty } from "../components/planner/PlannerEmpty";
import { PlannerToolbar } from "../components/planner/PlannerToolbar";
import { PlannerFilterModal } from "../components/planner/PlannerFilterModal";
import { QuickAssignmentModal } from "../components/planner/QuickAssignmentModal";

import { PlannerItemOut } from "../types/api";
import { getSchoolPlanner } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export function SchoolAdminPlannerScreen() {
  const { session } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [planner, setPlanner] = useState<PlannerItemOut[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);

  const [filterVisible, setFilterVisible] = useState(false);
  const [quickAssignmentVisible, setQuickAssignmentVisible] = useState(false);
  const [filterType, setFilterType] = useState<
    "class" | "subject" | "teacher" | "year" | null
  >(null);

  useEffect(() => {
    loadPlanner();
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

  const classOptions = [
    ...new Set(planner.map((item) => item.class_name)),
  ].sort();
  const subjectOptions = [
    ...new Set(planner.map((item) => item.subject_name)),
  ].sort();
  const teacherOptions = [
    ...new Set(planner.map((item) => item.teacher_name).filter(Boolean)),
  ].sort();
  const yearOptions = [
    ...new Set(planner.map((item) => item.academic_year)),
  ].sort();

  const filteredPlanner = planner.filter((item) => {
    const matchesSearch =
      search.trim() === "" ||
      item.subject_name.toLowerCase().includes(search.toLowerCase()) ||
      item.class_name.toLowerCase().includes(search.toLowerCase()) ||
      (item.teacher_name ?? "").toLowerCase().includes(search.toLowerCase());

    const matchesClass =
      selectedClass == null || item.class_name === selectedClass;
    const matchesSubject =
      selectedSubject == null || item.subject_name === selectedSubject;
    const matchesTeacher =
      selectedTeacher == null || item.teacher_name === selectedTeacher;
    const matchesYear =
      selectedYear == null || item.academic_year === selectedYear;

    return (
      matchesSearch &&
      matchesClass &&
      matchesSubject &&
      matchesTeacher &&
      matchesYear
    );
  });

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {/* Top Controls Stay Fixed Above the List */}
      <View style={styles.headerContainer}>
        <PlannerHeader onCreatePress={() => {}} />

        <PlannerFilters
          search={search}
          onSearchChange={setSearch}
          selectedClass={selectedClass}
          selectedSubject={selectedSubject}
          selectedTeacher={selectedTeacher}
          selectedYear={selectedYear}
          onClassPress={() => {
            setFilterType("class");
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
          onSelectedSubjectClear={() => setSelectedSubject(null)}
          onSelectedTeacherClear={() => setSelectedTeacher(null)}
          onSelectedYearClear={() => setSelectedYear(null)}
        />

        <PlannerToolbar
          onQuickAssignment={() => setQuickAssignmentVisible(true)}
        />
      </View>

      {/* Dynamic Data Table Area takes remaining space */}
      <View style={styles.tableContainer}>
        {loading ? (
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{ marginTop: 40 }}
          />
        ) : filteredPlanner.length === 0 ? (
          <PlannerEmpty />
        ) : (
          <View style={styles.tableCard}>
            <FlatList
              data={filteredPlanner}
              keyExtractor={(item) => item.subject_id.toString()}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={<PlannerTableHeader />}
              stickyHeaderIndices={[0]}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <PlannerTableRow
                  item={item}
                  onView={() =>
                    navigation.navigate("SchoolAdminPlannerDetail", {
                      subjectId: item.subject_id,
                    })
                  }
                  onTeacherPress={(plannerItem) => {
                    if (!plannerItem.teacher_id) return;

                    navigation.navigate("SchoolAdminTeacherDetail", {
                      teacherId: plannerItem.teacher_id,
                    });
                  }}
                />
              )}
            />
          </View>
        )}
      </View>

      <PlannerFilterModal
        visible={filterVisible}
        title={
          filterType === "class"
            ? "Class"
            : filterType === "subject"
              ? "Subject"
              : filterType === "teacher"
                ? "Teacher"
                : "Academic Year"
        }
        options={
          filterType === "class"
            ? classOptions
            : filterType === "subject"
              ? subjectOptions
              : filterType === "teacher"
                ? teacherOptions
                : yearOptions
        }
        selected={
          filterType === "class"
            ? selectedClass
            : filterType === "subject"
              ? selectedSubject
              : filterType === "teacher"
                ? selectedTeacher
                : selectedYear
        }
        onClose={() => setFilterVisible(false)}
        onSelect={(value) => {
          switch (filterType) {
            case "class":
              setSelectedClass(value);
              break;
            case "subject":
              setSelectedSubject(value);
              break;
            case "teacher":
              setSelectedTeacher(value);
              break;
            case "year":
              setSelectedYear(value);
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  tableContainer: {
    flex: 1, // Crucial: Allows FlatList container to bound and scale perfectly
    paddingHorizontal: 20,
  },
  listContent: {
    paddingBottom: 40, // Ensures safe scrolling distance at the bottom of the list
  },
  tableCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
});
