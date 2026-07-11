import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { getSchoolChapterRecordings } from '../lib/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { RecordingWithReport } from '../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'SchoolAdminChapterRecordings'>;

function formatDuration(seconds: number | null) {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function scoreStyle(score: number | null) {
  if (score === null) return { bg: colors.surfaceMuted, text: colors.textMuted };
  if (score >= 80) return { bg: '#E8F7EE', text: '#127A40' };
  if (score >= 60) return { bg: '#FFF4E0', text: '#92400E' };
  return { bg: '#FFF1F1', text: '#B42318' };
}

function statusStyle(status: string) {
  if (status === 'completed') return { bg: '#E8F7EE', text: '#127A40', label: 'Done' };
  if (status === 'processing') return { bg: '#FFF4E0', text: '#92400E', label: 'Processing' };
  if (status === 'pending') return { bg: colors.surfaceMuted, text: colors.textSecondary, label: 'Pending' };
  return { bg: '#FFF1F1', text: '#B42318', label: 'Failed' };
}

export function SchoolAdminChapterRecordingsScreen({ navigation, route }: Props) {
  const { session } = useAuth();
  const { chapterId, chapterName, subjectName } = route.params;

  const [recordings, setRecordings] = useState<RecordingWithReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!session) return;
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        const data = await getSchoolChapterRecordings(session.token, chapterId);
        setRecordings(data.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load recordings.');
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [session, chapterId],
  );

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const scored = recordings.filter((r) => r.report?.overall_score !== null && r.report?.overall_score !== undefined);
  const avgScore = scored.length
    ? Math.round(scored.reduce((s, r) => s + (r.report?.overall_score ?? 0), 0) / scored.length * 10) / 10
    : null;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons color={colors.textPrimary} name="arrow-back" size={22} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{chapterName}</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{subjectName}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Summary bar */}
      {!isLoading && !error && recordings.length > 0 && (
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{recordings.length}</Text>
            <Text style={styles.summaryLabel}>Recording{recordings.length !== 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.summarySep} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{scored.length}</Text>
            <Text style={styles.summaryLabel}>Scored</Text>
          </View>
          <View style={styles.summarySep} />
          <View style={styles.summaryItem}>
            {avgScore !== null ? (
              <Text style={[styles.summaryValue, { color: scoreStyle(avgScore).text }]}>
                {avgScore}%
              </Text>
            ) : (
              <Text style={[styles.summaryValue, { color: colors.textMuted }]}>—</Text>
            )}
            <Text style={styles.summaryLabel}>Avg Score</Text>
          </View>
        </View>
      )}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.loadingText}>Loading recordings…</Text>
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
          {recordings.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons color={colors.textMuted} name="videocam-outline" size={48} />
              <Text style={styles.emptyTitle}>No recordings yet</Text>
              <Text style={styles.emptyBody}>
                Teachers haven't uploaded any recordings for this chapter.
              </Text>
            </View>
          ) : (
            <View style={styles.recList}>
              {recordings.map((rec) => {
                const sc = scoreStyle(rec.report?.overall_score ?? null);
                const ss = statusStyle(rec.status);
                const score = rec.report?.overall_score ?? null;
                return (
                  <Pressable
                    key={rec.id}
                    onPress={() =>
                      navigation.navigate('RecordingDetail', { recording: rec, subjectName })
                    }
                    style={styles.recCard}
                  >
                    <View style={styles.recLeft}>
                      <View style={styles.recIconWrap}>
                        <Ionicons color={colors.accent} name="videocam" size={20} />
                      </View>
                    </View>
                    <View style={styles.recInfo}>
                      <Text style={styles.recTitle} numberOfLines={2}>
                        {rec.lecture_title ?? rec.chapter_name ?? `Recording #${rec.id}`}
                      </Text>
                      <View style={styles.recMeta}>
                        <View style={[styles.badge, { backgroundColor: ss.bg }]}>
                          <Text style={[styles.badgeText, { color: ss.text }]}>{ss.label}</Text>
                        </View>
                        <Ionicons color={colors.textMuted} name="time-outline" size={11} />
                        <Text style={styles.metaText}>{formatDuration(rec.duration_seconds)}</Text>
                        <Text style={styles.metaText}>
                          {new Date(rec.uploaded_at).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric',
                          })}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.scoreBadge, { backgroundColor: sc.bg }]}>
                      <Text style={[styles.scoreText, { color: sc.text }]}>
                        {score !== null ? `${Math.round(score)}%` : '—'}
                      </Text>
                    </View>
                    <Ionicons color={colors.textMuted} name="chevron-forward" size={16} />
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center', gap: 2 },
  headerTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  headerSubtitle: { color: colors.textMuted, fontSize: 11 },

  summaryBar: { flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 14, paddingHorizontal: 16 },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryValue: { color: colors.textPrimary, fontSize: 22, fontWeight: '800' },
  summaryLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  summarySep: { width: 1, backgroundColor: colors.border, marginVertical: 4 },

  listContent: { paddingBottom: 40 },
  recList: { padding: 16, gap: 12 },
  recCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14 },
  recLeft: {},
  recIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  recInfo: { flex: 1, gap: 6 },
  recTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '600', lineHeight: 18 },
  recMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  badge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  metaText: { color: colors.textMuted, fontSize: 11 },
  scoreBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  scoreText: { fontSize: 13, fontWeight: '800' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  emptyState: { alignItems: 'center', padding: 40, gap: 12 },
  loadingText: { color: colors.textSecondary, fontSize: 14 },
  emptyTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  emptyBody: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  retryBtn: { backgroundColor: colors.accentSoft, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: colors.accentDark, fontWeight: '700', fontSize: 14 },
});
