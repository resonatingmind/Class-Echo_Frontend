import { useCallback, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AdminNavbar } from "../components/common/AdminNavbar";
import { ReportFeedbackPanel } from "../components/admin/ReportFeedbackPanel";
import { useAuth } from "../context/AuthContext";
import {
  getAdminEmailLog,
  getAdminAuditLog,
  getAdminEmailStats,
  getAdminPipelineRecordings,
  getReportFeedbackSummary,
  resendAdminEmailLog,
  retryAdminRecording,
} from "../lib/api";
import { AppTheme } from "../theme/AppTheme";
import {
  AuditLogEntry,
  EmailLogEntry,
  EmailLogStatus,
  EmailStatsOut,
  PipelineRecordingOut,
  ReportFeedbackSummary,
} from "../types/api";

/**
 * What the system has been doing, and what it got stuck on.
 *
 * Both halves exist because the underlying failures are silent: a bounced
 * invitation returned 201 to whoever sent it, and a recording whose worker died
 * mid-job never raises anything anywhere. Neither shows up in an error log you
 * would think to open.
 */

type Section = "email" | "recordings" | "feedback" | "audit";

const SECTION_LABELS: Record<Section, string> = {
  email: "Email",
  recordings: "Recordings",
  feedback: "Feedback",
  audit: "Audit",
};

/** Actions that destroy or override something, flagged so they stand out. */
const DESTRUCTIVE_ACTIONS = new Set([
  "school.delete",
  "school.suspend",
  "school.reject",
  "recording.delete",
  "teacher.revoke_invite",
  "teacher.set_password",
  "school_admin.set_password",
]);

const STATUS_COLORS: Record<string, { fg: string; bg: string }> = {
  sent: { fg: "#127A40", bg: "#E7F6EE" },
  completed: { fg: "#127A40", bg: "#E7F6EE" },
  queued: { fg: "#1D4ED8", bg: "#E8F0FE" },
  pending: { fg: "#1D4ED8", bg: "#E8F0FE" },
  processing: { fg: "#B45309", bg: "#FEF3C7" },
  skipped: { fg: "#B45309", bg: "#FEF3C7" },
  failed: { fg: "#B42318", bg: "#FEE4E2" },
};

function StatusPill({ status }: { status: string }) {
  const tone = STATUS_COLORS[status] ?? { fg: "#475467", bg: "#F2F4F7" };
  return (
    <View style={[styles.pill, { backgroundColor: tone.bg }]}>
      <Text style={[styles.pillText, { color: tone.fg }]}>{status}</Text>
    </View>
  );
}

/** "3m ago" beats a timestamp when you are watching something unfold. */
function relativeTime(iso: string): string {
  // Backend timestamps are naive UTC; without the Z the browser reads them as
  // local time and every row looks hours old (or from the future).
  const then = new Date(iso.endsWith("Z") ? iso : `${iso}Z`).getTime();
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "bad" | "warn";
}) {
  return (
    <View style={styles.statTile}>
      <Text
        style={[
          styles.statValue,
          tone === "bad" && value > 0 && styles.statValueBad,
          tone === "warn" && value > 0 && styles.statValueWarn,
        ]}
      >
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function AdminOperationsScreen() {
  const { session } = useAuth();
  const token = session?.token ?? "";

  const [section, setSection] = useState<Section>("email");
  const [statusFilter, setStatusFilter] = useState<EmailLogStatus | null>(null);

  const [stats, setStats] = useState<EmailStatsOut | null>(null);
  const [emails, setEmails] = useState<EmailLogEntry[]>([]);
  const [recordings, setRecordings] = useState<PipelineRecordingOut[]>([]);
  const [audit, setAudit] = useState<AuditLogEntry[]>([]);
  const [feedback, setFeedback] = useState<ReportFeedbackSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const [nextStats, nextEmails, nextRecordings, nextAudit, nextFeedback] = await Promise.all([
        getAdminEmailStats(token),
        getAdminEmailLog(token, { status: statusFilter ?? undefined, limit: 100 }),
        getAdminPipelineRecordings(token, { problemsOnly: true, limit: 100 }),
        getAdminAuditLog(token, { limit: 100 }),
        getReportFeedbackSummary(token),
      ]);
      setStats(nextStats);
      setEmails(nextEmails);
      setRecordings(nextRecordings);
      setAudit(nextAudit);
      setFeedback(nextFeedback);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load operations data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, statusFilter]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const handleResend = async (entry: EmailLogEntry) => {
    setBusyId(entry.id);
    try {
      const result = await resendAdminEmailLog(token, entry.id);
      Alert.alert("Invitation resent", result.detail);
      await load();
    } catch (err) {
      Alert.alert(
        "Could not resend",
        err instanceof Error ? err.message : "The resend was rejected.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleRetry = async (recording: PipelineRecordingOut) => {
    setBusyId(recording.id);
    try {
      const result = await retryAdminRecording(token, recording.id);
      Alert.alert("Queued", result.detail);
      await load();
    } catch (err) {
      // The 409 here is the useful one: it means no worker is listening, so a
      // retry would have vanished into the queue exactly like the original.
      Alert.alert(
        "Could not retry",
        err instanceof Error ? err.message : "The retry was rejected.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const failedCount = emails.filter((e) => e.status === "failed").length;
  const nearCap =
    stats?.provider_daily_cap != null &&
    stats.sent_today >= stats.provider_daily_cap * 0.8;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AdminNavbar title="Operations" />

      <View style={styles.segmentRow}>
        {(["email", "recordings", "feedback", "audit"] as Section[]).map((key) => (
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
              {SECTION_LABELS[key]}
              {key === "email" && failedCount > 0 ? ` (${failedCount})` : ""}
              {key === "recordings" && recordings.length > 0
                ? ` (${recordings.length})`
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
        {loading ? (
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
            <Pressable onPress={() => void load()} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Try again</Text>
            </Pressable>
          </View>
        ) : section === "email" ? (
          <>
            {stats ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Last 24 hours</Text>
                <View style={styles.statsRow}>
                  <StatTile label="Sent" value={stats.sent_today} />
                  <StatTile label="Failed" value={stats.failed_today} tone="bad" />
                  <StatTile label="Queued" value={stats.queued_now} tone="warn" />
                  <StatTile
                    label="Not sent"
                    value={stats.skipped_today}
                    tone="warn"
                  />
                </View>
                <Text style={styles.cardMeta}>
                  Sending via {stats.backend}
                  {stats.provider_daily_cap
                    ? ` · cap ${stats.sent_today}/${stats.provider_daily_cap}`
                    : ""}
                </Text>
                {nearCap ? (
                  <Text style={styles.warnText}>
                    Close to the provider's daily limit. Past it, everything from
                    this sender is refused for about a day.
                  </Text>
                ) : null}
                {stats.cap_note ? (
                  <Text style={styles.cardNote}>{stats.cap_note}</Text>
                ) : null}
              </View>
            ) : null}

            <View style={styles.filterRow}>
              {([null, "failed", "queued", "sent"] as (EmailLogStatus | null)[]).map(
                (value) => (
                  <Pressable
                    key={value ?? "all"}
                    onPress={() => setStatusFilter(value)}
                    style={[
                      styles.chip,
                      statusFilter === value && styles.chipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        statusFilter === value && styles.chipTextActive,
                      ]}
                    >
                      {value ?? "All"}
                    </Text>
                  </Pressable>
                ),
              )}
            </View>

            {emails.length === 0 ? (
              <Text style={styles.emptyText}>
                No messages recorded yet. Rows appear here as invitations,
                verifications and test sends go out.
              </Text>
            ) : (
              emails.map((entry) => (
                <View key={entry.id} style={styles.row}>
                  <View style={styles.rowHeader}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {entry.to_email}
                    </Text>
                    <StatusPill status={entry.status} />
                  </View>
                  <Text style={styles.rowSubtitle} numberOfLines={1}>
                    {entry.purpose} · {relativeTime(entry.created_at)}
                    {entry.backend ? ` · ${entry.backend}` : ""}
                  </Text>
                  {entry.error ? (
                    <Text style={styles.rowError}>{entry.error}</Text>
                  ) : null}
                  {entry.can_resend && entry.status !== "sent" ? (
                    <Pressable
                      disabled={busyId === entry.id}
                      onPress={() => void handleResend(entry)}
                      style={styles.rowAction}
                    >
                      {busyId === entry.id ? (
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
                          <Text style={styles.rowActionText}>Resend invite</Text>
                        </>
                      )}
                    </Pressable>
                  ) : null}
                </View>
              ))
            )}
          </>
        ) : section === "feedback" ? (
          feedback ? <ReportFeedbackPanel summary={feedback} /> : null
        ) : section === "audit" ? (
          audit.length === 0 ? (
            <Text style={styles.emptyText}>
              Nothing recorded yet. Super admin actions that cannot be
              reconstructed afterwards — setting someone's password, suspending
              a school, deleting a recording, changing a setting — are listed
              here as they happen.
            </Text>
          ) : (
            audit.map((entry) => (
              <View key={entry.id} style={styles.row}>
                <View style={styles.rowHeader}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {entry.target_label ?? entry.target_type ?? "—"}
                  </Text>
                  <View
                    style={[
                      styles.pill,
                      {
                        backgroundColor: DESTRUCTIVE_ACTIONS.has(entry.action)
                          ? "#FEE4E2"
                          : "#F2F4F7",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        {
                          color: DESTRUCTIVE_ACTIONS.has(entry.action)
                            ? "#B42318"
                            : "#475467",
                          textTransform: "none",
                        },
                      ]}
                    >
                      {entry.action}
                    </Text>
                  </View>
                </View>
                <Text style={styles.rowSubtitle} numberOfLines={1}>
                  {entry.actor_email} · {relativeTime(entry.created_at)}
                </Text>
                {entry.detail ? (
                  <Text style={styles.auditDetail}>{entry.detail}</Text>
                ) : null}
              </View>
            ))
          )
        ) : recordings.length === 0 ? (
          <Text style={styles.emptyText}>
            Nothing failed or stuck. Recordings only appear here when analysis
            fails, or when a job has been sitting unprocessed long enough that
            the worker holding it is presumed dead.
          </Text>
        ) : (
          recordings.map((rec) => (
            <View key={rec.id} style={styles.row}>
              <View style={styles.rowHeader}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {rec.lecture_title || rec.chapter_name || `Recording ${rec.id}`}
                </Text>
                <StatusPill status={rec.status} />
              </View>
              <Text style={styles.rowSubtitle} numberOfLines={1}>
                {[rec.teacher_name, rec.subject_name, rec.school_name]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
              <Text style={styles.rowSubtitle}>
                {rec.minutes_in_state >= 60
                  ? `${Math.round(rec.minutes_in_state / 60)}h`
                  : `${Math.round(rec.minutes_in_state)}m`}{" "}
                in {rec.status} · uploaded {relativeTime(rec.uploaded_at)}
              </Text>
              {rec.error_reason ? (
                <Text style={styles.rowError}>{rec.error_reason}</Text>
              ) : null}
              <Pressable
                disabled={busyId === rec.id}
                onPress={() => void handleRetry(rec)}
                style={styles.rowAction}
              >
                {busyId === rec.id ? (
                  <ActivityIndicator color={AppTheme.colors.primary} size="small" />
                ) : (
                  <>
                    <Ionicons
                      color={AppTheme.colors.primary}
                      name="refresh-outline"
                      size={14}
                    />
                    <Text style={styles.rowActionText}>Retry analysis</Text>
                  </>
                )}
              </Pressable>
            </View>
          ))
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
  retryBtn: {
    paddingVertical: AppTheme.spacing.s,
    paddingHorizontal: AppTheme.spacing.l,
    borderRadius: 10,
    backgroundColor: AppTheme.colors.primary,
  },
  retryBtnText: { color: "#FFFFFF", fontWeight: "700" },
  card: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: AppTheme.spacing.l,
    gap: AppTheme.spacing.s,
  },
  cardTitle: { fontSize: 14, fontWeight: "800", color: AppTheme.colors.textPrimary },
  cardMeta: { fontSize: 12, color: AppTheme.colors.textSecondary },
  cardNote: { fontSize: 12, color: AppTheme.colors.textSecondary, lineHeight: 17 },
  warnText: { fontSize: 12, color: "#B45309", lineHeight: 17, fontWeight: "600" },
  statsRow: { flexDirection: "row", gap: AppTheme.spacing.s },
  statTile: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: AppTheme.colors.surfaceSoft,
    paddingVertical: AppTheme.spacing.m,
    alignItems: "center",
  },
  statValue: { fontSize: 20, fontWeight: "800", color: AppTheme.colors.textPrimary },
  statValueBad: { color: "#B42318" },
  statValueWarn: { color: "#B45309" },
  statLabel: { fontSize: 11, color: AppTheme.colors.textSecondary, marginTop: 2 },
  filterRow: { flexDirection: "row", gap: AppTheme.spacing.s, flexWrap: "wrap" },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: AppTheme.spacing.m,
    borderRadius: 999,
    backgroundColor: AppTheme.colors.surfaceMuted,
  },
  chipActive: { backgroundColor: AppTheme.colors.textPrimary },
  chipText: { fontSize: 12, fontWeight: "700", color: AppTheme.colors.textSecondary },
  chipTextActive: { color: "#FFFFFF" },
  row: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: AppTheme.spacing.m,
    gap: 4,
  },
  rowHeader: { flexDirection: "row", alignItems: "center", gap: AppTheme.spacing.s },
  rowTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: AppTheme.colors.textPrimary,
  },
  rowSubtitle: { fontSize: 12, color: AppTheme.colors.textSecondary },
  rowError: {
    fontSize: 12,
    color: "#B42318",
    lineHeight: 17,
    marginTop: 2,
    fontFamily: undefined,
  },
  rowAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginTop: AppTheme.spacing.s,
    paddingVertical: 6,
    paddingHorizontal: AppTheme.spacing.m,
    borderRadius: 8,
    backgroundColor: AppTheme.colors.primaryLight,
  },
  rowActionText: { fontSize: 12, fontWeight: "700", color: AppTheme.colors.primary },
  auditDetail: {
    fontSize: 12,
    color: AppTheme.colors.textPrimary,
    lineHeight: 17,
    marginTop: 2,
  },
  pill: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999 },
  pillText: { fontSize: 11, fontWeight: "800", textTransform: "capitalize" },
  emptyText: {
    fontSize: 13,
    color: AppTheme.colors.textSecondary,
    lineHeight: 19,
    textAlign: "center",
    paddingVertical: 32,
    paddingHorizontal: AppTheme.spacing.l,
  },
});
