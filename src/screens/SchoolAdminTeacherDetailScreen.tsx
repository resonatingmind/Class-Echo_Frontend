import { useCallback, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../context/AuthContext";
import {
  getSchoolAdminTeachers,
  getTeacherProfile,
  TeacherProfile,
  approveSchoolAdminTeacher,
  rejectSchoolAdminTeacher,
  suspendSchoolAdminTeacher,
  reactivateSchoolAdminTeacher,
} from "../lib/api";
import { RootStackParamList } from "../navigation/AppNavigator";
import { AdminNavbar } from "../components/common/AdminNavbar";
import { AppTheme } from "../theme/AppTheme";
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
        <ActivityIndicator size="large" color={AppTheme.colors.primary} />
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

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "active":
        return {
          text: "Active Teacher",
          bgColor: AppTheme.colors.successSoft,
          textColor: AppTheme.colors.successBright,
          icon: "checkmark-circle" as const,
        };
      case "pending_approval":
        return {
          text: "Pending Approval",
          bgColor: "#FEF08A",
          textColor: AppTheme.colors.warningDeep,
          icon: "time-outline" as const,
        };
      case "invited":
        return {
          text: "Invited",
          bgColor: AppTheme.colors.gray100,
          textColor: AppTheme.colors.gray700,
          icon: "mail-outline" as const,
        };
      case "suspended":
        return {
          text: "Suspended",
          bgColor: AppTheme.colors.dangerSoft,
          textColor: AppTheme.colors.dangerDeep,
          icon: "ban-outline" as const,
        };
      case "rejected":
        return {
          text: "Declined",
          bgColor: AppTheme.colors.dangerSoft,
          textColor: AppTheme.colors.dangerDeep,
          icon: "close-circle-outline" as const,
        };
      default:
        return {
          text: status,
          bgColor: AppTheme.colors.gray100,
          textColor: AppTheme.colors.gray700,
          icon: "help-circle-outline" as const,
        };
    }
  };

  const handleApprove = async () => {
    if (!session || !teacher) return;
    try {
      const updated = await approveSchoolAdminTeacher(session.token, teacher.id);
      setTeacher(updated);
      Alert.alert("Success", "Teacher request approved.");
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to approve.");
    }
  };

  const handleReject = async () => {
    if (!session || !teacher) return;
    const action = () => {
      if (Platform.OS === "web") {
        const reason = typeof window !== "undefined" && window.prompt
          ? window.prompt("Enter reason for declining:")
          : null;
        if (reason === null) return; // Cancelled
        void executeReject(reason);
      } else if (Platform.OS === "ios" && typeof Alert.prompt === "function") {
        Alert.prompt(
          "Decline Request",
          "Enter reason for declining this teacher registration request:",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Decline",
              style: "destructive",
              onPress: (text) => void executeReject(text ?? ""),
            },
          ],
          "plain-text"
        );
      } else {
        Alert.alert(
          "Decline Request",
          "Are you sure you want to decline this teacher registration request?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Decline",
              style: "destructive",
              onPress: () => void executeReject("Application declined by administrator"),
            },
          ]
        );
      }
    };

    const executeReject = async (reason: string) => {
      try {
        const updated = await rejectSchoolAdminTeacher(session.token, teacher.id, reason);
        setTeacher(updated);
        Alert.alert("Success", "Teacher request declined.");
      } catch (e) {
        Alert.alert("Error", e instanceof Error ? e.message : "Failed to decline.");
      }
    };

    action();
  };

  const handleSuspend = async () => {
    if (!session || !teacher) return;
    Alert.alert(
      "Suspend Account",
      "Are you sure you want to suspend this teacher's account?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Suspend",
          style: "destructive",
          onPress: async () => {
            try {
              const updated = await suspendSchoolAdminTeacher(session.token, teacher.id);
              setTeacher(updated);
              Alert.alert("Success", "Teacher account suspended.");
            } catch (e) {
              Alert.alert("Error", e instanceof Error ? e.message : "Failed to suspend.");
            }
          },
        },
      ]
    );
  };

  const handleReactivate = async () => {
    if (!session || !teacher) return;
    try {
      const updated = await reactivateSchoolAdminTeacher(session.token, teacher.id);
      setTeacher(updated);
      Alert.alert("Success", "Teacher account reactivated.");
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to reactivate.");
    }
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("SchoolAdminTabs", { screen: "SchoolAdminTeachers" });
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      <AdminNavbar title="Teacher Profile" onBack={handleBack} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.centerContainer}>
          <View style={styles.body}>
            <View style={styles.pageHeading}>
              <Text style={styles.academicLabel}>TEACHER PROFILE</Text>
              <Text style={styles.pageTitle}>{teacher.name}</Text>
            </View>

            <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={42} color={AppTheme.colors.primary} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{teacher.name}</Text>

            <Text style={styles.email}>{teacher.email}</Text>

            {(() => {
              const display = getStatusDisplay(teacher.status ?? "active");
              return (
                <View style={styles.statusRow}>
                  <View style={[styles.statusBadge, { backgroundColor: display.bgColor, marginTop: 0 }]}>
                    <Ionicons name={display.icon} size={14} color={display.textColor} />
                    <Text style={[styles.statusText, { color: display.textColor, marginLeft: 4 }]}>
                      {display.text}
                    </Text>
                  </View>
                  {profile.assigned_at && (
                    <Text style={styles.assignedDateText}>
                      Joined {new Date(profile.assigned_at).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              );
            })()}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Teaching Overview</Text>

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

        {profile.classes && profile.classes.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Assigned Classes</Text>
            <View style={styles.chipContainer}>
              {profile.classes.map((cls, idx) => (
                <View key={idx} style={styles.chip}>
                  <Text style={styles.chipText}>{cls}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>Assigned Subjects</Text>

        {profile.subjects.map((subject) => (
          <View key={subject.id} style={styles.subjectCard}>
            <View style={subjectHeaderStyle(subject)}>
              <Ionicons name="book" size={24} color={AppTheme.colors.primary} />

              <View style={{ flex: 1 }}>
                <Text style={styles.subjectTitle}>{subject.name}</Text>

                <Text style={styles.subjectClass}>
                  {subject.class_name}{subject.section ? ` • Section ${subject.section}` : ""}
                </Text>
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

          {teacher.status === "pending_approval" && (
            <View style={styles.actionButtonGroup}>
              <Pressable
                accessibilityRole="button"
                style={[styles.actionBtn, styles.actionBtnSuccess]}
                onPress={handleApprove}
              >
                <Ionicons name="checkmark-circle" size={20} color={AppTheme.colors.white} />
                <Text style={styles.actionBtnText}>Approve Request</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={[styles.actionBtn, styles.actionBtnDanger]}
                onPress={handleReject}
              >
                <Ionicons name="close-circle" size={20} color={AppTheme.colors.white} />
                <Text style={styles.actionBtnText}>Decline Request</Text>
              </Pressable>
            </View>
          )}

          {teacher.status === "active" && (
            <View style={styles.actionButtonGroup}>
              <Pressable
                accessibilityRole="button"
                style={[styles.actionBtn, styles.actionBtnDanger]}
                onPress={handleSuspend}
              >
                <Ionicons name="ban" size={20} color={AppTheme.colors.white} />
                <Text style={styles.actionBtnText}>Suspend Account</Text>
              </Pressable>
            </View>
          )}

          {teacher.status === "suspended" && (
            <View style={styles.actionButtonGroup}>
              <Pressable
                accessibilityRole="button"
                style={[styles.actionBtn, styles.actionBtnSuccess]}
                onPress={handleReactivate}
              >
                <Ionicons name="checkmark-circle" size={20} color={AppTheme.colors.white} />
                <Text style={styles.actionBtnText}>Reactivate Account</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.actionButtonGroup}>
            <Pressable
              accessibilityRole="button"
              style={[styles.actionBtn, styles.actionBtnSecondary]}
              onPress={() =>
                navigation.navigate("SchoolAdminTeacherGrowth", {
                  teacherId: teacher.id,
                })
              }
            >
              <Ionicons name="trending-up" size={20} color={AppTheme.colors.primary} />
              <Text style={styles.actionBtnTextSecondary}>View Growth</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              style={[styles.actionBtn, styles.actionBtnSecondary]}
              onPress={() =>
                navigation.navigate("SchoolAdminTeacherRecordings", {
                  teacherId: teacher.id,
                })
              }
            >
              <Ionicons name="mic" size={20} color={AppTheme.colors.primary} />
              <Text style={styles.actionBtnTextSecondary}>View Recordings</Text>
            </Pressable>
          </View>
        </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Inline helper for subject header style to prevent typescript/jsx issues
function subjectHeaderStyle(subject: any) {
  return {
    flexDirection: "row" as const,
    gap: 12,
    alignItems: "center" as const,
  };
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppTheme.colors.background,
  },

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

  academicLabel: {
    color: AppTheme.colors.primaryText,
    ...AppTheme.typography.caption,
    fontWeight: "700",
    letterSpacing: 1.2,
  },

  pageTitle: {
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.heading1,
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
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: 20,
    gap: 12,
  },

  name: {
    fontSize: 22,
    fontWeight: "700",
    color: AppTheme.colors.textPrimary,
  },

  email: {
    fontSize: 15,
    color: AppTheme.colors.textSecondary,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: AppTheme.colors.textPrimary,
  },

  actionButtonGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 6,
    marginBottom: 6,
  },

  actionBtn: {
    flex: 1,
    minWidth: 150,
    height: 52,
    borderRadius: AppTheme.radius.large,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: AppTheme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  actionBtnSuccess: {
    backgroundColor: AppTheme.colors.successBright,
  },

  actionBtnDanger: {
    backgroundColor: AppTheme.colors.danger,
  },

  actionBtnSecondary: {
    backgroundColor: AppTheme.colors.surface,
    borderWidth: 1.5,
    borderColor: AppTheme.colors.primary,
    shadowOpacity: 0.05,
  },

  actionBtnText: {
    color: AppTheme.colors.white,
    fontWeight: "700",
    fontSize: 15,
  },

  actionBtnTextSecondary: {
    color: AppTheme.colors.primaryText,
    fontWeight: "700",
    fontSize: 15,
  },

  profileCard: {
    flexDirection: "row",
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.large,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: 20,
    alignItems: "center",
    gap: 18,
    shadowColor: AppTheme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#EEF4FF",
    justifyContent: "center",
    alignItems: "center",
  },

  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
    marginTop: 10,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: AppTheme.colors.successSoft,
    gap: 5,
  },

  statusText: {
    color: AppTheme.colors.successBright,
    fontWeight: "600",
  },

  assignedDateText: {
    color: AppTheme.colors.textSecondary,
    ...AppTheme.typography.caption,
    fontWeight: "600",
  },

  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  chip: {
    backgroundColor: "#EEF4FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AppTheme.colors.primarySoft,
  },

  chipText: {
    color: AppTheme.colors.primaryText,
    fontWeight: "600",
    fontSize: 13,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 16,
  },

  statCard: {
    width: "48%",
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: 20,
    alignItems: "center",
  },

  statValue: {
    fontSize: 28,
    fontWeight: "800",
    color: AppTheme.colors.primaryText,
  },

  statLabel: {
    marginTop: 8,
    color: AppTheme.colors.textSecondary,
  },

  subjectCard: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
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
    color: AppTheme.colors.textSecondary,
    marginTop: 3,
  },

  subjectFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },

  subjectMeta: {
    fontWeight: "600",
    color: AppTheme.colors.textSecondary,
  },
});
