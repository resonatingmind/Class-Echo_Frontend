import { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import {
  ActivityIndicator,
  Modal,
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
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useAuth } from "../context/AuthContext";
import {
  getTeacherDashboard,
  getTeacherSubjectRecordings,
} from "../lib/api";
import { RecordingWithReport, TeacherDashboardSubject } from "../types/api";
import { AppTheme } from "../theme/AppTheme";
import { AdminNavbar } from "../components/common/AdminNavbar";

function StatChip({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <View style={statStyles.chip}>
      <Ionicons name={icon as any} size={14} color="rgba(255,255,255,0.85)" />
      <View>
        <Text style={statStyles.chipValue}>{value}</Text>
        <Text style={statStyles.chipLabel}>{label}</Text>
      </View>
    </View>
  );
}

const statStyles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  chipValue: { fontSize: 15, fontWeight: "800", color: "#FFFFFF", lineHeight: 20 },
  chipLabel: { fontSize: 10, color: "rgba(255,255,255,0.75)", fontWeight: "500", letterSpacing: 0.3 },
});
import { RootStackParamList } from "../navigation/AppNavigator";

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Augment with subject name since getTeacherSubjectRecordings doesn't include it
type RichRecording = RecordingWithReport & {
  subject_name: string;
  class_name: string;
  section: string;
};

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  completed:  { bg: "#ECFDF3", text: "#047857" },
  processing: { bg: "#FFF7ED", text: "#B45309" },
  pending:    { bg: "#F0F9FF", text: "#0369A1" },
  failed:     { bg: "#FEF2F2", text: "#B91C1C" },
};

function getStatusStyle(status: string) {
  return STATUS_STYLES[status.toLowerCase()] ?? { bg: AppTheme.colors.background, text: AppTheme.colors.textSecondary };
}

function scoreColor(score: number): string {
  if (score >= 80) return "#047857";
  if (score >= 50) return "#B45309";
  return "#B91C1C";
}

function scoreBg(score: number): string {
  if (score >= 80) return "#ECFDF3";
  if (score >= 50) return "#FFF7ED";
  return "#FEF2F2";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_FILTER_OPTIONS = ["All", "Completed", "Processing", "Pending", "Failed"];
const SORT_OPTIONS           = ["Newest", "Oldest", "Highest Score", "Lowest Score"];

export function TeacherRecordingsScreen() {
  const navigation = useNavigation<Nav>();
  const { session } = useAuth();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [recordings, setRecordings]     = useState<RichRecording[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [error, setError]               = useState<string | null>(null);

  // Search & filter state
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [subjectFilter, setSubjectFilter] = useState("All");
  const [sortBy, setSortBy]             = useState("Newest");

  // Filter modal temp state
  const [filterVisible, setFilterVisible] = useState(false);
  const [tempStatus, setTempStatus]       = useState("All");
  const [tempSubject, setTempSubject]     = useState("All");
  const [tempSort, setTempSort]           = useState("Newest");

  const load = useCallback(async (silent = false) => {
    if (!session?.token) return;
    silent ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      // 1. Get all subjects the teacher is assigned to
      const dashboard = await getTeacherDashboard(session.token);
      const subjects: TeacherDashboardSubject[] = dashboard.subjects;

      // 2. Fetch recordings for each subject in parallel
      const results = await Promise.allSettled(
        subjects.map((s) => getTeacherSubjectRecordings(session.token!, s.subject_id))
      );

      // 3. Flatten, annotate with subject/class/section
      const flat: RichRecording[] = [];
      results.forEach((result, i) => {
        if (result.status === "fulfilled") {
          const subject = subjects[i]!;
          result.value.forEach((rec) => {
            flat.push({
              ...rec,
              subject_name: subject.subject_name,
              class_name:   subject.class_name,
              section:      subject.section,
            });
          });
        }
      });

      // Sort newest first by default
      flat.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
      setRecordings(flat);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load recordings.");
    } finally {
      silent ? setRefreshing(false) : setLoading(false);
    }
  }, [session?.token]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  // Derived subject options for the filter sheet
  const subjectOptions = useMemo(() => {
    const names = [...new Set(recordings.map((r) => r.subject_name))].sort();
    return ["All", ...names];
  }, [recordings]);

  // Filtered + sorted list
  const filtered = useMemo(() => {
    let list = recordings.filter((r) => {
      const q = search.toLowerCase();
      if (q) {
        const title   = (r.lecture_title ?? "").toLowerCase();
        const chapter = (r.chapter_name ?? "").toLowerCase();
        const subject = r.subject_name.toLowerCase();
        if (!title.includes(q) && !chapter.includes(q) && !subject.includes(q)) return false;
      }
      if (statusFilter !== "All" && r.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
      if (subjectFilter !== "All" && r.subject_name !== subjectFilter) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case "Oldest":        return new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime();
        case "Highest Score": return (b.report?.overall_score ?? -1) - (a.report?.overall_score ?? -1);
        case "Lowest Score":  return (a.report?.overall_score ?? 101) - (b.report?.overall_score ?? 101);
        default:              return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
      }
    });
    return list;
  }, [recordings, search, statusFilter, subjectFilter, sortBy]);

  // Stats
  const stats = useMemo(() => {
    const total      = recordings.length;
    const completed  = recordings.filter((r) => r.status === "completed").length;
    const processing = recordings.filter((r) => r.status === "processing" || r.status === "pending").length;
    const scored     = recordings.filter((r) => r.report?.overall_score != null);
    const avg        = scored.length > 0
      ? Math.round(scored.reduce((s, r) => s + (r.report?.overall_score ?? 0), 0) / scored.length)
      : null;
    return { total, completed, processing, avg };
  }, [recordings]);

  const activeFilterCount = Number(statusFilter !== "All") + Number(subjectFilter !== "All") + Number(sortBy !== "Newest");

  const openFilter = () => {
    setTempStatus(statusFilter);
    setTempSubject(subjectFilter);
    setTempSort(sortBy);
    setFilterVisible(true);
  };

  const applyFilter = () => {
    setStatusFilter(tempStatus);
    setSubjectFilter(tempSubject);
    setSortBy(tempSort);
    setFilterVisible(false);
  };

  const clearAll = () => {
    setSearch("");
    setStatusFilter("All");
    setSubjectFilter("All");
    setSortBy("Newest");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <AdminNavbar title="Teacher" />

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
        {/* ── Hero Banner ─────────────────────────────────────── */}
        <LinearGradient
          colors={["#1D8EF5", "#156FD6", "#0D4FAA"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          <View style={styles.heroCircle1} />
          <View style={styles.heroCircle2} />

          <View style={[styles.heroTopRow, isMobile && styles.heroTopRowMobile]}>
            <View style={isMobile ? { width: "100%", marginBottom: 12 } : { flex: 1 }}>
              <View style={styles.heroLabelRow}>
                <Ionicons name="mic-outline" size={13} color="rgba(255,255,255,0.8)" />
                <Text style={styles.heroLabel}>TEACHER RECORDINGS</Text>
              </View>
              <Text style={styles.heroTitle}>My Recordings</Text>
              <Text style={styles.heroSubtitle}>
                {loading ? "Loading…" : `${stats.total} recording${stats.total === 1 ? "" : "s"} across all subjects`}
              </Text>
            </View>

            <View style={[styles.heroActions, isMobile && styles.heroActionsMobile]}>
              <Pressable style={styles.heroGlassBtn} onPress={() => load(true)}>
                <Ionicons name="refresh-outline" size={13} color="rgba(255,255,255,0.9)" />
                <Text style={styles.heroGlassBtnText}>Refresh</Text>
              </Pressable>
            </View>
          </View>

          {!loading && !error && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.heroStats}>
              <StatChip icon="list-outline" label="Total" value={stats.total} />
              <StatChip icon="checkmark-circle-outline" label="Completed" value={stats.completed} />
              <StatChip icon="time-outline" label="Processing" value={stats.processing} />
              {stats.avg != null && (
                <StatChip icon="star-outline" label="Avg Score" value={`${stats.avg}%`} />
              )}
            </ScrollView>
          )}
        </LinearGradient>

        {/* ── Search + filter bar ── */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color={AppTheme.colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search lectures, chapters, subjects…"
              placeholderTextColor={AppTheme.colors.textPlaceholder}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={AppTheme.colors.hint} />
              </Pressable>
            )}
          </View>
          <Pressable style={styles.filterBtn} onPress={openFilter}>
            <Ionicons name="options-outline" size={18} color={AppTheme.colors.primary} />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* ── Active filter chips ── */}
        {activeFilterCount > 0 && (
          <View style={styles.chipRow}>
            {statusFilter !== "All"  && <View style={styles.chip}><Text style={styles.chipText}>{statusFilter}</Text></View>}
            {subjectFilter !== "All" && <View style={styles.chip}><Text style={styles.chipText}>{subjectFilter}</Text></View>}
            {sortBy !== "Newest"     && <View style={styles.chip}><Text style={styles.chipText}>{sortBy}</Text></View>}
            <Pressable onPress={clearAll} style={styles.chipClear}>
              <Text style={styles.chipClearText}>Clear all</Text>
            </Pressable>
          </View>
        )}

        {/* ── Results counter ── */}
        {!loading && !error && (
          <Text style={styles.resultCount}>
            Showing {filtered.length} of {recordings.length} recordings
          </Text>
        )}

        {/* ── Content ── */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={AppTheme.colors.primary} />
            <Text style={styles.loadingText}>Loading your recordings…</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Ionicons name="cloud-offline-outline" size={44} color={AppTheme.colors.hint} />
            <Text style={styles.emptyTitle}>Could not load recordings</Text>
            <Text style={styles.emptyBody}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={() => void load()}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="mic-off-outline" size={44} color={AppTheme.colors.hint} />
            <Text style={styles.emptyTitle}>
              {recordings.length === 0 ? "No recordings yet" : "No results found"}
            </Text>
            <Text style={styles.emptyBody}>
              {recordings.length === 0
                ? "Start recording your lectures from the subjects screen."
                : "Try adjusting your search or filters."}
            </Text>
            {activeFilterCount > 0 && (
              <Pressable style={styles.retryBtn} onPress={clearAll}>
                <Text style={styles.retryText}>Clear Filters</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={styles.list}>
            {filtered.map((rec) => {
              const s     = getStatusStyle(rec.status);
              const score = rec.report?.overall_score ?? null;
              const title = rec.lecture_title || rec.chapter_name || `Recording #${rec.id}`;

              return (
                <Pressable
                  key={rec.id}
                  style={({ pressed }) => [styles.card, pressed && { opacity: 0.88 }]}
                  onPress={() => navigation.navigate("RecordingDetail", { recording: rec, subjectName: rec.subject_name })}
                >
                  {/* Left icon */}
                  <View style={styles.cardIconWrap}>
                    <Ionicons name="mic" size={20} color={AppTheme.colors.primary} />
                  </View>

                  {/* Main content */}
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle} numberOfLines={2}>{title}</Text>
                    <Text style={styles.cardSub} numberOfLines={1}>
                      {rec.subject_name}
                      {rec.chapter_name ? ` · ${rec.chapter_name}` : ""}
                    </Text>
                    <Text style={styles.cardMeta}>
                      {rec.class_name} · Section {rec.section}
                    </Text>

                    <View style={styles.cardFooter}>
                      {/* Status badge */}
                      <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
                        <Text style={[styles.statusText, { color: s.text }]}>
                          {rec.status.charAt(0).toUpperCase() + rec.status.slice(1)}
                        </Text>
                      </View>

                      {/* Date */}
                      <View style={styles.dateRow}>
                        <Ionicons name="calendar-outline" size={12} color={AppTheme.colors.hint} />
                        <Text style={styles.dateText}>{formatDate(rec.uploaded_at)}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Score */}
                  {score != null ? (
                    <View style={[styles.scoreWrap, { backgroundColor: scoreBg(score) }]}>
                      <Text style={[styles.scoreNumber, { color: scoreColor(score) }]}>{score}</Text>
                      <Text style={[styles.scoreMax, { color: scoreColor(score) }]}>/100</Text>
                    </View>
                  ) : (
                    <View style={styles.scoreWrap}>
                      <Text style={styles.scoreDash}>—</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
          </View>
        </View>
      </ScrollView>

      {/* ── Filter modal ── */}
      <Modal visible={filterVisible} transparent animationType="slide" onRequestClose={() => setFilterVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filters & Sort</Text>
                <Pressable onPress={() => setFilterVisible(false)} hitSlop={8}>
                  <Ionicons name="close" size={24} color={AppTheme.colors.textPrimary} />
                </Pressable>
              </View>

              {/* Status */}
              <Text style={styles.modalSection}>Status</Text>
              {STATUS_FILTER_OPTIONS.map((s) => (
                <Pressable key={s} style={styles.option} onPress={() => setTempStatus(s)}>
                  <Ionicons
                    name={tempStatus === s ? "radio-button-on" : "radio-button-off"}
                    size={20}
                    color={AppTheme.colors.primary}
                  />
                  <Text style={styles.optionText}>{s}</Text>
                </Pressable>
              ))}

              {/* Subject */}
              {subjectOptions.length > 1 && (
                <>
                  <Text style={styles.modalSection}>Subject</Text>
                  {subjectOptions.map((s) => (
                    <Pressable key={s} style={styles.option} onPress={() => setTempSubject(s)}>
                      <Ionicons
                        name={tempSubject === s ? "radio-button-on" : "radio-button-off"}
                        size={20}
                        color={AppTheme.colors.primary}
                      />
                      <Text style={styles.optionText}>{s}</Text>
                    </Pressable>
                  ))}
                </>
              )}

              {/* Sort */}
              <Text style={styles.modalSection}>Sort by</Text>
              {SORT_OPTIONS.map((s) => (
                <Pressable key={s} style={styles.option} onPress={() => setTempSort(s)}>
                  <Ionicons
                    name={tempSort === s ? "radio-button-on" : "radio-button-off"}
                    size={20}
                    color={AppTheme.colors.primary}
                  />
                  <Text style={styles.optionText}>{s}</Text>
                </Pressable>
              ))}

              {/* Buttons */}
              <View style={styles.modalActions}>
                <Pressable
                  style={styles.resetBtn}
                  onPress={() => { setTempStatus("All"); setTempSubject("All"); setTempSort("Newest"); }}
                >
                  <Text style={styles.resetText}>Reset</Text>
                </Pressable>
                <Pressable style={styles.applyBtn} onPress={applyFilter}>
                  <Text style={styles.applyText}>Apply</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppTheme.colors.background },

  scroll: {
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
    paddingTop: AppTheme.spacing.s,
    paddingBottom: AppTheme.spacing.xxxl,
  },
  body: {
    width: '100%',
    maxWidth: 800,
    gap: AppTheme.spacing.l,
  },

  // ── Hero Banner Styles ──
  heroBanner: {
    marginHorizontal: AppTheme.spacing.l,
    borderRadius: AppTheme.radius.large,
    padding: 18,
    overflow: "hidden",
    gap: 14,
  },
  heroCircle1: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255,255,255,0.07)",
    top: -40,
    right: -30,
  },
  heroCircle2: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,255,255,0.05)",
    bottom: -20,
    left: 60,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
    flexWrap: "wrap",
  },
  heroTopRowMobile: {
    flexDirection: "column",
  },
  heroLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 3,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.75)",
    letterSpacing: 1.2,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  heroActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  heroActionsMobile: {
    justifyContent: "flex-start",
    width: "100%",
  },
  heroGlassBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: AppTheme.radius.pill,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  heroGlassBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  heroStats: {
    gap: 8,
    paddingRight: 4,
  },

  searchRow: {
    flexDirection: "row",
    gap: AppTheme.spacing.s,
    alignItems: "center",
    paddingHorizontal: AppTheme.spacing.l,
  },
  searchBox: {
    flex: 1,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.large,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    paddingHorizontal: AppTheme.spacing.l,
    gap: AppTheme.spacing.s,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: AppTheme.colors.textPrimary,
  },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: AppTheme.radius.large,
    backgroundColor: AppTheme.colors.surface,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: AppTheme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: AppTheme.colors.surface,
  },

  // ── Chips ──
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: AppTheme.spacing.s,
    alignItems: "center",
    paddingHorizontal: AppTheme.spacing.l,
  },
  chip: {
    backgroundColor: AppTheme.colors.primaryLight,
    borderRadius: AppTheme.radius.pill,
    paddingHorizontal: AppTheme.spacing.m,
    paddingVertical: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
    color: AppTheme.colors.primaryDark,
  },
  chipClear: {
    paddingHorizontal: AppTheme.spacing.s,
    paddingVertical: 4,
  },
  chipClearText: {
    fontSize: 12,
    fontWeight: "700",
    color: AppTheme.colors.error,
  },

  resultCount: {
    fontSize: 12,
    color: AppTheme.colors.textSecondary,
    fontWeight: "500",
    paddingHorizontal: AppTheme.spacing.l,
  },

  // ── List ──
  list: { 
    gap: AppTheme.spacing.m,
    paddingHorizontal: AppTheme.spacing.l,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.large,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: AppTheme.spacing.l,
    gap: AppTheme.spacing.m,
    ...AppTheme.shadows.subtle,
  },
  cardIconWrap: {
    width: 42,
    height: 42,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardBody: { flex: 1, gap: 3 },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: AppTheme.colors.textPrimary,
    lineHeight: 20,
  },
  cardSub: {
    fontSize: 12,
    color: AppTheme.colors.primary,
    fontWeight: "600",
  },
  cardMeta: {
    fontSize: 11,
    color: AppTheme.colors.textSecondary,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: AppTheme.spacing.s,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: AppTheme.spacing.s,
    paddingVertical: 3,
    borderRadius: AppTheme.radius.pill,
  },
  statusText: { fontSize: 11, fontWeight: "700" },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  dateText: { fontSize: 11, color: AppTheme.colors.hint },

  // Score
  scoreWrap: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 46,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: AppTheme.radius.medium,
    flexShrink: 0,
  },
  scoreNumber: { fontSize: 16, fontWeight: "800" },
  scoreMax:    { fontSize: 10, fontWeight: "600", marginTop: -1 },
  scoreDash:   { fontSize: 16, fontWeight: "700", color: AppTheme.colors.hint },

  // ── Empty/loading states ──
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: AppTheme.spacing.giant,
    paddingHorizontal: AppTheme.spacing.l,
    gap: AppTheme.spacing.s,
  },
  loadingText: { fontSize: 14, color: AppTheme.colors.textSecondary },
  emptyTitle:  { fontSize: 17, fontWeight: "700", color: AppTheme.colors.textPrimary, textAlign: "center" },
  emptyBody:   { fontSize: 13, color: AppTheme.colors.textSecondary, textAlign: "center", lineHeight: 20, paddingHorizontal: 24 },
  retryBtn: {
    marginTop: AppTheme.spacing.s,
    paddingHorizontal: AppTheme.spacing.xl,
    paddingVertical: AppTheme.spacing.m,
    borderRadius: AppTheme.radius.large,
    backgroundColor: AppTheme.colors.primaryLight,
  },
  retryText: { fontSize: 14, fontWeight: "700", color: AppTheme.colors.primaryDark },

  // ── Filter modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: AppTheme.colors.surface,
    borderTopLeftRadius: AppTheme.radius.xlarge,
    borderTopRightRadius: AppTheme.radius.xlarge,
    padding: AppTheme.spacing.xl,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: AppTheme.spacing.l,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: AppTheme.colors.textPrimary,
  },
  modalSection: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: AppTheme.colors.textSecondary,
    marginTop: AppTheme.spacing.l,
    marginBottom: AppTheme.spacing.s,
    textTransform: "uppercase",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: AppTheme.spacing.m,
    paddingVertical: AppTheme.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.divider,
  },
  optionText: {
    fontSize: 15,
    color: AppTheme.colors.textPrimary,
    fontWeight: "500",
  },
  modalActions: {
    flexDirection: "row",
    gap: AppTheme.spacing.m,
    marginTop: AppTheme.spacing.xl,
    paddingBottom: AppTheme.spacing.l,
  },
  resetBtn: {
    flex: 1,
    height: 50,
    borderRadius: AppTheme.radius.large,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  resetText: {
    fontSize: 15,
    fontWeight: "700",
    color: AppTheme.colors.textSecondary,
  },
  applyBtn: {
    flex: 2,
    height: 50,
    borderRadius: AppTheme.radius.large,
    backgroundColor: AppTheme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...AppTheme.shadows.subtle,
  },
  applyText: {
    fontSize: 15,
    fontWeight: "700",
    color: AppTheme.colors.surface,
  },
});
