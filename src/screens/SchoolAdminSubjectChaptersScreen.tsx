import { AppTheme } from '../theme/AppTheme';
import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import {
  createChapter,
  deleteChapter,
  getChapterRecordings,
  getChapters,
  getSchoolLearningPlans,
  updateChapter,
  getPlannerSubjectDetail,
} from '../lib/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { ChapterOut, LearningPlanOut, RecordingWithReport, PlannerSubjectDetail } from '../types/api';
import { ExpandedChapterDetailView } from '../components/ExpandedChapterDetailView';
import { AdminNavbar } from '../components/common/AdminNavbar';
import { PlannerDetailHeader } from '../components/plannerDetail/PlannerDetailHeader';
import { PlannerStatistics } from '../components/plannerDetail/PlannerStatistics';
import { PlannerChapterProgress } from '../components/plannerDetail/PlannerChapterProgress';

type Props = NativeStackScreenProps<RootStackParamList, 'SchoolAdminSubjectChapters'>;

// ── Create/Edit Chapter Modal ──────────────────────────────────────────────────

function ChapterModal({
  visible,
  chapter,
  existingChapters,
  onClose,
  onSaved,
}: {
  visible: boolean;
  chapter: ChapterOut | null;
  existingChapters: ChapterOut[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { session } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize values when opening
  useFocusEffect(
    useCallback(() => {
      if (visible) {
        setName(chapter ? chapter.name : '');
        setDescription(chapter ? (chapter.description || '') : '');
        setError(null);
      }
    }, [visible, chapter])
  );

  const handleSave = async () => {
    if (!session || submitting) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Chapter Name is required.');
      return;
    }

    // Duplicate Prevention Check
    const isDuplicate = existingChapters.some(
      (c) =>
        c.name.toLowerCase() === trimmedName.toLowerCase() &&
        (!chapter || c.id !== chapter.id)
    );

    if (isDuplicate) {
      setError('A chapter with this name already exists.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (chapter) {
        // Edit Mode
        await updateChapter(session.token, chapter.id, {
          name: trimmedName,
          description: description.trim() || null,
        });
      } else {
        // Create Mode
        // We need subjectId. How do we pass it?
        // Wait, since this modal is inline inside the screen, we can access subjectId from the parent component context or pass it in.
        // Let's pass it in or fetch it from the component state.
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save chapter.');
    } finally {
      setSubmitting(false);
    }
  };

  return null; // Dummy to build structure
}

export function SchoolAdminSubjectChaptersScreen({ navigation, route }: Props) {
  const { session } = useAuth();
  const { subjectId, subjectName } = route.params;

  const [chapters, setChapters] = useState<ChapterOut[]>([]);
  const [plannerDetail, setPlannerDetail] = useState<PlannerSubjectDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingChapter, setEditingChapter] = useState<ChapterOut | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Expanded Chapter Nested Sub-Table State
  const [expandedChapterId, setExpandedChapterId] = useState<number | null>(null);
  const [expandedRecordings, setExpandedRecordings] = useState<Record<number, any[]>>({});
  const [expandedLps, setExpandedLps] = useState<Record<number, LearningPlanOut[]>>({});
  const [loadingExpandedId, setLoadingExpandedId] = useState<number | null>(null);

  const toggleExpandChapter = async (chapterId: number) => {
    if (!session) return;
    if (expandedChapterId === chapterId) {
      setExpandedChapterId(null);
      return;
    }
    setExpandedChapterId(chapterId);
    if (!expandedRecordings[chapterId]) {
      setLoadingExpandedId(chapterId);
      try {
        const [recs, lps] = await Promise.all([
          getChapterRecordings(session.token, chapterId),
          getSchoolLearningPlans(session.token, subjectId, chapterId),
        ]);
        setExpandedRecordings((prev) => ({ ...prev, [chapterId]: recs }));
        setExpandedLps((prev) => ({ ...prev, [chapterId]: lps }));
      } catch (e) {
        console.warn("Failed to fetch expanded chapter details:", e);
      } finally {
        setLoadingExpandedId(null);
      }
    }
  };

  const load = useCallback(
    async (silent = false) => {
      if (!session) return;
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        const [chaptersData, plannerData] = await Promise.all([
          getChapters(session.token, subjectId),
          getPlannerSubjectDetail(session.token, subjectId).catch(() => null),
        ]);
        setChapters(chaptersData);
        setPlannerDetail(plannerData);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load chapters.');
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [session, subjectId]
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const openCreateModal = () => {
    setEditingChapter(null);
    setName('');
    setDescription('');
    setModalError(null);
    setModalVisible(true);
  };

  const openEditModal = (chapter: ChapterOut) => {
    setEditingChapter(chapter);
    setName(chapter.name);
    setDescription(chapter.description || '');
    setModalError(null);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!session || submitting) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setModalError('Chapter Name is required.');
      return;
    }

    // Duplicate Prevention Check
    const isDuplicate = chapters.some(
      (c) =>
        c.name.toLowerCase() === trimmedName.toLowerCase() &&
        (!editingChapter || c.id !== editingChapter.id)
    );

    if (isDuplicate) {
      setModalError('A chapter with this name already exists.');
      return;
    }

    setSubmitting(true);
    setModalError(null);

    try {
      if (editingChapter) {
        await updateChapter(session.token, editingChapter.id, {
          name: trimmedName,
          description: description.trim() || null,
        });
      } else {
        await createChapter(session.token, subjectId, {
          name: trimmedName,
          description: description.trim() || null,
        });
      }
      setModalVisible(false);
      void load(true);
    } catch (e) {
      setModalError(e instanceof Error ? e.message : 'Failed to save chapter.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (chapter: ChapterOut) => {
    Alert.alert(
      'Delete Chapter',
      `Are you sure you want to delete "${chapter.name}"? This action cannot be undone and will delete all documents and recordings under it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!session) return;
            try {
              await deleteChapter(session.token, chapter.id);
              void load(true);
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Could not delete chapter.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      <AdminNavbar
        title={subjectName}
        onBack={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate("SchoolAdminClasses");
          }
        }}
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
            <View style={styles.pageHeading}>
              <Text style={styles.kicker}>SUBJECT CURRICULUM</Text>
              <View style={styles.titleRow}>
                <Text style={styles.pageTitle}>{subjectName}</Text>
                <Pressable
                  onPress={openCreateModal}
                  style={styles.addChapterBtn}
                >
                  <Ionicons color="#fff" name="add" size={14} />
                  <Text style={styles.addChapterText}>Add Chapter</Text>
                </Pressable>
              </View>
              <Text style={styles.pageSubtitle}>
                Manage and view chapters, reference materials, and lesson profiles.
              </Text>
            </View>

            {plannerDetail ? (
              <View style={{ gap: AppTheme.spacing.l, marginBottom: AppTheme.spacing.m }}>
                <PlannerDetailHeader
                  subjectName={plannerDetail.subject_name}
                  className={plannerDetail.class_name}
                  teacherName={plannerDetail.teacher_name}
                  academicYear={plannerDetail.academic_year}
                />
                <PlannerStatistics statistics={plannerDetail.statistics} />
                <PlannerChapterProgress
                  completed={
                    plannerDetail.chapters.filter((chapter) => chapter.status === "Completed").length
                  }
                  total={plannerDetail.chapters.length}
                />
              </View>
            ) : null}


        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={AppTheme.colors.primary} size="large" />
            <Text style={styles.loadingText}>Loading chapters…</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Ionicons color={AppTheme.colors.textSecondary} name="cloud-offline-outline" size={40} />
            <Text style={styles.emptyTitle}>Could not load chapters</Text>
            <Text style={styles.emptyBody}>{error}</Text>
          </View>
        ) : chapters.length === 0 ? (
          <View style={styles.center}>
            <Ionicons color={AppTheme.colors.textSecondary} name="journal-outline" size={40} />
            <Text style={styles.emptyTitle}>No chapters yet</Text>
            <Text style={styles.emptyBody}>Create a chapter to begin adding curriculum materials.</Text>
            <Pressable onPress={openCreateModal} style={styles.createBtnInline}>
              <Ionicons color="#fff" name="add" size={16} />
              <Text style={styles.createBtnInlineText}>Add Chapter</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.chapterList}>
            {chapters.map((chapter) => {
              const lastUpdatedStr = new Date(chapter.updated_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              const isExpanded = expandedChapterId === chapter.id;
              const recs = expandedRecordings[chapter.id] || [];
              const lps = expandedLps[chapter.id] || [];
              const isExLoading = loadingExpandedId === chapter.id;

              return (
                <View key={chapter.id} style={{ gap: 8 }}>
                  <Pressable
                    onPress={() =>
                      navigation.navigate('SchoolAdminChapterDetail', {
                        chapterId: chapter.id,
                        chapterName: chapter.name,
                        subjectName,
                        subjectId,
                      })
                    }
                    style={styles.chapterCard}
                  >
                    <View style={styles.chapterCardHeader}>
                      <View style={styles.chapterInfoWrap}>
                        <Text style={styles.chapterName}>{chapter.name}</Text>
                        {chapter.description ? (
                          <Text style={styles.chapterDesc} numberOfLines={2}>
                            {chapter.description}
                          </Text>
                        ) : (
                          <Text style={[styles.chapterDesc, { fontStyle: 'italic' }]}>
                            No description provided.
                          </Text>
                        )}
                      </View>
                      <View style={styles.chapterActions}>
                        <Pressable
                          hitSlop={8}
                          onPress={() => openEditModal(chapter)}
                          style={styles.actionIconBtn}
                        >
                          <Ionicons color={AppTheme.colors.textSecondary} name="create-outline" size={18} />
                        </Pressable>
                        <Pressable
                          hitSlop={8}
                          onPress={() => handleDelete(chapter)}
                          style={styles.actionIconBtn}
                        >
                          <Ionicons color="#B42318" name="trash-outline" size={18} />
                        </Pressable>
                      </View>
                    </View>

                    <View style={styles.chapterDivider} />

                    <View style={styles.chapterCardFooter}>
                      <View style={styles.footerStat}>
                        <Ionicons color={AppTheme.colors.textSecondary} name="document-text-outline" size={14} />
                        <Text style={styles.footerStatText}>
                          {chapter.document_count ?? 0} { (chapter.document_count === 1) ? 'document' : 'documents' }
                        </Text>
                      </View>

                      <Pressable
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                          paddingVertical: 4,
                          paddingHorizontal: 10,
                          borderRadius: AppTheme.radius.small,
                          backgroundColor: isExpanded ? "#E0F2FE" : "#F1F5F9",
                        }}
                        onPress={(e) => {
                          e.stopPropagation();
                          void toggleExpandChapter(chapter.id);
                        }}
                      >
                        <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color="#0284C7" />
                        <Text style={{ fontSize: 12, fontWeight: "700", color: "#0284C7" }}>
                          {isExpanded ? "Hide Lectures" : "View Lectures & Sub-Table"}
                        </Text>
                      </Pressable>

                      <Text style={styles.footerDate}>Updated {lastUpdatedStr}</Text>
                    </View>
                  </Pressable>

                  {isExpanded ? (
                    <ExpandedChapterDetailView
                      chapterId={chapter.id}
                      chapterName={chapter.name}
                      subjectId={subjectId}
                      subjectName={subjectName}
                      recordings={recs}
                      learningPlans={lps}
                      loading={isExLoading}
                      role="school_admin"
                      onViewRecordingReport={(rec) => {
                        navigation.navigate("RecordingDetail", {
                          recording: rec,
                          subjectName,
                        });
                      }}
                      onOpenChapterDetail={() => {
                        navigation.navigate("SchoolAdminChapterDetail", {
                          chapterId: chapter.id,
                          chapterName: chapter.name,
                          subjectName,
                          subjectId,
                        });
                      }}
                    />
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
          </View>
        </View>
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
        transparent
        visible={modalVisible}
      >
        <Pressable onPress={() => setModalVisible(false)} style={styles.modalOverlay}>
          <Pressable style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingChapter ? 'Edit Chapter' : 'Create Chapter'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {editingChapter
                ? 'Update the details for this chapter.'
                : 'Add a new chapter to organize reference files and recordings.'}
            </Text>

            <View style={styles.modalField}>
              <Text style={styles.modalFieldLabel}>CHAPTER NAME *</Text>
              <TextInput
                autoCapitalize="words"
                autoFocus
                onChangeText={setName}
                placeholder="e.g. Chemical Reactions, Trigonometry…"
                placeholderTextColor={AppTheme.colors.textPlaceholder}
                style={[styles.modalInput, modalError ? { borderColor: '#B42318' } : {}]}
                value={name}
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalFieldLabel}>DESCRIPTION</Text>
              <TextInput
                autoCapitalize="sentences"
                multiline
                numberOfLines={3}
                onChangeText={setDescription}
                placeholder="Provide a brief summary of concepts covered..."
                placeholderTextColor={AppTheme.colors.textPlaceholder}
                style={[styles.modalInput, styles.descriptionInput]}
                value={description}
              />
            </View>

            {modalError ? (
              <View style={styles.modalErrorBox}>
                <Ionicons color="#B42318" name="alert-circle-outline" size={16} />
                <Text style={styles.modalErrorText}>{modalError}</Text>
              </View>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable onPress={() => setModalVisible(false)} style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={submitting}
                onPress={handleSave}
                style={[styles.modalSubmitBtn, submitting && styles.btnDisabled]}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>
                    {editingChapter ? 'Save' : 'Create'}
                  </Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppTheme.colors.background },
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

  // Page heading
  pageHeading: {
    gap: AppTheme.spacing.s,
    marginBottom: AppTheme.spacing.xs,
  },
  kicker: {
    color: AppTheme.colors.primary,
    ...AppTheme.typography.caption,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  pageTitle: {
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.heading1,
  },
  pageSubtitle: {
    color: AppTheme.colors.textSecondary,
    ...AppTheme.typography.body,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 4,
  },
  addChapterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: 'flex-start'
  },
  addChapterText: { color: "#fff", ...AppTheme.typography.body, fontWeight: "700" },

  // Chapter List
  chapterList: { gap: 16 },
  chapterCard: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.large,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: AppTheme.spacing.xl,
    gap: 12,
    ...AppTheme.shadows.subtle,
  },
  chapterCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  chapterInfoWrap: { flex: 1, gap: 4 },
  chapterName: {
    ...AppTheme.typography.bodyLarge,
    fontWeight: '700',
    color: AppTheme.colors.textPrimary,
  },
  chapterDesc: {
    ...AppTheme.typography.body,
    color: AppTheme.colors.textSecondary,
  },
  chapterActions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  actionIconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: AppTheme.radius.small,
    backgroundColor: AppTheme.colors.surfaceMuted,
  },
  chapterDivider: {
    height: 1,
    backgroundColor: AppTheme.colors.border,
  },
  chapterCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerStatText: {
    ...AppTheme.typography.caption,
    fontWeight: '600',
    color: AppTheme.colors.textSecondary,
  },
  footerDate: {
    ...AppTheme.typography.caption,
    color: AppTheme.colors.textSecondary,
    fontStyle: 'italic',
  },

  // State Views
  center: { alignItems: 'center', padding: 40, gap: 12, marginTop: 40 },
  loadingText: { color: AppTheme.colors.textSecondary, ...AppTheme.typography.body },
  emptyTitle: { color: AppTheme.colors.textPrimary, ...AppTheme.typography.bodyLarge, fontWeight: '700' },
  emptyBody: { color: AppTheme.colors.textSecondary, ...AppTheme.typography.body, textAlign: 'center', paddingHorizontal: 20 },
  createBtnInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: AppTheme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: AppTheme.radius.medium,
    marginTop: 8,
  },
  createBtnInlineText: { color: '#fff', ...AppTheme.typography.body, fontWeight: '700' },

  // Modals
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
  modalTitle: { color: AppTheme.colors.textPrimary, ...AppTheme.typography.heading3 },
  modalSubtitle: { color: AppTheme.colors.textSecondary, ...AppTheme.typography.body },
  modalField: { gap: 8 },
  modalFieldLabel: {
    color: AppTheme.colors.textSecondary,
    ...AppTheme.typography.caption,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  modalInput: {
    height: 52,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.background,
    borderWidth: 1.5,
    borderColor: AppTheme.colors.border,
    paddingHorizontal: 16,
    ...AppTheme.typography.bodyLarge,
    color: AppTheme.colors.textPrimary,
  },
  descriptionInput: {
    height: 90,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  modalErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF1F1',
    borderRadius: AppTheme.radius.medium,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalErrorText: { color: '#B42318', ...AppTheme.typography.body, flex: 1, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  modalCancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: AppTheme.radius.medium,
    borderWidth: 1.5,
    borderColor: AppTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: { color: AppTheme.colors.textSecondary, ...AppTheme.typography.button },
  modalSubmitBtn: {
    flex: 1,
    height: 50,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.45 },
  modalSubmitText: { color: '#fff', ...AppTheme.typography.button },
});

