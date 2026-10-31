import { useCallback, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AdminNavbar } from "../components/common/AdminNavbar";
import { useAuth } from "../context/AuthContext";
import { getSchoolAdminTeachers, inviteSchoolAdminTeacher } from "../lib/api";
import { RootStackParamList } from "../navigation/AppNavigator";
import { AppTheme } from "../theme/AppTheme";
import { TeacherOut } from "../types/api";

type Props = NativeStackScreenProps<RootStackParamList, "SchoolAdminTabs">;

// ── Add Teacher Modal ────────────────────────────────────────────────────────

function AddTeacherModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (t: TeacherOut) => void;
}) {
  const { session } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);

  const emailValid = /\S+@\S+\.\S+/.test(email.trim());
  const canSubmit = name.trim().length > 1 && emailValid;

  const handleCreate = async () => {
    if (!session || !canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const teacher = await inviteSchoolAdminTeacher(session.token, {
        name: name.trim(),
        email: email.trim(),
      });
      // The teacher is not usable until they accept, so confirm the send rather
      // than closing as if a ready-to-use account had just been created.
      setInvitedEmail(teacher.email);
      setName("");
      setEmail("");
      onCreated(teacher);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send invitation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setName("");
    setEmail("");
    setError(null);
    setInvitedEmail(null);
    onClose();
  };

  return (
    
    <Modal
      animationType="fade"
      onRequestClose={handleClose}
      transparent
      visible={visible}
    >
      <Pressable onPress={handleClose} style={styles.modalOverlay}>
        <Pressable style={styles.modalCard}>
          {invitedEmail ? (
            <>
              <View style={styles.modalSuccessIcon}>
                <Ionicons
                  color={AppTheme.colors.success}
                  name="mail-outline"
                  size={22}
                />
              </View>
              <Text style={styles.modalTitle}>Invitation sent</Text>
              <Text style={styles.modalSubtitle}>
                {invitedEmail} has been emailed a link to set their password.
                They will appear as Invited until they accept, and the link
                expires in 7 days.
              </Text>
              <View style={styles.modalActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setInvitedEmail(null)}
                  style={styles.modalCancelBtn}
                >
                  <Text style={styles.modalCancelText}>Invite another</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={handleClose} style={styles.modalSubmitBtn}>
                  <Text style={styles.modalSubmitText}>Done</Text>
                </Pressable>
              </View>
            </>
          ) : (
          <>
          <Text style={styles.modalTitle}>Invite New Faculty</Text>
          <Text style={styles.modalSubtitle}>
            We will email them an invitation link to set their own password.
            Assign them to subjects from any class detail once they accept.
          </Text>

          <View style={styles.fields}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>FULL NAME</Text>
              <TextInput
                autoCapitalize="words"
                autoFocus
                onChangeText={setName}
                placeholder="Dr. Elena Rodriguez"
                placeholderTextColor={AppTheme.colors.hint}
                style={styles.input}
                value={name}
              />
            </View>
            <View style={styles.fieldDivider} />
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="teacher@school.edu"
                placeholderTextColor={AppTheme.colors.hint}
                style={styles.input}
                textContentType="emailAddress"
                value={email}
              />
            </View>
          </View>

          {error ? (
            <View style={styles.modalError}>
              <Ionicons color={AppTheme.colors.dangerText} name="alert-circle-outline" size={14} />
              <Text style={styles.modalErrorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.modalActions}>
            <Pressable accessibilityRole="button" onPress={handleClose} style={styles.modalCancelBtn}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={!canSubmit || submitting}
              onPress={handleCreate}
              style={[
                styles.modalSubmitBtn,
                (!canSubmit || submitting) && styles.btnDisabled,
              ]}
            >
              {submitting ? (
                <ActivityIndicator color={AppTheme.colors.white} size="small" />
              ) : (
                <Text style={styles.modalSubmitText}>Send Invitation</Text>
              )}
            </Pressable>
          </View>
          </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Teacher Card ─────────────────────────────────────────────────────────────

function TeacherCard({
  teacher,
  onPress,
}: {
  teacher: TeacherOut;
  onPress: () => void;
}) {
  const initials = teacher.name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          {teacher.profile_image_url ? (
            <Image
              source={{ uri: teacher.profile_image_url }}
              style={styles.avatarImage}
            />
          ) : (
            <Text style={styles.avatarText}>{initials}</Text>
          )}
        </View>

        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{teacher.name}</Text>

          <Text style={styles.cardEmail}>{teacher.email}</Text>
        </View>

        <Ionicons name="chevron-forward" size={22} color={AppTheme.colors.textSecondary} />
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.cardMeta}>
        <Ionicons color={AppTheme.colors.textSecondary} name="calendar-outline" size={13} />

        <Text style={styles.cardMetaText}>
          Joined{" "}
          {new Date(teacher.created_at).toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </Text>
      </View>
    </Pressable>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function SchoolAdminTeachersScreen({ navigation }: Props) {
  const { session } = useAuth();
  const [teachers, setTeachers] = useState<TeacherOut[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!session) return;
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        setTeachers(await getSchoolAdminTeachers(session.token));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load teachers");
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [session],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    void load(true);
  };

  const filtered = teachers.filter((t) => {
    const hay = [t.name, t.email].join(" ").toLowerCase();
    return hay.includes(query.trim().toLowerCase());
  });

  
  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <AdminNavbar title="Teachers" />

      <View style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              onRefresh={onRefresh}
              refreshing={refreshing}
              tintColor={AppTheme.colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.centerContainer}>
            <View style={styles.body}>
              {/* Page heading */}
              <View style={styles.pageHeading}>
                <View style={styles.titleRow}>
                  <Text style={styles.pageTitle}>Teacher Directory</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setShowAdd(true)}
                    style={styles.addTeacherBtn}
                  >
                    <Ionicons color={AppTheme.colors.white} name="person-add" size={14} />
                    <Text style={styles.addTeacherText}>Add Teacher</Text>
                  </Pressable>
                </View>
                <Text style={styles.pageSubtitle}>
                  Manage faculty members and active teaching statuses.
                </Text>
              </View>

              {/* Search */}
              <View style={styles.searchBar}>
                <Ionicons color={AppTheme.colors.textSecondary} name="search-outline" size={16} />
                <TextInput
                  onChangeText={setQuery}
                  placeholder="Search by name, email…"
                  placeholderTextColor={AppTheme.colors.hint}
                  style={styles.searchInput}
                  value={query}
                />
                {query.length > 0 ? (
                  <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={8} onPress={() => setQuery("")}>
                    <Ionicons
                      color={AppTheme.colors.textSecondary}
                      name="close-circle"
                      size={16}
                    />
                  </Pressable>
                ) : null}
              </View>

              {isLoading ? (
                <View style={styles.center}>
                  <ActivityIndicator color={AppTheme.colors.primary} size="large" />
                  <Text style={styles.loadingText}>Loading faculty…</Text>
                </View>
              ) : error ? (
                <View style={styles.center}>
                  <Ionicons
                    color={AppTheme.colors.textSecondary}
                    name="cloud-offline-outline"
                    size={40}
                  />
                  <Text style={styles.emptyTitle}>Could not load teachers</Text>
                  <Text style={styles.emptyBody}>{error}</Text>
                  <Pressable accessibilityRole="button" onPress={() => void load()} style={styles.retryBtn}>
                    <Text style={styles.retryText}>Retry</Text>
                  </Pressable>
                </View>
              ) : filtered.length === 0 ? (
                <View style={styles.center}>
                  <Ionicons
                    color={AppTheme.colors.textSecondary}
                    name="people-outline"
                    size={44}
                  />
                  <Text style={styles.emptyTitle}>
                    {query.trim() ? "No matching faculty" : "No teachers yet"}
                  </Text>
                  <Text style={styles.emptyBody}>
                    {query.trim()
                      ? "Try a different search."
                      : "Add your first teacher to get started."}
                  </Text>
                </View>
              ) : (
                <View style={styles.list}>
                  {filtered.map((teacher) => (
                    <TeacherCard
                      key={teacher.id}
                      teacher={teacher}
                      onPress={() =>
                        navigation.navigate("SchoolAdminTeacherDetail", {
                          teacherId: teacher.id,
                        })
                      }
                    />
                  ))}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </View>

      <AddTeacherModal
        onClose={() => setShowAdd(false)}
        onCreated={(t) => setTeachers((prev) => [...prev, t])}
        visible={showAdd}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppTheme.colors.background },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
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
  pageHeading: { gap: AppTheme.spacing.s, marginBottom: AppTheme.spacing.m },
  pageTitle: {
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.heading1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 4,
  },
  pageSubtitle: { color: AppTheme.colors.textSecondary, ...AppTheme.typography.body },
  modalSuccessIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppTheme.colors.successSoft,
    marginBottom: AppTheme.spacing.m,
  },
  addTeacherBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.primary,
    paddingHorizontal: AppTheme.spacing.m,
    paddingVertical: AppTheme.spacing.s,
  },
  addTeacherText: { color: AppTheme.colors.white, ...AppTheme.typography.button },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.medium,
    borderWidth: 1.5,
    borderColor: AppTheme.colors.border,
    paddingHorizontal: 14,
    height: 48,
  },
  searchInput: { flex: 1, color: AppTheme.colors.textPrimary, ...AppTheme.typography.body, padding: 0, outlineStyle: 'none' as any },
  center: {
    alignItems: "center",
    paddingVertical: AppTheme.spacing.huge,
    gap: AppTheme.spacing.m,
  },
  loadingText: { color: AppTheme.colors.textSecondary, ...AppTheme.typography.body },
  emptyTitle: { color: AppTheme.colors.textPrimary, ...AppTheme.typography.heading3 },
  emptyBody: { color: AppTheme.colors.textSecondary, ...AppTheme.typography.body, textAlign: "center" },
  retryBtn: {
    marginTop: AppTheme.spacing.s,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.primaryLight,
    paddingHorizontal: AppTheme.spacing.l,
    paddingVertical: AppTheme.spacing.m,
  },
  retryText: { color: AppTheme.colors.primaryText, ...AppTheme.typography.button },
  list: { gap: AppTheme.spacing.m },

  // Teacher Card
  card: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.large,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    overflow: "hidden",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: AppTheme.spacing.l,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: AppTheme.colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: AppTheme.colors.primaryText, ...AppTheme.typography.heading3 },
  avatarImage: { width: 48, height: 48, borderRadius: 24 },
  cardInfo: { flex: 1, gap: 3 },
  cardName: { color: AppTheme.colors.textPrimary, ...AppTheme.typography.heading3 },
  cardEmail: { color: AppTheme.colors.textSecondary, ...AppTheme.typography.body },
  cardDivider: { height: 1, backgroundColor: AppTheme.colors.border },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: AppTheme.spacing.m,
    paddingHorizontal: AppTheme.spacing.l,
  },
  cardMetaText: { color: AppTheme.colors.textSecondary, ...AppTheme.typography.caption },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.large,
    padding: 24,
    width: "100%",
    maxWidth: 500,
    gap: 16,
    maxHeight: "90%",
    ...AppTheme.shadows.card,
  },
  modalTitle: { color: AppTheme.colors.textPrimary, ...AppTheme.typography.heading2 },
  modalSubtitle: { color: AppTheme.colors.textSecondary, ...AppTheme.typography.body },
  fields: {
    backgroundColor: AppTheme.colors.background,
    borderRadius: AppTheme.radius.medium,
    borderWidth: 1.5,
    borderColor: AppTheme.colors.border,
    overflow: "hidden",
  },
  field: { padding: 14, gap: 6 },
  fieldLabel: {
    color: AppTheme.colors.textSecondary,
    ...AppTheme.typography.caption,
    textTransform: "uppercase",
  },
  fieldDivider: {
    height: 1,
    backgroundColor: AppTheme.colors.border,
    marginHorizontal: 0,
  },
  input: { color: AppTheme.colors.textPrimary, ...AppTheme.typography.body, padding: 0, minHeight: 24, outlineStyle: 'none' as any },
  modalError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: AppTheme.colors.dangerBg,
    borderRadius: AppTheme.radius.medium,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalErrorText: { color: AppTheme.colors.dangerText, flex: 1, ...AppTheme.typography.body },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 4 },
  modalCancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: AppTheme.radius.medium,
    borderWidth: 1.5,
    borderColor: AppTheme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: {
    color: AppTheme.colors.textSecondary,
    ...AppTheme.typography.button,
  },
  modalSubmitBtn: {
    flex: 1,
    height: 50,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: { opacity: 0.45 },
  modalSubmitText: { color: AppTheme.colors.white, ...AppTheme.typography.button },
});

