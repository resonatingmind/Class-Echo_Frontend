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
import {
  getSchoolSubjectRecordings,
} from '../lib/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { colors } from '../theme/colors';
import { RecordingStatus, RecordingWithReport } from '../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'SchoolAdminSubjectDetail'>;

function statusStyle(status: RecordingStatus) {
  switch (status) {
    case 'completed':
      return { bg: '#E8F7EE', text: '#127A40', label: 'Done' };
    case 'processing':
      return { bg: '#FFF4E0', text: '#92400E', label: 'Processing' };
    case 'pending':
      return { bg: colors.surfaceMuted, text: colors.textSecondary, label: 'Pending' };
    case 'failed':
      return { bg: '#FFF1F1', text: '#B42318', label: 'Failed' };
  }
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function RecordingRow({
  recording,
  onPress,
}: {
  recording: RecordingWithReport;
  onPress: () => void;
}) {
  const s = statusStyle(recording.status);
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.cardIcon}>
        {recording.status === 'processing' ? (
          <ActivityIndicator color={colors.accent} size="small" />
        ) : (
          <Ionicons
            color={recording.status === 'completed' ? colors.accent : colors.textMuted}
            name={recording.status === 'completed' ? 'document-text-outline' : 'mic-outline'}
            size={18}
          />
        )}
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
        <Ionicons color={colors.textMuted} name="chevron-forward" size={16} />
      </View>
    </Pressable>
  );
}

export function SchoolAdminSubjectDetailScreen({ navigation, route }: Props) {
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
        const recordingData = await getSchoolSubjectRecordings(session.token, subjectId);
        setRecordings(recordingData);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load subject details');
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
    <SafeAreaView edges={[]} style={styles.safe}>
      <ScreenHeader
        title={subjectName}
        onBack={() => {
          if (navigation.canGoBack()) navigation.goBack();
          else navigation.navigate("SchoolAdminClasses");
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load(true);
            }}
            tintColor={colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.heroKicker}>SUBJECT</Text>
          <Text style={styles.heroTitle}>{subjectName}</Text>
          <Text style={styles.heroBody}>
            Review uploaded recordings and their AI analyses.
          </Text>
        </View>

        {recordings.length > 0 ? (
          <View style={styles.statsStrip}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{recordings.length}</Text>
              <Text style={styles.statLabel}>TOTAL</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#127A40' }]}>{completedCount}</Text>
              <Text style={styles.statLabel}>ANALYSED</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.warning }]}>
                {recordings.length - completedCount}
              </Text>
              <Text style={styles.statLabel}>PENDING</Text>
            </View>
          </View>
        ) : null}

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={styles.emptyBody}>Loading subject details…</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Ionicons color={colors.textMuted} name="cloud-offline-outline" size={40} />
            <Text style={styles.emptyTitle}>Could not load subject details</Text>
            <Text style={styles.emptyBody}>{error}</Text>
          </View>
        ) : groupedRecordings.length === 0 ? (
          <View style={styles.center}>
            <Ionicons color={colors.textMuted} name="mic-outline" size={40} />
            <Text style={styles.emptyTitle}>No recordings yet</Text>
            <Text style={styles.emptyBody}>Teacher uploads for this subject will appear here.</Text>
          </View>
        ) : (
          <View style={styles.sectionStack}>
            {groupedRecordings.map((group) => (
              <View key={group.chapter} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{group.chapter}</Text>
                  <Text style={styles.sectionCount}>{group.items.length}</Text>
                </View>
                {group.items.map((recording) => (
                  <RecordingRow
                    key={recording.id}
                    recording={recording}
                    onPress={() => navigation.navigate('RecordingDetail', { recording, subjectName })}
                  />
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: 40, gap: 16 },
  hero: {
    padding: 20,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  heroKicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, color: colors.accent },
  heroTitle: { fontSize: 30, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  heroBody: { fontSize: 14, lineHeight: 20, color: colors.textSecondary },
  tabBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  tabButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  tabLabel: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  tabLabelActive: { color: colors.accentDark },
  statsStrip: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 2 },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  statLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.8 },
  statDivider: { width: 1, backgroundColor: colors.border },
  sectionStack: { paddingHorizontal: 20, gap: 16 },
  section: { paddingHorizontal: 20, gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  sectionCount: {
    minWidth: 28,
    textAlign: 'center',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.surfaceMuted,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  cardMeta: { fontSize: 12, color: colors.textMuted },
  cardRight: { alignItems: 'flex-end', gap: 8 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  statusText: { fontSize: 11, fontWeight: '700' },
  studentAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentAvatarText: { fontSize: 14, fontWeight: '800', color: colors.accentDark },
  center: { alignItems: 'center', padding: 40, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  emptyBody: { fontSize: 14, lineHeight: 20, color: colors.textSecondary, textAlign: 'center' },
});
