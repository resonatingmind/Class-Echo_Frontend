import { AppTheme } from '../theme/AppTheme';
import { useCallback, useMemo, useState } from 'react';
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
import { getStudentSubjectRecordings } from '../lib/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { RecordingStatus, RecordingWithReport } from '../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'StudentSubjectDetail'>;

function statusStyle(status: RecordingStatus) {
  switch (status) {
    case 'completed':
      return { bg: AppTheme.colors.successBg, text: AppTheme.colors.successText, label: 'Done' };
    case 'processing':
      return { bg: AppTheme.colors.warningBg, text: AppTheme.colors.warningStrong, label: 'Processing' };
    case 'pending':
      return { bg: AppTheme.colors.surfaceMuted, text: AppTheme.colors.textSecondary, label: 'Pending' };
    case 'failed':
      return { bg: AppTheme.colors.dangerBg, text: AppTheme.colors.dangerText, label: 'Failed' };
  }
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function StudentSubjectDetailScreen({ navigation, route }: Props) {
  const { session } = useAuth();
  const { subjectId, subjectName } = route.params;

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
        setRecordings(await getStudentSubjectRecordings(session.token, subjectId));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load recordings');
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [session, subjectId],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const groupedRecordings = useMemo(() => {
    const grouped = new Map<string, RecordingWithReport[]>();
    for (const recording of recordings) {
      const key = recording.chapter_name?.trim() || 'Untitled';
      const bucket = grouped.get(key) ?? [];
      bucket.push(recording);
      grouped.set(key, bucket);
    }
    return Array.from(grouped.entries()).map(([chapter, items]) => ({
      chapter,
      items,
    }));
  }, [recordings]);

  const completedCount = recordings.filter((recording) => recording.status === 'completed').length;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" hitSlop={8} onPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate("StudentHome");
          }
        }} style={styles.headerButton}>
          <Ionicons color={AppTheme.colors.textPrimary} name="arrow-back" size={22} />
        </Pressable>
        <Text numberOfLines={1} style={styles.headerTitle}>
          {subjectName}
        </Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load(true);
            }}
            tintColor={AppTheme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.heroKicker}>COURSE MODULE</Text>
          <Text style={styles.heroTitle}>{subjectName}</Text>
          <Text style={styles.heroBody}>Browse chapter-wise recordings and open the full analysis view.</Text>
        </View>

        {recordings.length > 0 ? (
          <View style={styles.statsStrip}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{recordings.length}</Text>
              <Text style={styles.statLabel}>TOTAL</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: AppTheme.colors.successText }]}>{completedCount}</Text>
              <Text style={styles.statLabel}>ANALYSED</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: AppTheme.colors.warningText }]}>
                {recordings.length - completedCount}
              </Text>
              <Text style={styles.statLabel}>PENDING</Text>
            </View>
          </View>
        ) : null}

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={AppTheme.colors.primary} size="large" />
            <Text style={styles.emptyBody}>Loading recordings…</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Ionicons color={AppTheme.colors.textSecondary} name="cloud-offline-outline" size={40} />
            <Text style={styles.emptyTitle}>Could not load recordings</Text>
            <Text style={styles.emptyBody}>{error}</Text>
          </View>
        ) : groupedRecordings.length === 0 ? (
          <View style={styles.center}>
            <Ionicons color={AppTheme.colors.textSecondary} name="mic-outline" size={40} />
            <Text style={styles.emptyTitle}>No recordings yet</Text>
            <Text style={styles.emptyBody}>Your teacher has not uploaded recordings for this subject yet.</Text>
          </View>
        ) : (
          <View style={styles.sectionStack}>
            {groupedRecordings.map((group) => (
              <View key={group.chapter} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{group.chapter}</Text>
                  <Text style={styles.sectionCount}>{group.items.length}</Text>
                </View>
                {group.items.map((recording) => {
                  const s = statusStyle(recording.status);
                  return (
                    <Pressable
                      accessibilityRole="button"
                      key={recording.id}
                      onPress={() => navigation.navigate('RecordingDetail', { recording, subjectName })}
                      style={styles.card}
                    >
                      <View style={styles.cardIcon}>
                        <Ionicons color={AppTheme.colors.primary} name="musical-note-outline" size={18} />
                      </View>
                      <View style={styles.cardContent}>
                        <Text numberOfLines={1} style={styles.cardTitle}>
                          {recording.chapter_name ?? `Recording #${recording.id}`}
                        </Text>
                        <Text style={styles.cardMeta}>
                          {new Date(recording.uploaded_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                          {' · '}
                          {formatDuration(recording.duration_seconds)}
                        </Text>
                      </View>
                      <View style={styles.cardRight}>
                        <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
                          <Text style={[styles.statusText, { color: s.text }]}>{s.label}</Text>
                        </View>
                        <Ionicons color={AppTheme.colors.textSecondary} name="chevron-forward" size={16} />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppTheme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: AppTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.border,
  },
  headerButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: AppTheme.colors.textPrimary,
  },
  scroll: { paddingBottom: 40, gap: 16 },
  hero: {
    padding: 20,
    backgroundColor: AppTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.border,
    gap: 8,
  },
  heroKicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, color: AppTheme.colors.primaryText },
  heroTitle: { fontSize: 30, fontWeight: '800', color: AppTheme.colors.textPrimary, letterSpacing: -0.5 },
  heroBody: { fontSize: 14, lineHeight: 20, color: AppTheme.colors.textSecondary },
  statsStrip: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    overflow: 'hidden',
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 2 },
  statValue: { fontSize: 22, fontWeight: '800', color: AppTheme.colors.textPrimary },
  statLabel: { fontSize: 11, fontWeight: '700', color: AppTheme.colors.textSecondary, letterSpacing: 0.8 },
  statDivider: { width: 1, backgroundColor: AppTheme.colors.border },
  sectionStack: { paddingHorizontal: 20, gap: 16 },
  section: { gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: AppTheme.colors.textPrimary },
  sectionCount: {
    minWidth: 28,
    textAlign: 'center',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: AppTheme.colors.surfaceMuted,
    color: AppTheme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: 14,
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: AppTheme.colors.textPrimary },
  cardMeta: { fontSize: 12, color: AppTheme.colors.textSecondary },
  cardRight: { alignItems: 'flex-end', gap: 8 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  statusText: { fontSize: 11, fontWeight: '700' },
  center: { alignItems: 'center', padding: 40, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: AppTheme.colors.textPrimary },
  emptyBody: { fontSize: 14, lineHeight: 20, color: AppTheme.colors.textSecondary, textAlign: 'center' },
});


