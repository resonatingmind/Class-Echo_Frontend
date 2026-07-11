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
  getChapters,
  createChapter,
  deleteChapter,
  getSchoolChapterRecordings,
} from '../lib/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { ChapterOut, RecordingWithReport } from '../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'SchoolAdminChapterView'>;

function scoreColor(score: number | null) {
  if (score === null) return { text: colors.textMuted, bg: colors.surfaceMuted };
  if (score >= 80) return { text: '#127A40', bg: '#E8F7EE' };
  if (score >= 60) return { text: '#92400E', bg: '#FFF4E0' };
  return { text: '#B42318', bg: '#FFF1F1' };
}

function ChapterRow({
  chapter,
  partNo,
  onPdfPress,
  onRecordingPress,
  avgScore,
}: {
  chapter: ChapterOut;
  partNo: number;
  onPdfPress: () => void;
  onRecordingPress: () => void;
  avgScore: number | null;
}) {
  const sc = scoreColor(avgScore);
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Text style={styles.chapterName}>{chapter.name}</Text>
        <Text style={styles.partLabel}>Part {partNo}</Text>
      </View>
      <Pressable onPress={onPdfPress} style={styles.pdfBtn}>
        <Ionicons color={colors.accent} name="document-text" size={14} />
        <Text style={styles.pdfBtnText}>PDF</Text>
        <Ionicons color={colors.accent} name="add" size={14} />
      </Pressable>
      <Pressable onPress={onRecordingPress} style={styles.playBtn}>
        <Ionicons color="#fff" name="play" size={14} />
      </Pressable>
      <View style={[styles.scorePill, { backgroundColor: sc.bg }]}>
        <Text style={[styles.scoreText, { color: sc.text }]}>
          {avgScore !== null ? `${Math.round(avgScore)}%` : '—'}
        </Text>
      </View>
    </View>
  );
}

export function SchoolAdminChapterScreen({ navigation, route }: Props) {
  const { session } = useAuth();
  const { subjectId, subjectName, section, className, teacherName, year } = route.params;

  const [chapters, setChapters] = useState<ChapterOut[]>([]);
  const [chapterScores, setChapterScores] = useState<Record<number, number | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create chapter modal
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!session) return;
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        const data = await getChapters(session.token, subjectId);
        setChapters(data);

        // Fetch avg scores for each chapter
        const scores: Record<number, number | null> = {};
        await Promise.allSettled(
          data.map(async (ch) => {
            try {
              const recs = await getSchoolChapterRecordings(session.token, ch.id);
              const completed = recs.filter(
                (r) => r.report?.overall_score !== null && r.report?.overall_score !== undefined,
              );
              if (completed.length > 0) {
                const avg =
                  completed.reduce((sum, r) => sum + (r.report?.overall_score ?? 0), 0) /
                  completed.length;
                scores[ch.id] = Math.round(avg * 10) / 10;
              } else {
                scores[ch.id] = null;
              }
            } catch {
              scores[ch.id] = null;
            }
          }),
        );
        setChapterScores(scores);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load chapters.');
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [session, subjectId],
  );

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const openCreateModal = () => {
    setNewName('');
    setNewDesc('');
    setModalError(null);
    setModalVisible(true);
  };

  const handleCreateChapter = async () => {
    if (!session || submitting) return;
    if (!newName.trim()) { setModalError('Chapter name is required.'); return; }

    setSubmitting(true);
    setModalError(null);
    try {
      await createChapter(session.token, subjectId, {
        name: newName.trim(),
        description: newDesc.trim() || null,
      });
      setModalVisible(false);
      void load(true);
    } catch (e) {
      setModalError(e instanceof Error ? e.message : 'Failed to create chapter.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteChapter = (ch: ChapterOut) => {
    Alert.alert('Delete Chapter', `Delete "${ch.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!session) return;
          try {
            await deleteChapter(session.token, ch.id);
            void load(true);
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Could not delete.');
          }
        },
      },
    ]);
  };

  const subtitle = [className && `Class ${className}`, section && `Section ${section}`, teacherName, year]
    .filter(Boolean)
    .join(' · ');

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons color={colors.textPrimary} name="arrow-back" size={22} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{subjectName}</Text>
          {Boolean(subtitle) && (
            <Text style={styles.headerSubtitle} numberOfLines={1}>{subtitle}</Text>
          )}
        </View>
        <Pressable onPress={openCreateModal} style={styles.addBtn}>
          <Ionicons color={colors.accent} name="add" size={24} />
        </Pressable>
      </View>

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.thCell, { flex: 1 }]}>CHAPTER</Text>
        <Text style={[styles.thCell, { width: 36 }]}>PT</Text>
        <Text style={[styles.thCell, { width: 70 }]}>REF</Text>
        <Text style={[styles.thCell, { width: 40 }]}>REC</Text>
        <Text style={[styles.thCell, { width: 56 }]}>SCORE</Text>
        <Text style={[styles.thCell, { width: 32 }]}></Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.loadingText}>Loading chapters…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons color={colors.textMuted} name="cloud-offline-outline" size={40} />
          <Text style={styles.emptyTitle}>Could not load</Text>
          <Text style={styles.emptyBody}>{error}</Text>
          <Pressable onPress={() => void load()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              onRefresh={() => { setRefreshing(true); void load(true); }}
              refreshing={refreshing}
              tintColor={colors.accent}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {chapters.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons color={colors.textMuted} name="journal-outline" size={44} />
              <Text style={styles.emptyTitle}>No chapters yet</Text>
              <Text style={styles.emptyBody}>Tap + to add the first chapter.</Text>
              <Pressable onPress={openCreateModal} style={styles.addInlineBtn}>
                <Ionicons color="#fff" name="add" size={16} />
                <Text style={styles.addInlineBtnText}>Add Chapter</Text>
              </Pressable>
            </View>
          ) : (
            chapters.map((ch, idx) => (
              <View key={ch.id} style={styles.rowWrap}>
                <ChapterRow
                  chapter={ch}
                  partNo={idx + 1}
                  avgScore={chapterScores[ch.id] ?? null}
                  onPdfPress={() =>
                    navigation.navigate('ReferenceMaterial', {
                      chapterId: ch.id,
                      chapterName: ch.name,
                    })
                  }
                  onRecordingPress={() =>
                    navigation.navigate('SchoolAdminChapterRecordings', {
                      chapterId: ch.id,
                      chapterName: ch.name,
                      subjectName,
                    })
                  }
                />
                <Pressable
                  onPress={() => handleDeleteChapter(ch)}
                  hitSlop={8}
                  style={styles.deleteRowBtn}
                >
                  <Ionicons color="#B42318" name="trash-outline" size={16} />
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Create Chapter Modal */}
      <Modal animationType="slide" onRequestClose={() => setModalVisible(false)} transparent visible={modalVisible}>
        <Pressable onPress={() => setModalVisible(false)} style={styles.overlay}>
          <Pressable style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Add Chapter</Text>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>CHAPTER NAME *</Text>
              <TextInput
                autoCapitalize="words"
                autoFocus
                onChangeText={setNewName}
                placeholder="e.g. Linear Algebra, Photosynthesis"
                placeholderTextColor={colors.textPlaceholder}
                style={styles.input}
                value={newName}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>DESCRIPTION</Text>
              <TextInput
                autoCapitalize="sentences"
                multiline
                numberOfLines={3}
                onChangeText={setNewDesc}
                placeholder="Optional description…"
                placeholderTextColor={colors.textPlaceholder}
                style={[styles.input, styles.textArea]}
                value={newDesc}
              />
            </View>

            {modalError ? (
              <View style={styles.errorBox}>
                <Ionicons color="#B42318" name="alert-circle-outline" size={16} />
                <Text style={styles.errorText}>{modalError}</Text>
              </View>
            ) : null}

            <View style={styles.sheetActions}>
              <Pressable onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={submitting}
                onPress={handleCreateChapter}
                style={[styles.saveBtn, submitting && styles.btnDisabled]}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveText}>Create</Text>
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
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center', gap: 2 },
  headerTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  headerSubtitle: { color: colors.textMuted, fontSize: 11 },
  addBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  // Table
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
    gap: 4,
  },
  thCell: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8 },

  listContent: { paddingBottom: 40 },

  rowWrap: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
  },
  rowLeft: { flex: 1, gap: 2 },
  chapterName: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  partLabel: { color: colors.textMuted, fontSize: 11 },
  pdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.accentSoft,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    width: 70,
    justifyContent: 'center',
  },
  pdfBtnText: { color: colors.accent, fontSize: 11, fontWeight: '700' },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scorePill: {
    width: 48,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  scoreText: { fontSize: 12, fontWeight: '700' },
  deleteRowBtn: { paddingRight: 16, paddingVertical: 12 },

  // States
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  emptyState: { alignItems: 'center', padding: 40, gap: 12 },
  loadingText: { color: colors.textSecondary, fontSize: 14 },
  emptyTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  emptyBody: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },
  retryBtn: { backgroundColor: colors.accentSoft, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: colors.accentDark, fontWeight: '700', fontSize: 14 },
  addInlineBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.accent, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, marginTop: 4 },
  addInlineBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, gap: 16 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 4 },
  sheetTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '800' },
  field: { gap: 6 },
  fieldLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  input: { height: 50, borderRadius: 12, backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 14, fontSize: 15, color: colors.textPrimary },
  textArea: { height: 80, paddingTop: 12, textAlignVertical: 'top' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF1F1', borderRadius: 10, padding: 12 },
  errorText: { color: '#B42318', fontSize: 13, flex: 1, fontWeight: '600' },
  sheetActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, height: 50, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.textSecondary, fontWeight: '600', fontSize: 15 },
  saveBtn: { flex: 1, height: 50, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  btnDisabled: { opacity: 0.45 },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
