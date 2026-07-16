import { CalendarPicker } from "../components/CalendarPicker";
import { Image } from "react-native";
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
  TeacherProfile,
  getTeacherProfile,
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

function MetricCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricTopRow}>
        <View style={styles.metricIcon}>
          <Ionicons name={icon} size={20} color={colors.accent} />
        </View>

        <Text style={styles.metricValue}>{Math.round(value)}%</Text>
      </View>

      <Text style={styles.metricTitle}>{title}</Text>

      <View style={styles.metricProgressTrack}>
        <View
          style={[
            styles.metricProgressFill,
            {
              width: `${Math.min(value, 100)}%`,
            },
          ]}
        />
      </View>
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
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(
    null,
  );
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
        const [analyticsResult, filterResult, profileResult] =
          await Promise.all([
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

            getTeacherProfile(session.token, teacherId),
          ]);

        setTeacherProfile(profileResult);
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

  const performanceMetrics = [
    {
      title: "Overall Score",
      value: analytics.overall_score,
      icon: "analytics-outline",
      color: "#2563EB",
      background: "#EEF5FF",
    },
    {
      title: "Engagement",
      value: analytics.engagement_score,
      icon: "people-outline",
      color: "#16A34A",
      background: "#ECFDF5",
    },
    {
      title: "Clarity",
      value: analytics.clarity_score,
      icon: "chatbubble-ellipses-outline",
      color: "#7C3AED",
      background: "#F3E8FF",
    },
    {
      title: "Fluency",
      value: analytics.fluency_score,
      icon: "mic-outline",
      color: "#EA580C",
      background: "#FFF7ED",
    },
    {
      title: "Pace",
      value: analytics.pace_score,
      icon: "speedometer-outline",
      color: "#0891B2",
      background: "#ECFEFF",
    },
    {
      title: "Accuracy",
      value: analytics.accuracy_score,
      icon: "checkmark-circle-outline",
      color: "#059669",
      background: "#ECFDF5",
    },
    {
      title: "Coverage",
      value: analytics.curriculum_coverage,
      icon: "book-outline",
      color: "#4F46E5",
      background: "#EEF2FF",
    },
    {
      title: "Confidence",
      value: analytics.confidence_score,
      icon: "shield-checkmark-outline",
      color: "#DB2777",
      background: "#FDF2F8",
    },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              navigation.goBack();
            }}
            style={styles.headerButton}
          >
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={styles.pageTitle}>Teacher Analytics</Text>

            <Text style={styles.pageSubtitle}>
              Track performance, engagement & AI-powered teaching insights.
            </Text>
          </View>

          <Pressable style={styles.headerButton}>
            <Ionicons
              name="calendar-outline"
              size={22}
              color={colors.textPrimary}
            />
          </Pressable>
        </View>

        {/* HERO CARD (KEPT ABOVE THE FILTER CARD) */}
        <View style={styles.analyticsHeroCard}>
          {/* Left Side */}
          <View style={styles.teacherSection}>
            <View style={styles.avatarWrapper}>
              {teacherProfile?.profile_image_url ? (
                <Image
                  source={{ uri: teacherProfile.profile_image_url }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatar}>
                  <Ionicons name="person" size={52} color="#fff" />
                </View>
              )}
            </View>

            <View style={styles.teacherInfo}>
              <Text style={styles.teacherName}>{teacherProfile?.name}</Text>

              <View style={styles.teacherBadge}>
                <Ionicons name="school-outline" size={16} color="#2563EB" />

                <Text style={styles.teacherBadgeText}>Teacher</Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={colors.textSecondary}
                />

                <Text style={styles.infoText}>{teacherProfile?.email}</Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={colors.textSecondary}
                />

                <Text style={styles.infoText}>
                  Assigned{" "}
                  {teacherProfile?.assigned_at
                    ? new Date(teacherProfile.assigned_at).toLocaleDateString()
                    : "-"}
                </Text>
              </View>
            </View>
          </View>

          {/* <View style={styles.heroDivider} /> */}

          <View style={styles.analyticsMetrics}>
            {/* Overall Score */}
            <View style={styles.kpiCard}>
              <View
                style={[
                  styles.kpiIconContainer,
                  { backgroundColor: "#EEF4FF" },
                ]}
              >
                <Ionicons name="bar-chart-outline" size={22} color="#2563EB" />
              </View>

              <Text style={styles.kpiValue}>
                {Math.round(analytics.overall_score)}%
              </Text>

              <Text style={styles.kpiTitle}>Overall Score</Text>

              <View style={styles.kpiProgressBackground}>
                <View
                  style={[
                    styles.kpiProgressFill,
                    {
                      width: `${Math.min(analytics.overall_score, 100)}%`,
                      backgroundColor: "#2563EB",
                    },
                  ]}
                />
              </View>
            </View>

            {/* Teaching Hours */}
            <View style={styles.kpiCard}>
              <View
                style={[
                  styles.kpiIconContainer,
                  { backgroundColor: "#ECFDF5" },
                ]}
              >
                <Ionicons name="time-outline" size={22} color="#22C55E" />
              </View>

              <Text style={styles.kpiValue}>
                {analytics.total_recording_hours.toFixed(1)} h
              </Text>

              <Text style={styles.kpiTitle}>Teaching Hours</Text>

              <View style={styles.kpiProgressBackground}>
                <View
                  style={[
                    styles.kpiProgressFill,
                    {
                      // Set to 100% or adjust dynamically based on your target goal
                      width: "100%",
                      backgroundColor: "#22C55E",
                    },
                  ]}
                />
              </View>
            </View>

            {/* Average Duration */}
            <View style={styles.kpiCard}>
              <View
                style={[
                  styles.kpiIconContainer,
                  { backgroundColor: "#F3E8FF" },
                ]}
              >
                <Ionicons name="stopwatch-outline" size={22} color="#9333EA" />
              </View>

              <Text style={styles.kpiValue}>
                {Math.round(analytics.average_duration_seconds / 60)} min
              </Text>

              <Text style={styles.kpiTitle}>Avg Duration</Text>

              <View style={styles.kpiProgressBackground}>
                <View
                  style={[
                    styles.kpiProgressFill,
                    {
                      // Set to 100% or adjust dynamically based on your target goal
                      width: "100%",
                      backgroundColor: "#9333EA",
                    },
                  ]}
                />
              </View>
            </View>

            {/* Curriculum Coverage */}
            <View style={styles.kpiCard}>
              <View
                style={[
                  styles.kpiIconContainer,
                  { backgroundColor: "#FFF7ED" },
                ]}
              >
                <Ionicons name="book-outline" size={22} color="#F97316" />
              </View>

              <Text style={styles.kpiValue}>
                {Math.round(analytics.curriculum_coverage)}%
              </Text>

              <Text style={styles.kpiTitle}>Coverage</Text>

              <View style={styles.kpiProgressBackground}>
                <View
                  style={[
                    styles.kpiProgressFill,
                    {
                      width: `${Math.min(analytics.curriculum_coverage, 100)}%`,
                      backgroundColor: "#F97316",
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        </View>

        {/* SEARCH AND FILTERS */}
        {/* <View style={styles.filterCard}> */}

        <View style={styles.searchCard}>
          <View style={styles.searchHeader}>
            <View style={styles.searchHeaderLeft}>
              <View style={styles.searchHeaderIcon}>
                <Ionicons
                  name="search-outline"
                  size={20}
                  color={colors.accent}
                />
              </View>

              <Text style={styles.searchTitle}>Search & Filters</Text>
            </View>

            <Pressable onPress={handleReset}>
              <Text style={styles.clearAllText}>Clear All</Text>
            </Pressable>
          </View>

          {/* Search */}
          <View style={styles.searchInputContainer}>
            <Ionicons
              name="search-outline"
              size={22}
              color={colors.textSecondary}
            />

            <TextInput
              style={styles.searchInput}
              placeholder="Search by lecture title, chapter or topic..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Filters */}
          <View style={styles.filterGrid}>
            <View style={styles.filterItem}>
              <FilterSelector
                title="Class"
                placeholder="All Classes"
                value={selectedClass}
                visible={classModalVisible}
                onClose={() => setClassModalVisible((v) => !v)}
                onSelect={(value) => setSelectedClass(value)}
                options={[
                  { label: "All Classes", value: undefined },
                  ...(filters?.classes.map((item) => ({
                    label: item.name,
                    value: item.id,
                  })) ?? []),
                ]}
              />
            </View>

            <View style={styles.filterItem}>
              <FilterSelector
                title="Subject"
                placeholder="All Subjects"
                value={selectedSubject}
                visible={subjectModalVisible}
                onClose={() => setSubjectModalVisible((v) => !v)}
                onSelect={(value) => setSelectedSubject(value)}
                options={[
                  { label: "All Subjects", value: undefined },
                  ...(filters?.subjects.map((item) => ({
                    label: item.name,
                    value: item.id,
                  })) ?? []),
                ]}
              />
            </View>

            <View style={styles.filterItem}>
              <FilterSelector
                title="Status"
                placeholder="All Status"
                value={selectedStatus}
                visible={statusModalVisible}
                onClose={() => setStatusModalVisible((v) => !v)}
                onSelect={(value) => setSelectedStatus(value)}
                options={[
                  { label: "All Status", value: undefined },
                  ...(filters?.statuses.map((status) => ({
                    label: status.charAt(0).toUpperCase() + status.slice(1),
                    value: status,
                  })) ?? []),
                ]}
              />
            </View>

            <View style={styles.filterItem}>
              <FilterSelector
                title="Semester"
                placeholder="All Semesters"
                value={selectedSemester}
                visible={semesterModalVisible}
                onClose={() => setSemesterModalVisible((v) => !v)}
                onSelect={(value) => setSelectedSemester(value)}
                options={[
                  { label: "All Semesters", value: undefined },
                  ...(filters?.semesters.map((semester) => ({
                    label: `Semester ${semester}`,
                    value: semester,
                  })) ?? []),
                ]}
              />
            </View>
          </View>

          {/* Date */}
          <View style={styles.dateRow}>
            <Pressable
              style={styles.dateInput}
              onPress={() => setShowStartCalendar(true)}
            >
              <Text
                style={startDate ? styles.dateValue : styles.datePlaceholder}
              >
                {startDate || "From"}
              </Text>

              <Ionicons
                name="calendar-outline"
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>

            <Pressable
              style={styles.dateInput}
              onPress={() => setShowEndCalendar(true)}
            >
              <Text style={endDate ? styles.dateValue : styles.datePlaceholder}>
                {endDate || "To"}
              </Text>

              <Ionicons
                name="calendar-outline"
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <Pressable style={styles.resetButton} onPress={handleReset}>
              <Ionicons
                name="refresh-outline"
                size={18}
                color={colors.accent}
              />
              <Text style={styles.resetText}>Reset</Text>
            </Pressable>

            <Pressable
              style={styles.applyButton}
              onPress={() => void load(currentFilters)}
            >
              <Ionicons name="filter-outline" size={18} color="#fff" />
              <Text style={styles.applyText}>Apply Filters</Text>
            </Pressable>
          </View>
        </View>

        {/* Performance High/Low Summary Blocks */}
        <View style={styles.sectionHeader}>
          <Ionicons name="bar-chart-outline" size={22} color={colors.accent} />

          <Text style={styles.sectionTitle}>Teaching Summary</Text>
        </View>

        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { backgroundColor: "#EEF4FF" }]}>
            <View style={[styles.summaryIcon, { backgroundColor: "#DBEAFE" }]}>
              <Ionicons name="trophy-outline" size={24} color="#2563EB" />
            </View>

            <Text style={styles.summaryValue}>
              {Math.round(analytics.highest_score)}%
            </Text>

            <Text style={styles.summaryTitle}>Highest Score</Text>

            <Text style={styles.summarySubtitle}>Excellent</Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: "#FEF3C7" }]}>
            <View style={[styles.summaryIcon, { backgroundColor: "#FDE68A" }]}>
              <Ionicons
                name="trending-down-outline"
                size={24}
                color="#D97706"
              />
            </View>

            <Text style={styles.summaryValue}>
              {Math.round(analytics.lowest_score)}%
            </Text>

            <Text style={styles.summaryTitle}>Lowest Score</Text>

            <Text style={styles.summarySubtitle}>Needs Attention</Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: "#ECFDF5" }]}>
            <View style={[styles.summaryIcon, { backgroundColor: "#BBF7D0" }]}>
              <Ionicons name="time-outline" size={24} color="#16A34A" />
            </View>

            <Text style={styles.summaryValue}>
              {Math.round(analytics.average_duration_seconds / 60)} min
            </Text>

            <Text style={styles.summaryTitle}>Avg Duration</Text>

            <Text style={styles.summarySubtitle}>Per Lecture</Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: "#F3E8FF" }]}>
            <View style={[styles.summaryIcon, { backgroundColor: "#DDD6FE" }]}>
              <Ionicons name="book-outline" size={24} color="#7C3AED" />
            </View>

            <Text style={styles.summaryValue}>
              {analytics.total_recording_hours.toFixed(1)} h
            </Text>

            <Text style={styles.summaryTitle}>Teaching Hours</Text>

            <Text style={styles.summarySubtitle}>Total Recorded</Text>
          </View>
        </View>

        {/* Detailed Criteria Scores */}
        <View style={styles.sectionHeader}>
          <Ionicons
            name="stats-chart-outline"
            size={22}
            color={colors.accent}
          />

          <Text style={styles.sectionTitle}>Performance Metrics</Text>
        </View>
        {/* <View style={styles.metricsGrid}>
          <MetricCard
            title="Overall"
            value={analytics.overall_score}
            icon="stats-chart"
          />
          <MetricCard
            title="Engagement"
            value={analytics.engagement_score}
            icon="chatbubble-ellipses"
          />
          <MetricCard
            title="Confidence"
            value={analytics.confidence_score}
            icon="trophy"
          />
          <MetricCard
            title="Clarity"
            value={analytics.clarity_score}
            icon="mic"
          />
          <MetricCard
            title="Fluency"
            value={analytics.fluency_score}
            icon="mic"
          />
          <MetricCard title="Pace" value={analytics.pace_score} icon="flash" />
          <MetricCard
            title="Coverage"
            value={analytics.curriculum_coverage}
            icon="book"
          />
          <MetricCard
            title="Accuracy"
            value={analytics.accuracy_score}
            icon="checkmark-circle"
          />
        </View> */}

        <View style={styles.metricsGrid}>
          {performanceMetrics.map((metric) => (
            <View key={metric.title} style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <View
                  style={[
                    styles.metricIcon,
                    {
                      backgroundColor: metric.background,
                    },
                  ]}
                >
                  <Ionicons
                    name={metric.icon as any}
                    size={22}
                    color={metric.color}
                  />
                </View>

                <Text
                  style={[
                    styles.metricPercentage,
                    {
                      color: metric.color,
                    },
                  ]}
                >
                  {Math.round(metric.value)}%
                </Text>
              </View>

              <Text style={styles.metricTitle}>{metric.title}</Text>

              <View style={styles.metricProgressTrack}>
                <View
                  style={[
                    styles.metricProgressFill,
                    {
                      width: `${Math.min(metric.value, 100)}%`,
                      backgroundColor: metric.color,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>

        {/* Breakdown by Subject */}
        <View style={styles.sectionHeader}>
          <Ionicons name="book-outline" size={22} color={colors.accent} />

          <Text style={styles.sectionTitle}>Performance by Subject</Text>
        </View>
        <View style={styles.lectureContainer}>
          {analytics.subject_performance.map((subject) => (
            // <View key={subject.subject_id} style={styles.subjectAnalyticsCard}>
            //   <View style={styles.subjectTopRow}>
            //     <View style={styles.subjectIcon}>
            //       <Ionicons
            //         name="book-outline"
            //         size={22}
            //         color={colors.accent}
            //       />
            //     </View>

            //     <View style={{ flex: 1 }}>
            //       <Text style={styles.subjectName}>{subject.subject_name}</Text>

            //       <Text style={styles.subjectLectureCount}>
            //         {subject.lectures} Lectures
            //       </Text>
            //     </View>

            //     <Text style={styles.subjectScore}>
            //       {Math.round(subject.average_score)}%
            //     </Text>
            //   </View>

            //   <View style={styles.progressBackground}>
            //     <View
            //       style={[
            //         styles.progressFill,
            //         {
            //           width: `${Math.min(subject.average_score, 100)}%`,
            //         },
            //       ]}
            //     />
            //   </View>

            //   <View style={styles.subjectBottomRow}>
            //     <View style={styles.subjectInfo}>
            //       <Ionicons
            //         name="videocam-outline"
            //         size={16}
            //         color={colors.textSecondary}
            //       />

            //       <Text style={styles.subjectInfoText}>
            //         {subject.lectures} Recorded
            //       </Text>
            //     </View>

            //     <View style={styles.subjectInfo}>
            //       <Ionicons
            //         name="library-outline"
            //         size={16}
            //         color={colors.textSecondary}
            //       />

            //       <Text style={styles.subjectInfoText}>
            //         {Math.round(subject.curriculum_coverage)}% Coverage
            //       </Text>
            //     </View>
            //   </View>
            // </View>

            <View key={subject.subject_id} style={styles.subjectCard}>
              <View style={styles.subjectHeader}>
                <View style={styles.subjectHeaderLeft}>
                  <View style={styles.subjectIcon}>
                    <Ionicons
                      name="book-outline"
                      size={20}
                      color={colors.accent}
                    />
                  </View>

                  <View>
                    <Text style={styles.subjectName}>
                      {subject.subject_name}
                    </Text>

                    {/* <Text style={styles.subjectSubtitle}>
                      {subject.total_lectures} Lecture
                      {subject.total_lectures !== 1 ? "s" : ""}
                    </Text> */}
                  </View>
                </View>

                <View style={styles.subjectBadge}>
                  <Text style={styles.subjectBadgeText}>
                    {Math.round(subject.average_score)}%
                  </Text>
                </View>
              </View>

              <View style={styles.subjectProgressTrack}>
                <View
                  style={[
                    styles.subjectProgressFill,
                    {
                      width: `${Math.min(subject.average_score, 100)}%`,
                    },
                  ]}
                />
              </View>

              <View style={styles.subjectFooter}>
                <View style={styles.subjectFooterItem}>
                  <Ionicons
                    name="videocam-outline"
                    size={16}
                    color={colors.textSecondary}
                  />

                  <Text style={styles.subjectFooterText}>Recorded</Text>
                </View>

                <View style={styles.subjectFooterItem}>
                  <Ionicons name="star" size={16} color="#F59E0B" />

                  <Text style={styles.subjectFooterText}>
                    {subject.average_score >= 90
                      ? "Excellent"
                      : subject.average_score >= 80
                        ? "Very Good"
                        : subject.average_score >= 70
                          ? "Good"
                          : "Needs Work"}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Monthly Performance Trends */}
        <View style={styles.sectionHeader}>
          <Ionicons
            name="trending-up-outline"
            size={22}
            color={colors.accent}
          />

          <Text style={styles.sectionTitle}>Monthly Trends</Text>
        </View>
        {/* <View style={styles.lectureContainer}>
          {analytics.monthly_performance.map((month) => (
            <View key={month.month} style={styles.monthCard}>
              <View style={styles.monthTopRow}>
                <View style={styles.monthIcon}>
                  <Ionicons
                    name="calendar-outline"
                    size={22}
                    color={colors.accent}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.monthTitle}>{month.month}</Text>

                  <Text style={styles.monthSubtitle}>
                    {month.lectures} Lecture{month.lectures !== 1 ? "s" : ""}
                  </Text>
                </View>

                <Text style={styles.monthScore}>
                  {Math.round(month.average_score)}%
                </Text>
              </View>

              <View style={styles.progressBackground}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(month.average_score, 100)}%`,
                    },
                  ]}
                />
              </View>

              <View style={styles.monthBottomRow}>
                <View style={styles.subjectInfo}>
                  <Ionicons
                    name="videocam-outline"
                    size={16}
                    color={colors.textSecondary}
                  />

                  <Text style={styles.subjectInfoText}>
                    {month.lectures} Recorded
                  </Text>
                </View>

                <Text style={styles.monthAverage}>Avg Score</Text>
              </View>
            </View>
          ))}
        </View> */}

        <View style={styles.monthGrid}>
          {analytics.monthly_performance.map((month) => (
            <View key={month.month} style={styles.monthCard}>
              <View style={styles.monthHeader}>
                <View style={styles.monthIcon}>
                  <Ionicons
                    name="trending-up-outline"
                    size={20}
                    color={colors.accent}
                  />
                </View>

                <Text style={styles.monthScore}>
                  {Math.round(month.average_score)}%
                </Text>
              </View>

              <Text style={styles.monthName}>{month.month}</Text>

              <Text style={styles.monthLecture}>{month.lectures} Lectures</Text>

              <View style={styles.monthProgressBackground}>
                <View
                  style={[
                    styles.monthProgressFill,
                    {
                      width: `${Math.min(month.average_score, 100)}%`,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>

        {/* Recent Classes Content Cards */}
        <View style={styles.sectionHeader}>
          <Ionicons name="videocam-outline" size={22} color={colors.accent} />

          <Text style={styles.sectionTitle}>Recent Lectures</Text>
        </View>
        <View style={styles.lectureContainer}>
          {analytics.recent_lectures.length === 0 ? (
            <Text style={styles.emptyText}>No lectures found.</Text>
          ) : (
            analytics.recent_lectures.map((lecture) => (
              // <Pressable
              //   key={lecture.recording_id}
              //   style={styles.modernLectureCard}
              // >
              //   <View style={styles.lectureHeader}>
              //     <View style={styles.lectureIcon}>
              //       <Ionicons name="videocam" size={22} color={colors.accent} />
              //     </View>

              //     <View style={{ flex: 1 }}>
              //       <Text style={styles.modernLectureTitle}>
              //         {lecture.lecture_title ?? "Untitled Lecture"}
              //       </Text>

              //       <Text style={styles.modernLectureSubtitle}>
              //         {lecture.chapter_name ?? "No Chapter"}
              //       </Text>
              //     </View>

              //     <View
              //       style={[
              //         styles.statusBadge,
              //         {
              //           backgroundColor:
              //             lecture.status === "completed"
              //               ? "#DCFCE7"
              //               : lecture.status === "pending"
              //                 ? "#FEF3C7"
              //                 : "#FEE2E2",
              //         },
              //       ]}
              //     >
              //       <Text style={styles.statusBadgeText}>{lecture.status}</Text>
              //     </View>
              //   </View>

              //   <View style={styles.progressBackground}>
              //     <View
              //       style={[
              //         styles.progressFill,
              //         {
              //           width: `${
              //             lecture.overall_score
              //               ? Math.min(lecture.overall_score, 100)
              //               : 0
              //           }%`,
              //         },
              //       ]}
              //     />
              //   </View>

              //   <View style={styles.lectureFooter}>
              //     <View>
              //       <Text style={styles.footerLabel}>Uploaded</Text>

              //       <Text style={styles.footerValue}>
              //         {new Date(lecture.uploaded_at).toLocaleDateString()}
              //       </Text>
              //     </View>

              //     <View style={styles.scoreBadge}>
              //       <Text style={styles.scoreBadgeValue}>
              //         {lecture.overall_score
              //           ? `${Math.round(lecture.overall_score)}%`
              //           : "--"}
              //       </Text>
              //     </View>
              //   </View>
              // </Pressable>

              <View key={lecture.recording_id} style={styles.lectureCard}>
                {/* Top */}

                <View style={styles.lectureTopRow}>
                  <View style={styles.lectureLeft}>
                    <View style={styles.lectureIcon}>
                      <Ionicons
                        name="videocam-outline"
                        size={20}
                        color={colors.accent}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={styles.lectureTitle}>
                        {lecture.lecture_title || "Untitled Lecture"}
                      </Text>

                      <Text style={styles.lectureChapter}>
                        {lecture.chapter_name || "No Chapter"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.scoreBadge}>
                    <Text style={styles.scoreBadgeText}>
                      {lecture.overall_score
                        ? `${Math.round(lecture.overall_score)}%`
                        : "--"}
                    </Text>
                  </View>
                </View>

                {/* Progress */}

                {lecture.overall_score && (
                  <View style={styles.lectureProgressTrack}>
                    <View
                      style={[
                        styles.lectureProgressFill,
                        {
                          width: `${Math.min(lecture.overall_score, 100)}%`,
                        },
                      ]}
                    />
                  </View>
                )}

                {/* Bottom */}

                <View style={styles.lectureBottomRow}>
                  <View style={styles.metaItem}>
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color={colors.textSecondary}
                    />

                    <Text style={styles.metaText}>
                      {new Date(lecture.uploaded_at).toLocaleDateString()}
                    </Text>
                  </View>

                  <View style={styles.metaItem}>
                    <Ionicons
                      name="time-outline"
                      size={16}
                      color={colors.textSecondary}
                    />

                    {/* <Text style={styles.metaText}>
                      {lecture.duration_seconds
                        ? `${Math.round(lecture.duration_seconds / 60)} min`
                        : "--"}
                    </Text> */}
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      lecture.status === "completed"
                        ? styles.completedBadge
                        : lecture.status === "processing"
                          ? styles.processingBadge
                          : lecture.status === "failed"
                            ? styles.failedBadge
                            : styles.pendingBadge,
                    ]}
                  >
                    <Text style={styles.statusText}>{lecture.status}</Text>
                  </View>
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
  // Layout
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 32,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // Header
  backButton: {
    width: 40,
  },
  heroHeader: {
    marginBottom: 18,
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 16,
    color: colors.textSecondary,
  },
  analyticsProfile: {
    width: 220,
    justifyContent: "center",
  },
  avatarContainer: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "#EEF5FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 20,
  },
  profileName: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
  },

  // KPI Cards
  analyticsMetrics: {
    flex: 2.6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "stretch",
  },
  kpiLabel: {
    marginTop: 6,
    fontSize: 14,
    color: colors.textSecondary,
  },

  // Filter Card
  filterCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 20,
    gap: 20,
  },
  filterHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  filterTitle: {
    marginLeft: 10,
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    paddingHorizontal: 18,
    height: 58,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  // searchInput: {
  //   flex: 1,
  //   marginLeft: 10,
  //   fontSize: 16,
  //   color: colors.textPrimary,
  // },
  // dateRow: {
  //   flexDirection: "row",
  //   justifyContent: "space-between",
  //   marginTop: 4,
  // },
  // dateInput: {
  //   width: "48%",
  //   height: 56,
  //   backgroundColor: colors.surface,
  //   borderRadius: 14,
  //   paddingHorizontal: 16,
  //   borderWidth: 1,
  //   borderColor: "#E5E7EB",
  //   justifyContent: "center",
  // },
  dateContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flex: 1,
  },
  // buttonRow: {
  //   flexDirection: "row",
  //   justifyContent: "space-between",
  //   marginTop: 6,
  // },
  // resetButton: {
  //   flex: 1,

  //   height: 54,

  //   borderRadius: 16,

  //   borderWidth: 2,

  //   borderColor: colors.accent,

  //   justifyContent: "center",

  //   alignItems: "center",

  //   backgroundColor: "#fff",
  // },
  // applyButton: {
  //   flex: 1,

  //   height: 54,

  //   borderRadius: 16,

  //   justifyContent: "center",

  //   alignItems: "center",

  //   backgroundColor: colors.accent,
  // },
  // applyText: {
  //   color: "#fff",
  //   fontWeight: "700",
  //   fontSize: 16,
  // },
  // resetText: {
  //   color: colors.accent,
  //   fontWeight: "700",
  //   fontSize: 16,
  // },

  // Summary
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 16,
  },
  // searchCard: {
  //   backgroundColor: colors.surface,

  //   borderRadius: 24,

  //   padding: 24,

  //   marginTop: 24,

  //   shadowColor: "#000",

  //   shadowOpacity: 0.05,

  //   shadowRadius: 10,

  //   shadowOffset: {
  //     width: 0,
  //     height: 4,
  //   },

  //   elevation: 4,
  // },
  // searchHeader: {
  //   flexDirection: "row",

  //   justifyContent: "space-between",

  //   alignItems: "center",
  // },

  // searchHeaderLeft: {
  //   flexDirection: "row",

  //   alignItems: "center",
  // },

  // searchHeaderIcon: {
  //   width: 42,

  //   height: 42,

  //   borderRadius: 12,

  //   backgroundColor: "#EEF5FF",

  //   justifyContent: "center",

  //   alignItems: "center",

  //   marginRight: 14,
  // },

  // searchTitle: {
  //   fontSize: 24,

  //   fontWeight: "800",

  //   color: colors.textPrimary,
  // },

  advancedButton: {
    flexDirection: "row",

    alignItems: "center",

    backgroundColor: "#EEF5FF",

    borderRadius: 14,

    paddingHorizontal: 18,

    paddingVertical: 12,
  },

  advancedText: {
    marginLeft: 8,

    fontWeight: "700",

    color: colors.accent,
  },

  summaryLabel: {
    marginTop: 6,
    color: colors.textSecondary,
  },

  // Metrics
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
  },

  // metricHeader: {
  //   flexDirection: "row",
  //   alignItems: "center",
  // },

  progressBackground: {
    marginTop: 14,
    height: 8,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },
  progressFill: {
    height: 8,
    borderRadius: 8,
    backgroundColor: colors.accent,
  },

  // Subject
  // subjectCard: {
  //   flexDirection: "row",
  //   justifyContent: "space-between",
  //   alignItems: "center",
  //   backgroundColor: colors.surface,
  //   borderRadius: 16,
  //   padding: 16,
  // },
  subjectAnalyticsCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
  },
  subjectTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  // subjectIcon: {
  //   width: 44,
  //   height: 44,
  //   borderRadius: 22,
  //   backgroundColor: "#EEF5FF",
  //   justifyContent: "center",
  //   alignItems: "center",
  //   marginRight: 14,
  // },
  // subjectName: {
  //   fontSize: 18,
  //   fontWeight: "700",
  //   color: colors.textPrimary,
  // },
  subjectLectureCount: {
    marginTop: 4,
    color: colors.textSecondary,
  },
  subjectScore: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.accent,
  },
  subjectBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  subjectInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  subjectInfoText: {
    marginLeft: 6,
    color: colors.textSecondary,
  },

  // Lecture
  lectureContainer: {
    gap: 14,
  },
  modernLectureCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
  },
  lectureHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  // lectureIcon: {
  //   width: 46,
  //   height: 46,
  //   borderRadius: 23,
  //   backgroundColor: "#EEF5FF",
  //   justifyContent: "center",
  //   alignItems: "center",
  //   marginRight: 14,
  // },
  modernLectureTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  modernLectureSubtitle: {
    marginTop: 4,
    color: colors.textSecondary,
  },
  // statusBadge: {
  //   paddingHorizontal: 12,
  //   paddingVertical: 6,
  //   borderRadius: 20,
  // },
  statusBadgeText: {
    fontWeight: "700",
    fontSize: 12,
  },
  lectureFooter: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  footerValue: {
    marginTop: 4,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  // scoreBadge: {
  //   backgroundColor: "#EEF5FF",
  //   borderRadius: 16,
  //   paddingHorizontal: 18,
  //   paddingVertical: 10,
  // },
  scoreBadgeValue: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.accent,
  },

  // Utility
  emptyText: {
    textAlign: "center",
    color: colors.textSecondary,
    paddingVertical: 24,
  },
  errorText: {
    color: "red",
    fontSize: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#EEF2F7",
  },
  // lectureTitle: {
  //   fontSize: 17,
  //   fontWeight: "700",
  //   color: colors.textPrimary,
  // },
  chapterText: {
    marginTop: 4,
    fontSize: 14,
    color: colors.textSecondary,
  },
  scoreText: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.accent,
  },

  heroDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: "#E5E7EB",
    marginHorizontal: 28,
  },
  trend: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: "700",
    color: "#16A34A",
  },
  teacherStatsRow: {
    flexDirection: "row",
    marginTop: 24,
    justifyContent: "space-between",
  },

  teacherStat: {
    alignItems: "center",
  },

  teacherStatValue: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.accent,
  },

  teacherStatLabel: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textSecondary,
  },
  // monthCard: {
  //   backgroundColor: colors.surface,
  //   borderRadius: 20,
  //   padding: 18,
  // },

  monthTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  // monthIcon: {
  //   width: 44,
  //   height: 44,
  //   borderRadius: 22,
  //   backgroundColor: "#EEF5FF",
  //   justifyContent: "center",
  //   alignItems: "center",
  //   marginRight: 14,
  // },

  monthTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },

  monthSubtitle: {
    marginTop: 4,
    color: colors.textSecondary,
  },

  // monthScore: {
  //   fontSize: 28,
  //   fontWeight: "800",
  //   color: colors.accent,
  // },

  monthBottomRow: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  monthAverage: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },

  headerButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 3,
  },

  headerCenter: {
    flex: 1,
    marginHorizontal: 18,
  },

  pageTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.textPrimary,
  },

  pageSubtitle: {
    marginTop: 4,
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  analyticsHeroCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    flexDirection: "row",
    alignItems: "stretch",

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 5,
  },

  teacherSection: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 28,
  },

  avatarWrapper: {
    marginRight: 24,
  },

  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },

  avatarImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },

  teacherInfo: {
    flex: 1,
  },

  teacherName: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.textPrimary,
  },

  teacherBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 10,
    backgroundColor: "#EEF5FF",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },

  teacherBadgeText: {
    marginLeft: 6,
    color: "#2563EB",
    fontWeight: "700",
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },

  infoText: {
    marginLeft: 10,
    color: colors.textSecondary,
    fontSize: 16,
  },

  kpiContainer: {
    flex: 1.9,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 18,
  },

  kpiCard: {
    flex: 1,

    backgroundColor: "#fff",

    borderRadius: 20,

    padding: 18,

    justifyContent: "space-between",

    borderWidth: 1,

    borderColor: "#EEF2F7",
  },

  kpiIconContainer: {
    width: 48,

    height: 48,

    borderRadius: 14,

    justifyContent: "center",

    alignItems: "center",

    marginBottom: 14,
  },

  kpiValue: {
    fontSize: 30,

    fontWeight: "800",

    color: colors.textPrimary,
  },

  kpiTitle: {
    marginTop: 6,

    fontSize: 15,

    color: colors.textSecondary,

    marginBottom: 16,
  },

  kpiProgressBackground: {
    height: 6,

    borderRadius: 3,

    backgroundColor: "#E5E7EB",

    overflow: "hidden",
  },

  kpiProgressFill: {
    height: "100%",

    borderRadius: 3,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",

    backgroundColor: "#fff",

    borderRadius: 16,

    paddingHorizontal: 18,

    height: 58,

    borderWidth: 1,

    borderColor: "#E5E7EB",

    marginTop: 20,
  },
  // filterGrid: {
  //   flexDirection: "row",
  //   flexWrap: "wrap",
  //   gap: 16,
  //   marginTop: 20,
  // },

  // filterItem: {
  //   width: "48%",
  // },

  dateCard: {
    flex: 1,

    backgroundColor: "#fff",

    borderRadius: 16,

    borderWidth: 1,

    borderColor: "#E5E7EB",

    paddingHorizontal: 18,

    height: 58,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",
  },

  summaryCard: {
    width: "48%",
    borderRadius: 22,
    padding: 20,
  },

  summaryIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },

  summaryValue: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.textPrimary,
  },

  summaryTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },

  summarySubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: colors.textSecondary,
  },

  // metricsGrid: {
  //   flexDirection: "row",
  //   flexWrap: "wrap",
  //   justifyContent: "space-between",
  //   rowGap: 18,
  // },

  // metricCard: {
  //   width: "48%",
  //   backgroundColor: "#fff",
  //   borderRadius: 20,
  //   padding: 18,
  //   borderWidth: 1,
  //   borderColor: "#EEF2F7",
  // },

  metricTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  // metricIcon: {
  //   width: 42,
  //   height: 42,
  //   borderRadius: 14,
  //   backgroundColor: "#EEF5FF",
  //   justifyContent: "center",
  //   alignItems: "center",
  // },

  // metricTitle: {
  //   marginTop: 18,
  //   fontSize: 15,
  //   fontWeight: "700",
  //   color: colors.textPrimary,
  // },

  metricValue: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.accent,
  },

  // metricProgressTrack: {
  //   marginTop: 16,
  //   height: 8,
  //   backgroundColor: "#E5E7EB",
  //   borderRadius: 8,
  //   overflow: "hidden",
  // },

  // metricProgressFill: {
  //   height: "100%",
  //   borderRadius: 8,
  //   backgroundColor: colors.accent,
  // },
  searchCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#EEF2F7",
  },

  searchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  searchHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  searchHeaderIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#EEF5FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  searchTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.textPrimary,
  },

  clearAllText: {
    color: "#EF4444",
    fontWeight: "700",
  },

  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 18,
    height: 58,
    marginTop: 22,
  },

  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },

  filterGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 20,
    columnGap: 16,
  },

  filterItem: {
    flex: 1,
  },

  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },

  dateInput: {
    width: "48%",
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  datePlaceholder: {
    color: colors.textSecondary,
  },

  dateValue: {
    color: colors.textPrimary,
    fontWeight: "600",
  },

  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
  },

  resetButton: {
    width: "48%",
    height: 54,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },

  resetText: {
    marginLeft: 8,
    color: colors.accent,
    fontWeight: "700",
  },

  applyButton: {
    width: "48%",
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },

  applyText: {
    marginLeft: 8,
    color: "#fff",
    fontWeight: "700",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 18,
  },

  metricCard: {
    width: "48.5%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#EEF2F7",
  },

  metricHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  metricIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },

  metricTitle: {
    marginTop: 18,
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },

  metricPercentage: {
    fontSize: 28,
    fontWeight: "800",
  },

  metricProgressTrack: {
    marginTop: 18,
    height: 8,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },

  metricProgressFill: {
    height: "100%",
    borderRadius: 8,
  },

  subjectCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "#EEF2F7",
  },

  subjectHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  subjectHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  subjectIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#EEF5FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  subjectName: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },

  subjectSubtitle: {
    marginTop: 4,
    color: colors.textSecondary,
  },

  subjectBadge: {
    backgroundColor: "#EEF5FF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  subjectBadgeText: {
    fontWeight: "800",
    color: colors.accent,
    fontSize: 17,
  },

  subjectProgressTrack: {
    marginTop: 18,
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 8,
    overflow: "hidden",
  },

  subjectProgressFill: {
    height: "100%",
    backgroundColor: colors.accent,
  },

  subjectFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
  },

  subjectFooterItem: {
    flexDirection: "row",
    alignItems: "center",
  },

  subjectFooterText: {
    marginLeft: 6,
    color: colors.textSecondary,
    fontSize: 14,
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 18,
  },

  monthCard: {
    width: "48.5%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#EEF2F7",
  },

  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  monthIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#EEF5FF",
    justifyContent: "center",
    alignItems: "center",
  },

  monthName: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },

  monthLecture: {
    marginTop: 4,
    color: colors.textSecondary,
  },

  monthScore: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.accent,
  },

  monthProgressBackground: {
    marginTop: 18,
    height: 8,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },

  monthProgressFill: {
    height: "100%",
    borderRadius: 8,
    backgroundColor: colors.accent,
  },
  lectureCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "#EEF2F7",
    marginBottom: 18,
  },

  lectureTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  lectureLeft: {
    flexDirection: "row",
    flex: 1,
  },

  lectureIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#EEF5FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  lectureTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
  },

  lectureChapter: {
    marginTop: 4,
    color: colors.textSecondary,
  },

  scoreBadge: {
    backgroundColor: "#EEF5FF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  scoreBadgeText: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.accent,
  },

  lectureProgressTrack: {
    marginTop: 18,
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 8,
    overflow: "hidden",
  },

  lectureProgressFill: {
    height: "100%",
    backgroundColor: colors.accent,
  },

  lectureBottomRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  metaItem: {
    flexDirection: "row",
    alignItems: "center",
  },

  metaText: {
    marginLeft: 6,
    color: colors.textSecondary,
    fontSize: 14,
  },

  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  completedBadge: {
    backgroundColor: "#DCFCE7",
  },

  processingBadge: {
    backgroundColor: "#FEF3C7",
  },

  pendingBadge: {
    backgroundColor: "#DBEAFE",
  },

  failedBadge: {
    backgroundColor: "#FEE2E2",
  },

  statusText: {
    fontWeight: "700",
    fontSize: 13,
  },
});
