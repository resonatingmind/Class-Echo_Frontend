import { useCallback, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from "expo-linear-gradient";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../context/AuthContext";
import {
  getTeacherMe,
  getTeacherDashboard,
  updateTeacherMe,
  uploadTeacherProfileImage,
} from "../lib/api";
import { RootStackParamList } from "../navigation/AppNavigator";
import { AppTheme } from "../theme/AppTheme";
import { TeacherOut, TeacherDashboardSubject } from "../types/api";

type Props = NativeStackScreenProps<RootStackParamList, "TeacherProfile">;

export function TeacherProfileScreen({ navigation }: Props) {
  const { session, signOut } = useAuth();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [profile, setProfile] = useState<TeacherOut | null>(null);
  const [subjects, setSubjects] = useState<TeacherDashboardSubject[]>([]);
  const [draftName, setDraftName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!session?.token) return;
      isRefresh ? setRefreshing(true) : setIsLoading(true);
      try {
        const [nextProfile, dashboard] = await Promise.all([
          getTeacherMe(session.token),
          getTeacherDashboard(session.token),
        ]);
        setProfile(nextProfile);
        setDraftName(nextProfile.name);
        setSubjects(dashboard.subjects ?? []);
      } catch (err) {
        Alert.alert(
          "Error",
          err instanceof Error ? err.message : "Failed to load profile data.",
        );
      } finally {
        isRefresh ? setRefreshing(false) : setIsLoading(false);
      }
    },
    [session?.token],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const initials =
    profile?.name
      ?.split(" ")
      .map((word) => word[0] ?? "")
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "T";

  // Derived stats from the dashboard subjects
  const stats = useMemo(() => {
    const totalRecordings = subjects.reduce(
      (sum, s) => sum + (s.recording_count ?? 0),
      0,
    );
    const totalStudents = subjects.reduce(
      (sum, s) => sum + (s.student_count ?? 0),
      0,
    );
    const scored = subjects.filter((s) => s.average_score != null);
    const avgScore =
      scored.length > 0
        ? Math.round(
            scored.reduce((sum, s) => sum + (s.average_score ?? 0), 0) /
              scored.length,
          )
        : null;

    return {
      subjects: subjects.length,
      recordings: totalRecordings,
      students: totalStudents,
      avgScore,
    };
  }, [subjects]);

  const handleAvatarPick = async () => {
    if (!session?.token || uploading) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*"],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setUploading(true);
      const updated = await uploadTeacherProfileImage(
        session.token,
        asset.uri,
        asset.mimeType ?? "image/jpeg",
      );
      setProfile(updated);
      setDraftName(updated.name);
      Alert.alert("Success", "Profile photo updated successfully.");
    } catch (e) {
      Alert.alert(
        "Upload failed",
        e instanceof Error ? e.message : "Could not upload image.",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!session?.token || !draftName.trim() || saving) return;
    try {
      setSaving(true);
      const updated = await updateTeacherMe(session.token, {
        name: draftName.trim(),
      });
      setProfile(updated);
      setDraftName(updated.name);
      setEditing(false);
      Alert.alert("Success", "Profile updated successfully.");
    } catch (e) {
      Alert.alert(
        "Save failed",
        e instanceof Error ? e.message : "Could not save changes.",
      );
    } finally {
      setSaving(false);
    }
  };

  const getStatusConfig = (status?: string) => {
    const norm = (status ?? "active").toLowerCase();
    switch (norm) {
      case "active":
        return {
          label: "Active Teacher",
          bg: "#ECFDF3",
          text: "#16A34A",
          icon: "checkmark-circle" as const,
        };
      case "pending_approval":
        return {
          label: "Pending Approval",
          bg: "#FEF08A",
          text: "#854D0E",
          icon: "time-outline" as const,
        };
      case "suspended":
        return {
          label: "Suspended",
          bg: "#FEE2E2",
          text: "#991B1B",
          icon: "ban-outline" as const,
        };
      default:
        return {
          label: status ?? "Active",
          bg: "#F3F4F6",
          text: "#374151",
          icon: "shield-checkmark-outline" as const,
        };
    }
  };

  const statusConfig = getStatusConfig(profile?.status);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>
      {/* Top Header with Back Button */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons
              color={AppTheme.colors.textPrimary}
              name="arrow-back"
              size={24}
            />
          </Pressable>
        </View>
        <Text style={styles.headerTitle}>{isMobile ? "" : "My Profile"}</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.flex}>
        {isLoading ? (
          <View style={[styles.centerContainer, { justifyContent: "center" }]}>
            <ActivityIndicator color={AppTheme.colors.primary} size="large" />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void load(true)}
                tintColor={AppTheme.colors.primary}
              />
            }
          >
            <View style={styles.centerContainer}>
              <View style={styles.body}>
                {/* Page Heading */}
                <View style={styles.pageHeading}>
                  <Text style={styles.pageTitle}>My Profile</Text>
                  <Text style={styles.pageSubtitle}>
                    Manage your account details and teaching profile
                  </Text>
                </View>

                {/* Hero Card */}
                <LinearGradient
                  colors={[
                    AppTheme.colors.primary,
                    AppTheme.colors.primaryLight,
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.hero}
                >
                  <Pressable
                    onPress={() => void handleAvatarPick()}
                    style={styles.avatarWrap}
                  >
                    {profile?.profile_image_url ? (
                      <Image
                        source={{ uri: profile.profile_image_url }}
                        style={styles.avatarImage}
                      />
                    ) : (
                      <View style={styles.avatarFallback}>
                        <Text style={styles.avatarFallbackText}>
                          {initials}
                        </Text>
                      </View>
                    )}
                    <View style={styles.cameraBadge}>
                      {uploading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Ionicons color="#fff" name="camera" size={14} />
                      )}
                    </View>
                  </Pressable>
                  <Text style={styles.roleBadge}>Teacher</Text>
                </LinearGradient>

                {/* Teaching Overview Stats */}
                <Text style={styles.sectionTitle}>Teaching Overview</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{stats.subjects}</Text>
                    <Text style={styles.statLabel}>Subjects</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{stats.recordings}</Text>
                    <Text style={styles.statLabel}>Recordings</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{stats.students}</Text>
                    <Text style={styles.statLabel}>Students</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>
                      {stats.avgScore != null ? `${stats.avgScore}%` : "—"}
                    </Text>
                    <Text style={styles.statLabel}>Avg Score</Text>
                  </View>
                </View>

                {/* Profile Details Card */}
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Teacher Details</Text>
                    {editing ? (
                      <Pressable
                        onPress={() => {
                          setEditing(false);
                          setDraftName(profile?.name ?? "");
                        }}
                      >
                        <Text style={styles.linkText}>Cancel</Text>
                      </Pressable>
                    ) : (
                      <Pressable onPress={() => setEditing(true)}>
                        <Text style={styles.linkText}>Edit</Text>
                      </Pressable>
                    )}
                  </View>

                  <Text style={styles.label}>FULL NAME</Text>
                  {editing ? (
                    <TextInput
                      autoCapitalize="words"
                      onChangeText={setDraftName}
                      placeholder="Full name"
                      placeholderTextColor={AppTheme.colors.hint}
                      style={styles.input}
                      value={draftName}
                      // @ts-ignore
                      outlineStyle="none"
                    />
                  ) : (
                    <Text style={styles.value}>{profile?.name ?? "—"}</Text>
                  )}

                  <Text style={styles.label}>EMAIL ADDRESS</Text>
                  <Text style={styles.value}>{profile?.email ?? "—"}</Text>

                  <Text style={styles.label}>MEMBER SINCE</Text>
                  <Text style={styles.value}>
                    {profile?.created_at
                      ? new Date(profile.created_at).toLocaleDateString(
                          "en-US",
                          {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          },
                        )
                      : "—"}
                  </Text>

                  {editing ? (
                    <Pressable
                      disabled={saving || !draftName.trim()}
                      onPress={() => void handleSave()}
                      style={[
                        styles.primaryButton,
                        (saving || !draftName.trim()) && styles.buttonDisabled,
                      ]}
                    >
                      {saving ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : null}
                      <Text style={styles.primaryButtonText}>
                        {saving ? "Saving…" : "Save Changes"}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                {/* School & Affiliation Card */}
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>School & Affiliation</Text>
                  </View>

                  <Text style={styles.label}>SCHOOL NAME</Text>
                  <Text style={styles.value}>
                    {profile?.school_name ?? "Not Assigned"}
                  </Text>

                  <Text style={styles.label}>ACCOUNT STATUS</Text>
                  <View style={styles.statusBadgeRow}>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: statusConfig.bg },
                      ]}
                    >
                      <Ionicons
                        name={statusConfig.icon}
                        size={14}
                        color={statusConfig.text}
                      />
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: statusConfig.text },
                        ]}
                      >
                        {statusConfig.label}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.label}>ROLE</Text>
                  <Text style={styles.value}>Faculty / Teacher</Text>
                </View>

                {/* Assigned Subjects Card */}
                {subjects.length > 0 ? (
                  <View style={styles.card}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle}>
                        Assigned Subjects ({subjects.length})
                      </Text>
                    </View>
                    <View style={styles.subjectList}>
                      {subjects.map((sub) => (
                        <View key={sub.subject_id} style={styles.subjectItem}>
                          <View style={styles.subjectIconWrap}>
                            <Ionicons
                              name="book-outline"
                              size={18}
                              color={AppTheme.colors.primary}
                            />
                          </View>
                          <View style={styles.subjectDetails}>
                            <Text style={styles.subjectName}>
                              {sub.subject_name}
                            </Text>
                            <Text style={styles.subjectMeta}>
                              Class {sub.class_name} · Section {sub.section}
                            </Text>
                          </View>
                          <View style={styles.subjectBadge}>
                            <Text style={styles.subjectBadgeText}>
                              {sub.recording_count}{" "}
                              {sub.recording_count === 1 ? "rec" : "recs"}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                {/* Sign Out Button */}
                <Pressable onPress={signOut} style={styles.signOutButton}>
                  <Ionicons
                    color={AppTheme.colors.error}
                    name="log-out-outline"
                    size={20}
                  />
                  <Text style={styles.signOutText}>Sign Out</Text>
                </Pressable>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: AppTheme.spacing.l,
    paddingVertical: AppTheme.spacing.m,
    backgroundColor: AppTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.border,
  },
  headerLeft: {
    width: 60,
    alignItems: "flex-start",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.heading3,
  },
  headerRight: {
    width: 60,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
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
  pageTitle: {
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.heading1,
  },
  pageSubtitle: {
    color: AppTheme.colors.textSecondary,
    ...AppTheme.typography.body,
  },
  hero: {
    alignItems: "center",
    gap: AppTheme.spacing.m,
    marginBottom: AppTheme.spacing.m,
    paddingVertical: 32,
    borderRadius: 24,
    marginHorizontal: 0,
    shadowColor: AppTheme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarWrap: {
    position: "relative",
    padding: 4,
    backgroundColor: "#fff",
    borderRadius: 60,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarImage: { width: 104, height: 104, borderRadius: 52 },
  avatarFallback: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    ...AppTheme.typography.display,
    color: AppTheme.colors.primary,
  },
  cameraBadge: {
    position: "absolute",
    right: 4,
    bottom: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppTheme.colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  roleBadge: {
    marginTop: 4,
    paddingHorizontal: AppTheme.spacing.m,
    paddingVertical: AppTheme.spacing.xs,
    borderRadius: AppTheme.radius.pill,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    color: AppTheme.colors.primaryDark,
    ...AppTheme.typography.caption,
    fontWeight: "800",
    overflow: "hidden",
    letterSpacing: 0.5,
  },
  sectionTitle: {
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.heading3,
    marginBottom: -4,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: AppTheme.spacing.m,
    marginBottom: AppTheme.spacing.xs,
  },
  statCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 20,
    padding: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statNumber: {
    ...AppTheme.typography.heading1,
    color: AppTheme.colors.primary,
    fontWeight: "800",
    marginBottom: 4,
  },
  statLabel: {
    ...AppTheme.typography.caption,
    color: AppTheme.colors.textSecondary,
    fontWeight: "600",
  },
  card: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 24,
    padding: 24,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: AppTheme.spacing.xs,
  },
  cardTitle: {
    flex: 1,
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.heading3,
  },
  linkText: {
    color: AppTheme.colors.primary,
    ...AppTheme.typography.button,
    fontSize: 14,
  },
  label: {
    ...AppTheme.typography.caption,
    letterSpacing: 1.2,
    color: AppTheme.colors.textSecondary,
    fontWeight: "800",
    marginTop: AppTheme.spacing.xs,
  },
  value: {
    ...AppTheme.typography.bodyLarge,
    color: AppTheme.colors.textPrimary,
    fontWeight: "600",
  },
  statusBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: AppTheme.radius.pill,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: "700",
  },
  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    paddingHorizontal: AppTheme.spacing.m,
    ...AppTheme.typography.body,
    color: AppTheme.colors.textPrimary,
  },
  primaryButton: {
    marginTop: 12,
    height: 52,
    borderRadius: 16,
    backgroundColor: AppTheme.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: AppTheme.spacing.s,
    shadowColor: AppTheme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: { color: "#fff", ...AppTheme.typography.button },
  buttonDisabled: { opacity: 0.6 },
  subjectList: {
    gap: AppTheme.spacing.s,
  },
  subjectItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: AppTheme.spacing.m,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.surfaceSoft,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    gap: AppTheme.spacing.m,
  },
  subjectIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: AppTheme.colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  subjectDetails: {
    flex: 1,
    gap: 2,
  },
  subjectName: {
    fontSize: 15,
    fontWeight: "700",
    color: AppTheme.colors.textPrimary,
  },
  subjectMeta: {
    fontSize: 12,
    color: AppTheme.colors.textSecondary,
  },
  subjectBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: AppTheme.radius.pill,
    backgroundColor: AppTheme.colors.surface,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  subjectBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: AppTheme.colors.primary,
  },
  signOutButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: "#FEF2F2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: AppTheme.spacing.s,
    marginTop: AppTheme.spacing.m,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  signOutText: {
    color: "#DC2626",
    ...AppTheme.typography.button,
    fontWeight: "700",
  },
});
