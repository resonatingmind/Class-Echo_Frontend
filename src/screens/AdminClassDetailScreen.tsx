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
import { getAdminClass, getAdminClassSubjects } from '../lib/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { AppTheme } from '../theme/AppTheme';
import { AppLogo } from '../components/ui/AppLogo';
import { ClassOut, SubjectOut } from '../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminClassDetail'>;

const SUBJECT_COLORS = [
  { bg: '#D1E4FF', text: AppTheme.colors.primary },
  { bg: '#E8F7EE', text: '#127A40' },
  { bg: '#FFF4E0', text: '#92400E' },
  { bg: '#F5F0FF', text: '#6B21A8' },
  { bg: '#FFE8EC', text: '#9B1239' },
];

function SubjectCard({
  subject,
  colorIdx,
  onPress,
}: {
  subject: SubjectOut;
  colorIdx: number;
  onPress: () => void;
}) {
  const color = SUBJECT_COLORS[colorIdx % SUBJECT_COLORS.length];

  return (
    <Pressable onPress={onPress} style={styles.subjectCard}>
      <View style={styles.subjectCardTop}>
        <View style={[styles.subjectIcon, { backgroundColor: color.bg }]}>
          <Text style={[styles.subjectIconText, { color: color.text }]}>
            {subject.name.slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View style={styles.subjectInfo}>
          <Text style={styles.subjectName}>{subject.name}</Text>
          <Text style={styles.subjectMeta}>
            {subject.teacher ? `Teacher: ${subject.teacher.name}` : 'No teacher assigned'}
          </Text>
        </View>
        <Ionicons color={AppTheme.colors.textSecondary} name="chevron-forward" size={18} />
      </View>
    </Pressable>
  );
}

export function AdminClassDetailScreen({ navigation, route }: Props) {
  const { session, signOut } = useAuth();
  const { schoolId, classId, className, schoolName } = route.params;

  const [classDetail, setClassDetail] = useState<ClassOut | null>(null);
  const [subjects, setSubjects] = useState<SubjectOut[]>([]);
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
        const [nextClass, nextSubjects] = await Promise.all([
          getAdminClass(session.token, schoolId, classId),
          getAdminClassSubjects(session.token, schoolId, classId),
        ]);
        setClassDetail(nextClass);
        setSubjects(nextSubjects);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load class details');
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [classId, schoolId, session],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
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
                  <Text style={styles.breadcrumb}>CLASS OVERVIEW</Text>
                  <Text style={styles.topTitle}>{classDetail?.name ?? className}</Text>
                </View>
              </View>

              <View style={styles.hero}>
                <Text style={styles.heroBody}>
                  Read-only academic view for {schoolName}. Open a subject to inspect recordings and students.
                </Text>
              </View>

              <View style={styles.statsStrip}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{subjects.length}</Text>
                  <Text style={styles.statLabel}>SUBJECTS</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {subjects.filter((subject) => subject.teacher_id != null).length}
                  </Text>
                  <Text style={styles.statLabel}>ASSIGNED</Text>
                </View>
              </View>

              {isLoading ? (
                <View style={styles.center}>
                  <ActivityIndicator color={AppTheme.colors.primary} size="large" />
                  <Text style={styles.emptyBody}>Loading class details…</Text>
                </View>
              ) : error ? (
                <View style={styles.center}>
                  <Ionicons color={AppTheme.colors.textSecondary} name="cloud-offline-outline" size={40} />
                  <Text style={styles.emptyTitle}>Could not load class details</Text>
                  <Text style={styles.emptyBody}>{error}</Text>
                </View>
              ) : subjects.length === 0 ? (
                <View style={styles.center}>
                  <Ionicons color={AppTheme.colors.textSecondary} name="library-outline" size={40} />
                  <Text style={styles.emptyTitle}>No subjects yet</Text>
                  <Text style={styles.emptyBody}>This class does not have any subjects attached yet.</Text>
                </View>
              ) : (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Subjects</Text>
                    <Text style={styles.sectionCount}>{subjects.length}</Text>
                  </View>
                  {subjects.map((subject, index) => (
                    <SubjectCard
                      key={subject.id}
                      colorIdx={index}
                      onPress={() => navigation.navigate('AdminSubjectDetail', {
                        schoolId,
                        subjectId: subject.id,
                        subjectName: subject.name,
                      })}
                      subject={subject}
                    />
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
  safe: {
    flex: 1,
    backgroundColor: AppTheme.colors.background,
  },
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
  scroll: {
    flexGrow: 1,
  },
  hero: {
    padding: AppTheme.spacing.xl,
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.large,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    gap: 8,
  },
  heroBody: {
    ...AppTheme.typography.body,
    color: AppTheme.colors.textSecondary,
  },
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
  emptyTitle: { color: AppTheme.colors.textPrimary, ...AppTheme.typography.h3 },
  emptyBody: { textAlign: 'center', ...AppTheme.typography.body, color: AppTheme.colors.textSecondary },
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
  subjectCard: {
    padding: 16,
    borderRadius: AppTheme.radius.large,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    backgroundColor: AppTheme.colors.surface,
  },
  subjectCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  subjectIcon: {
    width: 42,
    height: 42,
    borderRadius: AppTheme.radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectIconText: { fontSize: 16, fontWeight: '800' },
  subjectInfo: { flex: 1, gap: 4 },
  subjectName: { ...AppTheme.typography.body, fontWeight: '700', color: AppTheme.colors.textPrimary },
  subjectMeta: { ...AppTheme.typography.caption, color: AppTheme.colors.textSecondary },
});
