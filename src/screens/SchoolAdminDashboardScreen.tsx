import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../context/AuthContext";
import {
  getSchoolAnalytics,
  getSchoolDashboardOverview,
  getTeacherRanking,
} from "../lib/api";
import {
  SchoolAnalytics,
  SchoolDashboardOverview,
  TeacherRanking,
} from "../types/api";
import { colors } from "../theme/colors";

import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { Ionicons } from "@expo/vector-icons";

type Props = NativeStackScreenProps<RootStackParamList, "SchoolAdminTabs">;

export function SchoolAdminDashboardScreen({ navigation }: Props) {
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);

  const [overview, setOverview] = useState<SchoolDashboardOverview | null>(
    null,
  );

  const [analytics, setAnalytics] = useState<SchoolAnalytics | null>(null);

  const [ranking, setRanking] = useState<TeacherRanking | null>(null);

  // const [activity, setActivity] = useState<RecentActivity | null>(null);

  const load = useCallback(async () => {
    if (!session) return;

    setLoading(true);

    try {
      const [overviewData, analyticsData, rankingData] = await Promise.all([
        getSchoolDashboardOverview(session.token),
        getSchoolAnalytics(session.token),
        getTeacherRanking(session.token),
      ]);

      setOverview(overviewData);
      setAnalytics(analyticsData);
      setRanking(rankingData);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate("SchoolAdminTabs", {
                  screen: "SchoolAdminDashboard",
                });
              }
            }}
          >
            <Ionicons name="arrow-back" size={26} color={colors.textPrimary} />
          </Pressable>

          <View>
            <Text style={styles.greeting}>Good Morning 👋</Text>

            <Text style={styles.schoolName}>My School</Text>

            <Text style={styles.adminName}>
              Welcome back, School Administrator
            </Text>
          </View>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>SA</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>School Overview</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{overview?.total_teachers}</Text>

            <Text style={styles.statLabel}>Teachers</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{overview?.total_students}</Text>

            <Text style={styles.statLabel}>Students</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{overview?.total_classes}</Text>

            <Text style={styles.statLabel}>Classes</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{overview?.total_subjects}</Text>

            <Text style={styles.statLabel}>Subjects</Text>
          </View>
        </View>

        <View style={styles.recordingCard}>
          <View>
            <Text style={styles.recordTitle}>Total Recordings</Text>

            <Text style={styles.recordValue}>{overview?.total_recordings}</Text>
          </View>

          <View>
            <Text style={styles.recordTitle}>Pending Reports</Text>

            <Text style={styles.pendingValue}>{overview?.pending_reports}</Text>
          </View>
        </View>

        {/* <Text style={styles.sectionTitle}>AI Analytics</Text>

        <View style={styles.analyticsGrid}>
          <View style={styles.analyticsCard}>
            <Text style={styles.analyticsLabel}>Overall Score</Text>

            <Text style={styles.analyticsValue}>
              {analytics?.overall_score ?? 0}%
            </Text>

            <View style={styles.progressBackground}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${analytics?.overall_score ?? 0}%`,
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.analyticsCard}>
            <Text style={styles.analyticsLabel}>Engagement</Text>

            <Text style={styles.analyticsValue}>
              {analytics?.engagement_score ?? 0}%
            </Text>

            <View style={styles.progressBackground}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${analytics?.engagement_score ?? 0}%`,
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.analyticsCard}>
            <Text style={styles.analyticsLabel}>Curriculum Coverage</Text>

            <Text style={styles.analyticsValue}>
              {analytics?.curriculum_coverage ?? 0}%
            </Text>

            <View style={styles.progressBackground}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${analytics?.curriculum_coverage ?? 0}%`,
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.analyticsCard}>
            <Text style={styles.analyticsLabel}>Accuracy</Text>

            <Text style={styles.analyticsValue}>
              {analytics?.accuracy_score ?? 0}%
            </Text>

            <View style={styles.progressBackground}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${analytics?.accuracy_score ?? 0}%`,
                  },
                ]}
              />
            </View>
          </View>
        </View> */}

        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <View style={styles.quickGrid}>
          <Pressable
            style={styles.quickCard}
            onPress={() => navigation.navigate("SchoolAdminClasses")}
          >
            <Ionicons name="school" size={34} color={colors.accent} />

            <Text style={styles.quickTitle}>Classes</Text>

            <Text style={styles.quickSubtitle}>Manage</Text>
          </Pressable>

          <Pressable
            style={styles.quickCard}
            onPress={() =>
              navigation.navigate("SchoolAdminTabs", {
                screen: "SchoolAdminTeachers",
              })
            }
          >
            <Ionicons name="people" size={34} color={colors.accent} />

            <Text style={styles.quickTitle}>Teachers</Text>

            <Text style={styles.quickSubtitle}>Manage</Text>
          </Pressable>

          <Pressable
            style={styles.quickCard}
            onPress={() =>
              navigation.navigate("SchoolAdminTabs", {
                screen: "SchoolAdminDashboard",
              })
            }
          >
            <Ionicons name="people-circle" size={34} color={colors.accent} />

            <Text style={styles.quickTitle}>Students</Text>

            <Text style={styles.quickSubtitle}>Browse</Text>
          </Pressable>

          <Pressable
            style={styles.quickCard}
            onPress={() => navigation.navigate("SchoolAdminTimetable")}
          >
            <Ionicons name="calendar" size={34} color={colors.accent} />

            <Text style={styles.quickTitle}>Timetable</Text>

            <Text style={styles.quickSubtitle}>Manage</Text>
          </Pressable>
        </View>

        {/* <View style={styles.quickActions}>
          <Pressable
            style={styles.actionCard}
            onPress={() => navigation.navigate("SchoolAdminClasses")}
          >
            <Ionicons name="school" size={28} color={colors.accent} />

            <Text style={styles.actionTitle}>Manage Classes</Text>

            <Text style={styles.actionSubtitle}>
              View and manage all classes
            </Text>
          </Pressable>

          <Pressable
            style={styles.actionCard}
            onPress={() =>
              navigation.navigate("SchoolAdminTabs", {
                screen: "SchoolAdminTeachers",
              })
            }
          >
            <Ionicons name="people" size={28} color={colors.accent} />

            <Text style={styles.actionTitle}>Manage Teachers</Text>

            <Text style={styles.actionSubtitle}>View teacher information</Text>
          </Pressable>

          <Pressable
            style={styles.actionCard}
            onPress={() =>
              navigation.navigate("SchoolAdminTabs", {
                screen: "SchoolAdminDashboard",
              })
            }
          >
            <Ionicons name="people-circle" size={28} color={colors.accent} />

            <Text style={styles.actionTitle}>Manage Students</Text>

            <Text style={styles.actionSubtitle}>Browse enrolled students</Text>
          </Pressable>
        </View> */}

        <Text style={styles.sectionTitle}>Top Teachers</Text>

        {ranking?.teachers.map((teacher, index) => {
          const medal =
            index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "🏅";

          return (
            <View key={teacher.teacher_id} style={styles.teacherCard}>
              <View style={styles.teacherLeft}>
                <Text style={styles.teacherMedal}>{medal}</Text>

                <View>
                  <Text style={styles.teacherName}>{teacher.teacher_name}</Text>

                  <Text style={styles.teacherLecture}>
                    {teacher.total_lectures} Lectures
                  </Text>
                </View>
              </View>

              <Text style={styles.teacherScore}>{teacher.overall_score}%</Text>
            </View>
          );
        })}

        {/* <Text style={styles.sectionTitle}>Recent Activity</Text>

        {activity?.activities.map((item) => (
          <View key={item.recording_id} style={styles.activityCard}>
            <View style={styles.activityHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.activityTitle}>
                  {item.lecture_title || "Untitled Lecture"}
                </Text>

                <Text style={styles.activityTeacher}>{item.teacher_name}</Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  item.status === "completed"
                    ? styles.completedBadge
                    : item.status === "processing"
                      ? styles.processingBadge
                      : item.status === "failed"
                        ? styles.failedBadge
                        : styles.pendingBadge,
                ]}
              >
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>

            <Text style={styles.chapterText}>{item.chapter_name}</Text>

            <Text style={styles.dateText}>
              {new Date(item.uploaded_at).toLocaleDateString()}
            </Text>
          </View>
        ))} */}
      </ScrollView>
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
    paddingTop: 16,
    paddingBottom: 40,
    gap: 24,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  greeting: {
    fontSize: 18,
    color: colors.textSecondary,
  },

  schoolName: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.textPrimary,
    marginTop: 6,
  },

  adminName: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 6,
  },

  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },

  avatarText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 18,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,

    elevation: 4,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  activity: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  bold: {
    fontWeight: "700",
  },

  sectionTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 12,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  statCard: {
    width: "48%",
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 26,
    alignItems: "center",
    marginBottom: 14,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,

    elevation: 3,
  },

  statNumber: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.accent,
  },

  statLabel: {
    marginTop: 8,
    fontSize: 15,
    color: colors.textSecondary,
  },

  recordingCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 22,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  recordTitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },

  recordValue: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: "800",
    color: colors.textPrimary,
  },

  pendingValue: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: "800",
    color: "#E53935",
  },

  analyticsGrid: {
    gap: 16,
  },

  analyticsCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 20,
  },

  analyticsLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },

  analyticsValue: {
    marginTop: 6,
    fontSize: 30,
    fontWeight: "800",
    color: colors.accent,
  },

  progressBackground: {
    marginTop: 16,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E8EDF4",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 5,
    backgroundColor: colors.accent,
  },

  teacherCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,

    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,

    elevation: 3,
  },

  teacherLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  teacherMedal: {
    fontSize: 28,
    marginRight: 14,
  },

  teacherName: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
  },

  teacherLecture: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textSecondary,
  },

  teacherScore: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.accent,
  },

  // quickActions: {
  //   gap: 16,
  // },

  // actionCard: {
  //   backgroundColor: colors.surface,
  //   borderRadius: 20,
  //   padding: 22,

  //   shadowColor: "#000",
  //   shadowOffset: {
  //     width: 0,
  //     height: 2,
  //   },
  //   shadowOpacity: 0.08,
  //   shadowRadius: 8,

  //   elevation: 3,
  // },

  // actionTitle: {
  //   marginTop: 14,
  //   fontSize: 18,
  //   fontWeight: "700",
  //   color: colors.textPrimary,
  // },

  // actionSubtitle: {
  //   marginTop: 6,
  //   color: colors.textSecondary,
  //   fontSize: 14,
  // },

  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  quickCard: {
    width: "48%",
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 28,
    alignItems: "center",
    marginBottom: 16,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  quickTitle: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },

  quickSubtitle: {
    marginTop: 6,
    color: colors.textSecondary,
    fontSize: 14,
  },

  activityCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,

    elevation: 3,
  },

  activityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  activityTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
  },

  activityTeacher: {
    marginTop: 4,
    color: colors.textSecondary,
  },

  chapterText: {
    marginTop: 10,
    color: colors.textPrimary,
  },

  dateText: {
    marginTop: 8,
    fontSize: 13,
    color: colors.textSecondary,
  },

  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  completedBadge: {
    backgroundColor: "#DFF6E3",
  },

  processingBadge: {
    backgroundColor: "#FFF4D6",
  },

  failedBadge: {
    backgroundColor: "#FFE0E0",
  },

  pendingBadge: {
    backgroundColor: "#ECECEC",
  },

  statusText: {
    fontWeight: "700",
    fontSize: 12,
  },
  backButton: {
    marginRight: 14,
    alignSelf: "flex-start",
    marginTop: 6,
  },

  headerContent: {
    flex: 1,
  },
});
