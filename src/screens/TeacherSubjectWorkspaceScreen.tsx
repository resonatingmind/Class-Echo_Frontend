import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useCallback, useEffect, useState } from "react";
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
  getTeacherSubjectStudents,
} from "../lib/api";
import { ChapterOut, LearningPlanOut, RecordingWithReport, StudentOut } from "../types/api";
import { getTeacherStatusStyle } from "../components/teacher/teacherStatusStyles";
import { ExpandedChapterDetailView } from "../components/ExpandedChapterDetailView";

type Props = NativeStackScreenProps<
  RootStackParamList,
  "TeacherSubjectWorkspace"
>;

export function TeacherSubjectWorkspaceScreen({ navigation, route }: Props) {
  const { subjectId, subjectName, className, section } = route.params;
  const { session } = useAuth();
  const token = session?.token ?? "";

  const [chapters, setChapters] = useState<ChapterOut[]>([]);
  const [students, setStudents] = useState<StudentOut[]>([]);
  const [activeTab, setActiveTab] = useState<"chapters" | "students">("chapters");
  const [loading, setLoading] = useState(true);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [editorVisible, setEditorVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<ChapterOut | null>(
    null,
  );
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [editing, setEditing] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "withPdf" | "withoutPdf">("all");

  // Expanded chapter row state
  const [expandedChapterId, setExpandedChapterId] = useState<number | null>(null);
  const [expandedRecordings, setExpandedRecordings] = useState<Record<number, RecordingWithReport[]>>({});
  const [expandedLps, setExpandedLps] = useState<Record<number, LearningPlanOut[]>>({});
  const [loadingExpandedId, setLoadingExpandedId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const [chaptersData, studentsData] = await Promise.all([
        getTeacherChapters(token, subjectId),
        getTeacherSubjectStudents(token, subjectId),
      ]);
      setChapters(chaptersData);
      setStudents(studentsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token, subjectId]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const toggleExpandChapter = async (chapId: number) => {
    if (expandedChapterId === chapId) {
      setExpandedChapterId(null);
      return;
    }
    setExpandedChapterId(chapId);
    if (!token) return;
    setLoadingExpandedId(chapId);
    try {
      const [recs, lps] = await Promise.all([
        getTeacherSubjectRecordings(token, subjectId, chapId),
        getTeacherLearningPlans(token, subjectId, chapId),
      ]);
      setExpandedRecordings((prev) => ({ ...prev, [chapId]: recs }));
      setExpandedLps((prev) => ({ ...prev, [chapId]: lps }));
    } catch (err) {
      console.error("Could not load expanded details", err);
    } finally {
      setLoadingExpandedId(null);
    }
  };

  const handleCreateChapter = useCallback(
    async (data: { name: string; description: string }) => {
      if (!token) return;
      try {
        setCreating(true);
        await createTeacherChapter(token, subjectId, {
          name: data.name,
          description: data.description || null,
        });
        setEditing(false);
        setSelectedChapter(null);
        await loadData();
      } catch (error) {
        Alert.alert(
          "Unable to create chapter",
          "A chapter with this name already exists or something went wrong.",
        );
      } finally {
        setCreating(false);
      }
    },
    [token, subjectId, loadData],
  );

  const handleUpdateChapter = useCallback(
    async (data: { name: string; description: string }) => {
      if (!token || !selectedChapter) return;
      try {
        setCreating(true);
        await updateTeacherChapter(token, selectedChapter.id, {
          name: data.name,
          description: data.description || null,
        });
        setEditing(false);
        setEditorVisible(false);
        await loadData();
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
        error instanceof Error
          ? error.message
          : "Unable to delete the chapter.";
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
    <SafeAreaView style={styles.safe}>
      {/* Header Container */}
      <View style={styles.header}>
        <View style={styles.headerCenteredContent}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={22} color={AppTheme.colors.textPrimary} />
          </Pressable>
          <View style={styles.headerTextWrapper}>
            <Text style={styles.subject}>{subjectName}</Text>
            <Text style={styles.subtitle}>
              Class {className} • Section {section}
            </Text>
          </View>
        </View>
      </View>

      {/* Main Content Body - Smooth Vertical Scroll */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.tabBar}>
          <Pressable
            style={[styles.tabButton, activeTab === "chapters" && styles.tabButtonActive]}
            onPress={() => setActiveTab("chapters")}
          >
            <Text style={[styles.tabLabel, activeTab === "chapters" && styles.tabLabelActive]}>
              Chapters
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabButton, activeTab === "students" && styles.tabButtonActive]}
            onPress={() => setActiveTab("students")}
          >
            <Text style={[styles.tabLabel, activeTab === "students" && styles.tabLabelActive]}>
              Students
            </Text>
          </Pressable>
        </View>

        <View style={styles.workspaceCard}>
          {activeTab === "chapters" ? (
            <>
              <TextInput
                placeholder="Search chapter..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={styles.search}
              />

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
              <Text style={styles.filterText}>
                {filter === "all"
                  ? "All Chapters"
                  : filter === "withPdf"
                    ? "With PDF"
                    : "Without PDF"}
              </Text>
            </Pressable>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                style={styles.importBtn}
                onPress={() => setImportModalVisible(true)}
              >
                <Ionicons name="cloud-upload-outline" size={15} color={AppTheme.colors.primary} />
                <Text style={styles.importText}>Bulk Import</Text>
              </Pressable>
              <Pressable
                style={styles.addButton}
                onPress={() => setEditorVisible(true)}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.addText}>Add Chapter</Text>
              </Pressable>
            </View>
          </View>

          {/* Full Width Responsive Table Framework */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ width: "100%" }}
            contentContainerStyle={{ minWidth: "100%" }}
          >
            <View style={[styles.tableWrapper, { width: "100%" }]}>
              <View style={styles.tableHeader}>
                <Text style={[styles.headerCell, styles.chapterColumn]}>
                  Chapter
                </Text>
                <Text style={[styles.headerCell, styles.pdfColumn]}>PDF</Text>
                <Text style={[styles.headerCell, styles.recordingColumn]}>
                  Recordings
                </Text>
                <Text style={[styles.headerCell, styles.statusColumn]}>Status</Text>
                <Text style={[styles.headerCell, styles.actionColumn]}>
                  Action
                </Text>
              </View>

              {loading ? (
                <Text style={styles.loadingText}>Loading chapters...</Text>
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
                      <View style={[styles.row, isExpanded && { backgroundColor: "#F0F9FF" }]}>
                        <Pressable
                          style={[styles.chapterColumn, { flexDirection: "row", alignItems: "center", gap: 4 }]}
                          onPress={() => void toggleExpandChapter(item.id)}
                        >
                          <Ionicons
                            name={isExpanded ? "chevron-down" : "chevron-forward"}
                            size={16}
                            color="#0284C7"
                          />
                          <Text
                            style={[
                              styles.boldText,
                              { flex: 1, color: isExpanded ? "#0284C7" : "#0F172A" },
                            ]}
                            numberOfLines={1}
                          >
                            {item.name}
                          </Text>
                        </Pressable>

                        <View style={styles.pdfColumn}>
                          <Pressable
                            style={[
                              styles.pdfButton,
                              {
                                backgroundColor: item.document_count
                                  ? "#E0F2FE"
                                  : "#F8FAFC",
                              },
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
                                {
                                  color: item.document_count
                                    ? "#0284C7"
                                    : "#64748B",
                                },
                              ]}
                            >
                              {item.document_count ? "PDF" : "Add"}
                            </Text>
                          </Pressable>
                        </View>

                        <View style={styles.recordingColumn}>
                          <Pressable
                            onPress={() => void toggleExpandChapter(item.id)}
                            style={styles.recordingPlayCircle}
                          >
                            <Ionicons
                              name={isExpanded ? "chevron-up" : "play"}
                              size={14}
                              color="#0284C7"
                              style={{ marginLeft: isExpanded ? 0 : 2 }}
                            />
                          </Pressable>
                        </View>

                        <View style={styles.statusColumn}>
                          <View
                            style={[
                              styles.aiBadge,
                              { backgroundColor: statusStyle.bg },
                            ]}
                          >
                            <Text
                              style={[styles.aiText, { color: statusStyle.text }]}
                            >
                              {status}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.actionColumn}>
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

                      {isExpanded ? (
                        <ExpandedChapterDetailView
                          chapterId={item.id}
                          chapterName={item.name}
                          subjectId={subjectId}
                          subjectName={subjectName}
                          recordings={recs}
                          learningPlans={lps}
                          loading={isExLoading}
                          role="teacher"
                          onAddRecording={() => {
                            navigation.navigate("TeacherRecording", {
                              subjectId,
                              subjectName,
                              existingChapters: chapters.map((c) => c.name),
                              chapterId: item.id,
                              chapterName: item.name,
                            });
                          }}
                          onAddLearningPlan={() => {
                            navigation.navigate("TeacherChapterDetail", {
                              chapterId: item.id,
                              chapterName: item.name,
                              subjectName,
                              subjectId,
                            });
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
                          onOpenChapterDetail={() => {
                            navigation.navigate("TeacherChapterDetail", {
                              chapterId: item.id,
                              chapterName: item.name,
                              subjectName,
                              subjectId,
                            });
                          }}
                        />
                      ) : null}
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
            </>
          ) : (
            <View style={{ width: "100%" }}>
              {students.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 40, gap: 10 }}>
                  <Ionicons name="people-outline" size={40} color={AppTheme.colors.textSecondary} />
                  <Text style={{ fontSize: 16, fontWeight: "600", color: AppTheme.colors.textPrimary }}>
                    No students enrolled
                  </Text>
                  <Text style={{ fontSize: 14, color: AppTheme.colors.textSecondary }}>
                    Students in this class will appear here.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: AppTheme.colors.textPrimary, marginBottom: 8 }}>
                    Class Roster ({students.length})
                  </Text>
                  {students.map((student) => {
                    const initials = student.name
                      .split(' ')
                      .map((word) => word[0] ?? '')
                      .join('')
                      .toUpperCase()
                      .slice(0, 2);
                    return (
                      <View key={student.id} style={{ flexDirection: "row", alignItems: "center", padding: 12, backgroundColor: "#F8FAFC", borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0" }}>
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#E0F2FE", justifyContent: "center", alignItems: "center", marginRight: 12 }}>
                          <Text style={{ fontWeight: "700", color: "#0284C7" }}>{initials}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 15, fontWeight: "600", color: "#0F172A" }}>{student.name}</Text>
                          <Text style={{ fontSize: 13, color: "#64748B" }}>{student.email}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <ImportLearningPlansModal
        visible={importModalVisible}
        role="teacher"
        subjectId={subjectId}
        token={token}
        onClose={() => setImportModalVisible(false)}
        onImported={() => {
          void loadData();
        }}
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

      <ChapterActionSheet
        visible={actionSheetVisible}
        chapterName={selectedChapter?.name}
        onClose={() => setActionSheetVisible(false)}
        onEdit={() => {
          setActionSheetVisible(false);
          setEditing(true);
          setEditorVisible(true);
        }}
        onReferenceMaterial={() => {
          if (!selectedChapter) return;
          setActionSheetVisible(false);
          navigation.navigate("TeacherChapterDetail", {
            chapterId: selectedChapter.id,
            chapterName: selectedChapter.name,
            subjectName,
            subjectId,
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
    backgroundColor: "#F8FAFC",
  },
  header: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  headerCenteredContent: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: 1280,
    width: "100%",
    alignSelf: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTextWrapper: { marginLeft: 16, flex: 1 },
  subject: { fontSize: 24, fontWeight: "800", color: "#0F172A" },
  subtitle: { marginTop: 2, fontSize: 14, color: "#64748B", fontWeight: "500" },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    alignItems: "center",
    paddingBottom: 48,
  },
  tabBar: {
    flexDirection: "row",
    width: "100%",
    maxWidth: 1280,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  tabLabelActive: {
    color: "#0F172A",
    fontWeight: "700",
  },
  workspaceCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    width: "100%",
    maxWidth: 1280,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  search: {
    height: 48,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: AppTheme.radius.medium,
    paddingHorizontal: 16,
    backgroundColor: "#F8FAFC",
    fontSize: 15,
    color: "#0F172A",
  },
  toolbar: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  filterButton: {
    paddingHorizontal: 16,
    height: 40,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
  },
  filterText: { fontWeight: "600", color: "#334155", fontSize: 14 },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0284C7",
    paddingHorizontal: 16,
    height: 42,
    borderRadius: AppTheme.radius.medium,
  },
  addText: { color: "#fff", marginLeft: 6, fontWeight: "700", fontSize: 14 },
  importBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppTheme.colors.primaryLight,
    borderWidth: 1,
    borderColor: AppTheme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: AppTheme.radius.medium,
    gap: 6,
  },
  importText: {
    color: AppTheme.colors.primaryDark,
    fontSize: 13,
    fontWeight: "700",
  },
  tableWrapper: {
    borderRadius: AppTheme.radius.medium,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerCell: {
    fontWeight: "700",
    fontSize: 13,
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    backgroundColor: "#fff",
  },
  cell: { fontSize: 14, color: "#0F172A" },
  boldText: { fontWeight: "600", color: "#1E293B" },
  mutedText: { color: "#64748B" },
  pdfButton: {
    minWidth: 64,
    height: 32,
    borderRadius: AppTheme.radius.small,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  pdfText: { fontWeight: "700", fontSize: 12 },
  aiBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  aiText: { fontWeight: "600", fontSize: 12, color: "#64748B" },
  manageButton: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: AppTheme.radius.small,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  manageText: { color: "#334155", fontWeight: "700", fontSize: 13 },
  chapterColumn: { flex: 4.5 },
  pdfColumn: { flex: 1, alignItems: "center", textAlign: "center" },
  recordingColumn: { flex: 1.2, alignItems: "center", textAlign: "center" },
  statusColumn: { flex: 1.2, alignItems: "center", textAlign: "center" },
  actionColumn: { flex: 1, alignItems: "center", textAlign: "center" },
  recordingPlayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    paddingVertical: 40,
    textAlign: "center",
    color: "#64748B",
    fontSize: 14,
  },
});
