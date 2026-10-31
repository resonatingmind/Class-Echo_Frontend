import { AppTheme } from '../theme/AppTheme';
import { useEffect, useMemo, useState, useRef } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import * as DocumentPicker from 'expo-document-picker';
import { AudioWaveform } from '../components/AudioWaveform';
import { useAuth } from '../context/AuthContext';
import { formatAudioTime, inferMimeTypeFromUri, normalizeMeteringValue } from '../lib/audio';
import { buildAudioBlobUrl, clearAudioChunks } from '../lib/audioChunkStore';
import {
  RecordingDraft,
  RecordingDraftAudio,
  clearRecordingDraft,
  createDraftId,
  draftHasContent,
  loadRecordingDraft,
  saveRecordingDraft,
} from '../lib/recordingDraft';
import { useLectureRecorder } from '../lib/useLectureRecorder';
import { uploadRecording, getTeacherLearningPlans, createTeacherLearningPlan } from '../lib/api';
import { LectureSuggestion, suggestLecture } from '../lib/lectureContext';
import { ChapterOut, LearningPlanOut } from '../types/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'TeacherRecording'>;

type RecordState = 'idle' | 'recording' | 'paused' | 'stopped';

/* How often the in-progress lecture is mirrored to durable storage. The audio
   itself is staged continuously by the recorder; this only covers the metadata,
   the typed fields and the dictation transcript. */
const DRAFT_AUTOSAVE_MS = 5000;
/* Older than this and the teacher has moved on; offering it back would be noise. */
const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/* Local calendar day, not UTC — a late-evening class in IST must not be dated
   as the previous day. */
function todayIsoDate(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function safelyPausePlayer(player: { pause: () => void }) {
  try {
    player.pause();
  } catch {
    // The hook releases the player automatically on unmount.
  }
}

export function RecordingScreen({ navigation, route }: Props) {
  const { session } = useAuth();
  const {
    subjectId,
    subjectName,
    existingChapters = [],
    chapterId,
    chapterName: paramChapterName,
    learningPlanId,
    lectureTitle: paramLectureTitle,
    replaceRecordingId,
    fromTimetable = false,
  } = route.params;
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const recorder = useLectureRecorder();
  const recorderState = recorder.status;
  const previewPlayer = useAudioPlayer(null, { updateInterval: 180 });
  const previewStatus = useAudioPlayerStatus(previewPlayer);

  const [state, setState] = useState<RecordState>('idle');
  const [lectureTitle, setLectureTitle] = useState(paramLectureTitle || '');
  const [lectureTitleError, setLectureTitleError] = useState<string | null>(null);
  const [transcription, setTranscription] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState<'idle' | 'sending' | 'finalizing' | 'done'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  // The actual container of the audio we are holding. Never guessed: guessing
  // "audio/mp4" for a browser's webm clip makes the server store it under the
  // wrong extension, and the analysis step then rejects the file.
  const [recordedMimeType, setRecordedMimeType] = useState<string | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [meterBars, setMeterBars] = useState<number[]>([]);
  // Alert.alert is a no-op on web, so recorder failures need an inline home too.
  const [recorderError, setRecorderError] = useState<string | null>(null);
  const [recoverableDraft, setRecoverableDraft] = useState<RecordingDraft | null>(null);
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(false);

  const [learningPlans, setLearningPlans] = useState<LearningPlanOut[]>([]);
  const [selectedLearningPlanId, setSelectedLearningPlanId] = useState<number | undefined>(learningPlanId);
  // Audio always belongs to one lecture: either an existing sub-topic or a brand new one.
  const [creatingNewLecture, setCreatingNewLecture] = useState(!learningPlanId && !replaceRecordingId);
  const [lectureSelectError, setLectureSelectError] = useState<string | null>(null);

  /* A timetable launch knows only the subject. The chapter and lecture are
     guessed from the planner while the teacher records, and confirmed after Stop. */
  const [selectedChapterId, setSelectedChapterId] = useState<number | undefined>(chapterId);
  const [chapters, setChapters] = useState<ChapterOut[]>([]);
  const [suggestion, setSuggestion] = useState<LectureSuggestion | null>(null);
  const [suggestionLoading, setSuggestionLoading] = useState(fromTimetable);
  // Once the teacher picks a chapter or lecture, a late suggestion must not undo it.
  const choiceTouchedRef = useRef(false);

  const applySuggestion = (s: LectureSuggestion) => {
    setSelectedChapterId(s.chapter?.id);
    setSelectedLearningPlanId(s.plan?.id);
    setCreatingNewLecture(!s.plan);
  };

  useEffect(() => {
    if (!fromTimetable || !session) return;
    let cancelled = false;
    suggestLecture(session.token, subjectId)
      .then((s) => {
        if (cancelled) return;
        setChapters(s.chapters);
        setSuggestion(s);
        if (!choiceTouchedRef.current) applySuggestion(s);
      })
      .catch(() => {
        // No suggestion: the teacher picks the chapter after Stop.
      })
      .finally(() => {
        if (!cancelled) setSuggestionLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fromTimetable, session, subjectId]);

  const selectedChapterName =
    chapters.find((c) => c.id === selectedChapterId)?.name ?? paramChapterName;

  const selectChapter = (chapter: ChapterOut) => {
    choiceTouchedRef.current = true;
    if (chapter.id === selectedChapterId) return;
    setSelectedChapterId(chapter.id);
    // A lecture created by an earlier failed upload belongs to the old chapter.
    createdLearningPlanIdRef.current = null;
    setLearningPlans([]);
    setSelectedLearningPlanId(undefined);
    setCreatingNewLecture(true);
    setLectureSelectError(null);
  };

  useEffect(() => {
    if (session && subjectId && selectedChapterId) {
      getTeacherLearningPlans(session.token, subjectId, selectedChapterId)
        .then(setLearningPlans)
        .catch(() => setLearningPlans([]));
    }
  }, [session, subjectId, selectedChapterId]);

  const selectedLearningPlan = useMemo(
    () => learningPlans.find((lp) => lp.id === selectedLearningPlanId) ?? null,
    [learningPlans, selectedLearningPlanId],
  );

  const selectExistingLecture = (lp: LearningPlanOut) => {
    choiceTouchedRef.current = true;
    setSelectedLearningPlanId(lp.id);
    setCreatingNewLecture(false);
    setLectureSelectError(null);
    setLectureTitleError(null);
  };

  const selectNewLecture = () => {
    choiceTouchedRef.current = true;
    setSelectedLearningPlanId(undefined);
    setCreatingNewLecture(true);
    setLectureSelectError(null);
  };

  /* Dev-only: a browser transcript uploaded with the audio stops the backend
     from transcribing it properly, so teachers never get dictation. */
  const [isDictatingEnabled, setIsDictatingEnabled] = useState(__DEV__);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [dictationError, setDictationError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  // Survives a failed upload so a retry does not create a second lecture.
  const createdLearningPlanIdRef = useRef<number | null>(null);
  const isRecordingRef = useRef(false);
  const isDictatingEnabledRef = useRef(isDictatingEnabled);

  useEffect(() => {
    isDictatingEnabledRef.current = isDictatingEnabled;
  }, [isDictatingEnabled]);

  const isSpeechSupported = useMemo(() => {
    return Platform.OS === 'web' && (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window));
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (event: any) => {
      let final = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      if (final) {
        setLiveTranscript((prev) => {
          const next = prev + final;
          setTranscription(next.trim());
          return next;
        });
        setInterimTranscript('');
      } else {
        setInterimTranscript(interim);
      }
    };

    rec.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setDictationError(event.error);
    };

    rec.onend = () => {
      // Auto-restart if we are still supposed to be recording
      if (isRecordingRef.current && isDictatingEnabledRef.current) {
        try {
          rec.start();
        } catch (e) {
          console.error('Failed to restart speech recognition', e);
        }
      }
    };

    recognitionRef.current = rec;

    return () => {
      try {
        rec.stop();
      } catch (e) {
        // ignore
      }
    };
  }, []);

  useEffect(() => {
    if (state !== 'recording') {
      return;
    }

    setMeterBars((current) => [...current.slice(-35), normalizeMeteringValue(recorderState.metering)]);
  }, [recorderState.metering, state]);

  const liveDurationMillis = recorderState.durationMillis;

  const previewBars = useMemo(() => {
    if (meterBars.length > 0) {
      return meterBars;
    }
    return Array.from({ length: 36 }, () => 0.22);
  }, [meterBars]);

  const previewProgress =
    previewStatus.duration > 0 ? Math.min(1, previewStatus.currentTime / previewStatus.duration) : 0;

  /* ---- crash and refresh recovery ---------------------------------------- */

  const draftIdRef = useRef<string | null>(null);
  const draftStartedAtRef = useRef(0);
  const [draftChecked, setDraftChecked] = useState(false);
  const autoStartedRef = useRef(false);
  /* The autosave timer and the dictation callbacks both outlive the render that
     created them, so everything they read lives in a ref rather than a closure
     over state - otherwise a five-minute-old copy of the form gets written. */
  const liveDurationRef = useRef(0);
  const liveTranscriptRef = useRef('');
  const draftFieldsRef = useRef({
    lectureTitle,
    description,
    creatingNewLecture,
    selectedLearningPlanId,
    selectedChapterId,
  });
  liveDurationRef.current = liveDurationMillis;
  liveTranscriptRef.current = liveTranscript;
  draftFieldsRef.current = {
    lectureTitle, description, creatingNewLecture, selectedLearningPlanId, selectedChapterId,
  };

  const persistDraft = async (
    elapsedMillis: number,
    transcript: string,
    audio: RecordingDraftAudio = null,
  ) => {
    const id = draftIdRef.current;
    if (!id) {
      return;
    }
    const fields = draftFieldsRef.current;
    await saveRecordingDraft({
      id,
      startedAt: draftStartedAtRef.current || Date.now(),
      updatedAt: Date.now(),
      platform: Platform.OS,
      route: {
        subjectId,
        subjectName,
        chapterId,
        chapterName: paramChapterName,
        learningPlanId,
        lectureTitle: paramLectureTitle,
        replaceRecordingId,
      },
      form: {
        lectureTitle: fields.lectureTitle,
        description: fields.description,
        transcript: transcript.trim(),
        creatingNewLecture: fields.creatingNewLecture,
        selectedLearningPlanId: fields.selectedLearningPlanId,
        selectedChapterId: fields.selectedChapterId,
      },
      elapsedMillis,
      audio,
    });
  };

  const discardDraft = async () => {
    draftIdRef.current = null;
    await clearRecordingDraft();
    await clearAudioChunks();
  };

  const autosaveRef = useRef<() => void>(() => {});
  autosaveRef.current = () => {
    // Reassigned every render, so this always reads the live recorder.
    void persistDraft(liveDurationRef.current, liveTranscriptRef.current, recorder.stagedAudio());
  };

  useEffect(() => {
    if (state !== 'recording') {
      return;
    }
    const timer = setInterval(() => autosaveRef.current(), DRAFT_AUTOSAVE_MS);
    return () => clearInterval(timer);
  }, [state]);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const draft = await loadRecordingDraft();
      if (cancelled || !draft) {
        return;
      }
      // A draft from a different subject belongs to a different screen; leaving
      // it alone means it is still there when the teacher opens that subject.
      if (
        draft.route.subjectId !== subjectId ||
        draft.route.chapterId !== chapterId ||
        // A draft captured while replacing one lecture's audio must not be
        // recovered into a screen that would file it as a brand new lecture.
        draft.route.replaceRecordingId !== replaceRecordingId
      ) {
        // Only one draft is kept, so recording now would overwrite that one.
        if (Date.now() - draft.updatedAt <= DRAFT_MAX_AGE_MS && draftHasContent(draft)) {
          autoStartedRef.current = true;
        }
        return;
      }
      if (Date.now() - draft.updatedAt > DRAFT_MAX_AGE_MS || !draftHasContent(draft)) {
        await clearRecordingDraft();
        await clearAudioChunks();
        return;
      }
      setRecoverableDraft(draft);
    };
    // Auto-start waits for this check, so it never records over a lecture the
    // teacher might still want back.
    void check().finally(() => {
      if (!cancelled) setDraftChecked(true);
    });
    return () => {
      cancelled = true;
    };
  }, [subjectId, chapterId, replaceRecordingId]);

  const restoreDraft = async () => {
    const draft = recoverableDraft;
    if (!draft || recovering) {
      return;
    }
    setRecovering(true);
    try {
      setLectureTitle(draft.form.lectureTitle);
      setDescription(draft.form.description);
      setTranscription(draft.form.transcript);
      setLiveTranscript(draft.form.transcript);
      setCreatingNewLecture(draft.form.creatingNewLecture);
      setSelectedLearningPlanId(draft.form.selectedLearningPlanId);
      if (draft.form.selectedChapterId) setSelectedChapterId(draft.form.selectedChapterId);
      // The teacher's earlier choice wins over a suggestion still loading.
      choiceTouchedRef.current = true;

      const mimeType = draft.audio?.mimeType ?? 'audio/webm';
      let restoredUri: string | null = null;
      if (draft.audio?.kind === 'chunks') {
        // Web: reassembled from the fragments staged in IndexedDB.
        restoredUri = await buildAudioBlobUrl(mimeType);
      } else if (draft.audio?.kind === 'file' && draft.audio.uri && recorder.canRecoverAudio) {
        // Native: the recorder's own cache file, usable as-is only where the
        // output format tolerates an unclean stop. Whether the file is still on
        // disk is a separate question - the OS may have swept the cache - which
        // is why the notice below points the teacher at the preview.
        restoredUri = draft.audio.uri;
      }

      draftIdRef.current = draft.id;
      draftStartedAtRef.current = draft.startedAt;

      if (restoredUri) {
        setRecordedUri(restoredUri);
        setRecordedMimeType(mimeType);
        setRecordedDuration(draft.elapsedMillis / 1000);
        try {
          previewPlayer.replace(restoredUri);
        } catch {
          // Preview is optional; the audio is still uploadable.
        }
        setRecoveryNotice(
          'Recovered the audio from your interrupted lecture. Play the preview to confirm it is complete before uploading.',
        );
        setState('stopped');
      } else {
        await clearAudioChunks();
        setRecoveryNotice(
          'The audio from the interrupted lecture could not be recovered, but your lecture details and transcript are back. Record again to attach new audio.',
        );
        setState('idle');
      }
      setRecoverableDraft(null);
    } finally {
      setRecovering(false);
    }
  };

  const dismissDraft = async () => {
    setRecoverableDraft(null);
    await discardDraft();
  };

  const startRecording = async () => {
    try {
      const granted = await recorder.requestPermission();
      if (!granted) {
        setRecorderError('Microphone access is needed to record audio.');
        Alert.alert('Permission required', 'Microphone access is needed to record audio.');
        return;
      }

      setRecorderError(null);
      setRecoveryNotice(null);
      setRecoverableDraft(null);
      setMeterBars([]);
      setRecordedUri(null);
      setRecordedMimeType(null);
      setRecordedDuration(0);
      setLiveTranscript('');
      setInterimTranscript('');
      setDictationError(null);
      isRecordingRef.current = true;

      await recorder.start();
      // The draft is opened before anything else can fail, so even a recording
      // that dies in its first seconds leaves a trail back to the right chapter.
      draftIdRef.current = createDraftId();
      draftStartedAtRef.current = Date.now();
      void persistDraft(0, '', recorder.stagedAudio());
      setState('recording');

      if (isSpeechSupported && isDictatingEnabled && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.error('Failed to start speech recognition', e);
        }
      }
    } catch (e) {
      isRecordingRef.current = false;
      await recorder.discard().catch(() => {
        // Nothing to release.
      });
      const message = e instanceof Error ? e.message : 'Could not start recording. Please try again.';
      setRecorderError(message);
      Alert.alert('Error', message);
    }
  };

  // Timetable launch: the tap on Record already said "start", so don't ask again.
  useEffect(() => {
    if (!fromTimetable || !draftChecked || recoverableDraft || autoStartedRef.current) return;
    autoStartedRef.current = true;
    void startRecording();
    // startRecording is recreated every render; this must run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromTimetable, draftChecked, recoverableDraft]);

  /* Pause keeps the same recorder session alive, so resumed audio is appended to
     the very same file. The teacher ends up with one continuous lecture instead
     of several clips that would each need their own upload and analysis. */
  const pauseRecording = () => {
    if (state !== 'recording') {
      return;
    }
    try {
      // Cleared before stopping dictation so the recognition 'onend' handler does
      // not immediately restart it.
      isRecordingRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Dictation is best-effort; capturing the audio is what matters.
        }
      }
      recorder.pause();
      setInterimTranscript('');
      setState('paused');
      void persistDraft(liveDurationMillis, liveTranscript, recorder.stagedAudio());
    } catch {
      setRecorderError('Could not pause the recording.');
      Alert.alert('Error', 'Could not pause the recording.');
    }
  };

  const resumeRecording = async () => {
    if (state !== 'paused') {
      return;
    }
    try {
      isRecordingRef.current = true;
      await recorder.resume();
      setRecorderError(null);
      setState('recording');

      if (isSpeechSupported && isDictatingEnabled && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.error('Failed to restart speech recognition', e);
        }
      }
    } catch {
      isRecordingRef.current = false;
      setRecorderError('Could not resume the recording.');
      Alert.alert('Error', 'Could not resume the recording.');
    }
  };

  const stopRecording = async () => {
    try {
      isRecordingRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error('Failed to stop speech recognition', e);
        }
      }

      const finished = await recorder.stop();
      if (!finished) {
        throw new Error('Missing recording file');
      }
      setRecordedUri(finished.uri);
      setRecordedMimeType(finished.mimeType);
      setRecordedDuration(finished.durationMillis / 1000);
      try {
        previewPlayer.replace(finished.uri);
      } catch {
        Alert.alert('Preview unavailable', 'The recording was saved, but preview could not be prepared.');
      }

      if (liveTranscript) {
        setTranscription(liveTranscript.trim());
      }
      setState('stopped');
      // The draft now describes a finished clip. It stays on disk until the
      // upload succeeds, so a crash on the review screen is survivable too.
      void persistDraft(finished.durationMillis, liveTranscript, recorder.stagedAudio());
    } catch {
      setRecorderError('Failed to stop the recording.');
      Alert.alert('Error', 'Failed to stop recording.');
    }
  };

  const cancelRecording = async () => {
    try {
      isRecordingRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
      await recorder.discard();
    } catch {
      // ignore cleanup failures
    }
    // Discarding is explicit, so the safety net goes with it.
    await discardDraft();
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("TeacherTabs" as any);
    }
  };

  const pickAudioFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const file = res.assets[0];
        setRecordedUri(file.uri);
        // The picker knows the real type; it used to be thrown away and
        // replaced with a hardcoded guess at upload time.
        setRecordedMimeType(inferMimeTypeFromUri(file.uri, file.mimeType));
        setRecordedDuration(0);
        // Only suggest a title while creating a new lecture — never overwrite the
        // title of a lecture that was already picked.
        if (file.name && creatingNewLecture && !lectureTitle.trim()) {
          const cleanName = file.name.replace(/\.[^/.]+$/, "");
          setLectureTitle(cleanName);
        }
        try {
          previewPlayer.replace(file.uri);
        } catch {
          // Preview fallback
        }
        setState('stopped');
      }
    } catch {
      Alert.alert('Error', 'Could not select audio file.');
    }
  };

  const reRecord = async () => {
    safelyPausePlayer(previewPlayer);
    if (previewStatus.duration > 0) {
      await previewPlayer.seekTo(0).catch(() => undefined);
    }
    isRecordingRef.current = false;
    setRecordedUri(null);
    setRecordedMimeType(null);
    setRecordedDuration(0);
    setMeterBars([]);
    createdLearningPlanIdRef.current = null;
    setLectureTitle(paramLectureTitle || '');
    setLectureTitleError(null);
    setLectureSelectError(null);
    if (fromTimetable && suggestion) {
      choiceTouchedRef.current = false;
      applySuggestion(suggestion);
    } else {
      setSelectedLearningPlanId(learningPlanId);
      setCreatingNewLecture(!learningPlanId && !replaceRecordingId);
    }
    setTranscription('');
    setDescription('');
    setLiveTranscript('');
    setInterimTranscript('');
    setDictationError(null);
    setState('idle');
  };

  const togglePreview = async () => {
    if (!recordedUri) {
      return;
    }

    if (previewStatus.playing) {
      safelyPausePlayer(previewPlayer);
      return;
    }

    if (previewStatus.duration > 0 && previewStatus.currentTime >= previewStatus.duration - 0.2) {
      await previewPlayer.seekTo(0).catch(() => undefined);
    }
    previewPlayer.play();
  };

  const handleUpload = async () => {
    if (!session || !recordedUri || uploading) {
      return;
    }
    // Bailing out silently here left the teacher tapping Upload with nothing
    // at all happening, and no clue why.
    if (!selectedChapterId) {
      setUploadError(
        fromTimetable
          ? 'Choose the chapter this lecture was from, so the AI evaluation has something to compare against.'
          : 'This recording is not linked to a chapter. Go back and start the recording from a chapter so the AI evaluation has something to compare against.',
      );
      return;
    }
    const chapterIdForUpload = selectedChapterId;
    let hasError = false;
    if (creatingNewLecture) {
      if (!lectureTitle.trim()) {
        setLectureTitleError('Lecture title is required.');
        hasError = true;
      }
    } else if (!selectedLearningPlanId && !replaceRecordingId) {
      setLectureSelectError('Choose the lecture this audio belongs to.');
      hasError = true;
    }
    if (hasError) {
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadPhase('sending');
    setUploadProgress(0);
    const resolvedMime = inferMimeTypeFromUri(recordedUri, recordedMimeType);
    const uploadUri = recordedUri.startsWith('/') ? `file://${recordedUri}` : recordedUri;
    console.log('[recording] upload:start', {
      subjectId,
      subjectName,
      recordedUri,
      uploadUri,
      resolvedMime,
      chapterId: chapterIdForUpload,
      creatingNewLecture,
      replaceRecordingId,
      hasDescription: Boolean(description.trim()),
      hasTranscription: Boolean(transcription.trim()),
    });
    try {
      // Resolve the lecture this audio belongs to. A new lecture becomes a real
      // planner sub-topic so it shows up in the chapter's lecture list too.
      let targetLearningPlanId = selectedLearningPlanId;
      let targetLectureTitle = selectedLearningPlan?.sub_topic ?? '';

      if (creatingNewLecture) {
        targetLectureTitle = lectureTitle.trim();
        // Reuse the plan from an earlier failed attempt. Creating a new one on
        // every retry littered the planner with duplicate lectures that the
        // teacher then had to clean up by hand.
        if (createdLearningPlanIdRef.current) {
          targetLearningPlanId = createdLearningPlanIdRef.current;
        } else {
          const createdPlan = await createTeacherLearningPlan(
            session.token,
            subjectId,
            chapterIdForUpload,
            {
              // A lecture created straight from an upload happened today, so it
              // lands in the planner dated instead of blank.
              date: todayIsoDate(),
              topic_name: selectedChapterName || targetLectureTitle,
              sub_topic: targetLectureTitle,
            },
          );
          createdLearningPlanIdRef.current = createdPlan.id;
          targetLearningPlanId = createdPlan.id;
        }
      }

      await uploadRecording(
        session.token,
        subjectId,
        recordedUri,
        resolvedMime,
        chapterIdForUpload,
        targetLectureTitle || paramLectureTitle || undefined,
        description.trim() || undefined,
        transcription.trim() || undefined,
        recordedDuration,
        (pct) => {
          setUploadProgress(pct);
          // Bytes are all sent; the server is still storing the audio and
          // queuing the analysis, which can take a while on large files.
          if (pct >= 100) setUploadPhase('finalizing');
        },
        targetLearningPlanId,
        replaceRecordingId,
      );
      console.log('[recording] upload:success', {
        subjectId,
        recordedUri,
      });
      setUploadPhase('done');
      await discardDraft();
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate("TeacherTabs" as any);
      };
    } catch (e) {
      console.error('[recording] upload:failure', {
        subjectId,
        subjectName,
        recordedUri,
        resolvedMime,
        error: e,
      });
      // Alert.alert is a no-op on web, so the message has to be rendered inline
      // or the teacher is left staring at a screen that looks frozen.
      setUploadPhase('idle');
      setUploadError(e instanceof Error ? e.message : 'Could not upload recording.');
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Could not upload recording.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
          onPress={state === 'recording' || state === 'paused' ? () => void cancelRecording() : () => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate("TeacherTabs" as any);
            }
          }}
          style={styles.headerBack}
        >
          <Ionicons color={AppTheme.colors.textPrimary} name="arrow-back" size={22} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{subjectName}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody} style={styles.body}>
        <View style={styles.centerContainer}>
          <View style={styles.contentBody}>
        {replaceRecordingId ? (
          <View
            style={{
              backgroundColor: AppTheme.colors.infoSoft,
              borderColor: '#BFDBFE',
              borderWidth: 1,
              borderRadius: AppTheme.radius.medium,
              padding: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              marginBottom: 16,
            }}
          >
            <Ionicons name="refresh-circle" size={24} color={AppTheme.colors.info} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: AppTheme.colors.infoStrong }}>
                Replacing Lecture Audio
              </Text>
              <Text style={{ fontSize: 12, color: AppTheme.colors.infoStrong, marginTop: 2, lineHeight: 16 }}>
                Recording or uploading a new audio file will replace the previous recording and trigger a fresh AI evaluation.
              </Text>
            </View>
          </View>
        ) : null}

        {recoverableDraft && state === 'idle' ? (
          <View style={styles.recoveryCard}>
            <Ionicons color={AppTheme.colors.warningText} name="warning" size={24} />
            <View style={{ flex: 1 }}>
              <Text style={styles.recoveryTitle}>Unfinished lecture found</Text>
              <Text style={styles.recoveryBody}>
                {`${recoverableDraft.route.chapterName || subjectName} · ${formatAudioTime(
                  recoverableDraft.elapsedMillis / 1000,
                )} recorded on ${new Date(recoverableDraft.startedAt).toLocaleString()}`}
              </Text>
              <View style={styles.recoveryActions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={recovering}
                  onPress={() => void restoreDraft()}
                  style={[styles.recoveryPrimary, recovering && styles.recoveryDisabled]}
                >
                  {recovering ? (
                    <ActivityIndicator color={AppTheme.colors.white} size="small" />
                  ) : (
                    <Text style={styles.recoveryPrimaryText}>Recover</Text>
                  )}
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={recovering}
                  onPress={() => void dismissDraft()}
                  style={styles.recoverySecondary}
                >
                  <Text style={styles.recoverySecondaryText}>Discard</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}

        {recoveryNotice ? (
          <Pressable accessibilityRole="button" onPress={() => setRecoveryNotice(null)} style={styles.noticeCard}>
            <Ionicons color={AppTheme.colors.infoStrong} name="information-circle" size={20} />
            <Text style={styles.noticeText}>{recoveryNotice}</Text>
            <Ionicons color={AppTheme.colors.info} name="close" size={16} />
          </Pressable>
        ) : null}

        {recorderError ? (
          <View style={styles.recorderErrorCard}>
            <Ionicons color={AppTheme.colors.dangerStrong} name="alert-circle" size={20} />
            <Text style={styles.recorderErrorText}>{recorderError}</Text>
          </View>
        ) : null}

        {state === 'idle' ? (
          <>
            <View style={styles.hero}>
              <View style={styles.micRing}>
                <Ionicons color={AppTheme.colors.primary} name="mic" size={52} />
              </View>
              <Text style={styles.idleTitle}>
                {replaceRecordingId ? 'Replace Lecture Recording' : 'Start Classroom Recording'}
              </Text>
              <Text style={styles.idleSubtitle}>
                {replaceRecordingId
                  ? 'Record or upload new audio for this lecture to replace the previous recording and regenerate the report.'
                  : 'Record the session, review the audio, and upload it with the chapter details when you are ready.'}
              </Text>
            </View>

            {__DEV__ && isSpeechSupported && (
              <Pressable
                accessibilityRole="button"
                onPress={() => setIsDictatingEnabled(!isDictatingEnabled)}
                style={styles.toggleRow}
              >
                <Ionicons
                  name={isDictatingEnabled ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
                  size={20}
                  color={isDictatingEnabled ? AppTheme.colors.primary : AppTheme.colors.textSecondary}
                />
                <Text style={styles.toggleLabel}>Enable Live Dictation (Web Speech API)</Text>
                <View style={[styles.toggleOuter, isDictatingEnabled && styles.toggleOuterActive]}>
                  <View style={[styles.toggleInner, isDictatingEnabled && styles.toggleInnerActive]} />
                </View>
              </Pressable>
            )}

            <View style={[styles.actionChoiceRow, isMobile && { flexDirection: 'column' }]}>
              <Pressable accessibilityRole="button" onPress={() => void startRecording()} style={[styles.recordBtn, isMobile ? { width: '100%' } : { flex: 1 }]}>
                <Ionicons color={AppTheme.colors.white} name="mic" size={22} />
                <Text style={styles.recordBtnText}>Start Live Recording</Text>
              </Pressable>

              <Pressable accessibilityRole="button" onPress={() => void pickAudioFile()} style={[styles.uploadChoiceBtn, isMobile ? { width: '100%' } : {}]}>
                <Ionicons color={AppTheme.colors.info} name="cloud-upload-outline" size={22} />
                <Text style={styles.uploadChoiceText}>Upload Audio File</Text>
              </Pressable>
            </View>
          </>
        ) : null}

        {state === 'recording' || state === 'paused' ? (
          <>
            <View style={styles.recordingTop}>
              <View style={styles.liveRow}>
                <View style={[styles.liveDot, state === 'paused' && styles.pausedDot]} />
                <Text style={[styles.liveLabel, state === 'paused' && styles.pausedLabel]}>
                  {state === 'paused' ? 'PAUSED' : 'RECORDING'}
                </Text>
              </View>
              <Text style={styles.timerText}>
                {formatAudioTime(liveDurationMillis / 1000)}
              </Text>
            </View>

            <View style={[styles.waveformCard, state === 'paused' && styles.waveformCardPaused]}>
              <AudioWaveform
                activeColor={state === 'paused' ? AppTheme.colors.slate400 : AppTheme.colors.recording}
                bars={previewBars}
                inactiveColor={state === 'paused' ? AppTheme.colors.slate200 : '#FAD4D4'}
                progress={1}
              />
            </View>

            {isSpeechSupported && isDictatingEnabled && state === 'recording' && (
              <View style={styles.dictationCard}>
                <View style={styles.dictationHeader}>
                  <Ionicons name="chatbubble-ellipses" size={16} color={dictationError ? AppTheme.colors.recording : AppTheme.colors.primary} />
                  <Text style={styles.dictationTitle}>
                    {dictationError ? `Dictation Error: ${dictationError}` : 'Live Dictation Transcript'}
                  </Text>
                  <View style={[styles.livePulse, { backgroundColor: dictationError ? AppTheme.colors.recording : colors.success }]} />
                </View>
                <ScrollView style={styles.dictationScroll} nestedScrollEnabled>
                  <Text style={styles.dictationText}>
                    {liveTranscript}
                    <Text style={styles.interimText}>{interimTranscript}</Text>
                    {!liveTranscript && !interimTranscript && !dictationError && (
                      <Text style={styles.placeholderText}>Start speaking to see live dictation...</Text>
                    )}
                    {dictationError && (
                      <Text style={styles.errorText}>
                        Speech recognition issue ("{dictationError}"). 
                        {dictationError === 'network' && "\n• Note: Chrome's Web Speech API requires an active internet connection."}
                        {"\n• Security Note: If you are accessing this page via a local IP address (e.g., http://192.168.x.x:8081), the browser will block microphone permissions. Please use http://localhost:8081 instead."}
                      </Text>
                    )}
                  </Text>
                </ScrollView>
              </View>
            )}

            {state === 'paused' ? (
              <Text style={styles.pausedHint}>
                Recording is paused. Resume to continue the same lecture file.
              </Text>
            ) : (
              /* Web has no equivalent guarantee: a backgrounded tab keeps
                 recording, but closing it does not. */
              Platform.OS !== 'web' && (
                <View style={styles.backgroundHint}>
                  <Ionicons color={AppTheme.colors.textSecondary} name="lock-closed-outline" size={14} />
                  <Text style={styles.backgroundHintText}>
                    Keeps recording if you lock the screen or switch apps.
                  </Text>
                </View>
              )
            )}

            <View style={styles.recordingActions}>
              {/* Icon-only on phones: three labelled buttons do not fit side by side. */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Discard recording"
                onPress={() => void cancelRecording()}
                style={[styles.cancelBtn, isMobile && styles.iconOnlyBtn]}
              >
                <Ionicons color={AppTheme.colors.textSecondary} name="close" size={22} />
                {!isMobile ? <Text style={styles.cancelBtnText}>Discard</Text> : null}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => (state === 'paused' ? void resumeRecording() : pauseRecording())}
                style={[styles.pauseBtn, state === 'paused' && styles.resumeBtn]}
              >
                <Ionicons
                  color={state === 'paused' ? AppTheme.colors.white : AppTheme.colors.warningText}
                  name={state === 'paused' ? 'play' : 'pause'}
                  size={20}
                />
                <Text style={[styles.pauseBtnText, state === 'paused' && styles.resumeBtnText]}>
                  {state === 'paused' ? 'Resume' : 'Pause'}
                </Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => void stopRecording()} style={styles.stopBtn}>
                <View style={styles.stopIcon} />
                <Text style={styles.stopBtnText}>Stop</Text>
              </Pressable>
            </View>
          </>
        ) : null}

        {state === 'stopped' ? (
          <>
            <View style={styles.stoppedTop}>
              <View style={styles.doneCircle}>
                <Ionicons color={AppTheme.colors.successText} name="checkmark" size={36} />
              </View>
              <Text style={styles.doneTitle}>Recording Ready</Text>
              <Text style={styles.doneDuration}>Length: {formatAudioTime(recordedDuration)}</Text>
            </View>

            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewTitle}>Preview</Text>
                <Text style={styles.previewMeta}>
                  {formatAudioTime(previewStatus.currentTime)} / {formatAudioTime(previewStatus.duration || recordedDuration)}
                </Text>
              </View>
              <Pressable accessibilityRole="button" onPress={() => void togglePreview()} style={styles.previewButton}>
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
                  <Text style={styles.previewTextTitle}>Review recording</Text>
                  <Text style={styles.previewTextBody}>
                    Play the recording once to confirm the audio is clear before uploading it.
                  </Text>
                </View>
              </Pressable>
              <AudioWaveform bars={previewBars} progress={previewProgress} />
            </View>

            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>{fromTimetable ? 'CHAPTER *' : 'CHAPTER'}</Text>
              {fromTimetable ? (
                <View style={styles.chapterPicker}>
                  {suggestion?.reason && !choiceTouchedRef.current ? (
                    <View style={styles.suggestionHint}>
                      <Ionicons color={AppTheme.colors.primaryDark} name="sparkles-outline" size={14} />
                      <Text style={styles.suggestionHintText}>
                        {suggestion.reason === 'today'
                          ? "Filled in from today's lesson plan. Change it if you taught something else."
                          : 'Filled in with your next lecture that has no recording yet. Change it if needed.'}
                      </Text>
                    </View>
                  ) : null}
                  {suggestionLoading ? (
                    <ActivityIndicator color={AppTheme.colors.primary} size="small" style={{ alignSelf: 'flex-start' }} />
                  ) : chapters.length === 0 ? (
                    <Text style={styles.chapterEmpty}>
                      This subject has no chapters yet. Add one from the subject page, then upload this recording.
                    </Text>
                  ) : (
                    <View style={styles.chipWrap}>
                      {chapters.map((c) => {
                        const isSel = c.id === selectedChapterId;
                        return (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityState={{ selected: isSel }}
                            key={c.id}
                            onPress={() => selectChapter(c)}
                            style={[styles.chip, isSel && styles.chipSelected]}
                          >
                            <Text style={[styles.chipText, isSel && styles.chipTextSelected]}>{c.name}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              ) : (
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
                    {paramChapterName}
                  </Text>
                </View>
              )}

              <View style={{ marginBottom: 14 }}>
                <Text style={styles.metaLabel}>LECTURE *</Text>
                {/* Wraps instead of scrolling sideways — a horizontal strip hides
                    lectures past the edge and a mouse wheel can't reach them. */}
                <View style={{ marginTop: 6, marginBottom: 4 }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {learningPlans.map((lp) => {
                      const isSel = !creatingNewLecture && selectedLearningPlanId === lp.id;
                      return (
                        <Pressable
                          accessibilityRole="button"
                          key={lp.id}
                          onPress={() => selectExistingLecture(lp)}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: AppTheme.radius.medium,
                            borderWidth: 1,
                            borderColor: isSel ? AppTheme.colors.info : AppTheme.colors.border,
                            backgroundColor: isSel ? AppTheme.colors.infoBg : AppTheme.colors.surface,
                          }}
                        >
                          <Text style={{ fontSize: 13, color: isSel ? AppTheme.colors.infoStrong : AppTheme.colors.textPrimary, fontWeight: '700' }}>
                            {lp.sub_topic}
                          </Text>
                          {lp.topic_name ? (
                            <Text style={{ fontSize: 11, color: isSel ? AppTheme.colors.info : AppTheme.colors.textSecondary }}>
                              {lp.topic_name} {lp.date ? `(${lp.date})` : ''}
                            </Text>
                          ) : null}
                        </Pressable>
                      );
                    })}
                    <Pressable
                      accessibilityRole="button"
                      onPress={selectNewLecture}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: AppTheme.radius.medium,
                        borderWidth: 1,
                        borderStyle: 'dashed',
                        borderColor: creatingNewLecture ? AppTheme.colors.info : AppTheme.colors.border,
                        backgroundColor: creatingNewLecture ? AppTheme.colors.infoBg : AppTheme.colors.surface,
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 13, color: creatingNewLecture ? AppTheme.colors.infoStrong : AppTheme.colors.textSecondary, fontWeight: '700' }}>
                        + New lecture
                      </Text>
                    </Pressable>
                  </View>
                </View>
                {lectureSelectError ? (
                  <Text style={{ color: AppTheme.colors.recording, fontSize: 12, marginTop: 4, fontWeight: '600' }}>
                    {lectureSelectError}
                  </Text>
                ) : null}
              </View>

              {/* Title is only asked for when a brand new lecture is being created —
                  an existing sub-topic already carries its own title. */}
              {creatingNewLecture ? (
                <>
                  <Text style={styles.metaLabel}>NEW LECTURE TITLE *</Text>
                  <TextInput
                    autoCapitalize="words"
                    onChangeText={(val) => {
                      setLectureTitle(val);
                      if (val.trim()) {
                        setLectureTitleError(null);
                      }
                    }}
                    placeholder="Enter lecture title"
                    placeholderTextColor={AppTheme.colors.hint}
                    style={[styles.input, lectureTitleError && { borderColor: AppTheme.colors.recording }]}
                    value={lectureTitle}
                  />
                  {lectureTitleError ? (
                    <Text style={{ color: AppTheme.colors.recording, fontSize: 12, marginTop: 4, marginBottom: 4, fontWeight: '600' }}>
                      {lectureTitleError}
                    </Text>
                  ) : null}
                </>
              ) : null}

              <Text style={styles.metaLabel}>DESCRIPTION</Text>
              <TextInput
                autoCapitalize="sentences"
                multiline
                numberOfLines={4}
                onChangeText={setDescription}
                placeholder="Optional summary or notes for this class"
                placeholderTextColor={AppTheme.colors.hint}
                style={[styles.input, styles.descriptionInput]}
                value={description}
              />
            </View>

            {uploadError ? (
              <View style={styles.uploadErrorBox}>
                <Ionicons color={AppTheme.colors.dangerText} name="alert-circle-outline" size={18} />
                <Text style={styles.uploadErrorText}>{uploadError}</Text>
              </View>
            ) : null}

            {uploading ? (
              <View style={styles.uploadStatusBox}>
                <ActivityIndicator color={AppTheme.colors.primary} size="small" />
                <Text style={styles.uploadStatusText}>
                  {uploadPhase === 'finalizing'
                    ? 'Audio sent. Saving it and starting the AI evaluation — this can take a minute, please keep this screen open.'
                    : `Uploading audio… ${uploadProgress}%`}
                </Text>
              </View>
            ) : null}

            <View style={styles.footerActions}>
              <Pressable
                accessibilityRole="button"
                disabled={uploading}
                onPress={() => void reRecord()}
                style={[styles.secondaryBtn, uploading && styles.btnDisabled]}
              >
                <Ionicons color={AppTheme.colors.textSecondary} name="refresh-outline" size={18} />
                <Text style={styles.secondaryBtnText}>Record Again</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={uploading}
                onPress={() => void handleUpload()}
                style={[styles.primaryBtn, uploading && styles.btnDisabled]}
              >
                {uploading ? <ActivityIndicator color={AppTheme.colors.white} size="small" /> : null}
                <Text style={styles.primaryBtnText}>
                  {uploading
                    ? uploadPhase === 'finalizing'
                      ? 'Finishing…'
                      : `Uploading… ${uploadProgress}%`
                    : 'Upload'}
                </Text>
              </Pressable>
            </View>
          </>
        ) : null}
          </View>
        </View>
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
  headerBack: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: AppTheme.colors.textPrimary },
  headerSpacer: { width: 36 },
  body: { flex: 1 },
  scrollBody: { flexGrow: 1 },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: AppTheme.spacing.l,
    paddingVertical: AppTheme.spacing.xl,
  },
  contentBody: {
    width: '100%',
    maxWidth: 800,
    gap: 18,
  },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  chapterPicker: { gap: 10, marginTop: 6, marginBottom: 14 },
  suggestionHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    padding: 10,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.primaryLight,
  },
  suggestionHintText: { flex: 1, fontSize: 12, lineHeight: 17, color: AppTheme.colors.primaryText },
  chapterEmpty: { fontSize: 13, lineHeight: 19, color: AppTheme.colors.textSecondary },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: AppTheme.radius.medium,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    backgroundColor: AppTheme.colors.surface,
  },
  chipSelected: { borderColor: AppTheme.colors.info, backgroundColor: AppTheme.colors.infoBg },
  chipText: { fontSize: 13, fontWeight: '700', color: AppTheme.colors.textPrimary },
  chipTextSelected: { color: AppTheme.colors.infoStrong },
  micRing: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: AppTheme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idleTitle: { fontSize: 30, fontWeight: '800', color: AppTheme.colors.textPrimary },
  idleSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: AppTheme.colors.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
  },
  actionChoiceRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  recordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: AppTheme.colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 18,
  },
  recordBtnText: { color: AppTheme.colors.white, fontSize: 15, fontWeight: '800' },
  uploadChoiceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: AppTheme.colors.infoBg,
    borderWidth: 1,
    borderColor: AppTheme.colors.infoBorder,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 18,
  },
  uploadChoiceText: { color: AppTheme.colors.infoStrong, fontSize: 15, fontWeight: '800' },
  recoveryCard: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    backgroundColor: AppTheme.colors.warningTint,
    borderColor: AppTheme.colors.warningBorder,
    borderWidth: 1,
    borderRadius: AppTheme.radius.medium,
    padding: 14,
    marginBottom: 16,
  },
  recoveryTitle: { fontSize: 14, fontWeight: '800', color: AppTheme.colors.warningStrong },
  recoveryBody: { fontSize: 12, color: AppTheme.colors.warningText, marginTop: 2, lineHeight: 16 },
  recoveryActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  recoveryPrimary: {
    minWidth: 96,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: AppTheme.colors.warningText,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  recoveryPrimaryText: { color: AppTheme.colors.white, fontSize: 13, fontWeight: '800' },
  recoveryDisabled: { opacity: 0.7 },
  recoverySecondary: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppTheme.colors.warningBorder,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  recoverySecondaryText: { color: AppTheme.colors.warningText, fontSize: 13, fontWeight: '700' },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: AppTheme.colors.infoSoft,
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: AppTheme.radius.medium,
    padding: 12,
    marginBottom: 16,
  },
  noticeText: { flex: 1, fontSize: 12, color: AppTheme.colors.infoStrong, lineHeight: 16 },
  recorderErrorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: AppTheme.colors.dangerBg,
    borderColor: AppTheme.colors.dangerBorder,
    borderWidth: 1,
    borderRadius: AppTheme.radius.medium,
    padding: 12,
    marginBottom: 16,
  },
  recorderErrorText: { flex: 1, fontSize: 12, color: AppTheme.colors.dangerStrong, lineHeight: 16 },
  recordingTop: { alignItems: 'center', gap: 10, marginTop: 16 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: AppTheme.colors.recording },
  liveLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2, color: AppTheme.colors.recording },
  timerText: { fontSize: 38, fontWeight: '800', color: AppTheme.colors.textPrimary },
  waveformCard: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F0D0D0',
    backgroundColor: '#FFF6F6',
  },
  pausedDot: { backgroundColor: AppTheme.colors.warningText },
  pausedLabel: { color: AppTheme.colors.warningText },
  waveformCardPaused: { borderColor: AppTheme.colors.slate200, backgroundColor: AppTheme.colors.slate50 },
  pausedHint: {
    textAlign: 'center',
    fontSize: 13,
    color: AppTheme.colors.textSecondary,
    marginBottom: 4,
  },
  backgroundHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 4,
  },
  backgroundHintText: { fontSize: 12, color: AppTheme.colors.textSecondary },
  recordingActions: { flexDirection: 'row', gap: 12 },
  pauseBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: AppTheme.colors.warningBorder,
    backgroundColor: AppTheme.colors.warningTint,
    paddingVertical: 16,
  },
  pauseBtnText: { color: AppTheme.colors.warningText, fontSize: 15, fontWeight: '800' },
  iconOnlyBtn: { flex: 0, paddingHorizontal: 18 },
  resumeBtn: { borderColor: AppTheme.colors.successText, backgroundColor: AppTheme.colors.successText },
  resumeBtnText: { color: AppTheme.colors.white },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    backgroundColor: AppTheme.colors.surface,
    paddingVertical: 16,
  },
  cancelBtnText: { color: AppTheme.colors.textSecondary, fontSize: 15, fontWeight: '700' },
  stopBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 18,
    backgroundColor: AppTheme.colors.recording,
    paddingVertical: 16,
  },
  stopIcon: { width: 14, height: 14, borderRadius: 4, backgroundColor: AppTheme.colors.white },
  stopBtnText: { color: AppTheme.colors.white, fontSize: 15, fontWeight: '800' },
  stoppedTop: { alignItems: 'center', gap: 10 },
  doneCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: AppTheme.colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneTitle: { fontSize: 24, fontWeight: '800', color: AppTheme.colors.textPrimary },
  doneDuration: { fontSize: 14, color: AppTheme.colors.textSecondary },
  previewCard: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: AppTheme.colors.surface,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    gap: 14,
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
    backgroundColor: AppTheme.colors.surfaceSoft,
  },
  previewIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AppTheme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTextWrap: { flex: 1, gap: 3 },
  previewTextTitle: { fontSize: 15, fontWeight: '700', color: AppTheme.colors.textPrimary },
  previewTextBody: { fontSize: 13, lineHeight: 18, color: AppTheme.colors.textSecondary },
  metaCard: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: AppTheme.colors.surface,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    gap: 10,
  },
  metaLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.9, color: AppTheme.colors.textSecondary },
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
  uploadStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: AppTheme.colors.primaryLight,
  },
  uploadStatusText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: AppTheme.colors.primaryText,
  },
  uploadErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: AppTheme.colors.dangerBg,
    borderWidth: 1,
    borderColor: AppTheme.colors.dangerBorder,
  },
  uploadErrorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: AppTheme.colors.dangerText,
  },
  footerActions: { flexDirection: 'row', gap: 12 },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 18,
    backgroundColor: AppTheme.colors.surface,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    paddingVertical: 15,
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '700', color: AppTheme.colors.textSecondary },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 18,
    backgroundColor: AppTheme.colors.primary,
    paddingVertical: 15,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '800', color: AppTheme.colors.white },
  btnDisabled: { opacity: 0.55 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: AppTheme.colors.surface,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    marginBottom: 8,
  },
  toggleLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: AppTheme.colors.textPrimary,
  },
  toggleOuter: {
    width: 44,
    height: 24,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.border,
    padding: 2,
    justifyContent: 'center',
  },
  toggleOuterActive: {
    backgroundColor: AppTheme.colors.primary,
  },
  toggleInner: {
    width: 20,
    height: 20,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.white,
    transform: [{ translateX: 0 }],
  },
  toggleInnerActive: {
    transform: [{ translateX: 20 }],
  },
  dictationCard: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: 16,
    gap: 12,
    minHeight: 120,
    maxHeight: 200,
  },
  dictationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.border,
    paddingBottom: 8,
  },
  dictationTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: AppTheme.colors.textPrimary,
  },
  livePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  dictationScroll: {
    flex: 1,
  },
  dictationText: {
    fontSize: 14,
    lineHeight: 20,
    color: AppTheme.colors.textPrimary,
  },
  interimText: {
    color: AppTheme.colors.textSecondary,
    fontStyle: 'italic',
  },
  placeholderText: {
    color: AppTheme.colors.hint,
    fontStyle: 'italic',
  },
  errorText: {
    color: AppTheme.colors.recording,
    fontStyle: 'italic',
    fontSize: 13,
  },
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


