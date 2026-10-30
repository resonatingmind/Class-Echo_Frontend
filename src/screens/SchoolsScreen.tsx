import { useCallback, useState } from "react";
import { Ionicons, Feather } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppLogo } from "../components/ui/AppLogo";
import { useAuth } from "../context/AuthContext";
import { getAdminSchools, deleteAdminSchool, suspendAdminSchool, reactivateAdminSchool } from "../lib/api";
import { RootStackParamList } from "../navigation/AppNavigator";
import { AppTheme } from "../theme/AppTheme";
import { SchoolOut } from "../types/api";

type Props = NativeStackScreenProps<RootStackParamList, "AdminSchools">;

function SchoolCard({
  school,
  onPress,
  onOptionsPress,
}: {
  school: SchoolOut;
  onPress: () => void;
  onOptionsPress: () => void;
}) {
  const initials = school.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();

  const hasAdmin = !!school.admin;
  const status = school.admin?.status ?? "needs_admin";

  let badgeStyle = styles.badgeOrange;
  let dotStyle = styles.dotOrange;
  let textStyle = styles.statusOrange;
  let statusText = "Needs Admin";

  if (hasAdmin) {
    if (status === "active") {
      badgeStyle = styles.badgeGreen;
      dotStyle = styles.dotGreen;
      textStyle = styles.statusGreen;
      statusText = "Operational";
    } else if (status === "pending_approval") {
      badgeStyle = styles.badgeBlue;
      dotStyle = styles.dotBlue;
      textStyle = styles.statusBlue;
      statusText = "Pending Approval";
    } else if (status === "rejected") {
      badgeStyle = styles.badgeRed;
      dotStyle = styles.dotRed;
      textStyle = styles.statusRed;
      statusText = "Rejected";
    } else if (status === "suspended") {
      badgeStyle = styles.badgeGray;
      dotStyle = styles.dotGray;
      textStyle = styles.statusGray;
      statusText = "Suspended";
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <Pressable accessibilityRole="button" onPress={onPress} style={styles.cardMainPressable}>
          <View style={styles.cardTop}>
            <View style={styles.cardIcon}>
              <Text style={styles.cardInitials}>{initials}</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardName} numberOfLines={1}>
                {school.name}
              </Text>
              <View style={styles.addressRow}>
                <Ionicons color={AppTheme.colors.textSecondary} name="location-outline" size={12} />
                <Text style={styles.cardAddress} numberOfLines={1}>
                  {school.address ?? "Address not added"}
                </Text>
              </View>
            </View>
          </View>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="More options" onPress={onOptionsPress} hitSlop={12} style={styles.optionsBtn}>
          <Ionicons color={AppTheme.colors.textSecondary} name="ellipsis-vertical" size={18} />
        </Pressable>
      </View>

      <Pressable accessibilityRole="button" onPress={onPress}>
        <View style={styles.cardDivider} />
        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Ionicons color={AppTheme.colors.textSecondary} name="grid-outline" size={14} />
            <Text style={styles.metaText}>
              Admin: {hasAdmin ? school.admin!.name : "—"}
            </Text>
          </View>
          <View style={[styles.statusBadge, badgeStyle]}>
            <View style={[styles.statusDot, dotStyle]} />
            <Text style={[styles.statusText, textStyle]}>
              {statusText}
            </Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const showAlert = (title: string, message: string, buttons?: { text: string; onPress?: () => void; style?: string }[]) => {
  if (Platform.OS === 'web') {
    if (buttons && buttons.length > 1) {
      const confirmResult = window.confirm(`${title}\n\n${message}`);
      if (confirmResult) {
        const okBtn = buttons.find(b => b.style !== 'cancel');
        if (okBtn && okBtn.onPress) okBtn.onPress();
      } else {
        const cancelBtn = buttons.find(b => b.style === 'cancel');
        if (cancelBtn && cancelBtn.onPress) cancelBtn.onPress();
      }
    } else {
      window.alert(`${title}\n\n${message}`);
      if (buttons && buttons[0] && buttons[0].onPress) {
        buttons[0].onPress();
      }
    }
  } else {
    Alert.alert(title, message, buttons as any);
  }
};

export function SchoolsScreen({ navigation }: Props) {
  const { session, signOut } = useAuth();
  const [schools, setSchools] = useState<SchoolOut[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSchoolOptions, setSelectedSchoolOptions] = useState<SchoolOut | null>(null);
  
  // Deletion modal states
  const [selectedSchoolForDelete, setSelectedSchoolForDelete] = useState<SchoolOut | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const loadSchools = useCallback(
    async (silent = false) => {
      if (!session) return;
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        setSchools(await getAdminSchools(session.token));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load schools");
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [session],
  );

  useFocusEffect(
    useCallback(() => {
      void loadSchools();
    }, [loadSchools]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadSchools(true);
  }, [loadSchools]);

  const handleToggleSuspend = async (schoolId: number, suspend: boolean) => {
    if (!session) return;
    try {
      if (suspend) {
        await suspendAdminSchool(session.token, schoolId);
        showAlert("Success", "School has been suspended.");
      } else {
        await reactivateAdminSchool(session.token, schoolId);
        showAlert("Success", "School has been reactivated.");
      }
      void loadSchools(true);
    } catch (err) {
      showAlert("Error", err instanceof Error ? err.message : "Failed to toggle status");
    }
  };

  const handleDeleteSchoolPrompt = (school: SchoolOut) => {
    setDeletePassword('');
    setDeleteError(null);
    setSelectedSchoolForDelete(school);
  };

  const confirmDeleteSchool = async () => {
    if (!session || !selectedSchoolForDelete) return;
    if (!deletePassword) {
      setDeleteError('Password is required');
      return;
    }
    setDeleteSaving(true);
    setDeleteError(null);
    try {
      await deleteAdminSchool(session.token, selectedSchoolForDelete.id, deletePassword);
      setSelectedSchoolForDelete(null);
      showAlert("Deleted", "School has been deleted successfully.");
      void loadSchools(true);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete school");
    } finally {
      setDeleteSaving(false);
    }
  };

  const handleSchoolOptions = (school: SchoolOut) => {
    setSelectedSchoolOptions(school);
  };

  const filtered = schools.filter((s) => {
    const hay = [s.name, s.address ?? "", s.admin?.name ?? "", s.admin?.email ?? ""]
      .join(" ")
      .toLowerCase();
    return hay.includes(query.trim().toLowerCase());
  });

  const operational = schools.filter((s) => s.admin && s.admin.status === "active").length;
  const pendingApproval = schools.filter((s) => s.admin && s.admin.status === "pending_approval").length;
  const needsAdmin = schools.filter((s) => !s.admin).length;

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
           <AppLogo showText={false} />
        </View>
        <Text style={styles.headerTitle}>Super Admin</Text>
        <View style={styles.headerRight}>
          <Pressable accessibilityRole="button" accessibilityLabel="Add school" hitSlop={8} 
            onPress={() => navigation.navigate("AdminCreateSchool")} 
            style={styles.iconBtn}
          >
            <Ionicons color={AppTheme.colors.primary} name="add-circle" size={24} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Sign out" hitSlop={8} onPress={signOut} style={styles.iconBtn}>
            <Ionicons color={AppTheme.colors.textPrimary} name="log-out-outline" size={24} />
          </Pressable>
        </View>
      </View>

      <View style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl onRefresh={onRefresh} refreshing={refreshing} tintColor={AppTheme.colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.centerContainer}>
            <View style={styles.body}>
              {/* Page heading */}
              <View style={styles.pageHeading}>
                <Text style={styles.pageTitle}>Academic Institutions</Text>
                <Text style={styles.pageSubtitle}>
                  Managing {schools.length} registered schools on ClassEcho.
                </Text>

                {schools.length > 0 ? (
                  <View style={styles.statsRow}>
                    <View style={styles.statChip}>
                      <View style={styles.dotGreen} />
                      <Text style={styles.statChipText}>{operational} Operational</Text>
                    </View>
                    {pendingApproval > 0 ? (
                      <View style={[styles.statChip, styles.statChipInfo]}>
                        <View style={styles.dotBlue} />
                        <Text style={[styles.statChipText, styles.statChipTextInfo]}>
                          {pendingApproval} Pending
                        </Text>
                      </View>
                    ) : null}
                    {needsAdmin > 0 ? (
                      <View style={[styles.statChip, styles.statChipWarn]}>
                        <View style={styles.dotOrange} />
                        <Text style={[styles.statChipText, styles.statChipTextWarn]}>
                          {needsAdmin} Need Admin
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>


              {/* Search */}
              <View style={styles.searchBar}>
                <Feather color={AppTheme.colors.textSecondary} name="search" size={16} />
                <TextInput
                  onChangeText={setQuery}
                  placeholder="Search schools or admins..."
                  placeholderTextColor={AppTheme.colors.textSecondary}
                  style={[styles.searchInput, { outlineStyle: "none" } as any]}
                  value={query}
                />
                {query.length > 0 ? (
                  <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery("")} hitSlop={8}>
                    <Ionicons color={AppTheme.colors.textSecondary} name="close-circle" size={16} />
                  </Pressable>
                ) : null}
              </View>

              {/* List */}
              {isLoading ? (
                <View style={styles.center}>
                  <ActivityIndicator color={AppTheme.colors.primary} size="large" />
                  <Text style={styles.loadingText}>Loading schools...</Text>
                </View>
              ) : error ? (
                <View style={styles.center}>
                  <Ionicons color={AppTheme.colors.textSecondary} name="cloud-offline-outline" size={40} />
                  <Text style={styles.errorTitle}>Could not load schools</Text>
                  <Text style={styles.errorBody}>{error}</Text>
                  <Pressable accessibilityRole="button" onPress={() => void loadSchools()} style={styles.retryBtn}>
                    <Text style={styles.retryText}>Retry</Text>
                  </Pressable>
                </View>
              ) : filtered.length === 0 ? (
                <View style={styles.center}>
                  <Ionicons color={AppTheme.colors.textSecondary} name="school-outline" size={40} />
                  <Text style={styles.errorTitle}>
                    {query.trim() ? "No results found" : "No schools yet"}
                  </Text>
                  <Text style={styles.errorBody}>
                    {query.trim()
                      ? "Try a different search term."
                      : "Register your first school to get started."}
                  </Text>
                </View>
              ) : (
                <View style={styles.list}>
                  {filtered.map((school) => (
                    <SchoolCard
                      key={school.id}
                      onPress={() =>
                        navigation.navigate("AdminSchoolDetail", { schoolId: school.id })
                      }
                      onOptionsPress={() => handleSchoolOptions(school)}
                      school={school}
                    />
                  ))}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Quick Actions Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={!!selectedSchoolOptions}
        onRequestClose={() => setSelectedSchoolOptions(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text numberOfLines={1} style={styles.modalTitle}>{selectedSchoolOptions?.name}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={8} onPress={() => setSelectedSchoolOptions(null)}>
                <Ionicons color={AppTheme.colors.textSecondary} name="close" size={22} />
              </Pressable>
            </View>
            
            <Pressable
              accessibilityRole="button"
              style={styles.modalActionBtn}
              onPress={() => {
                const s = selectedSchoolOptions;
                setSelectedSchoolOptions(null);
                if (s) navigation.navigate("AdminSchoolDetail", { schoolId: s.id });
              }}
            >
              <Ionicons name="eye-outline" size={18} color={AppTheme.colors.textPrimary} />
              <Text style={styles.modalActionText}>View Details</Text>
            </Pressable>

            {selectedSchoolOptions?.admin ? (
              <Pressable
                accessibilityRole="button"
                style={styles.modalActionBtn}
                onPress={() => {
                  const s = selectedSchoolOptions;
                  setSelectedSchoolOptions(null);
                  if (s) {
                    const isSuspended = s.admin?.status === 'suspended';
                    void handleToggleSuspend(s.id, !isSuspended);
                  }
                }}
              >
                <Ionicons 
                  name={selectedSchoolOptions.admin?.status === 'suspended' ? "checkmark-circle-outline" : "ban-outline"} 
                  size={18} 
                  color={selectedSchoolOptions.admin?.status === 'suspended' ? AppTheme.colors.success : AppTheme.colors.warning} 
                />
                <Text style={styles.modalActionText}>
                  {selectedSchoolOptions.admin?.status === 'suspended' ? "Reactivate School" : "Suspend School"}
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              accessibilityRole="button"
              style={styles.modalActionBtn}
              onPress={() => {
                const s = selectedSchoolOptions;
                setSelectedSchoolOptions(null);
                if (s) handleDeleteSchoolPrompt(s);
              }}
            >
              <Ionicons name="trash-outline" size={18} color={AppTheme.colors.error} />
              <Text style={[styles.modalActionText, { color: AppTheme.colors.dangerText }]}>Delete School</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Delete School Modal */}
      <Modal animationType="slide" transparent visible={!!selectedSchoolForDelete} onRequestClose={() => setSelectedSchoolForDelete(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text numberOfLines={1} style={styles.modalTitle}>Delete School</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={8} onPress={() => setSelectedSchoolForDelete(null)}>
                <Ionicons color={AppTheme.colors.textSecondary} name="close" size={22} />
              </Pressable>
            </View>
            <Text style={styles.modalBodyText}>
              Are you sure you want to permanently delete "{selectedSchoolForDelete?.name}"? This will remove all associated classes, subjects, teachers, students, and recordings.
            </Text>
            <Text style={[styles.inputLabel, { marginTop: 12 }]}>Admin Password *</Text>
            <TextInput
              secureTextEntry
              onChangeText={setDeletePassword}
              placeholder="••••••••"
              placeholderTextColor={AppTheme.colors.hint}
              style={[styles.input, { outlineStyle: "none" } as any]}
              value={deletePassword}
            />
            {deleteError ? <Text style={styles.modalError}>{deleteError}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setSelectedSchoolForDelete(null)}
                style={[styles.modalCancelBtn, { flex: 1 }]}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={deleteSaving}
                onPress={() => { void confirmDeleteSchool(); }}
                style={[styles.modalSaveBtn, { flex: 1, backgroundColor: AppTheme.colors.error }, deleteSaving && { opacity: 0.6 }]}
              >
                {deleteSaving ? (
                  <ActivityIndicator color={AppTheme.colors.white} size="small" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Confirm Delete</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    // Clears the floating tab bar this screen now sits behind. Without it the
    // last school card is unreachable under the pill.
    paddingBottom: 120,
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
    flexDirection: "row",
    gap: AppTheme.spacing.s,
    width: 60,
    justifyContent: "flex-end",
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  pageHeading: {
    gap: AppTheme.spacing.s,
    marginBottom: AppTheme.spacing.m,
  },
  pageTitle: {
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.heading1,
  },
  pageSubtitle: {
    color: AppTheme.colors.textSecondary,
    ...AppTheme.typography.body,
  },
  statsRow: {
    flexDirection: "row",
    gap: AppTheme.spacing.s,
    flexWrap: "wrap",
    marginTop: AppTheme.spacing.s,
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: AppTheme.spacing.xs,
    backgroundColor: AppTheme.colors.successBg,
    borderRadius: AppTheme.radius.pill,
    paddingHorizontal: AppTheme.spacing.m,
    paddingVertical: AppTheme.spacing.xs,
  },
  statChipWarn: {
    backgroundColor: AppTheme.colors.warningBg,
  },
  statChipText: {
    color: AppTheme.colors.successText,
    ...AppTheme.typography.caption,
    fontWeight: "600",
  },
  statChipTextWarn: {
    color: AppTheme.colors.warningStrong,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: AppTheme.spacing.s,
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.medium,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    paddingHorizontal: AppTheme.spacing.m,
    height: 48,
  },
  searchInput: {
    flex: 1,
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.body,
  },
  list: {
    gap: AppTheme.spacing.m,
  },
  center: {
    alignItems: "center",
    paddingVertical: AppTheme.spacing.huge,
    gap: AppTheme.spacing.m,
  },
  loadingText: {
    color: AppTheme.colors.textSecondary,
    ...AppTheme.typography.body,
  },
  errorTitle: {
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.heading3,
  },
  errorBody: {
    color: AppTheme.colors.textSecondary,
    ...AppTheme.typography.body,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: AppTheme.spacing.s,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.primaryLight,
    paddingHorizontal: AppTheme.spacing.l,
    paddingVertical: AppTheme.spacing.m,
  },
  retryText: {
    color: AppTheme.colors.primaryText,
    ...AppTheme.typography.button,
  },
  // School Card
  card: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.large,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardMainPressable: {
    flex: 1,
  },
  optionsBtn: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginRight: AppTheme.spacing.m,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: AppTheme.spacing.m,
    padding: AppTheme.spacing.l,
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInitials: {
    color: AppTheme.colors.primaryText,
    ...AppTheme.typography.heading2,
  },
  cardBody: {
    flex: 1,
    gap: AppTheme.spacing.xs,
  },
  cardName: {
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.heading3,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cardAddress: {
    color: AppTheme.colors.textSecondary,
    ...AppTheme.typography.caption,
    flex: 1,
  },
  cardDivider: {
    height: 1,
    backgroundColor: AppTheme.colors.border,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: AppTheme.spacing.l,
    paddingVertical: AppTheme.spacing.m,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    color: AppTheme.colors.textSecondary,
    ...AppTheme.typography.caption,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: AppTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeGreen: {
    backgroundColor: AppTheme.colors.successBg,
  },
  badgeOrange: {
    backgroundColor: AppTheme.colors.warningBg,
  },
  badgeBlue: {
    backgroundColor: AppTheme.colors.primaryLight,
  },
  badgeRed: {
    backgroundColor: AppTheme.colors.dangerBg,
  },
  badgeGray: {
    backgroundColor: AppTheme.colors.gray100,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotGreen: {
    backgroundColor: AppTheme.colors.success,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotOrange: {
    backgroundColor: AppTheme.colors.warning,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotBlue: {
    backgroundColor: AppTheme.colors.primary,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotRed: {
    backgroundColor: AppTheme.colors.error,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotGray: {
    backgroundColor: AppTheme.colors.hint,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    ...AppTheme.typography.caption,
    fontWeight: "600",
  },
  statusGreen: {
    color: AppTheme.colors.successText,
  },
  statusOrange: {
    color: AppTheme.colors.warningStrong,
  },
  statusBlue: {
    color: AppTheme.colors.primaryText,
  },
  statusRed: {
    color: AppTheme.colors.dangerText,
  },
  statusGray: {
    color: AppTheme.colors.textSecondary,
  },
  statChipInfo: {
    backgroundColor: AppTheme.colors.primaryLight,
  },
  statChipTextInfo: {
    color: AppTheme.colors.primaryText,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalSheet: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.large,
    padding: 24,
    gap: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: {
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.heading3,
    flex: 1,
    marginRight: 8,
  },
  modalActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: AppTheme.spacing.m,
    paddingVertical: AppTheme.spacing.m,
    paddingHorizontal: AppTheme.spacing.l,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.background,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  modalActionText: {
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.body,
    fontWeight: "600",
  },
  modalBodyText: {
    color: AppTheme.colors.textSecondary,
    ...AppTheme.typography.body,
    lineHeight: 18,
    marginBottom: 8,
  },
  inputLabel: {
    color: AppTheme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  input: {
    backgroundColor: AppTheme.colors.background,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    borderRadius: AppTheme.radius.medium,
    padding: 12,
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.body,
  },
  modalError: {
    color: AppTheme.colors.dangerText,
    ...AppTheme.typography.caption,
  },
  modalSaveBtn: {
    backgroundColor: AppTheme.colors.primary,
    paddingVertical: 12,
    borderRadius: AppTheme.radius.medium,
    alignItems: "center",
    marginTop: 8,
  },
  modalSaveBtnText: {
    color: AppTheme.colors.white,
    ...AppTheme.typography.button,
  },
  modalCancelBtn: {
    backgroundColor: AppTheme.colors.surface,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    paddingVertical: 12,
    borderRadius: AppTheme.radius.medium,
    alignItems: "center",
    marginTop: 8,
  },
  modalCancelBtnText: {
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.button,
  },
});

