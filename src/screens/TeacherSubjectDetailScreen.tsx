import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
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

import { AudioWaveform } from '../components/AudioWaveform';
import { useAuth } from '../context/AuthContext';
import { buildWaveformBars, formatAudioTime, inferMimeTypeFromUri, isAudioMimeType } from '../lib/audio';
import { getTeacherSubjectRecordings, getTeacherSubjectStudents, retryRecording, uploadRecording, getTeacherChapters } from '../lib/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { RecordingStatus, RecordingWithReport, StudentOut, ChapterOut } from '../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'TeacherSubjectDetail'>;

type DetailTab = 'recordings' | 'students';

function safelyPausePlayer(player: { pause: () => void }) {
  try {
    player.pause();
  } catch {
    // The hook releases the player automatically on unmount.
  }
}

function statusStyle(status: RecordingStatus) {
  switch (status) {
    case 'completed':
      return { bg: '#E8F7EE', text: '#127A40', label: 'Done' };
    case 'processing':
      return { bg: '#FFF4E0', text: '#92400E', label: 'Processing' };
    case 'pending':
      return { bg: AppTheme.colors.surfaceMuted, text: AppTheme.colors.textSecondary, label: 'Pending' };
    case 'failed':
      return { bg: '#FFF1F1', text: '#B42318', label: 'Failed' };
  }
}

function RecordingRow({
  recording,
  onPress,
  onRetry,
  retrying,
}: {
  recording: RecordingWithReport;
  onPress: () => void;
  onRetry: () => void;
  retrying: boolean;
}) {
  const status = statusStyle(recording.status);

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
          {recording.lecture_title || recording.chapter_name || `Recording #${recording.id}`}
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
        {recording.status === 'failed' ? (
          <Pressable
            disabled={retrying}
            hitSlop={8}
            onPress={(e) => { e.stopPropagation(); onRetry(); }}
            style={styles.retryIcon}
          >
            {retrying
              ? <ActivityIndicator color="#B42318" size="small" />
              : <Ionicons color="#B42318" name="refresh-outline" size={18} />
            }
          </Pressable>
        ) : (
          <Ionicons color={AppTheme.colors.textSecondary} name="chevron-forward" size={16} />
        )}
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

export function TeacherSubjectDetailScreen({ navigation, route }: Props) {
  const { session } = useAuth();
  // const { subjectId, subjectName } = route.params;
  const { subjectId, subjectName, initialChapterId, initialTab } = route.params;
  const previewPlayer = useAudioPlayer(null, { updateInterval: 180 });
  const previewStatus = useAudioPlayerStatus(previewPlayer);

  // const [activeTab, setActiveTab] = useState<DetailTab>('recordings');
  const [activeTab, setActiveTab] = useState<DetailTab>(
    initialTab ?? "recordings",
  );
  const [recordings, setRecordings] = useState<RecordingWithReport[]>([]);
  const [students, setStudents] = useState<StudentOut[]>([]);
  const [chapters, setChapters] = useState<ChapterOut[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<ChapterOut | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [pendingMime, setPendingMime] = useState('audio/mpeg');
  const [lectureTitle, setLectureTitle] = useState('');
  const [lectureTitleError, setLectureTitleError] = useState<string | null>(null);
  const [description, setDescription] = useState('');

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
        const [recordingData, studentData, chapterData] = await Promise.all([
          getTeacherSubjectRecordings(session.token, subjectId),
          getTeacherSubjectStudents(session.token, subjectId),
          getTeacherChapters(session.token, subjectId),
        ]);
        setRecordings(recordingData);
        setStudents(studentData);
        setChapters(chapterData);
        
        if (initialChapterId) {
          const initialChapter = chapterData.find(
            (chapter) => chapter.id === initialChapterId,
          );

          if (initialChapter) {
            setSelectedChapter(initialChapter);
          }
        }
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

  useEffect(() => {
    if (!showUploadModal || !pendingUri) {
      safelyPausePlayer(previewPlayer);
      return;
    }
    previewPlayer.replace(pendingUri);
  }, [pendingUri, previewPlayer, showUploadModal]);

  const filteredRecordings = useMemo(() => {
    if (!selectedChapter) {
      return [];
    }

    return recordings.filter(
      (r) =>
        r.chapter_id === selectedChapter.id ||
        (r.chapter_id === null && r.chapter_name === selectedChapter.name),
    );
  }, [recordings, selectedChapter]);

  const completedCount = filteredRecordings.filter(
    (recording) => recording.status === "completed",
  ).length;
  const previewBars = useMemo(() => buildWaveformBars(pendingUri ?? subjectName), [pendingUri, subjectName]);
  const previewProgress =
    previewStatus.duration > 0 ? Math.min(1, previewStatus.currentTime / previewStatus.duration) : 0;

  const closeUploadModal = async () => {
    safelyPausePlayer(previewPlayer);
    if (previewStatus.duration > 0) {
      await previewPlayer.seekTo(0).catch(() => undefined);
    }
    setShowUploadModal(false);
    setPendingUri(null);
    setLectureTitle('');
    setLectureTitleError(null);
    setDescription('');
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];
      const resolvedMime = inferMimeTypeFromUri(asset.uri, asset.mimeType);
      if (!isAudioMimeType(resolvedMime)) {
        Alert.alert('Audio only', 'Please select an audio file such as MP3, WAV, M4A, OGG, AAC, or WebM.');
        return;
      }

      setPendingUri(asset.uri);
      setPendingMime(resolvedMime);
      setDescription('');
      setShowActionSheet(false);
      setShowUploadModal(true);
    } catch {
      Alert.alert('Error', 'Could not open the file picker.');
    }
  };

  const handleUpload = async () => {
    if (!session || !pendingUri || uploading || !selectedChapter) {
      return;
    }
    let hasError = false;
    if (!lectureTitle.trim()) {
      setLectureTitleError('Lecture title is required.');
      hasError = true;
    }
    if (hasError) {
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    try {
      const recording = await uploadRecording(
        session.token,
        subjectId,
        pendingUri,
        pendingMime,
        selectedChapter.id,
        lectureTitle.trim(),
        description.trim() || undefined,
        undefined, // transcription
        undefined, // durationSeconds
        setUploadProgress,
      );
      setRecordings((current) => [recording, ...current]);
      await closeUploadModal();
      setActiveTab('recordings');
      console.log('[teacher-subject] upload:success', {
        subjectId,
        pendingUri,
        recordingId: recording.id,
      });
    } catch (e) {
      console.error('[teacher-subject] upload:failure', {
        subjectId,
        subjectName,
        pendingUri,
        pendingMime,
        error: e,
      });
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Could not upload recording.');
    } finally {
      setUploading(false);
    }
  };

  const handleRetry = async (recordingId: number) => {
    if (!session || retryingId !== null) return;
    setRetryingId(recordingId);
    try {
      const updated = await retryRecording(session.token, recordingId);
      setRecordings((current) =>
        current.map((r) => (r.id === recordingId ? updated : r)),
      );
    } catch (e) {
      Alert.alert('Retry failed', e instanceof Error ? e.message : 'Could not queue retry.');
    } finally {
      setRetryingId(null);
    }
  };

  const handlePreviewToggle = async () => {
    if (!pendingUri) {
      return;
    }

    if (previewStatus.playing) {
      previewPlayer.pause();
      return;
    }

    if (previewStatus.duration > 0 && previewStatus.currentTime >= previewStatus.duration - 0.2) {
      await previewPlayer.seekTo(0).catch(() => undefined);
    }
    previewPlayer.play();
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate("TeacherSubjects");
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
        <View style={styles.hero}>
          <Text style={styles.heroKicker}>COURSE MODULE</Text>
          <Text style={styles.heroTitle}>{subjectName}</Text>
          <Text style={styles.heroBody}>
            Capture classroom audio, upload previous sessions, review your class list, and open each report in one place.
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

        {activeTab === 'recordings' && selectedChapter !== null ? (
          <View style={styles.actionRow}>
            <Pressable onPress={() => setShowActionSheet(true)} style={styles.actionButton}>
              <Ionicons color="#fff" name="add-circle-outline" size={18} />
              <Text style={styles.actionButtonText}>Upload New Recording</Text>
            </Pressable>
          </View>
        ) : null}

        {filteredRecordings.length > 0 ? (
          <View style={styles.statsStrip}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{filteredRecordings.length}</Text>
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
                {filteredRecordings.length - completedCount}
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
          selectedChapter === null ? (
            chapters.length === 0 ? (
              <View style={styles.center}>
                <Ionicons color={AppTheme.colors.textSecondary} name="folder-open-outline" size={40} />
                <Text style={styles.emptyTitle}>No chapters yet</Text>
                <Text style={styles.emptyBody}>Chapters will be shown here. Please contact your school administrator to add chapters for this subject.</Text>
              </View>
            ) : (
              <View style={styles.sectionStack}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Chapters</Text>
                  <Text style={styles.sectionCount}>{chapters.length}</Text>
                </View>
                {chapters.map((chapter) => {
                  const chapterRecordings = recordings.filter(
                    (r) => r.chapter_id === chapter.id || (r.chapter_id === null && r.chapter_name === chapter.name)
                  );
                  return (
                    <Pressable
                      key={chapter.id}
                      onPress={() => setSelectedChapter(chapter)}
                      style={styles.card}
                    >
                      <View style={styles.cardIcon}>
                        <Ionicons color={AppTheme.colors.primary} name="folder-outline" size={20} />
                      </View>
                      <View style={styles.cardContent}>
                        <Text numberOfLines={1} style={styles.cardTitle}>
                          {chapter.name}
                        </Text>
                        <Text numberOfLines={2} style={styles.cardMeta}>
                          {chapter.description || 'No description provided.'}
                        </Text>
                        <Text style={[styles.cardMeta, { color: AppTheme.colors.primary, fontWeight: '600', marginTop: 4 }]}>
                          {chapterRecordings.length} {chapterRecordings.length === 1 ? 'recording' : 'recordings'}
                        </Text>
                      </View>
                      <Ionicons color={AppTheme.colors.textSecondary} name="chevron-forward" size={16} />
                    </Pressable>
                  );
                })}
              </View>
            )
          ) : (
            <View style={styles.sectionStack}>
              <Pressable
                onPress={() => setSelectedChapter(null)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 8,
                }}
              >
                <Ionicons color={AppTheme.colors.primary} name="arrow-back" size={18} />
                <Text style={{ color: AppTheme.colors.primary, fontWeight: '700', fontSize: 15 }}>
                  Back to Chapters
                </Text>
              </Pressable>
              
              <View style={[styles.card, { backgroundColor: AppTheme.colors.primarySoft, borderColor: AppTheme.colors.primary, borderStyle: 'dashed' }]}>
                <View style={[styles.cardIcon, { backgroundColor: AppTheme.colors.surface }]}>
                  <Ionicons color={AppTheme.colors.primary} name="folder-open" size={20} />
                </View>
                <View style={styles.cardContent}>
                  <Text style={[styles.cardTitle, { color: AppTheme.colors.primaryDark }]}>
                    {selectedChapter.name}
                  </Text>
                  <Text style={[styles.cardMeta, { color: AppTheme.colors.textSecondary }]}>
                    {selectedChapter.description || 'No description provided.'}
                  </Text>
                </View>
              </View>

              {filteredRecordings.length === 0 ? (
                <View style={styles.center}>
                  <Ionicons color={AppTheme.colors.textSecondary} name="mic-outline" size={40} />
                  <Text style={styles.emptyTitle}>No recordings in this chapter</Text>
                  <Text style={styles.emptyBody}>Record or upload your first lesson for this chapter.</Text>
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recordings</Text>
                    <Text style={styles.sectionCount}>{filteredRecordings.length}</Text>
                  </View>
                  {filteredRecordings.map((recording) => (
                    <RecordingRow
                      key={recording.id}
                      onPress={() => navigation.navigate('RecordingDetail', { recording, subjectName })}
                      onRetry={() => void handleRetry(recording.id)}
                      recording={recording}
                      retrying={retryingId === recording.id}
                    />
                  ))}
                </View>
              )}
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
      </ScrollView>

      <Modal animationType="fade" onRequestClose={() => setShowActionSheet(false)} transparent visible={showActionSheet}>
        <Pressable onPress={() => setShowActionSheet(false)} style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Add Recording</Text>
            <Text style={styles.sheetSubtitle}>Choose how you want to add an audio recording for this class.</Text>

            <Pressable
              onPress={() => {
                setShowActionSheet(false);
                navigation.navigate('TeacherRecording', {
                  subjectId,
                  subjectName,
                  chapterId: selectedChapter?.id,
                  chapterName: selectedChapter?.name,
                });
              }}
              style={styles.sheetOption}
            >
              <View style={styles.sheetOptionIcon}>
                <Ionicons color={AppTheme.colors.primary} name="mic-outline" size={20} />
              </View>
              <View style={styles.sheetOptionBody}>
                <Text style={styles.sheetOptionTitle}>Record in App</Text>
                <Text style={styles.sheetOptionText}>Record the class now and review it before uploading.</Text>
              </View>
            </Pressable>

            <Pressable onPress={() => void handlePickFile()} style={styles.sheetOption}>
              <View style={styles.sheetOptionIcon}>
                <Ionicons color={AppTheme.colors.primary} name="document-outline" size={20} />
              </View>
              <View style={styles.sheetOptionBody}>
                <Text style={styles.sheetOptionTitle}>Upload Audio File</Text>
                <Text style={styles.sheetOptionText}>Select an existing MP3, WAV, M4A, OGG, AAC, or WebM recording.</Text>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal animationType="slide" onRequestClose={() => void closeUploadModal()} transparent visible={showUploadModal}>
        <Pressable onPress={() => void closeUploadModal()} style={styles.sheetOverlay}>
          <Pressable style={[styles.sheet, styles.uploadSheet]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Upload Audio Recording</Text>
            <Text style={styles.sheetSubtitle}>Add the details, review the audio, then upload it for analysis.</Text>

            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewTitle}>Preview</Text>
                <Text style={styles.previewMeta}>
                  {formatAudioTime(previewStatus.currentTime)} / {formatAudioTime(previewStatus.duration)}
                </Text>
              </View>
              <Pressable onPress={() => void handlePreviewToggle()} style={styles.previewButton}>
                <View style={styles.previewIcon}>
                  {!previewStatus.isLoaded ? (
                    <ActivityIndicator color={AppTheme.colors.primary} size="small" />
                  ) : (
                    <Ionicons
                      color={AppTheme.colors.primary}
                      name={previewStatus.playing ? 'pause' : 'play'}
                      size={22}
                    />
                  )}
                </View>
                <View style={styles.previewTextWrap}>
                  <Text style={styles.previewTextTitle}>Review audio</Text>
                  <Text style={styles.previewTextBody}>Play the recording once before uploading it for processing.</Text>
                </View>
              </Pressable>
              <AudioWaveform bars={previewBars} progress={previewProgress} />
            </View>

            <Text style={styles.inputLabel}>CHAPTER</Text>
            <View style={{
              paddingHorizontal: 14,
              paddingVertical: 12,
              borderRadius: 16,
              backgroundColor: AppTheme.colors.surfaceMuted,
              borderWidth: 1,
              borderColor: AppTheme.colors.border,
              marginBottom: 12,
            }}>
              <Text style={{ color: AppTheme.colors.textPrimary, fontSize: 15, fontWeight: '600' }}>
                {selectedChapter?.name}
              </Text>
            </View>

            <Text style={styles.inputLabel}>LECTURE TITLE *</Text>
            <TextInput
              autoCapitalize="words"
              onChangeText={(val) => {
                setLectureTitle(val);
                if (val.trim()) {
                  setLectureTitleError(null);
                }
              }}
              placeholder="Enter lecture title"
              placeholderTextColor={AppTheme.colors.textPlaceholder}
              style={[styles.input, lectureTitleError && { borderColor: '#E53935' }]}
              value={lectureTitle}
            />
            {lectureTitleError ? (
              <Text style={{ color: '#E53935', fontSize: 12, marginTop: 4, marginBottom: 4, fontWeight: '600' }}>
                {lectureTitleError}
              </Text>
            ) : null}

            <Text style={styles.inputLabel}>DESCRIPTION</Text>
            <TextInput
              autoCapitalize="sentences"
              multiline
              numberOfLines={4}
              onChangeText={setDescription}
              placeholder="Optional summary or notes for this recording"
              placeholderTextColor={AppTheme.colors.textPlaceholder}
              style={[styles.input, styles.descriptionInput]}
              value={description}
            />

            <View style={styles.modalActions}>
              <Pressable onPress={() => void closeUploadModal()} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={uploading}
                onPress={() => void handleUpload()}
                style={[styles.primaryButton, uploading && styles.buttonDisabled]}
              >
                {uploading ? <ActivityIndicator color="#fff" size="small" /> : null}
                <Text style={styles.primaryButtonText}>
                  {uploading ? `Uploading… ${uploadProgress}%` : 'Upload'}
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
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: AppTheme.colors.textPrimary },
  scroll: { paddingBottom: 40, gap: 16 },
  hero: {
    padding: 20,
    backgroundColor: AppTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.border,
    gap: 8,
  },
  heroKicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, color: AppTheme.colors.primary },
  heroTitle: { fontSize: 30, fontWeight: '800', color: AppTheme.colors.textPrimary, letterSpacing: -0.5 },
  heroBody: { fontSize: 14, lineHeight: 20, color: AppTheme.colors.textSecondary },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 4,
    borderRadius: 18,
    backgroundColor: AppTheme.colors.surfaceMuted,
  },
  tabButton: { flex: 1, paddingVertical: 10, borderRadius: AppTheme.radius.large, alignItems: 'center' },
  tabButtonActive: { backgroundColor: AppTheme.colors.surface },
  tabLabel: { fontSize: 14, fontWeight: '700', color: AppTheme.colors.textSecondary },
  tabLabelActive: { color: AppTheme.colors.textPrimary },
  actionRow: { paddingHorizontal: 20 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: AppTheme.colors.primary,
  },
  actionButtonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  statsStrip: {
    flexDirection: 'row',
    marginHorizontal: 20,
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
  center: { paddingHorizontal: 20, paddingVertical: 56, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: AppTheme.colors.textPrimary },
  emptyBody: { textAlign: 'center', fontSize: 14, lineHeight: 20, color: AppTheme.colors.textSecondary },
  sectionStack: { paddingHorizontal: 20, gap: 16 },
  section: { paddingHorizontal: 20, gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: AppTheme.colors.textPrimary },
  sectionCount: {
    minWidth: 26,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    textAlign: 'center',
    backgroundColor: AppTheme.colors.surfaceMuted,
    color: AppTheme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    backgroundColor: AppTheme.colors.surface,
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: AppTheme.radius.large,
    backgroundColor: AppTheme.colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: AppTheme.colors.textPrimary },
  cardMeta: { fontSize: 13, color: AppTheme.colors.textSecondary },
  cardRight: { alignItems: 'flex-end', gap: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '700' },
  retryIcon: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  studentAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: AppTheme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentAvatarText: { fontSize: 15, fontWeight: '800', color: AppTheme.colors.primaryDark },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 28, 28, 0.32)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: AppTheme.colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
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
    borderRadius: 18,
    backgroundColor: AppTheme.colors.surfaceSoft,
  },
  sheetOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: AppTheme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptionBody: { flex: 1, gap: 4 },
  sheetOptionTitle: { fontSize: 15, fontWeight: '700', color: AppTheme.colors.textPrimary },
  sheetOptionText: { fontSize: 13, lineHeight: 18, color: AppTheme.colors.textSecondary },
  previewCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    backgroundColor: AppTheme.colors.surfaceSoft,
    gap: 12,
  },
  previewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  previewTitle: { fontSize: 16, fontWeight: '800', color: AppTheme.colors.textPrimary },
  previewMeta: { fontSize: 12, color: AppTheme.colors.textSecondary, fontWeight: '600' },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: AppTheme.colors.surface,
  },
  previewIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AppTheme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTextWrap: { flex: 1, gap: 3 },
  previewTextTitle: { fontSize: 15, fontWeight: '700', color: AppTheme.colors.textPrimary },
  previewTextBody: { fontSize: 13, lineHeight: 18, color: AppTheme.colors.textSecondary },
  inputLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, color: AppTheme.colors.textSecondary },
  input: {
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    borderRadius: 16,
    backgroundColor: AppTheme.colors.surfaceSoft,
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
    borderRadius: 16,
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
    borderRadius: 16,
    backgroundColor: AppTheme.colors.primary,
  },
  primaryButtonText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  buttonDisabled: { opacity: 0.55 },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: AppTheme.colors.border,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: AppTheme.colors.primary,
  },
});
