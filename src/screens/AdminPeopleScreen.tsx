import { useCallback, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AdminNavbar } from "../components/common/AdminNavbar";
import { useAuth } from "../context/AuthContext";
import {
  resendAdminSchoolAdminInvite,
  resendAdminTeacherInvite,
  searchAdminUsers,
} from "../lib/api";
import { AppTheme } from "../theme/AppTheme";
import { UserSearchResult } from "../types/api";

/**
 * Find anyone, from any school, by the one thing a support call always has.
 *
 * Everything here exists on the per-school screens already — but only once you
 * know which school to open, which is exactly what "a teacher says she can't
 * log in" does not tell you.
 */

const ROLE_LABELS: Record<string, string> = {
  school_admin: "School admin",
  teacher: "Teacher",
  student: "Student",
};

const STATUS_TONES: Record<string, { fg: string; bg: string }> = {
  active: { fg: AppTheme.colors.successText, bg: AppTheme.colors.successBg },
  invited: { fg: "#1D4ED8", bg: "#E8F0FE" },
  pending_approval: { fg: AppTheme.colors.warningText, bg: AppTheme.colors.warningSoft },
  suspended: { fg: AppTheme.colors.dangerText, bg: AppTheme.colors.dangerSoft },
  rejected: { fg: AppTheme.colors.dangerText, bg: AppTheme.colors.dangerSoft },
};

export function AdminPeopleScreen() {
  const { session } = useAuth();
  const navigation = useNavigation<any>();
  const token = session?.token ?? "";

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const runSearch = useCallback(async () => {
    const q = query.trim();
    if (q.length < 2) {
      setError("Type at least two characters.");
      return;
    }
    setSearching(true);
    setError(null);
    try {
      setResults(await searchAdminUsers(token, q));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults(null);
    } finally {
      setSearching(false);
    }
  }, [query, token]);

  const handleResend = async (user: UserSearchResult) => {
    if (!user.school_id) return;
    const key = `${user.role}:${user.id}`;
    setBusyKey(key);
    try {
      const result =
        user.role === "school_admin"
          ? await resendAdminSchoolAdminInvite(token, user.school_id)
          : await resendAdminTeacherInvite(token, user.school_id, user.id);
      Alert.alert("Invitation resent", (result as any)?.detail ?? "Sent.");
      await runSearch();
    } catch (err) {
      Alert.alert(
        "Could not resend",
        err instanceof Error ? err.message : "The resend was rejected.",
      );
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AdminNavbar title="People" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.searchBar}>
          <Ionicons color={AppTheme.colors.textSecondary} name="search" size={16} />
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setQuery}
            onSubmitEditing={() => void runSearch()}
            placeholder="Email or name, any school"
            placeholderTextColor={AppTheme.colors.textPlaceholder}
            returnKeyType="search"
            style={[styles.searchInput, { outlineStyle: "none" } as any]}
            value={query}
          />
          <Pressable
            disabled={searching}
            onPress={() => void runSearch()}
            style={styles.searchBtn}
          >
            {searching ? (
              <ActivityIndicator color={AppTheme.colors.white} size="small" />
            ) : (
              <Text style={styles.searchBtnText}>Search</Text>
            )}
          </Pressable>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {results === null ? (
          <Text style={styles.emptyText}>
            Search by email address or name to find an account in any school,
            along with whether it has been activated and whether a password has
            ever been set.
          </Text>
        ) : results.length === 0 ? (
          <Text style={styles.emptyText}>
            Nobody matches "{query.trim()}". Note this searches accounts only —
            an invitation that was never created will not appear. Check the
            Operations tab for whether the mail went out at all.
          </Text>
        ) : (
          results.map((user) => {
            const key = `${user.role}:${user.id}`;
            const tone = user.status ? STATUS_TONES[user.status] : undefined;
            return (
              <View key={key} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.name} numberOfLines={1}>
                    {user.name}
                  </Text>
                  <View style={styles.rolePill}>
                    <Text style={styles.rolePillText}>
                      {ROLE_LABELS[user.role] ?? user.role}
                    </Text>
                  </View>
                </View>

                <Text style={styles.email} numberOfLines={1}>
                  {user.email}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {user.school_name ?? "No school"}
                </Text>

                <View style={styles.badgeRow}>
                  {user.status ? (
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: tone?.bg ?? "#F2F4F7" },
                      ]}
                    >
                      <Text
                        style={[styles.badgeText, { color: tone?.fg ?? "#475467" }]}
                      >
                        {user.status.replace(/_/g, " ")}
                      </Text>
                    </View>
                  ) : null}
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: user.has_password ? AppTheme.colors.successBg : AppTheme.colors.warningSoft,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        { color: user.has_password ? AppTheme.colors.successText : AppTheme.colors.warningText },
                      ]}
                    >
                      {user.has_password ? "password set" : "no password yet"}
                    </Text>
                  </View>
                </View>

                <View style={styles.actionRow}>
                  {user.can_resend_invite ? (
                    <Pressable
                      disabled={busyKey === key}
                      onPress={() => void handleResend(user)}
                      style={styles.action}
                    >
                      {busyKey === key ? (
                        <ActivityIndicator
                          color={AppTheme.colors.primary}
                          size="small"
                        />
                      ) : (
                        <>
                          <Ionicons
                            color={AppTheme.colors.primary}
                            name="paper-plane-outline"
                            size={14}
                          />
                          <Text style={styles.actionText}>Resend invite</Text>
                        </>
                      )}
                    </Pressable>
                  ) : null}

                  {user.school_id ? (
                    <Pressable
                      onPress={() =>
                        navigation.navigate("AdminSchoolDetail", {
                          schoolId: user.school_id,
                        })
                      }
                      style={styles.action}
                    >
                      <Ionicons
                        color={AppTheme.colors.primary}
                        name="open-outline"
                        size={14}
                      />
                      <Text style={styles.actionText}>Open school</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppTheme.colors.background },
  content: { padding: AppTheme.spacing.l, paddingBottom: 120, gap: AppTheme.spacing.m },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: AppTheme.spacing.s,
    backgroundColor: AppTheme.colors.surface,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    borderRadius: 12,
    paddingHorizontal: AppTheme.spacing.m,
    paddingVertical: AppTheme.spacing.s,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: AppTheme.colors.textPrimary,
    paddingVertical: 4,
  },
  searchBtn: {
    backgroundColor: AppTheme.colors.primary,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: AppTheme.spacing.m,
    minWidth: 68,
    alignItems: "center",
  },
  searchBtnText: { color: AppTheme.colors.white, fontWeight: "700", fontSize: 12 },
  errorText: { fontSize: 12, color: AppTheme.colors.dangerText },
  emptyText: {
    fontSize: 13,
    color: AppTheme.colors.textSecondary,
    lineHeight: 19,
    textAlign: "center",
    paddingVertical: 32,
  },
  card: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: AppTheme.spacing.m,
    gap: 3,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: AppTheme.spacing.s },
  name: { flex: 1, fontSize: 15, fontWeight: "700", color: AppTheme.colors.textPrimary },
  rolePill: {
    backgroundColor: AppTheme.colors.surfaceMuted,
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  rolePillText: { fontSize: 10, fontWeight: "800", color: AppTheme.colors.textSecondary },
  email: { fontSize: 13, color: AppTheme.colors.textPrimary },
  meta: { fontSize: 12, color: AppTheme.colors.textSecondary },
  badgeRow: {
    flexDirection: "row",
    gap: AppTheme.spacing.s,
    flexWrap: "wrap",
    marginTop: 6,
  },
  badge: { borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10 },
  badgeText: { fontSize: 10, fontWeight: "800", textTransform: "capitalize" },
  actionRow: {
    flexDirection: "row",
    gap: AppTheme.spacing.s,
    flexWrap: "wrap",
    marginTop: AppTheme.spacing.s,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: AppTheme.spacing.m,
    borderRadius: 8,
    backgroundColor: AppTheme.colors.primaryLight,
  },
  actionText: { fontSize: 12, fontWeight: "700", color: AppTheme.colors.primary },
});
