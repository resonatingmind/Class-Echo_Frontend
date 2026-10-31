import { useCallback, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdminNavbar } from '../components/common/AdminNavbar';
import { ClipProvider, SharedClipsCard } from '../components/report/ClipPlayback';
import { GrowthView } from '../components/teacher/GrowthSummary';
import { useAuth } from '../context/AuthContext';
import { getTeacherGrowthForAdmin } from '../lib/api';
import { statusOf } from '../lib/teacherStatus';
import { RootStackParamList } from '../navigation/AppNavigator';
import { AppTheme } from '../theme/AppTheme';
import { AdminTeacherGrowth, SharedClipForAdmin } from '../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'SchoolAdminTeacherGrowth'>;

/** Shared clips grouped by lecture: each lecture has its own audio. */
function SharedLecture({ clips }: { clips: SharedClipForAdmin[] }) {
  const first = clips[0]!;
  return (
    <View style={styles.lecture}>
      <Text style={styles.lectureTitle}>
        {first.lecture_title || 'Lecture'} ·{' '}
        {new Date(first.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </Text>
      <ClipProvider
        audioUrl={first.audio_url}
        canPlay={false}
        recordingId={first.recording_id}
        segments={clips.flatMap((c) => c.segments)}
        sharedClips={clips}
        token={undefined}
      >
        <SharedClipsCard />
      </ClipProvider>
    </View>
  );
}

/**
 * A teacher's growth as their school admin sees it: trend, focus, streak and
 * status against their own past, plus only the milestones and clips they
 * chose to share. Reports themselves stay with the teacher.
 */
export function SchoolAdminTeacherGrowthScreen({ navigation, route }: Props) {
  const { session } = useAuth();
  const [data, setData] = useState<AdminTeacherGrowth | null>(null);
  const [failed, setFailed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      let live = true;
      setFailed(false);
      getTeacherGrowthForAdmin(session.token, route.params.teacherId)
        .then((d) => live && setData(d))
        .catch(() => live && setFailed(true));
      return () => {
        live = false;
      };
    }, [session, route.params.teacherId]),
  );

  const byLecture = new Map<number, SharedClipForAdmin[]>();
  for (const c of data?.shared_clips ?? []) {
    byLecture.set(c.recording_id, [...(byLecture.get(c.recording_id) ?? []), c]);
  }
  const status = statusOf(data?.status);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      <AdminNavbar onBack={() => navigation.goBack()} title="Teacher Growth" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.body}>
          {failed ? (
            <Text style={styles.error}>Could not load this teacher's growth. Pull back and try again.</Text>
          ) : !data ? (
            <ActivityIndicator color={AppTheme.colors.hint} style={styles.loading} />
          ) : (
            <>
              <View style={styles.header}>
                <Text style={styles.name}>{data.name}</Text>
                <View style={[styles.status, { backgroundColor: status.bg }]}>
                  <Text style={[styles.statusText, { color: status.fg }]}>{status.label}</Text>
                </View>
                <Text style={styles.privacy}>
                  <Ionicons color={AppTheme.colors.textSecondary} name="lock-closed-outline" size={12} /> Reports
                  stay private to the teacher. You see their growth and what they choose to share.
                </Text>
              </View>

              <GrowthView audience="admin" growth={data.growth} />

              {byLecture.size > 0 ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Shared moments</Text>
                  {[...byLecture.values()].map((clips) => (
                    <SharedLecture clips={clips} key={clips[0]!.recording_id} />
                  ))}
                </View>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppTheme.colors.background },
  scroll: { flexGrow: 1, alignItems: 'center', paddingVertical: AppTheme.spacing.xl },
  body: { width: '100%', maxWidth: 800, gap: AppTheme.spacing.l },
  loading: { marginTop: AppTheme.spacing.xl },
  error: { marginHorizontal: AppTheme.spacing.l, color: AppTheme.colors.textSecondary },
  header: { gap: 8, marginHorizontal: AppTheme.spacing.l },
  name: { fontSize: 22, fontWeight: '800', color: AppTheme.colors.textPrimary },
  status: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 13, fontWeight: '700' },
  privacy: { fontSize: 12, lineHeight: 17, color: AppTheme.colors.textSecondary },
  section: { gap: AppTheme.spacing.m, marginHorizontal: AppTheme.spacing.l },
  sectionTitle: { color: AppTheme.colors.textPrimary, ...AppTheme.typography.heading3 },
  lecture: { gap: 6 },
  lectureTitle: { fontSize: 13, fontWeight: '700', color: AppTheme.colors.textSecondary },
});
