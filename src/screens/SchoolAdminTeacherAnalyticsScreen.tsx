
import { Platform } from "react-native";
import { CalendarPicker } from "../components/CalendarPicker";
import { FilterSelector } from "../components/FilterSelector";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { RootStackParamList } from "../navigation/AppNavigator";
import { useAuth } from "../context/AuthContext";
import {
  getTeacherAnalytics,
  getTeacherAnalyticsFilters,
  TeacherAnalytics,
  AnalyticsFilters,
} from "../lib/api";
import { SchoolAdminTabBar } from "../components/SchoolAdminTabBar";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<
  RootStackParamList,
  "SchoolAdminTeacherAnalytics"
>;

type FilterState = {
  classId?: number;
  subjectId?: number;
  status?: string;
  semester?: number;
  search: string;
  startDate: string;
  endDate: string;
};

const EMPTY_FILTERS: FilterState = {
  classId: undefined,
  subjectId: undefined,
  status: undefined,
  semester: undefined,
  search: "",
  startDate: "",
  endDate: "",
};

// Formats a Date using its LOCAL year/month/day, unlike toISOString()
// which converts to UTC first and can silently shift the date by a day.
function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function MetricCard({ title, value }: { title: string; value: number }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{Math.round(value)}%</Text>
      <Text style={styles.metricTitle}>{title}</Text>
    </View>
  );
}

export function SchoolAdminTeacherAnalyticsScreen({
  route,
  navigation,
}: Props) {
  const { teacherId } = route.params;
  const { session } = useAuth();

  const [analytics, setAnalytics] = useState<TeacherAnalytics | null>(null);
  const [filters, setFilters] = useState<AnalyticsFilters | null>(null);

  // Filter Selector States
  const [selectedClass, setSelectedClass] = useState<number>();
  const [selectedSubject, setSelectedSubject] = useState<number>();
  const [selectedStatus, setSelectedStatus] = useState<string>();
  const [selectedSemester, setSelectedSemester] = useState<number>();
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // const [showStartPicker, setShowStartPicker] = useState(false);
  // const [showEndPicker, setShowEndPicker] = useState(false);

  const [showStartCalendar, setShowStartCalendar] = useState(false);

  const [showEndCalendar, setShowEndCalendar] = useState(false);

  const [startDateValue, setStartDateValue] = useState<Date | undefined>();
  const [endDateValue, setEndDateValue] = useState<Date | undefined>();

  const [classModalVisible, setClassModalVisible] = useState(false);
  const [subjectModalVisible, setSubjectModalVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [semesterModalVisible, setSemesterModalVisible] = useState(false);

  // Takes the filters to use as an explicit argument instead of reading
  // them off component state. This avoids the stale-closure trap where a
  // button calls `load()` right after `setState(...)`, but `load` was
  // created in the previous render and still has the OLD state baked in.
  const load = useCallback(
    async (activeFilters: FilterState) => {
      if (!session) return;

      try {
        setLoading(true);
        const [analyticsResult, filterResult] = await Promise.all([
          getTeacherAnalytics(session.token, teacherId, {
            classId: activeFilters.classId,
            subjectId: activeFilters.subjectId,
            semester: activeFilters.semester,
            status: activeFilters.status,
            search: activeFilters.search,
            startDate: activeFilters.startDate,
            endDate: activeFilters.endDate,
          }),
          getTeacherAnalyticsFilters(session.token, teacherId),
        ]);

        setAnalytics(analyticsResult);
        setFilters(filterResult);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load analytics.");
      } finally {
        setLoading(false);
      }
    },
    [session, teacherId],
  );

  const currentFilters: FilterState = {
    classId: selectedClass,
    subjectId: selectedSubject,
    status: selectedStatus,
    semester: selectedSemester,
    search: searchQuery,
    startDate,
    endDate,
  };

  useFocusEffect(
    useCallback(() => {
      void load(currentFilters);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load]),
  );

  const handleReset = () => {
    setSelectedClass(undefined);
    setSelectedSubject(undefined);
    setSelectedSemester(undefined);
    setSelectedStatus(undefined);
    setStartDateValue(undefined);
    setEndDateValue(undefined);
    setStartDate("");
    setEndDate("");
    setSearchQuery("");
    // Pass the reset values directly — don't rely on state having
    // updated yet, and don't rely on `load`'s captured closure.
    void load(EMPTY_FILTERS);
  };

  if (loading && !analytics) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </SafeAreaView>
    );
  }

  if (!analytics) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>
          {error ?? "Unable to load analytics."}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          style={styles.backButton}
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate("SchoolAdminTeacherDetail", { teacherId });
            }
          }}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>

        <Text style={styles.title}>Teacher Analytics</Text>
        <Text style={styles.teacherName}>{analytics.teacher_name}</Text>

        {/* Search */}
        <Text style={styles.sectionTitle}>Search</Text>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            placeholder="Search lecture or chapter..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
        </View>

        {/* Filters */}
        <Text style={styles.sectionTitle}>Filters</Text>
        <View style={styles.filterGrid}>
          <FilterSelector
            title="Class"
            placeholder="All Classes"
            value={selectedClass}
            visible={classModalVisible}
            onClose={() => setClassModalVisible((v) => !v)}
            onSelect={(value) => setSelectedClass(value)}
            options={[
              {
                label: "All Classes",
                value: undefined,
              },

              ...(filters?.classes.map((item) => ({
                label: item.name,
                value: item.id,
              })) ?? []),
            ]}
          />

          <FilterSelector
            title="Subject"
            placeholder="All Subjects"
            value={selectedSubject}
            visible={subjectModalVisible}
            onClose={() => setSubjectModalVisible((v) => !v)}
            onSelect={(value) => setSelectedSubject(value)}
            options={[
              {
                label: "All Subjects",
                value: undefined,
              },

              ...(filters?.subjects.map((item) => ({
                label: item.name,
                value: item.id,
              })) ?? []),
            ]}
          />
          <FilterSelector
            title="Status"
            placeholder="All Status"
            value={selectedStatus}
            visible={statusModalVisible}
            onClose={() => setStatusModalVisible((v) => !v)}
            onSelect={(value) => setSelectedStatus(value)}
            options={[
              {
                label: "All Status",
                value: undefined,
              },

              ...(filters?.statuses.map((status) => ({
                label: status.charAt(0).toUpperCase() + status.slice(1),
                value: status,
              })) ?? []),
            ]}
          />

          <FilterSelector
            title="Semester"
            placeholder="All Semesters"
            value={selectedSemester}
            visible={semesterModalVisible}
            onClose={() => setSemesterModalVisible((v) => !v)}
            onSelect={(value) => setSelectedSemester(value)}
            options={[
              {
                label: "All Semesters",
                value: undefined,
              },

              ...(filters?.semesters.map((semester) => ({
                label: `Semester ${semester}`,
                value: semester,
              })) ?? []),
            ]}
          />
        </View>

        {/* Date Fields Range Section */}
        <Text style={styles.sectionTitle}>Date Range</Text>
        <View style={styles.dateRow}>
          {/* <Pressable
            style={styles.dateInput}
            onPress={() => 
              setShowStartPicker(true);
             }
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                flex: 1,
              }}
            >
              <Text
                style={{
                  color: startDate ? colors.textPrimary : colors.textSecondary,
                }}
              >
                {startDate || "From"}
              </Text>

              <Ionicons
                name="calendar-outline"
                size={18}
                color={colors.textSecondary}
              />
            </View>
          </Pressable> */}

          <Pressable
            style={styles.dateInput}
            onPress={() => setShowStartCalendar(true)}
          >
            <View style={styles.dateContent}>
              <Text
                style={{
                  color: startDate ? colors.textPrimary : colors.textSecondary,
                }}
              >
                {startDate || "From"}
              </Text>

              <Ionicons
                name="calendar-outline"
                size={18}
                color={colors.textSecondary}
              />
            </View>
          </Pressable>

          {/* <Pressable
            style={styles.dateInput}
            onPress={() => setShowEndPicker(true)}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                flex: 1,
              }}
            >
              <Text
                style={{
                  color: endDate ? colors.textPrimary : colors.textSecondary,
                }}
              >
                {endDate || "To"}
              </Text>

              <Ionicons
                name="calendar-outline"
                size={18}
                color={colors.textSecondary}
              />
            </View>
          </Pressable> */}

          <Pressable
            style={styles.dateInput}
            onPress={() => setShowEndCalendar(true)}
          >
            <View style={styles.dateContent}>
              <Text
                style={{
                  color: endDate ? colors.textPrimary : colors.textSecondary,
                }}
              >
                {endDate || "To"}
              </Text>

              <Ionicons
                name="calendar-outline"
                size={18}
                color={colors.textSecondary}
              />
            </View>
          </Pressable>
        </View>

        {/* Filter Action Row */}
        <View style={styles.buttonRow}>
          <Pressable style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.resetText}>Reset</Text>
          </Pressable>

          <Pressable
            style={styles.applyButton}
            onPress={() => void load(currentFilters)}
          >
            <Text style={styles.applyText}>Apply Filters</Text>
          </Pressable>
        </View>

        {/* Numerical Overview Indicators */}
        <View style={styles.overviewContainer}>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewValue}>{analytics.total_lectures}</Text>
            <Text style={styles.overviewLabel}>Total Lectures</Text>
          </View>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewValue}>
              {analytics.completed_lectures}
            </Text>
            <Text style={styles.overviewLabel}>Completed</Text>
          </View>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewValue}>
              {analytics.pending_lectures}
            </Text>
            <Text style={styles.overviewLabel}>Pending</Text>
          </View>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewValue}>
              {analytics.failed_lectures}
            </Text>
            <Text style={styles.overviewLabel}>Failed</Text>
          </View>
        </View>

        {/* Performance High/Low Summary Blocks */}
        <Text style={styles.sectionTitle}>Teaching Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              {Math.round(analytics.highest_score)}%
            </Text>
            <Text style={styles.summaryLabel}>Highest Score</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              {Math.round(analytics.lowest_score)}%
            </Text>
            <Text style={styles.summaryLabel}>Lowest Score</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              {Math.round(analytics.average_duration_seconds / 60)} min
            </Text>
            <Text style={styles.summaryLabel}>Average Duration</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              {analytics.total_recording_hours.toFixed(1)} h
            </Text>
            <Text style={styles.summaryLabel}>Teaching Hours</Text>
          </View>
        </View>

        {/* Detailed Criteria Scores */}
        <Text style={styles.sectionTitle}>Performance Metrics</Text>
        <View style={styles.metricsGrid}>
          <MetricCard title="Overall" value={analytics.overall_score} />
          <MetricCard title="Engagement" value={analytics.engagement_score} />
          <MetricCard title="Confidence" value={analytics.confidence_score} />
          <MetricCard title="Clarity" value={analytics.clarity_score} />
          <MetricCard title="Fluency" value={analytics.fluency_score} />
          <MetricCard title="Pace" value={analytics.pace_score} />
          <MetricCard title="Coverage" value={analytics.curriculum_coverage} />
          <MetricCard title="Accuracy" value={analytics.accuracy_score} />
        </View>

        {/* Breakdown by Subject */}
        <Text style={styles.sectionTitle}>Performance by Subject</Text>
        <View style={styles.lectureContainer}>
          {analytics.subject_performance.map((subject) => (
            <View key={subject.subject_id} style={styles.subjectCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.lectureTitle}>{subject.subject_name}</Text>
                <Text style={styles.chapterText}>
                  {subject.lectures} Lectures
                </Text>
              </View>
              <View style={styles.scoreContainer}>
                <Text style={styles.scoreText}>
                  {Math.round(subject.average_score)}%
                </Text>
                <Text style={styles.statusText}>
                  Coverage {Math.round(subject.curriculum_coverage)}%
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Monthly Performance Trends */}
        <Text style={styles.sectionTitle}>Monthly Trends</Text>
        <View style={styles.lectureContainer}>
          {analytics.monthly_performance.map((month) => (
            <View key={month.month} style={styles.subjectCard}>
              <View>
                <Text style={styles.lectureTitle}>{month.month}</Text>
                <Text style={styles.chapterText}>
                  {month.lectures} Lectures
                </Text>
              </View>
              <Text style={styles.scoreText}>
                {Math.round(month.average_score)}%
              </Text>
            </View>
          ))}
        </View>

        {/* Recent Classes Content Cards */}
        <Text style={styles.sectionTitle}>Recent Lectures</Text>
        <View style={styles.lectureContainer}>
          {analytics.recent_lectures.length === 0 ? (
            <Text style={styles.emptyText}>No lectures found.</Text>
          ) : (
            analytics.recent_lectures.map((lecture) => (
              <View key={lecture.recording_id} style={styles.lectureCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lectureTitle}>
                    {lecture.lecture_title ?? "Untitled Lecture"}
                  </Text>
                  <Text style={styles.chapterText}>
                    {lecture.chapter_name ?? "No Chapter"}
                  </Text>
                  <Text style={styles.dateText}>
                    {new Date(lecture.uploaded_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.scoreContainer}>
                  <Text style={styles.scoreText}>
                    {lecture.overall_score !== null
                      ? `${Math.round(lecture.overall_score)}%`
                      : "--"}
                  </Text>
                  <Text style={styles.statusText}>{lecture.status}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <CalendarPicker
        visible={showStartCalendar}
        value={startDateValue}
        onClose={() => setShowStartCalendar(false)}
        onSelect={(date) => {
          if (endDateValue && date > endDateValue) {
            alert("Start date cannot be after the end date.");
            return;
          }
          setStartDateValue(date);
          setStartDate(formatLocalDate(date));
        }}
      />

      <CalendarPicker
        visible={showEndCalendar}
        value={endDateValue}
        onClose={() => setShowEndCalendar(false)}
        onSelect={(date) => {
          if (startDateValue && date < startDateValue) {
            alert("End date cannot be before the start date.");
            return;
          }
          setEndDateValue(date);
          setEndDate(formatLocalDate(date));
        }}
      />

      <SchoolAdminTabBar active="dashboard" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 40,
    gap: 24,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "red",
    fontSize: 16,
  },
  backButton: {
    width: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  teacherName: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  overviewContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 16,
  },
  overviewCard: {
    width: "48%",
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
  },
  overviewValue: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.accent,
  },
  overviewLabel: {
    marginTop: 6,
    fontSize: 14,
    color: colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 16,
  },
  metricCard: {
    width: "48%",
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 22,
    alignItems: "center",
  },
  metricValue: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.accent,
  },
  metricTitle: {
    marginTop: 8,
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  lectureContainer: {
    gap: 14,
  },
  lectureCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  lectureTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  chapterText: {
    marginTop: 4,
    fontSize: 14,
    color: colors.textSecondary,
  },
  dateText: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textSecondary,
  },
  scoreContainer: {
    alignItems: "flex-end",
  },
  scoreText: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.accent,
  },
  statusText: {
    marginTop: 6,
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptyText: {
    textAlign: "center",
    color: colors.textSecondary,
    paddingVertical: 24,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 16,
  },
  summaryCard: {
    width: "48%",
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.accent,
  },
  summaryLabel: {
    marginTop: 6,
    color: colors.textSecondary,
  },
  subjectCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
  },
  filterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 16,
  },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dateInput: {
    width: "48%",
    height: 56,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  resetButton: {
    width: "30%",
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  applyButton: {
    width: "66%",
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  resetText: {
    color: colors.accent,
    fontWeight: "700",
    fontSize: 16,
  },
  applyText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  dateContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flex: 1,
  },
});
