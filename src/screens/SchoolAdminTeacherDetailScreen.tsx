import { useCallback, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SchoolAdminTabBar } from "../components/SchoolAdminTabBar";
import { useAuth } from "../context/AuthContext";
import {
  getSchoolAdminTeachers,
  getTeacherProfile,
  TeacherProfile,
} from "../lib/api";
import { RootStackParamList } from "../navigation/AppNavigator";
import { ScreenHeader } from "../components/common/ScreenHeader";
import { colors } from "../theme/colors";
import { TeacherOut } from "../types/api";

type Props = NativeStackScreenProps<
  RootStackParamList,
  "SchoolAdminTeacherDetail"
>;

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>

      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function SchoolAdminTeacherDetailScreen({ route, navigation }: Props) {
  const teacherId = parseInt(String(route.params.teacherId), 10);
  const { session } = useAuth();

  const [teacher, setTeacher] = useState<TeacherOut | null>(null);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;

    setLoading(true);
    setError(null);

try {
  const teachers = await getSchoolAdminTeachers(session.token);

  const selected = teachers.find((t) => t.id === teacherId) ?? null;

  setTeacher(selected);

  if (selected) {
    const profileData = await getTeacherProfile(session.token, teacherId);

    setProfile(profileData);
  }
} catch (e) {
  setError(e instanceof Error ? e.message : "Failed to load teacher.");
} finally {
  setLoading(false);
}
  }, [session, teacherId]);

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

  if (!teacher || !profile) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>{error ?? "Teacher not found"}</Text>
      </SafeAreaView>
    );
  }

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("SchoolAdminTabs", { screen: "SchoolAdminTeachers" });
    }
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.safe}>
      <ScreenHeader title="Teacher Profile" onBack={handleBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={42} color={colors.accent} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{teacher.name}</Text>

            <Text style={styles.email}>{teacher.email}</Text>

            <View style={styles.statusBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#16A34A" />

              <Text style={styles.statusText}>Active Teacher</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Assignment Information</Text>

        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Ionicons name="school-outline" size={24} color={colors.accent} />

            <Text style={styles.infoValue}>{profile.classes.join(", ")}</Text>

            <Text style={styles.infoLabel}>Assigned Classes</Text>
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="book-outline" size={24} color={colors.accent} />

            <Text style={styles.infoValue}>
              {profile.statistics.total_subjects}
            </Text>

            <Text style={styles.infoLabel}>Subjects</Text>
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="calendar-outline" size={24} color={colors.accent} />

            <Text style={styles.infoSmall}>
              {profile.assigned_at
                ? new Date(profile.assigned_at).toLocaleDateString()
                : "--"}
            </Text>

            <Text style={styles.infoLabel}>Assigned On</Text>
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="library-outline" size={24} color={colors.accent} />

            <Text style={styles.infoValue}>
              {profile.statistics.total_recordings}
            </Text>

            <Text style={styles.infoLabel}>Recordings</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Teaching Statistics</Text>

        <View style={styles.statsGrid}>
          <StatCard label="Classes" value={profile.statistics.total_classes} />

          <StatCard
            label="Subjects"
            value={profile.statistics.total_subjects}
          />

          <StatCard
            label="Chapters"
            value={profile.statistics.total_chapters}
          />

          <StatCard
            label="Recordings"
            value={profile.statistics.total_recordings}
          />
        </View>

        <Text style={styles.sectionTitle}>Assigned Subjects</Text>

        {profile.subjects.map((subject) => (
          <View key={subject.id} style={styles.subjectCard}>
            <View style={styles.subjectHeader}>
              <Ionicons name="book" size={24} color={colors.accent} />

              <View style={{ flex: 1 }}>
                <Text style={styles.subjectTitle}>{subject.name}</Text>

                <Text style={styles.subjectClass}>{subject.class_name}</Text>
              </View>
            </View>

            <View style={styles.subjectFooter}>
              <Text style={styles.subjectMeta}>
                Chapters: {subject.chapter_count}
              </Text>

              <Text style={styles.subjectMeta}>
                Recordings: {subject.recording_count}
              </Text>
            </View>
          </View>
        ))}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <Pressable
            style={styles.actionButton}
            onPress={() =>
              navigation.navigate("SchoolAdminTeacherAnalytics", {
                teacherId: teacher.id,
              })
            }
          >
            <Ionicons name="bar-chart" size={18} color="#fff" />

            <Text style={styles.actionText}>View Analytics</Text>
          </Pressable>

          <Pressable
            style={styles.actionButton}
            onPress={() =>
              navigation.navigate("SchoolAdminTeacherRecordings", {
                teacherId: teacher.id,
              })
            }
          >
            <Ionicons name="mic" size={18} color="#fff" />

            <Text style={styles.actionText}>View Recordings</Text>
          </Pressable>
        </View>
      </ScrollView>

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
    padding: 20,
    gap: 20,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  errorText: {
    color: "red",
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },

  name: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
  },

  email: {
    fontSize: 15,
    color: colors.textSecondary,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },

  actionButton: {
    height: 50,
    borderRadius: 12,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },

  actionText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },

  profileCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    gap: 18,
  },

  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#EEF4FF",
    justifyContent: "center",
    alignItems: "center",
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "#ECFDF3",
    gap: 5,
  },

  statusText: {
    color: "#16A34A",
    fontWeight: "600",
  },

  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 16,
  },

  infoCard: {
    width: "48%",
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
  },

  infoValue: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: 10,
    color: colors.textPrimary,
  },

  infoSmall: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 10,
  },

  infoLabel: {
    marginTop: 8,
    color: colors.textSecondary,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 16,
  },

  statCard: {
    width: "48%",
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },

  statValue: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.accent,
  },

  statLabel: {
    marginTop: 8,
    color: colors.textSecondary,
  },

  subjectCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },

  subjectHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },

  subjectTitle: {
    fontSize: 18,
    fontWeight: "700",
  },

  subjectClass: {
    color: colors.textSecondary,
    marginTop: 3,
  },

  subjectFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },

  subjectMeta: {
    fontWeight: "600",
    color: colors.textSecondary,
  },
});
