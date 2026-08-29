import { useCallback, useMemo, useRef } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

import { inferMimeTypeFromUri } from './audio';
import { LectureRecorder, LectureRecording, StagedAudio } from './lectureRecorderTypes';

/* Native engine. expo-audio records to a file in the app's cache directory and
   handles pause/resume by appending to that same file, so a paused lecture stays
   a single upload. The web build uses `useLectureRecorder.web.ts` instead. */

/* Android records AAC into an ADTS stream rather than the preset's MPEG-4
   container. ADTS is self-framing: every frame carries its own header, so a file
   that stops mid-write - app killed, battery dead, OS reclaiming memory - is
   still fully playable up to the point it stopped. An MPEG-4 file is not: its
   index is written only on a clean stop, so a crash leaves an unplayable blob
   and the whole lecture is gone. That single option is what makes native crash
   recovery possible without rolling the recorder over into segments and
   stitching the pieces back together.

   iOS has no ADTS output, so it keeps the MPEG-4 container and cannot recover a
   crashed file - see `canRecoverAudio` below. */
const RECORDER_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  isMeteringEnabled: true,
  android: {
    ...RecordingPresets.HIGH_QUALITY.android,
    extension: '.aac',
    outputFormat: 'aac_adts' as const,
    audioEncoder: 'aac' as const,
  },
};

/* A lecture outlasts the teacher's attention on the phone: they lock the screen,
   open the slides, take a call. Without allowsBackgroundRecording the OS stops
   the capture the moment the app leaves the foreground - on Android expo-audio
   runs a microphone foreground service, on iOS it keeps the audio session alive
   under the UIBackgroundModes:audio entitlement. Both are switched on by the
   `enableBackgroundRecording` flag given to the expo-audio config plugin in
   app.json; this mode is the runtime half of the same setting. */
const RECORDING_AUDIO_MODE = {
  allowsRecording: true,
  playsInSilentMode: true,
  shouldPlayInBackground: true,
  allowsBackgroundRecording: true,
} as const;

const IDLE_AUDIO_MODE = {
  allowsRecording: false,
  playsInSilentMode: true,
  shouldPlayInBackground: false,
  // Releases the Android foreground service once there is nothing to protect.
  allowsBackgroundRecording: false,
} as const;

/* Android 13+ hides the foreground-service notification without this. The
   service - and therefore the recording - still runs either way, so a refusal
   is never allowed to block the lecture. */
async function ensureNotificationPermission(): Promise<void> {
  if (Platform.OS !== 'android' || typeof Platform.Version !== 'number' || Platform.Version < 33) {
    return;
  }
  try {
    const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
    if (!permission) {
      return;
    }
    const already = await PermissionsAndroid.check(permission);
    if (!already) {
      await PermissionsAndroid.request(permission);
    }
  } catch (e) {
    console.warn('[lectureRecorder] notification permission check failed', e);
  }
}

export function useLectureRecorder(): LectureRecorder {
  const recorder = useAudioRecorder(RECORDER_OPTIONS);
  const recorderState = useAudioRecorderState(recorder, 120);
  // getStatus() reports 0ms once the recorder has been torn down on some
  // platforms, which showed a finished clip as "0:00". The last polled value is
  // the reliable figure in that case.
  const lastDurationRef = useRef(0);
  if (recorderState.durationMillis > 0) {
    lastDurationRef.current = recorderState.durationMillis;
  }

  const requestPermission = useCallback(async () => {
    const { granted } = await requestRecordingPermissionsAsync();
    if (granted) {
      await ensureNotificationPermission();
    }
    return granted;
  }, []);

  const start = useCallback(async () => {
    await setAudioModeAsync(RECORDING_AUDIO_MODE);
    lastDurationRef.current = 0;
    await recorder.prepareToRecordAsync();
    recorder.record();
  }, [recorder]);

  const pause = useCallback(() => {
    recorder.pause();
  }, [recorder]);

  const resume = useCallback(async () => {
    // Reasserted because another app - or an incoming call - may have taken the
    // audio session away while we were paused.
    await setAudioModeAsync(RECORDING_AUDIO_MODE);
    recorder.record();
  }, [recorder]);

  const stop = useCallback(async (): Promise<LectureRecording | null> => {
    await recorder.stop();
    await setAudioModeAsync(IDLE_AUDIO_MODE);
    const finalState = recorder.getStatus();
    const uri = finalState.url ?? recorder.uri;
    if (!uri) {
      return null;
    }
    return {
      uri,
      mimeType: inferMimeTypeFromUri(uri),
      durationMillis: finalState.durationMillis || lastDurationRef.current || 0,
    };
  }, [recorder]);

  /* expo-audio assigns the output path at prepare time, so this is available for
     the whole life of the recording rather than only after stop(). */
  const stagedAudio = useCallback((): StagedAudio | null => {
    const uri = recorder.uri;
    if (!uri) {
      return null;
    }
    return { kind: 'file', uri, mimeType: inferMimeTypeFromUri(uri) };
  }, [recorder]);

  const discard = useCallback(async () => {
    try {
      await recorder.stop();
    } catch {
      // Already stopped, or never started.
    }
    try {
      await setAudioModeAsync(IDLE_AUDIO_MODE);
    } catch {
      // Cleanup only.
    }
  }, [recorder]);

  return useMemo<LectureRecorder>(
    () => ({
      status: {
        isRecording: recorderState.isRecording,
        // expo-audio has no "paused" flag; the screen owns that distinction and
        // only ever reads isRecording to decide whether a teardown is needed.
        isPaused: false,
        durationMillis: recorderState.durationMillis || lastDurationRef.current,
        metering: recorderState.metering,
      },
      requestPermission,
      start,
      pause,
      resume,
      stop,
      discard,
      stagedAudio,
      // Android's ADTS output survives an unclean stop, so the half-written cache
      // file can be handed straight to the upload. iOS cannot: its MPEG-4 index
      // never gets written, so those drafts restore text and settings only.
      canRecoverAudio: Platform.OS === 'android',
    }),
    [
      recorderState.isRecording,
      recorderState.durationMillis,
      recorderState.metering,
      requestPermission,
      start,
      pause,
      resume,
      stop,
      discard,
      stagedAudio,
    ],
  );
}
