import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/* A lecture is the one piece of work in this app that cannot be redone: the class
   is over. Everything needed to rebuild the recording screen is therefore mirrored
   to durable storage while the teacher records, so a refresh, a crash or an OS kill
   costs a few seconds of audio instead of the whole period. */

const DRAFT_KEY = 'classecho.recordingDraft.v1';

/** Where the captured audio for a draft actually lives. */
export type RecordingDraftAudio = {
  /* 'chunks': web, raw MediaRecorder fragments in IndexedDB - see `audioChunkStore`.
     'file':   native, expo-audio wrote into the app's cache directory. */
  kind: 'chunks' | 'file';
  /* Only meaningful within the session that produced it: a blob: URL dies with
     the page, and a cache-directory path may be swept by the OS. Recovery goes
     through the chunk store, never through this. */
  uri?: string;
  mimeType: string;
} | null;

export type RecordingDraftRoute = {
  subjectId: number;
  subjectName: string;
  chapterId?: number;
  chapterName?: string;
  learningPlanId?: number;
  lectureTitle?: string;
  replaceRecordingId?: number;
};

export type RecordingDraftForm = {
  lectureTitle: string;
  description: string;
  transcript: string;
  creatingNewLecture: boolean;
  selectedLearningPlanId?: number;
};

export type RecordingDraft = {
  id: string;
  startedAt: number;
  updatedAt: number;
  platform: string;
  route: RecordingDraftRoute;
  form: RecordingDraftForm;
  elapsedMillis: number;
  audio: RecordingDraftAudio;
};

export function createDraftId(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export async function saveRecordingDraft(draft: RecordingDraft): Promise<void> {
  try {
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, updatedAt: Date.now() }));
  } catch (e) {
    // Losing the safety net must never take the live recording down with it.
    console.warn('[recordingDraft] save failed', e);
  }
}

export async function loadRecordingDraft(): Promise<RecordingDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as RecordingDraft;
    if (!parsed || typeof parsed !== 'object' || !parsed.id || !parsed.route) {
      return null;
    }
    // A draft written on another platform points at storage this build cannot
    // reach - an IndexedDB store from the web app, or a file URI from the APK.
    if (parsed.platform !== Platform.OS) {
      return null;
    }
    return parsed;
  } catch (e) {
    console.warn('[recordingDraft] load failed', e);
    return null;
  }
}

export async function clearRecordingDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DRAFT_KEY);
  } catch (e) {
    console.warn('[recordingDraft] clear failed', e);
  }
}

/** A draft is worth offering back only if it holds something the teacher would miss. */
export function draftHasContent(draft: RecordingDraft): boolean {
  return draft.elapsedMillis > 1500 || Boolean(draft.form.transcript.trim());
}
