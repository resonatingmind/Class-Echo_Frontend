import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AdminNavbar } from "../components/common/AdminNavbar";
import { useAuth } from "../context/AuthContext";
import { getSchoolDashboardOverview, getTeacherRanking } from "../lib/api";
import { SchoolDashboardOverview, TeacherRanking } from "../types/api";
import { AppTheme } from "../theme/AppTheme";

import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { Ionicons } from "@expo/vector-icons";
import { AppLogo } from "../components/ui/AppLogo";

type Props = NativeStackScreenProps<RootStackParamList, "SchoolAdminTabs">;

export function SchoolAdminDashboardScreen({ navigation }: Props) {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<SchoolDashboardOverview | null>(null);
  const [ranking, setRanking] = useState<TeacherRanking | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const [overviewData, rankingData] = await Promise.all([
        getSchoolDashboardOverview(session.token),
        getTeacherRanking(session.token),
      ]);
      setOverview(overviewData);
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

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>
      {/* Header */}
      <AdminNavbar title="School Admin" />

      <View style={styles.flex}>
        {loading ? (
          <View style={[styles.centerContainer, { justifyContent: 'center' }]}>
            <ActivityIndicator size="large" color={AppTheme.colors.primary} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.centerContainer}>
              <View style={styles.body}>
                {/* Page heading */}
                <View style={styles.pageHeading}>
                  <Text style={styles.pageTitle}>{greeting()} 👋</Text>
                  <Text style={styles.pageSubtitle}>
                    Welcome back, School Administrator
                  </Text>
                </View>

                {/* Stats Grid */}
                <Text style={styles.sectionTitle}>School Overview</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{overview?.total_teachers}</Text>
                    <Text style={styles.statLabel}>Teachers</Text>
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

                {/* Recordings & Reports */}
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

                {/* Top Teachers */}
                {ranking && ranking.teachers.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>Top Teachers</Text>
                    <View style={styles.list}>
                      {ranking.teachers.map((teacher, index) => {
                        const medal =
                          index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "🏅";

                        return (
                          <View key={teacher.teacher_id} style={styles.card}>
                            <View style={styles.cardTop}>
                              <View style={styles.cardIcon}>
                                <Text style={styles.cardInitials}>{medal}</Text>
                              </View>
                              <View style={styles.cardBodyText}>
                                <Text style={styles.cardName} numberOfLines={1}>
                                  {teacher.teacher_name}
                                </Text>
                                <Text style={styles.cardAddress} numberOfLines={1}>
                                  {teacher.total_lectures} Lectures
                                </Text>
                              </View>
                              <View style={styles.scoreContainer}>
                                <Text style={styles.teacherScore}>{teacher.overall_score}%</Text>
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </>
                )}
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppTheme.colors.background,
  },
  flex: { flex: 1 },
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
  sectionTitle: {
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.heading3,
    marginTop: AppTheme.spacing.s,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: AppTheme.spacing.m,
  },
  statCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.large,
    paddingVertical: AppTheme.spacing.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  statNumber: {
    color: AppTheme.colors.primary,
    ...AppTheme.typography.heading1,
  },
  statLabel: {
    marginTop: AppTheme.spacing.xs,
    color: AppTheme.colors.textSecondary,
    ...AppTheme.typography.body,
  },
  recordingCard: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.large,
    padding: AppTheme.spacing.xl,
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  recordTitle: {
    color: AppTheme.colors.textSecondary,
    ...AppTheme.typography.body,
  },
  recordValue: {
    marginTop: AppTheme.spacing.xs,
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.heading1,
  },
  pendingValue: {
    marginTop: AppTheme.spacing.xs,
    color: AppTheme.colors.error,
    ...AppTheme.typography.heading1,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: AppTheme.spacing.m,
  },
  quickCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.large,
    padding: AppTheme.spacing.l,
    flexDirection: "row",
    alignItems: "center",
    gap: AppTheme.spacing.m,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  quickIconContainer: {
    width: 44,
    height: 44,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  quickTextContainer: {
    flex: 1,
  },
  quickTitle: {
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.bodyLarge,
    fontWeight: "700",
  },
  quickSubtitle: {
    color: AppTheme.colors.textSecondary,
    ...AppTheme.typography.caption,
  },
  list: {
    gap: AppTheme.spacing.m,
  },
  card: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.large,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: AppTheme.spacing.m,
    padding: AppTheme.spacing.l,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInitials: {
    fontSize: 24,
  },
  cardBodyText: {
    flex: 1,
    gap: AppTheme.spacing.xs,
  },
  cardName: {
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.heading3,
  },
  cardAddress: {
    color: AppTheme.colors.textSecondary,
    ...AppTheme.typography.body,
  },
  scoreContainer: {
    justifyContent: "center",
  },
  teacherScore: {
    color: AppTheme.colors.primary,
    ...AppTheme.typography.heading2,
  },
});

