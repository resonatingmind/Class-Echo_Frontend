import { AppTheme } from '../theme/AppTheme';
import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import {
  getTeacherChapterDetails,
  getTeacherChapterKnowledge,
  getTeacherChapterDocuments,
  deleteTeacherChapterDocument,
  uploadTeacherChapterDocument,
  getTeacherLearningPlans,
  createTeacherLearningPlan,
  updateTeacherLearningPlan,
  deleteTeacherLearningPlan,
  importTeacherChapterLearningPlansPhoto,
} from "../lib/api";

import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import {
  ChapterDocumentOut,
  ChapterKnowledgeOut,
  ChapterOut,
  LearningPlanOut,
  LearningPlanCreatePayload,
} from '../types/api';
import { LearningPlanList } from "../components/teacher/LearningPlanList";
import { ChapterLearningPlanModal } from "../components/teacher/ChapterLearningPlanModal";
import { ScreenHeader } from "../components/common/ScreenHeader";
import { ConfirmDialog } from "../components/common/ConfirmDialog";

type Props = NativeStackScreenProps<RootStackParamList, "TeacherChapterDetail">;

type ActiveTab = 'planner' | 'profile' | 'documents';

function statusStyle(status: string) {
  const norm = status.toLowerCase();
  if (norm === 'completed') {
    return { bg: '#E8F7EE', text: '#127A40', label: 'Completed' };
  } else if (norm === 'processing') {
    return { bg: '#FFF4E0', text: '#92400E', label: 'Processing' };
  } else if (norm === 'pending') {
    return { bg: AppTheme.colors.surfaceMuted, text: AppTheme.colors.textSecondary, label: 'Pending' };
  } else {
    return { bg: '#FFF1F1', text: '#B42318', label: 'Failed' };
  }
}

export function TeacherChapterDetailScreen({ navigation, route }: Props) {
  const { session } = useAuth();
  const {
    chapterId,
    chapterName,
    subjectName,
    openUpload,
    initialTab,
  } = route.params;

  const [chapter, setChapter] = useState<ChapterOut | null>(null);
  const [knowledge, setKnowledge] = useState<ChapterKnowledgeOut | null>(null);
  const [documents, setDocuments] = useState<ChapterDocumentOut[]>([]);
  const [learningPlans, setLearningPlans] = useState<LearningPlanOut[]>([]);
  const [lpModalVisible, setLpModalVisible] = useState(false);
  const [selectedLpItem, setSelectedLpItem] = useState<LearningPlanOut | null>(null);
  const [savingLp, setSavingLp] = useState(false);
  const [deleteLpItem, setDeleteLpItem] = useState<LearningPlanOut | null>(null);
  const [deletingLp, setDeletingLp] = useState(false);

  const [activeTab, setActiveTab] = useState<ActiveTab>(
    initialTab || (openUpload ? "documents" : "planner"),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const load = useCallback(
    async (silent = false) => {
      if (!session) {
        return;
      }
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        const [detailData, docsData] = await Promise.all([
          getTeacherChapterDetails(session.token, chapterId),
          getTeacherChapterDocuments(session.token, chapterId),
        ]);
        setChapter(detailData);
        setDocuments(docsData);

        const subId = route.params.subjectId || detailData.subject_id;
        try {
          const lps = await getTeacherLearningPlans(
            session.token,
            subId,
            chapterId,
          );
          setLearningPlans(lps);
        } catch {
          setLearningPlans([]);
        }

        // Attempt to fetch knowledge profile (might 404 if not generated yet)
        try {
          const kbData = await getTeacherChapterKnowledge(
            session.token,
            chapterId,
          );
          setKnowledge(kbData);
        } catch (kbErr) {
          setKnowledge(null);
        }
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Could not load chapter details.",
        );
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [session, chapterId, route.params.subjectId],
  );

  const handleSaveLearningPlan = async (payload: LearningPlanCreatePayload) => {
    if (!session || !chapter) return;
    const subId = route.params.subjectId || chapter.subject_id;
    setSavingLp(true);
    try {
      if (selectedLpItem) {
        await updateTeacherLearningPlan(session.token, selectedLpItem.id, payload);
      } else {
        await createTeacherLearningPlan(session.token, subId, chapterId, payload);
      }
      setLpModalVisible(false);
      setSelectedLpItem(null);
      void load(true);
    } catch (e) {
      Alert.alert("Error", "Could not save Learning Plan entry.");
    } finally {
      setSavingLp(false);
    }
  };

  const handleDeleteLearningPlan = (item: LearningPlanOut) => {
    setDeleteLpItem(item);
  };

  const confirmDeleteLearningPlan = async () => {
    if (!session || !deleteLpItem) return;
    setDeletingLp(true);
    try {
      await deleteTeacherLearningPlan(session.token, deleteLpItem.id);
      void load(true);
      setDeleteLpItem(null);
    } catch (err) {
      Alert.alert("Error", "Could not delete item.");
    } finally {
      setDeletingLp(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Polling logic for PENDING/PROCESSING documents
  useEffect(() => {
    if (!session) {
      return;
    }
    const hasActiveTasks = documents.some(
      (doc) =>
        doc.processing_status === "PENDING" ||
        doc.processing_status === "PROCESSING",
    );
    if (!hasActiveTasks) return;

    const interval = setInterval(async () => {
      try {
        const docs = await getTeacherChapterDocuments(session.token, chapterId);
        setDocuments(docs);

        const stillActive = docs.some(
          (doc) =>
            doc.processing_status === "PENDING" ||
            doc.processing_status === "PROCESSING",
        );
        if (!stillActive) {
          // Completed processing! Refresh details and knowledge profile
          void load(true);
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [documents, session, chapterId, load]);

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
          "application/vnd.openxmlformats-officedocument.presentationml.presentation", // PPTX
          "text/plain", // TXT
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setUploading(true);
      setUploadProgress(0);

      try {
        await uploadTeacherChapterDocument(
          session!.token,
          chapterId,
          asset.uri,
          asset.mimeType || "application/octet-stream",
          asset.name,
          setUploadProgress,
        );
        void load(true);
        Alert.alert(
          "Upload Success",
          `"${asset.name}" has been uploaded and is being processed.`,
        );
      } catch (uploadErr) {
        Alert.alert(
          "Upload Failed",
          uploadErr instanceof Error ? uploadErr.message : "Upload failed.",
        );
      } finally {
        setUploading(false);
      }
    } catch (e) {
      Alert.alert("Error", "Could not launch file picker.");
    }
  };



  const handleDeleteDocument = (doc: ChapterDocumentOut) => {
    Alert.alert(
      "Delete Document",
      `Are you sure you want to delete "${doc.file_name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!session) {
              return;
            }
            try {
              await deleteTeacherChapterDocument(session.token, doc.id);
              void load(true);
            } catch (err) {
              Alert.alert(
                "Error",
                err instanceof Error
                  ? err.message
                  : "Could not delete document.",
              );
            }
          },
        },
      ],
    );
  };

  const formattedDate = chapter
    ? new Date(chapter.updated_at).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>
      <ScreenHeader
        title={chapterName}
        subtitle={subjectName}
        onBack={() => navigation.goBack()}
        rightActions={
          <Pressable onPress={() => void load(true)} hitSlop={8}>
            <Ionicons color={AppTheme.colors.textSecondary} name="refresh-outline" size={22} />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            onRefresh={() => {
              setRefreshing(true);
              void load(true);
            }}
            refreshing={refreshing}
            tintColor={AppTheme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.centerContainer}>
          <View style={styles.body}>
            {/* Hero Area */}
            <View style={styles.hero}>
              <Text style={styles.heroKicker}>{subjectName.toUpperCase()}</Text>
              <Text style={styles.heroTitle}>{chapterName}</Text>
              {chapter?.description ? (
                <Text style={styles.heroDesc}>{chapter.description}</Text>
              ) : (
                <Text style={[styles.heroDesc, { fontStyle: "italic" }]}>
                  No description added for this chapter.
                </Text>
              )}

              <View style={styles.metaRow}>
                <View style={styles.metaBadge}>
                  <Ionicons
                    color={AppTheme.colors.primaryDark}
                    name="document-text"
                    size={14}
                  />
                  <Text style={styles.metaBadgeText}>
                    {chapter?.document_count ?? 0} reference files
                  </Text>
                </View>
                {chapter && (
                  <Text style={styles.metaDate}>Last updated: {formattedDate}</Text>
                )}
              </View>
            </View>

            {/* Tab Selector - Full Width */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ width: "100%" }}
              contentContainerStyle={{ width: "100%", minWidth: "100%" }}
            >
              <View style={styles.tabContainer}>
                <Pressable
                  onPress={() => setActiveTab("planner")}
                  style={[
                    styles.tabButton,
                    activeTab === "planner" && styles.tabButtonActive,
                  ]}
                >
                  <Ionicons
                    color={
                      activeTab === "planner" ? AppTheme.colors.primaryDark : AppTheme.colors.textSecondary
                    }
                    name="calendar-outline"
                    size={14}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === "planner" && styles.tabTextActive,
                    ]}
                  >
                    Lecture Planner
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setActiveTab("profile")}
                  style={[
                    styles.tabButton,
                    activeTab === "profile" && styles.tabButtonActive,
                  ]}
                >
                  <Ionicons
                    color={
                      activeTab === "profile" ? AppTheme.colors.primaryDark : AppTheme.colors.textSecondary
                    }
                    name="sparkles-outline"
                    size={14}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === "profile" && styles.tabTextActive,
                    ]}
                  >
                    Knowledge Profile
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setActiveTab("documents")}
                  style={[
                    styles.tabButton,
                    activeTab === "documents" && styles.tabButtonActive,
                  ]}
                >
                  <Ionicons
                    color={
                      activeTab === "documents" ? AppTheme.colors.primaryDark : AppTheme.colors.textSecondary
                    }
                    name="document-text-outline"
                    size={14}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === "documents" && styles.tabTextActive,
                    ]}
                  >
                    Documents
                  </Text>
                </Pressable>
              </View>
            </ScrollView>

            {isLoading ? (
              <View style={styles.center}>
                <ActivityIndicator color={AppTheme.colors.primary} size="large" />
                <Text style={styles.loadingText}>Loading chapter...</Text>
              </View>
            ) : error ? (
              <View style={styles.center}>
                <Ionicons
                  color={AppTheme.colors.textSecondary}
                  name="cloud-offline-outline"
                  size={40}
                />
                <Text style={styles.emptyTitle}>Could not load details</Text>
                <Text style={styles.emptyBody}>{error}</Text>
              </View>
            ) : activeTab === "planner" ? (
              <View style={styles.plannerSection}>
                <View style={styles.plannerHeaderRow}>
                  <View style={styles.plannerHeaderTitles}>
                    <Text style={styles.sectionTitle}>Planned Lectures</Text>
                    <Text style={styles.plannerSub}>
                      {learningPlans.length} {learningPlans.length === 1 ? 'lecture' : 'lectures'} total
                    </Text>
                  </View>
                  <Pressable
                    style={styles.addPlanBtn}
                    onPress={() => {
                      setSelectedLpItem(null);
                      setLpModalVisible(true);
                    }}
                  >
                    <Ionicons name="add" size={16} color="#fff" />
                    <Text style={styles.addPlanText}>Add Entry</Text>
                  </Pressable>
                </View>

                <LearningPlanList
                  items={learningPlans}
                  onEditItem={(item) => {
                    setSelectedLpItem(item);
                    setLpModalVisible(true);
                  }}
                  onDeleteItem={handleDeleteLearningPlan}
                />
              </View>
            ) : activeTab === "profile" ? (
              !knowledge ? (
                <View style={styles.emptyKbContainer}>
                  <Ionicons color="#94A3B8" name="analytics-outline" size={40} />
                  <Text style={styles.emptyKbTitle}>No Knowledge Profile Yet</Text>
                  <Text style={styles.emptyKbBody}>
                    Upload reference documents (PDF, DOCX, PPTX, or TXT) to automatically construct a structured chapter knowledge profile using AI.
                  </Text>
                </View>
              ) : (
                <View style={styles.kbContent}>
                  {/* Summary Card */}
                  <View style={styles.card}>
                    <View style={styles.cardHeader}>
                      <Ionicons color={AppTheme.colors.primary} name="book" size={18} />
                      <Text style={styles.cardTitle}>Chapter Summary</Text>
                    </View>
                    <Text style={styles.cardBody}>{knowledge.chapter_summary}</Text>
                  </View>

                  {/* Learning Objectives */}
                  {knowledge.learning_objectives?.length > 0 && (
                    <View style={styles.card}>
                      <View style={styles.cardHeader}>
                        <Ionicons color={AppTheme.colors.primary} name="flag" size={18} />
                        <Text style={styles.cardTitle}>Learning Objectives</Text>
                      </View>
                      {knowledge.learning_objectives.map((obj, i) => (
                        <View key={i} style={styles.bulletRow}>
                          <Ionicons
                            color={AppTheme.colors.primary}
                            name="checkmark-circle-outline"
                            size={16}
                            style={{ marginTop: 2 }}
                          />
                          <Text style={styles.bulletText}>{obj}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Key Concepts */}
                  {knowledge.key_concepts?.length > 0 && (
                    <View style={styles.card}>
                      <View style={styles.cardHeader}>
                        <Ionicons color={AppTheme.colors.primary} name="bulb" size={18} />
                        <Text style={styles.cardTitle}>Key Concepts</Text>
                      </View>
                      {knowledge.key_concepts.map((concept, i) => (
                        <View key={i} style={styles.bulletRow}>
                          <Ionicons
                            color={AppTheme.colors.primary}
                            name="star-outline"
                            size={16}
                            style={{ marginTop: 2 }}
                          />
                          <Text style={styles.bulletText}>{concept}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Must-Cover Topics */}
                  {knowledge.must_cover_topics?.length > 0 && (
                    <View style={styles.card}>
                      <View style={styles.cardHeader}>
                        <Ionicons
                          color={AppTheme.colors.primary}
                          name="list-circle"
                          size={18}
                        />
                        <Text style={styles.cardTitle}>
                          Must-Cover Syllabus Topics
                        </Text>
                      </View>
                      {knowledge.must_cover_topics.map((topic, i) => (
                        <View key={topic} style={styles.bulletRow}>
                          <Ionicons
                            color={AppTheme.colors.primary}
                            name="checkbox-outline"
                            size={16}
                            style={{ marginTop: 2 }}
                          />
                          <Text style={styles.bulletText}>{topic}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Common Misconceptions */}
                  {knowledge.common_misconceptions?.length > 0 && (
                    <View style={[styles.card, styles.warningCard]}>
                      <View style={styles.cardHeader}>
                        <Ionicons color="#B42318" name="alert-circle" size={18} />
                        <Text style={[styles.cardTitle, { color: "#B42318" }]}>
                          Common Misconceptions
                        </Text>
                      </View>
                      {knowledge.common_misconceptions.map((mis, i) => (
                        <View key={i} style={styles.bulletRow}>
                          <Ionicons
                            color="#B42318"
                            name="close-circle-outline"
                            size={16}
                            style={{ marginTop: 2 }}
                          />
                          <Text style={[styles.bulletText, { color: "#7A1C1C" }]}>
                            {mis}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )
            ) : (
              <View style={styles.docSection}>
                <View style={styles.plannerHeaderRow}>
                  <View style={styles.plannerHeaderTitles}>
                    <Text style={styles.sectionTitle}>Reference Documents</Text>
                    <Text style={styles.plannerSub}>
                      {documents.length} {documents.length === 1 ? 'file' : 'files'} total
                    </Text>
                  </View>
                  <Pressable
                    disabled={uploading}
                    onPress={handlePickDocument}
                    style={[styles.addPlanBtn, uploading && styles.btnDisabled]}
                  >
                    {uploading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Ionicons
                        color="#fff"
                        name="cloud-upload-outline"
                        size={16}
                      />
                    )}
                    <Text style={styles.addPlanText}>
                      {uploading ? `${uploadProgress}%` : "Upload File"}
                    </Text>
                  </Pressable>
                </View>

                {documents.length === 0 ? (
                  <View style={styles.emptyDocBox}>
                    <Ionicons color="#94A3B8" name="document-attach-outline" size={40} />
                    <Text style={styles.emptyDocTitle}>No reference files</Text>
                    <Text style={styles.emptyDocBody}>
                      Upload reading materials, syllabi, or lesson plans (PDF, DOCX, PPTX, TXT) to generate a knowledge profile.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.docList}>
                    {documents.map((doc) => {
                      const s = statusStyle(doc.processing_status);
                      const uploadDate = new Date(
                        doc.uploaded_at,
                      ).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      });

                      return (
                        <View key={doc.id} style={styles.docCard}>
                          <View style={styles.docCardIconBox}>
                            <Ionicons
                              color={AppTheme.colors.primary}
                              name={
                                doc.file_type.toLowerCase() === "pdf"
                                  ? "document-outline"
                                  : "document-text-outline"
                              }
                              size={20}
                            />
                          </View>
                          <View style={styles.docCardContent}>
                            <Text numberOfLines={1} style={styles.docCardTitle}>
                              {doc.file_name}
                            </Text>
                            <Text style={styles.docCardMeta}>
                              {doc.file_type} · {uploadDate}
                            </Text>
                          </View>
                          <View style={styles.docCardRight}>
                            <View
                              style={[
                                styles.statusBadge,
                                { backgroundColor: s.bg },
                              ]}
                            >
                              <Text style={[styles.statusText, { color: s.text }]}>
                                {s.label}
                              </Text>
                            </View>
                            <Pressable
                              hitSlop={8}
                              onPress={() => handleDeleteDocument(doc)}
                              style={styles.trashBtn}
                            >
                              <Ionicons
                                color="#B42318"
                                name="trash-outline"
                                size={16}
                              />
                            </Pressable>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <ChapterLearningPlanModal
        visible={lpModalVisible}
        chapterName={chapterName}
        initialItem={selectedLpItem}
        loading={savingLp}
        onClose={() => {
          setLpModalVisible(false);
          setSelectedLpItem(null);
        }}
        onSave={handleSaveLearningPlan}
      />



      <ConfirmDialog
        visible={!!deleteLpItem}
        title="Delete Lecture Planner Entry"
        message={`Are you sure you want to delete "${deleteLpItem?.sub_topic}"? This action cannot be undone.`}
        confirmText="Delete"
        destructive={true}
        loading={deletingLp}
        onConfirm={confirmDeleteLearningPlan}
        onCancel={() => setDeleteLpItem(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppTheme.colors.background },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: AppTheme.spacing.l,
    paddingVertical: AppTheme.spacing.l,
  },
  body: {
    width: "100%",
    maxWidth: 800,
    gap: AppTheme.spacing.l,
  },
  plannerSection: {
    paddingHorizontal: 0,
    marginTop: 0,
    gap: 16,
  },
  plannerHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  plannerHeaderTitles: {
    flex: 1,
  },
  plannerSub: {
    fontSize: 13,
    color: AppTheme.colors.textSecondary,
    marginTop: 2,
  },
  importPhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: AppTheme.radius.small,
    gap: 6,
  },
  importPhotoText: {
    color: "#0284C7",
    fontFamily: AppTheme.typography.family.bold,
    fontSize: 13,
  },
  addPlanBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0284C7",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: AppTheme.radius.small,
    gap: 6,
  },
  addPlanText: {
    color: "#fff",
    fontFamily: AppTheme.typography.family.bold,
    fontSize: 13,
  },

  scroll: { paddingBottom: 40, flexGrow: 1 },

  // Hero Section
  hero: {
    gap: 8,
    marginBottom: AppTheme.spacing.xs,
  },
  heroKicker: {
    fontSize: 11,
    fontFamily: AppTheme.typography.family.bold,
    letterSpacing: 1.1,
    color: AppTheme.colors.primary,
  },
  heroTitle: {
    fontSize: 26,
    fontFamily: AppTheme.typography.family.bold,
    color: AppTheme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  heroDesc: {
    fontSize: 14,
    lineHeight: 20,
    color: AppTheme.colors.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: AppTheme.colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: AppTheme.radius.small,
  },
  metaBadgeText: {
    fontSize: 12,
    fontFamily: AppTheme.typography.family.bold,
    color: AppTheme.colors.primaryDark,
  },
  metaDate: {
    fontSize: 12,
    color: AppTheme.colors.textSecondary,
  },

  // Tab Selector
  tabContainer: {
    flexDirection: "row",
    backgroundColor: AppTheme.colors.surfaceMuted,
    padding: 4,
    borderRadius: AppTheme.radius.large,
    gap: 4,
    width: '100%',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: AppTheme.radius.medium,
  },
  tabButtonActive: {
    backgroundColor: AppTheme.colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  tabText: {
    fontSize: 12,
    fontFamily: AppTheme.typography.family.bold,
    color: AppTheme.colors.textSecondary,
  },
  tabTextActive: {
    color: AppTheme.colors.textPrimary,
  },

  // KB Content
  kbContent: {
    paddingHorizontal: 0,
    marginTop: 20,
    gap: 16,
  },
  card: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: 16,
    gap: 12,
  },
  warningCard: {
    backgroundColor: '#FFF1F1',
    borderColor: '#FECDCA', // light red border — no AppTheme equivalent
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: AppTheme.typography.family.bold,
    color: AppTheme.colors.textPrimary,
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 20,
    color: AppTheme.colors.textSecondary,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: AppTheme.colors.textSecondary,
  },

  // Documents Tab
  docSection: {
    paddingHorizontal: 0,
    marginTop: 0,
    gap: 16,
  },
  docHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: AppTheme.typography.family.bold,
    color: AppTheme.colors.textPrimary,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: AppTheme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: AppTheme.radius.medium,
  },
  uploadBtnText: {
    color: AppTheme.colors.surface,
    fontSize: 13,
    fontFamily: AppTheme.typography.family.bold,
  },
  emptyDocBox: {
    alignItems: 'center',
    padding: 32,
    gap: 12,
    borderWidth: 1.5,
    borderColor: AppTheme.colors.border,
    borderStyle: 'dashed',
    borderRadius: 16,
    backgroundColor: AppTheme.colors.surface,
  },
  emptyDocTitle: {
    fontSize: 16,
    fontFamily: AppTheme.typography.family.bold,
    color: AppTheme.colors.textPrimary,
  },
  emptyDocBody: {
    fontSize: 13,
    lineHeight: 18,
    color: AppTheme.colors.textSecondary,
    textAlign: 'center',
    maxWidth: 400,
  },
  docList: {
    gap: 12,
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppTheme.colors.surface,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    borderRadius: 16,
    padding: 12,
    gap: 12,
  },
  docCardIconBox: {
    width: 40,
    height: 40,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docCardContent: {
    flex: 1,
    gap: 2,
  },
  docCardTitle: {
    fontSize: 14,
    fontFamily: AppTheme.typography.family.bold,
    color: AppTheme.colors.textPrimary,
  },
  docCardMeta: {
    fontSize: 12,
    color: AppTheme.colors.textSecondary,
  },
  docCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trashBtn: {
    width: 32,
    height: 32,
    borderRadius: AppTheme.radius.small,
    backgroundColor: '#FFF1F1', // soft red — intentional semantic color
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: AppTheme.radius.small,
  },
  statusText: {
    fontSize: 11,
    fontFamily: AppTheme.typography.family.bold,
  },



  // KB Empty State
  emptyKbContainer: {
    alignItems: 'center',
    padding: 32,
    gap: 12,
    borderWidth: 1.5,
    borderColor: AppTheme.colors.border,
    borderStyle: 'dashed',
    borderRadius: 16,
    backgroundColor: AppTheme.colors.surface,
  },
  emptyKbTitle: {
    fontSize: 16,
    fontFamily: AppTheme.typography.family.bold,
    color: AppTheme.colors.textPrimary,
  },
  emptyKbBody: {
    fontSize: 13,
    lineHeight: 18,
    color: AppTheme.colors.textSecondary,
    textAlign: 'center',
    maxWidth: 400,
  },

  // Shared States
  center: { alignItems: 'center', padding: 40, gap: 12, marginTop: 40 },
  loadingText: { color: AppTheme.colors.textSecondary, fontSize: 14 },
  emptyTitle: { color: AppTheme.colors.textPrimary, fontSize: 18, fontWeight: '700' },
  emptyBody: { color: AppTheme.colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  btnDisabled: { opacity: 0.6 },
});


