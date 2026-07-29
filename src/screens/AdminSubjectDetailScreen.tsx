import { useCallback, useMemo, useState } from 'react';
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
import { deleteAdminRecording, getAdminSubjectRecordings, getAdminSubjectStudents } from '../lib/api';
import { formatAudioTime } from '../lib/audio';
import { RootStackParamList } from '../navigation/AppNavigator';
import { AppTheme } from '../theme/AppTheme';
import { AppLogo } from '../components/ui/AppLogo';
import { RecordingStatus, RecordingWithReport, StudentOut } from '../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminSubjectDetail'>;

type DetailTab = 'recordings' | 'students';

function statusStyle(status: RecordingStatus) {
  switch (status) {
    case 'completed':
      return { bg: '#E8F7EE', text: '#127A40', label: 'Done' };
    case 'processing':
      return { bg: '#FFF4E0', text: '#92400E', label: 'Processing' };
    case 'pending':
      return { bg: AppTheme.colors.background, text: AppTheme.colors.textSecondary, label: 'Pending' };
    case 'failed':
      return { bg: '#FFF1F1', text: '#B42318', label: 'Failed' };
  }
}

function RecordingRow({
  recording,
  onPress,
  onDelete,
}: {
  recording: RecordingWithReport;
  onPress: () => void;
  onDelete: () => void;
}) {
  const status = statusStyle(recording.status);

  const handleDelete = () => {
    Alert.alert(
      'Delete Recording',
      `Delete "${recording.chapter_name ?? `Recording #${recording.id}`}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ],
    );
  };

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.cardIcon}>
        {recording.status === 'processing' ? (
          <ActivityIndicator color={AppTheme.colors.primary} size="small" />
        ) : (
          <Ionicons
            color={recording.status === 'completed' ? AppTheme.colors.primary : AppTheme.colors.textSecondary}
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
          {formatAudioTime(recording.duration_seconds)}
        </Text>
      </View>
      <View style={styles.cardRight}>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
        </View>
        <Pressable hitSlop={8} onPress={handleDelete} style={styles.deleteBtn}>
          <Ionicons color={AppTheme.colors.error} name="trash-outline" size={16} />
        </Pressable>
      </View>
    </Pressable>
  );
}

function StudentRow({ student }: { student: StudentOut }) {
  const initials = student.name
    .split(' ')
    .map((word) => word[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={styles.card}>
      <View style={styles.studentAvatar}>
        <Text style={styles.studentAvatarText}>{initials}</Text>
      </View>
      <View style={styles.cardContent}>
        <Text numberOfLines={1} style={styles.cardTitle}>
          {student.name}
        </Text>
        <Text numberOfLines={1} style={styles.cardMeta}>
          {student.email}
        </Text>
      </View>
    </View>
  );
}

export function AdminSubjectDetailScreen({ navigation, route }: Props) {
  const { session, signOut } = useAuth();
  const { schoolId, subjectId, subjectName } = route.params;

  const [activeTab, setActiveTab] = useState<DetailTab>('recordings');
  const [recordings, setRecordings] = useState<RecordingWithReport[]>([]);
  const [students, setStudents] = useState<StudentOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!session) {
        return;
      }
      if (!silent) {
        setIsLoading(true);
      }
      setError(null);
      try {
        const [recordingData, studentData] = await Promise.all([
          getAdminSubjectRecordings(session.token, schoolId, subjectId),
          getAdminSubjectStudents(session.token, schoolId, subjectId),
        ]);
        setRecordings(recordingData);
        setStudents(studentData);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load subject details');
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [schoolId, session, subjectId],
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
    return Array.from(grouped.entries()).map(([chapter, items]) => ({ chapter, items }));
  }, [recordings]);

  const completedCount = recordings.filter((recording) => recording.status === 'completed').length;

  const handleDelete = useCallback(
    async (recordingId: number) => {
      if (!session) return;
      try {
        await deleteAdminRecording(session.token, recordingId);
        setRecordings((prev) => prev.filter((r) => r.id !== recordingId));
      } catch {
        Alert.alert('Error', 'Could not delete recording. Please try again.');
      }
    },
    [session],
  );

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      {/* Global Header */}
      <View style={styles.globalHeader}>
        <View style={styles.headerLeft}>
           <AppLogo hideText size={32} />
        </View>
        <Text style={styles.headerTitle}>Super Admin</Text>
        <View style={styles.headerRight}>
          <Pressable onPress={signOut} style={styles.iconBtn}>
            <Ionicons color={AppTheme.colors.textPrimary} name="log-out-outline" size={24} />
          </Pressable>
        </View>
      </View>

      <View style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={(
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load(true);
              }}
              tintColor={AppTheme.colors.primary}
            />
          )}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.centerContainer}>
            <View style={styles.body}>
              <Pressable onPress={() => navigation.goBack()} style={styles.backBtnRow}>
                <Ionicons name="arrow-back" size={20} color={AppTheme.colors.textSecondary} />
                <Text style={styles.backBtnText}>Back</Text>
              </Pressable>

              <View style={styles.titleRow}>
                <View>
                  <Text style={styles.breadcrumb}>SUBJECT INSIGHT</Text>
                  <Text style={styles.topTitle}>{subjectName}</Text>
                </View>
              </View>
              
              <View style={styles.hero}>
                <Text style={styles.heroBody}>
                  Super admin read-only view for recordings, analysis status, and enrolled students.
                </Text>
              </View>

              <View style={styles.tabBar}>
                {(['recordings', 'students'] as const).map((tab) => {
                  const isActive = tab === activeTab;
                  return (
                    <Pressable
                      key={tab}
                      onPress={() => setActiveTab(tab)}
                      style={[styles.tabButton, isActive && styles.tabButtonActive]}
                    >
                      <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                        {tab === 'recordings' ? 'Recordings' : 'Students'}
                      </Text>
                    </Pressable>
                  );
                })}
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
                    <Text style={[styles.statValue, { color: AppTheme.colors.warning }]}>
                      {recordings.length - completedCount}
                    </Text>
                    <Text style={styles.statLabel}>PENDING</Text>
                  </View>
                </View>
              ) : null}

              {isLoading ? (
                <View style={styles.center}>
                  <ActivityIndicator color={AppTheme.colors.primary} size="large" />
                  <Text style={styles.emptyBody}>Loading subject details…</Text>
                </View>
              ) : error ? (
                <View style={styles.center}>
                  <Ionicons color={AppTheme.colors.textSecondary} name="cloud-offline-outline" size={40} />
                  <Text style={styles.emptyTitle}>Could not load subject details</Text>
                  <Text style={styles.emptyBody}>{error}</Text>
                </View>
              ) : activeTab === 'recordings' ? (
                groupedRecordings.length === 0 ? (
                  <View style={styles.center}>
                    <Ionicons color={AppTheme.colors.textSecondary} name="mic-outline" size={40} />
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
                            onDelete={() => void handleDelete(recording.id)}
                            onPress={() => navigation.navigate('RecordingDetail', { recording, subjectName })}
                            recording={recording}
                          />
                        ))}
                      </View>
                    ))}
                  </View>
                )
              ) : students.length === 0 ? (
                <View style={styles.center}>
                  <Ionicons color={AppTheme.colors.textSecondary} name="people-outline" size={40} />
                  <Text style={styles.emptyTitle}>No students enrolled</Text>
                  <Text style={styles.emptyBody}>Students in this class will appear here.</Text>
                </View>
              ) : (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Class Roster</Text>
                    <Text style={styles.sectionCount}>{students.length}</Text>
                  </View>
                  {students.map((student) => (
                    <StudentRow key={student.id} student={student} />
                  ))}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppTheme.colors.background },
  globalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AppTheme.spacing.l,
    paddingVertical: AppTheme.spacing.m,
    backgroundColor: AppTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.border,
  },
  headerLeft: { width: 60, alignItems: 'flex-start' },
  headerTitle: { flex: 1, textAlign: 'center', color: AppTheme.colors.textPrimary, ...AppTheme.typography.h3 },
  headerRight: { flexDirection: 'row', gap: AppTheme.spacing.s, width: 60, justifyContent: 'flex-end' },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  centerContainer: { flex: 1, alignItems: 'center', paddingHorizontal: AppTheme.spacing.l, paddingVertical: AppTheme.spacing.xl },
  body: { width: '100%', maxWidth: 800, gap: AppTheme.spacing.l },
  backBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, alignSelf: 'flex-start' },
  backBtnText: { color: AppTheme.colors.textSecondary, ...AppTheme.typography.body, fontWeight: '600' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 },
  flex: { flex: 1 },
  breadcrumb: {
    color: AppTheme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  topTitle: {
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.h1,
    marginTop: 4,
  },
  scroll: { flexGrow: 1 },
  hero: {
    padding: AppTheme.spacing.l,
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.large,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    gap: 8,
  },
  heroBody: { ...AppTheme.typography.body, color: AppTheme.colors.textSecondary },
  tabBar: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: AppTheme.radius.large,
    backgroundColor: AppTheme.colors.background,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  tabButton: { flex: 1, paddingVertical: 10, borderRadius: AppTheme.radius.medium, alignItems: 'center' },
  tabButtonActive: { backgroundColor: AppTheme.colors.surface, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  tabLabel: { ...AppTheme.typography.body, fontWeight: '600', color: AppTheme.colors.textSecondary },
  tabLabelActive: { color: AppTheme.colors.textPrimary, fontWeight: '700' },
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.large,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    overflow: 'hidden',
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 2 },
  statValue: { fontSize: 22, fontWeight: '800', color: AppTheme.colors.textPrimary },
  statLabel: { fontSize: 11, fontWeight: '700', color: AppTheme.colors.textSecondary, letterSpacing: 0.8 },
  statDivider: { width: 1, backgroundColor: AppTheme.colors.border },
  center: { paddingVertical: 56, alignItems: 'center', gap: 10 },
  emptyTitle: { ...AppTheme.typography.h3, color: AppTheme.colors.textPrimary },
  emptyBody: { textAlign: 'center', ...AppTheme.typography.body, color: AppTheme.colors.textSecondary },
  sectionStack: { gap: 16 },
  section: { gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { flex: 1, ...AppTheme.typography.h3, color: AppTheme.colors.textPrimary },
  sectionCount: {
    minWidth: 26,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: AppTheme.radius.round,
    textAlign: 'center',
    backgroundColor: AppTheme.colors.background,
    color: AppTheme.colors.textSecondary,
    ...AppTheme.typography.caption,
    fontWeight: '700',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: AppTheme.radius.large,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    backgroundColor: AppTheme.colors.surface,
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
  cardTitle: { ...AppTheme.typography.body, fontWeight: '700', color: AppTheme.colors.textPrimary },
  cardMeta: { ...AppTheme.typography.caption, color: AppTheme.colors.textSecondary },
  cardRight: { alignItems: 'flex-end', gap: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: AppTheme.radius.round },
  statusText: { ...AppTheme.typography.caption, fontWeight: '700' },
  deleteBtn: { padding: 4 },
  studentAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: AppTheme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentAvatarText: { fontSize: 15, fontWeight: '800', color: AppTheme.colors.primary },
});
