import { useCallback, useState } from "react";
import { Ionicons, Feather } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
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
import { getAdminSchools } from "../lib/api";
import { RootStackParamList } from "../navigation/AppNavigator";
import { AppTheme } from "../theme/AppTheme";
import { SchoolOut } from "../types/api";

type Props = NativeStackScreenProps<RootStackParamList, "AdminSchools">;

function SchoolCard({
  school,
  onPress,
}: {
  school: SchoolOut;
  onPress: () => void;
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
    <Pressable onPress={onPress} style={styles.card}>
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
        <Ionicons color={AppTheme.colors.textSecondary} name="ellipsis-vertical" size={18} />
      </View>

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
  );
}

export function SchoolsScreen({ navigation }: Props) {
  const { session, signOut } = useAuth();
  const [schools, setSchools] = useState<SchoolOut[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
           <AppLogo hideText size={32} />
        </View>
        <Text style={styles.headerTitle}>Super Admin</Text>
        <View style={styles.headerRight}>
          <Pressable 
            onPress={() => navigation.navigate("AdminCreateSchool")} 
            style={styles.iconBtn}
          >
            <Ionicons color={AppTheme.colors.primary} name="add-circle" size={24} />
          </Pressable>
          <Pressable onPress={signOut} style={styles.iconBtn}>
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
                  style={styles.searchInput}
                  value={query}
                />
                {query.length > 0 ? (
                  <Pressable onPress={() => setQuery("")} hitSlop={8}>
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
                  <Pressable onPress={() => void loadSchools()} style={styles.retryBtn}>
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
                      school={school}
                    />
                  ))}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
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
    ...AppTheme.typography.h3,
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
    ...AppTheme.typography.h1,
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
    backgroundColor: "#E8F7EE",
    borderRadius: AppTheme.radius.round,
    paddingHorizontal: AppTheme.spacing.m,
    paddingVertical: AppTheme.spacing.xs,
  },
  statChipWarn: {
    backgroundColor: "#FFF4E0",
  },
  statChipText: {
    color: "#127A40",
    ...AppTheme.typography.caption,
    fontWeight: "600",
  },
  statChipTextWarn: {
    color: "#92400E",
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
    padding: 0,
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
    ...AppTheme.typography.h3,
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
    color: AppTheme.colors.primary,
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
    color: AppTheme.colors.primary,
    ...AppTheme.typography.h2,
  },
  cardBody: {
    flex: 1,
    gap: AppTheme.spacing.xs,
  },
  cardName: {
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.h3,
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
    borderRadius: AppTheme.radius.round,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeGreen: {
    backgroundColor: "#E8F7EE",
  },
  badgeOrange: {
    backgroundColor: "#FFF4E0",
  },
  badgeBlue: {
    backgroundColor: "#EAF4FF",
  },
  badgeRed: {
    backgroundColor: "#FDF2F2",
  },
  badgeGray: {
    backgroundColor: "#F3F4F6",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotGreen: {
    backgroundColor: "#22C55E",
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotOrange: {
    backgroundColor: "#F59E0B",
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotBlue: {
    backgroundColor: "#1D8EF5",
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotRed: {
    backgroundColor: "#EF4444",
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotGray: {
    backgroundColor: "#9CA3AF",
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    ...AppTheme.typography.caption,
    fontWeight: "600",
  },
  statusGreen: {
    color: "#127A40",
  },
  statusOrange: {
    color: "#92400E",
  },
  statusBlue: {
    color: "#156FD6",
  },
  statusRed: {
    color: "#EF4444",
  },
  statusGray: {
    color: "#6B7280",
  },
  statChipInfo: {
    backgroundColor: "#EAF4FF",
  },
  statChipTextInfo: {
    color: "#156FD6",
  },
});
