import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
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
  getTeacherChapters,
  getTeacherChapterRecordings,
} from '../lib/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { ChapterOut, RecordingWithReport } from '../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'TeacherChapterView'>;

function scoreColor(score: number | null) {
  if (score === null) return { text: colors.textMuted, bg: colors.surfaceMuted };
  if (score >= 80) return { text: '#127A40', bg: '#E8F7EE' };
  if (score >= 60) return { text: '#92400E', bg: '#FFF4E0' };
  return { text: '#B42318', bg: '#FFF1F1' };
}

export function TeacherChapterScreen({ navigation, route }: Props) {
  const { session } = useAuth();
  const { subjectId, subjectName, section, className } = route.params;

  const [chapters, setChapters] = useState<ChapterOut[]>([]);
  const [chapterScores, setChapterScores] = useState<Record<number, number | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!session) return;
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        const data = await getTeacherChapters(session.token, subjectId);
        setChapters(data);

        const scores: Record<number, number | null> = {};
        await Promise.allSettled(
          data.map(async (ch) => {
            try {
              const recs = await getTeacherChapterRecordings(session.token, subjectId, ch.id);
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

  const subtitle = [className && `Class ${className}`, section && `Section ${section}`]
    .filter(Boolean).join(' · ');

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
        <View style={{ width: 36 }} />
      </View>

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.thCell, { flex: 1 }]}>CHAPTER</Text>
        <Text style={[styles.thCell, { width: 36 }]}>PT</Text>
        <Text style={[styles.thCell, { width: 70 }]}>REF</Text>
        <Text style={[styles.thCell, { width: 40 }]}>REC</Text>
        <Text style={[styles.thCell, { width: 56 }]}>SCORE</Text>
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
              <Ionicons color={colors.textMuted} name="journal-outline" size={48} />
              <Text style={styles.emptyTitle}>No chapters yet</Text>
              <Text style={styles.emptyBody}>
                Your school admin hasn't added chapters for this subject yet.
              </Text>
            </View>
          ) : (
            chapters.map((ch, idx) => {
              const sc = scoreColor(chapterScores[ch.id] ?? null);
              const avgScore = chapterScores[ch.id] ?? null;

              return (
                <View key={ch.id} style={styles.row}>
                  <View style={styles.rowLeft}>
                    <Text style={styles.chapterName}>{ch.name}</Text>
                    <Text style={styles.partLabel}>Part {idx + 1}</Text>
                  </View>

                  {/* PDF Reference Material */}
                  <Pressable
                    onPress={() =>
                      navigation.navigate('TeacherReferenceMaterial', {
                        chapterId: ch.id,
                        chapterName: ch.name,
                        subjectId,
                      })
                    }
                    style={styles.pdfBtn}
                  >
                    <Ionicons color={colors.accent} name="document-text" size={14} />
                    <Text style={styles.pdfBtnText}>PDF</Text>
                    <Ionicons color={colors.accent} name="add" size={14} />
                  </Pressable>

                  {/* Recording */}
                  <Pressable
                    onPress={() =>
                      navigation.navigate('TeacherRecording', {
                        subjectId,
                        subjectName,
                        chapterId: ch.id,
                        chapterName: ch.name,
                      })
                    }
                    style={styles.playBtn}
                  >
                    <Ionicons color="#fff" name="play" size={14} />
                  </Pressable>

                  {/* Score */}
                  <View style={[styles.scorePill, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.scoreText, { color: sc.text }]}>
                      {avgScore !== null ? `${Math.round(avgScore)}%` : '—'}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
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

  tableHeader: { flexDirection: 'row', backgroundColor: colors.surfaceMuted, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: 'center', gap: 4 },
  thCell: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8 },

  listContent: { paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 4, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  rowLeft: { flex: 1, gap: 2 },
  chapterName: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  partLabel: { color: colors.textMuted, fontSize: 11 },
  pdfBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: colors.accentSoft, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, width: 70, justifyContent: 'center' },
  pdfBtnText: { color: colors.accent, fontSize: 11, fontWeight: '700' },
  playBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  scorePill: { width: 48, paddingVertical: 4, borderRadius: 8, alignItems: 'center' },
  scoreText: { fontSize: 12, fontWeight: '700' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  emptyState: { alignItems: 'center', padding: 40, gap: 12 },
  loadingText: { color: colors.textSecondary, fontSize: 14 },
  emptyTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  emptyBody: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  retryBtn: { backgroundColor: colors.accentSoft, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: colors.accentDark, fontWeight: '700', fontSize: 14 },
});
