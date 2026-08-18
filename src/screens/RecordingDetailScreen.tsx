import { useEffect, useMemo, useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AudioWaveform } from '../components/AudioWaveform';
import {
  ChapterInfoBanner,
  CurriculumCoverageCard,
  LearningObjectivesCard,
  ReferenceAlignmentCard,
  LearningPlanInfoCard,
} from '../components/RAGReportSections';
import { useAuth } from '../context/AuthContext';
import {
  API_BASE_URL,
  archiveTeacherRecording,
  deleteTeacherRecording,
  getSchoolRecordingDetail,
  getTeacherRecordingDetail,
  retryRecording,
  updateTeacherRecording,
} from '../lib/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { AppTheme } from '../theme/AppTheme';
import { AppLogo } from '../components/ui/AppLogo';
import { DimensionScore, QuantitativeMetrics, RecordingStatus, ScoreBreakdown, RecordingWithReport } from '../types/api';
import { buildWaveformBars, formatAudioTime } from '../lib/audio';

type Props = NativeStackScreenProps<RootStackParamList, 'RecordingDetail'>;

// ── Dimension metadata ────────────────────────────────────────────────────────

const DIMENSIONS: {
  key: keyof ScoreBreakdown;
  label: string;
  max: number;
  icon: string;
}[] = [
  { key: 'verbal_clarity',         label: 'Verbal Clarity',        max: 20, icon: 'mic-outline' },
  { key: 'pacing_delivery',        label: 'Pacing & Delivery',     max: 15, icon: 'speedometer-outline' },
  { key: 'content_structure',      label: 'Content Structure',     max: 15, icon: 'list-outline' },
  { key: 'conceptual_depth',       label: 'Conceptual Depth',      max: 20, icon: 'bulb-outline' },
  { key: 'student_engagement',     label: 'Student Engagement',    max: 15, icon: 'people-outline' },
  { key: 'language_accessibility', label: 'Language Accessibility',max: 10, icon: 'language-outline' },
  { key: 'closure_recap',          label: 'Closure & Recap',       max:  5, icon: 'checkmark-done-outline' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(score: number, max: number): string {
  const pct = score / max;
  if (pct >= 0.8) return '#127A40';
  if (pct >= 0.6) return AppTheme.colors.primary;
  if (pct >= 0.4) return '#92400E';
  return '#B42318';
}

function grade(score: number): string {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function statusStyle(status: RecordingStatus) {
  switch (status) {
    case 'completed':  return { bg: '#E8F7EE', text: '#127A40', label: 'Analysed' };
    case 'processing': return { bg: '#FFF4E0', text: '#92400E', label: 'Processing' };
    case 'pending':    return { bg: AppTheme.colors.background, text: AppTheme.colors.textSecondary, label: 'Pending' };
    case 'failed':     return { bg: '#FFF1F1', text: '#B42318', label: 'Failed' };
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const g = grade(score);
  const col = scoreColor(score, 100);
  return (
    <View style={ring.wrap}>
      <View style={[ring.circle, { borderColor: col }]}>
        <Text style={[ring.score, { color: col }]}>{Math.round(score)}</Text>
        <Text style={ring.outOf}>/100</Text>
      </View>
      <View style={[ring.gradeBadge, { backgroundColor: col }]}>
        <Text style={ring.gradeText}>{g}</Text>
      </View>
    </View>
  );
}

const ring = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8 },
  circle: {
    width: 100, height: 100, borderRadius: 50, borderWidth: 5,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 2,
  },
  score: { fontSize: 30, fontWeight: '800' },
  outOf: { fontSize: 12, fontWeight: '600', color: AppTheme.colors.textSecondary, marginTop: 10 },
  gradeBadge: {
    paddingHorizontal: 14, paddingVertical: 4, borderRadius: 999,
  },
  gradeText: { fontSize: 13, fontWeight: '800', color: '#fff' },
});

function MetricsStrip({ q }: { q: QuantitativeMetrics }) {
  const items = [
    { label: 'WPM', value: q.wpm_estimate > 0 ? `~${q.wpm_estimate}` : '—', icon: 'speedometer-outline' },
    { label: 'Fillers', value: String(q.filler_words_heard), icon: 'chatbubble-ellipses-outline' },
    { label: 'Questions', value: String(q.questions_asked), icon: 'help-circle-outline' },
  ];
  return (
    <View style={ms.wrap}>
      {items.map((item, i) => (
        <View key={item.label} style={[ms.cell, i < items.length - 1 && ms.cellBorder]}>
          <Ionicons color={AppTheme.colors.primary} name={item.icon as any} size={16} />
          <Text style={ms.value}>{item.value}</Text>
          <Text style={ms.label}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const ms = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderRadius: AppTheme.radius.medium,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    backgroundColor: AppTheme.colors.background,
    overflow: 'hidden',
  },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 3 },
  cellBorder: { borderRightWidth: 1, borderRightColor: AppTheme.colors.border },
  value: { fontSize: 18, fontWeight: '800', color: AppTheme.colors.textPrimary },
  label: { fontSize: 10, fontWeight: '700', color: AppTheme.colors.textSecondary, letterSpacing: 0.8 },
});

function LanguagePill({ text }: { text: string }) {
  return (
    <View style={lp.pill}>
      <Text style={lp.text}>{text}</Text>
    </View>
  );
}

const lp = StyleSheet.create({
  pill: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
    backgroundColor: '#EAF4FF', borderWidth: 1, borderColor: AppTheme.colors.primary + '40',
  },
  text: { fontSize: 12, fontWeight: '700', color: '#156FD6' },
});

function DimensionCard({ dim, data }: { dim: typeof DIMENSIONS[0]; data: DimensionScore }) {
  const col = scoreColor(data.score, dim.max);
  const pct = Math.round((data.score / dim.max) * 100);

  return (
    <View style={dc.card}>
      <View style={dc.header}>
        <View style={dc.iconWrap}>
          <Ionicons color={col} name={dim.icon as any} size={16} />
        </View>
        <Text style={dc.label}>{dim.label}</Text>
        <View style={[dc.scoreBadge, { backgroundColor: col + '18', borderColor: col + '40' }]}>
          <Text style={[dc.scoreText, { color: col }]}>{data.score}<Text style={dc.maxText}>/{dim.max}</Text></Text>
        </View>
      </View>

      {/* Score bar */}
      <View style={dc.barTrack}>
        <View style={[dc.barFill, { width: `${pct}%` as any, backgroundColor: col }]} />
      </View>

      {/* Finding */}
      {data.finding ? (
        <Text style={dc.finding}>{data.finding}</Text>
      ) : null}

      {/* Evidence quotes */}
      {data.evidence.length > 0 ? (
        <View style={dc.evidenceList}>
          {data.evidence.map((e, i) => (
            <View key={i} style={dc.evidenceRow}>
              <Text style={dc.evidenceDot}>›</Text>
              <Text style={dc.evidenceText}>{e}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const dc = StyleSheet.create({
  card: {
    borderRadius: AppTheme.radius.medium,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    backgroundColor: AppTheme.colors.surface,
    padding: 16,
    gap: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 32, height: 32, borderRadius: AppTheme.radius.medium, backgroundColor: AppTheme.colors.background,
    alignItems: 'center', justifyContent: 'center',
  },
  label: { flex: 1, fontSize: 14, fontWeight: '700', color: AppTheme.colors.textPrimary },
  scoreBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1,
  },
  scoreText: { fontSize: 14, fontWeight: '800' },
  maxText: { fontSize: 11, fontWeight: '600' },
  barTrack: {
    height: 6, borderRadius: 3, backgroundColor: AppTheme.colors.background, overflow: 'hidden',
  },
  barFill: { height: 6, borderRadius: 3 },
  finding: { fontSize: 13, lineHeight: 19, color: AppTheme.colors.textSecondary, fontStyle: 'italic' },
  evidenceList: { gap: 5 },
  evidenceRow: { flexDirection: 'row', gap: 6 },
  evidenceDot: { fontSize: 14, color: AppTheme.colors.textSecondary, lineHeight: 20, marginTop: 1 },
  evidenceText: { flex: 1, fontSize: 12, lineHeight: 18, color: AppTheme.colors.textSecondary },
});

function BulletList({ items, color, title, icon }: {
  items: string[]; color: string; title: string; icon: string;
}) {
  if (!items.length) return null;
  return (
    <View style={bl.wrap}>
      <View style={bl.titleRow}>
        <Ionicons color={color} name={icon as any} size={15} />
        <Text style={[bl.title, { color }]}>{title}</Text>
      </View>
      {items.map((item, i) => (
        <View key={i} style={bl.row}>
          <View style={[bl.dot, { backgroundColor: color }]} />
          <Text style={bl.text}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const bl = StyleSheet.create({
  wrap: { gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 13, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 7 },
  text: { flex: 1, fontSize: 13, lineHeight: 20, color: AppTheme.colors.textSecondary },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export function RecordingDetailScreen({ navigation, route }: Props) {
  const { recording: initialRecording, subjectName } = route.params;
  const { session } = useAuth();
  const [status, setStatus] = useState(initialRecording.status);
  const [retrying, setRetrying] = useState(false);
  const [recordingDetails, setRecordingDetails] = useState(initialRecording);
  
  // Modals / Actions states
  const [showOptionsSheet, setShowOptionsSheet] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editChapterName, setEditChapterName] = useState(initialRecording.chapter_name || '');
  const [editLectureTitle, setEditLectureTitle] = useState(initialRecording.lecture_title || '');
  const [editDescription, setEditDescription] = useState(initialRecording.description || '');
  const [updatingDetails, setUpdatingDetails] = useState(false);

  const fetchDetails = useCallback(async () => {
    if (!session) return;
    try {
      let updated: RecordingWithReport | null = null;
      if (session.role === 'school_admin' || session.role === 'admin') {
        updated = await getSchoolRecordingDetail(session.token, recordingDetails.id);
      } else {
        updated = await getTeacherRecordingDetail(session.token, recordingDetails.id);
      }
      if (updated) {
        setRecordingDetails(updated);
        setStatus(updated.status);
      }
    } catch {
      // ignore
    }
  }, [session, recordingDetails.id]);

  useEffect(() => {
    void fetchDetails();
  }, [fetchDetails]);

  useFocusEffect(
    useCallback(() => {
      void fetchDetails();
    }, [fetchDetails])
  );

  // Poll if status is pending or processing
  useEffect(() => {
    if (status !== 'pending' && status !== 'processing') return;
    const interval = setInterval(() => {
      void fetchDetails();
    }, 3500);
    return () => clearInterval(interval);
  }, [status, fetchDetails]);

  // Relative storage paths have to resolve against whichever backend this build
  // points at — a hardcoded localhost never works in a packaged APK.
  const audioUrl = recordingDetails.cloudinary_url.startsWith("http")
    ? recordingDetails.cloudinary_url
    : `${API_BASE_URL}/${recordingDetails.cloudinary_url.replace(/^\/+/, "")}`;

  const player = useAudioPlayer(audioUrl, {
    updateInterval: 200,
  });

  const playerStatus = useAudioPlayerStatus(player);
  const statusBadge = statusStyle(status);
  const waveform = useMemo(() => buildWaveformBars(recordingDetails.id), [recordingDetails.id]);

  useEffect(() => {
    void setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
  }, []);

  useEffect(() => {
    if (audioUrl && player) {
      try {
        player.replace(audioUrl);
      } catch {
        // ignore
      }
    }
  }, [audioUrl, player]);

  const handleNavigateToReplaceAudio = () => {
    setShowOptionsSheet(false);
    navigation.navigate('TeacherRecording', {
      subjectId: recordingDetails.subject_id,
      subjectName,
      chapterId: recordingDetails.chapter_id || undefined,
      chapterName: recordingDetails.chapter_name || undefined,
      learningPlanId: recordingDetails.learning_plan_id || undefined,
      lectureTitle: recordingDetails.lecture_title || undefined,
      replaceRecordingId: recordingDetails.id,
    });
  };

  const progress =
    playerStatus.duration > 0
      ? Math.min(1, playerStatus.currentTime / playerStatus.duration)
      : 0;

  const handleTogglePlay = () => {
    if (playerStatus.playing) { player.pause(); return; }
    if (playerStatus.duration > 0 && playerStatus.currentTime >= playerStatus.duration - 0.2) {
      void player.seekTo(0);
    }
    player.play();
  };

  const handleRetry = async () => {
    if (!session || retrying) return;
    setRetrying(true);
    try {
      await retryRecording(session.token, recordingDetails.id);
      setStatus('pending');
    } catch (e) {
      Alert.alert('Retry failed', e instanceof Error ? e.message : 'Could not queue retry.');
    } finally {
      setRetrying(false);
    }
  };

  const handleUpdate = async () => {
    if (!session || updatingDetails) return;
    if (!editLectureTitle.trim()) {
      Alert.alert('Validation Error', 'Lecture title is required.');
      return;
    }
    setUpdatingDetails(true);
    try {
      const updated = await updateTeacherRecording(session.token, recordingDetails.id, {
        chapter_name: editChapterName.trim() || null,
        lecture_title: editLectureTitle.trim() || null,
        description: editDescription.trim() || null,
      });
      setRecordingDetails(updated);
      setShowEditModal(false);
    } catch (e) {
      Alert.alert('Update failed', e instanceof Error ? e.message : 'Could not update recording.');
    } finally {
      setUpdatingDetails(false);
    }
  };

  const handleArchive = async () => {
    if (!session) return;
    Alert.alert(
      'Archive Lecture',
      'Are you sure you want to archive this lecture? It will no longer show up on the main subjects list.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            try {
              await archiveTeacherRecording(session.token, recordingDetails.id);
              setShowOptionsSheet(false);
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate("TeacherTabs");
              }
            } catch (e) {
              Alert.alert('Archive failed', e instanceof Error ? e.message : 'Could not archive recording.');
            }
          },
        },
      ]
    );
  };

  const handleDelete = async () => {
    if (!session) return;
    Alert.alert(
      'Delete Lecture',
      'Are you sure you want to permanently delete this lecture and its AI reports? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTeacherRecording(session.token, recordingDetails.id);
              setShowOptionsSheet(false);
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate("TeacherTabs");
              }
            } catch (e) {
              Alert.alert('Delete failed', e instanceof Error ? e.message : 'Could not delete recording.');
            }
          },
        },
      ]
    );
  };

  const recording = { ...recordingDetails, status };
  const report = recording.report;
  const overallScore = report?.overall_score ?? (recording as any).overall_score;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      {/* Global Header */}
      <View style={styles.globalHeader}>
        <View style={styles.headerLeft}>
          <AppLogo showText={false} />
        </View>
        <Text style={styles.headerTitle}>
          {session?.role === 'admin' ? 'Super Admin' : session?.role === 'school_admin' ? 'School Admin' : 'Teacher Portal'}
        </Text>
        <View style={styles.headerRight}>
          <Pressable onPress={() => setShowOptionsSheet(true)} style={styles.iconBtn}>
            <Ionicons color={AppTheme.colors.textPrimary} name="ellipsis-horizontal" size={22} />
          </Pressable>
        </View>
      </View>

      <View style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.centerContainer}>
            <View style={styles.body}>
              <Pressable onPress={() => navigation.goBack()} style={styles.backBtnRow}>
                <Ionicons name="arrow-back" size={20} color={AppTheme.colors.textSecondary} />
                <Text style={styles.backBtnText}>Back</Text>
              </Pressable>

              {/* Hero */}
              <View style={styles.hero}>
          <Text style={styles.subjectLabel}>{subjectName}{recording.chapter_name ? ` · ${recording.chapter_name}` : ''}</Text>
          <Text style={styles.heroTitle}>
            {recording.lecture_title || recording.chapter_name || `Recording #${recording.id}`}
          </Text>
          {recording.description ? (
            <Text style={styles.heroDescription}>{recording.description}</Text>
          ) : null}
          <View style={styles.heroBadgeRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
              <Text style={[styles.statusText, { color: statusBadge.text }]}>
                {statusBadge.label}
              </Text>
            </View>
            <Text style={styles.heroMeta}>
              {new Date(recording.uploaded_at).toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric',
              })}
            </Text>
            <Text style={styles.heroMeta}>· {formatAudioTime(recording.duration_seconds)}</Text>
          </View>
        </View>

        {/* Playback card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.cardHeading}>Audio Playback</Text>
              {session?.role === 'teacher' ? (
                <Pressable
                  onPress={handleNavigateToReplaceAudio}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 6,
                    backgroundColor: '#E0F2FE',
                  }}
                >
                  <Ionicons name="refresh" size={12} color="#0284C7" />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#0284C7' }}>
                    Replace Audio
                  </Text>
                </Pressable>
              ) : null}
            </View>
            <Text style={styles.playerTime}>
              {formatAudioTime(playerStatus.currentTime)} /{' '}
              {formatAudioTime(playerStatus.duration || recording.duration_seconds)}
            </Text>
          </View>
          <Pressable onPress={handleTogglePlay} style={styles.playerButton}>
            <View style={styles.playerIcon}>
              {!playerStatus.isLoaded || playerStatus.isBuffering ? (
                <ActivityIndicator color={AppTheme.colors.primary} size="small" />
              ) : (
                <Ionicons
                  color={AppTheme.colors.primary}
                  name={playerStatus.playing ? 'pause' : 'play'}
                  size={24}
                />
              )}
            </View>
            <View style={styles.playerTextWrap}>
              <Text style={styles.playerTitle}>Play recording</Text>
              <Text style={styles.playerSubtitle}>
                {playerStatus.playing ? 'Tap to pause' : 'Tap to listen'}
              </Text>
            </View>
          </Pressable>
          <View style={styles.waveformWrap}>
            <AudioWaveform bars={waveform} progress={progress} />
          </View>
        </View>

        {recording.transcription ? (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>LECTURE TRANSCRIPTION</Text>
            <ScrollView style={{ maxHeight: 200, marginTop: 8 }} nestedScrollEnabled>
              <Text style={{ fontSize: 14, lineHeight: 22, color: AppTheme.colors.textSecondary }}>
                {recording.transcription}
              </Text>
            </ScrollView>
          </View>
        ) : null}

        {/* Report */}
        {recording.status === 'completed' && (report || overallScore != null) ? (
          <View style={styles.reportWrap}>
            {/* Header + score */}
            <View style={styles.card}>
              <Text style={styles.cardHeading}>AI Performance Report</Text>
              {overallScore != null ? (
                <ScoreRing score={overallScore} />
              ) : null}
              {report?.teaching_quality_notes ? (
                <Text style={styles.overallNotes}>{report.teaching_quality_notes}</Text>
              ) : null}
            </View>

            {/* Quantitative metrics */}
            {report?.quantitative_metrics ? (
              <View style={styles.card}>
                <Text style={styles.sectionLabel}>KEY METRICS</Text>
                <MetricsStrip q={report.quantitative_metrics} />
                {report.quantitative_metrics.languages_detected.length > 0 ? (
                  <View style={styles.langRow}>
                    <Text style={styles.langPrefix}>Languages detected:</Text>
                    {report.quantitative_metrics.languages_detected.map((lang) => (
                      <LanguagePill key={lang} text={lang} />
                    ))}
                    {report.quantitative_metrics.code_switching_frequency !== 'none' ? (
                      <LanguagePill
                        text={`${report.quantitative_metrics.code_switching_frequency} switching`}
                      />
                    ) : null}
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Per-dimension scores */}
            {report?.score_breakdown ? (
              <View style={styles.card}>
                <Text style={styles.sectionLabel}>DIMENSION BREAKDOWN</Text>
                {DIMENSIONS.map((dim) => {
                  const data = report.score_breakdown![dim.key];
                  return data ? (
                    <DimensionCard key={dim.key} dim={dim} data={data} />
                  ) : null;
                })}
              </View>
            ) : null}

            {/* Strengths + improvements */}
            {report?.quantitative_metrics &&
            (report.quantitative_metrics.top_strengths.length > 0 ||
              report.quantitative_metrics.priority_improvements.length > 0) ? (
              <View style={styles.card}>
                <BulletList
                  color="#127A40"
                  icon="checkmark-circle-outline"
                  items={report?.quantitative_metrics?.top_strengths || []}
                  title="Top Strengths"
                />
                <BulletList
                   color={AppTheme.colors.warning}
                  icon="arrow-up-circle-outline"
                  items={report?.quantitative_metrics?.priority_improvements || []}
                  title="Priority Improvements"
                />
              </View>
            ) : null}

            {/* ── RAG Evaluation Section ── */}
            {report && (report.chapter_info || report.curriculum_coverage || report.accuracy_analysis || report.learning_objectives_achievement) ? (
              <View style={styles.card}>
                <Text style={styles.sectionLabel}>RAG-BASED EVALUATION</Text>

                {/* Chapter info banner */}
                {report.chapter_info ? (
                  <ChapterInfoBanner data={report.chapter_info} />
                ) : null}

                {/* Selected Learning Plan (Lecture Planner) */}
                {recording.learning_plan ? (
                  <LearningPlanInfoCard data={recording.learning_plan} />
                ) : null}

                {/* Curriculum coverage */}
                {report.curriculum_coverage ? (
                  <CurriculumCoverageCard data={report.curriculum_coverage} />
                ) : null}

                {/* Reference alignment */}
                {report.accuracy_analysis ? (
                  <ReferenceAlignmentCard data={report.accuracy_analysis} />
                ) : null}

                {/* Learning objectives */}
                {report.learning_objectives_achievement && report.learning_objectives_achievement.length > 0 ? (
                  <LearningObjectivesCard data={report.learning_objectives_achievement} />
                ) : null}
              </View>
            ) : null}
          </View>
        ) : (
          <View style={[styles.processingCard, status === 'failed' && styles.processingCardFailed]}>
            {status === 'processing' ? (
              <ActivityIndicator color={AppTheme.colors.primary} size="small" />
            ) : (
              <Ionicons
                color={status === 'failed' ? '#B42318' : AppTheme.colors.hint}
                name={status === 'failed' ? 'alert-circle-outline' : 'time-outline'}
                size={20}
              />
            )}
            <View style={styles.processingBody}>
              <Text style={styles.processingText}>
                {status === 'processing'
                  ? 'AI analysis in progress. Check back in about a minute.'
                  : status === 'failed'
                  ? recording.error_reason || 'The report could not be generated for this recording.'
                  : 'Analysis is queued and will start soon.'}
              </Text>
              {status === 'failed' ? (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  {session?.role === 'teacher' ? (
                    <Pressable
                      onPress={handleNavigateToReplaceAudio}
                      style={[styles.retryButton, { backgroundColor: '#0284C7' }]}
                    >
                      <Ionicons color="#fff" name="mic-outline" size={14} />
                      <Text style={styles.retryButtonText}>Re-record / Upload New Audio</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    disabled={retrying}
                    onPress={() => void handleRetry()}
                    style={[styles.retryButton, { backgroundColor: '#475569' }]}
                  >
                    {retrying ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Ionicons color="#fff" name="refresh-outline" size={14} />
                    )}
                    <Text style={styles.retryButtonText}>
                      {retrying ? 'Queuing…' : 'Retry Same Audio'}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          </View>
        )}
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Actions sheet */}
      <Modal animationType="fade" onRequestClose={() => setShowOptionsSheet(false)} transparent visible={showOptionsSheet}>
        <Pressable onPress={() => setShowOptionsSheet(false)} style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Lecture Options</Text>
            <Text style={styles.sheetSubtitle}>Manage details, re-record audio, archive, or permanently delete this lecture.</Text>

            {session?.role === 'teacher' ? (
              <Pressable
                onPress={handleNavigateToReplaceAudio}
                style={styles.sheetOption}
              >
                <View style={styles.sheetOptionIcon}>
                  <Ionicons color={AppTheme.colors.primary} name="mic-outline" size={20} />
                </View>
                <View style={styles.sheetOptionBody}>
                  <Text style={styles.sheetOptionTitle}>Re-record / Replace Audio</Text>
                  <Text style={styles.sheetOptionText}>
                    Upload or record a new audio to regenerate the AI performance report.
                  </Text>
                </View>
              </Pressable>
            ) : null}

            <Pressable
              onPress={() => {
                setShowOptionsSheet(false);
                setShowEditModal(true);
              }}
              style={styles.sheetOption}
            >
              <View style={styles.sheetOptionIcon}>
                <Ionicons color={AppTheme.colors.primary} name="create-outline" size={20} />
              </View>
              <View style={styles.sheetOptionBody}>
                <Text style={styles.sheetOptionTitle}>Edit Details</Text>
                <Text style={styles.sheetOptionText}>Modify chapter name, title, or summary description.</Text>
              </View>
            </Pressable>

            <Pressable onPress={() => void handleArchive()} style={styles.sheetOption}>
              <View style={styles.sheetOptionIcon}>
                <Ionicons color={AppTheme.colors.warning} name="archive-outline" size={20} />
              </View>
              <View style={styles.sheetOptionBody}>
                <Text style={styles.sheetOptionTitle}>Archive Lecture</Text>
                <Text style={styles.sheetOptionText}>Hide this lecture from active lists without deleting it.</Text>
              </View>
            </Pressable>

            <Pressable onPress={() => void handleDelete()} style={styles.sheetOption}>
              <View style={styles.sheetOptionIcon}>
                <Ionicons color="#B42318" name="trash-outline" size={20} />
              </View>
              <View style={styles.sheetOptionBody}>
                <Text style={[styles.sheetOptionTitle, { color: '#B42318' }]}>Delete Permanently</Text>
                <Text style={styles.sheetOptionText}>Completely remove recording and AI analysis report.</Text>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Edit Details modal */}
      <Modal animationType="slide" onRequestClose={() => setShowEditModal(false)} transparent visible={showEditModal}>
        <Pressable onPress={() => setShowEditModal(false)} style={styles.sheetOverlay}>
          <Pressable style={[styles.sheet, styles.uploadSheet]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Edit Lecture Details</Text>
            <Text style={styles.sheetSubtitle}>Update the chapter, title, and description for this lecture.</Text>

            <Text style={styles.inputLabel}>CHAPTER</Text>
            <TextInput
              autoCapitalize="words"
              onChangeText={setEditChapterName}
              placeholder="Enter chapter name"
              placeholderTextColor={AppTheme.colors.hint}
              style={[styles.input, { marginBottom: 8 }]}
              value={editChapterName}
            />

            <Text style={styles.inputLabel}>LECTURE TITLE *</Text>
            <TextInput
              autoCapitalize="words"
              onChangeText={setEditLectureTitle}
              placeholder="Enter lecture title"
              placeholderTextColor={AppTheme.colors.hint}
              style={styles.input}
              value={editLectureTitle}
            />

            <Text style={styles.inputLabel}>DESCRIPTION</Text>
            <TextInput
              autoCapitalize="sentences"
              multiline
              numberOfLines={4}
              onChangeText={setEditDescription}
              placeholder="Optional summary or notes for this recording"
              placeholderTextColor={AppTheme.colors.hint}
              style={[styles.input, styles.descriptionInput]}
              value={editDescription}
            />

            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowEditModal(false)} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={updatingDetails}
                onPress={() => void handleUpdate()}
                style={[styles.primaryButton, updatingDetails && styles.buttonDisabled]}
              >
                {updatingDetails ? <ActivityIndicator color="#fff" size="small" /> : null}
                <Text style={styles.primaryButtonText}>
                  {updatingDetails ? 'Saving…' : 'Save Changes'}
                </Text>
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
  flex: { flex: 1 },
  globalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AppTheme.spacing.l,
    paddingVertical: AppTheme.spacing.m,
    backgroundColor: AppTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.border,
  },
  headerLeft: {
    width: 60,
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.heading3,
  },
  headerRight: {
    flexDirection: 'row',
    gap: AppTheme.spacing.s,
    width: 60,
    justifyContent: 'flex-end',
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: AppTheme.spacing.l,
    paddingVertical: AppTheme.spacing.xl,
  },
  body: {
    width: '100%',
    maxWidth: 800,
    gap: AppTheme.spacing.l,
  },
  backBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    marginBottom: AppTheme.spacing.s,
  },
  backBtnText: {
    color: AppTheme.colors.textSecondary,
    ...AppTheme.typography.body,
    fontWeight: '600',
  },
  actionBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 40 },
  hero: {
    padding: 24,
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.large,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    gap: AppTheme.spacing.s,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  subjectLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, color: AppTheme.colors.primary },
  heroTitle: { fontSize: 28, fontWeight: '800', color: AppTheme.colors.textPrimary, letterSpacing: -0.6 },
  heroDescription: { fontSize: 14, lineHeight: 22, color: AppTheme.colors.textSecondary },
  heroBadgeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  heroMeta: { fontSize: 13, color: AppTheme.colors.textSecondary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusText: { fontSize: 12, fontWeight: '700' },
  card: {
    padding: 24,
    borderRadius: AppTheme.radius.large,
    backgroundColor: AppTheme.colors.surface,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  cardHeading: { fontSize: 17, fontWeight: '800', color: AppTheme.colors.textPrimary },
  playerTime: { fontSize: 12, color: AppTheme.colors.textSecondary, fontWeight: '600' },
  playerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.background,
  },
  playerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerTextWrap: { flex: 1, gap: 3 },
  playerTitle: { fontSize: 15, fontWeight: '700', color: AppTheme.colors.textPrimary },
  playerSubtitle: { fontSize: 13, color: AppTheme.colors.textSecondary },
  waveformWrap: {
    padding: 14,
    borderRadius: AppTheme.radius.medium,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    backgroundColor: AppTheme.colors.background,
  },
  reportWrap: { gap: 16 },
  overallNotes: {
    fontSize: 14, lineHeight: 22, color: AppTheme.colors.textSecondary,
    textAlign: 'center', paddingHorizontal: 4,
  },
  sectionLabel: {
    fontSize: 11, fontWeight: '800', letterSpacing: 1.2,
    color: AppTheme.colors.textSecondary,
  },
  langRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  langPrefix: { fontSize: 12, color: AppTheme.colors.textSecondary, fontWeight: '600' },
  processingCard: {
    padding: 24,
    borderRadius: AppTheme.radius.large,
    backgroundColor: AppTheme.colors.surface,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  processingCardFailed: { borderColor: '#FECACA', backgroundColor: '#FFF8F8' },
  processingBody: { flex: 1, gap: 12 },
  processingText: { fontSize: 14, lineHeight: 20, color: AppTheme.colors.textSecondary },
  retryButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 999, backgroundColor: '#B42318',
  },
  retryButtonText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 28, 28, 0.32)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: AppTheme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 14,
  },
  uploadSheet: { gap: 12 },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: AppTheme.colors.border,
  },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: AppTheme.colors.textPrimary },
  sheetSubtitle: { fontSize: 14, lineHeight: 20, color: AppTheme.colors.textSecondary },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.background,
  },
  sheetOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#EAF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptionBody: { flex: 1, gap: 4 },
  sheetOptionTitle: { fontSize: 15, fontWeight: '700', color: AppTheme.colors.textPrimary },
  sheetOptionText: { fontSize: 13, lineHeight: 18, color: AppTheme.colors.textSecondary },
  inputLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, color: AppTheme.colors.textSecondary },
  input: {
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.background,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: AppTheme.colors.textPrimary,
  },
  descriptionInput: { minHeight: 96, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 6 },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: AppTheme.radius.medium,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    backgroundColor: AppTheme.colors.surface,
  },
  secondaryButtonText: { fontSize: 15, fontWeight: '700', color: AppTheme.colors.textSecondary },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.primary,
  },
  primaryButtonText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  buttonDisabled: { opacity: 0.55 },
});

