import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
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

import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";

import { RootStackParamList } from "../navigation/AppNavigator";
import { AppTheme } from "../theme/AppTheme";

import { ChapterEditorModal } from "../components/teacher/ChapterEditorModal";
import { ImportLearningPlansModal } from "../components/plannerDetail/ImportLearningPlansModal";
import { ChapterActionSheet } from "../components/teacher/ChapterActionSheet";
import { ConfirmDialog } from "../components/common/ConfirmDialog";

import {
  createTeacherChapter,
  getTeacherChapters,
  updateTeacherChapter,
  deleteTeacherChapter,
  getTeacherSubjectRecordings,
  getTeacherLearningPlans,
  createTeacherLearningPlan,
  retryRecording,
  getTeacherSubjectStudents,
} from "../lib/api";
import {
  ChapterOut,
  LearningPlanCreatePayload,
  LearningPlanOut,
  RecordingWithReport,
  StudentOut,
} from "../types/api";
import { ChapterLearningPlanModal } from "../components/teacher/ChapterLearningPlanModal";
import { getTeacherStatusStyle } from "../components/teacher/teacherStatusStyles";
import { ExpandedChapterDetailView } from "../components/ExpandedChapterDetailView";

function getScoreColor(score: number | undefined | null) {
  if (score == null) return "#64748B";
  if (score >= 80) return "#127A40";
  if (score >= 60) return AppTheme.colors.primary;
  if (score >= 40) return "#92400E";
  return "#B42318";
}

type Props = NativeStackScreenProps<RootStackParamList, "TeacherSubjectWorkspace">;

export function TeacherSubjectWorkspaceScreen({ navigation, route }: Props) {
  const { subjectId, subjectName, className, section } = route.params;
  const { session } = useAuth();
  const token = session?.token ?? "";

  const [chapters, setChapters] = useState<ChapterOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [editorVisible, setEditorVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<ChapterOut | null>(null);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [editing, setEditing] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "withPdf" | "withoutPdf">("all");

  const [expandedChapterId, setExpandedChapterId] = useState<number | null>(null);
  // Kept in a ref so the focus refresh doesn't re-run every time a row is expanded.
  const expandedChapterIdRef = useRef<number | null>(null);
  const [expandedRecordings, setExpandedRecordings] = useState<Record<number, RecordingWithReport[]>>({});
  const [expandedLps, setExpandedLps] = useState<Record<number, LearningPlanOut[]>>({});
  const [loadingExpandedId, setLoadingExpandedId] = useState<number | null>(null);

  const [lectureModalVisible, setLectureModalVisible] = useState(false);
  const [lectureChapter, setLectureChapter] = useState<ChapterOut | null>(null);
  const [savingLecture, setSavingLecture] = useState(false);

  /* Lectures and recordings are fetched independently: a failing recordings call
     must never leave the lecture list empty (and vice versa), otherwise a lecture
     that exists on the server looks like it was never created. */
  const loadExpandedChapter = useCallback(
    async (chapId: number, showSpinner = true) => {
      if (!token) return;
      if (showSpinner) setLoadingExpandedId(chapId);
      const [recsResult, lpsResult] = await Promise.allSettled([
        getTeacherSubjectRecordings(token, subjectId, chapId),
        getTeacherLearningPlans(token, subjectId, chapId),
      ]);

      if (recsResult.status === "fulfilled") {
        setExpandedRecordings((prev) => ({ ...prev, [chapId]: recsResult.value }));
      } else {
        console.error("Could not load recordings for chapter", chapId, recsResult.reason);
      }

      if (lpsResult.status === "fulfilled") {
        setExpandedLps((prev) => ({ ...prev, [chapId]: lpsResult.value }));
      } else {
        console.error("Could not load lectures for chapter", chapId, lpsResult.reason);
      }

      if (showSpinner) setLoadingExpandedId(null);
    },
    [token, subjectId],
  );

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const chaptersData = await getTeacherChapters(token, subjectId);
      setChapters(chaptersData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }

    // Cached lecture/recording lists go stale the moment a lecture is added on
    // another screen, so drop everything and refill the row that is open.
    const openChapterId = expandedChapterIdRef.current;
    setExpandedRecordings((prev) => (Object.keys(prev).length ? {} : prev));
    setExpandedLps((prev) => (Object.keys(prev).length ? {} : prev));
    if (openChapterId) {
      await loadExpandedChapter(openChapterId, false);
    }
  }, [token, subjectId, loadExpandedChapter]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const toggleExpandChapter = async (chapId: number) => {
    if (expandedChapterId === chapId) {
      setExpandedChapterId(null);
      expandedChapterIdRef.current = null;
      return;
    }
    setExpandedChapterId(chapId);
    expandedChapterIdRef.current = chapId;
    await loadExpandedChapter(chapId);
  };

  /* While a lecture's audio is still being transcribed/evaluated, refresh the open
     row so the status moves on its own and the report link shows up when ready. */
  useEffect(() => {
    if (!expandedChapterId) return;
    const recs = expandedRecordings[expandedChapterId] ?? [];
    const stillWorking = recs.some((r) => {
      const s = (r.status ?? "").toLowerCase();
      return s === "pending" || s === "processing";
    });
    if (!stillWorking) return;

    const timer = setInterval(() => {
      void loadExpandedChapter(expandedChapterId, false);
    }, 10000);
    return () => clearInterval(timer);
  }, [expandedChapterId, expandedRecordings, loadExpandedChapter]);

  const handleRetryRecording = useCallback(
    async (chapId: number, recordingId: number) => {
      if (!token) return;
      try {
        await retryRecording(token, recordingId);
        await loadExpandedChapter(chapId, false);
      } catch (err) {
        console.error("Could not re-queue recording", recordingId, err);
        Alert.alert(
          "Retry failed",
          err instanceof Error ? err.message : "Could not re-queue this recording.",
        );
      }
    },
    [token, loadExpandedChapter],
  );

  const handleCreateLecture = useCallback(
    async (payload: LearningPlanCreatePayload) => {
      if (!token || !lectureChapter) return;
      try {
        setSavingLecture(true);
        await createTeacherLearningPlan(token, subjectId, lectureChapter.id, payload);
        setLectureModalVisible(false);
        // Refresh the row that is open so the new lecture is visible right away.
        await loadExpandedChapter(lectureChapter.id, false);
        setLectureChapter(null);
      } catch (err) {
        console.error(err);
        Alert.alert(
          "Unable to add lecture",
          err instanceof Error ? err.message : "Could not create the lecture.",
        );
      } finally {
        setSavingLecture(false);
      }
    },
    [token, subjectId, lectureChapter, loadExpandedChapter],
  );

  const handleCreateChapter = useCallback(
    async (data: { name: string; description?: string }) => {
      if (!token) return;
      try {
        setCreating(true);
        await createTeacherChapter(token, subjectId, {
          name: data.name,
          description: data.description || null,
        });
        setEditorVisible(false);
        setEditing(false);
        setSelectedChapter(null);
        await loadData();
        Alert.alert("Success", "Chapter created successfully.");
      } catch (err) {
        Alert.alert(
          "Unable to create chapter",
          err instanceof Error
            ? err.message
            : "A chapter with this name already exists or something went wrong.",
        );
      } finally {
        setCreating(false);
      }
    },
    [token, subjectId, loadData],
  );

  const handleUpdateChapter = useCallback(
    async (data: { name: string; description?: string }) => {
      if (!token || !selectedChapter) return;
      try {
        setCreating(true);
        await updateTeacherChapter(token, selectedChapter.id, {
          name: data.name,
          description: data.description || null,
        });
        setEditorVisible(false);
        setEditing(false);
        setSelectedChapter(null);
        await loadData();
        Alert.alert("Success", "Chapter updated successfully.");
      } catch (err) {
        Alert.alert(
          "Unable to update chapter",
          err instanceof Error
            ? err.message
            : "Could not update the chapter.",
        );
      } finally {
        setCreating(false);
      }
    },
    [token, selectedChapter, loadData],
  );

  const handleDeleteChapter = useCallback(async () => {
    if (!token || !selectedChapter) return;
    try {
      setDeleting(true);
      await deleteTeacherChapter(token, selectedChapter.id);
      setConfirmVisible(false);
      setSelectedChapter(null);
      await loadData();
    } catch (error) {
      console.error(error);
      setConfirmVisible(false);
      const message =
        error instanceof Error ? error.message : "Unable to delete the chapter.";
      Alert.alert("Error", message);
    } finally {
      setDeleting(false);
    }
  }, [token, selectedChapter, loadData]);

  const filteredChapters = chapters.filter((chapter) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      chapter.name.toLowerCase().includes(query) ||
      (chapter.description ?? "").toLowerCase().includes(query);
    const matchesFilter =
      filter === "all"
        ? true
        : filter === "withPdf"
          ? chapter.document_count > 0
          : chapter.document_count === 0;
    return matchesSearch && matchesFilter;
  });

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <AdminNavbar title="Workspace" onBack={() => navigation.goBack()} />
      <View style={styles.flex}>
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.centerContainer}>
            <View style={styles.body}>
              <View style={styles.pageHeading}>
                <Text style={styles.pageTitle}>{subjectName}</Text>
                <Text style={styles.pageSubtitle}>Class {className} · Section {section}</Text>
              </View>

              {/* ── Workspace card ── */}
              <View style={styles.workspaceCard}>
              {/* Search */}
              <TextInput
                placeholder="Search chapter..."
                placeholderTextColor={AppTheme.colors.textPlaceholder}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={styles.search}
              />

              {/* Toolbar */}
              <View style={styles.toolbar}>
                <Pressable
                  style={styles.filterButton}
                  onPress={() => {
                    setFilter((prev) => {
                      if (prev === "all") return "withPdf";
                      if (prev === "withPdf") return "withoutPdf";
                      return "all";
                    });
                  }}
                >
                  <Ionicons
                    name="filter-outline"
                    size={14}
                    color={AppTheme.colors.textSecondary}
                  />
                  <Text style={styles.filterText}>
                    {filter === "all"
                      ? "All Chapters"
                      : filter === "withPdf"
                        ? "With PDF"
                        : "Without PDF"}
                  </Text>
                </Pressable>

                <View style={styles.toolbarActions}>
                  <Pressable
                    style={styles.importBtn}
                    onPress={() => setImportModalVisible(true)}
                  >
                    <Ionicons name="cloud-upload-outline" size={15} color={AppTheme.colors.primaryDark} />
                    <Text style={styles.importText}>Bulk Import</Text>
                  </Pressable>
                  <Pressable
                    style={styles.addButton}
                    onPress={() => setEditorVisible(true)}
                  >
                    <Ionicons name="add" size={18} color={AppTheme.colors.surface} />
                    <Text style={styles.addText}>Add Chapter</Text>
                  </Pressable>
                </View>
              </View>

              {/* Table */}
              <View style={styles.card}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ width: "100%" }}
                  contentContainerStyle={{ minWidth: "100%" }}
                >
                  <View style={[styles.tableWrapper, { width: "100%" }]}>
                  {/* Table header */}
                  <View style={styles.tableHeader}>
                    <Text style={[styles.headerCell, styles.colChapter]}>Chapter</Text>
                    <Text style={[styles.headerCell, styles.colPdf]}>PDF</Text>
                    <Text style={[styles.headerCell, styles.colStatus]}>Score</Text>
                    <Text style={[styles.headerCell, styles.colAction]}>Action</Text>
                  </View>

                  {loading ? (
                    <Text style={styles.loadingText}>Loading chapters...</Text>
                  ) : filteredChapters.length === 0 ? (
                    <View style={styles.emptyRow}>
                      <Ionicons name="layers-outline" size={32} color={AppTheme.colors.hint} />
                      <Text style={styles.emptyText}>
                        {searchQuery ? "No chapters match your search." : "No chapters yet. Add one to get started."}
                      </Text>
                    </View>
                  ) : (
                    filteredChapters.map((item) => {
                      const status = item.ai_status ?? "No Recording";
                      const statusStyle = getTeacherStatusStyle(status);
                      const isExpanded = expandedChapterId === item.id;
                      const recs = expandedRecordings[item.id] || [];
                      const lps = expandedLps[item.id] || [];
                      const isExLoading = loadingExpandedId === item.id;

                      return (
                        <View key={item.id}>
                          <View style={[styles.row, isExpanded && styles.rowExpanded]}>
                            {/* Chapter name */}
                            <Pressable
                              style={[styles.colChapter, styles.rowChapterCell]}
                              onPress={() => void toggleExpandChapter(item.id)}
                            >
                              <Ionicons
                                name={isExpanded ? "chevron-down" : "chevron-forward"}
                                size={16}
                                color={AppTheme.colors.primary}
                              />
                              <Text
                                style={[styles.chapterName, isExpanded && styles.chapterNameExpanded]}
                                numberOfLines={1}
                              >
                                {item.name}
                              </Text>
                            </Pressable>

                            {/* PDF */}
                            <View style={styles.colPdf}>
                              <Pressable
                                style={[
                                  styles.pdfButton,
                                  { backgroundColor: item.document_count ? AppTheme.colors.primaryLight : AppTheme.colors.background },
                                ]}
                                onPress={() => {
                                  navigation.navigate("TeacherChapterDetail", {
                                    chapterId: item.id,
                                    chapterName: item.name,
                                    subjectName,
                                    subjectId,
                                    openUpload: item.document_count === 0,
                                  });
                                }}
                              >
                                <Text
                                  style={[
                                    styles.pdfText,
                                    { color: item.document_count ? AppTheme.colors.primaryDark : AppTheme.colors.textSecondary },
                                  ]}
                                >
                                  {item.document_count ? "PDF" : "Add"}
                                </Text>
                              </Pressable>
                            </View>

                            {/* AI Status -> Average Score */}
                            <View style={styles.colStatus}>
                               <Text style={{ fontWeight: "800", color: getScoreColor(item.average_score) }}>
                                 {item.average_score != null ? `${Math.round(item.average_score)}%` : "—"}
                               </Text>
                            </View>

                            {/* Action */}
                            <View style={styles.colAction}>
                              <Pressable
                                style={styles.manageButton}
                                onPress={() => {
                                  setSelectedChapter(item);
                                  setActionSheetVisible(true);
                                }}
                              >
                                <Text style={styles.manageText}>Manage</Text>
                              </Pressable>
                            </View>
                          </View>

                          {/* Expanded detail */}
                          {isExpanded && (
                            <ExpandedChapterDetailView
                              chapterId={item.id}
                              chapterName={item.name}
                              subjectId={subjectId}
                              subjectName={subjectName}
                              recordings={recs}
                              learningPlans={lps}
                              loading={isExLoading}
                              role="teacher"
                              onAddRecording={(learningPlanId?: number, lectureTitle?: string) => {
                                navigation.navigate("TeacherRecording", {
                                  subjectId,
                                  subjectName,
                                  existingChapters: chapters.map((c) => c.name),
                                  chapterId: item.id,
                                  chapterName: item.name,
                                  learningPlanId,
                                  lectureTitle,
                                });
                              }}
                              onAddLearningPlan={() => {
                                setLectureChapter(item);
                                setLectureModalVisible(true);
                              }}
                              onAddDocument={() => {
                                navigation.navigate("TeacherChapterDetail", {
                                  chapterId: item.id,
                                  chapterName: item.name,
                                  subjectName,
                                  subjectId,
                                  openUpload: true,
                                });
                              }}
                              onViewRecordingReport={(rec) => {
                                navigation.navigate("RecordingDetail", {
                                  recording: rec,
                                  subjectName,
                                });
                              }}
                              onRetryRecording={(rec) => {
                                void handleRetryRecording(item.id, rec.id);
                              }}
                              onOpenChapterDetail={() => {
                                navigation.navigate("TeacherChapterDetail", {
                                  chapterId: item.id,
                                  chapterName: item.name,
                                  subjectName,
                                  subjectId,
                                });
                              }}
                            />
                          )}
                        </View>
                      );
                    })
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        </View>
      </View>
        </ScrollView>
      </View>

      {/* ── Modals ── */}
      <ImportLearningPlansModal
        visible={importModalVisible}
        role="teacher"
        subjectId={subjectId}
        token={token}
        onClose={() => setImportModalVisible(false)}
        onImported={() => { void loadData(); }}
      />

      <ChapterEditorModal
        visible={editorVisible}
        title={editing ? "Edit Chapter" : "Add Chapter"}
        submitText={editing ? "Save" : "Create"}
        loading={creating}
        initialName={editing ? selectedChapter?.name : ""}
        initialDescription={editing ? (selectedChapter?.description ?? "") : ""}
        onClose={() => {
          setEditorVisible(false);
          setEditing(false);
        }}
        onSave={editing ? handleUpdateChapter : handleCreateChapter}
      />

      <ChapterLearningPlanModal
        visible={lectureModalVisible}
        chapterName={lectureChapter?.name ?? ""}
        initialItem={null}
        loading={savingLecture}
        onClose={() => {
          setLectureModalVisible(false);
          setLectureChapter(null);
        }}
        onSave={handleCreateLecture}
      />

      <ChapterActionSheet
        visible={actionSheetVisible}
        chapterName={selectedChapter?.name}
        onClose={() => setActionSheetVisible(false)}
        onEdit={() => {
          setActionSheetVisible(false);
          setEditing(true);
          setEditorVisible(true);
        }}
        onOpenTab={(tab) => {
          if (!selectedChapter) return;
          setActionSheetVisible(false);
          navigation.navigate("TeacherChapterDetail", {
            chapterId: selectedChapter.id,
            chapterName: selectedChapter.name,
            subjectName,
            subjectId,
            initialTab: tab,
          });
        }}
        onDelete={() => {
          setActionSheetVisible(false);
          setConfirmVisible(true);
        }}
      />

      <ConfirmDialog
        visible={confirmVisible}
        title="Delete Chapter"
        message={
          selectedChapter
            ? `Are you sure you want to delete "${selectedChapter.name}"?\n\nThis action cannot be undone.`
            : ""
        }
        confirmText="Delete"
        destructive
        loading={deleting}
        onCancel={() => setConfirmVisible(false)}
        onConfirm={handleDeleteChapter}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppTheme.colors.background,
  },
  flex: { flex: 1 },
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

  // ── Scroll ──
  content: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
  },

  // ── Tab bar ──
  tabBar: {
    flexDirection: "row",
    width: "100%",
    backgroundColor: AppTheme.colors.surfaceMuted,
    borderRadius: AppTheme.radius.large,
    padding: 6,
    gap: 6,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: AppTheme.radius.medium,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: AppTheme.colors.surface,
    ...AppTheme.shadows.subtle,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: AppTheme.colors.textSecondary,
  },
  tabLabelActive: {
    color: AppTheme.colors.primaryDark,
    fontWeight: "700",
  },

  // ── Workspace card ──
  workspaceCard: {
    width: "100%",
    gap: AppTheme.spacing.l,
  },

  // ── Search & Toolbar ──
  search: {
    height: 48,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    borderRadius: AppTheme.radius.medium,
    paddingHorizontal: AppTheme.spacing.l,
    backgroundColor: AppTheme.colors.background,
    fontSize: 15,
    color: AppTheme.colors.textPrimary,
  },
  toolbar: {
    marginTop: AppTheme.spacing.l,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: AppTheme.spacing.l,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: AppTheme.spacing.l,
    height: 40,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.background,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  filterText: {
    fontWeight: "600",
    color: AppTheme.colors.textSecondary,
    fontSize: 13,
  },
  toolbarActions: {
    flexDirection: "row",
    gap: AppTheme.spacing.s,
  },
  importBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppTheme.colors.primaryLight,
    borderWidth: 1,
    borderColor: AppTheme.colors.primary,
    paddingHorizontal: AppTheme.spacing.m,
    paddingVertical: AppTheme.spacing.s,
    borderRadius: AppTheme.radius.medium,
    gap: 6,
  },
  importText: {
    color: AppTheme.colors.primaryDark,
    fontSize: 13,
    fontWeight: "700",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppTheme.colors.primary,
    paddingHorizontal: AppTheme.spacing.l,
    height: 40,
    borderRadius: AppTheme.radius.medium,
    gap: 4,
  },
  addText: {
    color: AppTheme.colors.surface,
    fontWeight: "700",
    fontSize: 14,
  },

  // ── Table ──
  card: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.large,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    paddingVertical: AppTheme.spacing.m,
  },
  tableWrapper: {
    borderWidth: 0,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: AppTheme.colors.background,
    paddingVertical: 12,
    paddingHorizontal: AppTheme.spacing.l,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.border,
  },
  headerCell: {
    fontWeight: "700",
    fontSize: 11,
    color: AppTheme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: AppTheme.spacing.l,
    paddingVertical: AppTheme.spacing.l,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.divider,
    backgroundColor: AppTheme.colors.surface,
  },
  rowExpanded: {
    backgroundColor: AppTheme.colors.primaryLight,
  },
  rowChapterCell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  chapterName: {
    flex: 1,
    fontWeight: "600",
    color: AppTheme.colors.textPrimary,
    fontSize: 14,
  },
  chapterNameExpanded: {
    color: AppTheme.colors.primary,
  },

  // Column widths
  colChapter:   { flex: 5 },
  colPdf:       { flex: 1, alignItems: "center" },
  colStatus:    { flex: 1, alignItems: "center" },
  colAction:    { flex: 1.2, alignItems: "center" },

  pdfButton: {
    minWidth: 54,
    height: 30,
    borderRadius: AppTheme.radius.small,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: AppTheme.spacing.s,
  },
  pdfText: { fontWeight: "700", fontSize: 12 },

  playCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: AppTheme.colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  aiBadge: {
    paddingVertical: 4,
    paddingHorizontal: AppTheme.spacing.s,
    borderRadius: AppTheme.radius.small,
    alignItems: "center",
  },
  aiText: { fontWeight: "600", fontSize: 11 },

  manageButton: {
    backgroundColor: AppTheme.colors.background,
    paddingHorizontal: AppTheme.spacing.m,
    paddingVertical: AppTheme.spacing.s,
    borderRadius: AppTheme.radius.small,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  manageText: {
    color: AppTheme.colors.textPrimary,
    fontWeight: "700",
    fontSize: 12,
  },

  // ── Empty / loading states ──
  loadingText: {
    paddingVertical: AppTheme.spacing.huge,
    textAlign: "center",
    color: AppTheme.colors.textSecondary,
    fontSize: 14,
  },
  emptyRow: {
    alignItems: "center",
    paddingVertical: AppTheme.spacing.huge,
    gap: AppTheme.spacing.s,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: AppTheme.colors.textPrimary,
  },
  emptyText: {
    fontSize: 14,
    color: AppTheme.colors.textSecondary,
    textAlign: "center",
  },

  // ── Students tab ──
  studentList: {
    gap: AppTheme.spacing.m,
  },
  rosterTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: AppTheme.colors.textPrimary,
    marginBottom: AppTheme.spacing.s,
  },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: AppTheme.spacing.m,
    backgroundColor: AppTheme.colors.background,
    borderRadius: AppTheme.radius.large,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  studentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppTheme.colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: AppTheme.spacing.m,
  },
  studentInitials: {
    fontWeight: "700",
    color: AppTheme.colors.primaryDark,
    fontSize: 14,
  },
  studentInfo: { flex: 1 },
  studentName: {
    fontSize: 15,
    fontWeight: "600",
    color: AppTheme.colors.textPrimary,
  },
  studentEmail: {
    fontSize: 13,
    color: AppTheme.colors.textSecondary,
    marginTop: 2,
  },
});
