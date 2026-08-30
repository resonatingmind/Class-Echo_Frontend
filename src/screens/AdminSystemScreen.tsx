import { useCallback, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
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

import { AdminNavbar } from "../components/common/AdminNavbar";
import { SettingsPanel } from "../components/admin/SettingsPanel";
import { useAuth } from "../context/AuthContext";
import {
  getAdminEmailStatus,
  getAdminSystemHealth,
  sendAdminTestEmail,
} from "../lib/api";
import { AppTheme } from "../theme/AppTheme";
import { EmailStatusOut, EmailTestResult, SystemHealthOut } from "../types/api";

/**
 * Every dependency this deployment needs, and a way to prove email works.
 *
 * Lives on its own tab rather than on the schools list, where the diagnostic
 * used to sit above the search bar. A panel you read when something is wrong
 * does not belong on the screen you use when everything is fine.
 */

type Section = "health" | "settings";

const TONE: Record<string, { fg: string; bg: string; icon: string }> = {
  ok: { fg: "#127A40", bg: "#E7F6EE", icon: "checkmark-circle" },
  warn: { fg: "#B45309", bg: "#FEF3C7", icon: "alert-circle" },
  error: { fg: "#B42318", bg: "#FEE4E2", icon: "close-circle" },
};

export function AdminSystemScreen() {
  const { session } = useAuth();
  const token = session?.token ?? "";

  const [section, setSection] = useState<Section>("health");
  const [health, setHealth] = useState<SystemHealthOut | null>(null);
  const [emailStatus, setEmailStatus] = useState<EmailStatusOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<EmailTestResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const [nextHealth, nextEmail] = await Promise.all([
        getAdminSystemHealth(token),
        getAdminEmailStatus(token),
      ]);
      setHealth(nextHealth);
      setEmailStatus(nextEmail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load system health");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const handleTest = async () => {
    if (!testEmail.trim() || testing) return;
    setTesting(true);
    setTestError(null);
    setTestResult(null);
    try {
      setTestResult(await sendAdminTestEmail(token, testEmail.trim()));
      // The send is now a row in the operations log too, so refresh the
      // component states that may have just changed because of it.
      void load();
    } catch (err) {
      setTestError(
        err instanceof Error ? err.message : "Could not send the test email",
      );
    } finally {
      setTesting(false);
    }
  };

  const problems = health?.components.filter((c) => c.status !== "ok") ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AdminNavbar title="System" />

      <View style={styles.segmentRow}>
        {(["health", "settings"] as Section[]).map((key) => (
          <Pressable
            key={key}
            onPress={() => setSection(key)}
            style={[styles.segment, section === key && styles.segmentActive]}
          >
            <Text
              style={[
                styles.segmentText,
                section === key && styles.segmentTextActive,
              ]}
            >
              {key === "health" ? "Health" : "Settings"}
              {key === "health" && problems.length > 0
                ? ` (${problems.length})`
                : ""}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }
      >
        {section === "settings" ? (
          <SettingsPanel token={token} />
        ) : loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={AppTheme.colors.primary} size="large" />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Ionicons
              color={AppTheme.colors.textSecondary}
              name="cloud-offline-outline"
              size={36}
            />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => void load()} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View
              style={[
                styles.banner,
                { backgroundColor: problems.length ? "#FEE4E2" : "#E7F6EE" },
              ]}
            >
              <Ionicons
                color={problems.length ? "#B42318" : "#127A40"}
                name={problems.length ? "alert-circle" : "checkmark-circle"}
                size={20}
              />
              <Text
                style={[
                  styles.bannerText,
                  { color: problems.length ? "#B42318" : "#127A40" },
                ]}
              >
                {problems.length
                  ? `${problems.length} component${problems.length > 1 ? "s" : ""} need attention`
                  : "All systems operational"}
              </Text>
            </View>

            {health?.components.map((component) => {
              const tone = TONE[component.status] ?? TONE.warn;
              return (
                <View key={component.key} style={styles.row}>
                  <View style={[styles.iconWrap, { backgroundColor: tone.bg }]}>
                    <Ionicons
                      color={tone.fg}
                      name={tone.icon as never}
                      size={16}
                    />
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle}>{component.label}</Text>
                    <Text style={styles.rowDetail}>{component.detail}</Text>
                  </View>
                </View>
              );
            })}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Send a test email</Text>
              <Text style={styles.cardNote}>
                Sends immediately on this request rather than through the worker,
                so the provider's own error comes back here instead of into a log
                you cannot read.
              </Text>

              {emailStatus?.credentials ? (
                <Text style={styles.mono}>{emailStatus.credentials}</Text>
              ) : null}

              <View style={styles.inputRow}>
                <TextInput
                  autoCapitalize="none"
                  keyboardType="email-address"
                  onChangeText={setTestEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={AppTheme.colors.textPlaceholder}
                  style={styles.input}
                  value={testEmail}
                />
                <Pressable
                  disabled={testing || !testEmail.trim()}
                  onPress={() => void handleTest()}
                  style={[
                    styles.primaryBtn,
                    (testing || !testEmail.trim()) && styles.primaryBtnDisabled,
                  ]}
                >
                  {testing ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Send</Text>
                  )}
                </Pressable>
              </View>

              {testError ? <Text style={styles.badText}>{testError}</Text> : null}

              {testResult ? (
                <View
                  style={[
                    styles.result,
                    {
                      backgroundColor: testResult.delivered ? "#E7F6EE" : "#FEE4E2",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.resultTitle,
                      { color: testResult.delivered ? "#127A40" : "#B42318" },
                    ]}
                  >
                    {testResult.delivered
                      ? `Accepted by ${testResult.backend}`
                      : "Not delivered"}
                  </Text>
                  {testResult.error ? (
                    <Text style={styles.mono}>{testResult.error}</Text>
                  ) : null}
                  <Text style={styles.resultDetail}>{testResult.detail}</Text>
                </View>
              ) : null}
            </View>

            {emailStatus ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Invite links</Text>
                <Text style={styles.cardNote}>
                  Every invitation email is built against this URL. If it is
                  wrong, the mail arrives and the link does not open.
                </Text>
                <Text style={styles.mono}>{emailStatus.sample_invite_link}</Text>
              </View>
            ) : null}

            {health ? (
              <Text style={styles.footer}>
                Checked {new Date(`${health.checked_at}Z`).toLocaleTimeString()} ·
                pull down to re-check
              </Text>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppTheme.colors.background },
  segmentRow: {
    flexDirection: "row",
    gap: AppTheme.spacing.s,
    paddingHorizontal: AppTheme.spacing.l,
    paddingBottom: AppTheme.spacing.m,
  },
  segment: {
    paddingVertical: AppTheme.spacing.s,
    paddingHorizontal: AppTheme.spacing.l,
    borderRadius: 999,
    backgroundColor: AppTheme.colors.surfaceMuted,
  },
  segmentActive: { backgroundColor: AppTheme.colors.primary },
  segmentText: { fontSize: 13, fontWeight: "700", color: AppTheme.colors.textSecondary },
  segmentTextActive: { color: "#FFFFFF" },
  content: { padding: AppTheme.spacing.l, paddingBottom: 120, gap: AppTheme.spacing.m },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: 48, gap: 12 },
  errorText: { color: AppTheme.colors.textSecondary, textAlign: "center" },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: AppTheme.spacing.s,
    borderRadius: 12,
    padding: AppTheme.spacing.m,
  },
  bannerText: { fontSize: 13, fontWeight: "800" },
  row: {
    flexDirection: "row",
    gap: AppTheme.spacing.m,
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: AppTheme.spacing.m,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 14, fontWeight: "700", color: AppTheme.colors.textPrimary },
  rowDetail: { fontSize: 12, color: AppTheme.colors.textSecondary, lineHeight: 17 },
  card: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: AppTheme.spacing.l,
    gap: AppTheme.spacing.s,
  },
  cardTitle: { fontSize: 14, fontWeight: "800", color: AppTheme.colors.textPrimary },
  cardNote: { fontSize: 12, color: AppTheme.colors.textSecondary, lineHeight: 17 },
  inputRow: { flexDirection: "row", gap: AppTheme.spacing.s, alignItems: "center" },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    borderRadius: 10,
    paddingHorizontal: AppTheme.spacing.m,
    paddingVertical: AppTheme.spacing.s,
    fontSize: 14,
    color: AppTheme.colors.textPrimary,
    backgroundColor: AppTheme.colors.surfaceSoft,
  },
  primaryBtn: {
    borderRadius: 10,
    backgroundColor: AppTheme.colors.primary,
    paddingVertical: AppTheme.spacing.s + 2,
    paddingHorizontal: AppTheme.spacing.l,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 76,
  },
  primaryBtnDisabled: { backgroundColor: AppTheme.colors.disabled },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  badText: { fontSize: 12, color: "#B42318", lineHeight: 17 },
  result: { borderRadius: 12, padding: AppTheme.spacing.m, gap: 6 },
  resultTitle: { fontSize: 13, fontWeight: "800" },
  resultDetail: {
    fontSize: 12,
    color: AppTheme.colors.textPrimary,
    lineHeight: 17,
  },
  mono: {
    fontSize: 11,
    color: AppTheme.colors.textSecondary,
    lineHeight: 16,
  },
  footer: {
    fontSize: 11,
    color: AppTheme.colors.hint,
    textAlign: "center",
    marginTop: AppTheme.spacing.s,
  },
});
