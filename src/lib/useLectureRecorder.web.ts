import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { appendAudioChunk, resetAudioChunks } from './audioChunkStore';
import {
  LectureRecorder,
  LectureRecorderStatus,
  LectureRecording,
  StagedAudio,
} from './lectureRecorderTypes';

/* Web engine.

   expo-audio's web recorder hands the audio over exactly once, when stop()
   resolves, so a tab that dies mid-lecture takes the whole recording with it.
   Driving MediaRecorder here instead gives us the chunks as they are produced,
   which are mirrored into IndexedDB for crash recovery. The in-memory copy stays
   the source of truth for a normal stop - a failing IndexedDB must degrade the
   safety net, never the recording itself. */

/** How often MediaRecorder flushes a fragment. Also the worst-case data loss on a crash. */
const CHUNK_INTERVAL_MS = 5000;
const STATUS_INTERVAL_MS = 120;

/* Ordered by preference. Opus in WebM is what Chrome and Firefox produce; Safari
   only offers MP4/AAC. An empty string lets the browser pick its own default. */
const PREFERRED_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
  'audio/ogg;codecs=opus',
];

function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') {
    return '';
  }
  for (const candidate of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }
  return '';
}

/** MediaRecorder mime types carry codec parameters that the upload path must not see. */
function baseMimeType(mimeType: string): string {
  return mimeType.split(';')[0]?.trim().toLowerCase() || 'audio/webm';
}

const IDLE_STATUS: LectureRecorderStatus = {
  isRecording: false,
  isPaused: false,
  durationMillis: 0,
  metering: undefined,
};

export function useLectureRecorder(): LectureRecorder {
  const [status, setStatus] = useState<LectureRecorderStatus>(IDLE_STATUS);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string>('');

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sampleBufferRef = useRef<Float32Array<ArrayBuffer> | null>(null);

  // Duration is accumulated across pauses rather than derived from a single
  // start time, so paused minutes never inflate the lecture length.
  const completedMillisRef = useRef(0);
  const segmentStartedAtRef = useRef<number | null>(null);
  const statusTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const elapsedMillis = useCallback(() => {
    const openSegment = segmentStartedAtRef.current == null ? 0 : Date.now() - segmentStartedAtRef.current;
    return completedMillisRef.current + openSegment;
  }, []);

  const readMetering = useCallback((): number | undefined => {
    const analyser = analyserRef.current;
    const buffer = sampleBufferRef.current;
    if (!analyser || !buffer) {
      return undefined;
    }
    analyser.getFloatTimeDomainData(buffer);
    let sumOfSquares = 0;
    for (let i = 0; i < buffer.length; i += 1) {
      sumOfSquares += buffer[i] * buffer[i];
    }
    const rms = Math.sqrt(sumOfSquares / buffer.length);
    if (rms <= 0) {
      return -60;
    }
    // dBFS, floored at the same -60 the native meter reports for silence.
    return Math.max(-60, Math.min(0, 20 * Math.log10(rms)));
  }, []);

  const stopStatusTimer = useCallback(() => {
    if (statusTimerRef.current != null) {
      clearInterval(statusTimerRef.current);
      statusTimerRef.current = null;
    }
  }, []);

  const startStatusTimer = useCallback(() => {
    stopStatusTimer();
    statusTimerRef.current = setInterval(() => {
      const recorder = recorderRef.current;
      const isPaused = recorder?.state === 'paused';
      setStatus({
        isRecording: recorder?.state === 'recording',
        isPaused,
        durationMillis: elapsedMillis(),
        // A paused stream produces silence; holding the last live reading would
        // make the level meter look like the mic is still open.
        metering: isPaused ? -60 : readMetering(),
      });
    }, STATUS_INTERVAL_MS);
  }, [elapsedMillis, readMetering, stopStatusTimer]);

  /* Frees the microphone and the metering graph. Kept separate from teardown()
     because stop() has to release these too - a second lecture in the same
     session would otherwise stack up AudioContexts that are never closed. */
  const releaseStream = useCallback(() => {
    // Releasing the tracks is what clears the browser's "recording" indicator.
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    analyserRef.current = null;
    sampleBufferRef.current = null;
    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context && context.state !== 'closed') {
      void context.close().catch(() => {
        // Closing is best effort; the tracks above already freed the mic.
      });
    }
  }, []);

  const teardown = useCallback(() => {
    stopStatusTimer();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        // Already finished.
      }
    }
    recorderRef.current = null;
    releaseStream();

    completedMillisRef.current = 0;
    segmentStartedAtRef.current = null;
  }, [releaseStream, stopStatusTimer]);

  // A navigation away mid-recording must not leave the microphone open.
  useEffect(() => teardown, [teardown]);

  const requestPermission = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return false;
    }
    try {
      // The stream opened here is the one we go on to record with, so the
      // teacher is only prompted once.
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      return true;
    } catch (e) {
      console.error('[lectureRecorder] microphone permission denied', e);
      return false;
    }
  }, []);

  const start = useCallback(async () => {
    if (typeof MediaRecorder === 'undefined') {
      throw new Error('This browser cannot record audio.');
    }
    if (!streamRef.current) {
      const granted = await requestPermission();
      if (!granted || !streamRef.current) {
        throw new Error('Microphone unavailable.');
      }
    }
    const stream = streamRef.current;

    chunksRef.current = [];
    // Anything staged by an earlier lecture would otherwise be prepended to this one.
    await resetAudioChunks();

    const mimeType = pickMimeType();
    mimeTypeRef.current = mimeType;
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

    recorder.ondataavailable = (event: BlobEvent) => {
      if (!event.data || event.data.size === 0) {
        return;
      }
      chunksRef.current.push(event.data);
      void appendAudioChunk(event.data);
    };
    recorder.onerror = (event: Event) => {
      console.error('[lectureRecorder] MediaRecorder error', event);
    };

    recorderRef.current = recorder;

    // Level metering runs off a separate analyser tap on the same stream, which
    // does not disturb what MediaRecorder receives.
    try {
      const AudioContextCtor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextCtor) {
        const context = new AudioContextCtor();
        const analyser = context.createAnalyser();
        analyser.fftSize = 2048;
        context.createMediaStreamSource(stream).connect(analyser);
        audioContextRef.current = context;
        analyserRef.current = analyser;
        sampleBufferRef.current = new Float32Array(new ArrayBuffer(analyser.fftSize * Float32Array.BYTES_PER_ELEMENT));
      }
    } catch (e) {
      // A missing level meter is cosmetic; recording continues without it.
      console.warn('[lectureRecorder] metering unavailable', e);
    }

    completedMillisRef.current = 0;
    segmentStartedAtRef.current = Date.now();
    recorder.start(CHUNK_INTERVAL_MS);
    startStatusTimer();
  }, [requestPermission, startStatusTimer]);

  const pause = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== 'recording') {
      return;
    }
    recorder.pause();
    if (segmentStartedAtRef.current != null) {
      completedMillisRef.current += Date.now() - segmentStartedAtRef.current;
      segmentStartedAtRef.current = null;
    }
    setStatus({
      isRecording: false,
      isPaused: true,
      durationMillis: completedMillisRef.current,
      metering: -60,
    });
  }, []);

  const resume = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== 'paused') {
      return;
    }
    // Browsers suspend the AudioContext when the tab is backgrounded, which
    // leaves the level meter frozen at silence after a resume.
    const context = audioContextRef.current;
    if (context && context.state === 'suspended') {
      await context.resume().catch(() => {
        // Metering only.
      });
    }
    recorder.resume();
    segmentStartedAtRef.current = Date.now();
    startStatusTimer();
  }, [startStatusTimer]);

  const stop = useCallback(async (): Promise<LectureRecording | null> => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      return null;
    }

    if (segmentStartedAtRef.current != null) {
      completedMillisRef.current += Date.now() - segmentStartedAtRef.current;
      segmentStartedAtRef.current = null;
    }
    const durationMillis = completedMillisRef.current;

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      try {
        recorder.stop();
      } catch {
        resolve();
      }
    });

    stopStatusTimer();
    const resolvedMime = baseMimeType(mimeTypeRef.current || recorder.mimeType || 'audio/webm');
    const parts = chunksRef.current.filter((part) => part.size > 0);

    // The mic is released now that the audio is in hand; the staged IndexedDB
    // copy is deliberately left in place until the upload succeeds.
    releaseStream();
    recorderRef.current = null;
    setStatus({ ...IDLE_STATUS, durationMillis });

    if (parts.length === 0) {
      return null;
    }
    return {
      uri: URL.createObjectURL(new Blob(parts, { type: resolvedMime })),
      mimeType: resolvedMime,
      durationMillis,
    };
  }, [releaseStream, stopStatusTimer]);

  /* The fragments are in IndexedDB rather than at any URL, so there is no uri to
     report - recovery goes through the chunk store. */
  const stagedAudio = useCallback((): StagedAudio | null => {
    if (chunksRef.current.length === 0) {
      return null;
    }
    return { kind: 'chunks', mimeType: baseMimeType(mimeTypeRef.current || 'audio/webm') };
  }, []);

  const discard = useCallback(async () => {
    teardown();
    chunksRef.current = [];
    await resetAudioChunks();
    setStatus(IDLE_STATUS);
  }, [teardown]);

  return useMemo<LectureRecorder>(
    () => ({
      status,
      requestPermission,
      start,
      pause,
      resume,
      stop,
      discard,
      stagedAudio,
      canRecoverAudio: true,
    }),
    [status, requestPermission, start, pause, resume, stop, discard, stagedAudio],
  );
}
