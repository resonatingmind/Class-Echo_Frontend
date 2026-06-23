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
  getChapterDetails,
  getChapterKnowledge,
  getChapterDocuments,
  deleteChapterDocument,
  uploadChapterDocument,
} from '../lib/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { ChapterDocumentOut, ChapterKnowledgeOut, ChapterOut } from '../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'SchoolAdminChapterDetail'>;

type ActiveTab = 'profile' | 'documents' | 'metadata';

function statusStyle(status: string) {
  const norm = status.toLowerCase();
  if (norm === 'completed') {
    return { bg: '#E8F7EE', text: '#127A40', label: 'Completed' };
  } else if (norm === 'processing') {
    return { bg: '#FFF4E0', text: '#92400E', label: 'Processing' };
  } else if (norm === 'pending') {
    return { bg: colors.surfaceMuted, text: colors.textSecondary, label: 'Pending' };
  } else {
    return { bg: '#FFF1F1', text: '#B42318', label: 'Failed' };
  }
}

export function SchoolAdminChapterDetailScreen({ navigation, route }: Props) {
  const { session } = useAuth();
  const { chapterId, chapterName, subjectName } = route.params;

  const [chapter, setChapter] = useState<ChapterOut | null>(null);
  const [knowledge, setKnowledge] = useState<ChapterKnowledgeOut | null>(null);
  const [documents, setDocuments] = useState<ChapterDocumentOut[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const load = useCallback(
    async (silent = false) => {
      if (!session) return;
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        const [detailData, docsData] = await Promise.all([
          getChapterDetails(session.token, chapterId),
          getChapterDocuments(session.token, chapterId),
        ]);
        setChapter(detailData);
        setDocuments(docsData);

        // Attempt to fetch knowledge profile (might 404 if not generated yet)
        try {
          const kbData = await getChapterKnowledge(session.token, chapterId);
          setKnowledge(kbData);
        } catch (kbErr) {
          setKnowledge(null);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load chapter details.');
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [session, chapterId]
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  // Polling logic for PENDING/PROCESSING documents
  useEffect(() => {
    if (!session) return;
    const hasActiveTasks = documents.some(
      (doc) => doc.processing_status === 'PENDING' || doc.processing_status === 'PROCESSING'
    );
    if (!hasActiveTasks) return;

    const interval = setInterval(async () => {
      try {
        const docs = await getChapterDocuments(session.token, chapterId);
        setDocuments(docs);

        const stillActive = docs.some(
          (doc) => doc.processing_status === 'PENDING' || doc.processing_status === 'PROCESSING'
        );
        if (!stillActive) {
          // Completed processing! Refresh details and knowledge profile
          void load(true);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [documents, session, chapterId, load]);

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
          'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PPTX
          'text/plain', // TXT
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setUploading(true);
      setUploadProgress(0);

      try {
        await uploadChapterDocument(
          session!.token,
          chapterId,
          asset.uri,
          asset.mimeType || 'application/octet-stream',
          asset.name,
          setUploadProgress
        );
        void load(true);
        Alert.alert('Upload Success', `"${asset.name}" has been uploaded and is being processed.`);
      } catch (uploadErr) {
        Alert.alert('Upload Failed', uploadErr instanceof Error ? uploadErr.message : 'Upload failed.');
      } finally {
        setUploading(false);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not launch file picker.');
    }
  };

  const handleDeleteDocument = (doc: ChapterDocumentOut) => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${doc.file_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!session) return;
            try {
              await deleteChapterDocument(session.token, doc.id);
              void load(true);
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Could not delete document.');
            }
          },
        },
      ]
    );
  };

  const formattedDate = chapter
    ? new Date(chapter.updated_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons color={colors.textPrimary} name="arrow-back" size={22} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {chapterName}
        </Text>
        <Pressable onPress={() => void load(true)} style={styles.backBtn}>
          <Ionicons color={colors.textSecondary} name="refresh-outline" size={22} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            onRefresh={() => {
              setRefreshing(true);
              void load(true);
            }}
            refreshing={refreshing}
            tintColor={colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Area */}
        <View style={styles.hero}>
          <Text style={styles.heroKicker}>{subjectName.toUpperCase()}</Text>
          <Text style={styles.heroTitle}>{chapterName}</Text>
          {chapter?.description ? (
            <Text style={styles.heroDesc}>{chapter.description}</Text>
          ) : (
            <Text style={[styles.heroDesc, { fontStyle: 'italic' }]}>
              No description added for this chapter.
            </Text>
          )}

          <View style={styles.metaRow}>
            <View style={styles.metaBadge}>
              <Ionicons color={colors.accentDark} name="document-text" size={14} />
              <Text style={styles.metaBadgeText}>
                {chapter?.document_count ?? 0} reference files
              </Text>
            </View>
            {chapter && (
              <Text style={styles.metaDate}>Last updated: {formattedDate}</Text>
            )}
          </View>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <Pressable
            onPress={() => setActiveTab('profile')}
            style={[styles.tabButton, activeTab === 'profile' && styles.tabButtonActive]}
          >
            <Ionicons
              color={activeTab === 'profile' ? colors.accentDark : colors.textMuted}
              name="sparkles-outline"
              size={14}
            />
            <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>
              Knowledge Profile
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('documents')}
            style={[styles.tabButton, activeTab === 'documents' && styles.tabButtonActive]}
          >
            <Ionicons
              color={activeTab === 'documents' ? colors.accentDark : colors.textMuted}
              name="document-text-outline"
              size={14}
            />
            <Text style={[styles.tabText, activeTab === 'documents' && styles.tabTextActive]}>
              Documents
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('metadata')}
            style={[styles.tabButton, activeTab === 'metadata' && styles.tabButtonActive]}
          >
            <Ionicons
              color={activeTab === 'metadata' ? colors.accentDark : colors.textMuted}
              name="information-circle-outline"
              size={14}
            />
            <Text style={[styles.tabText, activeTab === 'metadata' && styles.tabTextActive]}>
              Details
            </Text>
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={styles.loadingText}>Loading chapter...</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Ionicons color={colors.textMuted} name="cloud-offline-outline" size={40} />
            <Text style={styles.emptyTitle}>Could not load details</Text>
            <Text style={styles.emptyBody}>{error}</Text>
          </View>
        ) : activeTab === 'profile' ? (
          !knowledge ? (
            <View style={styles.emptyKbContainer}>
              <View style={styles.emptyKbIconBox}>
                <Ionicons color={colors.textMuted} name="analytics-outline" size={32} />
              </View>
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
                  <Ionicons color={colors.accent} name="book" size={18} />
                  <Text style={styles.cardTitle}>Chapter Summary</Text>
                </View>
                <Text style={styles.cardBody}>{knowledge.chapter_summary}</Text>
              </View>

              {/* Learning Objectives */}
              {knowledge.learning_objectives?.length > 0 && (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Ionicons color={colors.accent} name="flag" size={18} />
                    <Text style={styles.cardTitle}>Learning Objectives</Text>
                  </View>
                  {knowledge.learning_objectives.map((obj, i) => (
                    <View key={i} style={styles.bulletRow}>
                      <Ionicons color={colors.accent} name="checkmark-circle-outline" size={16} style={{ marginTop: 2 }} />
                      <Text style={styles.bulletText}>{obj}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Key Concepts */}
              {knowledge.key_concepts?.length > 0 && (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Ionicons color={colors.accent} name="bulb" size={18} />
                    <Text style={styles.cardTitle}>Key Concepts</Text>
                  </View>
                  {knowledge.key_concepts.map((concept, i) => (
                    <View key={i} style={styles.bulletRow}>
                      <Ionicons color={colors.accent} name="star-outline" size={16} style={{ marginTop: 2 }} />
                      <Text style={styles.bulletText}>{concept}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Must-Cover Topics */}
              {knowledge.must_cover_topics?.length > 0 && (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Ionicons color={colors.accent} name="list-circle" size={18} />
                    <Text style={styles.cardTitle}>Must-Cover Syllabus Topics</Text>
                  </View>
                  {knowledge.must_cover_topics.map((topic, i) => (
                    <View key={topic} style={styles.bulletRow}>
                      <Ionicons color={colors.accent} name="checkbox-outline" size={16} style={{ marginTop: 2 }} />
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
                    <Text style={[styles.cardTitle, { color: '#B42318' }]}>
                      Common Misconceptions
                    </Text>
                  </View>
                  {knowledge.common_misconceptions.map((mis, i) => (
                    <View key={i} style={styles.bulletRow}>
                      <Ionicons color="#B42318" name="close-circle-outline" size={16} style={{ marginTop: 2 }} />
                      <Text style={[styles.bulletText, { color: '#7A1C1C' }]}>{mis}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )
        ) : activeTab === 'documents' ? (
          <View style={styles.docSection}>
            <View style={styles.docHeaderRow}>
              <Text style={styles.sectionTitle}>Reference Documents</Text>
              <Pressable
                disabled={uploading}
                onPress={handlePickDocument}
                style={[styles.uploadBtn, uploading && styles.btnDisabled]}
              >
                {uploading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons color="#fff" name="cloud-upload-outline" size={16} />
                )}
                <Text style={styles.uploadBtnText}>
                  {uploading ? `${uploadProgress}%` : 'Upload file'}
                </Text>
              </Pressable>
            </View>

            {documents.length === 0 ? (
              <View style={styles.emptyDocBox}>
                <Ionicons color={colors.textMuted} name="document-attach-outline" size={40} />
                <Text style={styles.emptyDocTitle}>No reference files</Text>
                <Text style={styles.emptyDocBody}>
                  Upload reading materials, syllabi, or lesson plans (PDF, DOCX, PPTX, TXT) to generate a knowledge profile.
                </Text>
              </View>
            ) : (
              <View style={styles.docList}>
                {documents.map((doc) => {
                  const s = statusStyle(doc.processing_status);
                  const uploadDate = new Date(doc.uploaded_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });

                  return (
                    <View key={doc.id} style={styles.docCard}>
                      <View style={styles.docCardIconBox}>
                        <Ionicons
                          color={colors.accent}
                          name={
                            doc.file_type.toLowerCase() === 'pdf'
                              ? 'document-outline'
                              : 'document-text-outline'
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
                        <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
                          <Text style={[styles.statusText, { color: s.text }]}>{s.label}</Text>
                        </View>
                        <Pressable
                          hitSlop={8}
                          onPress={() => handleDeleteDocument(doc)}
                          style={styles.trashBtn}
                        >
                          <Ionicons color="#B42318" name="trash-outline" size={16} />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.metadataList}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Chapter ID</Text>
              <Text style={styles.metaValue}>#{chapterId}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Subject Name</Text>
              <Text style={styles.metaValue}>{subjectName}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Date Created</Text>
              <Text style={styles.metaValue}>
                {chapter
                  ? new Date(chapter.created_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—'}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  scroll: { paddingBottom: 40 },

  // Hero Section
  hero: {
    backgroundColor: colors.surface,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  heroKicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: colors.accent,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  heroDesc: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
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
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accentDark,
  },
  metaDate: {
    fontSize: 12,
    color: colors.textMuted,
  },

  // Tab Selector
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: colors.surfaceMuted,
    padding: 4,
    borderRadius: 14,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.textPrimary,
  },

  // KB Content
  kbContent: {
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  warningCard: {
    backgroundColor: '#FFF1F1',
    borderColor: '#FECDCA',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
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
    color: colors.textSecondary,
  },

  // Documents Tab
  docSection: {
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 16,
  },
  docHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  uploadBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyDocBox: {
    alignItems: 'center',
    padding: 32,
    gap: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  emptyDocTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  emptyDocBody: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  docList: {
    gap: 12,
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 12,
    gap: 12,
  },
  docCardIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docCardContent: {
    flex: 1,
    gap: 2,
  },
  docCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  docCardMeta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  docCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trashBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFF1F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Metadata tab
  metadataList: {
    paddingHorizontal: 20,
    marginTop: 20,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  metaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  metaLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  // KB Empty State
  emptyKbContainer: {
    alignItems: 'center',
    padding: 32,
    gap: 12,
    marginTop: 32,
  },
  emptyKbIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyKbTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  emptyKbBody: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 16,
  },

  // Shared States
  center: { alignItems: 'center', padding: 40, gap: 12, marginTop: 40 },
  loadingText: { color: colors.textSecondary, fontSize: 14 },
  emptyTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  emptyBody: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  btnDisabled: { opacity: 0.6 },
});
